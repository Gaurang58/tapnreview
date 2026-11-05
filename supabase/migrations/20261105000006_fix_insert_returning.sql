-- Fix: an area manager who inserted a city or store and asked for the new row back
-- (INSERT ... RETURNING, which the app and supabase-js do) was refused. The read
-- policy's helper looked the brand-new row up in its own snapshot, where it does
-- not exist yet. Adding the "can manage the parent" test lets the new row through.
-- It widens nothing: anyone who manages a parent area/city already sees everything under it.
drop policy cities_select on cities;
create policy cities_select on cities for select to authenticated
  using (can_view_city(id) or can_manage_area(area_id));

drop policy stores_select on stores;
create policy stores_select on stores for select to authenticated
  using (can_view_store(id) or can_manage_city(city_id));
