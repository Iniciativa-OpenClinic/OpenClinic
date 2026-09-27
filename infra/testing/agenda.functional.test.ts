import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startApiHarness, type ApiHarness } from './api-harness.js';

// Behavioral oracle: origin/main c6627a1 docs/cadastros.md and docs/modulos.md.
// URL/field names are the API's published wire contract, not copied business logic.
// No imports of services/repositories, vi.mock, app.inject or fixed success responses.
let api: ApiHarness;
const base = '/api/v1/business/appointments';
before(async () => { api = await startApiHarness(); });
after(async () => { await api?.close(); });

for (const [resource, key, field, table] of [
  ['patients', 'patient', 'full_name', 'app_patients'],
  ['practitioners', 'practitioner', 'full_name', 'app_practitioners'],
  ['units', 'unit', 'name', 'app_organization_units'],
  ['procedures', 'procedure', 'name', 'app_procedures'],
  ['rooms', 'room', 'name', 'app_rooms'],
] as const) {
  test(`[REG-CRUD] ${resource}: read, update, list, tenant isolation and logical deletion use persisted data`, async () => {
    const s = await api.scenario();
    const route = '/api/v1/business/' + resource;
    const row = s[key];
    assert.equal((await api.expectHttp(200, 'GET', route + '/' + row.id, s.token)).id, row.id);
    await api.expectHttp(200, 'PUT', route + '/' + row.id, s.token, { [field]: 'Updated synthetic record' });
    assert.equal((await api.expectHttp(200, 'GET', route + '/' + row.id, s.token))[field], 'Updated synthetic record');
    const list = await api.expectHttp(200, 'GET', route, s.token);
    assert.ok(list.items.some((item: { id: string }) => item.id === row.id));
    const foreign = await api.identity();
    await api.expectHttp(404, 'GET', route + '/' + row.id, foreign.token);
    await api.expectHttp(404, 'PUT', route + '/' + row.id, foreign.token, { [field]: 'Unauthorized update' });
    await api.expectHttp(404, 'DELETE', route + '/' + row.id, foreign.token);
    await api.expectHttp(204, 'DELETE', route + '/' + row.id, s.token);
    await api.expectHttp(404, 'GET', route + '/' + row.id, s.token);
    assert.ok(!(await api.expectHttp(200, 'GET', route, s.token)).items.some((item: { id: string }) => item.id === row.id));
    const [stored] = await api.sql`SELECT deleted_at FROM ${api.sql(table)} WHERE id = ${row.id}`;
    assert.ok(stored?.deleted_at, 'Logical deletion must preserve the physical row');
  });
}

test('[AG-VERSION] changing availability preserves the old version and changes coverage only from the new validity date', async () => {
  const s = await api.scenario();
  const old = await s.create('availabilities', { practitioner_id: s.practitioner.id, unit_id: s.unit.id, day_of_week: 1,
    start_time: '09:00', end_time: '10:00', slot_duration_minutes: 30, timezone: 'UTC', valid_from: '2026-10-01' });
  // The published availability contract creates a new version: HTTP 201, not an in-place 200 update.
  const changed = await api.expectHttp(201, 'PUT', '/api/v1/business/availabilities/' + old.id, s.token, { valid_from: '2026-10-12', start_time: '10:00', end_time: '11:00' });
  assert.notEqual(changed.id, old.id);
  const history = await api.expectHttp(200, 'GET', '/api/v1/business/availabilities/' + old.id + '/history', s.token);
  assert.equal(history.total, 2);
  const original = history.items.find((item: { id: string }) => item.id === old.id);
  assert.equal(original.start_time, '09:00'); assert.equal(original.valid_until, '2026-10-12');
  await s.create('availabilities', { room_id: s.room.id, unit_id: s.unit.id, day_of_week: 1,
    start_time: '09:00', end_time: '12:00', slot_duration_minutes: 30, timezone: 'UTC', valid_from: '2026-10-01' });
  await s.create('appointments', s.input);
  await api.expectHttp(409, 'POST', base, s.token, { ...s.input, appointment_date: '2026-10-12T09:00:00Z' });
  await s.create('appointments', { ...s.input, appointment_date: '2026-10-12T10:00:00Z' });
});

test('[AG-BLOCK-CRUD] block update changes effective occurrences and logical deletion releases the period', async () => {
  const s = await api.scenario();
  const block = await s.create('blocks', { practitioner_id: s.practitioner.id, starts_at: '2026-10-05T09:00:00Z', ends_at: '2026-10-05T10:00:00Z', timezone: 'UTC' });
  await api.expectHttp(200, 'PUT', '/api/v1/business/blocks/' + block.id, s.token, { ends_at: '2026-10-05T11:00:00Z' });
  const occurrences = await api.expectHttp(200, 'GET', '/api/v1/business/blocks/occurrences?from=2026-10-05T10:00:00Z&to=2026-10-05T10:30:00Z', s.token);
  assert.equal(occurrences.total, 1);
  assert.equal(occurrences.items[0].ends_at, '2026-10-05T11:00:00.000Z');
  await api.expectHttp(409, 'POST', base, s.token, { ...s.input, appointment_date: '2026-10-05T10:00:00Z', is_overbook: true });
  await api.expectHttp(204, 'DELETE', '/api/v1/business/blocks/' + block.id, s.token);
  await api.expectHttp(404, 'GET', '/api/v1/business/blocks/' + block.id, s.token);
  await s.create('appointments', { ...s.input, appointment_date: '2026-10-05T10:00:00Z', is_overbook: true });
  const [stored] = await api.sql`SELECT deleted_at FROM app_schedule_blocks WHERE id = ${block.id}`;
  assert.ok(stored.deleted_at);
});

test('[AG-CREATE] HTTP creation persists relationships, defaults and a retrievable reservation', async () => {
  const s = await api.scenario(); await s.windows();
  const created = await s.create('appointments', s.input);
  const fetched = await api.expectHttp(200, 'GET', base + '/' + created.id, s.token);
  assert.equal(fetched.duration_minutes, 30);
  assert.equal(fetched.status, 'SCHEDULED');
  assert.equal(fetched.tenant_id, s.tenant);
  assert.equal(fetched.patient_id, s.patient.id);
  assert.equal(fetched.procedure_id, s.procedure.id);
  assert.equal(fetched.room_id, s.room.id);
  assert.equal(fetched.is_overbook, false);
  assert.equal(fetched.payer_type, 'PARTICULAR');
  const [stored] = await api.sql`SELECT * FROM app_appointments WHERE id = ${created.id}`;
  assert.equal(stored.patient_id, fetched.patient_id);
  assert.equal(stored.appointment_date.toISOString(), fetched.appointment_date);
  assert.equal(stored.duration_minutes, fetched.duration_minutes);
});

test('[AG-DURATION] duration is inherited, adjustable and unaffected by later catalog edits', async () => {
  const s = await api.scenario(); await s.windows();
  const first = await s.create('appointments', s.input);
  await api.expectHttp(200, 'PUT', '/api/v1/business/procedures/' + s.procedure.id, s.token, { estimated_duration_minutes: 45 });
  assert.equal((await api.expectHttp(200, 'GET', base + '/' + first.id, s.token)).duration_minutes, 30);
  await api.expectHttp(200, 'PUT', base + '/' + first.id, s.token, { duration_minutes: 20 });
  assert.equal((await api.expectHttp(200, 'GET', base + '/' + first.id, s.token)).duration_minutes, 20);
  const second = await s.create('appointments', { ...s.input, appointment_date: '2026-10-05T10:00:00Z' });
  assert.equal(second.duration_minutes, 45);
});

test('[AG-ROOM] required room and room/unit compatibility are enforced without saving invalid rows', async () => {
  const s = await api.scenario(); await s.windows();
  for (const room_id of [null, s.room2.id, 'missing-room']) {
    await api.expectHttp(422, 'POST', base, s.token, { ...s.input, room_id });
  }
  assert.equal((await api.expectHttp(200, 'GET', base, s.token)).total, 0);
});

test('[AG-RESOURCES] inactive, deleted and ineligible resources cannot be booked', async () => {
  const s = await api.scenario();
  await api.expectHttp(200, 'PUT', '/api/v1/business/procedures/' + s.procedure.id, s.token, { practitioner_ids: [s.practitioner2.id] });
  await api.expectHttp(422, 'POST', base, s.token, { ...s.input, is_overbook: true });
  await api.expectHttp(200, 'PUT', '/api/v1/business/procedures/' + s.procedure.id, s.token, { practitioner_ids: [], is_active: false });
  await api.expectHttp(422, 'POST', base, s.token, { ...s.input, is_overbook: true });
  await api.expectHttp(200, 'PUT', '/api/v1/business/procedures/' + s.procedure.id, s.token, { is_active: true });
  await api.expectHttp(204, 'DELETE', '/api/v1/business/patients/' + s.patient.id, s.token);
  await api.expectHttp(422, 'POST', base, s.token, { ...s.input, is_overbook: true });
  assert.equal((await api.expectHttp(200, 'GET', base, s.token)).total, 0);
});

test('[AG-FITIN] outside availability requires an explicit fit-in, persisted as such', async () => {
  const s = await api.scenario();
  await api.expectHttp(409, 'POST', base, s.token, s.input);
  const row = await s.create('appointments', { ...s.input, is_overbook: true });
  assert.equal((await api.expectHttp(200, 'GET', base + '/' + row.id, s.token)).is_overbook, true);
});

test('[AG-AVAILABILITY-INPUT] a slot larger than its availability window is rejected', async () => {
  const s = await api.scenario();
  await api.expectHttp(422, 'POST', '/api/v1/business/availabilities', s.token, {
    practitioner_id: s.practitioner.id, unit_id: s.unit.id, day_of_week: 1,
    start_time: '09:00', end_time: '09:15', slot_duration_minutes: 30,
    timezone: 'UTC', valid_from: '2026-10-01',
  });
  assert.equal((await api.expectHttp(200, 'GET', '/api/v1/business/availabilities', s.token)).total, 0);
});

test('[AG-AVAILABILITY] windows form a union but gaps, wrong weekdays and expired validity remain unavailable', async () => {
  const s = await api.scenario();
  await s.windows({ start_time: '09:00', end_time: '09:15', slot_duration_minutes: 15 });
  await s.windows({ start_time: '09:15', end_time: '09:30', slot_duration_minutes: 15 });
  await s.create('appointments', s.input);
  for (const date of ['2026-10-05T09:30:00Z', '2026-10-06T09:00:00Z', '2026-11-02T09:00:00Z']) {
    await api.expectHttp(409, 'POST', base, s.token, { ...s.input, appointment_date: date });
  }
  const gapped = await api.scenario();
  await gapped.windows({ start_time: '09:00', end_time: '09:10', slot_duration_minutes: 10 });
  await gapped.windows({ start_time: '09:15', end_time: '10:00' });
  await api.expectHttp(409, 'POST', base, gapped.token, gapped.input);
});

test('[AG-TIMEZONE] local availability uses the correct UTC offset across daylight saving', async () => {
  const s = await api.scenario();
  await s.windows({ day_of_week: 0, start_time: '09:00', end_time: '10:00', timezone: 'America/New_York', valid_from: '2026-03-01', valid_until: '2026-04-01' });
  await s.create('appointments', { ...s.input, appointment_date: '2026-03-01T14:00:00Z' });
  await s.create('appointments', { ...s.input, appointment_date: '2026-03-08T13:00:00Z' });
  await api.expectHttp(409, 'POST', base, s.token, { ...s.input, appointment_date: '2026-03-08T14:00:00Z' });
});

test('[AG-CONFLICT] practitioner across units and room with another practitioner remain exclusive, including fit-ins', async () => {
  const s = await api.scenario(); await s.windows();
  await s.create('appointments', s.input);
  await api.expectHttp(409, 'POST', base, s.token, { ...s.input, unit_id: s.unit2.id, room_id: s.room2.id, is_overbook: true });
  await api.expectHttp(409, 'POST', base, s.token, { ...s.input, practitioner_id: s.practitioner2.id, is_overbook: true });
  const adjacent = await s.create('appointments', { ...s.input, appointment_date: '2026-10-05T09:30:00Z' });
  await api.expectHttp(409, 'PUT', base + '/' + adjacent.id, s.token, { appointment_date: s.input.appointment_date });
  assert.equal((await api.expectHttp(200, 'GET', base + '/' + adjacent.id, s.token)).appointment_date, '2026-10-05T09:30:00.000Z');
});

test('[AG-CONCURRENCY] simultaneous HTTP bookings produce one success, one conflict and exactly one stored row', async () => {
  const s = await api.scenario(); await s.windows();
  const responses = await Promise.all([api.request('POST', base, s.token, s.input), api.request('POST', base, s.token, s.input)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  const page = await api.expectHttp(200, 'GET', base, s.token);
  assert.equal(page.total, 1);
  const [count] = await api.sql`SELECT count(*)::int AS n FROM app_appointments WHERE tenant_id = ${s.tenant}`;
  assert.equal(count.n, 1);
});

test('[AG-BLOCKS] global recurring practitioner blocks and room blocks prevent fit-ins; boundaries remain free', async () => {
  const s = await api.scenario();
  await s.create('blocks', { practitioner_id: s.practitioner.id, starts_at: '2026-10-05T09:00:00Z', ends_at: '2026-10-05T10:00:00Z', timezone: 'UTC', recurrence: { frequency: 'WEEKLY', interval: 1, until: '2026-10-12T09:00:00Z' } });
  await api.expectHttp(409, 'POST', base, s.token, { ...s.input, is_overbook: true });
  await api.expectHttp(409, 'POST', base, s.token, { ...s.input, appointment_date: '2026-10-12T09:00:00Z', unit_id: s.unit2.id, room_id: s.room2.id, is_overbook: true });
  await s.create('appointments', { ...s.input, appointment_date: '2026-10-05T10:00:00Z', is_overbook: true });
  await s.create('appointments', { ...s.input, appointment_date: '2026-10-19T09:00:00Z', is_overbook: true });
  await s.create('blocks', { room_id: s.room.id, starts_at: '2026-10-06T09:00:00Z', ends_at: '2026-10-06T10:00:00Z', timezone: 'UTC' });
  await api.expectHttp(409, 'POST', base, s.token, { ...s.input, appointment_date: '2026-10-06T09:00:00Z', is_overbook: true });
});

test('[AG-LIFECYCLE] actual status progresses through confirmation, arrival, care and completion', async () => {
  const s = await api.scenario(); await s.windows();
  const row = await s.create('appointments', s.input);
  for (const status of ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED']) {
    const response = await api.expectHttp(200, 'PATCH', base + '/' + row.id + '/status', s.token, { status });
    assert.equal(response.status, status);
    assert.equal((await api.expectHttp(200, 'GET', base + '/' + row.id, s.token)).status, status);
    const [stored] = await api.sql`SELECT status FROM app_appointments WHERE id = ${row.id}`;
    assert.equal(stored.status, status);
  }
});

test('[AG-QUEUE] period and status filters return only matching persisted appointments', async () => {
  const s = await api.scenario(); await s.windows();
  const first = await s.create('appointments', s.input);
  await s.create('appointments', { ...s.input, appointment_date: '2026-10-05T09:30:00Z' });
  await api.expectHttp(200, 'PATCH', base + '/' + first.id + '/status', s.token, { status: 'ARRIVED' });
  const page = await api.expectHttp(200, 'GET', base + '?status=ARRIVED&from=2026-10-05T09:10:00Z&to=2026-10-05T09:30:00Z', s.token);
  assert.equal(page.total, 1); assert.deepEqual(page.items.map((r: { id: string }) => r.id), [first.id]);
  const beyond = await api.expectHttp(200, 'GET', base + '?offset=100&limit=1', s.token);
  assert.equal(beyond.total, 2); assert.deepEqual(beyond.items, []);
});

for (const status of ['CANCELLED', 'NO_SHOW']) {
  test(`[AG-DEVIATIONS] ${status} is persisted and releases the original reservation`, async () => {
    const s = await api.scenario(); await s.windows();
    const row = await s.create('appointments', s.input);
    await api.expectHttp(200, 'PATCH', base + '/' + row.id + '/status', s.token, { status });
    assert.equal((await api.expectHttp(200, 'GET', base + '/' + row.id, s.token)).status, status);
    await s.create('appointments', s.input);
  });
}

test('[AG-DELETE] deletion removes visibility but preserves the database row', async () => {
  const s = await api.scenario(); await s.windows(); const row = await s.create('appointments', s.input);
  const response = await api.request('DELETE', base + '/' + row.id, s.token);
  assert.equal(response.status, 204); assert.equal(response.text, '');
  await api.expectHttp(404, 'GET', base + '/' + row.id, s.token);
  assert.equal((await api.expectHttp(200, 'GET', base, s.token)).total, 0);
  const [stored] = await api.sql`SELECT deleted_at FROM app_appointments WHERE id = ${row.id}`;
  assert.ok(stored?.deleted_at);
});

test('[SEC-TENANT] another tenant cannot read, modify, change status, delete or reference the appointment data', async () => {
  const s = await api.scenario(); await s.windows(); const row = await s.create('appointments', s.input);
  const foreign = await api.identity();
  for (const [method, suffix, body] of [['GET', '', undefined], ['PUT', '', { notes: 'intrusion' }], ['PATCH', '/status', { status: 'CANCELLED' }], ['DELETE', '', undefined]] as const) {
    await api.expectHttp(404, method, base + '/' + row.id + suffix, foreign.token, body);
  }
  assert.equal((await api.expectHttp(200, 'GET', base + '?patient_id=' + s.patient.id, foreign.token)).total, 0);
  await api.expectHttp(422, 'POST', base, foreign.token, { ...s.input, is_overbook: true });
  assert.equal((await api.expectHttp(200, 'GET', base + '/' + row.id, s.token)).status, 'SCHEDULED');
});

test('[SEC-AUTH] every appointment endpoint requires a live authenticated session', async () => {
  const s = await api.scenario();
  const cases = [['GET', '', undefined], ['POST', '', s.input], ['GET', '/missing', undefined], ['PUT', '/missing', { notes: 'test' }], ['PATCH', '/missing/status', { status: 'CONFIRMED' }], ['DELETE', '/missing', undefined]] as const;
  for (const [method, suffix, body] of cases) await api.expectHttp(401, method, base + suffix, undefined, body);
  await api.sql`UPDATE iam_sessions SET revoked_at = now() WHERE id = ${s.sessionId}`;
  for (const [method, suffix, body] of cases) await api.expectHttp(401, method, base + suffix, s.token, body);
});

test('[SEC-ACL] persisted READ permission does not grant WRITE or DELETE', async () => {
  const s = await api.scenario(); await s.windows(); const row = await s.create('appointments', s.input);
  const user = await api.identity(s.tenant, 'USER');
  await api.expectHttp(403, 'GET', base, user.token);
  await api.sql`INSERT INTO iam_permissions (id, tenant_id, user_id, resource_id, action, effect)
    SELECT gen_random_uuid()::text, ${s.tenant}, ${user.userId}, id, 'READ', 'ALLOW' FROM sys_application_resources WHERE item_code = 'op_schedule'`;
  assert.equal((await api.expectHttp(200, 'GET', base, user.token)).total, 1);
  for (const [method, suffix, body] of [['POST', '', s.input], ['PUT', '/' + row.id, { notes: 'denied' }], ['PATCH', '/' + row.id + '/status', { status: 'CANCELLED' }], ['DELETE', '/' + row.id, undefined]] as const) {
    await api.expectHttp(403, method, base + suffix, user.token, body);
  }
  assert.equal((await api.expectHttp(200, 'GET', base + '/' + row.id, s.token)).status, 'SCHEDULED');
});
