import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import postgres from 'postgres';
import { hashPassword } from '@openclinic/core';
import { testDatabaseUrl } from '../database/test-connection.mjs';
import { migrateDatabase } from '../../packages/backend-cli/src/utils/migration-runner.js';
import type { FastifyInstance } from 'fastify';

// Only infrastructure and identities are seeded by SQL. Business actions use HTTP.
// No fake UOW, repository, auth, token verification or permission service.
export async function startApiHarness() {
  const ownerUrl = testDatabaseUrl(); // Refuses non-loopback/application databases.
  const suffix = randomUUID().replaceAll('-', '');
  const dbName = `api_test_${suffix}`;
  const role = `api_role_${suffix}`;
  const password = randomUUID();
  const owner = postgres(ownerUrl, { max: 1, onnotice: () => {} });
  const databaseUrl = new URL(ownerUrl); databaseUrl.pathname = '/' + dbName;
  const sql = postgres(databaseUrl.toString(), { max: 4, onnotice: () => {} });
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'openclinic-api-test-'));
  let app: FastifyInstance | undefined;
  let databaseCreated = false;
  let roleCreated = false;
  const close = async () => {
    try { await app?.close(); }
    finally {
      await sql.end({ timeout: 5 });
      try {
        if (databaseCreated) await owner`DROP DATABASE ${owner(dbName)} WITH (FORCE)`;
        if (roleCreated) await owner`DROP ROLE ${owner(role)}`;
      } finally { await owner.end(); fs.rmSync(folder, { recursive: true, force: true }); }
    }
  };
  try {
    await owner`CREATE DATABASE ${owner(dbName)} TEMPLATE template0`;
    databaseCreated = true;
    await migrateDatabase(databaseUrl.toString());
    // Identifiers and password are generated UUIDs, never client input.
    await owner.unsafe(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE`);
    roleCreated = true;
    await sql`GRANT CONNECT ON DATABASE ${sql(dbName)} TO ${sql(role)}`;
    await sql`GRANT USAGE ON SCHEMA public TO ${sql(role)}`;
    await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${sql(role)}`;
    await sql`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${sql(role)}`;
    const appUrl = new URL(databaseUrl); appUrl.username = role; appUrl.password = password;
    fs.writeFileSync(path.join(folder, 'database'), appUrl.toString());
    fs.writeFileSync(path.join(folder, 'jwt'), randomUUID() + randomUUID());
    // env.ts enforces secret files. Never read developer/application credentials.
    delete process.env.DB_PASS;
    delete process.env.DATABASE_URL;
    delete process.env.JWT_KEY;
    process.env.DATABASE_URL_FILE = path.join(folder, 'database');
    process.env.JWT_KEY_FILE = path.join(folder, 'jwt');
    process.env.SECRETS_PROVIDER = 'file';
    process.env.NODE_ENV = 'production';
    const previousCwd = process.cwd();
    try {
      process.chdir(folder);
      const { buildApp } = await import('../../packages/backend-api/src/app.js');
      app = await buildApp({ dbUrl: appUrl.toString(), enableSwaggerUi: false });
    } finally { process.chdir(previousCwd); }
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const userPassword = 'Functional-Tests-Only-927!';
    const hash = await hashPassword(userPassword);
    async function request(method: string, route: string, token?: string, body?: unknown) {
      const response = await fetch(address + route, {
        method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000),
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null, text, headers: response.headers };
    }
    async function expectHttp(status: number, method: string, route: string, token?: string, body?: unknown) {
      const response = await request(method, route, token, body);
      assert.equal(response.status, status, `${method} ${route}: ${response.text}`);
      return response.body;
    }
    async function identity(tenantId?: string, userRole = 'OWNER') {
      const tenant = tenantId ?? randomUUID();
      if (!tenantId) await sql`INSERT INTO sys_tenants (id, name) VALUES (${tenant}, 'Functional fixture')`;
      const userId = randomUUID();
      const username = 'test-' + userId;
      await sql`INSERT INTO iam_users (id, tenant_id, username, email, full_name, display_name, role, hashed_password)
        VALUES (${userId}, ${tenant}, ${username}, ${username + '@example.test'}, 'Test User', 'Test User', ${userRole}, ${hash})`;
      const login = await expectHttp(200, 'POST', '/api/v1/auth/login', undefined, { identifier: username, password: userPassword });
      assert.equal(typeof login.access_token, 'string');
      const [session] = await sql`SELECT id FROM iam_sessions WHERE user_id = ${userId} AND revoked_at IS NULL`;
      assert.ok(session, 'Login must persist an active session');
      return { tenant, userId, token: login.access_token as string, sessionId: session.id as string };
    }
    async function scenario() {
      const user = await identity();
      const org = randomUUID();
      await sql`INSERT INTO app_organizations (id, tenant_id, legal_name, trade_name) VALUES (${org}, ${user.tenant}, 'Fixture organization', 'Fixture organization')`;
      const create = (resource: string, body: unknown) => expectHttp(201, 'POST', '/api/v1/business/' + resource, user.token, body);
      const unit = await create('units', { organization_id: org, name: 'Unit A' });
      const unit2 = await create('units', { organization_id: org, name: 'Unit B' });
      const patient = await create('patients', { full_name: 'Synthetic Patient' });
      const practitioner = await create('practitioners', { full_name: 'Synthetic Professional', practitioner_type: 'PHYSICIAN' });
      const practitioner2 = await create('practitioners', { full_name: 'Second Professional', practitioner_type: 'PHYSICIAN' });
      const room = await create('rooms', { name: 'Room A', unit_id: unit.id, is_schedulable: true });
      const room2 = await create('rooms', { name: 'Room B', unit_id: unit2.id, is_schedulable: true });
      const procedure = await create('procedures', { name: 'Consultation', estimated_duration_minutes: 30, requires_room: true });
      const input = { patient_id: patient.id, practitioner_id: practitioner.id, procedure_id: procedure.id, unit_id: unit.id, room_id: room.id,
        appointment_date: '2026-10-05T09:00:00Z', payer_type: 'PARTICULAR', source_channel: 'RECEPTION' };
      async function windows(overrides: Record<string, unknown> = {}) {
        for (const resource of [{ practitioner_id: practitioner.id }, { room_id: room.id }]) {
          await create('availabilities', { ...resource, unit_id: unit.id, day_of_week: 1, start_time: '09:00', end_time: '12:00', slot_duration_minutes: 30, timezone: 'UTC', valid_from: '2026-10-01', valid_until: '2026-11-01', ...overrides });
        }
      }
      return { ...user, create, windows, input, unit, unit2, patient, practitioner, practitioner2, room, room2, procedure };
    }
    return { sql, request, expectHttp, identity, scenario, close };
  } catch (error) { await close(); throw error; }
}
export type ApiHarness = Awaited<ReturnType<typeof startApiHarness>>;
