import fs from 'node:fs';
import path from 'node:path';

export function localPath(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || path.isAbsolute(relative)) throw new Error('Invalid repository-relative path');
  const resolved = path.resolve(root, relative);
  const realRoot = fs.realpathSync(root);
  const real = fs.realpathSync(resolved);
  const rel = path.relative(realRoot, real);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path escapes repository');
  return real;
}

export function loadCatalog(root) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'infra/compliance/scenarios/catalog.json'), 'utf8'));
  const errors = validateCatalog(catalog, root);
  if (errors.length) throw new Error(errors.join('\n'));
  return catalog;
}

export function validateCatalog(catalog, root) {
  const errors = [];
  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog?.modules) || !Array.isArray(catalog?.scenarios)) return ['Unsupported catalog format'];
  const modules = new Set();
  for (const item of catalog.modules) {
    if (!/^[a-z][a-z0-9-]*$/.test(item.id) || modules.has(item.id) || !item.title) errors.push('Invalid or duplicate module');
    modules.add(item.id);
  }
  const ids = new Set();
  for (const s of catalog.scenarios) {
    if (!/^[A-Z][A-Z0-9]*-[A-Z0-9]+-\d{3}$/.test(s.id) || ids.has(s.id)) errors.push('Invalid or duplicate scenario ID: ' + s.id);
    ids.add(s.id);
    if (!modules.has(s.module)) errors.push(s.id + ': unknown module');
    for (const field of ['title', 'applicability', 'cleanup', 'coverageNote']) if (typeof s[field] !== 'string' || !s[field].trim()) errors.push(s.id + ': missing ' + field);
    for (const field of ['preconditions', 'steps', 'expected', 'sources']) if (!Array.isArray(s[field]) || !s[field].length || s[field].some(v => typeof v !== 'string' || !v.trim())) errors.push(s.id + ': invalid ' + field);
    if (!['active', 'draft', 'retired'].includes(s.status) || !['P0', 'P1', 'P2', 'P3'].includes(s.priority) || typeof s.required !== 'boolean') errors.push(s.id + ': invalid lifecycle');
    if (!['unit', 'http', 'postgres', 'browser', 'manual', 'distribution'].includes(s.method)) errors.push(s.id + ': invalid method');
    if (!Array.isArray(s.tests)) { errors.push(s.id + ': tests must be an array'); continue; }
    for (const source of s.sources ?? []) {
      try { localPath(root, source.split('#')[0]); } catch { errors.push(s.id + ': missing/unsafe source ' + source); }
    }
    for (const t of s.tests) {
      if (!t.gate || !t.title || !['partial', 'full'].includes(t.coverage)) errors.push(s.id + ': invalid test mapping');
      try {
        const file = localPath(root, t.file);
        if (!/\.(?:spec|test)\.(?:ts|tsx|mjs|js)$/.test(file) || !fs.readFileSync(file, 'utf8').includes(t.title)) errors.push(s.id + ': test title not found');
      } catch { errors.push(s.id + ': missing/unsafe test file'); }
    }
  }
  return errors;
}

export function selectScenarios(catalog, scope = 'all') {
  const modules = scope.split(',');
  if (scope !== 'all' && modules.some(id => !catalog.modules.some(m => m.id === id))) throw new Error('Unknown scope: ' + scope);
  return catalog.scenarios.filter(s => s.status === 'active' && (scope === 'all' || modules.includes(s.module)));
}

export function coverageRows(scenarios, gates = []) {
  return scenarios.map(s => ({
    id: s.id, module: s.module, required: s.required, method: s.method,
    mapping: s.tests.length ? (s.tests.every(t => t.coverage === 'full') ? 'full' : 'partial') : 'gap',
    result: 'NOT_VERIFIED',
    relatedGates: [...new Set(s.tests.map(t => t.gate))].map(id => ({ id, status: gates.find(g => g.id === id)?.status ?? 'NOT_RUN' })),
  }));
}
