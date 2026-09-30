import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { MockAgent } from 'undici';
import { setSharedDispatcherForTesting } from '../http-client.js';
import { createAnsOperadorasAdapter } from './ans-operadoras.js';

// Header and quoting style confirmed by downloading the live Relatorio_cadop.csv (UTF-8,
// ";"-delimited, double-quoted values).
const csvFixture = [
  'REGISTRO_OPERADORA;CNPJ;RAZAO_SOCIAL;NOME_FANTASIA;MODALIDADE;LOGRADOURO;NUMERO;COMPLEMENTO;BAIRRO;CIDADE;UF;CEP;DDD;TELEFONE;FAX;ENDERECO_ELETRONICO;REPRESENTANTE;CARGO_REPRESENTANTE;REGIAO_DE_COMERCIALIZACAO;DATA_REGISTRO_ANS',
  '"419761";"19541931000125";"18 DE JULHO ADMINISTRADORA DE BENEFÍCIOS LTDA";;"Administradora de Benefícios";"RUA CAPITÃO MEDEIROS DE REZENDE";"274";;"PRAÇA DA BANDEIRA";"Rio de Janeiro";"RJ";"20260060";"21";"22222222";;"contato@example.com";"Fulano";"Diretor";"Nacional";"1998-01-01"',
].join('\n');

const ORIGIN = 'https://dadosabertos.ans.gov.br';
const PATH = '/FTP/PDA/operadoras_de_plano_de_saude_ativas/Relatorio_cadop.csv';

async function drain(adapter: ReturnType<typeof createAnsOperadorasAdapter>) {
  const concepts = [];
  for await (const batch of adapter.fetchConcepts(() => {})) concepts.push(...batch.concepts);
  return concepts;
}

describe('createAnsOperadorasAdapter', () => {
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

  test('maps REGISTRO_OPERADORA/RAZAO_SOCIAL into code/displayName and keeps the rest as extra', async () => {
    mockAgent.get(ORIGIN).intercept({ path: PATH, method: 'GET' }).reply(200, csvFixture);
    const adapter = createAnsOperadorasAdapter();

    const concepts = await drain(adapter);

    expect(concepts).toHaveLength(1);
    expect(concepts[0]).toMatchObject({
      code: '419761',
      displayName: '18 DE JULHO ADMINISTRADORA DE BENEFÍCIOS LTDA',
    });
    expect(concepts[0]!.extra).toMatchObject({ cnpj: '19541931000125', modalidade: 'Administradora de Benefícios', uf: 'RJ' });
  });

  test('derives a version from the response Last-Modified header', async () => {
    mockAgent.get(ORIGIN).intercept({ path: PATH, method: 'HEAD' }).reply(200, '', { headers: { 'last-modified': 'Fri, 06 Aug 2024 12:00:00 GMT' } });
    const adapter = createAnsOperadorasAdapter();

    const version = await adapter.fetchVersion();

    expect(version).toBe('2024-08-06');
  });
});
