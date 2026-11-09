#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

command -v psql >/dev/null 2>&1 || {
  echo "psql is required; install the PostgreSQL client first" >&2
  exit 1
}

# This runner is intentionally for explicitly reviewed SQL files only. It does
# not run automatically during a production deploy.
shopt -s nullglob
migrations=(railway/migrations/*.sql)
if (( ${#migrations[@]} == 0 )); then
  echo "No Railway SQL migrations found" >&2
  exit 1
fi

for migration in "${migrations[@]}"; do
  echo "Applying ${migration}"
  psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file "$migration"
done
