-- Hardening found by Supabase's security advisor after migrations 1-3 were applied.
-- 1. Trigger functions are never meant to be called from the API.
revoke execute on function audit_row_change(), handle_new_auth_user() from public, anon, authenticated;
-- 2. Pin the search path on the remaining plain functions.
alter function set_updated_at() set search_path = public;
alter function tags_guard() set search_path = public;
alter function profiles_guard() set search_path = public;
alter function london_day_start(date) set search_path = public;
-- london_day_start is a pure date calculation and stays callable: analytics functions use it.
