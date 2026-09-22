# Secrets Architecture — Architectural Template

This module implements the unified secrets management for the architectural template ecosystem, designed for open-source portability, security compliance (P0), and enterprise extensibility.

---

## 1. Core Principles

- **Provider/Driver Architecture:** Secrets can be resolved from local files, Docker Swarm mounts, or external cloud secret managers (GSM/AWS) without modifying application code.
- **Strict Role Separation (PoLP):**
  - **`DB_APP_SECRET_NAME` (DML):** Application runtime connection used by `backend-api` (SELECT, INSERT, UPDATE, DELETE).
  - **`DB_OWNER_SECRET_NAME` (DDL):** Schema owner connection used by `backend-cli` and migration jobs (CREATE, ALTER, DROP).
  - The API service **never** mounts or accesses `DB_OWNER_SECRET_NAME`.
- **Zero DDL in `.env`:** Administrative credentials and database URLs are never written in `.env`.
- **Atomic JSON & Text Credentials:** Database secrets are encapsulated in structured JSON files (`<name>.json`), while scalar secrets like JWT and PostgreSQL system passwords use plain text (`<name>.txt`).
- **Strict Error Handling:** If `SECRETS_PROVIDER=file` is enabled and a secret file is missing or unreadable, the bootstrap halts immediately with an explicit error. There is no silent fallback or legacy heuristic.

---

## 2. Secrets Providers

Configured via `SECRETS_PROVIDER` in `.env`:

| Provider | Description | Resolution Strategy |
| :--- | :--- | :--- |
| `file` | Docker Swarm & Local Dev | Reads from `/run/secrets/<name>` in containers, or `./secrets/<name>.json` / `.txt` locally. |
| `env` | Direct Environment | Explicit mode using direct atomic variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `JWT_KEY`). |
| `gsm` | Google Cloud Secret Manager | Prepared adapter via `@google-cloud/secret-manager` (lazy-loaded). |
| `aws` | AWS Secrets Manager | Prepared adapter via `@aws-sdk/client-secrets-manager` (lazy-loaded). |

---

## 3. Supported Secret Identifiers

| Variable in `.env` | Resolved Output | Consumed By | Format |
| :--- | :--- | :--- | :--- |
| `DB_APP_SECRET_NAME` | `DATABASE_URL` | `backend-api` & runtime CLI commands | JSON (`host, port, database, user, password`) |
| `DB_OWNER_SECRET_NAME` | `DATABASE_OWNER_URL` | `backend-cli` (`db:migrate`, `db:init`, `db:setup`) | JSON (`host, port, database, user, password`) |
| `JWT_SECRET_NAME` | `JWT_KEY` | `backend-api` (token signing/verification) | Plain text string key (`.txt`) |

### Direct `*_FILE` mounts (e.g. `DATABASE_URL_FILE`, `JWT_KEY_FILE`, `DATABASE_OWNER_URL_FILE`) are the contract for raw mounted credentials

---

## 4. Local Development vs. Production Execution

### Local Development (Windows / macOS / Linux host)

1. Place credentials in `./secrets/` (strictly gitignored):
   - `secrets/openclinic-dev-app-postgres-credentials.json`
   - `secrets/openclinic-dev-owner-postgres-credentials.json`
   - `secrets/openclinic-dev-jwt-secret.txt`
   - `secrets/openclinic-dev-postgres-password.txt`
2. Run commands naturally:

   ```bash
   npm run dev:api
   npm run cli -- db:status
   npm run cli -- db:migrate
   ```

### Production / Staging (Docker Swarm / Portainer)

1. Create external secrets in the Swarm:

   ```bash
   docker secret create openclinic-prod-app-postgres-credentials ./secrets/openclinic-prod-app-postgres-credentials.json
   docker secret create openclinic-prod-owner-postgres-credentials ./secrets/openclinic-prod-owner-postgres-credentials.json
   docker secret create openclinic-prod-jwt-secret ./secrets/openclinic-prod-jwt-secret.txt
   ```

2. In `stacks/openclinic-production.yml`, the API service mounts only the runtime secrets to `/run/secrets/`.
3. Migrations are executed via a dedicated job/task with `DB_OWNER_SECRET`.

---

## 5. Automated Validation

Run the test suite from the repository root:

```bash
npm run test:secrets
npm run typecheck
npm test
```

## Configuration contract

Use SECRETS_PROVIDER=file explicitly for structured secrets or mounted files. Do not set DB_PASS or JWT_KEY directly in that mode. Without an explicit provider, the runtime selects none; set the provider explicitly in deployment configuration. In file mode configured before bootstrap, .env discovery is skipped, so provide all required configuration in the process environment. Cloud adapters are placeholders until implemented and validated.
