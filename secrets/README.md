# Secrets Directory — Architectural Specification

This directory manages confidential secrets for local development, container orchestration, and secrets provider configuration.

## Architectural Overview

The application implements an agnostic **Secrets Provider Architecture** support for credentials and cryptographic signing keys:

1. **Direct Environment Mode (`SECRETS_PROVIDER=env`):**
   - The application dynamically synthesizes connection URLs at runtime from individual atomic environment variables (`DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT`, `DB_NAME`).
   - `DATABASE_URL` is **never** stored directly in the `.env` file.
   - Operators have full autonomy to use `SECRETS_PROVIDER=env` in any environment (local workstations, staging VPS, or CI/CD pipelines). In production, an informational security audit log is emitted if `env` is configured.

2. **Mounted Files Mode (`SECRETS_PROVIDER=file`):**
   - **Container Orchestration (Docker Swarm / Kubernetes):** Mounted by the orchestrator at `/run/secrets/<secret_name>`.
   - **Local File Mode:** Read from `./secrets/<secret_name>.credentials.json` or `./secrets/<secret_name>.json`.

3. **Cloud Secrets Managers (`SECRETS_PROVIDER=gsm` / `SECRETS_PROVIDER=aws`):**
   - Fetch structured credentials directly from Google Secret Manager or AWS Secrets Manager using the secret identifiers declared in `DB_APP_SECRET_NAME`, `DB_OWNER_SECRET_NAME`, and `JWT_SECRET_NAME`.

All real credentials in this directory (`*.credentials.json`) are strictly excluded by `.gitignore`. Only example templates (`*.credentials.example.json`) are tracked in source control.

---

## Standard Secret Identifiers & Roles

- **Application Runtime Secret:** `DB_APP_SECRET_NAME=database-secret-app` (Role: `openclinic_app` with DML permissions)
- **Database Schema Owner Secret:** `DB_OWNER_SECRET_NAME=database-secret-owner` (Role: `openclinic_owner` with DDL permissions for migrations)
- **JWT Cryptographic Signing Secret:** `JWT_SECRET_NAME=jwt-secret`

---

## Local Setup (Files Mode)

Copy the template files and fill in your local development credentials:

### 1. Application Runtime Secret (`database-secret-app`)

```bash
cp secrets/database-secret-app.credentials.example.json secrets/database-secret-app.credentials.json
```

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "openclinic_dev",
  "user": "openclinic_app",
  "password": "local_dev_password"
}
```

### 2. Schema Owner Secret (`database-secret-owner`)

```bash
cp secrets/database-secret-owner.credentials.example.json secrets/database-secret-owner.credentials.json
```

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "openclinic_dev",
  "user": "openclinic_owner",
  "password": "local_owner_password"
}
```

### 3. JWT Signing Key Secret (`jwt-secret`)

```bash
cp secrets/jwt-secret.credentials.example.json secrets/jwt-secret.credentials.json
```

```json
{
  "secretKey": "your-random-cryptographically-secure-jwt-key-min-32-chars"
}
```

---

## Resolution Order for File Provider

When `DB_APP_SECRET_NAME=database-secret-app` is configured with `SECRETS_PROVIDER=file`, resolution attempts in order:

1. `/run/secrets/database-secret-app` *(Docker Swarm / Kubernetes)*
2. `./secrets/database-secret-app.credentials.json` *(Local development)*
3. `./secrets/database-secret-app.json`
4. `./secrets/database-secret-app`

---

## Security Invariants (P0)

- **Principle of Least Privilege (PoLP):** Runtime application containers mount exclusively `DB_APP_SECRET_NAME` and `JWT_SECRET_NAME`. They never receive or mount `DB_OWNER_SECRET_NAME`.
- **Zero Raw Secrets in Git:** Real secrets, passwords, and tokens must never be committed to Git.
- **Fail-Closed Configuration:** If `SECRETS_PROVIDER=file` is configured and a secret file cannot be found or read, the process aborts immediately with a clear diagnostic message.
