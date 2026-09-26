# 🏛 Decisão de Arquitetura: Desacoplamento de Banco de Dados e Identificadores Universais (UUID)

> **Documento:** ADR-004 — Database Decoupling & Application-Generated UUIDs  
> **Status:** Aprovado & Implementado  
> **Data:** Setembro / 2026  
> **Projeto:** OpenClinic (Plataforma Clínica & Hospitalar Open Source)  
> **Camadas Impactadas:** `@openclinic/core`, `@openclinic/backend-api`, `@openclinic/backend-cli`, Infraestrutura & Banco de Dados.

---

## 1. Contexto & Desafio

Sistemas de saúde e ambientes hospitalares possuem requisitos rigorosos de **segurança**, **rastreabilidade**, **alta disponibilidade** e **diversidade de ambientes de implantação**. Ao mesmo tempo, em projetos de código aberto (*open source*), a facilidade de desenvolvimento local, testes automatizados e a não dependência de recursos proprietários de um único fabricante de banco de dados são fatores determinantes para a longevidade da plataforma.

Anteriormente, o banco de dados utilizava:

1. **Tipos `ENUM` nativos do PostgreSQL** (`CREATE TYPE ... AS ENUM (...)`).
2. **Geração de UUIDs delegada ao motor de banco** (`DEFAULT gen_random_uuid()`).

Esses fatores criavam acoplamento excessivo ao PostgreSQL, dificultavam migrações de evolução de domínio e impediam que entidades tivessem identidade antes de serem persistidas no banco.

---

## 2. Decisões Arquiteturais Adotadas

### 🎯 Decisão 1: Identificadores Gerados no Código da Aplicação (`node:crypto.randomUUID()`)

Todos os identificadores únicos (Chaves Primárias e Chaves Estrangeiras) são gerados na **camada de aplicação** antes de qualquer operação de persistência, e armazenados no banco de dados como **`VARCHAR(36)`**.

```typescript
// Padrão em repositórios e casos de uso:
import { randomUUID } from 'node:crypto';

async create(entity: Partial<UserEntity>): Promise<UserEntity> {
  const id = entity.id || randomUUID();
  const [user] = await this.db.insert(iamUsers).values({ ...entity, id }).returning();
  return user as unknown as UserEntity;
}
```

#### Justificativas e Benefícios

| Benefício | Descrição |
| :--- | :--- |
| **Identidade de Domínio (DDD)** | A entidade de negócio já nasce com identidade única no domínio antes de tocar o banco de dados. Permite instanciar grafos complexos em memória (ex: um Usuário com 3 permissões vinculadas) com os IDs já correlacionados. |
| **Padrão Unit of Work Puro** | Permite enfileirar operações de escrita, eventos de domínio e comandos de transação sem depender de round-trips extras (`INSERT ... RETURNING id`). |
| **Rastreabilidade e Logs** | O `id` do recurso pode ser incluído em logs estruturados, spans de OpenTelemetry e mensagens de auditoria antes mesmo da confirmação física no banco. |
| **Prontidão para UUID v7 (Time-Ordered)** | Permite migrar de forma transparente para UUID v7 (ordenado por tempo para otimização de índices B-Tree) sem depender de extensões C ou versões específicas de banco de dados. |
| **Zero Vendor Lock-in** | O banco de dados atua como camada confiável de armazenamento e indexação, sem exigir funções nativas como `gen_random_uuid()` ou extensões como `pgcrypto`. |

---

### 🎯 Decisão 2: Eliminação de ENUMs Nativos do Banco em favor de `VARCHAR(20)` com Validação no Domínio

Todos os tipos `CREATE TYPE ... AS ENUM (...)` foram removidos do schema DDL. As colunas de papéis (`roles`), status, ações de permissão e contextos agora utilizam **`VARCHAR(20)`**.

```sql
-- Exemplo de definição agnóstica no DDL:
CREATE TABLE iam_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    ...
);

CREATE TABLE iam_permissions (
    id VARCHAR(36) PRIMARY KEY,
    action VARCHAR(20) NOT NULL DEFAULT 'READ',
    effect VARCHAR(20) NOT NULL DEFAULT 'ALLOW',
    ...
);
```

#### Justificativas e Benefícios

1. **Separação de Responsabilidades (*Clean Architecture*)**:
   - O vocabulário de negócio (quais papéis e ações existem) pertence à **Camada de Domínio** (`@openclinic/core` via TypeScript e esquemas Zod).
   - O banco de dados armazena o texto simples, eliminando a duplicação de regras em duas camadas distintas.
2. **Evolução e Migrações Sem Fricção**:
   - `ENUM` nativo no PostgreSQL impõe limitações severas (dificuldade de renomear, remover ou reordenar valores em migrações transacionais).
   - Com `VARCHAR(20)`, a inclusão de um novo papel ou status (ex: `SUPER_ADMIN`, `MAINTENANCE`) exige apenas atualização nos enums do código, sem necessidade de comandos DDL complexos e arriscados em produção.
3. **Portabilidade Universal**:
   - Bancos como SQLite (usado em testes locais e automações em memória), MySQL, MariaDB, SQL Server e Oracle manipulam `VARCHAR(20)` de forma nativa e idêntica, sem sintaxes proprietárias.

---

## 3. Matriz de Tipos e Padrões de Dimensionamento

| Categoria | Tipo ANSI Adotado | Justificativa de Dimensionamento |
| :--- | :---: | :--- |
| **Identificadores (PKs & FKs)** | `VARCHAR(36)` | Comprimento exato do UUID canônico (`8-4-4-4-12` = 36 caracteres). Compatibilidade universal com drivers JS e ORMs. |
| **Roles / Papéis** | `VARCHAR(20)` | Valores atuais: `OWNER` (5), `ADMIN` (5), `USER` (4). Margem segura para termos futuros. |
| **Ações de Permissão (ACL)** | `VARCHAR(20)` | Valores atuais: `READ` (4), `WRITE` (5), `DELETE` (6), `EXECUTE` (7), `MANAGE` (6), `ALL` (3), `NONE` (4). |
| **Status Operacionais** | `VARCHAR(20)` | Valores atuais: `ACTIVE` (6), `SUSPENDED` (9), `DELETED` (7), `SUCCESS` (7), `FAILURE` (7). |
| **Contextos de Aplicação** | `VARCHAR(20)` | Valores: `ARCH` (4), `BUSINESS` (8). |
| **Tipos de Recurso** | `VARCHAR(20)` | Valores atuais: `API` (3), `MENU` (4), `MENU_ITEM` (9), `DATA` (4), `DOCUMENT` (8). |

---

## 4. Diretrizes para Novos Módulos e Tabelas

Ao criar novas tabelas e entidades no OpenClinic, os desenvolvedores devem seguir estritamente as regras abaixo:

1. **PKs e FKs**:
   - Declarar sempre como `VARCHAR(36) PRIMARY KEY` no DDL.
   - No Drizzle: `varchar('id', { length: 36 }).primaryKey()`.
   - Gerar o ID no repositório/entidade via `randomUUID()` caso não fornecido.
2. **Campos de Enum/Vocabulário**:
   - Declarar como `VARCHAR(20)` no DDL.
   - Definir a lista de valores válidos no enum TypeScript em `@openclinic/core/src/domain/enums.ts`.
   - Validar entradas no backend via schemas Zod antes de atingir os repositórios.
3. **Data e Hora**:
   - Utilizar `TIMESTAMPTZ` (PostgreSQL) com `DEFAULT NOW()`.
   - No Drizzle: `timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`.

---

## 5. Documentos Relacionados

- [Referência do Schema de Banco de Dados](./database-schema.md)
- [Diretrizes Arquiteturais e Decisões Técnicas](./architectural-decisions-and-guidelines.md)
- [Comparativo ORM Drizzle vs Prisma](./database-orm-selection-drizzle-vs-prisma.md)
