# Arquitetura de Backend: IAM, RBAC e Matriz de Controle de Acesso Granular (ACL)

> **Revisão de 2026-09-09:** a [especificação da fase 0](./auth-spec.md) orienta a evolução local. Bypass global de OWNER, semântica de MANAGE/DENY, isolamento nativo e atomicidade descritos abaixo precisam ser lidos como modelo anterior ou intenção, não como controles comprovados. As fases 1–3 entregam e validam essas garantias; D01–D03 são premissas revisáveis.

**OpenClinic Framework & Plataforma Clínica**  
*Versão / Proposta Técnica — Foco em Engenharia de Backend*

---

## 1. Sumário Executivo & Objetivos da Arquitetura

O **OpenClinic** implementa um motor híbrido de segurança corporativa que combina:

1. **RBAC (Role-Based Access Control)**: Níveis de autoridade e escopo global de governança (`OWNER`, `ADMIN`, `USER`).
2. **ACL (Access Control List) Granular**: Controle fino por recurso (`resource_key`), ação (`READ`, `WRITE`, `DELETE`, `EXECUTE`) e efeito (`ALLOW` / `DENY`).
3. **Herança Corporativa por Grupos Clínicos**: Permissões concedidas a um grupo são herdadas automaticamente por todos os seus membros.
4. **Personalização e Sobrescrita Individual**: Usuários herdam a base do grupo, mas podem receber **acessos adicionais** (`ALLOW`) ou **bloqueios pontuais explícitos** (`DENY`) sem alterar a regra mestra do grupo.

```text
+-----------------------------------------------------------------------------------+
|                            NÍVEL 1: GOVERNANÇA (RBAC)                            |
|             OWNER (Acesso Irrestrito) | ADMIN (Gestão) | USER (Operacional)       |
+-----------------------------------------------------------------------------------+
                                       │
                                       ▼
+-----------------------------------------------------------------------------------+
|                        NÍVEL 2: HERANÇA CORPORATIVA (GRUPOS)                      |
|       Grupos: "Corpo Clínico", "Recepção & Triagem", "Faturamento", etc.          |
|       Define o perfil de permissões padrão da função / departamento               |
+-----------------------------------------------------------------------------------+
                                       │
                                       ▼
+-----------------------------------------------------------------------------------+
|                        NÍVEL 3: MOTOR DE RESOLUÇÃO (BACKEND)                      |
|           Permissões do Grupo (ALLOW)  +  Permissões Diretas do Usuário (ALLOW)    |
|                                       -                                           |
|                     Bloqueios Explícitos do Usuário (DENY)                        |
|                                       =                                           |
|                     CAPACIDADES EFETIVAS (IAM Capabilities)                       |
+-----------------------------------------------------------------------------------+
```

---

> Para a especificação exaustiva dos papéis, limites de autoridade e invariantes de segurança, consulte o documento canônico:  
> 📘 **[`docs/user-roles-and-access-control.md`](user-roles-and-access-control.md)**.

## 2. Modelo Relacional de Dados (PostgreSQL + Drizzle ORM)

O banco de dados relacional é estruturado em tabelas desacopladas que garantem integridade referencial, performance com índices dedicados e isolamento multi-tenant. A coluna de papel institucional reside diretamente em `iam_users.role`, eliminando tabelas intermediárias desnecessárias.

```text
  [iam_users] (role: OWNER|ADMIN|USER) 1 ──── N [iam_users_groups] N ──── 1 [iam_groups]
                             │                                                 │
                             │ 1                                               │ 1
                             │                                                 │
                             ▼ N                                               ▼ N
                      [iam_permissions] N ──── 1 [sys_application_resources]
                      (user_id / group_id, resource_id, action, effect)
```

### 2.1. Tabelas Principais

1. **`iam_users`**:
   - `id` (UUID PK), `username`, `email`, `hashed_password` (Argon2id), `full_name`, `display_name`, `role` (`OWNER`, `ADMIN`, `USER`), `is_active` (boolean), `access_count`, `last_access`, `tenant_id` (FK `sys_tenants`).

2. **`iam_groups`**:
   - `id` (UUID PK), `name` (string unique), `description` (text), `is_active` (boolean).

3. **`iam_users_groups`** *(Tabela Associativa N:N)*:
   - `id` (UUID PK), `user_id` (FK `iam_users`), `group_id` (FK `iam_groups`), `created_at`.
   - Permite que um mesmo usuário pertença a múltiplos grupos simultaneamente (ex: *Corpo Clínico* + *Plantão Cardiológico*).

4. **`sys_application_resources`** *(Árvore de Recursos)*:
   - `id` (UUID PK), `item_code` (ex: `op_schedule`, `op_pep`, `menu_sys_users`), `resource_type` (`MODULE`, `MENU`, `MENU_ITEM`, `API_ACTION`), `context` (`BUSINESS` vs `ARCH`), `parent_id` (Self FK), `min_role` (`USER`, `ADMIN`, `OWNER`).

5. **`iam_permissions`** *(Matriz de ACL Granular)*:
   - `id` (UUID PK).
   - `user_id` (UUID nullable, FK `iam_users` com `ON DELETE CASCADE`).
   - `group_id` (UUID nullable, FK `iam_groups` com `ON DELETE CASCADE`).
   - `resource_id` (UUID FK `sys_application_resources`).
   - `action` (`READ`, `WRITE`, `DELETE`, `EXECUTE`, `MANAGE`).
   - `effect` (`ALLOW`, `DENY`).
   - Índices em `user_id`, `group_id` e `resource_id`.

---

## 3. Motor de Resolução de Permissões (`IAMPermissionService`)

O serviço de aplicação [`IAMPermissionService`](../packages/backend-api/src/arch/application/services/iam-permission.service.ts) é o núcleo inteligente de segurança. Ele calcula em tempo de execução quais módulos e ações o usuário pode acessar.

### 3.1. Algoritmo de Resolução em 4 Etapas

```typescript
// packages/backend-api/src/arch/application/services/iam-permission.service.ts

private async _getAclMap(
  userId: string,
  groupIds: string[]
): Promise<{ allowMap: Map<string, Set<ResourceAction>>; denyMap: Map<string, Set<ResourceAction>> }> {
  // 1. Busca todas as tuplas ativas vinculadas ao usuário OU aos seus grupos
  const aclTuples: PermissionAclTuple[] = await this.uow.permissions.getAclMap(userId, groupIds);
  const allowMap = new Map<string, Set<ResourceAction>>();
  const denyMap = new Map<string, Set<ResourceAction>>();

  for (const item of aclTuples) {
    const resId = item.resource_id;
    const action = item.action;
    const effect = item.effect || PermissionEffect.ALLOW;
    const permUserId = item.user_id;

    // 2. Negação explícita do usuário é catalogada no denyMap
    if (permUserId === userId && effect === PermissionEffect.DENY) {
      if (!denyMap.has(resId)) denyMap.set(resId, new Set());
      denyMap.get(resId)!.add(action);
    } else if (effect !== PermissionEffect.DENY) {
      // 3. Concessões do usuário ou dos seus grupos vão para o allowMap
      if (!allowMap.has(resId)) allowMap.set(resId, new Set());
      allowMap.get(resId)!.add(action);
    }
  }

  // 4. PRECEDÊNCIA: Subtrai negações individuais das permissões concedidas
  const effectiveAllowMap = new Map<string, Set<ResourceAction>>();
  for (const [resId, actions] of allowMap.entries()) {
    const denied = denyMap.get(resId) || new Set();
    const remaining = new Set<ResourceAction>();
    for (const a of actions) {
      if (!denied.has(a)) {
        remaining.add(a);
      }
    }
    if (remaining.size > 0) {
      effectiveAllowMap.set(resId, remaining);
    }
  }

  return { allowMap: effectiveAllowMap, denyMap };
}
```

### 3.2. Propagação Ascendente na Árvore de Menus (`_propagateAclUpward`)

Se um usuário recebe permissão em um subitem (ex: `op_consultations`), o motor automaticamente propaga a ação de leitura estrutural (`READ`) para o menu pai (`clinical` / `CLÍNICO`), permitindo que a árvore de navegação se renderize corretamente sem expor os nós irmãos não autorizados.

---

## 4. Matriz de Endpoints da API REST (Fastify)

A camada de apresentação expõe uma API RESTful padronizada com segurança JWT e checagem de RBAC no middleware de pré-execução (`preHandler`).

| Método | Endpoint | Proteção | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/iam/acl/user/:userId` | `ADMIN` | Retorna a ACL direta (customizações) de um usuário. |
| `GET` | `/api/v1/iam/acl/user/:userId/inherited` | `ADMIN` | Retorna a ACL consolidada herdada dos grupos do usuário. |
| `GET` | `/api/v1/iam/acl/group/:groupId` | `ADMIN` | Retorna a ACL base de um grupo de usuários. |
| `POST` | `/api/v1/iam/acl/sync` | `ADMIN` | Sincroniza em lote a matriz de permissões para um usuário ou grupo. |
| `GET` | `/api/v1/iam/capabilities` | `AUTHENTICATED` | Retorna as capacidades efetivas do usuário autenticado. |
| `GET` | `/api/v1/iam/navigation?context=BUSINESS` | `AUTHENTICATED` | Retorna o menu dinâmico da aplicação filtrado por permissões. |
| `GET` | `/api/v1/groups` | `ADMIN` | Listagem alfabética de grupos com contagem de membros. |
| `POST` | `/api/v1/groups/:id/members` | `ADMIN` | Vincula um usuário a um grupo. |
| `DELETE` | `/api/v1/groups/:id/members/:userId` | `ADMIN` | Desvincula um usuário de um grupo. |

### 4.1. Payload de Sincronização em Lote (`POST /api/v1/iam/acl/sync`)

```json
{
  "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "permissions": [
    {
      "resource_key": "op_schedule",
      "actions": ["READ", "WRITE"],
      "effect": "ALLOW"
    },
    {
      "resource_key": "op_cashflow",
      "actions": ["READ"],
      "effect": "DENY"
    }
  ]
}
```

---

## 5. Casos de Uso e Comportamento na Operação Clínica

### Cenário 1: Grupo Base "Corpo Clínico"

- O administrador cria o grupo **Corpo Clínico** e concede:
  - `op_schedule` (Agenda): `READ`, `WRITE`
  - `op_patients` (Pacientes): `READ`, `WRITE`
  - `op_pep` (Prontuário): `READ`, `WRITE`
- **Resultado**: Qualquer médico adicionado a esse grupo passa a ver e operar esses 3 módulos imediatamente.

### Cenário 2: Médico Coordenador (Acréscimo Individual)

- O médico *Dr. Roberto* pertence ao grupo **Corpo Clínico**.
- Ele foi promovido a coordenador e precisa visualizar o **Faturamento (`op_billing`)**.
- O administrador abre as permissões do *Dr. Roberto* e marca `Ler` em `op_billing`.
- **Resultado**: É gravado um registro direto com `effect: ALLOW` no `user_id` do Dr. Roberto. Os demais médicos continuam sem acesso ao faturamento.

### Cenário 3: Médico Residente (Bloqueio Individual / DENY)

- A médica residente *Dra. Camila* pertence ao grupo **Corpo Clínico**.
- Por diretriz institucional, residentes não podem excluir registros no Prontuário nem emitir prescrições especiais.
- O administrador abre as permissões da *Dra. Camila* e clica no botão herdado do módulo de prescrições, marcando como **Negado (`✖ / DENY`)**.
- **Resultado**: O motor do backend aplica precedência de negação (`effective = ALLOW - DENY`), bloqueando o acesso especificamente para a Dra. Camila sem alterar o grupo.

---

## 6. Diferenciais Técnicos para Apresentação

1. **Performance em Tempo Real**: Resolução de ACL feita em memória utilizando estruturas otimizadas `Map<string, Set<ResourceAction>>` com tempo de resposta `< 5ms`.
2. **Zero Regressão de Segurança**: Módulo auditado em conformidade com as regras P0 do OpenClinic (sem bypasses, hashes criptográficos Argon2id e comparação em tempo constante).
3. **Escalabilidade Multi-Tenant**: Cada tenant possui seus grupos, recursos e permissões isolados nativamente no banco de dados.
4. **Suporte a Operações em Lote**: A interface e a API suportam concessão e bloqueio em lote com total atomicidade transacional.

---

## 7. Governança do Catálogo de Recursos: Manifesto Declarativo (Code-First SSOT)

Para garantir **zero inconsistência (zero drift)** entre Código, Rotas, Telas e Banco de Dados, o OpenClinic adota o padrão de **Manifesto Declarativo Tipado**:

```text
 ┌──────────────────────────────────────────────┐
 │     Manifesto Declarativo no Código (TS)     │  ──► SSOT: Define a CAPACIDADE do sistema.
 │     packages/core/src/iam/resources.manifest │      (Catálogo estático, tipado e versionado no Git)
 └──────────────────────┬───────────────────────┘
                        │  Sincronização Idempotente (Startup / CI-CD Seed)
                        ▼
 ┌──────────────────────────────────────────────┐
 │       Tabela sys_application_resources       │  ──► Projeção Relacional no PostgreSQL.
 │             (Entidade de Banco)              │      (Ancora integridade referencial com UUIDs)
 └──────────────────────┬───────────────────────┘
                        │  FK: resource_id
                        ▼
 ┌──────────────────────────────────────────────┐
 │            Tabela iam_permissions            │  ──► Matriz de Autorização Dinâmica do Tenant.
 │     (Atribuição de Grupos e Usuários)        │      (Quem pode ler/escrever em cada recurso)
 └──────────────────────────────────────────────┘
```

### 7.1. A Tabela `sys_application_resources` continua se justificando

#### Sim, ela é estruturalmente indispensável por 3 razões corporativas

1. **Integridade Referencial Relacional (`FOREIGN KEY`):** A tabela `iam_permissions` possui a chave estrangeira `resource_id REFERENCES sys_application_resources(id) ON DELETE CASCADE`. Sem essa tabela, o banco salvaria strings soltas, impossibilitando validações relacionais no motor do Postgres.
2. **Performance de Consulta ($O(1)$ por UUID):** O login e a emissão de tokens resolvem capacidades via `INNER JOIN` indexado por B-Tree entre `iam_permissions` e `sys_application_resources` em `< 2ms`.
3. **Multi-Tenancy Customizável:** O catálogo de recursos é universal no código, mas as permissões concedidas a cada grupo variam dinamicamente por Tenant no banco.

### 7.2. É preciso ter tela de edição para `sys_application_resources`

#### NÃO. Um formulário de CRUD livre (criação/edição manual de recursos por tela) é um anti-pattern grave de arquitetura

- **Contrato de Software vs Dados de Negócio:** Um recurso (`MENU`, `API_ACTION`, `UI_ACTION`) não é um dado operacional; é um **contrato de infraestrutura de software**. Se um usuário alterar o `item_code` de `op_schedule` para outro valor na tela, os componentes do Frontend e os decorators da API quebram. Se criar um recurso fictício, não há tela nem endpoint correspondente.
- **O que REALMENTE é editável na interface:** A matriz de permissões (`iam_permissions`) através do modal [`PermissionsMatrixModal`](../packages/frontend-webapp/src/arch/pages/PermissionsMatrixModal.tsx) (concessão e revogação de acessos por grupo/usuário).
- **Tela Recomendada (Opcional - Inspetor Read-Only):** Uma tela técnica de auditoria na aba Plataforma (*Inspetor de Recursos*), estritamente **somente leitura**, exibindo a árvore sincronizada, a versão do catálogo e o status de ativação.

### 7.3. Aderência Estrutural da Tabela ao Manifesto

A tabela `sys_application_resources` já reflete com precisão os campos do Manifesto Declarativo:

- `item_code` $\leftrightarrow$ Código único tipado (`AppResourceCode`)
- `resource_type` $\leftrightarrow$ `MODULE`, `MENU`, `MENU_ITEM`, `API_ACTION`, `UI_ACTION`
- `context` $\leftrightarrow$ Canônico estrito (`ARCH` vs `BUSINESS`)
- `min_role` $\leftrightarrow$ Papel mínimo estrutural (`USER`, `ADMIN`, `OWNER`)
- `label_key` $\leftrightarrow$ Chave centralizada de internacionalização (i18n)
- `route` $\leftrightarrow$ Caminho navegável do Frontend
- `is_active` $\leftrightarrow$ Flag de ativação (usada para soft-inactivation)

---

## 8. Ciclo de Vida, Soft Delete e Trilha de Auditoria Forense

Em ambientes de saúde e conformidade regulatória (LGPD / HIPAA / CFM), a perda ou sobrescrita silenciosa de dados de segurança é inaceitável.

### 8.1. Usuários e Grupos: Soft Delete Obrigatório (`deleted_at`)

- **Regra:** Proibido o uso de `DELETE FROM iam_users` ou `DELETE FROM iam_groups`.
- **Implementação:** Colunas `deleted_at TIMESTAMPTZ NULL` e `is_active BOOLEAN DEFAULT TRUE`.
- **Justificativa Legal (CFM/LGPD):** Prontuários, evoluções clínicas e receitas assinadas no passado por um médico demitido continuam legalmente vinculados ao `doctor_id` daquele usuário. O Soft Delete impede novos logins sem corromper a rastreabilidade histórica.

### 8.2. Permissões de Acesso: Estado Atual + Trilha Imutável

- **`iam_permissions`:** Armazena o **Estado Atual Vigente** para que a autorização em tempo de execução permaneça instantânea ($O(1)$).
- **`sys_audit_logs`:** Toda alteração de permissão (concessão, revogação ou bloqueio) gera um registro imutável com timestamp, IP, autor da mudança e diff exato do que foi adicionado ou revogado (`changes: { granted: [...], revoked: [...] }`).

### 8.3. Descontinuação de Recursos (Soft Inactivation)

- Se um recurso de menu ou ação for removido do código aberto em uma versão futura, o sincronizador marca `sys_application_resources.is_active = false`.
- Isso preserva chaves estrangeiras em registros históricos de auditoria de anos anteriores, sem exibir o recurso descontinuado para novos acessos.
