#!/usr/bin/env bash
# Applies every migration to a throwaway local Postgres (no Docker, no Supabase
# project touched) and runs supabase/tests/sql against it as each role.
# Usage: npm run test:db
set -euo pipefail
export LC_ALL=en_US.UTF-8
cd "$(dirname "$0")/.."

PGBIN="${PGBIN:-$(dirname "$(command -v initdb || command -v initdb-18)")}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/tapreview-pg.XXXXXX")"
SOCK="$WORK/sock"; mkdir -p "$SOCK"
cleanup() { [ -f "$WORK/log" ] && [ -n "${KEEPLOG:-}" ] && cat "$WORK/log" >&2; "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

"$PGBIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
"$PGBIN/pg_ctl" -D "$WORK/data" -o "-c listen_addresses='' -c unix_socket_directories=$SOCK" -l "$WORK/log" -w start >/dev/null
PSQL=("$PGBIN/psql" -h "$SOCK" -U postgres -v ON_ERROR_STOP=1 -q -d postgres)

"${PSQL[@]}" -f supabase/tests/sql/00_bootstrap.sql
for f in supabase/migrations/*.sql; do echo "applying $f"; "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f supabase/tests/sql/10_rls.test.sql 2>&1 | grep -E "^(psql:|NOTICE|ALL|ERROR)" | sed -E 's/^(psql:[^ ]+ )?NOTICE:  //'
