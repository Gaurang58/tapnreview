-- A retired tag can never be switched back on (retiring is permanent).
create or replace function tags_guard()
returns trigger language plpgsql set search_path = public as $$
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
  if new.retired_at is not null and new.is_active then
    raise exception 'a retired tag cannot be switched on; create a new tag instead';
  end if;
  return new;
end $$;
