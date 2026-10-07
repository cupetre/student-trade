#!/usr/bin/env bash
# Sets up a self-hosted PostgreSQL 16 instance on a fresh Ubuntu/Debian VPS
# for Student Trade, replacing the managed provider.
#
# Run this ON THE VPS itself (e.g. over SSH), not from your dev machine:
#   scp server/db/setup-postgres-vps.sh server/db/schema.sql you@your-vps:~/
#   ssh you@your-vps
#   chmod +x setup-postgres-vps.sh
#   sudo ./setup-postgres-vps.sh
#
# EDIT DB_PASSWORD BELOW before running. Do not reuse the local dev password
# or any password that has ever been committed to git.

set -euo pipefail

DB_NAME="studenttrade"
DB_USER="studenttrade"
DB_PASSWORD="dfb1e452976ac07aca989060"

if [ "$DB_PASSWORD" = "dfb1e452976ac07aca989060" ]; then
  echo "Edit this script and set a real DB_PASSWORD before running. Aborting."
  exit 1
fi

echo "== Installing PostgreSQL =="
apt-get update -y
apt-get install -y postgresql postgresql-contrib

echo "== Creating role and database =="
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
   END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
SQL

echo "== Applying schema =="
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -f "$(dirname "$0")/schema.sql"

echo "== Done =="
echo "Update the app's production .env with:"
echo "  DB_HOST=localhost"
echo "  DB_PORT=5432"
echo "  DB_USER=${DB_USER}"
echo "  DB_PASS=${DB_PASSWORD}"
echo "  DB_NAME=${DB_NAME}"
echo "  DB_SSL=false"
echo
echo "By default Postgres only listens on localhost, which is correct here"
echo "since the app and DB run on the same VPS. Do not open port 5432 to"
echo "the public internet unless you specifically need remote DB access."
