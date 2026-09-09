-- ============================================================
-- OpenClinic - PostgreSQL Role Setup
-- Owner: DDL + Admin operations (migrations, schema changes)
-- App:   DML only (SELECT, INSERT, UPDATE, DELETE on tables/sequences)
-- ============================================================

-- Role: openclinic_owner (DDL/admin - migrations, schema changes)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'openclinic_owner') THEN
    CREATE ROLE openclinic_owner WITH LOGIN PASSWORD 'temp1234';
  END IF;
END $$;

-- Role: openclinic_app (DML/runtime - application queries only)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'openclinic_app') THEN
    CREATE ROLE openclinic_app WITH LOGIN PASSWORD 'temp1234';
  END IF;
END $$;

-- Database ownership
ALTER DATABASE openclinic OWNER TO openclinic_owner;

-- Owner: full control on schema
GRANT ALL PRIVILEGES ON DATABASE openclinic TO openclinic_owner;
GRANT ALL ON SCHEMA public TO openclinic_owner;

-- App: connect + usage only
GRANT CONNECT ON DATABASE openclinic TO openclinic_app;
GRANT USAGE ON SCHEMA public TO openclinic_app;

-- App: DML on all current and future tables/sequences created by owner
ALTER DEFAULT PRIVILEGES FOR ROLE openclinic_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO openclinic_app;
ALTER DEFAULT PRIVILEGES FOR ROLE openclinic_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO openclinic_app;

