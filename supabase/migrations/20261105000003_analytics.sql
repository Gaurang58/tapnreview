-- Tap Review: analytics functions.
-- All functions are SECURITY INVOKER (the default), so they run with the
-- caller's permissions and RLS on tap_events, stores and tags still applies.
-- Days are grouped in Europe/London. Duplicates and bots are excluded unless
-- p_include_flagged is true. Demo events are included unless p_include_demo
-- is false.
--
-- Shared filter parameters:
--   p_from, p_to      London calendar dates, inclusive
--   p_area_id, p_city_id, p_store_id   optional scope
--   p_method          'nfc' | 'qr' | null for both
--   p_include_demo    include seeded events (default true)
--   p_include_flagged include duplicates and bots (default false)

-- Converts a London calendar date to the UTC instant it starts.
create or replace function london_day_start(p_day date)
returns timestamptz language sql stable as $$
  select (p_day::timestamp) at time zone 'Europe/London';
$$;

-- ---------------------------------------------------------------------------
-- KPI totals for a period.
-- ---------------------------------------------------------------------------
create or replace function analytics_totals(
  p_from date,
  p_to date,
  p_area_id uuid default null,
  p_city_id uuid default null,
  p_store_id uuid default null,
  p_method tap_method default null,
  p_include_demo boolean default true,
  p_include_flagged boolean default false
)
returns table (
  interactions bigint,
  nfc bigint,
  qr bigint,
  demo_events bigint,
  active_tags bigint,
  live_stores bigint
)
language sql stable set search_path = public as $$
  with ev as (
    select e.*
    from tap_events e
    join stores s on s.id = e.store_id
    join cities c on c.id = s.city_id
    where e.occurred_at >= london_day_start(p_from)
      and e.occurred_at <  london_day_start(p_to + 1)
      and (p_area_id is null or c.area_id = p_area_id)
      and (p_city_id is null or s.city_id = p_city_id)
      and (p_store_id is null or e.store_id = p_store_id)
      and (p_method is null or e.method = p_method)
      and (p_include_demo or not e.is_demo)
      and (p_include_flagged or (not e.is_duplicate and not e.is_bot))
  ),
  scope_stores as (
    select s.id from stores s join cities c on c.id = s.city_id
    where (p_area_id is null or c.area_id = p_area_id)
      and (p_city_id is null or s.city_id = p_city_id)
      and (p_store_id is null or s.id = p_store_id)
  )
  select
    (select count(*) from ev)                                   as interactions,
    (select count(*) from ev where method = 'nfc')              as nfc,
    (select count(*) from ev where method = 'qr')               as qr,
    (select count(*) from ev where is_demo)                     as demo_events,
    (select count(*) from tags t where t.is_active and t.retired_at is null
        and t.store_id in (select id from scope_stores))        as active_tags,
    (select count(distinct store_id) from ev)                   as live_stores;
$$;

-- ---------------------------------------------------------------------------
-- Daily series: one row per London day, with zeros for quiet days.
-- ---------------------------------------------------------------------------
create or replace function analytics_daily(
  p_from date,
  p_to date,
  p_area_id uuid default null,
  p_city_id uuid default null,
  p_store_id uuid default null,
  p_method tap_method default null,
  p_include_demo boolean default true,
  p_include_flagged boolean default false
)
returns table (day date, nfc bigint, qr bigint, total bigint)
language sql stable set search_path = public as $$
  with days as (
    select d::date as day from generate_series(p_from, p_to, interval '1 day') d
  ),
  ev as (
    select (e.occurred_at at time zone 'Europe/London')::date as day, e.method
    from tap_events e
    join stores s on s.id = e.store_id
    join cities c on c.id = s.city_id
    where e.occurred_at >= london_day_start(p_from)
      and e.occurred_at <  london_day_start(p_to + 1)
      and (p_area_id is null or c.area_id = p_area_id)
      and (p_city_id is null or s.city_id = p_city_id)
      and (p_store_id is null or e.store_id = p_store_id)
      and (p_method is null or e.method = p_method)
      and (p_include_demo or not e.is_demo)
      and (p_include_flagged or (not e.is_duplicate and not e.is_bot))
  )
  select
    days.day,
    count(*) filter (where ev.method = 'nfc') as nfc,
    count(*) filter (where ev.method = 'qr')  as qr,
    count(ev.method)                           as total
  from days left join ev on ev.day = days.day
  group by days.day
  order by days.day;
$$;

-- ---------------------------------------------------------------------------
-- Per-store breakdown. City and area figures are added up from these rows in
-- the app, never stored, so they can't drift.
-- ---------------------------------------------------------------------------
create or replace function analytics_by_store(
  p_from date,
  p_to date,
  p_area_id uuid default null,
  p_city_id uuid default null,
  p_store_id uuid default null,
  p_method tap_method default null,
  p_include_demo boolean default true,
  p_include_flagged boolean default false
)
returns table (
  store_id uuid,
  store_name text,
  store_is_active boolean,
  city_id uuid,
  city_name text,
  area_id uuid,
  area_name text,
  nfc bigint,
  qr bigint,
  total bigint,
  active_tags bigint,
  last_tap_at timestamptz
)
language sql stable set search_path = public as $$
  select
    s.id, s.name, s.is_active,
    c.id, c.name,
    a.id, a.name,
    count(e.id) filter (where e.method = 'nfc') as nfc,
    count(e.id) filter (where e.method = 'qr')  as qr,
    count(e.id)                                 as total,
    (select count(*) from tags t where t.store_id = s.id and t.is_active and t.retired_at is null) as active_tags,
    max(e.occurred_at)                          as last_tap_at
  from stores s
  join cities c on c.id = s.city_id
  join areas a on a.id = c.area_id
  left join tap_events e
    on e.store_id = s.id
   and e.occurred_at >= london_day_start(p_from)
   and e.occurred_at <  london_day_start(p_to + 1)
   and (p_method is null or e.method = p_method)
   and (p_include_demo or not e.is_demo)
   and (p_include_flagged or (not e.is_duplicate and not e.is_bot))
  where (p_area_id is null or a.id = p_area_id)
    and (p_city_id is null or c.id = p_city_id)
    and (p_store_id is null or s.id = p_store_id)
  group by s.id, s.name, s.is_active, c.id, c.name, a.id, a.name
  order by a.name, c.name, s.name;
$$;

-- ---------------------------------------------------------------------------
-- Day-of-week by hour-of-day grid (0 = Sunday ... 6 = Saturday, London time).
-- ---------------------------------------------------------------------------
create or replace function analytics_hourly(
  p_from date,
  p_to date,
  p_area_id uuid default null,
  p_city_id uuid default null,
  p_store_id uuid default null,
  p_method tap_method default null,
  p_include_demo boolean default true,
  p_include_flagged boolean default false
)
returns table (dow int, hour int, nfc bigint, qr bigint, total bigint)
language sql stable set search_path = public as $$
  select
    extract(dow  from (e.occurred_at at time zone 'Europe/London'))::int as dow,
    extract(hour from (e.occurred_at at time zone 'Europe/London'))::int as hour,
    count(*) filter (where e.method = 'nfc') as nfc,
    count(*) filter (where e.method = 'qr')  as qr,
    count(*)                                 as total
  from tap_events e
  join stores s on s.id = e.store_id
  join cities c on c.id = s.city_id
  where e.occurred_at >= london_day_start(p_from)
    and e.occurred_at <  london_day_start(p_to + 1)
    and (p_area_id is null or c.area_id = p_area_id)
    and (p_city_id is null or s.city_id = p_city_id)
    and (p_store_id is null or e.store_id = p_store_id)
    and (p_method is null or e.method = p_method)
    and (p_include_demo or not e.is_demo)
    and (p_include_flagged or (not e.is_duplicate and not e.is_bot))
  group by 1, 2
  order by 1, 2;
$$;

-- ---------------------------------------------------------------------------
-- Per-tag counts for the store detail and tags pages.
-- ---------------------------------------------------------------------------
create or replace function analytics_by_tag(
  p_from date,
  p_to date,
  p_store_id uuid default null,
  p_include_demo boolean default true,
  p_include_flagged boolean default false
)
returns table (
  tag_id uuid,
  label text,
  public_code text,
  store_id uuid,
  store_name text,
  is_active boolean,
  retired_at timestamptz,
  nfc bigint,
  qr bigint,
  total bigint,
  last_tap_at timestamptz
)
language sql stable set search_path = public as $$
  select
    t.id, t.label, t.public_code, t.store_id, s.name, t.is_active, t.retired_at,
    count(e.id) filter (where e.method = 'nfc') as nfc,
    count(e.id) filter (where e.method = 'qr')  as qr,
    count(e.id)                                 as total,
    max(e.occurred_at)                          as last_tap_at
  from tags t
  join stores s on s.id = t.store_id
  left join tap_events e
    on e.tag_id = t.id
   and e.occurred_at >= london_day_start(p_from)
   and e.occurred_at <  london_day_start(p_to + 1)
   and (p_include_demo or not e.is_demo)
   and (p_include_flagged or (not e.is_duplicate and not e.is_bot))
  where (p_store_id is null or t.store_id = p_store_id)
  group by t.id, t.label, t.public_code, t.store_id, s.name, t.is_active, t.retired_at
  order by s.name, t.created_at;
$$;

-- ---------------------------------------------------------------------------
-- Recent events for the live feed (newest first). Flagged events are left out
-- so the board only shows taps that count.
-- ---------------------------------------------------------------------------
create or replace function analytics_recent(
  p_limit int default 12,
  p_area_id uuid default null,
  p_city_id uuid default null,
  p_store_id uuid default null,
  p_method tap_method default null,
  p_include_demo boolean default true
)
returns table (
  id bigint,
  occurred_at timestamptz,
  method tap_method,
  store_id uuid,
  store_name text,
  tag_id uuid,
  tag_label text,
  is_demo boolean
)
language sql stable set search_path = public as $$
  select e.id, e.occurred_at, e.method, s.id, s.name, t.id, t.label, e.is_demo
  from tap_events e
  join stores s on s.id = e.store_id
  join cities c on c.id = s.city_id
  join tags t on t.id = e.tag_id
  where not e.is_duplicate and not e.is_bot
    and (p_area_id is null or c.area_id = p_area_id)
    and (p_city_id is null or s.city_id = p_city_id)
    and (p_store_id is null or e.store_id = p_store_id)
    and (p_method is null or e.method = p_method)
    and (p_include_demo or not e.is_demo)
  order by e.occurred_at desc
  limit greatest(1, least(p_limit, 100));
$$;

-- Today's count in London, for the tap board headline.
create or replace function analytics_today(
  p_area_id uuid default null,
  p_city_id uuid default null,
  p_store_id uuid default null,
  p_method tap_method default null,
  p_include_demo boolean default true
)
returns bigint
language sql stable set search_path = public as $$
  select count(*)
  from tap_events e
  join stores s on s.id = e.store_id
  join cities c on c.id = s.city_id
  where not e.is_duplicate and not e.is_bot
    and e.occurred_at >= london_day_start((now() at time zone 'Europe/London')::date)
    and (p_area_id is null or c.area_id = p_area_id)
    and (p_city_id is null or s.city_id = p_city_id)
    and (p_store_id is null or e.store_id = p_store_id)
    and (p_method is null or e.method = p_method)
    and (p_include_demo or not e.is_demo);
$$;

revoke execute on function
  analytics_totals(date, date, uuid, uuid, uuid, tap_method, boolean, boolean),
  analytics_daily(date, date, uuid, uuid, uuid, tap_method, boolean, boolean),
  analytics_by_store(date, date, uuid, uuid, uuid, tap_method, boolean, boolean),
  analytics_hourly(date, date, uuid, uuid, uuid, tap_method, boolean, boolean),
  analytics_by_tag(date, date, uuid, boolean, boolean),
  analytics_recent(int, uuid, uuid, uuid, tap_method, boolean),
  analytics_today(uuid, uuid, uuid, tap_method, boolean)
  from public, anon;
