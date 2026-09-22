# 🚀 @openclinic/backend-api

> Servidor HTTP e API REST do **OpenClinic**, construído com Fastify 5.x, TypeScript, Drizzle ORM e Clean Architecture.

---

## 🏛 Arquitetura de Software (Clean Architecture)

A API segue os princípios de separação de responsabilidades e desacoplamento:

```text
packages/backend-api/src/
├── arch/
│   ├── application/
│   │   └── use-cases/      # Regras de negócio puras (Login, Register, Users, Passwords)
│   ├── domain/             # Entidades e contratos de repositórios (IAMUnitOfWork)
│   ├── infrastructure/
│   │   └── database/       # Drizzle ORM Schema e repositórios concretos (PostgreSQL)
│   └── presentation/
│       ├── middlewares/    # authenticateJwt, requireRole (RBAC)
│       ├── auth.router.ts  # Endpoints REST e injeção de dependências
│       ├── auth.schemas.ts # Validação de contratos com Zod
│       └── error-handler.ts# Handler global RFC 7807 (Problem Details)
├── shared/                 # Enums de domínio, classes base de repositório e interfaces
├── config/                 # Carregamento e validação de variáveis de ambiente
└── server.ts               # Ponto de entrada do servidor Fastify
```

---

## 🔑 Controle de Acesso Baseado em Papéis (RBAC)

O sistema implementa uma hierarquia de papéis restrita:

| Papel (`role`) | Nível | Descrição de Acesso |
| :--- | :---: | :--- |
| **`USER`** | 1 | Operador / Profissional de saúde. Acesso ao próprio perfil, alteração da própria senha e suporte. |
| **`ADMIN`** | 2 | Administrador da Unidade. Inclui menus de USER + Gerenciamento de Usuários, criação de contas (`USER`/`ADMIN`), alteração de senhas e desbloqueio de contas. |
| **`OWNER`** | 3 | Proprietário / Governança do Sistema. Acesso total + Gestão de Tenants e Configurações Globais. |

---

## 📡 Catálogo de Endpoints da API

### 1. Autenticação & Sessão (`/api/v1/auth`)

#### `POST /api/v1/auth/login`

Realiza autenticação por **Nome de Usuário ou E-mail** com proteção contra força bruta.

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin.santos", "password": "temp1234"}'
```

#### `POST /api/v1/auth/refresh`

Renovação atômica de tokens de sessão.

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "seu-refresh-token-aqui"}'
```

#### `GET /api/v1/auth/menu` *(Requer Bearer Token)*

Retorna a lista dinâmica de menus permitidos para o papel do usuário conectado.

#### `POST /api/v1/auth/change-password` *(Requer Bearer Token)*

Permite ao usuário alterar sua própria senha mediante confirmação da senha atual.

#### `POST /api/v1/auth/forgot-password`

Gera token de recuperação com validade de 30 minutos (simulação de envio de e-mail).

#### `POST /api/v1/auth/reset-password`

Redefine a senha do usuário utilizando o token de recuperação.

---

### 2. Gestão de Usuários & IAM (`/api/v1/iam`) *(Requer Role ADMIN ou OWNER)*

#### `GET /api/v1/iam/users`

Lista todos os usuários com dados de perfil, papel, status e último acesso.

#### `POST /api/v1/iam/users`

Cadastra um novo usuário no sistema.

```bash
curl -X POST http://localhost:3000/api/v1/iam/users \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Dra. Juliana Mendes",
    "email": "juliana@openclinic.local",
    "username": "juliana.mendes",
    "password": "temp1234",
    "role": "USER"
  }'
```

#### `POST /api/v1/iam/users/:id/reset-password`

Permite ao Administrador/Owner definir imediatamente uma nova senha para o usuário selecionado.

#### `POST /api/v1/iam/users/:id/unlock`

Desativa o bloqueio de segurança decorrente de excesso de tentativas falhas de login.

#### `PATCH /api/v1/iam/users/:id/status`

Alterna o status do usuário entre **Ativo** e **Inativo**.

---

## 🖥 Documentação Interativa Swagger UI & OpenAPI

O servidor disponibiliza documentação interativa baseada em schemas Fastify / JSON Schema (SSOT):

- **Swagger UI Local**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **Exportação de Contratos**: Para regerar as especificações estáticas OpenAPI 3.0.3 (`openapi.json` e `openapi.yaml` em `docs/openapi/`), execute:

  ```bash
  npm run export:openapi
  ```

- **Guia Detalhado**: Consulte o [**Guia do Swagger UI**](../../docs/openapi/swagger.md) e a [**Central de Contratos OpenAPI**](../../docs/openapi/README.md).

---

## ⚙ Configuração do Ambiente (.env) & Secrets

O backend consome credenciais de forma desacoplada via arquitetura de **Secrets Provider**:

```env
# Servidor HTTP
APP_HOST=0.0.0.0
APP_PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Provedor ativo de credenciais ('env', 'file', 'gsm', 'aws')
SECRETS_PROVIDER=env

# Configuração atômica do banco (quando SECRETS_PROVIDER=env)
# DATABASE_URL é sintetizada dinamicamente em memória e NUNCA salva no .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=openclinic
DB_USER=openclinic_app
DB_PASS="sua-senha-de-desenvolvimento"

# Chave de assinatura JWT (mínimo de 32 caracteres)
JWT_KEY="chave-aleatoria-criptograficamente-segura-min-32-chars"

# Identificadores de secrets (para SECRETS_PROVIDER=file, gsm ou aws)
DB_APP_SECRET_NAME=database-secret-app
DB_OWNER_SECRET_NAME=database-secret-owner
JWT_SECRET_NAME=jwt-secret
SECRETS_DIR=./secrets
```

> 🛡️ **Invariantes P0**:
>
> - **Princípio do Menor Privilégio (PoLP)**: A API executa estritamente sob a role `openclinic_app` (DML). Migrações estruturais (DDL) exigem a role `openclinic_owner` via CLI/migration runner.
> - **Zero Raw Secrets no Git**: Arquivos de segredos reais (`*.json`, `*.txt`) são ignorados no Git.
> - Consulte o [**Guia de Secrets**](../../secrets/README.md) para detalhes completos de configuração em modo `file` e orquestração.

---

## 🚀 Execução

```bash
# Executar em modo desenvolvimento (com live reload tsx)
npm run dev:api

# Compilar para produção
npm run build -w packages/backend-api
```
