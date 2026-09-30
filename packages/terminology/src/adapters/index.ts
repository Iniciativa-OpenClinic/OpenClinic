import { tuss19, tuss20, tuss22 } from './tuss.js';
import { ansOperadoras } from './ans-operadoras.js';
import { createFhirBundleAdapter } from './fhir-bundle.js';
import { cbo } from './cbo.js';
import type { SourceAdapter } from '../types.js';

// Faturamento
export { tuss19, tuss20, tuss22, ansOperadoras };

// Clínica
export const cid10 = createFhirBundleAdapter('BRCID10', 'cid10');
export const ciap2 = createFhirBundleAdapter('BRCIAP2', 'ciap2');

// Administrativa
// NOTE: BRSexo/BRSexoNascimento were expected per the original design but do not exist as
// CodeSystems in the current published IG (confirmed against the live full-ig.zip) — not
// registered here rather than guessing a wrong CodeSystem id.
export const conselhoProfissional = createFhirBundleAdapter('BRConselhoProfissional', 'conselho-profissional');
export const estadoCivil = createFhirBundleAdapter('BREstadoCivil', 'ms-estado-civil');
export const identidadeGenero = createFhirBundleAdapter('BRIdentidadeGenero', 'ms-identidade-genero');
export const racaCor = createFhirBundleAdapter('BRRacaCor', 'ms-raca-cor');
export const tipoDocumento = createFhirBundleAdapter('BRTipoDocumento', 'ms-tipo-documento');
export { cbo };

export const allAdapters: SourceAdapter[] = [
  tuss19, tuss20, tuss22,
  ansOperadoras,
  cid10, ciap2,
  conselhoProfissional, estadoCivil, identidadeGenero, racaCor, tipoDocumento,
  cbo,
];

export function adapterByCode(sourceCode: string): SourceAdapter {
  const adapter = allAdapters.find((a) => a.sourceCode === sourceCode);
  if (!adapter) throw new Error(`Unknown terminology source code: "${sourceCode}". Known codes: ${allAdapters.map((a) => a.sourceCode).join(', ')}`);
  return adapter;
}
