# OpenClinic - Especificação Técnica e Arquitetura do Projeto

> Banco versionado: o procedimento vigente de instalação, adoção, migrations, demonstração opcional e clonagem está no [guia de operação do banco](../infra/database/README.md). O SQL mestre e o seed Docker foram substituídos por migrations; exemplos históricos de bootstrap abaixo não devem ser usados para atualizar bancos existentes.
>
> **Revisão de 2026-09-09:** os contratos-alvo locais de identidade, sessão e autorização estão na [fase 0](./auth-spec.md), incluindo premissas revisáveis sobre organização, OWNER e CPF. Afirmações anteriores de acesso irrestrito/global não orientam a nova implementação sem essa leitura. Demais módulos continuam no escopo futuro.

Documento mestre de arquitetura, estrutura de monorepo, modelagem de banco de dados, fluxos de segurança e guia de implantação em servidores para o projeto **OpenClinic**.

---

## 1. Visão Geral e Filosofia

O **OpenClinic** é uma plataforma open-source voltada à gestão clínica e prontuário eletrônico. Este módulo implementa a **fundação arquitetural de autenticação, governança e identidade (IAM)**, construída sob os princípios da **Clean Architecture** (Arquitetura Limpa), com foco em:

- **API-First e CLI-First:** Todos os fluxos de autenticação, provisionamento e governança são operáveis via API RESTful e via CLI administrativa no terminal.
- **Zero SDK Externo Proprietário:** Em vez de depender de pacotes de SDKs externos, o projeto adota um monorepo com módulos internos reutilizáveis (`@openclinic/core`).
- **Segurança Estrita (Tier P0):** Hashing com Argon2id, comparações em tempo constante, rotação atômica de tokens, proteção contra força bruta e separação estrita de privilégios no banco de dados.
- **Portabilidade de Deploy:** Suporte nativo a execução local, Docker Compose Standalone, Portainer e Kubernetes.

---

## 2. Stack Tecnológica

| Componente | Tecnologia | Finalidade |
| :--- | :--- | :--- |
| **Runtime** | Node.js 20+ (LTS) / TypeScript 5.7+ | Execução com tipagem estrita (`strict: true`) e ESM nativo |
| **Backend Framework** | Fastify 5.x | Servidor HTTP de alta performance, schema-first |
| **Validação de Schemas** | Zod 3.x | Validação de payloads de entrada, respostas e variáveis de ambiente |
| **ORM / Camada de Dados** | Drizzle ORM + Postgres.js | Mapeamento typesafe de tabelas e execução de queries |
| **Banco de Dados** | PostgreSQL 17 | Armazenamento relacional com suporte a JSONB e UUID nativo |
| **Criptografia & Auth** | Argon2id + JSON Web Tokens (JWT) | Hashing de senhas e geração/validação de tokens |
| **Frontend de Testes** | React 19 + Vite 6 + React Router 7 | SPA para validação e auditoria dos fluxos de autenticação |
| **CLI Administrativa** | Commander.js + Inquirer | Interface de linha de comando para automação de tarefas |
| **Containerização** | Docker (Multi-stage build) + Docker Compose | Empacotamento para ambientes isolados e servidores |

---

## 3. Estrutura Completa de Diretórios (Monorepo)

O projeto é estruturado como um monorepo NPM Workspaces:

```text
openclinic/                          # Raiz do Monorepo
├── .agent/                          # Contexto e memória dos agentes de IA
│   ├── ARCHITECTURE.md              # Mapa resumido da arquitetura
│   └── MEMORY.md                    # Registro persistente de decisões técnicas
│
├── docker-compose.yml               # Orquestração de containers (DB, API, Webapp)
├── infra/                           # Recursos e infraestrutura operacional do ecossistema
│   ├── database/                    # Migrações, validação de schema e baseline
│   ├── docker/                      # Dockerfiles e scripts de inicialização
│   │   ├── Dockerfile               # Build de produção multi-stage (Node 20 Alpine)
│   │   ├── Dockerfile.webapp        # Build e servidor Nginx do frontend
│   │   └── init-db/000-roles.sh     # Provisionamento dinâmico dos roles 'owner' e 'app' via env
│   ├── secrets/                     # Gestão de segredos e runtime de provedores
│   └── stacks/                      # Stacks de produção Docker Swarm e Portainer
    ├── docs/                        # Documentação técnica do projeto
    │   ├── project-specification.md # [ESTE DOCUMENTO] Especificação geral
    │   ├── authentication-module.md # Especificação completa do Módulo de Autenticação e IAM
    │   ├── architecture.md          # Detalhamento da Clean Architecture
    │   ├── database-schema.md       # Dicionário de dados, tabelas e roles
    │   └── auth-spec.md             # Contratos de API e especificação de endpoints
    │
    ├── packages/
    │   │
    │   ├── core/                    # MÓDULO REUTILIZÁVEL COMPARTILHADO (@openclinic/core)
    │   │   ├── src/
    │   │   │   ├── crypto/          # Argon2id hasher, hashToken (SHA-256), timingSafeEqual
    │   │   │   ├── jwt/             # createAccessToken, createRefreshToken, decodeToken
    │   │   │   ├── errors/          # Hierarquia AppError e Problem Details (RFC 7807)
    │   │   │   ├── logger/          # Logger JSON estruturado (Pino)
    │   │   │   ├── database/        # Connection pool Postgres e transaction helpers
    │   │   │   └── index.ts         # Re-export barrel principal
    │   │   ├── package.json
    │   │   └── tsconfig.json
    │   │
    │   ├── backend-api/             # SERVIÇO DE API HTTP (@openclinic/backend-api)
    │   │   ├── src/
    │   │   │   ├── shared/          # Interfaces base de domínio
    │   │   │   │   └── domain/      # BaseEntity, RepositoryInterface, Enums, Exceptions
    │   │   │   │
    │   │   │   ├── arch/            # Camada de framework e governança
    │   │   │   │   ├── domain/      # Entidades (UserEntity, RoleEntity, SessionEntity), UoW
    │   │   │   │   ├── application/ # Casos de Uso (Login, Register, Refresh, Me, Logout)
    │   │   │   │   ├── infrastructure/ # Drizzle Schema, Repositories e Unit of Work
    │   │   │   │   └── presentation/   # Rotas Fastify, Zod Schemas, Middlewares, Error Handler
    │   │   │   │
    │   │   │   ├── config/          # Carregamento e validação de ambiente (env.ts)
    │   │   │   └── server.ts        # Bootstrap do Fastify e inicialização do servidor
    │   │   │
    │   │   ├── database/
    │   │   ├── package.json
    │   │   └── tsconfig.json
    │   │
    │   ├── backend-cli/             # FERRAMENTA DE LINHA DE COMANDO (@openclinic/backend-cli)
    │   │   ├── src/
    │   │   │   ├── commands/
    │   │   │   │   ├── db-init.ts   # Provisiona base e roles via superusuário
    │   │   │   │   ├── db-migrate.ts # Aplica o DDL mestre no banco local
    │   │   │   │   ├── db-seed.ts   # Popula tenant padrão, aplicação e roles
    │   │   │   │   ├── user-create-admin.ts # Criação interativa de admin
    │   │   │   │   └── auth-check.ts # Auditoria de integridade do Postgres, Argon2 e JWT
    │   │   │   └── index.ts         # Entrypoint da CLI (Commander)
    │   │   ├── package.json
    │   │   └── tsconfig.json
    │   │
    │   └── frontend-webapp/             # FRONTEND DE TESTES (@openclinic/frontend-webapp)
    │       ├── src/
    │       │   ├── context/         # AuthContext e AuthProvider global reativo
    │       │   ├── pages/           # LoginPage e DashboardPage
    │       │   ├── services/        # Cliente HTTP (api.ts) com Bearer token
    │       │   ├── hooks/           # Hook useAuth
    │       │   ├── types/           # Tipagens de autenticação e claims
    │       │   ├── App.tsx          # Roteamento protegido
    │       │   └── main.tsx         # Bootstrap do React
    │       ├── vite.config.ts       # Proxy reverso /api -> :3000
    │       ├── package.json
    │       └── tsconfig.json
    │

    ├── .env.example                 # Modelo documentado de variáveis de ambiente
    ├── package.json                 # Configuração de workspaces e atalhos NPM
    ├── tsconfig.base.json           # Configuração TypeScript compartilhada
    └── README.md                    # Guia rápido de introdução
```

---

## 4. Modelagem do Banco de Dados & Nomenclatura

O banco de dados segue convenções estritas de prefixos:

### Prefixos de Tabelas

- **`sys_*`**: Governança, configurações de sistema e trilhas de auditoria.
- **`iam_*`**: Gestão de identidade, controle de acesso (RBAC), sessões e segurança.
- **`app_*`**: Tabelas do domínio clínico e de negócios (ex: `app_patients`, `app_appointments`).

### Tabelas Implementadas

| Tabela | Prefixo | Descrição |
| :--- | :--- | :--- |
| `sys_tenants` | `sys_` | Tenants do sistema (multi-tenancy preparado na modelagem) |
| `sys_applications` | `sys_` | Aplicações cadastradas no ecossistema (`OpenClinic`) |
| `sys_application_configs` | `sys_` | Configurações por aplicação e tenant (JSONB) |
| `sys_application_resources` | `sys_` | Recursos protegidos do sistema (APIs e menus) |
| `sys_audit_logs` | `sys_` | Trilha de auditoria para eventos de login, registro, logout e ações administrativas |
| `iam_users` | `iam_` | Usuários com hash Argon2id, flags de status e papel RBAC direto (`role: OWNER \| ADMIN \| USER`) |
| `iam_groups` | `iam_` | Grupos funcionais e departamentais de usuários |
| `iam_users_groups` | `iam_` | Associação associativa N:N de usuários a grupos |
| `iam_permissions` | `iam_` | Permissões granulares de ACL (`ALLOW`/`DENY` por recurso e ação) |
| `iam_sessions` | `iam_` | Sessões ativas de autenticação com hash SHA-256 de refresh token |
| `iam_lockouts` | `iam_` | Controle de bloqueio por tentativas de login |

### Separação de Privilégios (Roles PostgreSQL)

1. **`openclinic_owner` (DDL / Migrations):**
   - Dono da base `openclinic` e do schema `public`.
   - Permissão total para criar, alterar e dropar tabelas, índices e tipos.
2. **`openclinic_app` (DML / Runtime):**
   - Utilizado pela API em tempo de execução.
   - Acesso restrito a `SELECT`, `INSERT`, `UPDATE`, `DELETE` em tabelas e `USAGE, SELECT` em sequências.
   - **Sem permissão de DDL**, prevenindo riscos de injeção destrutiva no schema.

---

## 5. Modelo Híbrido de Controle de Acesso: RBAC + ACL

> Para a especificação exaustiva dos papéis, limites de autoridade e invariantes de segurança, consulte o documento canônico:  
> 📘 **[`docs/user-roles-and-access-control.md`](user-roles-and-access-control.md)**.

O OpenClinic adota uma arquitetura em duas camadas complementares de controle de acesso:

### 5.1. RBAC (Role-Based Access Control - Camada Base)

- Define os papéis hierárquicos dos usuários no sistema através da coluna `iam_users.role` (enum tipado `UserRole` em `@openclinic/core`):
  - **`OWNER` (Nível 3):** Proprietário do Tenant / Sistema. Acesso total a governança, múltiplos tenants e configurações globais com bypass na matriz de ACL.
  - **`ADMIN` (Nível 2):** Administrador da clínica/unidade. Gestão de usuários e grupos, criação de contas, redefinição de senhas e configurações operacionais (subordinado às invariantes de proteção ao `OWNER`).
  - **`USER` (Nível 1):** Usuário padrão (médico, enfermeiro, recepcionista). Acesso aos fluxos clínicos básicos e recursos autorizados na matriz de ACL.
- O RBAC é avaliado em tempo de execução via middleware (`requireRole(minRole)`) e no carregamento dos menus dinâmicos (`sys_application_resources.min_role`).

### 5.2. ACL (Access Control List - Camada Granular)

- Permite controle fino e exceções específicas por recurso e ação através da tabela `iam_permissions`:
  - **Associação:** Pode ser atribuída diretamente a um **Usuário** (`user_id`) ou a um **Grupo** (`group_id`).
  - **Recurso:** Vinculado a um item cadastrado em `sys_application_resources` (`MODULE`, `MENU`, `MENU_ITEM`, `API_ACTION`).
  - **Ações:** `READ`, `WRITE`, `DELETE`, `EXECUTE`, `MANAGE`, `ALL`.
  - **Efeito:** `ALLOW` (concede acesso) ou `DENY` (bloqueio explícito prioritário).
- **Regra de Precedência:** `DENY` explícito na ACL sobrescreve qualquer permissão herdada de grupo ou concedida em RBAC.

### 5.3. Estrutura de Menus Dinâmicos por Role

Os menus exibidos na interface são carregados dinamicamente a partir do banco de dados (`sys_application_resources`), filtrados pelo papel do usuário autenticado:

| Role | Menus Disponíveis | Rotas / Ações |
| :--- | :--- | :--- |
| **USER** | • Módulos Clínicos Autorizados via ACL • Dados do Perfil • Alterar Senha • Ajuda & Suporte | `/dashboard`, `/profile`, `/change-password`, `/help` |
| **ADMIN** | *(Itens de USER autorizados)* + • Usuários & Grupos • Configurações Operacionais da Unidade • Documentos & Relatórios | `/admin/users`, `/admin/settings`, `/admin/docs`, `/admin/reports` |
| **OWNER** | *(Acesso Total e Irrestrito)* + • Configurações Globais do Sistema • Gestão de Tenants & Governança | `/owner/settings`, `/owner/tenants`, `/owner/audit` |

## 6. Arquitetura de Segurança & Fluxos de Autenticação

```text
[ Cliente React / Mobile ]
        │
        ├── 1. POST /api/v1/auth/login { identifier, password }
        ▼
[ Fastify API (Presentation) ]
        │
        ├── 2. Zod Validation (LoginRequestSchema)
        ▼
[ LoginUseCase (Application) ]
        │
        ├── 3. Verifica Bloqueio (iam_lockouts) -> se excedido, bloqueia 15 min
        ├── 4. Busca Usuário (IUserRepository)
        ├── 5. Valida Senha via Argon2id (timing-safe nativo)
        ├── 6. Se inválido -> incrementa falhas no iam_lockouts + log de auditoria
        ├── 7. Se válido -> reseta iam_lockouts + gera Access Token (JWT - 15m)
        ├── 8. Gera Refresh Token Opaco (UUIDv4) -> grava SHA-256 no iam_sessions
        └── 9. Grava Sucesso no sys_audit_logs
        │
        ▼
[ Retorno 200 OK ] -> { access_token, refresh_token, token_type: "bearer", user }
```

### Invariantes de Segurança (P0)

1. **Argon2id Obrigatório:** Hashing seguro com parâmetros recomendados pela RFC 9106 (Zero senhas em texto claro).
2. **Comparação em Tempo Constante:** Prevenção contra *Timing Attacks* em comparações criptográficas através de `crypto.timingSafeEqual`.
3. **Prevenção contra Força Bruta:** Bloqueio temporário (15 minutos) após 5 tentativas consecutivas com falha, gerenciado via `iam_lockouts`.
4. **Proteção de Sessão em Memória:** No frontend, o Access Token JWT é retido estritamente no estado do `AuthContext` em memória (sem armazenamento vulnerável em `localStorage`).

---

## 7. Módulo de IAM (Identity & Access Management)

O módulo de IAM disponibiliza serviços completos para gerenciamento de identidades, papéis RBAC e agrupamentos operacionais:

### Endpoints RESTful de Usuários (`/api/v1/auth/admin/users`)

| Método | Rota | Papel Mínimo | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/auth/admin/users` | `ADMIN` | Lista todos os usuários cadastrados com dados de perfil e status |
| `POST` | `/api/v1/auth/admin/users` | `ADMIN` | Cria um novo usuário (`full_name`, `email`, `username`, `password`, `role`, `is_active`) |
| `PUT` | `/api/v1/auth/admin/users/:userId` | `ADMIN` | Atualiza dados cadastrais, papel RBAC e status do usuário |
| `DELETE` | `/api/v1/auth/admin/users/:userId` | `ADMIN` | Remove o usuário do sistema (com proteção contra auto-exclusão e exclusão de `OWNER`) |
| `POST` | `/api/v1/auth/admin/users/:userId/unlock` | `ADMIN` | Desbloqueia conta bloqueada por tentativas excessivas de login |
| `POST` | `/api/v1/auth/admin/users/:userId/reset-password` | `ADMIN` | Redefine administrativamente a senha do usuário |
| `PATCH` | `/api/v1/auth/admin/users/:userId/toggle-status` | `ADMIN` | Alterna o status ativo/inativo do usuário |

### Endpoints RESTful de Grupos (`/api/v1/groups`)

| Método | Rota | Papel Mínimo | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/groups` | `ADMIN` | Lista grupos organizacionais com contagem agregada de membros |
| `POST` | `/api/v1/groups` | `ADMIN` | Cria um novo grupo (`name`, `description` [obrigatória], `is_active`) |
| `PUT` | `/api/v1/groups/:id` | `ADMIN` | Atualiza nome, descrição ou status do grupo |
| `DELETE` | `/api/v1/groups/:id` | `ADMIN` | Remove o grupo (permitido apenas para grupos inativos) |
| `GET` | `/api/v1/groups/:id/members` | `ADMIN` | Retorna membros do grupo e usuários disponíveis para vinculação |
| `POST` | `/api/v1/groups/:id/members` | `ADMIN` | Adiciona um usuário ao grupo (`{ user_id: string }`) |
| `DELETE` | `/api/v1/groups/:id/members/:userId` | `ADMIN` | Remove um usuário do grupo |
| `GET` | `/api/v1/groups/users/:userId/groups` | `ADMIN` | Retorna grupos aos quais o usuário pertence e grupos disponíveis |
| `POST` | `/api/v1/groups/users/:userId/groups` | `ADMIN` | Vincula o usuário a um grupo (`{ group_id: string }`) |
| `DELETE` | `/api/v1/groups/users/:userId/groups/:groupId` | `ADMIN` | Desvincula o usuário de um grupo |

---

## 7. Guia de Implantação e Deploy em Outros Servidores

### Cenário 1: Servidor Dedicado / Novo (Standalone Docker Compose)

Para implantar em um servidor novo onde não há banco PostgreSQL instalado:

1. Clone o repositório no servidor:

   ```bash
   git clone <URL_DO_REPOSITORIO_GITHUB> openclinic
   cd openclinic
   ```

2. Crie o arquivo `.env` a partir do exemplo:

   ```bash
   cp .env.example .env
   # Edite o .env configurando chaves seguras (JWT_KEY / JWT_SECRET_NAME, senhas)
   ```

3. Suba a stack completa (PostgreSQL + API + Webapp):

   ```bash
   docker compose up -d
   ```

4. O PostgreSQL provisiona roles dinamicamente com `000-roles.sh`; o serviço `migrate` aplica `infra/database/migrations` antes da API.

---

### Cenário 2: Servidor com PostgreSQL Compartilhado / Portainer

Para implantar quando já existe uma instância do PostgreSQL (ex: em rede Docker `postgres_network` gerenciada pelo Portainer):

1. **Build da Imagem da API:**

   ```bash
   docker build -t openclinic-api:latest -f infra/docker/Dockerfile .
   ```

2. **Provisionamento do Banco:**

   Provisione database e roles separadamente. Execute `npm run db:setup` para migrations e catálogo; bancos existentes exigem adoção prévia da baseline.

3. **Publicação da Stack no Portainer:**

   Crie uma Stack colando a definição canônica de [`infra/stacks/openclinic-production.yml`](../infra/stacks/openclinic-production.yml):

   ```yaml
   version: '3.8'
   services:
     api:
       image: openclinic/openclinic-api:latest
       container_name: openclinic-api
       restart: unless-stopped
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - SECRETS_PROVIDER=file
         - DB_APP_SECRET_NAME=database-secret-app
         - JWT_SECRET_NAME=jwt-secret
         - JWT_ALGORITHM=HS256
         - ACCESS_TOKEN_EXPIRE_MINUTES=15
         - REFRESH_TOKEN_EXPIRE_DAYS=7
         - APP_HOST=0.0.0.0
         - APP_PORT=3000
       networks:
         - postgres_network
       healthcheck:
         test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health/live"]
         interval: 30s
         timeout: 10s
         retries: 3

   networks:
     postgres_network:
       external: true
   ```

---

## 8. Referência de Comandos (Guia do Desenvolvedor)

```powershell
# ── Instalação & Setup ──
npm install                    # Instala todas as dependências dos workspaces
npm run db:setup               # Aplica migrations/catalogo e verifica autenticacao

# ── Execução em Desenvolvimento ──
npm run dev:api                # Inicia a API Fastify com hot-reload (porta 3000)
npm run dev:webapp             # Inicia o frontend React de testes (porta 5173)

# ── Qualidade de Código & Build ──
npm run typecheck              # Checagem estática de tipos TypeScript (0 erros)
npm run build                  # Compilação de todos os pacotes para produção

# ── CLI Administrativa ──
npm run db:init                # Cria a base openclinic e roles via superuser
npm run db:migrate             # Aplica somente migrations pendentes
npm run db:seed -- --demo      # Demonstracao opcional em banco local vazio
npm run user:create-admin      # Cria usuário administrador interativamente
npm run auth:check             # Diagnóstico de integridade (DB, Argon2, JWT)
```

---

## 9. Licença e Governança

Este projeto é desenvolvido sob licença open-source para a iniciativa **OpenClinic**, seguindo os padrões de governança, rastreabilidade e segurança do ecossistema OpenClinic.
