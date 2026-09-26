# Diretório de Segredos (Secrets) — Especificação Arquitetural

Este diretório gerencia os segredos confidenciais para desenvolvimento local, orquestração de containers e configuração dos provedores de segredos.

## Visão Geral Arquitetural: Arquitetura Secrets-First (Conformidade LGPD & HIPAA)

Como uma plataforma de software de saúde clínica que gerencia Dados Pessoais Sensíveis de Saúde (*Protected Health Information - PHI*) e Prontuários Eletrônicos (*Electronic Health Records - EHR*), o OpenClinic implementa uma **Arquitetura Secrets-First** projetada para atender aos rigorosos requisitos de proteção e confidencialidade de dados da **LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018, Art. 46)** e da norma internacional **HIPAA Security Rule (§ 164.312)**.

### Por que credenciais em texto puro no `.env` são excluídas

- **Zero Vazamentos Acidentais:** Impede que senhas e chaves de assinatura vazem para o controle de versão (`git`), relatórios de travamento (APM / Sentry), inspeção de processos (`/proc/<pid>/environ`) ou logs de inspeção de containers (`docker inspect`, interface web do Portainer).
- **Acesso com Privilégio Mínimo (*Least Privilege*):** Containers de execução da aplicação recebem estritamente credenciais DML restritas (`openclinic_app`), completamente isoladas do superusuário (`postgres`) e do proprietário de migrações (`openclinic_owner`).
- **Design Fail-Closed:** A aplicação aborta imediatamente a inicialização se os arquivos de segredos configurados ou provedores de nuvem estiverem ausentes ou corrompidos.

### Provedores de Segredos Suportados (`SECRETS_PROVIDER`)

1. **Arquivos Montados e Provedor Local (`SECRETS_PROVIDER=file` — Padrão Canônico):**
   - **Estação de Desenvolvimento Local:** Leitura de `./secrets/<nome_do_segredo>.json` (ou `.txt`). Inicializado de forma transparente pelo comando `npm run setup` a partir dos templates de exemplo.
   - **Orquestração de Containers (Docker Swarm / Kubernetes):** Injetados diretamente em memória (`tmpfs`) em `/run/secrets/<nome_do_segredo>` com permissão restrita `0400` pertencente a `appuser (1001:1001)`.

2. **Gerenciadores de Segredos em Nuvem (`SECRETS_PROVIDER=gsm` / `SECRETS_PROVIDER=aws`):**
   - Obtém credenciais estruturadas diretamente do Google Secret Manager ou AWS Secrets Manager utilizando os identificadores declarados em `DB_APP_SECRET_NAME`, `DB_OWNER_SECRET_NAME` e `JWT_SECRET_NAME`.

> 🔒 **Arquitetura Secrets-First Obrigatória:** O modo legado `SECRETS_PROVIDER=env` foi descontinuado e eliminado do OpenClinic. Nenhuma senha, hash ou chave criptográfica pode residir em variáveis de ambiente abertas (`.env`). Todos os ambientes operam estritamente com `SECRETS_PROVIDER=file`, `gsm` ou `aws`.

Todas as credenciais reais neste diretório (`*.json`, `*.txt` sem `.example.`) são estritamente excluídas pelo `.gitignore`. Apenas os templates de exemplo (`*.example.json`, `*.example.txt`) são rastreados no controle de versão.

---

## Identificadores Padrão de Segredos & Funções (Roles)

O OpenClinic adota nomes declarados explicitamente no `.env` (ex.: `DB_APP_SECRET_NAME`, `DB_OWNER_SECRET_NAME`, `JWT_SECRET_NAME`), garantindo total previsibilidade e ausência de heurísticas ambíguas.

### Matriz Canônica de Nomenclatura por Ambiente (Tier)

| Escopo / Ambiente | Nome do Secret no Swarm / Portainer | Formato / Tipo | Ponto de Montagem no Container | Consumidor Principal |
| :--- | :--- | :---: | :--- | :--- |
| **Desenvolvimento (`dev`)** | `openclinic-dev-app-postgres-credentials` | JSON (`.json`) | `/run/secrets/database-secret-app` | `api` (Fastify REST - DML) |
| **Desenvolvimento (`dev`)** | `openclinic-dev-owner-postgres-credentials` | JSON (`.json`) | `/run/secrets/database-secret-owner` | Migrações / CLI (DDL) |
| **Desenvolvimento (`dev`)** | `openclinic-dev-postgres-password` | String (`.txt`) | `/run/secrets/postgres_password` | `postgres` (Engine DB) |
| **Desenvolvimento (`dev`)** | `openclinic-dev-jwt-secret` | String (`.txt`) | `/run/secrets/jwt-secret` | `api` (Fastify REST - JWT) |
| **Staging (`stage`)** | `openclinic-stage-app-postgres-credentials` | JSON (`.json`) | `/run/secrets/database-secret-app` | `api` (Fastify REST - DML) |
| **Staging (`stage`)** | `openclinic-stage-owner-postgres-credentials` | JSON (`.json`) | `/run/secrets/database-secret-owner` | Migrações / CLI (DDL) |
| **Staging (`stage`)** | `openclinic-stage-postgres-password` | String (`.txt`) | `/run/secrets/postgres_password` | `postgres` (Engine DB) |
| **Staging (`stage`)** | `openclinic-stage-jwt-secret` | String (`.txt`) | `/run/secrets/jwt-secret` | `api` (Fastify REST - JWT) |
| **Produção (`prod`)** | `openclinic-prod-app-postgres-credentials` | JSON (`.json`) | `/run/secrets/database-secret-app` | `api` (Fastify REST - DML) |
| **Produção (`prod`)** | `openclinic-prod-owner-postgres-credentials` | JSON (`.json`) | `/run/secrets/database-secret-owner` | Migrações / CLI (DDL) |
| **Produção (`prod`)** | `openclinic-prod-postgres-password` | String (`.txt`) | `/run/secrets/postgres_password` | `postgres` (Engine DB) |
| **Produção (`prod`)** | `openclinic-prod-jwt-secret` | String (`.txt`) | `/run/secrets/jwt-secret` | `api` (Fastify REST - JWT) |

> ℹ️ **Nota sobre Produção:** O ambiente de produção é identificado exclusivamente pelo tier **`prod`** (ex.: `openclinic-prod-*`). Termos genéricos de infraestrutura como `-vps` foram descontinuados para manter rigorosa consistência entre código, orquestração e documentação.

---

## Setup Local (Modo Arquivos)

O script `npm run setup` inicializa os arquivos locais automaticamente a partir dos arquivos `.example`. Caso prefira configurar manualmente, copie os templates e preencha suas credenciais de desenvolvimento:

### 1. Segredo da Aplicação em Runtime (`openclinic-dev-app-postgres-credentials`)

```bash
cp secrets/openclinic-dev-app-postgres-credentials.example.json secrets/openclinic-dev-app-postgres-credentials.json
```

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "openclinic",
  "user": "openclinic_app",
  "password": "local_dev_password"
}
```

### 2. Segredo do Proprietário do Esquema (`openclinic-dev-owner-postgres-credentials`)

```bash
cp secrets/openclinic-dev-owner-postgres-credentials.example.json secrets/openclinic-dev-owner-postgres-credentials.json
```

```json
{
  "host": "localhost",
  "port": 5432,
  "database": "openclinic",
  "user": "openclinic_owner",
  "password": "local_owner_password"
}
```

### 3. Segredo do Motor PostgreSQL / Superusuário (`openclinic-dev-postgres-password`)

```bash
cp secrets/openclinic-dev-postgres-password.example.txt secrets/openclinic-dev-postgres-password.txt
```

```text
local_postgres_superuser_password
```

### 4. Segredo da Chave de Assinatura JWT (`openclinic-dev-jwt-secret`)

```bash
cp secrets/openclinic-dev-jwt-secret.example.txt secrets/openclinic-dev-jwt-secret.txt
```

```text
sua-chave-jwt-aleatoria-criptograficamente-segura-min-32-chars
```

---

## Resolução Determinística e Previsível (`SECRETS_PROVIDER=file`)

O mecanismo de resolução de segredos é **100% determinístico** e segue o princípio de **Fail-Closed**:

1. **Busca Exata:** O sistema busca estritamente o identificador configurado no `.env` (`DB_APP_SECRET_NAME`, `DB_OWNER_SECRET_NAME`, `JWT_SECRET_NAME`).
2. **Candidatos de Extensão:**
   - `<nome>` (sem extensão, padrão de montagem direta no Docker Swarm `/run/secrets/<nome>`)
   - `<nome>.json` (estruturado, para banco de dados)
   - `<nome>.txt` (escalar, para senhas do Postgres e JWT)
3. **Diretórios de Busca Inspecionados:**
   - `/run/secrets` *(Docker Swarm / Kubernetes)*
   - `SECRETS_DIR` *(se explicitamente definido)*
   - `./secrets` *(raiz do projeto)*
   - `../secrets`, `../../secrets` *(pacotes do monorepo)*
4. **Sem Heurísticas Obscuras:** Não há varredura de diretório (`readdirSync`) nem adivinhação semântica de arquivos legados. Se o arquivo configurado não existir, o sistema falha imediatamente com erro explícito.

---

## Invariantes de Segurança (P0)

- **Princípio do Menor Privilégio (PoLP):** Containers da aplicação em execução montam exclusivamente `DB_APP_SECRET_NAME` e `JWT_SECRET_NAME`. Eles nunca recebem ou montam `DB_OWNER_SECRET_NAME`.
- **Zero Segredos Reais no Git:** Senhas reais, tokens e chaves nunca devem ser commitados no Git.
- **Configuração Fail-Closed:** Se `SECRETS_PROVIDER=file` estiver configurado e um arquivo de segredo não for encontrado ou não puder ser lido, o processo aborta imediatamente com mensagem de diagnóstico clara.

