-- Tap Review: roles and access control.
-- The database is the real guard. Every rule below is enforced by Postgres
-- Row Level Security, so a user calling the Supabase API directly with their own
-- token gets exactly the same answer as the dashboard.
--
-- Helper functions are SECURITY DEFINER (they run as the migration owner, who
-- bypasses RLS) so policies can look at memberships without recursing into the
-- memberships policies themselves. They are STABLE so Postgres can cache them
-- within a statement.

-- ---------------------------------------------------------------------------
-- Who am I?
-- ---------------------------------------------------------------------------
create or replace function current_user_is_active()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.is_active from profiles p where p.user_id = auth.uid()),
    false
  );
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select current_user_is_active() and exists (
    select 1 from memberships m
    where m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- Areas this user manages (area_manager memberships).
create or replace function managed_area_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select m.area_id from memberships m
  where m.user_id = auth.uid() and m.role = 'area_manager' and m.area_id is not null
    and current_user_is_active();
$$;

-- Stores this user manages as bureau_manager.
create or replace function managed_store_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select m.store_id from memberships m
  where m.user_id = auth.uid() and m.role = 'bureau_manager' and m.store_id is not null
    and current_user_is_active();
$$;

-- Every store this user may look at, whatever the role.
create or replace function visible_store_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select s.id from stores s where is_admin()
  union
  select s.id from stores s
    join cities c on c.id = s.city_id
    where c.area_id in (select managed_area_ids())
  union
  select m.store_id from memberships m
    where m.user_id = auth.uid()
      and m.role in ('bureau_manager', 'staff')
      and m.store_id is not null
      and current_user_is_active();
$$;

create or replace function can_view_store(p_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_store_id in (select visible_store_ids());
$$;

-- Admin, the area manager of the store's area, or the store's bureau manager.
create or replace function can_manage_store(p_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_admin()
    or p_store_id in (select managed_store_ids())
    or exists (
      select 1 from stores s join cities c on c.id = s.city_id
      where s.id = p_store_id and c.area_id in (select managed_area_ids())
    );
$$;

create or replace function can_view_area(p_area_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_admin()
    or p_area_id in (select managed_area_ids())
    or exists (
      select 1 from stores s join cities c on c.id = s.city_id
      where c.area_id = p_area_id and s.id in (select visible_store_ids())
    );
$$;

-- Admin or the area's manager.
create or replace function can_manage_area(p_area_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_admin() or p_area_id in (select managed_area_ids());
$$;

create or replace function can_view_city(p_city_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_admin()
    or exists (select 1 from cities c where c.id = p_city_id and c.area_id in (select managed_area_ids()))
    or exists (
      select 1 from stores s where s.city_id = p_city_id and s.id in (select visible_store_ids())
    );
$$;

create or replace function can_manage_city(p_city_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from cities c where c.id = p_city_id and can_manage_area(c.area_id));
$$;

-- Does a membership row fall inside the caller's scope?
-- Admin: everything. Area manager: memberships for their areas and for stores in
-- those areas. Bureau manager: memberships for their stores.
create or replace function membership_in_scope(p_role app_role, p_area_id uuid, p_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_admin()
    or (p_area_id is not null and p_area_id in (select managed_area_ids()))
    or (p_store_id is not null and can_manage_store(p_store_id));
$$;

-- Is a person (by user id) visible to the caller: themselves, or anyone holding
-- a membership inside the caller's scope.
create or replace function profile_in_scope(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_user_id = auth.uid()
    or exists (
      select 1 from memberships m
      where m.user_id = p_user_id and membership_in_scope(m.role, m.area_id, m.store_id)
    );
$$;

-- The highest role the caller holds, as a number (used by the invite action and
-- by tests). 4 = admin ... 1 = staff, 0 = none.
create or replace function my_role_rank()
returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(case m.role
      when 'admin' then 4
      when 'area_manager' then 3
      when 'bureau_manager' then 2
      when 'staff' then 1 end), 0)
  from memberships m where m.user_id = auth.uid() and current_user_is_active();
$$;

-- The caller's memberships, for the dashboard to decide navigation and filters.
create or replace function my_memberships()
returns table (role app_role, organisation_id uuid, area_id uuid, store_id uuid)
language sql stable security definer set search_path = public as $$
  select m.role, m.organisation_id, m.area_id, m.store_id
  from memberships m where m.user_id = auth.uid() and current_user_is_active();
$$;

-- Only signed-in users may call the helpers; anonymous visitors never need them.
revoke execute on function current_user_is_active(), is_admin(), managed_area_ids(), managed_store_ids(),
  visible_store_ids(), can_view_store(uuid), can_manage_store(uuid), can_view_area(uuid),
  can_manage_area(uuid), can_view_city(uuid), can_manage_city(uuid),
  membership_in_scope(app_role, uuid, uuid), profile_in_scope(uuid), my_role_rank(), my_memberships()
  from public, anon;
grant execute on function current_user_is_active(), is_admin(), managed_area_ids(), managed_store_ids(),
  visible_store_ids(), can_view_store(uuid), can_manage_store(uuid), can_view_area(uuid),
  can_manage_area(uuid), can_view_city(uuid), can_manage_city(uuid),
  membership_in_scope(app_role, uuid, uuid), profile_in_scope(uuid), my_role_rank(), my_memberships()
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Policies. Reads first, then writes. Where a table has no insert/update/delete
-- policy for a role, that role simply cannot write to it.
-- ---------------------------------------------------------------------------

-- organisations: every active signed-in user may read; only admins may change.
create policy organisations_select on organisations for select to authenticated
  using (current_user_is_active());
create policy organisations_insert on organisations for insert to authenticated
  with check (is_admin());
create policy organisations_update on organisations for update to authenticated
  using (is_admin()) with check (is_admin());

-- areas
create policy areas_select on areas for select to authenticated
  using (can_view_area(id));
create policy areas_insert on areas for insert to authenticated
  with check (is_admin());
create policy areas_update on areas for update to authenticated
  using (is_admin()) with check (is_admin());

-- cities
create policy cities_select on cities for select to authenticated
  using (can_view_city(id));
create policy cities_insert on cities for insert to authenticated
  with check (can_manage_area(area_id));
create policy cities_update on cities for update to authenticated
  using (can_manage_city(id)) with check (can_manage_area(area_id));

-- stores
create policy stores_select on stores for select to authenticated
  using (can_view_store(id));
create policy stores_insert on stores for insert to authenticated
  with check (can_manage_city(city_id));
create policy stores_update on stores for update to authenticated
  using (
    is_admin() or exists (
      select 1 from cities c where c.id = stores.city_id and c.area_id in (select managed_area_ids())
    )
  )
  with check (can_manage_city(city_id));

-- tags: visible with the store; changeable by whoever manages the store.
-- Moving a tag needs rights over both the old store (USING) and the new (WITH CHECK).
create policy tags_select on tags for select to authenticated
  using (can_view_store(store_id));
create policy tags_insert on tags for insert to authenticated
  with check (can_manage_store(store_id));
create policy tags_update on tags for update to authenticated
  using (can_manage_store(store_id)) with check (can_manage_store(store_id));

-- tap_events: readable with the store; never writable by a signed-in user.
-- Only the redirect routes insert, using the service role which bypasses RLS.
create policy tap_events_select on tap_events for select to authenticated
  using (can_view_store(store_id));

-- profiles: yourself plus anyone in your scope. You may only edit your own name;
-- the trigger below stops a user flipping their own is_active or email.
create policy profiles_select on profiles for select to authenticated
  using (profile_in_scope(user_id));
create policy profiles_update_own on profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function profiles_guard()
returns trigger language plpgsql as $$
begin
  -- Service role (invite / deactivate actions) may change anything.
  if coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'authenticated' then
    if new.is_active is distinct from old.is_active or new.email is distinct from old.email then
      raise exception 'only an administrator can change this';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on profiles
  for each row execute function profiles_guard();

-- memberships: read your own and those in your scope; no writes from users at all.
-- The invite and role server actions write with the service role after checking
-- that the inviter is not granting above their own role or outside their scope.
create policy memberships_select on memberships for select to authenticated
  using (user_id = auth.uid() or membership_in_scope(role, area_id, store_id));

-- audit_log: admin sees all; area managers see entries tagged with their areas.
create policy audit_log_select on audit_log for select to authenticated
  using (
    is_admin()
    or (
      (details->>'area_id') is not null
      and (details->>'area_id')::uuid in (select managed_area_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- Audit triggers: record who changed what on the structure tables. These run as
-- SECURITY DEFINER so they can insert into audit_log regardless of the caller.
-- ---------------------------------------------------------------------------
create or replace function area_id_for_store(p_store_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select c.area_id from stores s join cities c on c.id = s.city_id where s.id = p_store_id;
$$;

create or replace function audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action text;
  v_entity_id text;
  v_details jsonb := '{}'::jsonb;
  v_area uuid;
begin
  v_action := tg_table_name || '.' || lower(tg_op);
  if tg_op = 'INSERT' then
    v_entity_id := new.id::text;
    v_details := jsonb_build_object('after', to_jsonb(new));
  else
    v_entity_id := new.id::text;
    v_details := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));
    -- Friendlier action names for the common tag changes.
    if tg_table_name = 'tags' then
      if new.retired_at is not null and old.retired_at is null then v_action := 'tag.retired';
      elsif new.store_id <> old.store_id then v_action := 'tag.moved';
      elsif new.is_active <> old.is_active then v_action := case when new.is_active then 'tag.activated' else 'tag.deactivated' end;
      elsif new.label <> old.label then v_action := 'tag.renamed';
      else v_action := 'tag.updated';
      end if;
    end if;
  end if;

  -- Tag the entry with an area so area managers can see it.
  if tg_table_name = 'areas' then v_area := new.id;
  elsif tg_table_name = 'cities' then v_area := new.area_id;
  elsif tg_table_name = 'stores' then select c.area_id into v_area from cities c where c.id = new.city_id;
  elsif tg_table_name = 'tags' then v_area := area_id_for_store(new.store_id);
  end if;
  if v_area is not null then
    v_details := v_details || jsonb_build_object('area_id', v_area);
  end if;

  insert into audit_log (actor_id, action, entity, entity_id, details)
  values (auth.uid(), v_action, tg_table_name, v_entity_id, v_details);
  return new;
end $$;

create trigger areas_audit after insert or update on areas
  for each row execute function audit_row_change();
create trigger cities_audit after insert or update on cities
  for each row execute function audit_row_change();
create trigger stores_audit after insert or update on stores
  for each row execute function audit_row_change();
create trigger tags_audit after insert or update on tags
  for each row execute function audit_row_change();
