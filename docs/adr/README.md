# Architecture Decision Records (ADR)

This directory contains the formal records of architectural decisions made throughout the lifecycle of **OpenClinic**.

## What is an Architecture Decision Record (ADR)

An **ADR** is a lightweight document that captures an important architectural decision, including its context, rationale, alternatives considered, and positive/negative consequences.

We follow the [MADR](https://adr.github.io/madr/) (Markdown Architecture Decision Records) / Michael Nygard format.

---

## Index of Records

| ADR | Title | Status | Date | Decision Maker |
| :--- | :--- | :---: | :---: | :--- |
| [**0001**](0001-record-architecture-decisions.md) | Record Architecture Decisions | **Accepted** | 2026-08-28 | OpenClinic Core Team |
| [**0002**](0002-canonical-architecture-taxonomy-arch-vs-business.md) | Canonical Architecture Taxonomy (`ARCH` vs `BUSINESS`) & `ApplicationContext` | **Accepted** | 2026-09-02 | OpenClinic Core Team |
| [**0003**](0003-authentication-and-security-invariants.md) | Core Security Invariants (Argon2id, Timing-Safe Equality, Token Rotation) | **Accepted** | 2026-08-28 | OpenClinic Core Team |
| [**0004**](0004-persistence-strategy-drizzle-orm-over-prisma.md) | Persistence Layer Strategy (Drizzle ORM over Prisma & Stored Procedures) | **Accepted** | 2026-08-28 | OpenClinic Core Team |

---

## ADR Status Lifecycle

- **Proposed**: Under review by maintainers and community.
- **Accepted**: Decision made and enforced in the codebase.
- **Superseded**: Replaced by a subsequent decision record (must reference the new ADR).
- **Deprecated**: The decision is no longer relevant or active.

---

## ADR Template

When authoring a new ADR, copy the structure below:

```markdown
# [Number]. [Title]

* **Status:** [Proposed | Accepted | Superseded by ADR-XXXX | Deprecated]
* **Date:** YYYY-MM-DD
* **Deciders:** [List of decision makers / contributors]
* **Technical Domain:** [Backend | Frontend | Database | Security | Architecture]

## Context and Problem Statement
[Describe the problem, architectural need, and driving forces.]

## Decision Drivers
* [Driver 1 - e.g. Maintainability, Performance, Open Source Self-containment]
* [Driver 2 - e.g. Clean Architecture, Developer Experience]

## Considered Options
1. [Option 1]
2. [Option 2]
3. [Option 3]

## Decision Outcome
Chosen option: [Option X], because [justification].

### Positive Consequences
* [Benefit 1]
* [Benefit 2]

### Negative Consequences / Trade-offs
* [Trade-off 1]
* [Trade-off 2]

## Pros and Cons of the Options
### [Option 1]
* Good, because...
* Bad, because...

## Compliance & Enforcement
[How is this decision verified in code, tests, CI/CD, or linter rules?]
```
