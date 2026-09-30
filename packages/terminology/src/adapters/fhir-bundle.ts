import AdmZip from 'adm-zip';
import { logger } from '@openclinic/core';
import { fetchBuffer } from '../http-client.js';
import type { FetchedBatch, ProgressCallback, RawConcept, SourceAdapter } from '../types.js';

const FULL_IG_URL = 'https://terminologia.saude.gov.br/fhir/full-ig.zip';

interface FhirConceptEntry {
  code: string;
  display: string;
  definition?: string;
}

interface FhirCodeSystem {
  version?: string;
  content?: string;
  concept?: FhirConceptEntry[];
}

interface FhirValueSet {
  compose?: { include?: Array<{ concept?: FhirConceptEntry[] }> };
}

// Some CodeSystems in the bundle embed their own concepts (content: "complete"); others are
// stubs (content: "not-present") whose concepts live in a companion ValueSet's
// compose.include instead. BRConselhoProfissional's own codes are full URIs
// (https://saude.gov.br/fhir/sid/crf-ac) — shortened to their last path segment, with the
// original URI preserved in `extra` for traceability.
function shortenCode(code: string): { code: string; originalUri?: string } {
  if (!code.includes('://')) return { code };
  const segments = code.split('/');
  return { code: segments[segments.length - 1] || code, originalUri: code };
}

function mapConcept(entry: FhirConceptEntry): RawConcept {
  const { code, originalUri } = shortenCode(entry.code);
  return {
    code,
    displayName: entry.display,
    description: entry.definition,
    extra: originalUri ? { source_code_uri: originalUri } : undefined,
  };
}

// The MS "Terminologias do Brasil" IG is a single downloadable bundle covering many
// vocabularies (CID-10, CIAP-2, conselhos profissionais, MS domain tables). A batch sync of
// several FHIR-bundle sources should download it once, not once per source.
let cachedZip: Promise<AdmZip> | null = null;

export function resetFhirBundleCache(): void {
  cachedZip = null;
}

async function loadZip(onProgress?: ProgressCallback): Promise<AdmZip> {
  if (!cachedZip) {
    cachedZip = (async () => {
      const result = await fetchBuffer(FULL_IG_URL, { headersTimeoutMs: 15_000, bodyTimeoutMs: 60_000, onProgress });
      return new AdmZip(result.buffer);
    })();
  }
  return cachedZip;
}

function readJsonEntry<T>(zip: AdmZip, path: string): T {
  const entry = zip.getEntry(path);
  if (!entry) throw new Error(`${path} not found in the MS terminology IG bundle`);
  return JSON.parse(entry.getData().toString('utf8')) as T;
}

export function createFhirBundleAdapter(codeSystemId: string, sourceCode: string): SourceAdapter {
  return {
    sourceCode,
    sourceName: codeSystemId,
    sourceKind: 'FHIR_CODESYSTEM',

    async fetchVersion(): Promise<string> {
      const zip = await loadZip();
      const codeSystem = readJsonEntry<FhirCodeSystem>(zip, `site/CodeSystem-${codeSystemId}.json`);
      return codeSystem.version ?? new Date().toISOString().slice(0, 10);
    },

    async *fetchConcepts(onProgress: ProgressCallback): AsyncGenerator<FetchedBatch, void, void> {
      const zip = await loadZip((p) => onProgress({ ...p, pagesFetched: 1 }));
      const codeSystem = readJsonEntry<FhirCodeSystem>(zip, `site/CodeSystem-${codeSystemId}.json`);

      let entries: FhirConceptEntry[];
      if (codeSystem.content === 'complete' && codeSystem.concept?.length) {
        entries = codeSystem.concept;
      } else {
        const valueSet = readJsonEntry<FhirValueSet>(zip, `site/ValueSet-${codeSystemId}.json`);
        entries = (valueSet.compose?.include ?? []).flatMap((include) => include.concept ?? []);
      }

      // The IG publisher caps compose.include's static concept list at 1000 entries for
      // ValueSets bound to large external systems (confirmed against the live BRCID10
      // ValueSet, which is genuinely capped, not just this snapshot) — this is not a
      // complete expansion when the cap is hit, and callers should treat it as a best-effort
      // subset until a complete authoritative source is wired in.
      if (entries.length >= 1000) {
        logger.warn({ codeSystemId, count: entries.length }, 'FHIR concept list may be truncated by the publisher at 1000 entries; this may not be the complete official table');
      }
      yield { concepts: entries.map(mapConcept) }; // no cursor: restart-from-scratch on resume
    },
  };
}
