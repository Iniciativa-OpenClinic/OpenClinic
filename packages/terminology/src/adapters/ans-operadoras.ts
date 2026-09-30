import { parse } from 'csv-parse/sync';
import { fetchBuffer, fetchHead } from '../http-client.js';
import type { FetchedBatch, ProgressCallback, RawConcept, SourceAdapter } from '../types.js';

// Confirmed by downloading the live file: UTF-8, ";"-delimited, double-quoted values.
const CSV_URL = 'https://dadosabertos.ans.gov.br/FTP/PDA/operadoras_de_plano_de_saude_ativas/Relatorio_cadop.csv';

interface AnsOperadoraRow {
  REGISTRO_OPERADORA: string;
  CNPJ: string;
  RAZAO_SOCIAL: string;
  NOME_FANTASIA: string;
  MODALIDADE: string;
  UF: string;
  CIDADE: string;
  DATA_REGISTRO_ANS: string;
}

function mapRow(row: AnsOperadoraRow): RawConcept {
  return {
    code: row.REGISTRO_OPERADORA,
    displayName: row.RAZAO_SOCIAL,
    extra: {
      cnpj: row.CNPJ,
      nome_fantasia: row.NOME_FANTASIA || undefined,
      modalidade: row.MODALIDADE,
      uf: row.UF,
      cidade: row.CIDADE,
      data_registro_ans: row.DATA_REGISTRO_ANS,
    },
  };
}

export function createAnsOperadorasAdapter(): SourceAdapter {
  return {
    sourceCode: 'ans-operadoras',
    sourceName: 'ANS — Operadoras de Planos de Saúde Ativas',
    sourceKind: 'ANS_CSV',

    async fetchVersion(): Promise<string> {
      const { headers } = await fetchHead(CSV_URL, { headersTimeoutMs: 10_000 });
      const lastModified = headers['last-modified'];
      if (typeof lastModified === 'string') return new Date(lastModified).toISOString().slice(0, 10);
      return new Date().toISOString().slice(0, 10);
    },

    async *fetchConcepts(onProgress: ProgressCallback): AsyncGenerator<FetchedBatch, void, void> {
      const result = await fetchBuffer(CSV_URL, {
        headersTimeoutMs: 10_000,
        bodyTimeoutMs: 30_000,
        onProgress: (p) => onProgress({ ...p, pagesFetched: 1 }),
      });
      const rows = parse(result.buffer.toString('utf8'), { columns: true, delimiter: ';', trim: true, skip_empty_lines: true }) as AnsOperadoraRow[];
      yield { concepts: rows.map(mapRow) }; // no cursor: restart-from-scratch on resume
    },
  };
}

export const ansOperadoras = createAnsOperadorasAdapter();
