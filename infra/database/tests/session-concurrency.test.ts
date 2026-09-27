import { testDatabaseUrl } from '../test-connection.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { hashToken, UserRole, ErrorCode, AuthenticationError, TIME_CONSTANTS, AUTH_SECURITY_DEFAULTS } from '@openclinic/core';
import type { JwtConfig } from '@openclinic/core';
import { migrateDatabase } from '../../../packages/backend-cli/src/utils/migration-runner.js';
import { SessionRepository } from '../../../packages/backend-api/src/arch/infrastructure/database/session.repository.js';
import { UnitOfWork } from '../../../packages/backend-api/src/arch/infrastructure/database/uow.js';
import { RefreshTokenUseCase } from '../../../packages/backend-api/src/arch/application/use-cases/refresh-token.use-case.js';

const adminUrl = testDatabaseUrl();
async function isolated(run: (url: string, client: postgres.Sql) => Promise<void>) {
  const url = new URL(adminUrl);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Tests only accept a loopback database server.');
  const name = `db_test_${randomUUID().replaceAll('-', '')}`;
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  await admin`CREATE DATABASE ${admin(name)} TEMPLATE template0`;
  url.pathname = `/${name}`;
  const client = postgres(url.toString(), { max: 8, onnotice: () => {} });
  try { await run(url.toString(), client); }
  finally {
    await client.end();
    await admin`DROP DATABASE ${admin(name)} WITH (FORCE)`;
    await admin.end();
  }
}

const jwtConfig: JwtConfig = {
  secretKey: 'test-jwt-secret-key-that-is-at-least-thirty-two-chars',
  accessTokenExpireMinutes: 15,
  refreshTokenExpireDays: 7,
};

test('session rotation atomically consumes old session and activates new session in postgres', async () => {
  await isolated(async (url, sql) => {
    await migrateDatabase(url);

    const tenantId = randomUUID();
    const userId = randomUUID();
    await sql`INSERT INTO sys_tenants (id, name, slug) VALUES (${tenantId}, 'Concurrency Clinic', 'concurrency-clinic')`;
    await sql`INSERT INTO iam_users (id, username, email, display_name, full_name, hashed_password, role, is_active, tenant_id)
      VALUES (${userId}, 'concurrent.user', 'concurrent@clinic.local', 'Synthetic Display', 'Synthetic Test User', 'dummy-hash', ${UserRole.USER}, true, ${tenantId})`;

    const db = drizzle(sql);
    const repo = new SessionRepository(db);

    const oldToken = 'raw-refresh-token-1';
    const oldHash = hashToken(oldToken);
    const oldSession = await repo.create({
      user_id: userId,
      token_hash: oldHash,
      user_agent: 'TestAgent/1.0',
      ip_address: '127.0.0.1',
      expires_at: new Date(Date.now() + 7 * TIME_CONSTANTS.MS_PER_DAY),
      revoked_at: null,
    });

    const newToken = 'raw-refresh-token-2';
    const newHash = hashToken(newToken);
    const rotated = await repo.rotate(oldHash, {
      token_hash: newHash,
      expires_at: new Date(Date.now() + 7 * TIME_CONSTANTS.MS_PER_DAY),
      revoked_at: null,
    });

    assert.ok(rotated, 'Session rotation should succeed for active token');
    assert.equal(rotated.oldSession.id, oldSession.id);
    assert.ok(rotated.oldSession.revoked_at !== null, 'Old session must be revoked');
    assert.equal(rotated.newSession.user_id, userId);
    assert.equal(rotated.newSession.revoked_at, null, 'New session must be active initially');

    // Confirm database state
    const [dbOld] = await sql`SELECT revoked_at FROM iam_sessions WHERE id = ${oldSession.id}`;
    assert.ok(dbOld!.revoked_at !== null);

    const [dbNew] = await sql`SELECT revoked_at FROM iam_sessions WHERE id = ${rotated.newSession.id}`;
    assert.equal(dbNew!.revoked_at, null);
  });
});

test('reuse detection on postgres revokes all user sessions and prevents newly rotated session from surviving', async () => {
  await isolated(async (url, sql) => {
    await migrateDatabase(url);

    const tenantId = randomUUID();
    const userId = randomUUID();
    await sql`INSERT INTO sys_tenants (id, name, slug) VALUES (${tenantId}, 'Adversarial Clinic', 'adversarial-clinic')`;
    await sql`INSERT INTO iam_users (id, username, email, display_name, full_name, hashed_password, role, is_active, tenant_id)
      VALUES (${userId}, 'adversarial.user', 'adversarial@clinic.local', 'Synthetic Display', 'Synthetic Test User', 'dummy-hash', ${UserRole.USER}, true, ${tenantId})`;

    const db = drizzle(sql);
    const repo = new SessionRepository(db);

    const tokenV1 = 'compromised-token-v1';
    const hashV1 = hashToken(tokenV1);

    // Initial session S1
    await repo.create({
      user_id: userId,
      token_hash: hashV1,
      user_agent: 'LegitimateClient/1.0',
      ip_address: '10.0.0.1',
      expires_at: new Date(Date.now() + 7 * TIME_CONSTANTS.MS_PER_DAY),
      revoked_at: null,
    });

    // Request A rotates S1 -> S2
    const tokenV2 = 'rotated-token-v2';
    const hashV2 = hashToken(tokenV2);
    const rotatedA = await repo.rotate(hashV1, {
      token_hash: hashV2,
      expires_at: new Date(Date.now() + 7 * TIME_CONSTANTS.MS_PER_DAY),
      revoked_at: null,
    });
    assert.ok(rotatedA);

    // Request B arrives with old tokenV1 (Reuse Attempt)
    // 1. Attempt to rotate already revoked token fails atomically
    const rotatedB = await repo.rotate(hashV1, {
      token_hash: hashToken('attacker-token'),
      expires_at: new Date(Date.now() + 7 * TIME_CONSTANTS.MS_PER_DAY),
      revoked_at: null,
    });
    assert.equal(rotatedB, null, 'Competing rotation must return null');

    // 2. Reuse detected: invoke revokeAllByUser
    const compromised = await repo.findAnyByTokenHash(hashV1);
    assert.ok(compromised);
    await repo.revokeAllByUser(compromised.user_id);

    // 3. Verify ALL sessions for this user in PostgreSQL are now revoked
    const activeSessions = await sql`SELECT id, revoked_at FROM iam_sessions WHERE user_id = ${userId} AND revoked_at IS NULL`;
    assert.equal(activeSessions.length, 0, 'Zero active sessions must remain after reuse detection');

    // 4. Verify that session S2 created by Request A was revoked and cannot survive
    const [s2Check] = await sql`SELECT revoked_at FROM iam_sessions WHERE id = ${rotatedA.newSession.id}`;
    assert.ok(s2Check!.revoked_at !== null, 'Rotated session S2 must be revoked by reuse invalidation');
  });
});

test('RefreshTokenUseCase end-to-end atomic rotation and reuse rejection against postgres', async () => {
  await isolated(async (url, sql) => {
    await migrateDatabase(url);

    const tenantId = randomUUID();
    const userId = randomUUID();
    await sql`INSERT INTO sys_tenants (id, name, slug) VALUES (${tenantId}, 'E2E Clinic', 'e2e-clinic')`;
    await sql`INSERT INTO iam_users (id, username, email, display_name, full_name, hashed_password, role, is_active, tenant_id)
      VALUES (${userId}, 'e2e.user', 'e2e@clinic.local', 'Synthetic Display', 'Synthetic Test User', 'dummy-hash', ${UserRole.USER}, true, ${tenantId})`;

    const db = drizzle(sql);
    const uow = new UnitOfWork(db);
    const useCase = new RefreshTokenUseCase(uow, jwtConfig);

    const initialToken = 'e2e-initial-refresh-token';
    await uow.sessions.create({
      user_id: userId,
      token_hash: hashToken(initialToken),
      expires_at: new Date(Date.now() + 7 * TIME_CONSTANTS.MS_PER_DAY),
      revoked_at: null,
    });

    // Valid refresh
    const refreshed = await useCase.execute(initialToken);
    assert.ok(refreshed.access_token);
    assert.ok(refreshed.refresh_token);

    // Immediate replay of initial token triggers reuse detection
    await assert.rejects(
      useCase.execute(initialToken),
      (err: any) => err instanceof AuthenticationError && err.code === ErrorCode.TOKEN_INVALID
    );

    // Subsequent attempt with the newly issued token must also fail because reuse revoked ALL sessions
    await assert.rejects(
      useCase.execute(refreshed.refresh_token),
      (err: any) => err instanceof AuthenticationError && err.code === ErrorCode.TOKEN_INVALID
    );

    // Verify zero active sessions remain in database
    const [activeCount] = await sql`SELECT count(*)::int AS count FROM iam_sessions WHERE user_id = ${userId} AND revoked_at IS NULL`;
    assert.equal(activeCount!.count, 0);
  });
});

test('additional simultaneous rotations have exactly one winner in real postgres pool', async () => {
  await isolated(async (url, sql) => {
    await migrateDatabase(url);

    const tenantId = randomUUID();
    const userId = randomUUID();
    await sql`INSERT INTO sys_tenants (id, name, slug) VALUES (${tenantId}, 'Race Clinic', 'race-clinic')`;
    await sql`INSERT INTO iam_users (id, username, email, display_name, full_name, hashed_password, role, is_active, tenant_id)
      VALUES (${userId}, 'race.user', 'race@clinic.local', 'Synthetic Display', 'Synthetic Test User', 'dummy-hash', ${UserRole.USER}, true, ${tenantId})`;

    const repo = new SessionRepository(drizzle(sql));
    await repo.create({
      user_id: userId,
      token_hash: hashToken('parallel-token'),
      expires_at: new Date(Date.now() + 60000),
      revoked_at: null,
    });

    const rotations = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        repo.rotate(hashToken('parallel-token'), {
          token_hash: hashToken(`child-token-${i}`),
          expires_at: new Date(Date.now() + 60000),
          revoked_at: null,
        })
      )
    );

    const winners = rotations.filter((result) => result !== null);
    assert.equal(winners.length, 1, 'Exactly one concurrent rotation must succeed');
  });
});

test('additional use-case interleaving leaves zero active sessions after reuse detection', async () => {
  await isolated(async (url, sql) => {
    await migrateDatabase(url);

    const tenantId = randomUUID();
    const userId = randomUUID();
    await sql`INSERT INTO sys_tenants (id, name, slug) VALUES (${tenantId}, 'Interleaving Clinic', 'interleaving-clinic')`;
    await sql`INSERT INTO iam_users (id, username, email, display_name, full_name, hashed_password, role, is_active, tenant_id)
      VALUES (${userId}, 'interleaving.user', 'interleaving@clinic.local', 'Synthetic Display', 'Synthetic Test User', 'dummy-hash', ${UserRole.USER}, true, ${tenantId})`;

    const uow = new UnitOfWork(drizzle(sql));
    await uow.sessions.create({
      user_id: userId,
      token_hash: hashToken('interleaving-token'),
      expires_at: new Date(Date.now() + 60000),
      revoked_at: null,
    });

    let signal!: () => void;
    let release!: () => void;
    const reached = new Promise<void>((resolve) => {
      signal = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const originalGetById = uow.users.getById.bind(uow.users);
    uow.users.getById = async (id: string) => {
      signal();
      await gate;
      return originalGetById(id);
    };

    const useCase = new RefreshTokenUseCase(uow, jwtConfig);
    const firstCallPromise = useCase.execute('interleaving-token').then(() => true, () => false);

    await reached;
    await assert.rejects(useCase.execute('interleaving-token'));
    release();

    assert.equal(await firstCallPromise, false);
    const [row] = await sql`SELECT count(*)::int AS count FROM iam_sessions WHERE user_id = ${userId} AND revoked_at IS NULL`;
    assert.equal(row!.count, 0, 'No active session must remain after interleaving reuse');
  });
});
