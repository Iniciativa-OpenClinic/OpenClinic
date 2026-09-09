# 🌐 Padronização de Idiomas, Logs, Exceções e Internacionalização (i18n)

> **Documento de Diretrizes Oficiais de Engenharia de Software do OpenClinic**  
> **Status:** Aprovado e Mandatório (P0)  
> **Escopo:** `@openclinic/core`, `@openclinic/backend-api`, `@openclinic/backend-cli`, `@openclinic/frontend-webapp`  
> **Público-Alvo:** Desenvolvedores, Mantenedores e Agentes de IA (Pair Programming).

---

## 1. Visão Geral e Princípios Fundamentais

O **OpenClinic** adota uma política clara de separação de responsabilidades linguísticas para garantir interoperabilidade global, observabilidade padronizada e governança centralizada de textos.

A regra fundamental de arquitetura divide os idiomas em **duas esferas de atuação**:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             ESFERA DE ENGENHARIA                            │
│           (Código, Logs, Variáveis, Identificadores, Git, Commits)          │
│                      👉 SEMPRE EM INGLÊS (English)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             ESFERA DO USUÁRIO                               │
│       (Interface WebApp, Mensagens de API / RFC 7807, Notificações)         │
│           👉 INTERNACIONALIZADO (i18n) — Padrão: Português (pt-BR)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Matriz de Padronização por Camada

| Elemento / Camada | Idioma / Padrão | Regra Técnica | Localização / Exemplo |
| :--- | :--- | :--- | :--- |
| **Código-Fonte (Nomes, Tipos, Classes, Variáveis)** | **Inglês (`en`)** | Proibido o uso de termos em português em identificadores técnicos. | `UserEntity`, `groupRepository`, `is_active`, `createdAt` |
| **Comentários de Código & Docstrings** | **Inglês (`en`)** | Comentários devem explicar o *porquê* e seguir o padrão de engenharia. | `// Auto-link user to default system group` |
| **Logs de Aplicação (`logger.info/warn/error`)** | **Inglês (`en`)** | Logs estruturados (Pino/JSON) para APM, Kibana, Datadog e Sentry. | `logger.info({ userId }, 'User group deleted')` |
| **Exceções de Domínio (`AppError`, `DomainError`, etc.)** | **`ErrorCode` enum** | **Proibido passar strings de texto inline.** Lançar sempre com `ErrorCode`. | `throw new AccessDeniedError(ErrorCode.DEFAULT_GROUP_IMMUTABLE)` |
| **Respostas de Erro da API (RFC 7807 `ProblemDetail`)** | **Dinâmico (i18n)** | O `errorHandler` traduz o `ErrorCode` pelo header `Accept-Language` (`pt-BR` ou `en-US`). | `getErrorMessage(ErrorCode.GROUP_NOT_FOUND, locale)` |
| **Interface do Usuário (Frontend WebApp & Telas)** | **Português (`pt-BR`)** | Textos da UI são centralizados no dicionário via `getMessage(KEY)`. | `getMessage('BTN_SAVE')`, `getMessage('FIELD_EMAIL_LABEL')` |
| **Scripts Administrativos & CLI (`backend-cli`)** | **Inglês / Estruturado** | Saídas de diagnóstico e logs de terminal técnicos em inglês. | `console.log('Database seed completed successfully')` |

---

## 3. Especificação Detalhada por Camada

### 3.1 Logs do Servidor e Observabilidade

Os logs são ferramentas de diagnóstico para **engenheiros de software e sistemas de monitoramento automatizados**.

- **Regra:** Todas as mensagens de log (`logger.trace`, `logger.debug`, `logger.info`, `logger.warn`, `logger.error`, `logger.fatal`) DEVEM ser escritas em **Inglês**.
- **Formato:** Contexto estruturado como primeiro argumento (objeto com IDs e metadados) e mensagem curta como segundo argumento.

#### ✅ Exemplo Correto

```typescript
logger.info({ userId: user.id, role: user.role }, 'User created via admin panel');
logger.warn({ ipAddress, username }, 'Authentication failed: invalid password');
logger.error({ err: error, url: request.url }, 'Unhandled server error');
```

#### ❌ Exemplo Incorreto (Violam a Padronização)

```typescript
// PROIBIDO: Log em português
logger.info({ userId: user.id }, 'Usuário criado com sucesso');
logger.error({ err: error }, 'Erro não tratado');
```

---

### 3.2 Exceções e Tratamento de Erros no Backend

Nenhum caso de uso (*Use Case*), serviço ou repositório deve definir strings arbitrárias de mensagens de erro.

- **Regra P0:** Toda exceção lançada na aplicação deve ser filha de `AppError` e deve receber exclusivamente um código padronizado `ErrorCode`.
- **Catálogo:** As mensagens correspondentes a cada `ErrorCode` devem ser cadastradas nos catálogos centrais do `@openclinic/core`:
  - `packages/core/src/errors/messages-pt-br.ts`
  - `packages/core/src/errors/messages-en-us.ts`

#### ✅ Exemplo Correto

```typescript
// packages/core/src/errors/index.ts
export const ErrorCode = {
  DEFAULT_GROUP_IMMUTABLE: 'ERR_DEFAULT_GROUP_IMMUTABLE',
  DEFAULT_GROUP_MEMBER_IMMUTABLE: 'ERR_DEFAULT_GROUP_MEMBER_IMMUTABLE',
} as const;

// packages/backend-api/src/arch/application/use-cases/delete-group.use-case.ts
if (existingGroup.is_default) {
  throw new AccessDeniedError(ErrorCode.DEFAULT_GROUP_IMMUTABLE);
}
```

#### ❌ Exemplo Incorreto (Violam a Padronização)

```typescript
// PROIBIDO: String de erro hardcoded inline no use case
throw new AccessDeniedError(ErrorCode.ACCESS_DENIED, 'O grupo padrão do sistema não pode ser excluído.');

// PROIBIDO: Erros nativos genéricos sem ErrorCode
throw new Error('Falha ao processar grupo');
```

---

### 3.3 Resposta da API REST (RFC 7807 Problem Details)

O `errorHandler` global da API Fastify intercepta qualquer `AppError` e realiza a resolução dinâmica do idioma:

```typescript
// packages/backend-api/src/arch/presentation/error-handler.ts
export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply): void {
  const acceptLang = request.headers['accept-language'] ?? '';
  const locale = acceptLang.includes('en') ? SupportedLocales.EN_US : SupportedLocales.PT_BR;

  if (error instanceof AppError) {
    const problemDetail = error.toProblemDetail(request.url, locale);
    reply.status(error.statusCode).send(problemDetail);
    return;
  }
  // ...
}
```

#### Exemplo de Resposta HTTP (Quando requisitado com `Accept-Language: pt-BR` ou padrão)

```json
{
  "type": "urn:openclinic:error:err-default-group-immutable",
  "title": "AccessDeniedError",
  "status": 403,
  "code": "ERR_DEFAULT_GROUP_IMMUTABLE",
  "detail": "O grupo padrão do sistema não pode ser alterado ou excluído.",
  "instance": "/api/v1/iam/groups/grp-default-id"
}
```

##### Exemplo de Resposta HTTP (Quando requisitado com `Accept-Language: en-US`)

```json
{
  "type": "urn:openclinic:error:err-default-group-immutable",
  "title": "AccessDeniedError",
  "status": 403,
  "code": "ERR_DEFAULT_GROUP_IMMUTABLE",
  "detail": "The default system group cannot be modified or deleted.",
  "instance": "/api/v1/iam/groups/grp-default-id"
}
```

---

### 3.4 Interface com o Usuário (Frontend WebApp)

O frontend web é totalmente orientado a dicionários tipados via TypeScript.

- **Idioma Padrão:** Português do Brasil (`pt-BR`).
- **Resolução de Chaves:** Uso do helper `getMessage(KEY)` em vez de strings hardcoded em componentes JSX/TSX.
- **Localização dos Dicionários:** `packages/frontend-webapp/src/i18n/`.

#### ✅ Exemplo Correto

```tsx
import { getMessage } from '../../i18n/index.js';

<button type="submit">
  {loading ? getMessage('BTN_PROCESSING') : getMessage('BTN_SAVE')}
</button>
```

---

## 4. Guia Rápido: Como Adicionar uma Nova Mensagem / Erro

Ao criar uma nova regra de negócio que requer validação ou mensagem de sucesso:

1. **Cadastrar o Código em `@openclinic/core`:**
   - Em `packages/core/src/errors/index.ts`, adicione a constante no objeto `ErrorCode` ou `SuccessCode`.
2. **Cadastrar as Traduções nos Catálogos:**
   - Em `packages/core/src/errors/messages-pt-br.ts`: Adicione o texto em português.
   - Em `packages/core/src/errors/messages-en-us.ts`: Adicione o texto em inglês correspondente.
3. **Consumir no Caso de Uso:**
   - Lance a exceção correspondente passando apenas o `ErrorCode`.

---

## 5. Auditoria e Conformidade (Checklist de CI/CD)

Antes de aprovar Pull Requests ou deploys, certifique-se de:

- [ ] Não há chamadas de `logger.*` com texto em português.
- [ ] Não há `throw new AppError(...)` com strings literais em vez de `ErrorCode`.
- [ ] Todo novo `ErrorCode` possui chave e tradução equivalente em `messages-pt-br.ts` e `messages-en-us.ts`.
- [ ] Identificadores, nomes de arquivos e variáveis estão estritamente em inglês.
- [ ] Testes unitários do monorepo foram validados com `npm test`.
