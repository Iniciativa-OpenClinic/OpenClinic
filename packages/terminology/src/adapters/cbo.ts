import { parse } from 'csv-parse/sync';
import { fetchBuffer } from '../http-client.js';
import type { FetchedBatch, ProgressCallback, RawConcept, SourceAdapter } from '../types.js';

const BASE_URL = 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads';

// Confirmed by downloading the live files: ";"-delimited, CRLF-terminated, ISO-8859-1
// encoded, with a "CODIGO;TITULO" header.
async function fetchCboCsv(filename: string, onBytes: (bytes: number) => void): Promise<Array<{ CODIGO: string; TITULO: string }>> {
  const result = await fetchBuffer(`${BASE_URL}/${filename}`, { headersTimeoutMs: 10_000, bodyTimeoutMs: 30_000 });
  onBytes(result.buffer.length);
  const text = result.buffer.toString('latin1');
  // relax_quotes: the live files are not strictly RFC4180-quoted — confirmed occurrences of
  // a literal `"` inside an unquoted field (e.g. the sinônimo "Modelo \"fashion\"").
  return parse(text, { columns: true, delimiter: ';', trim: true, skip_empty_lines: true, relax_quotes: true });
}

export function createCboAdapter(): SourceAdapter {
  return {
    sourceCode: 'cbo-ocupacao',
    sourceName: 'CBO — Classificação Brasileira de Ocupações',
    sourceKind: 'CBO_CSV',

    // These are static "CBO 2002" tables with no rolling version published by the source.
    async fetchVersion(): Promise<string> {
      return '2002';
    },

    async *fetchConcepts(onProgress: ProgressCallback): AsyncGenerator<FetchedBatch, void, void> {
      const start = Date.now();
      let bytesReceived = 0;
      const onBytes = (bytes: number) => {
        bytesReceived += bytes;
        onProgress({ bytesReceived, totalBytes: null, pagesFetched: 1, elapsedMs: Date.now() - start });
      };

      const [ocupacoes, sinonimos, familias] = await Promise.all([
        fetchCboCsv('cbo2002-ocupacao.csv', onBytes),
        fetchCboCsv('cbo2002-sinonimo.csv', onBytes),
        fetchCboCsv('cbo2002-familia.csv', onBytes),
      ]);

      const sinonimosByCode = new Map<string, string[]>();
      for (const row of sinonimos) {
        const list = sinonimosByCode.get(row.CODIGO) ?? [];
        list.push(row.TITULO);
        sinonimosByCode.set(row.CODIGO, list);
      }
      const familiaTituloByCode = new Map(familias.map((row) => [row.CODIGO, row.TITULO]));

      const concepts: RawConcept[] = ocupacoes.map((row) => {
        const familiaCode = row.CODIGO.slice(0, 4);
        return {
          code: row.CODIGO,
          displayName: row.TITULO,
          extra: {
            familia_code: familiaCode,
            familia_titulo: familiaTituloByCode.get(familiaCode),
            sinonimos: sinonimosByCode.get(row.CODIGO) ?? [],
          },
        };
      });
      yield { concepts }; // no cursor: restart-from-scratch on resume
    },
  };
}

export const cbo = createCboAdapter();
