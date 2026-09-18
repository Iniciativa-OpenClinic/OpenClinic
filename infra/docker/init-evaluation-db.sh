#!/bin/sh
set -eu

# This initializer is exclusively for the disposable Swarm evaluation database.
export EVAL_OWNER_PASSWORD="$(cat /run/secrets/owner_password)"
export EVAL_APP_PASSWORD="$(cat /run/secrets/app_password)"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
\getenv owner_password EVAL_OWNER_PASSWORD
\getenv app_password EVAL_APP_PASSWORD
BEGIN;
SELECT format('CREATE ROLE openclinic_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', :'owner_password') \gexec
SELECT format('CREATE ROLE openclinic_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD %L', :'app_password') \gexec
ALTER DATABASE openclinic_eval OWNER TO openclinic_owner;
ALTER SCHEMA public OWNER TO openclinic_owner;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE openclinic_eval TO openclinic_app;
GRANT USAGE ON SCHEMA public TO openclinic_app;
ALTER DEFAULT PRIVILEGES FOR ROLE openclinic_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO openclinic_app;
ALTER DEFAULT PRIVILEGES FOR ROLE openclinic_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO openclinic_app;
COMMIT;
SQL
unset EVAL_OWNER_PASSWORD EVAL_APP_PASSWORD
