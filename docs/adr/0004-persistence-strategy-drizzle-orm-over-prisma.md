# 0004. Persistence Layer Strategy (Drizzle ORM over Prisma & Stored Procedures)

- **Status:** Accepted
- **Date:** 2026-08-28
- **Deciders:** OpenClinic Core Architecture Team
- **Technical Domain:** Persistence Layer, Database & ORM

## Context and Problem Statement

OpenClinic requires a performant, type-safe, and decoupled persistence layer that supports:

- Rapid evolution of clinical and administrative database schemas.
- Clean Architecture (Repository Pattern & Unit of Work) with minimal ORM vendor lock-in.
- Full TypeScript type inference without heavy compilation steps or heavy binary dependencies.

## Decision Drivers

- Native TypeScript-first schema definition and inference.
- Predictable, zero-magic SQL generation.
- Fast startup times in containerized environments (Docker) without Rust engine binaries.
- Compatibility with connection poolers (`postgres-js`, `node-postgres`).

## Considered Options

1. **Raw Stored Procedures (PL/pgSQL):** Heavy logic inside PostgreSQL functions.
2. **Prisma ORM:** High-level abstraction with custom `.prisma` DSL and Rust query engine binary.
3. **TypeORM:** Traditional ActiveRecord/DataMapper with decorators.
4. **Drizzle ORM:** Lightweight, SQL-like TypeScript query builder and migration toolkit.

## Decision Outcome

Chosen option: **Option 4 (Drizzle ORM)**.

### Rationale

- **SQL-like Syntax:** Drizzle reflects native PostgreSQL semantics directly in TypeScript (`select()`, `from()`, `where()`, `leftJoin()`).
- **Zero Binary Dependency:** Unlike Prisma, Drizzle contains no heavy native C++/Rust binary engines, dramatically reducing Docker image sizes and cold-start latency.
- **Type Safety Without Generation Overheads:** Types are inferred directly from TypeScript schemas (`typeof schema.$inferSelect`), eliminating the need for separate codegen steps during rapid development loops.
- **Repository Decoupling:** Repositories encapsulate Drizzle queries behind domain interfaces (`IAMUnitOfWork`, `IUserRepository`), ensuring domain services remain decoupled from database implementation details.

### Positive Consequences

- High query execution performance comparable to raw SQL drivers (`pg`, `postgres-js`).
- Pure TypeScript schema declarations (`drizzle-schema.ts`).
- Clean schema migrations managed by `drizzle-kit` and custom database CLI commands.

### Negative Consequences / Trade-offs

- Requires developers to write explicit SQL joins and query composition, unlike Prisma's automatic relation includes.
