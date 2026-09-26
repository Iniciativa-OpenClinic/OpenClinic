# 0003. Core Security Invariants (Argon2id, Timing-Safe Equality, Token Rotation)

- **Status:** Accepted
- **Date:** 2026-08-28
- **Deciders:** OpenClinic Core Security & Architecture Team
- **Technical Domain:** Security, Cryptography & IAM

## Context and Problem Statement

Healthcare applications handle highly sensitive Protected Health Information (PHI) and confidential clinical credentials. Security regressions, side-channel timing attacks, and weak password hashing are catastrophic vulnerabilities. 

A clear, non-negotiable security baseline must be documented, enforced by code, and safeguarded against regression by contributors or AI assistants.

## Decision Drivers

- OWASP Top 10 and HIPAA / LGPD data protection compliance.
- Protection against timing-attack side channels.
- Protection against database credential dumping and offline dictionary attacks.
- Safe session management without storing plaintext refresh tokens.

## Considered Options

1. **Traditional BCrypt + standard string comparison (`===`) + long-lived JWTs.**
2. **PBKDF2 with standard session cookies.**
3. **Argon2id + Constant-time string comparison + Ephemeral Rotating Refresh Tokens.**

## Decision Outcome

Chosen option: **Option 3**.

### 1. Password Hashing (Argon2id)

- Passwords MUST be hashed using **Argon2id** (memory-hard, resistant to GPU/ASIC cracking).
- Plaintext string comparisons (`password == hash`) are strictly prohibited (P0 Security Invariant).

### 2. Constant-Time Equality (`crypto.timingSafeEqual`)

- All comparisons of sensitive tokens, hashes, HMAC signatures, and secrets MUST use constant-time comparison via Node.js native `crypto.timingSafeEqual` (or `secrets.compare_digest`).
- Using `==` or `===` on sensitive tokens is strictly banned to eliminate timing attack vectors.

### 3. Session & Token Lifecycle

- **Access Tokens:** Short-lived JWTs (typically 15 minutes), signed via asymmetric or robust secret keys.
- **Refresh Tokens:** High-entropy random tokens; the database stores strictly the **SHA-256 hash** of the token.
- **Atomic Rotation:** Every refresh token usage rotates the token atomically and invalidates prior sessions upon anomaly detection.

### 4. Zero Auth Bypass Policy

- Disabling guards, auth interceptors, or security headers for "testing" or "performance" is strictly forbidden.

### Positive Consequences

- Industry-leading cryptographic strength compliant with healthcare security standards.
- Immunity to timing attacks on token and hash verifications.
- Plaintext credentials and refresh tokens are never exposed in database dumps or query logs.

### Negative Consequences / Trade-offs

- Argon2id consumes more server memory and CPU per hash calculation than weaker algorithms; authentication scaling must rely on database connection pooling and asynchronous non-blocking crypto routines.
