-- Same performance fix as the event rules: work out "am I an admin / which areas do I
-- manage" once per query instead of once per audit row. The rule itself is unchanged.
drop policy audit_log_select on audit_log;
create policy audit_log_select on audit_log for select to authenticated
  using (
    (select is_admin())
    or (
      (details->>'area_id') is not null
      and (details->>'area_id')::uuid in (select managed_area_ids())
    )
  );
