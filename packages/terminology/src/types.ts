export interface RawConcept {
  code: string;
  displayName: string;
  description?: string;
  extra?: Record<string, unknown>;
  /** The source's own official validity period, when it publishes one (e.g. TUSS). Falls
   * back to the sync engine's own now()/null when the adapter omits these. */
  inicioVigencia?: Date;
  fimImplantacao?: Date;
  fimVigencia?: Date;
}

export type SourceKind = 'TUSS_OCL' | 'ANS_CSV' | 'FHIR_CODESYSTEM' | 'CBO_CSV';

export interface FetchProgress {
  bytesReceived: number;
  totalBytes: number | null;
  pagesFetched?: number;
  elapsedMs: number;
}
export type ProgressCallback = (progress: FetchProgress) => void;

export interface FetchedBatch {
  concepts: RawConcept[];
  /** Adapter-defined resume point AFTER this batch, persisted once the batch's DB transaction
   * commits. Omitted for adapters with no natural mid-fetch resume point — those simply
   * restart their whole fetch when resumed (an explicitly endorsed fallback). */
  cursor?: unknown;
}

export interface SourceAdapter {
  sourceCode: string;
  sourceName: string;
  sourceKind: SourceKind;
  fetchVersion(): Promise<string>;
  fetchConcepts(onProgress: ProgressCallback, resumeCursor?: unknown): AsyncGenerator<FetchedBatch, void, void>;
}

export interface SyncRunResult {
  sourceCode: string;
  fetched: number;
  upserted: number;
  versioned: number;
  unchanged: number;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
  /** This invocation's own work only — not cumulative across a crash-resume. */
  bytesDownloaded: number;
  pagesFetched: number;
  elapsedMs: number;
  /** True only when --resume's source-level skip-ahead bypassed this source entirely. */
  skipped?: boolean;
}
