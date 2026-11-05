-- Access tests at the database level: act as each role by setting the role and
-- JWT claims the way Supabase's API does, then assert what is and is not allowed.
-- Any failed assertion raises an exception and the script stops with a non-zero exit.
\set ON_ERROR_STOP on
\set QUIET on

create schema t;
grant usage on schema t to anon, authenticated;

create function t.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

create function t.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
end $$;

create function t.reset() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $$;

create function t.ok(p_name text, p_cond boolean) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'FAIL: %', p_name; end if;
  raise notice 'ok   %', p_name;
end $$;

-- Passes only if the statement raises an error (RLS violation, trigger, no privilege).
create function t.throws(p_name text, p_sql text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'ok   % (refused: %)', p_name, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % (statement was allowed)', p_name;
end $$;

-- Number of rows an UPDATE/DELETE actually touched (0 means RLS hid the row).
create function t.rows_changed(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;

-- Runs an INSERT ... RETURNING and passes only if a row came back (as the app does).
create function t.inserts_and_returns(p_name text, p_sql text) returns void language plpgsql as $$
declare v text;
begin
  execute p_sql || ' returning id::text' into v;
  if v is null then raise exception 'FAIL: % (no row returned)', p_name; end if;
  raise notice 'ok   %', p_name;
end $$;

create function t.n(p_sql text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute 'select count(*) from (' || p_sql || ') q' into n;
  return n;
end $$;

grant execute on all functions in schema t to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fixture (as superuser, bypassing RLS)
-- ---------------------------------------------------------------------------
insert into organisations (id, name) values ('00000000-0000-0000-0000-0000000000a0', 'Asda Travel Money');
insert into areas (id, organisation_id, name) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a0', 'Area 1'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a0', 'Area 2');
insert into cities (id, area_id, name) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'Nottingham'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a2', 'Manchester');
insert into stores (id, city_id, name, google_review_url) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Nottingham West Bridgford', 'https://search.google.com/local/writereview?placeid=x'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'Nottingham Bulwell', 'https://search.google.com/local/writereview?placeid=y'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c2', 'Manchester Arndale', 'https://search.google.com/local/writereview?placeid=z');
insert into tags (id, store_id, label, public_code) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'Nottingham West Bridgford tag', 'wbWB000001'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2', 'Nottingham Bulwell tag', 'buBU000002'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b3', 'Manchester Arndale tag', 'maMA000003');

-- People: admin, area manager (Area 1), bureau manager (WB), staff (WB), deactivated staff (WB).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000ad01', 'admin@x'),
  ('00000000-0000-0000-0000-00000000a501', 'area1@x'),
  ('00000000-0000-0000-0000-00000000b501', 'bm@x'),
  ('00000000-0000-0000-0000-00000000c501', 'staff@x'),
  ('00000000-0000-0000-0000-00000000d501', 'gone@x');
update profiles set is_active = false where user_id = '00000000-0000-0000-0000-00000000d501';
insert into memberships (user_id, role, organisation_id) values
  ('00000000-0000-0000-0000-00000000ad01', 'admin', '00000000-0000-0000-0000-0000000000a0');
insert into memberships (user_id, role, area_id) values
  ('00000000-0000-0000-0000-00000000a501', 'area_manager', '00000000-0000-0000-0000-0000000000a1');
insert into memberships (user_id, role, store_id) values
  ('00000000-0000-0000-0000-00000000b501', 'bureau_manager', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-00000000c501', 'staff', '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-00000000d501', 'staff', '00000000-0000-0000-0000-0000000000b1');

-- Events: 2 counted + 1 duplicate + 1 bot at WB; 1 at Bulwell; 1 at Arndale.
-- 23:30 UTC on 1 July is 00:30 BST on 2 July: it belongs to the London day 2 July.
insert into tap_events (tag_id, store_id, method, occurred_at, is_duplicate, is_bot, is_demo) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'nfc', '2026-07-01 23:30:00+00', false, false, true),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'qr',  '2026-07-02 10:00:00+00', false, false, true),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'qr',  '2026-07-02 10:05:00+00', true,  false, true),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1', 'nfc', '2026-07-02 11:00:00+00', false, true,  true),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b2', 'nfc', '2026-07-02 12:00:00+00', false, false, true),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000b3', 'nfc', '2026-07-02 12:00:00+00', false, false, true);

-- ---------------------------------------------------------------------------
-- Anonymous
-- ---------------------------------------------------------------------------
begin;
select t.as_anon();
select t.ok('anon reads no stores',      t.n('select 1 from stores') = 0);
select t.ok('anon reads no tap_events',  t.n('select 1 from tap_events') = 0);
select t.ok('anon reads no profiles',    t.n('select 1 from profiles') = 0);
select t.throws('anon cannot call analytics', $$select * from analytics_totals('2026-01-01','2026-12-31')$$);
select t.throws('anon cannot call is_admin', $$select is_admin()$$);
select t.throws('anon cannot call internal helpers', $$select area_id_for_store('00000000-0000-0000-0000-0000000000b1')$$);
rollback;

-- ---------------------------------------------------------------------------
-- Staff (West Bridgford)
-- ---------------------------------------------------------------------------
begin;
select t.as_user('00000000-0000-0000-0000-00000000c501');
select t.ok('staff sees exactly one store', t.n('select 1 from stores') = 1);
select t.ok('staff sees only their tag',    t.n('select 1 from tags') = 1);
select t.ok('staff sees only their store''s events', t.n('select 1 from tap_events where store_id <> ''00000000-0000-0000-0000-0000000000b1''') = 0);
select t.ok('staff sees their events',      t.n('select 1 from tap_events') = 4);
select t.ok('staff sees one area only via their store', t.n('select 1 from areas') = 1);
select t.ok('staff sees only own membership', t.n('select 1 from memberships') = 1);
select t.ok('staff sees only themselves in profiles', t.n('select 1 from profiles') = 1);
select t.ok('staff sees no audit log',      t.n('select 1 from audit_log') = 0);
select t.ok('staff can read the organisation', t.n('select 1 from organisations') = 1);
select t.ok('staff analytics scoped to their store',
  t.n($$select 1 from analytics_by_store('2026-01-01','2026-12-31') where total > 0$$) = 1
  and t.n($$select 1 from analytics_by_store('2026-01-01','2026-12-31')$$) = 1);
select t.throws('staff cannot insert a tag',  $$insert into tags (store_id,label,public_code) values ('00000000-0000-0000-0000-0000000000b1','x','zzzzzzzz01')$$);
select t.ok('staff cannot update a tag',      t.rows_changed($$update tags set label='hacked'$$) = 0);
select t.ok('staff cannot update the store',  t.rows_changed($$update stores set name='hacked'$$) = 0);
select t.throws('staff cannot insert a tap event', $$insert into tap_events (tag_id,store_id,method) values ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000b1','qr')$$);
select t.ok('staff cannot delete tap events', t.rows_changed($$delete from tap_events$$) = 0);
select t.throws('staff cannot grant themselves admin', $$insert into memberships (user_id,role,organisation_id) values ('00000000-0000-0000-0000-00000000c501','admin','00000000-0000-0000-0000-0000000000a0')$$);
select t.ok('staff cannot edit memberships',  t.rows_changed($$update memberships set store_id='00000000-0000-0000-0000-0000000000b3'$$) = 0);
select t.throws('staff cannot reactivate/deactivate themselves', $$update profiles set is_active = false where user_id = '00000000-0000-0000-0000-00000000c501'$$);
select t.throws('staff cannot change their email', $$update profiles set email = 'new@x' where user_id = '00000000-0000-0000-0000-00000000c501'$$);
select t.ok('staff can change their own name', t.rows_changed($$update profiles set full_name='Sam' where user_id = '00000000-0000-0000-0000-00000000c501'$$) = 1);
select t.ok('staff cannot change anyone else''s name', t.rows_changed($$update profiles set full_name='x' where user_id <> '00000000-0000-0000-0000-00000000c501'$$) = 0);
select t.throws('staff cannot create areas', $$insert into areas (organisation_id,name) values ('00000000-0000-0000-0000-0000000000a0','X')$$);
rollback;

-- ---------------------------------------------------------------------------
-- Bureau manager (West Bridgford)
-- ---------------------------------------------------------------------------
begin;
select t.as_user('00000000-0000-0000-0000-00000000b501');
select t.ok('bm sees only their store', t.n('select 1 from stores') = 1);
select t.ok('bm sees staff memberships in their store', t.n('select 1 from memberships') = 3);
select t.ok('bm sees profiles of their store', t.n('select 1 from profiles') = 3);
select t.ok('bm can create a tag in their store', t.rows_changed($$insert into tags (store_id,label,public_code) values ('00000000-0000-0000-0000-0000000000b1','New','newcode0001')$$) = 1);
select t.inserts_and_returns('bm can add a tag and read it back', $$insert into tags (store_id,label,public_code) values ('00000000-0000-0000-0000-0000000000b1','Another','newcode0009')$$);
select t.throws('bm cannot create a tag elsewhere', $$insert into tags (store_id,label,public_code) values ('00000000-0000-0000-0000-0000000000b2','New','newcode0002')$$);
select t.ok('bm can rename their tag', t.rows_changed($$update tags set label='Renamed' where public_code='wbWB000001'$$) = 1);
select t.throws('bm cannot move a tag to a store they do not manage', $$update tags set store_id='00000000-0000-0000-0000-0000000000b2' where public_code='wbWB000001'$$);
select t.ok('bm cannot touch another store''s tag', t.rows_changed($$update tags set label='x' where public_code='buBU000002'$$) = 0);
select t.throws('bm cannot change a printed code', $$update tags set public_code='changed0001' where public_code='wbWB000001'$$);
select t.ok('bm can retire a tag (switches it off)', t.rows_changed($$update tags set retired_at=now() where public_code='newcode0001'$$) = 1);
select t.ok('retired tag is inactive', (select not is_active from tags where public_code='newcode0001'));
select t.throws('a retired tag cannot be switched on', $$update tags set is_active=true where public_code='newcode0001'$$);
select t.throws('bm cannot un-retire a tag', $$update tags set retired_at=null where public_code='newcode0001'$$);
select t.ok('bm cannot edit the store', t.rows_changed($$update stores set name='x'$$) = 0);
select t.throws('bm cannot create a store', $$insert into stores (city_id,name,google_review_url) values ('00000000-0000-0000-0000-0000000000c1','New','https://search.google.com/x')$$);
select t.throws('bm cannot create a city', $$insert into cities (area_id,name) values ('00000000-0000-0000-0000-0000000000a1','New')$$);
select t.throws('bm cannot write memberships directly', $$insert into memberships (user_id,role,store_id) values ('00000000-0000-0000-0000-00000000c501','bureau_manager','00000000-0000-0000-0000-0000000000b1')$$);
select t.ok('bm sees no audit log (not admin/area manager)', t.n('select 1 from audit_log') = 0);
rollback;

-- ---------------------------------------------------------------------------
-- Area manager (Area 1)
-- ---------------------------------------------------------------------------
begin;
select t.as_user('00000000-0000-0000-0000-00000000a501');
select t.ok('am sees both Area 1 stores', t.n('select 1 from stores') = 2);
select t.ok('am sees only Area 1', t.n('select 1 from areas') = 1);
select t.ok('am sees only Nottingham', t.n('select 1 from cities') = 1);
select t.ok('am sees Area 1 events only', t.n('select 1 from tap_events') = 5);
select t.ok('am can add a city in Area 1', t.rows_changed($$insert into cities (area_id,name) values ('00000000-0000-0000-0000-0000000000a1','Derby')$$) = 1);
select t.inserts_and_returns('am can add a city in Area 1 and read it back', $$insert into cities (area_id,name) values ('00000000-0000-0000-0000-0000000000a1','Lincoln')$$);
select t.inserts_and_returns('am can add a store in Area 1 and read it back', $$insert into stores (city_id,name,google_review_url) values ('00000000-0000-0000-0000-0000000000c1','Nottingham Clifton','https://search.google.com/local/writereview?placeid=r')$$);
select t.throws('am cannot add a city in Area 2', $$insert into cities (area_id,name) values ('00000000-0000-0000-0000-0000000000a2','Leeds')$$);
select t.throws('am cannot move a city into Area 2', $$update cities set area_id='00000000-0000-0000-0000-0000000000a2' where name='Nottingham'$$);
select t.throws('am cannot create areas', $$insert into areas (organisation_id,name) values ('00000000-0000-0000-0000-0000000000a0','Area 9')$$);
select t.ok('am can add a store in Area 1', t.rows_changed($$insert into stores (city_id,name,google_review_url) values ('00000000-0000-0000-0000-0000000000c1','Nottingham Beeston','https://search.google.com/local/writereview?placeid=q')$$) = 1);
select t.throws('store review link must be on a Google host (scam page refused)', $$insert into stores (city_id,name,google_review_url) values ('00000000-0000-0000-0000-0000000000c1','Scam','https://evil.example/google.com')$$);
select t.throws('look-alike host refused', $$insert into stores (city_id,name,google_review_url) values ('00000000-0000-0000-0000-0000000000c1','Scam2','https://google.com.evil.example/')$$);
select t.throws('userinfo trick refused', $$insert into stores (city_id,name,google_review_url) values ('00000000-0000-0000-0000-0000000000c1','Scam3','https://google.com@evil.example/')$$);
select t.throws('plain http refused', $$insert into stores (city_id,name,google_review_url) values ('00000000-0000-0000-0000-0000000000c1','Scam4','http://search.google.com/local/writereview?placeid=x')$$);
select t.ok('country Google domain allowed', t.rows_changed($$insert into stores (city_id,name,google_review_url) values ('00000000-0000-0000-0000-0000000000c1','Okay','https://www.google.co.uk/maps/place/x')$$) = 1);
select t.throws('am cannot add a store in Area 2', $$insert into stores (city_id,name,google_review_url) values ('00000000-0000-0000-0000-0000000000c2','Manchester Salford','https://search.google.com/local/writereview?placeid=q')$$);
select t.ok('am can edit a store in Area 1', t.rows_changed($$update stores set google_place_id='p' where name='Nottingham Bulwell'$$) = 1);
select t.ok('am cannot see Area 2 stores to edit them', t.rows_changed($$update stores set google_place_id='p' where name='Manchester Arndale'$$) = 0);
select t.ok('am can create a tag in Area 1', t.rows_changed($$insert into tags (store_id,label,public_code) values ('00000000-0000-0000-0000-0000000000b2','New','amcode00001')$$) = 1);
select t.throws('am cannot create a tag in Area 2', $$insert into tags (store_id,label,public_code) values ('00000000-0000-0000-0000-0000000000b3','New','amcode00002')$$);
select t.ok('am can move a tag between Area 1 stores', t.rows_changed($$update tags set store_id='00000000-0000-0000-0000-0000000000b2' where public_code='wbWB000001'$$) = 1);
select t.throws('am cannot move a tag into Area 2', $$update tags set store_id='00000000-0000-0000-0000-0000000000b3' where public_code='amcode00001'$$);
select t.ok('am sees audit entries for Area 1 only',
  t.n('select 1 from audit_log') > 0
  and t.n($$select 1 from audit_log where details->>'area_id' <> '00000000-0000-0000-0000-0000000000a1'$$) = 0);
select t.ok('am sees staff profiles in Area 1', t.n('select 1 from profiles') = 4);
select t.throws('am cannot write memberships directly', $$insert into memberships (user_id,role,store_id) values ('00000000-0000-0000-0000-00000000c501','bureau_manager','00000000-0000-0000-0000-0000000000b2')$$);
select t.throws('am cannot write tap events', $$insert into tap_events (tag_id,store_id,method) values ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000b1','qr')$$);
rollback;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
begin;
select t.as_user('00000000-0000-0000-0000-00000000ad01');
select t.ok('admin sees all stores', t.n('select 1 from stores') = 3);
select t.ok('admin sees all areas',  t.n('select 1 from areas') = 2);
select t.ok('admin sees all events', t.n('select 1 from tap_events') = 6);
select t.inserts_and_returns('admin can add an area and read it back', $$insert into areas (organisation_id,name) values ('00000000-0000-0000-0000-0000000000a0','Area 4')$$);
select t.ok('admin can create an area', t.rows_changed($$insert into areas (organisation_id,name) values ('00000000-0000-0000-0000-0000000000a0','Area 3')$$) = 1);
select t.ok('admin can see audit log', t.n('select 1 from audit_log') > 0);
select t.throws('admin still cannot write tap events', $$insert into tap_events (tag_id,store_id,method) values ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000b1','qr')$$);
select t.throws('admin cannot write memberships from the API', $$insert into memberships (user_id,role,organisation_id) values ('00000000-0000-0000-0000-00000000c501','admin','00000000-0000-0000-0000-0000000000a0')$$);
select t.ok('nobody can hard-delete a store (deactivate instead)', t.rows_changed($$delete from stores where name='Nottingham Bulwell'$$) = 0);
select t.ok('nobody can hard-delete a tag', t.rows_changed($$delete from tags$$) = 0);
rollback;

-- ---------------------------------------------------------------------------
-- Deactivated user
-- ---------------------------------------------------------------------------
begin;
select t.as_user('00000000-0000-0000-0000-00000000d501');
select t.ok('deactivated user sees no stores',  t.n('select 1 from stores') = 0);
select t.ok('deactivated user sees no events',  t.n('select 1 from tap_events') = 0);
select t.ok('deactivated user sees no organisation', t.n('select 1 from organisations') = 0);
rollback;

-- ---------------------------------------------------------------------------
-- Analytics: London days, flagged events, filters
-- ---------------------------------------------------------------------------
begin;
select t.as_user('00000000-0000-0000-0000-00000000ad01');
select t.ok('duplicates and bots are not counted',
  (select interactions from analytics_totals('2026-07-01','2026-07-03')) = 4);  -- 2 WB + Bulwell + Arndale
select t.ok('include_flagged counts them',
  (select interactions from analytics_totals('2026-07-01','2026-07-03', p_include_flagged => true)) = 6);
select t.ok('a late-evening UTC tap belongs to the next London day',
  (select total from analytics_daily('2026-07-01','2026-07-03') where day = '2026-07-02') = 4
  and (select total from analytics_daily('2026-07-01','2026-07-03') where day = '2026-07-01') = 0);
select t.ok('quiet days appear as zero', (select count(*) from analytics_daily('2026-07-01','2026-07-03')) = 3);
select t.ok('method filter works', (select interactions from analytics_totals('2026-07-01','2026-07-03', p_method => 'qr')) = 1);
select t.ok('area filter works', (select interactions from analytics_totals('2026-07-01','2026-07-03', p_area_id => '00000000-0000-0000-0000-0000000000a2')) = 1);
select t.ok('demo filter works', (select interactions from analytics_totals('2026-07-01','2026-07-03', p_include_demo => false)) = 0);
select t.ok('hourly grid is in London time (00:30 BST = hour 0)',
  exists (select 1 from analytics_hourly('2026-07-01','2026-07-03') where hour = 0 and nfc = 1));
rollback;

\echo
\echo ALL DATABASE ACCESS CHECKS PASSED
