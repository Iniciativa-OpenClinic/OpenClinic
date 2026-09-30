import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { MockAgent, interceptors } from 'undici';
import { setSharedDispatcherForTesting } from '../http-client.js';
import { createTussAdapter } from './tuss.js';

const page1 = [
  {
    extras: { fim_vigencia: '-', fim_implantacao: '2026-10-31', inicio_vigencia: '2026-08-01' },
    id: '30918090',
    source: 'tuss-22',
    display_name: 'Ablação percutânea por cateter para tratamento de arritmias cardíacas complexas',
  },
  {
    extras: { fim_vigencia: '-', fim_implantacao: '2011-03-06', inicio_vigencia: '2010-06-09' },
    id: '87000199',
    source: 'tuss-22',
    display_name: 'Colocação de aparelho ortodôntico removível',
  },
];

async function drain(adapter: ReturnType<typeof createTussAdapter>, resumeCursor?: unknown) {
  const concepts: unknown[] = [];
  const cursors: unknown[] = [];
  for await (const batch of adapter.fetchConcepts(() => {}, resumeCursor)) {
    concepts.push(...batch.concepts);
    cursors.push(batch.cursor);
  }
  return { concepts, cursors };
}

const ORIGIN = 'https://consulta-ocl.apps.sa-1a.mendixcloud.com';

describe('createTussAdapter', () => {
  let mockAgent: MockAgent;

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setSharedDispatcherForTesting(mockAgent.compose(interceptors.retry({ maxRetries: 1, minTimeout: 1, maxTimeout: 5 })));
  });
  afterEach(async () => {
    setSharedDispatcherForTesting(null);
    await mockAgent.close();
  });

  test('maps OCL concept fields into RawConcept, translating "-" to an open-ended vigência', async () => {
    const client = mockAgent.get(ORIGIN);
    client.intercept({ path: '/rest/oclservice/ANS/concepts/tuss-22?page=1', method: 'GET' }).reply(200, page1);
    client.intercept({ path: '/rest/oclservice/ANS/concepts/tuss-22?page=2', method: 'GET' }).reply(200, []);

    const adapter = createTussAdapter('tuss-22', 'tuss-22');
    const { concepts } = await drain(adapter);

    expect(concepts).toHaveLength(2);
    expect(concepts[0]).toMatchObject({
      code: '30918090',
      displayName: 'Ablação percutânea por cateter para tratamento de arritmias cardíacas complexas',
      inicioVigencia: new Date('2026-08-01T00:00:00Z'),
      fimImplantacao: new Date('2026-10-31T00:00:00Z'),
    });
    expect((concepts[0] as { fimVigencia?: unknown }).fimVigencia).toBeUndefined();
  });

  test('paginates until an empty page is returned, yielding one cursor-tagged batch per page', async () => {
    const client = mockAgent.get(ORIGIN);
    client.intercept({ path: '/rest/oclservice/ANS/concepts/tuss-22?page=1', method: 'GET' }).reply(200, page1);
    client.intercept({ path: '/rest/oclservice/ANS/concepts/tuss-22?page=2', method: 'GET' }).reply(200, [page1[0]]);
    client.intercept({ path: '/rest/oclservice/ANS/concepts/tuss-22?page=3', method: 'GET' }).reply(200, []);

    const adapter = createTussAdapter('tuss-22', 'tuss-22');
    const { concepts, cursors } = await drain(adapter);

    expect(concepts).toHaveLength(3);
    expect(cursors).toEqual([{ page: 2 }, { page: 3 }]);
  });

  test('resuming from a cursor never requests earlier pages', async () => {
    const client = mockAgent.get(ORIGIN);
    // No interceptor for page=1 at all — a request for it would throw "no matching interceptor".
    client.intercept({ path: '/rest/oclservice/ANS/concepts/tuss-22?page=2', method: 'GET' }).reply(200, [page1[0]]);
    client.intercept({ path: '/rest/oclservice/ANS/concepts/tuss-22?page=3', method: 'GET' }).reply(200, []);

    const adapter = createTussAdapter('tuss-22', 'tuss-22');
    const { concepts } = await drain(adapter, { page: 2 });

    expect(concepts).toHaveLength(1);
  });
});
