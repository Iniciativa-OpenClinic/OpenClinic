#!/bin/sh
set -e

# ============================================================
# 🐘 Starter Kit Template - Dynamic Grants Provisioning
# ============================================================
# This script applies permissions and grants for the application user.
# By default, it reads values configured in the project .env file
# or container environment (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS).
# In interactive mode, it prompts the operator for confirmation/changes.
# ============================================================

# 1. Locate and read project .env file if present
DOTENV_FILE=""
for candidate in ".env" "../.env" "../../.env" "/app/.env"; do
  if [ -f "$candidate" ]; then
    DOTENV_FILE="$candidate"
    break
  fi
done

get_env_val() {
  var_name="$1"
  default_val="$2"
  if [ -n "$DOTENV_FILE" ]; then
    val=$(grep -E "^${var_name}=" "$DOTENV_FILE" 2>/dev/null | head -n 1 | cut -d '=' -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^["'"'"']//' -e 's/["'"'"']$//')
    if [ -n "$val" ]; then
      echo "$val"
      return
    fi
  fi
  eval "exported_val=\"\$$var_name\""
  if [ -n "$exported_val" ]; then
    echo "$exported_val"
    return
  fi
  echo "$default_val"
}

# Helper to read JSON secret file field (POSIX compatible)
get_json_val() {
  json_file="$1"
  key="$2"
  if [ -f "$json_file" ]; then
    grep -E "\"${key}\"[[:space:]]*:" "$json_file" 2>/dev/null | head -n 1 | sed -E 's/.*"[^"]+"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/'
  fi
}

# Default values from environment / .env (with fallback)
DEFAULT_HOST=$(get_env_val "DB_HOST" "localhost")
DEFAULT_PORT=$(get_env_val "DB_PORT" "5432")
DEFAULT_DB=$(get_env_val "DB_NAME" "${POSTGRES_DB:-openclinic}")
DEFAULT_ADMIN_USER=$(get_env_val "POSTGRES_USER" "postgres")
DEFAULT_APP_USER=$(get_env_val "DB_USER" "openclinic_app")
DEFAULT_APP_PASS=$(get_env_val "DB_PASS" "openclinic_secret_pass")

# Resolve owner credentials strictly from mounted secret file (DDL is file/secret-based only)
OWNER_SECRET_FILE=""
for candidate in \
  "/secrets/database-secret-owner.credentials.json" \
  "/secrets/database-secret-owner.json" \
  "/secrets/database-owner.credentials.json" \
  "/app/secrets/database-secret-owner.credentials.json" \
  "./secrets/database-secret-owner.credentials.json"; do
  if [ -f "$candidate" ]; then
    OWNER_SECRET_FILE="$candidate"
    break
  fi
done

DEFAULT_OWNER_USER=""
DEFAULT_OWNER_PASS=""
if [ -n "$OWNER_SECRET_FILE" ]; then
  DEFAULT_OWNER_USER=$(get_json_val "$OWNER_SECRET_FILE" "user")
  DEFAULT_OWNER_PASS=$(get_json_val "$OWNER_SECRET_FILE" "password")
fi

# Fallback to standard convention if secret file not yet provisioned in dev
DEFAULT_OWNER_USER="${DEFAULT_OWNER_USER:-${DEFAULT_DB}_owner}"
DEFAULT_OWNER_PASS="${DEFAULT_OWNER_PASS:-openclinic_owner_pass}"

# 2. Parse command-line arguments (CLI)
CLI_HOST=""
CLI_PORT=""
CLI_DB=""
CLI_ADMIN_USER=""
CLI_ADMIN_PASS=""
CLI_APP_USER=""
CLI_APP_PASS=""
CLI_OWNER_USER=""
CLI_OWNER_PASS=""

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--host)
      CLI_HOST="$2"
      shift 2
      ;;
    -p|--port)
      CLI_PORT="$2"
      shift 2
      ;;
    -d|--database|--db-name)
      CLI_DB="$2"
      shift 2
      ;;
    -u|--admin-user)
      CLI_ADMIN_USER="$2"
      shift 2
      ;;
    --admin-pass)
      CLI_ADMIN_PASS="$2"
      shift 2
      ;;
    -a|--app-user|--user)
      CLI_APP_USER="$2"
      shift 2
      ;;
    --app-pass|--password)
      CLI_APP_PASS="$2"
      shift 2
      ;;
    --owner-user)
      CLI_OWNER_USER="$2"
      shift 2
      ;;
    --owner-pass)
      CLI_OWNER_PASS="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  -h, --host <host>            PostgreSQL host (default: $DEFAULT_HOST)"
      echo "  -p, --port <port>            PostgreSQL port (default: $DEFAULT_PORT)"
      echo "  -d, --db-name <database>     Database name (default: $DEFAULT_DB)"
      echo "  -u, --admin-user <user>      Administrative superuser (default: $DEFAULT_ADMIN_USER)"
      echo "      --admin-pass <password>  Administrative password"
      echo "  -a, --app-user <user>        Application runtime user (default: $DEFAULT_APP_USER)"
      echo "      --app-pass <password>    Application runtime password"
      echo "      --owner-user <user>      Schema owner user (default: $DEFAULT_OWNER_USER)"
      echo "      --owner-pass <password>  Schema owner password"
      exit 0
      ;;
    *)
      if [ -z "$CLI_ADMIN_USER" ]; then
        CLI_ADMIN_USER="$1"
      elif [ -z "$CLI_DB" ]; then
        CLI_DB="$1"
      elif [ -z "$CLI_APP_USER" ]; then
        CLI_APP_USER="$1"
      fi
      shift
      ;;
  esac
done

# 3. Interactive prompt or resolved defaults
TARGET_HOST="${CLI_HOST:-$DEFAULT_HOST}"
TARGET_PORT="${CLI_PORT:-$DEFAULT_PORT}"
TARGET_DB="${CLI_DB:-$DEFAULT_DB}"
ADMIN_USER="${CLI_ADMIN_USER:-$DEFAULT_ADMIN_USER}"
ADMIN_PASS="${CLI_ADMIN_PASS:-}"
APP_USER="${CLI_APP_USER:-$DEFAULT_APP_USER}"
APP_PASS="${CLI_APP_PASS:-$DEFAULT_APP_PASS}"
OWNER_USER="${CLI_OWNER_USER:-$DEFAULT_OWNER_USER}"
OWNER_PASS="${CLI_OWNER_PASS:-$DEFAULT_OWNER_PASS}"

if [ -t 0 ]; then
  echo "============================================================"
  echo "  Starter Kit Template - Database Access Configuration"
  echo "============================================================"
  echo "Press [Enter] to keep the default value shown in brackets."
  echo ""

  if [ -z "$CLI_HOST" ]; then
    printf "PostgreSQL host [%s]: " "$DEFAULT_HOST"
    read -r IN_HOST
    TARGET_HOST="${IN_HOST:-$DEFAULT_HOST}"
  fi

  if [ -z "$CLI_PORT" ]; then
    printf "PostgreSQL port [%s]: " "$DEFAULT_PORT"
    read -r IN_PORT
    TARGET_PORT="${IN_PORT:-$DEFAULT_PORT}"
  fi

  if [ -z "$CLI_DB" ]; then
    printf "Database name [%s]: " "$DEFAULT_DB"
    read -r IN_DB
    TARGET_DB="${IN_DB:-$DEFAULT_DB}"
  fi

  if [ -z "$CLI_ADMIN_USER" ]; then
    printf "Administrative superuser [%s]: " "$DEFAULT_ADMIN_USER"
    read -r IN_ADMIN
    ADMIN_USER="${IN_ADMIN:-$DEFAULT_ADMIN_USER}"
  fi

  if [ -z "$CLI_ADMIN_PASS" ]; then
    printf "Administrative user password (leave blank if not applicable): "
    read -r IN_ADMIN_PASS
    ADMIN_PASS="${IN_ADMIN_PASS}"
  fi

  if [ -z "$CLI_APP_USER" ]; then
    printf "Application user (DB User) [%s]: " "$DEFAULT_APP_USER"
    read -r IN_APP_USER
    APP_USER="${IN_APP_USER:-$DEFAULT_APP_USER}"
  fi

  if [ -z "$CLI_APP_PASS" ]; then
    printf "Application password (DB Pass) [%s]: " "$DEFAULT_APP_PASS"
    read -r IN_APP_PASS
    APP_PASS="${IN_APP_PASS:-$DEFAULT_APP_PASS}"
  fi

  if [ -z "$CLI_OWNER_USER" ]; then
    printf "Owner user (DB Owner User) [%s]: " "$DEFAULT_OWNER_USER"
    read -r IN_OWNER_USER
    OWNER_USER="${IN_OWNER_USER:-$DEFAULT_OWNER_USER}"
  fi

  if [ -z "$CLI_OWNER_PASS" ]; then
    printf "Owner password (DB Owner Pass) [%s]: " "$DEFAULT_OWNER_PASS"
    read -r IN_OWNER_PASS
    OWNER_PASS="${IN_OWNER_PASS:-$DEFAULT_OWNER_PASS}"
  fi
  echo ""
fi

# 4. Connection arguments for psql
PSQL_CONN_ARGS=""
if [ -t 0 ]; then
  PSQL_CONN_ARGS="-h $TARGET_HOST -p $TARGET_PORT"
elif [ -n "$TARGET_HOST" ] && [ "$TARGET_HOST" != "localhost" ] && [ "$TARGET_HOST" != "127.0.0.1" ]; then
  PSQL_CONN_ARGS="-h $TARGET_HOST -p $TARGET_PORT"
fi

if [ -n "$ADMIN_PASS" ]; then
  export PGPASSWORD="$ADMIN_PASS"
fi

echo "==> Connecting to PostgreSQL as '${ADMIN_USER}' on database '${TARGET_DB}'..."
echo "==> Applying roles and permissions securely..."

psql -v ON_ERROR_STOP=1 $PSQL_CONN_ARGS --username "$ADMIN_USER" --dbname "$TARGET_DB" \
  -v app_user="$APP_USER" \
  -v app_pass="$APP_PASS" \
  -v owner_user="$OWNER_USER" \
  -v owner_pass="$OWNER_PASS" \
  -v target_db="$TARGET_DB" \
  -v admin_user="$ADMIN_USER" <<'EOSQL'
DO $$
DECLARE
  r RECORD;
  v_app_user text := :'app_user';
  v_app_pass text := :'app_pass';
  v_owner_user text := :'owner_user';
  v_owner_pass text := :'owner_pass';
  v_target_db text := :'target_db';
  v_admin_user text := :'admin_user';
BEGIN
  -- 1. Ensure application role exists
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = v_app_user) THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', v_app_user, v_app_pass);
  ELSE
    EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', v_app_user, v_app_pass);
  END IF;

  -- 2. Ensure owner role exists (if configured and distinct from admin)
  IF v_owner_user <> '' AND v_owner_user <> v_admin_user THEN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = v_owner_user) THEN
      EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', v_owner_user, v_owner_pass);
    ELSE
      EXECUTE format('ALTER ROLE %I WITH PASSWORD %L', v_owner_user, v_owner_pass);
    END IF;
    EXECUTE format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', v_target_db, v_owner_user);
    EXECUTE format('GRANT ALL ON SCHEMA public TO %I', v_owner_user);
  END IF;

  -- 3. Grant connection and public schema usage to application user
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', v_target_db, v_app_user);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', v_app_user);

  -- 4. DML privileges on all current tables and sequences in public schema
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', v_app_user);
  EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', v_app_user);

  -- 5. Default privileges on future tables and sequences created in public schema
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', v_app_user);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', v_app_user);

  -- 6. Default privileges for objects created by existing owner/admin roles
  FOR r IN (
    SELECT rolname
    FROM pg_roles
    WHERE (rolname LIKE '%_owner' OR rolname = v_admin_user OR (v_owner_user <> '' AND rolname = v_owner_user))
      AND rolname <> v_app_user
  ) LOOP
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', r.rolname, v_app_user);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', r.rolname, v_app_user);
  END LOOP;
END
$$;
EOSQL

echo "==> Permissions successfully applied for '${APP_USER}' on database '${TARGET_DB}'!"
