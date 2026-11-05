-- area_id_for_store is only called by the audit trigger (which runs as its owner),
-- so signed-in users do not need to call it through the API either.
revoke execute on function area_id_for_store(uuid) from authenticated;
