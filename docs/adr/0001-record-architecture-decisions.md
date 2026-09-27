# 0001. Record Architecture Decisions

- **Status:** Accepted
- **Date:** 2026-08-28
- **Deciders:** OpenClinic Core Architecture Team
- **Technical Domain:** Governance & Documentation

## Context and Problem Statement

In non-trivial software projects—especially open-source initiatives with distributed contributors—significant architectural decisions are frequently made, refined, or reversed. 

Without a structured, centralized, and versioned historical log:

- New contributors and AI coding agents lack visibility into the rationale behind architectural choices.
- Past discussions are repeated redundantly.
- Architectural consistency deteriorates over time as different developers introduce conflicting patterns.

## Decision Drivers

- Need for a transparent, reproducible, and standardized decision record for the GitHub open-source community.
- Alignment with Clean Architecture and self-documenting code principles.
- Providing persistent ground truth for AI assistants and human reviewers.

## Considered Options

1. **Ad-hoc Markdown files** scattered across folders.
2. **Issue Tracker / GitHub Discussions** threads only.
3. **Architecture Decision Records (ADR)** via version-controlled Markdown documents using the MADR/Nygard format under `docs/adr/`.

## Decision Outcome

Chosen option: **Option 3 (ADR under `docs/adr/`)**.

Every major technical decision (framework selections, domain partitioning, cryptographic algorithms, schema strategies, and API contracts) will be captured as a numbered ADR.

### Positive Consequences

- Clear documentation of the "why" behind non-obvious engineering choices.
- Versioned alongside the source code in Git; PR reviews will include corresponding ADR updates when introducing structural changes.
- Immutable audit trail of project design evolution.

### Negative Consequences / Trade-offs

- Requires disciplined maintenance: developers and maintainers must author and update ADRs when making architectural changes.
