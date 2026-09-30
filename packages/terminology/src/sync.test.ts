import { randomUUID } from 'node:crypto';
import { describe, test, expect, vi } from 'vitest';
import { syncSource, syncAllSources } from './sync.js';
import { isolatedMigratedDb } from './test-support/isolated-db.js';
import type { FetchedBatch, RawConcept, SourceAdapter } from './types.js';

function fixtureAdapter(concepts: RawConcept[], version = '1', sourceCode = 'test-fixture'): SourceAdapter {
  return {
    sourceCode,
    sourceName: 'Test Fixture',
    sourceKind: 'FHIR_CODESYSTEM',
    fetchVersion: async () => version,
    async *fetchConcepts() {
      yield { concepts };
    },
  };
}

describe('syncSource', () => {
  test('first sync inserts a current row per concept and registers the source', async () => {
    await isolatedMigratedDb(async (sql) => {
      const adapter = fixtureAdapter([
        { code: 'A1', displayName: 'Alpha' },
        { code: 'B2', displayName: 'Beta' },
      ]);

      const result = await syncSource(sql, adapter);

      expect(result).toMatchObject({ sourceCode: 'test-fixture', fetched: 2, upserted: 2, versioned: 0, unchanged: 0, status: 'SUCCESS' });
      const rows = await sql`SELECT code, display_name, version, language, fim_vigencia FROM terminology.concepts WHERE source_code = 'test-fixture' ORDER BY code`;
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ code: 'A1', display_name: 'Alpha', version: '1', language: 'pt-BR', fim_vigencia: null });
      const [source] = await sql`SELECT name, kind, last_synced_at FROM terminology.sources WHERE code = 'test-fixture'`;
      expect(source).toMatchObject({ name: 'Test Fixture', kind: 'FHIR_CODESYSTEM' });
      expect(source!.last_synced_at).not.toBeNull();
    });
  });

  test('re-syncing identical data is a no-op that changes nothing', async () => {
    await isolatedMigratedDb(async (sql) => {
      const adapter = fixtureAdapter([{ code: 'A1', displayName: 'Alpha' }]);
      await syncSource(sql, adapter);

      const result = await syncSource(sql, adapter);

      expect(result).toMatchObject({ upserted: 0, versioned: 0, unchanged: 1 });
      const rows = await sql`SELECT id FROM terminology.concepts WHERE source_code = 'test-fixture'`;
      expect(rows).toHaveLength(1);
    });
  });

  test('re-syncing identical extra data is a no-op (jsonb reorders keys by length on storage, so a naive stringify comparison would falsely see a change)', async () => {
    await isolatedMigratedDb(async (sql) => {
      // Construction order (nome_fantasia, cnpj, uf) is deliberately NOT ascending-length —
      // postgres's jsonb storage always returns keys in ascending-length order (confirmed
      // live: "uf, cnpj, ..., nome_fantasia, data_registro_ans"), so a naive
      // JSON.stringify(current.extra) === JSON.stringify(extra) comparison mismatches on
      // every single re-sync of the exact same, unchanged adapter.
      const adapter = fixtureAdapter([{ code: 'A1', displayName: 'Alpha', extra: { nome_fantasia: 'X', cnpj: '123', uf: 'RJ' } }]);
      await syncSource(sql, adapter);

      const result = await syncSource(sql, adapter);

      expect(result).toMatchObject({ upserted: 0, versioned: 0, unchanged: 1 });
      const rows = await sql`SELECT id FROM terminology.concepts WHERE source_code = 'test-fixture'`;
      expect(rows).toHaveLength(1);
    });
  });

  test('re-syncing is a no-op when extra has an explicit undefined-valued key (dropped on storage, same as JSON.stringify would)', async () => {
    await isolatedMigratedDb(async (sql) => {
      // Mirrors ans-operadoras.ts: `nome_fantasia: row.NOME_FANTASIA || undefined` — the key
      // is present in the JS object but its value is undefined, exactly like an operator with
      // no trade name. Confirmed live: postgres's jsonb storage drops such keys entirely, so
      // the comparison must treat "key present but undefined" the same as "key absent".
      const adapter = fixtureAdapter([{ code: 'A1', displayName: 'Alpha', extra: { cnpj: '123', nome_fantasia: undefined, uf: 'RJ' } }]);
      await syncSource(sql, adapter);

      const result = await syncSource(sql, adapter);

      expect(result).toMatchObject({ upserted: 0, versioned: 0, unchanged: 1 });
    });
  });

  test('re-syncing a changed concept closes the old row and opens a new current one, preserving history', async () => {
    await isolatedMigratedDb(async (sql) => {
      const adapter = fixtureAdapter([{ code: 'A1', displayName: 'Alpha' }]);
      await syncSource(sql, adapter);
      const [before] = await sql`SELECT id FROM terminology.concepts WHERE source_code = 'test-fixture' AND code = 'A1'`;

      const changedAdapter = fixtureAdapter([{ code: 'A1', displayName: 'Alpha Renamed' }], '2');
      const result = await syncSource(sql, changedAdapter);

      expect(result).toMatchObject({ upserted: 0, versioned: 1, unchanged: 0 });
      const [closed] = await sql`SELECT fim_vigencia, display_name FROM terminology.concepts WHERE id = ${before!.id}`;
      expect(closed!.fim_vigencia).not.toBeNull();
      expect(closed!.display_name).toBe('Alpha'); // old row's data is untouched, only closed
      const current = await sql`SELECT id, display_name, version FROM terminology.concepts WHERE source_code = 'test-fixture' AND code = 'A1' AND fim_vigencia IS NULL`;
      expect(current).toHaveLength(1);
      expect(current[0]).toMatchObject({ display_name: 'Alpha Renamed', version: '2' });
      expect(current[0]!.id).not.toBe(before!.id);
    });
  });

  test('honors the source\'s own vigência dates instead of defaulting to now()', async () => {
    await isolatedMigratedDb(async (sql) => {
      const adapter = fixtureAdapter([{
        code: 'A1',
        displayName: 'Alpha',
        inicioVigencia: new Date('2026-08-01T00:00:00Z'),
        fimImplantacao: new Date('2026-10-31T00:00:00Z'),
      }]);

      await syncSource(sql, adapter);

      const [row] = await sql`SELECT inicio_vigencia, fim_implantacao, fim_vigencia FROM terminology.concepts WHERE source_code = 'test-fixture' AND code = 'A1'`;
      expect(row!.inicio_vigencia.toISOString()).toBe('2026-08-01T00:00:00.000Z');
      expect(row!.fim_implantacao!.toISOString()).toBe('2026-10-31T00:00:00.000Z');
      expect(row!.fim_vigencia).toBeNull();
    });
  });

  test('the partial unique index refuses a second concurrent current row for the same code', async () => {
    await isolatedMigratedDb(async (sql) => {
      await syncSource(sql, fixtureAdapter([{ code: 'A1', displayName: 'Alpha' }]));

      await expect(
        sql`INSERT INTO terminology.concepts (id, source_code, code, version, display_name)
            VALUES (gen_random_uuid()::text, 'test-fixture', 'A1', '99', 'Duplicate current row')`
      ).rejects.toThrow(/duplicate key value violates unique constraint/);
    });
  });

  test('a failed fetch is recorded as a FAILED sync run and rejects', async () => {
    await isolatedMigratedDb(async (sql) => {
      const failingAdapter: SourceAdapter = {
        sourceCode: 'test-failing',
        sourceName: 'Test Failing',
        sourceKind: 'FHIR_CODESYSTEM',
        fetchVersion: async () => '1',
        // eslint-disable-next-line require-yield
        async *fetchConcepts() {
          throw new Error('upstream unreachable');
        },
      };

      const result = await syncSource(sql, failingAdapter);

      expect(result).toMatchObject({ status: 'FAILED', error: 'upstream unreachable' });
      const [run] = await sql`SELECT status, error_message FROM terminology.sync_runs WHERE source_code = 'test-failing' ORDER BY started_at DESC LIMIT 1`;
      expect(run).toMatchObject({ status: 'FAILED', error_message: 'upstream unreachable' });
    });
  });

  test('commits each yielded batch incrementally, before the whole source finishes', async () => {
    await isolatedMigratedDb(async (sql) => {
      let sawBatch1Committed = false;
      const adapter: SourceAdapter = {
        sourceCode: 'test-incremental',
        sourceName: 'Test Incremental',
        sourceKind: 'FHIR_CODESYSTEM',
        fetchVersion: async () => '1',
        async *fetchConcepts(): AsyncGenerator<FetchedBatch> {
          yield { concepts: [{ code: 'A1', displayName: 'Alpha' }], cursor: { page: 2 } };
          // Before yielding the second batch, batch 1 must already be committed and visible
          // on this SAME connection — proving sync.ts commits per batch, not once at the end.
          const [row] = await sql`SELECT code FROM terminology.concepts WHERE source_code = 'test-incremental'`;
          sawBatch1Committed = row?.code === 'A1';
          yield { concepts: [{ code: 'B1', displayName: 'Beta' }] };
        },
      };

      const result = await syncSource(sql, adapter);

      expect(sawBatch1Committed).toBe(true);
      expect(result).toMatchObject({ fetched: 2, upserted: 2, status: 'SUCCESS' });
    });
  });

  test('resumes an orphaned RUNNING sync from its saved cursor, reusing the same run row', async () => {
    await isolatedMigratedDb(async (sql) => {
      const runId = randomUUID();
      await sql`
        INSERT INTO terminology.sources (code, name, kind) VALUES ('test-resume', 'Test Resume', 'FHIR_CODESYSTEM')
      `;
      await sql`
        INSERT INTO terminology.sync_runs (id, source_code, status, cursor, records_fetched, records_upserted, records_versioned)
        VALUES (${runId}, 'test-resume', 'RUNNING', ${sql.json({ page: 2 })}, 1, 1, 0)
      `;
      await sql`
        INSERT INTO terminology.concepts (id, source_code, code, version, display_name)
        VALUES (${randomUUID()}, 'test-resume', 'A1', '1', 'Alpha')
      `;

      const fetchConcepts = vi.fn(async function* (_onProgress: unknown, resumeCursor?: unknown): AsyncGenerator<FetchedBatch> {
        expect(resumeCursor).toEqual({ page: 2 });
        yield { concepts: [{ code: 'B1', displayName: 'Beta' }] };
      });
      const adapter: SourceAdapter = {
        sourceCode: 'test-resume',
        sourceName: 'Test Resume',
        sourceKind: 'FHIR_CODESYSTEM',
        fetchVersion: async () => '1',
        fetchConcepts,
      };

      const result = await syncSource(sql, adapter);

      expect(fetchConcepts).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ status: 'SUCCESS', upserted: 2, fetched: 2 });
      const runs = await sql`SELECT id, status FROM terminology.sync_runs WHERE source_code = 'test-resume'`;
      expect(runs).toHaveLength(1); // the orphaned row was reused, not duplicated
      expect(runs[0]).toMatchObject({ id: runId, status: 'SUCCESS' });
    });
  });
});

describe('syncAllSources', () => {
  test('with resume:true, skips a source that already has a successful run and continues with the next', async () => {
    await isolatedMigratedDb(async (sql) => {
      const aFetchConcepts = vi.fn(async function* (): AsyncGenerator<FetchedBatch> {
        yield { concepts: [{ code: 'A1', displayName: 'Alpha' }] };
      });
      const a: SourceAdapter = { sourceCode: 'source-a', sourceName: 'A', sourceKind: 'FHIR_CODESYSTEM', fetchVersion: async () => '1', fetchConcepts: aFetchConcepts };
      const b = fixtureAdapter([{ code: 'B1', displayName: 'Beta' }], '1', 'source-b');

      await syncSource(sql, a); // pre-seed a successful run for source-a
      aFetchConcepts.mockClear();

      const results = await syncAllSources(sql, [a, b], { resume: true });

      expect(aFetchConcepts).not.toHaveBeenCalled();
      expect(results[0]).toMatchObject({ sourceCode: 'source-a', skipped: true, status: 'SUCCESS' });
      expect(results[1]).toMatchObject({ sourceCode: 'source-b', status: 'SUCCESS', upserted: 1 });
    });
  });

  test('without resume, re-processes every source even if already successful', async () => {
    await isolatedMigratedDb(async (sql) => {
      const a = fixtureAdapter([{ code: 'A1', displayName: 'Alpha' }], '1', 'source-a2');
      await syncSource(sql, a);

      const results = await syncAllSources(sql, [a]);

      expect(results[0]!.skipped).toBeFalsy();
      expect(results[0]).toMatchObject({ status: 'SUCCESS', unchanged: 1 });
    });
  });
});
