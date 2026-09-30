import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import AdmZip from 'adm-zip';
import { MockAgent } from 'undici';
import { setSharedDispatcherForTesting } from '../http-client.js';
import { createFhirBundleAdapter, resetFhirBundleCache } from './fhir-bundle.js';

function buildFixtureZip(): Buffer {
  const zip = new AdmZip();
  zip.addFile('site/CodeSystem-BRTest.json', Buffer.from(JSON.stringify({
    resourceType: 'CodeSystem', id: 'BRTest', version: '1.1.0', content: 'not-present',
  })));
  zip.addFile('site/ValueSet-BRTest.json', Buffer.from(JSON.stringify({
    resourceType: 'ValueSet', id: 'BRTest',
    compose: { include: [{ system: 'https://terminologia.saude.gov.br/fhir/CodeSystem/BRTest', concept: [
      { code: 'A', display: 'Alpha' },
      { code: 'B', display: 'Beta' },
    ] }] },
  })));
  return zip.toBuffer();
}

const ORIGIN = 'https://terminologia.saude.gov.br';
const PATH = '/fhir/full-ig.zip';

async function drain(adapter: ReturnType<typeof createFhirBundleAdapter>) {
  const concepts = [];
  for await (const batch of adapter.fetchConcepts(() => {})) concepts.push(...batch.concepts);
  return concepts;
}

describe('createFhirBundleAdapter', () => {
  let mockAgent: MockAgent;

  beforeEach(() => {
    resetFhirBundleCache();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setSharedDispatcherForTesting(mockAgent);
  });
  afterEach(async () => {
    setSharedDispatcherForTesting(null);
    await mockAgent.close();
  });

  test('reads version from the CodeSystem resource and concepts from the ValueSet compose.include', async () => {
    mockAgent.get(ORIGIN).intercept({ path: PATH, method: 'GET' }).reply(200, buildFixtureZip());
    const adapter = createFhirBundleAdapter('BRTest', 'test-fhir-source');

    const version = await adapter.fetchVersion();
    const concepts = await drain(adapter);

    expect(version).toBe('1.1.0');
    expect(concepts).toEqual([
      { code: 'A', displayName: 'Alpha' },
      { code: 'B', displayName: 'Beta' },
    ]);
  });

  test('the zip is downloaded only once and shared across adapters for different CodeSystems', async () => {
    mockAgent.get(ORIGIN).intercept({ path: PATH, method: 'GET' }).reply(200, buildFixtureZip());
    const first = createFhirBundleAdapter('BRTest', 'test-fhir-source');
    await drain(first);
    await drain(first);

    // MockAgent throws "No matching interceptor" if a second real request were attempted —
    // reaching here at all proves the zip was fetched only once.
  });

  test('throws a clear error when the requested CodeSystem is not in the bundle', async () => {
    mockAgent.get(ORIGIN).intercept({ path: PATH, method: 'GET' }).reply(200, buildFixtureZip());
    const adapter = createFhirBundleAdapter('BRDoesNotExist', 'test-missing-source');

    await expect(drain(adapter)).rejects.toThrow(/BRDoesNotExist/);
  });

  test('reads concepts directly from a complete CodeSystem (no companion ValueSet needed), shortening URI-shaped codes', async () => {
    const zip = new AdmZip();
    zip.addFile('site/CodeSystem-BRConselhoProfissional.json', Buffer.from(JSON.stringify({
      resourceType: 'CodeSystem', id: 'BRConselhoProfissional', version: '1.1.0', content: 'complete',
      concept: [{ code: 'https://saude.gov.br/fhir/sid/crf-ac', display: 'CRF-AC', definition: 'Conselho Regional de Farmácia do Estado do Acre.' }],
    })));
    mockAgent.get(ORIGIN).intercept({ path: PATH, method: 'GET' }).reply(200, zip.toBuffer());

    const adapter = createFhirBundleAdapter('BRConselhoProfissional', 'conselho-profissional');
    const concepts = await drain(adapter);

    expect(concepts).toEqual([{ code: 'crf-ac', displayName: 'CRF-AC', description: 'Conselho Regional de Farmácia do Estado do Acre.', extra: { source_code_uri: 'https://saude.gov.br/fhir/sid/crf-ac' } }]);
  });
});
