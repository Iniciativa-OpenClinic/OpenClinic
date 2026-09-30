import { logger } from '@openclinic/core';
import { fetchJson } from '../http-client.js';
import type { FetchedBatch, ProgressCallback, RawConcept, SourceAdapter } from '../types.js';

const BASE_URL = 'https://consulta-ocl.apps.sa-1a.mendixcloud.com/rest/oclservice/ANS';
const MAX_PAGES = 2000; // safety cap; the API is expected to return an empty page well before this

// This host is not down, just slow: a live page request was measured taking 58s to respond
// (likely a cold/loaded Mendix backend). The original bug was a fetch that could hang forever
// with zero signal — the fix is a real, generous-but-finite timeout, not an aggressive one
// that would fail out genuinely slow-but-working requests.
const CONCEPTS_HEADERS_TIMEOUT_MS = 90_000;
const CONCEPTS_BODY_TIMEOUT_MS = 30_000;
const VERSION_HEADERS_TIMEOUT_MS = 30_000;

interface OclConcept {
  id: string;
  source: string;
  display_name: string;
  extras?: {
    inicio_vigencia?: string;
    fim_implantacao?: string;
    fim_vigencia?: string;
  };
}

interface OclSource {
  version?: string;
  updated_on?: string;
}

interface TussCursor {
  page: number;
}

function parseOclDate(value: string | undefined): Date | undefined {
  if (!value || value === '-') return undefined;
  return new Date(`${value}T00:00:00Z`);
}

function mapOclConcept(concept: OclConcept): RawConcept {
  return {
    code: concept.id,
    displayName: concept.display_name,
    inicioVigencia: parseOclDate(concept.extras?.inicio_vigencia),
    fimImplantacao: parseOclDate(concept.extras?.fim_implantacao),
    fimVigencia: parseOclDate(concept.extras?.fim_vigencia),
  };
}

export function createTussAdapter(table: string, sourceCode: string): SourceAdapter {
  return {
    sourceCode,
    sourceName: `TUSS ${table}`,
    sourceKind: 'TUSS_OCL',

    async fetchVersion(): Promise<string> {
      try {
        const { data: body } = await fetchJson<OclSource | OclSource[]>(`${BASE_URL}/source/${table}`, { headersTimeoutMs: VERSION_HEADERS_TIMEOUT_MS, bodyTimeoutMs: 15_000 });
        const source = Array.isArray(body) ? body.find((s) => s.version || s.updated_on) : body;
        const version = source?.version ?? source?.updated_on;
        if (version) return version;
      } catch (err) {
        logger.warn({ err, table }, 'TUSS source metadata unavailable, falling back to date-based version');
      }
      logger.warn({ table }, 'TUSS source has no explicit version; using today\'s date as the version stamp');
      return new Date().toISOString().slice(0, 10);
    },

    async *fetchConcepts(onProgress: ProgressCallback, resumeCursor?: unknown): AsyncGenerator<FetchedBatch, void, void> {
      const startPage = (resumeCursor as TussCursor | undefined)?.page ?? 1;
      const start = Date.now();
      let bytesReceived = 0;

      for (let page = startPage; page <= MAX_PAGES; page++) {
        const { data: items, result } = await fetchJson<OclConcept[]>(
          `${BASE_URL}/concepts/${table}?page=${page}`,
          { headersTimeoutMs: CONCEPTS_HEADERS_TIMEOUT_MS, bodyTimeoutMs: CONCEPTS_BODY_TIMEOUT_MS },
        );
        bytesReceived += result.buffer.length;
        onProgress({ bytesReceived, totalBytes: null, pagesFetched: page, elapsedMs: Date.now() - start });

        if (items.length === 0) break;
        yield { concepts: items.map(mapOclConcept), cursor: { page: page + 1 } satisfies TussCursor };
      }
    },
  };
}

export const tuss19 = createTussAdapter('tuss-19', 'tuss-19');
export const tuss20 = createTussAdapter('tuss-20', 'tuss-20');
export const tuss22 = createTussAdapter('tuss-22', 'tuss-22');
