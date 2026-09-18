# 🏛 OpenClinic — Guia de Arquitetura do Sistema

> Banco versionado: o procedimento vigente de instalação, adoção, migrations, demonstração opcional e clonagem está no [guia de operação do banco](../infra/database/README.md). O SQL mestre e o seed Docker foram substituídos por migrations; exemplos históricos de bootstrap abaixo não devem ser usados para atualizar bancos existentes.
>
> **Revisão de 2026-09-09:** para limites institucionais, sessões e autoridade, o planejamento local segue a [fase 0](./auth-spec.md). A descrição anterior de bypass do OWNER não é o comportamento-alvo proposto. A especificação não significa que os controles já foram implementados.

## 1. Visão Geral

O **OpenClinic** adota os princípios de **Clean Architecture**, **Domain-Driven Design (DDD) pragmático** e **Separação Canônica de Contextos** (`ARCH` vs `BUSINESS`). A stack é fundamentada em Node.js/TypeScript no backend, PostgreSQL como banco de dados relacional e React 19 no frontend SPA.

A arquitetura foi projetada para ser modular, extensível e 100% autônoma, sem lock-in de fornecedores em banco ou frameworks.

---

## 2. Estrutura de Diretórios e Monorepo

```text
packages/
├── core/                       # Primitivas e contratos compartilhados
│   ├── crypto/                 # Hashing Argon2id (RFC 9106), tokens SHA-256 e timingSafeEqual
│   ├── jwt/                    # Criação, assinatura e verificação de JWT
│   ├── errors/                 # Hierarquia de erros RFC 7807 (Problem Details)
│   ├── logger/                 # Logging estruturado em formato JSON (Pino)
│   ├── database/               # Pool de conexões PostgreSQL e transações
│   ├── domain/                 # Entidades base, enums, manifesto de recursos e DTOs clínicos
│   └── shared/                 # Re-exports de tipos para consumo compartilhado
│
├── backend-api/                # API REST em Fastify 5.x
│   └── src/
│       ├── arch/               # Núcleo de Arquitetura, Governança e Infraestrutura
│       │   ├── domain/         # Entidades de sistema, repositórios de IAM e sessões
│       │   ├── application/    # Casos de uso de autenticação, usuários e grupos
│       │   ├── infrastructure/ # Repositórios Drizzle ORM, Unit of Work e schemas
│       │   └── presentation/   # Rotas Fastify, middlewares e schemas OpenAPI 3.1
│       │
│       ├── business/           # Núcleo de Domínio Clínico e Cadastros
│       │   ├── domain/         # Repositórios clínicos (IPatientRepository, etc.)
│       │   ├── application/    # Casos de uso clínicos (ListPatients, CreatePatient, etc.)
│       │   ├── infrastructure/ # Repositórios Drizzle clínicos (PatientRepository, etc.)
│       │   └── presentation/   # Rotas de pacientes, profissionais e atendimentos
│       │
│       ├── config/             # Validação de variáveis de ambiente e Swagger
│       └── server.ts           # Inicialização do servidor HTTP Fastify
│
├── backend-cli/                # CLI administrativa multiplataforma
│   └── src/
│       ├── commands/           # db:init, db:migrate, db:seed, db:setup, auth:check, etc.
│       └── index.ts            # Ponto de entrada Commander.js
│
└── frontend-webapp/            # Aplicação SPA reativa em React 19 / Vite 6
    └── src/
        ├── arch/               # Layout, navegação, cabeçalho, sidebar e páginas de IAM
        ├── business/           # Telas de negócio: PractitionersView, HealthPlansView, ProceduresView
        ├── context/            # AuthContext (sessão em memória)
        ├── i18n/               # Internacionalização bilíngue (pt-br.ts, en-us.ts, useTranslation)
        ├── services/           # Cliente HTTP da API (api.ts)
        └── pages/              # DashboardPage, LoginPage, etc.
```

---

## 3. Princípios Fundamentais de Design

- **Regra de Dependência (Clean Architecture):** As camadas internas de domínio nunca conhecem as camadas externas de infraestrutura ou apresentação.
- **Unit of Work (UoW):** Todas as operações e repositórios são orquestrados através da `UnitOfWork`.
- **Repository Pattern:** Interfaces abstratas declaradas no domínio (`domain/`) e implementações concretas baseadas em Drizzle ORM na infraestrutura (`infrastructure/`).
- **Use Case Pattern (Single Responsibility):** Cada caso de uso possui uma única responsabilidade de negócio clara e testável isoladamente.
- **Governança de Papéis:** Controle rigoroso de autoridade via `UserRole` (`OWNER`, `ADMIN`, `USER`) com bypass nativo do OWNER e derivação estrita por ACL para ADMIN e USER.

---

## 4. Invariantes de Segurança (P0)

- **Senhas:** Sempre com hash **Argon2id** (RFC 9106) com salt dinâmico calibrado (proibido texto plano ou MD5/SHA).
- **Comparação em Tempo Constante:** `crypto.timingSafeEqual` para tokens, secrets e hashes para mitigar timing attacks.
- **Tokens de Refresh:** Hash SHA-256 persistido no banco com rotação atômica a cada renovação.
- **Tokens de Acesso (JWT):** Validade curta (15 minutos) mantidos **estritamente em memória** no React (sem localStorage para tokens de auth).
- **Proteção Contra Força Bruta:** Bloqueio automático de identificador após 5 falhas consecutivas de login por 15 minutos, auditado em `sys_audit_logs`.
- **Zero Segredos Hardcoded:** Toda a configuração sensível é injetada via variáveis de ambiente (`.env`).

---

## 5. Convenções do Banco de Dados

| Prefixo | Domínio / Contexto | Exemplos de Tabelas |
| :--- | :--- | :--- |
| `sys_` | Plataforma, Sistema & Governança | `sys_tenants`, `sys_audit_logs`, `sys_applications`, `sys_application_resources` |
| `iam_` | Identidade, Acesso & Segurança | `iam_users`, `iam_groups`, `iam_users_groups`, `iam_permissions`, `iam_sessions`, `iam_lockouts` |
| `app_` | Negócio Clínico e Cadastros (FHIR) | `app_patients`, `app_practitioners`, `app_encounters`, `app_appointments`, `app_health_plans`, `app_procedures` |

- **Chaves Primárias:** UUID v4 gerado no nível da aplicação (`crypto.randomUUID()`) armazenado como `VARCHAR(36)` (Zero Vendor Lock-in / ANSI Agnostic).
- **Timestamps:** `created_at` e `updated_at` do tipo `TIMESTAMPTZ DEFAULT NOW()`.
- **Exclusão Lógica:** Coluna `deleted_at` para soft delete em entidades clínicas.
- **Multi-tenancy:** Coluna `tenant_id` com chave estrangeira apontando para `sys_tenants(id)`.

---

## 6. Papéis do PostgreSQL

| Role | Tipo | Permissões |
| :--- | :--- | :--- |
| `openclinic_owner` | DDL / Migrações | Controle total de schema, DDL e migrations |
| `openclinic_app` | DML / Runtime | `SELECT`, `INSERT`, `UPDATE`, `DELETE` apenas |

---

## 7. Inicialização e Comandos de Banco de Dados

```bash
# Provisionamento completo do banco de dados (criação de roles, DDL, seed e checagem):
npm run db:setup

# Subir stack de banco de dados via Docker:
docker compose up -d db

# Subir toda a stack em containers (PostgreSQL, Fastify API e Frontend com Nginx):
docker compose up --build -d
```
