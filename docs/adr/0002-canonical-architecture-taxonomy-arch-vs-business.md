# 0002. Canonical Architecture Taxonomy (`ARCH` vs `BUSINESS`) and Universal `ApplicationContext`

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** OpenClinic Core Architecture Team
- **Technical Domain:** Architecture, IAM, Domain Modeling & API Design

## Context and Problem Statement

In a comprehensive healthcare platform (Electronic Health Record & Clinic Management), the system encompasses two distinct spheres of operation:

1. **Platform & System Governance:** Authentication, identity and access control (IAM), multi-tenancy, institutional parameters, audit trails, and infrastructure operations.
2. **Clinical & Business Domain:** Patient records, medical appointments, electronic prescriptions, triage queues, electronic health records (PEP), and financial billing.

Without a formal, universal taxonomy:

- Security permissions and resource schemas risk conflating authorization roles (such as `ADMIN`) with functional domain areas.
- Presentation-layer terminology risks leaking into backend services and database schemas.
- Full-stack inconsistency arises when frontend views, backend routes, and database tables use different names or groupings for the same architectural spheres.

## Decision Drivers

- Clean Architecture and Domain-Driven Design (DDD) separation of concerns.
- Uniform classification across the entire monorepo: Database schemas (`sys_application_resources`), Core domain models, Backend REST endpoints, and Frontend WebApp modules.
- Clean distinction between authorization actors (`UserRole`) and application resource spheres (`ApplicationContext`).
- Maintainability, clarity, and readability for open-source contributors and automated coding tools.

## Considered Options

1. **Freeform / Ad-hoc String Groupings:** Grouping modules ad-hoc within each subsystem or router.
2. **Layer-Specific Classifications:** Using different context types in the frontend UI versus backend services.
3. **Single Canonical Dual Taxonomy (`ARCH` vs `BUSINESS`) with Universal `ApplicationContext`:** A unified, full-stack taxonomy enforced end-to-end from PostgreSQL database schemas to React state.

## Decision Outcome

Chosen option: **Option 3 (Canonical Dual Taxonomy & `ApplicationContext`)**.

### 1. Dual Architectural Spheres

All modules, application resources, navigation items, and permission nodes are categorized into one of two canonical spheres:

- **`ARCH` (Architecture & Platform):** Identity & Access Management (IAM), user account governance, clinical groups, multi-tenant parameters, immutable audit logs, and system configuration.
- **`BUSINESS` (Healthcare & Operations):** Clinical agendas, triage, electronic medical records (PEP), prescriptions, consultations, and revenue cycle management.

### 2. Universal Type Standard (`ApplicationContext`)

Defined in `@openclinic/core` as the single authoritative type across both backend and frontend:

```ts
export const ApplicationContext = {
  ARCH: 'ARCH',
  BUSINESS: 'BUSINESS',
} as const;
export type ApplicationContext = (typeof ApplicationContext)[keyof typeof ApplicationContext];
export type ApplicationContextType = ApplicationContext;
```

### 3. Clear Role vs. Context Boundary

- **`UserRole` (`OWNER`, `ADMIN`, `USER`):** Represents **who** the user is and their hierarchical permission ceiling.
- **`ApplicationContext` (`ARCH`, `BUSINESS`):** Represents **what** functional domain sphere a resource or feature belongs to.
- Roles and contexts are never conflated (`ADMIN` is strictly a role, never a context).

### 4. Database & API Representation

- Database table `sys_application_resources.context` stores strictly `'ARCH'` or `'BUSINESS'`.
- Backend endpoints (`GET /api/v1/iam/navigation?context=...`, `GET /api/v1/iam/resources/tree?context=...`) validate query parameters directly against `ApplicationContext`.
- OpenAPI documentation describes all payloads and queries using standardized technical English.

### Positive Consequences

- **Unambiguous Mental Model:** Every feature, route, table, and UI view clearly maps to either Platform Architecture (`ARCH`) or Business Operations (`BUSINESS`).
- **Type Safety:** TypeScript compiler enforces valid contexts across all packages with zero string assertions.
- **Full-Stack Cohesion:** The UI tab structure directly mirrors the backend authorization tree without translation layers.
- **Clean Code:** Native English in code and API contracts, with natural languages isolated in dedicated i18n catalogs.

### Negative Consequences / Trade-offs

- Every new feature or resource must be consciously assigned to either `ARCH` or `BUSINESS` during initial design.
