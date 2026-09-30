import { createServer, type Server } from 'node:http';
import { describe, test, expect, afterEach } from 'vitest';
import { Agent, MockAgent, interceptors } from 'undici';
import { fetchBuffer } from './http-client.js';

// MockAgent's simulated responses don't go through undici's real socket-level timeout
// machinery (delay() just defers when the mock reply is handed back, it doesn't exercise
// headersTimeout/bodyTimeout enforcement) — so timeout behavior needs a real server.
function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`);
    });
  });
}

describe('fetchBuffer', () => {
  let mockAgent: MockAgent | undefined;
  let server: Server | undefined;

  afterEach(async () => {
    await mockAgent?.close();
    if (server) await new Promise((resolve) => server!.close(resolve));
  });

  test('throws within headersTimeoutMs when the server never responds, instead of hanging', async () => {
    server = createServer(() => { /* never respond */ });
    const baseUrl = await listen(server);

    const start = Date.now();
    await expect(
      // No retry composed here: this test isolates the timeout mechanic itself, not retry timing.
      fetchBuffer(`${baseUrl}/slow`, { headersTimeoutMs: 150, dispatcher: new Agent() })
    ).rejects.toThrow();
    expect(Date.now() - start).toBeLessThan(3000);
  });

  test('a response within the timeout window succeeds without a false-positive timeout', async () => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    mockAgent.get('https://example.test').intercept({ path: '/ok', method: 'GET' })
      .reply(200, 'fine').delay(20);

    const result = await fetchBuffer('https://example.test/ok', { dispatcher: mockAgent, headersTimeoutMs: 200 });

    expect(result.buffer.toString('utf8')).toBe('fine');
  });

  test('retries a transient 503 and succeeds on the third attempt', async () => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    const client = mockAgent.get('https://example.test');
    client.intercept({ path: '/flaky', method: 'GET' }).reply(503, 'unavailable');
    client.intercept({ path: '/flaky', method: 'GET' }).reply(503, 'unavailable');
    client.intercept({ path: '/flaky', method: 'GET' }).reply(200, 'recovered');
    const dispatcher = mockAgent.compose(interceptors.retry({ maxRetries: 3, minTimeout: 1, maxTimeout: 5, timeoutFactor: 1, statusCodes: [503] }));

    const result = await fetchBuffer('https://example.test/flaky', { dispatcher });

    expect(result.buffer.toString('utf8')).toBe('recovered');
  });

  test('onProgress reaches the full body length', async () => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    const body = 'x'.repeat(1000);
    mockAgent.get('https://example.test').intercept({ path: '/data', method: 'GET' }).reply(200, body);

    const progressUpdates: number[] = [];
    const result = await fetchBuffer('https://example.test/data', {
      dispatcher: mockAgent,
      onProgress: (p) => progressUpdates.push(p.bytesReceived),
    });

    expect(result.buffer.length).toBe(1000);
    expect(progressUpdates.at(-1)).toBe(1000);
  });

  test('throws a clear error for a non-retried 4xx response', async () => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    mockAgent.get('https://example.test').intercept({ path: '/missing', method: 'GET' }).reply(404, 'not found');

    await expect(fetchBuffer('https://example.test/missing', { dispatcher: mockAgent })).rejects.toThrow(/404/);
  });
});
