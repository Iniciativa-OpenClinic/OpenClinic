import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { buildApp } from '../app.js';
import { normalizeOpenApi30 } from '../config/openapi-normalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportOpenApi(): Promise<void> {
  // Use mock or dummy connection string for spec generation if DB is not reachable
  const app = await buildApp({
    dbUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/openclinic',
  });

  await app.ready();

  const rawOpenApi = app.swagger();
  const openapiObject = normalizeOpenApi30(rawOpenApi);

  // Root workspace docs openapi directory
  const rootOpenApiDir = path.resolve(__dirname, '../../../../docs/openapi');

  if (!fs.existsSync(rootOpenApiDir)) {
    fs.mkdirSync(rootOpenApiDir, { recursive: true });
  }

  const jsonContent = JSON.stringify(openapiObject, null, 2);
  const yamlContent = YAML.stringify(openapiObject);

  // Write JSON
  const rootJsonPath = path.join(rootOpenApiDir, 'openapi.json');
  fs.writeFileSync(rootJsonPath, jsonContent, 'utf-8');

  // Write YAML
  const rootYamlPath = path.join(rootOpenApiDir, 'openapi.yaml');
  fs.writeFileSync(rootYamlPath, yamlContent, 'utf-8');

  console.log(`✅ Contrato OpenAPI exportado com sucesso:`);
  console.log(`   📄 JSON: ${rootJsonPath}`);
  console.log(`   📄 YAML: ${rootYamlPath}`);

  await app.close();
}

exportOpenApi().catch((err) => {
  console.error('❌ Erro ao exportar contrato OpenAPI:', err);
  process.exit(1);
});
