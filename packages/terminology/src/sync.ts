import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import type { FetchProgress, SourceAdapter, SyncRunResult } from './types.js';

const LANGUAGE = 'pt-BR';
const COMMIT_CHUNK_SIZE = 500; // chunk a single-yield adapter's array for commit frequency
const PROGRESS_LOG_INTERVAL_MS = 3000; // throttle console output

function sameInstant(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b;
  return a.getTime() === b.getTime();
}

// Postgres's jsonb storage does not preserve original key insertion order (it reorders keys,
// observed as ascending key-length order) — so a plain JSON.stringify(a) === JSON.stringify(b)
// comparison between a freshly-constructed `extra` object and one round-tripped through jsonb
// would spuriously report "changed" on every re-sync. Sorting keys recursively before
// stringifying makes the comparison order-independent.
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    // Matches JSON.stringify's own behavior for objects: a key whose value is undefined is
    // omitted entirely, not stringified as the literal text "undefined".
    const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length <= size) return [items];
  const parts: T[][] = [];
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size));
  return parts;
}

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function humanDuration(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m${Math.round(seconds - minutes * 60)}s`;
}

interface OrphanedRun {
  id: string;
  cursor: unknown;
  records_fetched: number | null;
  records_upserted: number | null;
  records_versioned: number | null;
  started_at: Date;
}

async function findOrphanedRun(sql: postgres.Sql, sourceCode: string): Promise<OrphanedRun | undefined> {
  const [row] = await sql<OrphanedRun[]>`
    SELECT id, cursor, records_fetched, records_upserted, records_versioned, started_at
    FROM terminology.sync_runs
    WHERE source_code = ${sourceCode} AND status = 'RUNNING'
    ORDER BY started_at DESC LIMIT 1
  `;
  return row;
}

export async function syncSource(sql: postgres.Sql, adapter: SourceAdapter): Promise<SyncRunResult> {
  await sql`
    INSERT INTO terminology.sources (code, name, kind)
    VALUES (${adapter.sourceCode}, ${adapter.sourceName}, ${adapter.sourceKind})
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, kind = EXCLUDED.kind, updated_at = now()
  `;

  // An orphaned RUNNING row (no finished_at) IS the crash signal — no PID-liveness check
  // needed. Reuse it (don't insert a new row) so repeated crash/resume cycles for one source
  // don't leave a trail of abandoned RUNNING audit rows.
  const orphaned = await findOrphanedRun(sql, adapter.sourceCode);

  let runId: string;
  let resumeCursor: unknown;
  let upserted: number;
  let versioned: number;
  let fetchedTotal: number;

  if (orphaned) {
    runId = orphaned.id;
    resumeCursor = orphaned.cursor;
    upserted = orphaned.records_upserted ?? 0;
    versioned = orphaned.records_versioned ?? 0;
    fetchedTotal = orphaned.records_fetched ?? 0;
    console.log(`[RESUME] ${adapter.sourceCode}: continuing an interrupted run from ${orphaned.started_at.toISOString()}, cursor=${JSON.stringify(resumeCursor)}`);
  } else {
    runId = randomUUID();
    await sql`INSERT INTO terminology.sync_runs (id, source_code, status) VALUES (${runId}, ${adapter.sourceCode}, 'RUNNING')`;
    resumeCursor = undefined;
    upserted = 0;
    versioned = 0;
    fetchedTotal = 0;
  }
  let unchanged = 0;

  const invocationStart = Date.now();
  let lastLogAt = invocationStart;
  let bytesDownloaded = 0;
  let pagesFetched = 0;

  const onProgress = (progress: FetchProgress): void => {
    bytesDownloaded = progress.bytesReceived;
    if (progress.pagesFetched) pagesFetched = progress.pagesFetched;
    const now = Date.now();
    if (now - lastLogAt < PROGRESS_LOG_INTERVAL_MS) return;
    lastLogAt = now;
    const pct = progress.totalBytes ? Math.min(100, Math.round((progress.bytesReceived / progress.totalBytes) * 100)) : null;
    const eta = progress.totalBytes && progress.bytesReceived > 0
      ? humanDuration(((progress.totalBytes - progress.bytesReceived) / progress.bytesReceived) * progress.elapsedMs)
      : null;
    console.log(
      `[..] ${adapter.sourceCode}: page(s)=${pagesFetched} bytes=${humanBytes(bytesDownloaded)}` +
      (pct !== null ? ` (${pct}%, ETA ${eta})` : ' (total unknown)') +
      ` elapsed=${humanDuration(now - invocationStart)}`
    );
  };

  try {
    const version = await adapter.fetchVersion();

    for await (const { concepts: batch, cursor } of adapter.fetchConcepts(onProgress, resumeCursor)) {
      for (const part of chunk(batch, COMMIT_CHUNK_SIZE)) {
        await sql.begin(async (tx) => {
          for (const concept of part) {
            const extra = concept.extra ?? {};
            const inicioVigencia = concept.inicioVigencia ?? new Date();
            const fimImplantacao = concept.fimImplantacao ?? null;
            const fimVigenciaSource = concept.fimVigencia ?? null;
            const [current] = await tx`
              SELECT id, version, display_name, description, extra, inicio_vigencia, fim_implantacao
              FROM terminology.concepts
              WHERE source_code = ${adapter.sourceCode} AND code = ${concept.code} AND language = ${LANGUAGE}
                AND fim_vigencia IS NULL
            `;

            if (!current) {
              await tx`
                INSERT INTO terminology.concepts
                  (id, source_code, code, version, language, display_name, description, extra, inicio_vigencia, fim_implantacao, fim_vigencia)
                VALUES
                  (${randomUUID()}, ${adapter.sourceCode}, ${concept.code}, ${version}, ${LANGUAGE}, ${concept.displayName}, ${concept.description ?? null}, ${tx.json(extra as any)}, ${inicioVigencia}, ${fimImplantacao}, ${fimVigenciaSource})
              `;
              upserted++;
              continue;
            }

            const inicioVigenciaChanged = concept.inicioVigencia !== undefined
              && !sameInstant(current.inicio_vigencia, concept.inicioVigencia);

            const unchangedRow = current.version === version
              && current.display_name === concept.displayName
              && (current.description ?? null) === (concept.description ?? null)
              && stableStringify(current.extra) === stableStringify(extra)
              && !inicioVigenciaChanged
              && sameInstant(current.fim_implantacao, fimImplantacao);

            if (unchangedRow) {
              unchanged++;
              continue;
            }

            await tx`UPDATE terminology.concepts SET fim_vigencia = now(), updated_at = now() WHERE id = ${current.id}`;
            await tx`
              INSERT INTO terminology.concepts
                (id, source_code, code, version, language, display_name, description, extra, inicio_vigencia, fim_implantacao, fim_vigencia)
              VALUES
                (${randomUUID()}, ${adapter.sourceCode}, ${concept.code}, ${version}, ${LANGUAGE}, ${concept.displayName}, ${concept.description ?? null}, ${tx.json(extra as any)}, ${inicioVigencia}, ${fimImplantacao}, ${fimVigenciaSource})
            `;
            versioned++;
          }

          fetchedTotal += part.length;
          await tx`
            UPDATE terminology.sync_runs
            SET records_fetched = ${fetchedTotal}, records_upserted = ${upserted}, records_versioned = ${versioned}, cursor = ${tx.json((cursor ?? null) as any)}
            WHERE id = ${runId}
          `;
        });
      }
    }

    await sql`UPDATE terminology.sources SET last_synced_at = now() WHERE code = ${adapter.sourceCode}`;
    await sql`
      UPDATE terminology.sync_runs
      SET finished_at = now(), status = 'SUCCESS', cursor = NULL, records_fetched = ${fetchedTotal}, records_upserted = ${upserted}, records_versioned = ${versioned}
      WHERE id = ${runId}
    `;

    const elapsedMs = Date.now() - invocationStart;
    console.log(
      `[OK] ${adapter.sourceCode}: fetched=${fetchedTotal} new=${upserted} versioned=${versioned} unchanged=${unchanged}` +
      ` bytes=${humanBytes(bytesDownloaded)} pages=${pagesFetched} elapsed=${humanDuration(elapsedMs)}`
    );

    return { sourceCode: adapter.sourceCode, fetched: fetchedTotal, upserted, versioned, unchanged, status: 'SUCCESS', bytesDownloaded, pagesFetched, elapsedMs };
  } catch (err) {
    // Reached only for an in-process error (retries exhausted, parse/4xx error) — a real
    // kill/crash never reaches here, which is the point: the RUNNING row + its last-committed
    // cursor is exactly what the next invocation finds and resumes from.
    const message = err instanceof Error ? err.message : String(err);
    await sql`UPDATE terminology.sync_runs SET finished_at = now(), status = 'FAILED', error_message = ${message} WHERE id = ${runId}`;
    console.log(`[FAILED] ${adapter.sourceCode}: error=${message} (fetched=${fetchedTotal} new=${upserted} versioned=${versioned}, resumable from the saved cursor)`);
    return { sourceCode: adapter.sourceCode, fetched: fetchedTotal, upserted, versioned, unchanged, status: 'FAILED', error: message, bytesDownloaded, pagesFetched, elapsedMs: Date.now() - invocationStart };
  }
}

export async function syncAllSources(sql: postgres.Sql, adapters: SourceAdapter[], options?: { resume?: boolean }): Promise<SyncRunResult[]> {
  const results: SyncRunResult[] = [];
  for (const adapter of adapters) {
    if (options?.resume) {
      const [priorSuccess] = await sql`SELECT 1 FROM terminology.sync_runs WHERE source_code = ${adapter.sourceCode} AND status = 'SUCCESS' LIMIT 1`;
      if (priorSuccess) {
        console.log(`[SKIP] ${adapter.sourceCode}: already has a successful sync recorded; --resume continues past it`);
        results.push({ sourceCode: adapter.sourceCode, fetched: 0, upserted: 0, versioned: 0, unchanged: 0, status: 'SUCCESS', bytesDownloaded: 0, pagesFetched: 0, elapsedMs: 0, skipped: true });
        continue;
      }
    }
    results.push(await syncSource(sql, adapter));
  }
  return results;
}
