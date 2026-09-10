# 📚 Contratos OpenAPI & Documentação de API — OpenClinic PEP

> **Versão da API**: `1.0.0`  
> **Especificação**: `OpenAPI 3.0.3`  
> **Padrão de Erros**: `RFC 7807 Problem Details`  
> **Mecanismo de Autenticação**: `Bearer JWT` (Memory-only) + `HttpOnly Cookie` (Refresh Token)

Este diretório concentra todos os contratos estáticos, especificações e documentações de interface da API do OpenClinic.

---

## 🧭 Índice de Artefatos

| Artefato | Descrição | Formato |
| :--- | :--- | :--- |
| 🖥️ **[Guia do Swagger UI](./swagger.md)** | Instruções de acesso ao Swagger interativo local e fluxo de autorização *Bearer* | Markdown |
| 📄 **[Contrato OpenAPI 3.0.3 (JSON)](./openapi.json)** | Especificação completa da API em JSON (SSOT para geradores de SDK e mocks) | JSON |
| 📄 **[Contrato OpenAPI 3.0.3 (YAML)](./openapi.yaml)** | Especificação completa da API em YAML (legível para ferramentas de documentação) | YAML |

---

## 1. 🌐 Acesso Rápido ao Swagger UI Interativo

Ao executar a API backend em modo de desenvolvimento (`npm run dev:api` ou `npm run dev -w packages/backend-api`):

- 🔗 **Swagger UI Interativo**: [http://localhost:3000/docs](http://localhost:3000/docs)
- 📖 Para orientações detalhadas de autenticação e testes de rotas protegidas no navegador, consulte o **[Guia do Swagger UI](./swagger.md)**.

---

## 2. ⚡ Exportação Automatizada de Contratos

Para regerar ou atualizar os arquivos `openapi.json` e `openapi.yaml` após alterações em rotas ou schemas:

```bash
# Na raiz do monorepo:
npm run export:openapi
```

O comando inicializa o Fastify em memória, extrai a árvore Swagger compilada e salva os arquivos estáticos atualizados diretamente neste diretório (`docs/openapi/`).

---

## 3. 🛡 Arquitetura de Segurança & Autenticação

A API adota uma arquitetura rigorosa de **Defesa em Profundidade**:

1. **Hashing Criptográfico P0**: Hashing **Argon2id (RFC 9106)** com salt dinâmico individual para proteção de senhas.
2. **Mitigação de Timing Attacks**: Comparações criptográficas via `crypto.timingSafeEqual`.
3. **Proteção de Sessão**:
   - **Access Token (JWT)**: Validade curta (15 minutos), transmitido via cabeçalho `Authorization: Bearer <token>` e mantido **estritamente em memória** no frontend.
   - **Refresh Token**: Transmitido em cookie seguro com flags `HttpOnly`, `SameSite=Strict`, `Secure` e path restrito a `/api/v1/auth`.
4. **Proteção Anti-Força Bruta**: Bloqueio automático temporário da conta após tentativas consecutivas incorretas, registrado no log de auditoria (`sys_audit_logs`).

---

## 4. 📋 Catálogo Completo de Endpoints da API

### 🔐 4.1 Autenticação & Sessão (`/api/v1/auth`)

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/v1/auth/login` | Autentica com e-mail/username e senha, retorna Access Token e define Cookie HttpOnly | Pública |
| `POST` | `/api/v1/auth/register` | Auto-cadastro inicial de novos usuários | Pública |
| `POST` | `/api/v1/auth/refresh` | Renovação do Access Token JWT via cookie HttpOnly ou body | Pública |
| `GET` | `/api/v1/auth/profile` | Retorna dados cadastrais, papel e grupos do usuário autenticado | `Bearer JWT` |
| `GET` | `/api/v1/auth/me` | Alias para obtenção dos dados do usuário logado | `Bearer JWT` |
| `GET` | `/api/v1/auth/menu` | Retorna os itens de navegação dinâmicos liberados | `Bearer JWT` |
| `POST` | `/api/v1/auth/change-password` | Permite ao usuário alterar sua própria senha | `Bearer JWT` |
| `POST` | `/api/v1/auth/forgot-password` | Solicita envio de token de recuperação de senha | Pública |
| `POST` | `/api/v1/auth/reset-password` | Redefine a senha utilizando token de recuperação | Pública |
| `POST` | `/api/v1/auth/logout` | Encerra a sessão e revoga o refresh token no cookie | `Bearer JWT` |

---

### 👥 4.2 Gestão de Usuários — IAM (`/api/v1/iam/users`)

| Método | Endpoint | Descrição | Permissão Mínima |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/iam/users` | Lista todos os usuários cadastrados na clínica | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/users` | Cadastra novo profissional com papel e senha inicial | `ADMIN` / `OWNER` |
| `PUT` | `/api/v1/iam/users/:id` | Atualiza dados cadastrais e papel RBAC do usuário | `ADMIN` / `OWNER` |
| `DELETE` | `/api/v1/iam/users/:id` | Exclui usuário com validações de integridade | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/users/:id/reset-password` | Redefinição administrativa direta de senha | `ADMIN` / `OWNER` |
| `PATCH` | `/api/v1/iam/users/:id/status` | Ativa ou desativa o acesso do usuário | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/users/:id/unlock` | Desbloqueia conta bloqueada por tentativas de força bruta | `ADMIN` / `OWNER` |

---

### 🏷 4.3 Grupos Clínicos & Associação (`/api/v1/iam/groups`)

| Método | Endpoint | Descrição | Permissão Mínima |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/iam/groups` | Lista grupos clínicos com contagem de membros vinculados | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/groups` | Cria novo grupo funcional para agregação de acessos | `ADMIN` / `OWNER` |
| `PUT` | `/api/v1/iam/groups/:id` | Atualiza nome, descrição e status do grupo | `ADMIN` / `OWNER` |
| `DELETE` | `/api/v1/iam/groups/:id` | Remove o grupo e desvincula suas permissões associadas | `ADMIN` / `OWNER` |
| `GET` | `/api/v1/iam/groups/:id/members` | Retorna membros ativos do grupo e usuários disponíveis | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/groups/:id/members` | Associa um usuário existente como membro do grupo | `ADMIN` / `OWNER` |
| `DELETE` | `/api/v1/iam/groups/:id/members/:userId` | Remove a associação do usuário no grupo | `ADMIN` / `OWNER` |
| `GET` | `/api/v1/iam/users/:id/groups` | Lista os grupos aos quais o usuário pertence | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/users/:id/groups` | Vincula um grupo ao usuário | `ADMIN` / `OWNER` |
| `DELETE` | `/api/v1/iam/users/:id/groups/:groupId` | Desvincula o grupo do usuário | `ADMIN` / `OWNER` |

---

### 🔑 4.4 Controle Granular de Permissões & Capabilities (`/api/v1/iam`)

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/iam/permissions` | Lista de chaves de permissão consolidadas do usuário logado | `Bearer JWT` |
| `GET` | `/api/v1/iam/capabilities` | Matriz de capacidades ricas (recursos, rotas, ações C/R/U/D) | `Bearer JWT` |
| `GET` | `/api/v1/iam/navigation` | Menu filtrado por contexto (`business` ou `admin`) | `Bearer JWT` |
| `GET` | `/api/v1/iam/resources` | Lista plana de recursos gerenciáveis pelo IAM | `ADMIN` / `OWNER` |
| `GET` | `/api/v1/iam/resources/tree` | Árvore hierárquica completa de recursos e submódulos | `ADMIN` / `OWNER` |
| `GET` | `/api/v1/iam/permissions/user/:id` | ACL direta configurada para um usuário | `ADMIN` / `OWNER` |
| `GET` | `/api/v1/iam/permissions/user/:id/inherited` | ACL herdada dos grupos aos quais o usuário pertence | `ADMIN` / `OWNER` |
| `GET` | `/api/v1/iam/permissions/group/:id` | ACL atribuída a um grupo de usuários | `ADMIN` / `OWNER` |
| `POST` | `/api/v1/iam/permissions/sync` | Sincronização em lote da matriz de permissões (ACL) | `ADMIN` / `OWNER` |

---

### 🩺 4.5 Monitoramento & Telemetria (`/health`)

| Método | Endpoint | Descrição | Autenticação |
| :--- | :--- | :--- | :---: |
| `GET` | `/health` | Verifica a conectividade e integridade do serviço | Pública |

---

## 5. ⚠ Padronização de Erros (RFC 7807 Problem Details)

Todas as respostas de erro retornadas pela API seguem estritamente a especificação **RFC 7807**:

```json
{
  "type": "https://openclinic.local/errors/ERR_AUTH_INVALID_CREDENTIALS",
  "title": "Invalid Credentials",
  "status": 401,
  "detail": "Identificador ou senha incorretos.",
  "code": "ERR_AUTH_INVALID_CREDENTIALS",
  "instance": "/api/v1/auth/login"
}
```

Em caso de violação de validação de schema (ex: campos ausentes ou formato inválido), o objeto inclui a lista `invalid_params`:

```json
{
  "type": "https://openclinic.local/errors/ERR_VALIDATION",
  "title": "Validation Error",
  "status": 400,
  "detail": "Campos obrigatórios ausentes ou inválidos.",
  "code": "ERR_VALIDATION",
  "invalid_params": [
    { "name": "email", "reason": "Formato de e-mail inválido" },
    { "name": "password", "reason": "A senha deve ter no mínimo 8 caracteres" }
  ]
}
```
