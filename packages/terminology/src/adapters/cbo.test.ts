import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { MockAgent } from 'undici';
import { setSharedDispatcherForTesting } from '../http-client.js';
import { createCboAdapter } from './cbo.js';

// The real CBO CSVs are ";"-delimited, CRLF-terminated, ISO-8859-1 encoded, with a
// "CODIGO;TITULO" header — confirmed by downloading the live files.
function latin1Csv(rows: string[]): Buffer {
  const text = rows.join('\r\n') + '\r\n';
  return Buffer.from(text, 'latin1');
}

const ORIGIN = 'https://www.gov.br';
const BASE_PATH = '/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads';

async function drain(adapter: ReturnType<typeof createCboAdapter>) {
  const concepts = [];
  for await (const batch of adapter.fetchConcepts(() => {})) concepts.push(...batch.concepts);
  return concepts;
}

describe('createCboAdapter', () => {
  let mockAgent: MockAgent;

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setSharedDispatcherForTesting(mockAgent);
  });
  afterEach(async () => {
    setSharedDispatcherForTesting(null);
    await mockAgent.close();
  });

  function mockCsvs(ocupacao: string[], familia: string[], sinonimo: string[]) {
    const client = mockAgent.get(ORIGIN);
    client.intercept({ path: `${BASE_PATH}/cbo2002-ocupacao.csv`, method: 'GET' }).reply(200, latin1Csv(ocupacao));
    client.intercept({ path: `${BASE_PATH}/cbo2002-familia.csv`, method: 'GET' }).reply(200, latin1Csv(familia));
    client.intercept({ path: `${BASE_PATH}/cbo2002-sinonimo.csv`, method: 'GET' }).reply(200, latin1Csv(sinonimo));
  }

  test('maps ocupação rows, decoding Latin-1 and joining família and sinônimos', async () => {
    mockCsvs(
      ['CODIGO;TITULO', '010105;Oficial general da aeronáutica'],
      ['CODIGO;TITULO', '0101;Oficiais generais das forças armadas'],
      ['CODIGO;TITULO', '010105;Brigadeiro', '010105;Marechal-do-ar'],
    );

    const adapter = createCboAdapter();
    const concepts = await drain(adapter);

    expect(concepts).toHaveLength(1);
    expect(concepts[0]!.code).toBe('010105');
    expect(concepts[0]!.displayName).toBe('Oficial general da aeronáutica');
    expect(concepts[0]!.extra).toMatchObject({
      familia_code: '0101',
      familia_titulo: 'Oficiais generais das forças armadas',
      sinonimos: ['Brigadeiro', 'Marechal-do-ar'],
    });
  });

  test('tolerates a literal quote character embedded in an unquoted field (confirmed in the live sinônimo file: Modelo "fashion")', async () => {
    mockCsvs(
      ['CODIGO;TITULO', '376410;Modelo de passarela'],
      ['CODIGO;TITULO'],
      ['CODIGO;TITULO', '376410;Modelo "fashion"', '376410;Modelo comercial'],
    );

    const adapter = createCboAdapter();
    const concepts = await drain(adapter);

    expect(concepts[0]!.extra!['sinonimos']).toEqual(['Modelo "fashion"', 'Modelo comercial']);
  });

  test('an ocupação with no synonyms gets an empty synonym list, not undefined', async () => {
    mockCsvs(
      ['CODIGO;TITULO', '999999;Sem sinônimos'],
      ['CODIGO;TITULO'],
      ['CODIGO;TITULO'],
    );

    const adapter = createCboAdapter();
    const concepts = await drain(adapter);

    expect(concepts[0]!.extra!['sinonimos']).toEqual([]);
  });
});
