# 🛡 Governança de Acesso: Papéis de Usuário (`UserRole`), Hierarquia RBAC e Integração com ACL Granular

> **Revisão de 2026-09-09:** para o comportamento-alvo local, consulte a [especificação da fase 0](./auth-spec.md). O bypass irrestrito de OWNER descrito abaixo é o modelo anterior; D02 propõe governança institucional com concessão explícita para BUSINESS. O conteúdo histórico não comprova autorização granular aplicada às rotas. A premissa é local e revisável, sem aprovação comunitária presumida.

**OpenClinic Framework & Plataforma Clínica**  
*Documento Canônico de Arquitetura de Segurança, Autoridade e Controle de Acesso*

---

## 1. Sumário Executivo

O **OpenClinic** adota um modelo híbrido de controle de acesso de alta maturidade que conjuga:

1. **RBAC Estrutural (Role-Based Access Control):** Papéis hierárquicos globais (`OWNER`, `ADMIN`, `USER`) armazenados na coluna `iam_users.role`, avaliados em middlewares de rotas (`requireRole`) e na filtragem estrutural de menus do sistema (`sys_application_resources.min_role`).
2. **ACL Granular (Access Control List):** Matriz de capacidades finas por recurso e ação (`READ`, `WRITE`, `DELETE`, `EXECUTE`, `MANAGE`, `ALL`) com precedência explícita de `DENY`, herdadas por grupos clínicos (`iam_groups`) e customizáveis por usuário (`iam_permissions`).

Este documento estabelece a especificação oficial de cada papel, suas responsabilidades, limites invioláveis de autoridade, invariantes de segurança (P0) e como o sistema se comporta tanto na API REST quanto na interface web.

---

## 2. Definição Formal dos Papéis (`@openclinic/core`)

Os papéis são tipos de primeira classe no domínio compartilhado, definidos em [`packages/core/src/domain/enums.ts`](../packages/core/src/domain/enums.ts):

```typescript
export const UserRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
```

### 2.1. Hierarquia Numérica de Governança

No backend ([`require-permission.ts`](../packages/backend-api/src/arch/presentation/middlewares/require-permission.ts)) e na camada de repositórios ([`resource.repository.ts`](../packages/backend-api/src/arch/infrastructure/database/resource.repository.ts)), a autoridade é quantificada na seguinte hierarquia estrita:

```text
┌───────────────────────────────────────────────────────────┐
│ Nível 3: OWNER  (Proprietário do Tenant / Governança)     │  ▲ Maior Autoridade
├───────────────────────────────────────────────────────────┤  │ (Superusuário com bypass)
│ Nível 2: ADMIN  (Administrador de Unidade / Operacional)  │  │
├───────────────────────────────────────────────────────────┤  │
│ Nível 1: USER   (Operacional Clínico / Administrativo)    │  ▼ Menor Autoridade
└───────────────────────────────────────────────────────────┘
```

```typescript
const ROLE_HIERARCHY: Record<string, number> = {
  USER: 1,
  ADMIN: 2,
  OWNER: 3,
};
```

---

## 3. Matriz de Atribuições e Responsabilidades por Papel

| Dimensão / Capacidade | `USER` (Nível 1) | `ADMIN` (Nível 2) | `OWNER` (Nível 3) |
| :--- | :---: | :---: | :---: |
| **Perfil Típico** | Médicos, enfermeiros, recepcionistas, faturistas | Administradores de clínica, TI local, gerentes operacionais | Proprietários da clínica, conselho diretor, governança |
| **Acesso a Módulos de Negócio (PEP, Agenda, Finanças)** | Via Matriz ACL (Grupos/Indivíduo) | Via Matriz ACL (Grupos/Indivíduo) | Acesso Total Irrestrito (Bypass Nativo) |
| **Gerenciamento de Usuários (`iam_users`)** | ❌ Apenas seu próprio perfil | ✅ Criar, editar, desativar, resetar senha e desbloquear `USER` e outros `ADMIN` | ✅ Gestão total de qualquer usuário (incluindo outros `OWNER`) |
| **Gerenciamento de Grupos (`iam_groups`)** | ❌ Não permitido | ✅ Criar, editar, desativar grupos e gerenciar membros | ✅ Gestão total de grupos |
| **Gerenciamento de Matriz de ACL (`iam_permissions`)** | ❌ Não permitido | ✅ Sincronizar permissões de grupos e usuários | ✅ Gestão total de permissões |
| **Catálogo de Recursos (`sys_application_resources`)** | ❌ Apenas visualização de recursos autorizados | ✅ Consulta da árvore e criação de novos recursos | ✅ Controle pleno de recursos e governança |
| **Recursos Restritos a `min_role: OWNER`** | ❌ Bloqueado | ❌ Bloqueado | ✅ Liberado |
| **Gestão Multi-Tenant (`sys_tenants`)** | ❌ Não permitido | ❌ Apenas tenant atual | ✅ Gestão global de tenants e parâmetros mestre |

---

## 4. Invariantes de Segurança P0 e Regras de Negócio do ADMIN

Para evitar abusos de privilégio e garantir a integridade dos dados da instituição, a aplicação impõe barreiras de segurança invioláveis implementadas no nível dos casos de uso ([`packages/backend-api/src/arch/application/use-cases/`](../packages/backend-api/src/arch/application/use-cases/)):

### 4.1. Imutabilidade do OWNER (`ErrorCode.OWNER_IMMUTABLE`)

Nenhum usuário com papel `ADMIN` pode alterar direta ou indiretamente uma conta cujo papel seja `OWNER`:

- **Edição de Cadastro:** Se um `ADMIN` tentar alterar nome, e-mail ou dados de um `OWNER`, a requisição é abortada com `AccessDeniedError(ErrorCode.OWNER_IMMUTABLE)`.
- **Desativação de Conta:** Um `ADMIN` não pode desativar (`toggle-status`) um `OWNER`.
- **Desbloqueio de Conta:** Um `ADMIN` não pode desbloquear (`unlock`) um `OWNER`.
- **Redefinição de Senha:** Um `ADMIN` não pode forçar redefinição de senha (`reset-password`) de um `OWNER`.
- **Exclusão:** Um `ADMIN` não pode excluir (`delete`) a conta de um `OWNER`.

### 4.2. Prevenção de Escalonamento de Privilégios (`ErrorCode.CANNOT_PROMOTE_TO_OWNER`)

- Um `ADMIN` é estritamente proibido de cadastrar um novo usuário já com o papel `OWNER`.
- Um `ADMIN` não pode promover nenhum usuário existente ao papel `OWNER`.
- Somente um `OWNER` autenticado possui autoridade para conceder o papel de `OWNER` a outra conta.

### 4.3. Auto-Proteção de Contas (`USER_CANNOT_DELETE_SELF` e `USER_CANNOT_DEACTIVATE_SELF`)

- Nenhum usuário (seja `ADMIN` ou `OWNER`) tem permissão de excluir a si próprio ou desativar a si próprio no sistema, prevenindo bloqueio involuntário de administração da clínica.

---

## 5. Modelo de Dados e Persistência (PostgreSQL + Drizzle ORM)

Conforme a decisão arquitetural documentada em [`architectural-decisions-and-guidelines.md`](./architectural-decisions-and-guidelines.md#L165), **a tabela legada `iam_roles` foi deliberadamente eliminada**. 

O papel estrutural do usuário reside diretamente na entidade do usuário:

```sql
-- infra/database/migrations/0000_baseline.sql
CREATE TABLE IF NOT EXISTS iam_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(500),
    full_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'USER', -- 'OWNER' | 'ADMIN' | 'USER'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    access_count INT NOT NULL DEFAULT 0,
    last_access TIMESTAMPTZ,
    require_password_change BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_id VARCHAR(36) REFERENCES sys_tenants(id) ON DELETE SET NULL,
    is_tenant_owner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_iam_users_role ON iam_users(role);
```

### Por que esta decisão foi tomada

1. **Evitar Redundância Dual:** Manter uma tabela `iam_roles` com 3 registros estáticos criava joins desnecessários e duplicava o conceito que já pertencia a `iam_groups` (grupos departamentais).
2. **Clareza de Responsabilidades:**
   - **`iam_users.role` (RBAC):** Define o nível institucional de governança (`OWNER`, `ADMIN`, `USER`).
   - **`iam_groups`:** Modela equipes funcionais da clínica (ex: *"Médicos Cardiologistas"*, *"Recepção & Triagem"*, *"Faturamento Convênios"*).
   - **`iam_permissions`:** Matriz granular que mapeia quais recursos e ações os grupos ou usuários possuem.

---

## 6. Integração Híbrida: Resolução no `IAMPermissionService`

O serviço [`IAMPermissionService`](../packages/backend-api/src/arch/application/services/iam-permission.service.ts) é responsável por consolidar capacidades (`capabilities`) e menus:

```typescript
// packages/backend-api/src/arch/application/services/iam-permission.service.ts

private _consolidateCapabilities(
  userRole: UserRole,
  allResources: ApplicationResourceRecord[],
  allowMap: Map<string, Set<ResourceAction>>,
  denyMap: Map<string, Set<ResourceAction>>
): IAMCapabilityDTO[] {
  const capabilities: IAMCapabilityDTO[] = [];

  for (const res of allResources) {
    if (!res.is_active) continue;

    // 1. Bloqueio de Recursos Restritos a OWNER
    if (res.min_role === UserRoleEnum.OWNER && userRole !== UserRoleEnum.OWNER) {
      continue;
    }

    const actions = new Set<ResourceAction>();

    // 2. OWNER tem acesso total e irrestrito (Superadmin)
    if (userRole === UserRoleEnum.OWNER) {
      actions.add(ActionEnum.READ);
      actions.add(ActionEnum.WRITE);
      actions.add(ActionEnum.DELETE);
      actions.add(ActionEnum.EXECUTE);
      actions.add(ActionEnum.MANAGE);
      actions.add(ActionEnum.ALL);
    }

    // 3. ACL Granular: Para ADMIN e USER, permissões derivam estritamente de seus Grupos e Atribuições Diretas
    if (allowMap.has(res.id)) {
      for (const a of allowMap.get(res.id)!) {
        actions.add(a);
      }
    }

    // 4. Precedência de Bloqueio (DENY explícito)
    if (userRole !== UserRoleEnum.OWNER && denyMap.has(res.id)) {
      for (const a of denyMap.get(res.id)!) {
        actions.delete(a);
      }
      if (denyMap.get(res.id)!.has(ActionEnum.READ)) {
        actions.clear();
      }
    }

    if (actions.size > 0) {
      capabilities.push({
        key: res.item_code,
        label: res.label_key || res.item_code,
        icon: res.icon,
        route: res.route,
        resource_type: res.resource_type,
        context: res.context,
        actions: Array.from(actions),
      });
    }
  }

  return capabilities;
}
```

---

## 7. Experiência e Tratamento no Frontend Webapp (`frontend-webapp`)

### 7.1. Formulários de Usuário com Restrição de Escopo

No componente [`UsersManagementView.tsx`](../packages/frontend-webapp/src/arch/pages/UsersManagementView.tsx#L664-L667):

- Um operador logado como `ADMIN` só enxerga as opções `USER` e `ADMIN` para atribuição.
- A opção `OWNER` é renderizada **exclusivamente se o usuário autenticado for `OWNER`** (`currentUser?.role === UserRole.OWNER`).

```tsx
<select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as any)}>
  <option value={UserRole.USER}>USER (Operacional / Clínico)</option>
  <option value={UserRole.ADMIN}>ADMIN (Administrador da Unidade)</option>
  {currentUser?.role === UserRole.OWNER && (
    <option value={UserRole.OWNER}>OWNER (Proprietário / Governança)</option>
  )}
</select>
```

### 7.2. Identidade Visual e Badges por Papel

A interface do usuário aplica identificação visual imediata para evitar confusão operacional:

- **`OWNER`:** Badge Dourado/Âmbar (`background: #fef3c7`, `color: #b45309`), representando a liderança e governança da instituição.
- **`ADMIN`:** Badge Índigo/Azul Suave (`background: #e0e7ff`, `color: #4338ca`), destacando a gestão operacional.
- **`USER`:** Badge Cinza Neutro (`background: #f1f5f9`, `color: #475569`), indicando operador clínico padrão.

No topo da aplicação ([`Header.tsx`](../packages/frontend-webapp/src/arch/layout/Header.tsx#L43)), a role do usuário conectado é exibida com estilos correspondentes ao lado do nome do usuário.

---

## 8. Catálogo de Endpoints Protegidos por Papel

### 8.1. Endpoints que Exigem no Mínimo `ADMIN` (`requireRole(UserRole.ADMIN)`)

#### Acessíveis por `ADMIN` e `OWNER` (níveis >= 2)

| Método | Endpoint | Caso de Uso Associado |
| :--- | :--- | :--- |
| `GET` | `/api/v1/auth/admin/users` | Listagem administrativa com paginação e busca |
| `POST` | `/api/v1/auth/admin/users` | Criação de novo usuário com papel `USER` ou `ADMIN` |
| `PUT` | `/api/v1/auth/admin/users/:userId` | Atualização de cadastro de usuário |
| `PATCH` | `/api/v1/auth/admin/users/:userId/toggle-status` | Ativação ou desativação de conta |
| `POST` | `/api/v1/auth/admin/users/:userId/unlock` | Desbloqueio de conta bloqueada por tentativas |
| `POST` | `/api/v1/auth/admin/users/:userId/reset-password` | Redefinição administrativa de senha |
| `DELETE` | `/api/v1/auth/admin/users/:userId` | Exclusão física/lógica de conta |
| `GET` | `/api/v1/groups` | Listagem de grupos da instituição |
| `POST` | `/api/v1/groups` | Criação de novo grupo funcional |
| `PUT` | `/api/v1/groups/:id` | Edição de dados do grupo |
| `DELETE` | `/api/v1/groups/:id` | Exclusão de grupo |
| `POST` | `/api/v1/groups/:id/members` | Vinculação de usuário ao grupo |
| `DELETE` | `/api/v1/groups/:id/members/:userId` | Desvinculação de usuário do grupo |
| `GET` | `/api/v1/iam/resources` | Listagem de recursos cadastrados |
| `POST` | `/api/v1/iam/resources` | Cadastro de novo recurso no sistema |
| `GET` | `/api/v1/iam/acl/user/:userId` | Consulta da ACL direta do usuário |
| `GET` | `/api/v1/iam/acl/group/:groupId` | Consulta da ACL do grupo |
| `GET` | `/api/v1/iam/acl/user/:userId/inherited` | Consulta da ACL herdada de grupos |
| `POST` | `/api/v1/iam/acl/sync` | Sincronização em lote da matriz ACL |

### 8.2. Endpoints para Qualquer Usuário Autenticado (`authenticateJwt`)

#### Acessíveis por `USER`, `ADMIN` e `OWNER`

- `GET /api/v1/auth/me` (Dados do perfil)
- `POST /api/v1/auth/change-password` (Troca da própria senha)
- `POST /api/v1/auth/logout` (Revogação de sessão)
- `GET /api/v1/iam/capabilities` (Capacidades resolvidas do usuário)
- `GET /api/v1/iam/navigation` (Menus dinâmicos permitidos para o usuário)

---

## 9. Cobertura de Testes Automatizados

O isolamento e as regras de governança de papéis são testados continuamente via Vitest:

- [`packages/backend-api/tests/unit/user-management.use-cases.spec.ts`](../packages/backend-api/tests/unit/user-management.use-cases.spec.ts):
  - Garante que `ADMIN` pode desbloquear, desativar, resetar senha, criar, editar e excluir contas `USER`.
  - Garante rejeição com `AccessDeniedError(OWNER_IMMUTABLE)` quando `ADMIN` tenta modificar um `OWNER`.
  - Garante rejeição com `AccessDeniedError(CANNOT_PROMOTE_TO_OWNER)` quando `ADMIN` tenta criar ou promover uma conta a `OWNER`.
- [`packages/backend-api/tests/unit/iam-permission.service.spec.ts`](../packages/backend-api/tests/unit/iam-permission.service.spec.ts):
  - Valida o bypass total para contas `OWNER`.
  - Valida a derivação estrita por ACL para contas `ADMIN` e `USER`.
  - Valida a restrição universal de recursos marcados com `min_role` (`OWNER`, `ADMIN`) via `ROLE_HIERARCHY`.
  - Valida a rejeição de atribuições diretas de recursos com `min_role` superior ao papel do usuário (`INCOMPATIBLE_RESOURCE_ROLE`).

---

## 10. Invariante de Compatibilidade Papel vs. Recurso (*Role Compatibility Invariant*)

Para garantir integridade estrita e prevenir situações em que um usuário recebe visualização de menus ou rotas que seu papel estrutural não pode executar, o sistema impõe o **Princípio da Compatibilidade Hierárquica Estrita**:

> 🛡️ **Invariante P0:** Nenhuma permissão de acesso (`ALLOW`) pode ser concedida ou consolidada para um recurso cujo papel mínimo (`min_role`) seja hierarquicamente superior ao papel estrutural (`UserRole`) do usuário.

```text
               ┌──────────────────────────────┐
               │    sys_application_resources │
               │          (min_role)          │
               └──────────────┬───────────────┘
                              │ Exige: ADMIN
                              ▼
                   ROLE_HIERARCHY Check
                  [USER: 1] < [ADMIN: 2]
                              │
               ┌──────────────┴───────────────┐
               ▼                              ▼
      [Backend syncPermissions]    [Consolidação de Capabilities]
      Bloqueia gravação direta     Filtra automaticamente recursos
       HTTP 400 (DomainError)       herdados de grupos incompatíveis
```

### 10.1. Camada de Validação no Backend

1. **Atribuição Direta (`syncPermissions`):**

   Ao salvar a matriz de permissões para um usuário específico (`user_id`), o serviço compara o nível do usuário com o `min_role` de cada recurso. Tentativas de conceder permissão `ALLOW` para um recurso superior são abortadas com o erro `ErrorCode.INCOMPATIBLE_RESOURCE_ROLE`:
   *"Não é permitido atribuir permissão para um recurso que exige um papel superior ao do usuário."*

2. **Consolidação em Tempo de Execução (`_consolidateCapabilities`):**

   Mesmo que um usuário com papel `USER` pertença a um grupo que possui recursos administrativos concedidos (ex: grupo "Administração do Sistema" ou "Gestão Operacional"), o resolvedor de capacidades avalia a hierarquia universal:

   ```typescript
   const userLevel = ROLE_HIERARCHY[userRole] ?? 1;
   const requiredLevel = ROLE_HIERARCHY[res.min_role as UserRole] ?? 1;
   if (userLevel < requiredLevel) {
     continue; // Ignora o recurso mesmo se presente na ACL do grupo
   }
   ```

   Dessa forma, o usuário nunca recebe capabilities para rotas que sua role não pode executar.

3. **Expurgo no Downgrade de Papel (`UpdateUserAdminUseCase`):**

   Quando um usuário tem seu papel rebaixado (ex.: de `ADMIN` para `USER`), o caso de uso executa automaticamente a limpeza de quaisquer permissões diretas associadas a recursos cujo `min_role` exceda o novo papel.

### 10.2. Proteção Visual e Preventiva no Frontend (`PermissionsMatrixModal`)

No modal da Matriz de Permissões:

- A interface mapeia o `min_role` de cada nó da árvore de recursos.
- Quando o alvo da permissão é um usuário (`PermissionTargetType.USER`), as linhas de recursos com `min_role` superior ao papel do usuário são bloqueadas visualmente:
  - Botões de ação desabilitados (`disabled`, cursor `not-allowed`).
  - Badge explicativa exibida ao lado do nome: 🔒 `Requer ADMIN` ou 🔒 `Requer OWNER`.
  - Tooltip de aviso: *"Papel insuficiente: este recurso exige no mínimo o perfil {min_role}. Altere o perfil do usuário na gestão de usuários para habilitar esta permissão."*
  - Ações em lote por grupo de menu (`toggleSectionAction` / `toggleSectionAll`) ignoram automaticamente itens incompatíveis.
