-- Performance: the read policies on tap_events, tags and stores called can_view_store()
-- once for every row, about 1 ms each. With thousands of taps that made the dashboard
-- time out (8+ seconds just to count them). Written as "store_id IN (SELECT ...)",
-- Postgres works out the visible stores once per query and checks each row against that
-- set. Exactly the same rule, just evaluated once.
drop policy tap_events_select on tap_events;
create policy tap_events_select on tap_events for select to authenticated
  using (store_id in (select visible_store_ids()));

drop policy tags_select on tags;
create policy tags_select on tags for select to authenticated
  using (store_id in (select visible_store_ids()));

drop policy stores_select on stores;
create policy stores_select on stores for select to authenticated
  using (id in (select visible_store_ids()) or can_manage_city(city_id));
