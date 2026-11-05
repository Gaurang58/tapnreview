-- Tap Review: core schema.
-- Hierarchy: organisations -> areas -> cities -> stores -> tags -> tap_events.
-- Every table gets RLS switched on here; the policies live in the next migration.

create extension if not exists pgcrypto;

create type app_role as enum ('admin', 'area_manager', 'bureau_manager', 'staff');
create type tap_method as enum ('nfc', 'qr');

create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table areas (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete restrict,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, name)
);

create table cities (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references areas(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (area_id, name)
);

create table stores (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities(id) on delete restrict,
  name text not null,                -- e.g. 'Nottingham West Bridgford'
  google_place_id text,
  google_review_url text not null check (google_review_url like 'https://%'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, name)
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete restrict,
  label text not null,               -- default: store name + ' tag'
  public_code text not null unique check (public_code ~ '^[A-Za-z0-9_-]{8,64}$'),
  is_active boolean not null default true,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tap_events (
  id bigint generated always as identity primary key,
  tag_id uuid not null references tags(id) on delete restrict,
  store_id uuid not null references stores(id) on delete restrict,
  method tap_method not null,
  occurred_at timestamptz not null default now(),
  visitor_hash text,
  is_duplicate boolean not null default false,
  is_bot boolean not null default false,
  is_demo boolean not null default false
);
create index on tap_events (store_id, occurred_at desc);
create index on tap_events (tag_id, occurred_at desc);
create index on tap_events (tag_id, visitor_hash, occurred_at desc);
-- Partial index so the reset script and "Demo data" badge stay fast.
create index on tap_events (is_demo) where is_demo;

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  role app_role not null,
  organisation_id uuid references organisations(id),
  area_id uuid references areas(id),
  store_id uuid references stores(id),
  created_by uuid references profiles(user_id),
  created_at timestamptz not null default now(),
  check (
    (role = 'admin' and organisation_id is not null and area_id is null and store_id is null) or
    (role = 'area_manager' and area_id is not null and store_id is null) or
    (role in ('bureau_manager', 'staff') and store_id is not null and area_id is null)
  ),
  unique nulls not distinct (user_id, role, organisation_id, area_id, store_id)
);
create index on memberships (user_id);
create index on memberships (area_id) where area_id is not null;
create index on memberships (store_id) where store_id is not null;

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(user_id),
  action text not null,             -- e.g. 'tag.retired'
  entity text not null,
  entity_id text,
  details jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create index on audit_log (occurred_at desc);
create index on audit_log ((details->>'area_id'));

-- ---------------------------------------------------------------------------
-- updated_at: bump automatically on every change.
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger organisations_updated_at before update on organisations
  for each row execute function set_updated_at();
create trigger areas_updated_at before update on areas
  for each row execute function set_updated_at();
create trigger cities_updated_at before update on cities
  for each row execute function set_updated_at();
create trigger stores_updated_at before update on stores
  for each row execute function set_updated_at();
create trigger tags_updated_at before update on tags
  for each row execute function set_updated_at();
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- A printed code must never change. Retiring sets retired_at and is_active.
-- ---------------------------------------------------------------------------
create or replace function tags_guard()
returns trigger language plpgsql as $$
begin
  if new.public_code <> old.public_code then
    raise exception 'public_code cannot be changed once created (it is printed on a card)';
  end if;
  if new.retired_at is not null and old.retired_at is null then
    new.is_active = false;
  end if;
  if old.retired_at is not null and new.retired_at is null then
    raise exception 'a retired tag cannot be brought back; create a new tag instead';
  end if;
  return new;
end $$;

create trigger tags_guard before update on tags
  for each row execute function tags_guard();

-- ---------------------------------------------------------------------------
-- Profiles: one per login. A trigger keeps profiles in step with auth.users,
-- so an invited user always has a profile even if the invite action is retried.
-- ---------------------------------------------------------------------------
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (user_id) do update set email = excluded.email;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Switch on Row Level Security everywhere. With no policies yet, nothing is
-- readable by signed-in users; the secret key (service role) always bypasses RLS.
-- ---------------------------------------------------------------------------
alter table organisations enable row level security;
alter table areas enable row level security;
alter table cities enable row level security;
alter table stores enable row level security;
alter table tags enable row level security;
alter table tap_events enable row level security;
alter table profiles enable row level security;
alter table memberships enable row level security;
alter table audit_log enable row level security;

-- Live feed: broadcast new tap_events to subscribed dashboards (RLS still applies).
alter publication supabase_realtime add table tap_events;
