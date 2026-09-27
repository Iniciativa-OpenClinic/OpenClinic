# Módulo de Autenticação e Gestão de Identidade (IAM) — OpenClinic

> **Revisão de 2026-09-09:** a [especificação da fase 0](./auth-spec.md) define o comportamento-alvo local de sessão, revogação, primeiro acesso e transporte. Descrições abaixo de rotação atômica, refresh em memória e exclusão definitiva não devem ser usadas como garantias atuais nem como contrato das próximas fases. A implementação dos controles permanece pendente.

## 1. Visão Geral e Arquitetura

O **Módulo de Autenticação e IAM (Identity & Access Management)** do **OpenClinic** é responsável pelo gerenciamento seguro de credenciais, controle de sessões, autorização baseada em papéis (**RBAC**) e vinculação bidirecional de **Grupos de Usuários**.

A arquitetura adota os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)** e **Zero-Trust Security**:

- **Domínio Isolado**: Entidades puras e contratos de repositório (`IUserRepository`, `IGroupRepository`, `IRoleRepository`, `ISessionRepository`, `ILockoutRepository`, `IAuditLogRepository`).
- **Casos de Uso Independentes**: Cada operação de negócio (login, refresh, registro, troca de senha, CRUD de usuários, CRUD de grupos e vinculações) é encapsulada em seu próprio caso de uso (`Use Case`).
- **Validação Estrita na Borda**: Esquemas **Zod** validam todas as entradas antes da execução das regras de negócio.
- **Auditoria de Ações**: Todas as mutações administrativas de segurança e permissões geram registros automáticos em `sys_audit_logs`.
- **Internacionalização (i18n)**: Mensagens de erro e sucesso retornam códigos padronizados (`ERR_*` e `MSG_*`), traduzíveis para `pt-BR` e `en-US` sem strings mágicas no código.

---

## 2. Invariantes e Padrões de Segurança (P0)

1. **Hashing Criptográfico de Senhas (Argon2id - RFC 9106)**:
   - Todas as senhas de usuários são cifradas utilizando **Argon2id** (configuração com memória de 64 MB, 3 iterações e paralelismo 1).
   - Proibição absoluta de armazenamento ou comparação de senhas em texto claro (`password == hash`).
2. **Mitigação de Timing Attacks**:
   - Comparação segura de hashes e identificadores de sessão com proteção contra análise de tempo de resposta.
3. **Ciclo de Vida de Tokens (JWT + Refresh Token Opaque)**:
   - **Access Token (JWT)**: Vida curta (15 minutos), contendo claims essenciais (`sub`, `email`, `username`, `role`, `tenant_id`, `is_tenant_owner`).
   - **Refresh Token**: Identificador opaco de 256 bits (UUID v4 criptograficamente seguro). Apenas o hash SHA-256 é persistido na tabela `iam_sessions`.
   - **Rotação Atômica de Refresh Token**: A cada renovação (`/api/v1/auth/refresh`), o token anterior é revogado e um novo par é gerado de forma transacional.
4. **Proteção Contra Força Bruta (Brute-Force Lockout)**:
   - Limite de **5 tentativas consecutivas falhas** por identificador (e-mail ou username).
   - Bloqueio temporário automático de **15 minutos** via tabela `iam_lockouts`.
   - Desbloqueio administrativo em 1 clique disponível no painel para usuários com privilégios `ADMIN` ou `OWNER`.
5. **Isolamento Multi-Tenant**:
   - Suporte nativo a `tenant_id` garantindo isolamento de contexto entre unidades/organizações.

---

## 3. Modelo de Dados (Schema DDL & Tabelas)

```sql
-- ENUMS
CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'USER');
CREATE TYPE audit_status AS ENUM ('SUCCESS', 'FAILURE');

-- NOTA: Todos os IDs (PKs e FKs) utilizam VARCHAR(36) gerados via aplicação (crypto.randomUUID())
-- garantindo conformidade ANSI SQL desacoplada de dialetos de banco.
-- Nota: O papel institucional reside diretamente em iam_users.role (ver docs/user-roles-and-access-control.md)

-- USUÁRIOS
CREATE TABLE iam_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(500),
    full_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    access_count INT NOT NULL DEFAULT 0,
    last_access TIMESTAMPTZ,
    require_password_change BOOLEAN NOT NULL DEFAULT FALSE,
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMPTZ,
    tenant_id VARCHAR(36) REFERENCES sys_tenants(id) ON DELETE SET NULL,
    is_tenant_owner BOOLEAN NOT NULL DEFAULT FALSE,
    timezone VARCHAR(50),
    locale VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GRUPOS DE USUÁRIOS
CREATE TABLE iam_groups (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id VARCHAR(36) REFERENCES sys_tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ASSOCIAÇÃO USUÁRIO <-> GRUPO (Muitos para Muitos)
CREATE TABLE iam_user_groups (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES iam_users(id) ON DELETE CASCADE,
    group_id VARCHAR(36) NOT NULL REFERENCES iam_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, group_id)
);

-- SESSÕES E REFRESH TOKENS
CREATE TABLE iam_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES iam_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(500) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BLOQUEIOS DE FORÇA BRUTA
CREATE TABLE iam_lockouts (
    id VARCHAR(36) PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    tenant_id VARCHAR(36) REFERENCES sys_tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Fluxo de Autenticação e Rotação de Sessão

```text
  [ Cliente Frontend ]                     [ Backend Fastify API ]               [ PostgreSQL Database ]
          │                                          │                                      │
 1. POST /auth/login (email + senha)                │                                      │
          ──────────────────────────────────────────>│                                      │
          │                                          │──> Valida Lockout (iam_lockouts) ───>│
          │                                          │<── Retorna Status de Bloqueio ───────│
          │                                          │                                      │
          │                                          │──> Busca Usuário (iam_users) ───────>│
          │                                          │<── Hash Argon2id + Role ─────────────│
          │                                          │                                      │
          │                                          │──> Verifica Argon2id.verify()        │
          │                                          │                                      │
          │                                          │──> Grava Hash Refresh Token ────────>│
          │                                          │    (iam_sessions com expiração 7d)   │
          │                                          │                                      │
 2. 200 OK (Access Token JWT + Refresh Token)        │                                      │
          │<──────────────────────────────────────────│                                      │
          │                                          │                                      │
 3. Requisição com Bearer Token JWT                  │                                      │
          ──────────────────────────────────────────>│                                      │
          │                                          │──> Valida Assinatura JWT em Memória  │
          │<──────────────────────────────────────────│    (Zero consulta de banco para Auth)│
          │                                          │                                      │
 4. POST /auth/refresh (quando JWT expira)          │                                      │
          ──────────────────────────────────────────>│                                      │
          │                                          │──> Revoga Hash Anterior (Transação) ─>│
          │                                          │──> Insere Novo Hash de Sessão ──────>│
 5. 200 OK (Novo JWT + Novo Refresh Token)          │                                      │
          │<──────────────────────────────────────────│                                      │
```

---

## 5. Especificação de Endpoints da API

### 5.1. Autenticação Pública & Sessão do Usuário (`/api/v1/auth`)

| Método | Rota | Descrição | Permissão | Status Sucesso |
| --- | --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Autentica usuário via e-mail/username + senha | Público | `200 OK` |
| `POST` | `/api/v1/auth/register` | Cria novo usuário padrão (`USER`) | Público | `201 Created` |
| `POST` | `/api/v1/auth/refresh` | Rotação atômica de refresh token | Público | `200 OK` |
| `GET` | `/api/v1/auth/me` | Retorna perfil do usuário autenticado | `Bearer JWT` | `200 OK` |
| `POST` | `/api/v1/auth/logout` | Revoga a sessão atual do usuário no banco | `Bearer JWT` | `200 OK` |
| `GET` | `/api/v1/auth/menu` | Retorna menus autorizados de acordo com o Role | `Bearer JWT` | `200 OK` |
| `POST` | `/api/v1/auth/change-password` | Usuário altera sua própria senha | `Bearer JWT` | `200 OK` |
| `POST` | `/api/v1/auth/forgot-password` | Solicita envio de token para recuperação de senha | Público | `200 OK` |
| `POST` | `/api/v1/auth/reset-password` | Redefine senha utilizando token de recuperação | Público | `200 OK` |

#### Payload de Exemplo - `POST /api/v1/auth/login`

```json
// Request Body
{
  "identifier": "admin@openclinic.local",
  "password": "temp1234"
}

// Response Body (200 OK)
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "8c901f0d-c418-4dc4-a80e-796c394414c9",
    "username": "admin@openclinic.local",
    "email": "admin@openclinic.local",
    "full_name": "Administrador da Clínica",
    "display_name": "Administrador",
    "role": "ADMIN",
    "is_tenant_owner": false,
    "require_password_change": false
  }
}
```

---

### 5.2. Gestão Administrativa de Usuários (`/api/v1/iam/users`)

Apenas usuários com papéis `ADMIN` ou `OWNER` têm acesso a estes endpoints:

| Método | Rota | Descrição | Permissão |
| --- | --- | --- | --- |
| `GET` | `/api/v1/iam/users` | Lista todos os usuários cadastrados com indicador de bloqueio | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/users` | Cadastra novo usuário com Role, dados e senha inicial | `ADMIN` / `OWNER` |
| `PUT` | `/api/v1/iam/users/:id` | Atualiza nome, username, e-mail e papel do usuário | `ADMIN` / `OWNER` |
| `PATCH` | `/api/v1/iam/users/:id/status` | Alterna status (Ativo / Inativo) do usuário | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/users/:id/reset-password` | Administrador redefine a senha do usuário diretamente | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/users/:id/unlock` | Desbloqueia tentativas de força bruta do usuário | `ADMIN` / `OWNER` |
| `DELETE` | `/api/v1/iam/users/:id` | Exclusão definitiva de usuário inativo do sistema | `ADMIN` / `OWNER` |

---

### 5.3. Gestão de Grupos de Usuários & Vinculação Bidirecional (`/api/v1/iam/groups` e `/api/v1/iam/users/:id/groups`)

Permite a categorização clínica e operacional de usuários (ex: *Corpo Clínico*, *Equipe de Enfermagem*, *Recepção*, *Gestão*):

| Método | Rota | Descrição | Permissão |
| --- | --- | --- | --- |
| `GET` | `/api/v1/iam/groups` | Lista grupos com a contagem agregada de membros ativos | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/groups` | Criação de novo grupo de usuários | `ADMIN` / `OWNER` |
| `PUT` | `/api/v1/iam/groups/:id` | Atualização de nome, descrição e status do grupo | `ADMIN` / `OWNER` |
| `DELETE` | `/api/v1/iam/groups/:id` | Exclusão de grupo e seus vínculos associados | `ADMIN` / `OWNER` |
| `GET` | `/api/v1/iam/groups/:id/members` | Retorna membros do grupo e lista de usuários disponíveis | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/groups/:id/members` | Adiciona um usuário ao grupo selecionado | `ADMIN` / `OWNER` |
| `DELETE` | `/api/v1/iam/groups/:id/members/:userId` | Remove o vínculo do usuário com o grupo | `ADMIN` / `OWNER` |
| `GET` | `/api/v1/iam/users/:id/groups` | Retorna grupos do usuário e lista de grupos disponíveis | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/users/:id/groups` | Vincula o usuário selecionado a um grupo | `ADMIN` / `OWNER` |
| `DELETE` | `/api/v1/iam/users/:id/groups/:groupId` | Desvincula o usuário do grupo selecionado | `ADMIN` / `OWNER` |

---

## 6. Interface do Usuário (Frontend Webapp)

O frontend em **React 19 + TypeScript** disponibiliza as funcionalidades na aba **Gerenciamento de Acesso** do `DashboardPage.tsx`:

1. **Sub-Abas Especializadas**:
   - **👥 Sub-Aba Usuários**: Tabela com avatar, nome, e-mail, badge de Role (`OWNER`, `ADMIN`, `USER`), status de bloqueio, botões de ação (Gerenciar Grupos 👥, Editar ✏️, Senha 🔑, Ativar/Desativar e Excluir 🗑️).
   - **🏢 Sub-Aba Grupos de Usuários**: Tabela com nome, descrição, badge de contagem de membros ativos (`👥 X membros`), status, botão "+ Novo Grupo", edição, exclusão e botão de ação **👥 Membros**.
2. **Modais Dinâmicos de Vinculação**:
   - **Modal de Membros do Grupo**: Exibe dropdown com apenas usuários que ainda não pertencem ao grupo e lista atual com botão de remoção em 1 clique.
   - **Modal de Grupos do Usuário**: Exibe dropdown com apenas grupos aos quais o usuário ainda não pertence e tags/lista dos grupos vinculados com botão de desvinculação em 1 clique.
3. **Internacionalização Completa**: Suporte total a `pt-BR` e `en-US` com alternância em tempo real.

---

## 7. Códigos de Erro e Sucesso Padronizados

| Código | Descrição | HTTP Status |
| --- | --- | --- |
| `ERR_AUTH_FAILED` | Credenciais inválidas (usuário ou senha incorretos) | `401 Unauthorized` |
| `ERR_USER_DISABLED` | Conta de usuário desativada pelo administrador | `403 Forbidden` |
| `ERR_USER_LOCKED` | Conta temporariamente bloqueada por excesso de tentativas | `429 Too Many Requests` |
| `ERR_TOKEN_EXPIRED` | Access Token expirado | `401 Unauthorized` |
| `ERR_TOKEN_INVALID` | Assinatura ou formato de token inválido | `401 Unauthorized` |
| `ERR_ACCESS_DENIED` | Usuário não possui o papel ou permissão necessária | `403 Forbidden` |
| `ERR_USER_NOT_FOUND` | Usuário não localizado no sistema | `404 Not Found` |
| `ERR_GROUP_NOT_FOUND` | Grupo de usuários não localizado | `404 Not Found` |
| `ERR_GROUP_NAME_EXISTS` | Nome de grupo já cadastrado | `409 Conflict` |
| `ERR_USER_ALREADY_IN_GROUP` | Usuário já é membro deste grupo | `409 Conflict` |
| `MSG_USER_CREATED` | Novo usuário cadastrado com sucesso | `201 Created` |
| `MSG_GROUP_CREATED` | Novo grupo de usuários cadastrado com sucesso | `201 Created` |
| `MSG_GROUP_MEMBER_ADDED` | Usuário vinculado ao grupo com sucesso | `200 OK` |
| `MSG_GROUP_MEMBER_REMOVED` | Usuário desvinculado do grupo com sucesso | `200 OK` |
