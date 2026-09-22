#!/usr/bin/env node

/**
 * =============================================================================
 * 🚀 OPENCLINIC - INTERACTIVE DEVELOPER SETUP ASSISTANT
 * =============================================================================
 * Cross-platform script (Windows / Linux / macOS) for automated environment
 * diagnostics, Docker stack management, and zero-friction onboarding.
 * =============================================================================
 */

import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..');
const STACKS_DIR = resolve(ROOT_DIR, 'infra', 'docker', 'stacks');
const SECRETS_DIR = resolve(ROOT_DIR, 'secrets');

// ANSI Color codes for clean and clear terminal output
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

function banner() {
  console.log(`\n${C.cyan}${C.bold}============================================================${C.reset}`);
  console.log(`${C.cyan}${C.bold}  🏥 OPENCLINIC - ASSISTENTE DE SETUP & DOCKER STACKS       ${C.reset}`);
  console.log(`${C.cyan}${C.bold}  (Onboarding Fluido e Automação de Ambientes)              ${C.reset}`);
  console.log(`${C.cyan}${C.bold}============================================================${C.reset}\n`);
}

/**
 * Execute command synchronously and return stdout or null if failed
 */
function runCommand(cmd, options = {}) {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, stdio: options.stdio || 'pipe', encoding: 'utf-8' }).trim();
  } catch (err) {
    if (options.throwOnError) throw err;
    return null;
  }
}

/**
 * Check if a network port is in use locally
 */
function isPortAvailable(port) {
  return new Promise((res) => {
    const server = createServer();
    server.once('error', () => res(false));
    server.once('listening', () => {
      server.close();
      res(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Pre-flight system diagnostics
 */
async function runDiagnostics() {
  console.log(`${C.bold}🔍 Verificando pré-requisitos do sistema...${C.reset}\n`);
  const checks = [];

  // 1. Docker CLI
  const dockerVersion = runCommand('docker --version');
  if (dockerVersion) {
    console.log(`  ${C.green}✔ Docker CLI instalado:${C.reset} ${dockerVersion}`);
    checks.push(true);
  } else {
    console.log(`  ${C.red}✖ Docker CLI não encontrado!${C.reset} Por favor, instale o Docker: https://docs.docker.com/get-docker/`);
    checks.push(false);
  }

  // 2. Docker Daemon liveness
  const dockerInfo = runCommand('docker info');
  if (dockerInfo) {
    console.log(`  ${C.green}✔ Docker Daemon ativo e respondendo.${C.reset}`);
    checks.push(true);
  } else {
    console.log(`  ${C.red}✖ Docker Daemon não está em execução!${C.reset} Inicie o Docker Desktop ou o serviço Docker antes de continuar.`);
    checks.push(false);
  }

  // 3. Docker Compose v2
  const composeVersion = runCommand('docker compose version');
  if (composeVersion) {
    console.log(`  ${C.green}✔ Docker Compose v2 disponível:${C.reset} ${composeVersion}`);
    checks.push(true);
  } else {
    console.log(`  ${C.red}✖ Plugin 'docker compose' não encontrado!${C.reset}`);
    checks.push(false);
  }

  // 4. Ports check
  const port5432 = await isPortAvailable(5432);
  const port3000 = await isPortAvailable(3000);
  const port80 = await isPortAvailable(80);

  if (!port5432) {
    console.log(`  ${C.yellow}⚠ Porta 5432 (PostgreSQL) já está em uso no host.${C.reset} Verifique se já existe outro banco rodando.`);
  }
  if (!port3000) {
    console.log(`  ${C.yellow}⚠ Porta 3000 (API) já está em uso no host.${C.reset}`);
  }
  if (!port80) {
    console.log(`  ${C.yellow}⚠ Porta 80 (WebApp) em uso.${C.reset} O Nginx pode precisar de porta alternativa (ex: 8080 via WEBAPP_PORT).`);
  }

  const allPassed = checks.every(Boolean);
  if (!allPassed) {
    console.log(`\n${C.red}${C.bold}❌ Pré-requisitos pendentes. Corrija os pontos acima e tente novamente.${C.reset}\n`);
    process.exit(1);
  }
  console.log(`\n  ${C.green}${C.bold}✔ Todos os pré-requisitos essenciais foram validados com sucesso!${C.reset}\n`);
}

/**
 * Ensure local development secrets exist in ./secrets/
 */
function ensureLocalSecrets() {
  const secretFiles = [
    { target: 'openclinic-dev-app-postgres-credentials.json', example: 'openclinic-dev-app-postgres-credentials.example.json' },
    { target: 'openclinic-dev-owner-postgres-credentials.json', example: 'openclinic-dev-owner-postgres-credentials.example.json' },
    { target: 'openclinic-dev-postgres-password.txt', example: 'openclinic-dev-postgres-password.example.txt' },
    { target: 'openclinic-dev-jwt-secret.txt', example: 'openclinic-dev-jwt-secret.example.txt' },
  ];

  let createdCount = 0;
  for (const { target, example } of secretFiles) {
    const targetPath = resolve(SECRETS_DIR, target);
    const examplePath = resolve(SECRETS_DIR, example);

    if (!existsSync(targetPath)) {
      if (existsSync(examplePath)) {
        copyFileSync(examplePath, targetPath);
        createdCount++;
      } else {
        // Fallback default creation
        if (target.includes('jwt')) {
          writeFileSync(targetPath, 'openclinic-dev-jwt-super-secret-key-32chars');
        } else if (target.includes('owner')) {
          writeFileSync(targetPath, JSON.stringify({ host: 'postgres', port: 5432, database: 'openclinic', user: 'postgres', password: 'openclinic_postgres_password' }, null, 2));
        } else if (target.includes('postgres-password')) {
          writeFileSync(targetPath, 'openclinic_postgres_password');
        } else {
          writeFileSync(targetPath, JSON.stringify({ host: 'postgres', port: 5432, database: 'openclinic', user: 'openclinic_app', password: 'openclinic_app_password' }, null, 2));
        }
        createdCount++;
      }
    }
  }

  if (createdCount > 0) {
    console.log(`  ${C.green}✔ Arquivos de segredos locais inicializados em ./secrets/${C.reset}`);
  }
}

/**
 * Display Swarm / VPS Secret creation commands with interactive generator
 */
async function showSwarmSecretsGuide(rl) {
  console.log(`\n${C.cyan}${C.bold}============================================================${C.reset}`);
  console.log(`${C.cyan}${C.bold}  🔐 GERADOR DE SECRETS PARA DOCKER SWARM / VPS             ${C.reset}`);
  console.log(`${C.cyan}${C.bold}============================================================${C.reset}\n`);

  let env = 'prod';
  let generateRandom = true;

  if (rl) {
    const envInput = await rl.question(`Informe o ambiente [prod / stage / dev, padrão: prod]: `);
    const chosen = envInput.trim().toLowerCase();
    if (['prod', 'stage', 'dev'].includes(chosen)) env = chosen;

    const genInput = await rl.question(`Deseja gerar senhas criptográficas aleatórias automaticamente? [S/n]: `);
    generateRandom = genInput.trim().toLowerCase() !== 'n';
  }

  const appPassword = generateRandom ? randomBytes(24).toString('base64url') : 'SUA_SENHA_FORTE_APP';
  const ownerPassword = generateRandom ? randomBytes(24).toString('base64url') : 'SUA_SENHA_FORTE_OWNER';
  const postgresPassword = generateRandom ? randomBytes(24).toString('base64url') : 'SUA_SENHA_FORTE_POSTGRES';
  const jwtSecret = generateRandom ? randomBytes(32).toString('base64url') : 'SUA_CHAVE_JWT_ALEATORIA_COM_MINIMO_32_CARACTERES';

  console.log(`\nCopie e execute os comandos abaixo na VPS Manager para registrar os segredos no Swarm:\n`);

  console.log(`${C.yellow}# 1. Credenciais da Aplicação (Fastify API - DML / Leitura e Escrita)${C.reset}`);
  console.log(`printf '{"host":"postgres","port":5432,"database":"openclinic","user":"openclinic_app","password":"${appPassword}"}' | docker secret create openclinic-${env}-app-postgres-credentials -\n`);

  console.log(`${C.yellow}# 2. Credenciais do Proprietário (Migrações / DDL via CLI)${C.reset}`);
  console.log(`printf '{"host":"postgres","port":5432,"database":"openclinic","user":"openclinic_owner","password":"${ownerPassword}"}' | docker secret create openclinic-${env}-owner-postgres-credentials -\n`);

  console.log(`${C.yellow}# 3. Senha de Superusuário PostgreSQL (Container do Banco - Secrets-First)${C.reset}`);
  console.log(`printf '${postgresPassword}' | docker secret create openclinic-${env}-postgres-password -\n`);

  console.log(`${C.yellow}# 4. Segredo Criptográfico de Assinatura JWT (String Pura / .txt)${C.reset}`);
  console.log(`printf '${jwtSecret}' | docker secret create openclinic-${env}-jwt-secret -\n`);

  if (generateRandom) {
    console.log(`${C.green}${C.bold}✔ Senhas aleatórias de alta entropia geradas com sucesso!${C.reset}`);
    console.log(`${C.dim}Salve as credenciais acima em um cofre de senhas seguro (ex: 1Password, Bitwarden, KeePass).${C.reset}\n`);
  }

  if (rl) {
    const applyNow = await rl.question(`Deseja criar esses segredos agora no cluster Docker Swarm? [s/N]: `);
    if (applyNow.trim().toLowerCase() === 's') {
      const swarmState = runCommand('docker info --format "{{.Swarm.LocalNodeState}}"') || 'inactive';
      if (swarmState.trim() !== 'active') {
        console.log(`\n  ${C.yellow}ℹ Docker Swarm inativo nesta máquina (status: ${swarmState.trim()}).${C.reset}`);
        console.log(`  ${C.dim}• No Docker Desktop / Compose local: os segredos são lidos automaticamente de ./secrets/ via volume.${C.reset}`);
        console.log(`  ${C.dim}• Na VPS com Docker Swarm: inicialize o cluster ('docker swarm init') e execute os comandos acima.${C.reset}\n`);
      } else {
        try {
          const s1 = `openclinic-${env}-app-postgres-credentials`;
          const s2 = `openclinic-${env}-owner-postgres-credentials`;
          const s3 = `openclinic-${env}-postgres-password`;
          const s4 = `openclinic-${env}-jwt-secret`;

          execSync(`docker secret create ${s1} -`, {
            input: JSON.stringify({ host: 'postgres', port: 5432, database: 'openclinic', user: 'openclinic_app', password: appPassword }),
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          console.log(`  ${C.green}✔ Secret criado: ${s1}${C.reset}`);

          execSync(`docker secret create ${s2} -`, {
            input: JSON.stringify({ host: 'postgres', port: 5432, database: 'openclinic', user: 'openclinic_owner', password: ownerPassword }),
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          console.log(`  ${C.green}✔ Secret criado: ${s2}${C.reset}`);

          execSync(`docker secret create ${s3} -`, {
            input: postgresPassword,
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          console.log(`  ${C.green}✔ Secret criado: ${s3}${C.reset}`);

          execSync(`docker secret create ${s4} -`, {
            input: jwtSecret,
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          console.log(`  ${C.green}✔ Secret criado: ${s4}${C.reset}`);
          console.log(`\n${C.green}${C.bold}✔ Todos os secrets foram registrados com sucesso no Docker Swarm!${C.reset}\n`);
        } catch (err) {
          console.log(`\n  ${C.red}Erro ao registrar secrets no Swarm: ${err.message}${C.reset}`);
          console.log(`  ${C.dim}Verifique se já existem secrets com o mesmo nome ('docker secret ls'). Para recriar, remova-os ('docker secret rm <nome>').${C.reset}\n`);
        }
      }
    }
  }
}

/**
 * Execute child process interactively
 */
function spawnInteractive(command, args, options = {}) {
  return new Promise((res, rej) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: true,
      ...options,
    });
    child.on('close', (code) => {
      if (code === 0) res(0);
      else rej(new Error(`Comando '${command} ${args.join(' ')}' encerrou com código ${code}`));
    });
    child.on('error', rej);
  });
}

/**
 * Wait for PostgreSQL container to report healthy
 */
async function waitForPostgresHealthy(containerName = 'openclinic-db', maxAttempts = 30) {
  process.stdout.write(`  ⏳ Aguardando PostgreSQL ficar pronto (${containerName})... `);
  for (let i = 1; i <= maxAttempts; i++) {
    const health = runCommand(`docker inspect --format="{{.State.Health.Status}}" ${containerName}`);
    if (health === 'healthy') {
      console.log(`${C.green}${C.bold}Pronto! (healthy)${C.reset}`);
      return true;
    }
    await new Promise((r) => setTimeout(r, 2000));
    process.stdout.write('.');
  }
  console.log(`\n${C.yellow}⚠ Tempo limite aguardando status 'healthy'. Tentando continuar...${C.reset}`);
  return false;
}

/**
 * Quickstart Flow: Complete All-in-One Stack
 */
async function startQuickstart(rl, options = {}) {
  console.log(`\n${C.bold}🚀 Modo Selecionado: Quickstart Local Completo (openclinic-db-api-webapp-local.yml)${C.reset}`);
  console.log(`  Este modo inicializa o PostgreSQL 17, compila/sobe a API e o WebApp, e configura o banco.\n`);

  // Pergunta sobre usuários de teste vs superadmin
  let useDemo = options.demo;
  if (useDemo === undefined) {
    console.log(`${C.cyan}${C.bold}Opções de Dados Iniciais do Banco de Dados:${C.reset}`);
    console.log(`  [1] ${C.bold}Apenas Superadministrador${C.reset} (Recomendado para início limpo / produção)`);
    console.log(`  [2] ${C.bold}Superadministrador + Usuários e Dados de Demonstração${C.reset} (Médicos, pacientes, agendamentos - Recomendado para testes/dev)`);
    const demoAnswer = await rl.question(`\nEscolha uma opção [1 ou 2, padrão: 2]: `);
    useDemo = demoAnswer.trim() === '1' ? false : true;
  }

  ensureLocalSecrets();

  const stackFile = resolve(STACKS_DIR, 'openclinic-db-api-webapp-local.yml');
  console.log(`\n${C.bold}Resumo da Ação:${C.reset}`);
  console.log(`  • Stack:       ${stackFile}`);
  console.log(`  • Modo dados:  ${useDemo ? 'Superadministrador + Demonstração Completa' : 'Apenas Superadministrador'}`);
  console.log(`  • Endereços:   WebApp (http://localhost:80), API Docs (http://localhost:3000/docs)`);

  const confirm = await rl.question(`\n${C.yellow}Deseja iniciar a stack agora? [S/n]: ${C.reset}`);
  if (confirm.trim().toLowerCase() === 'n') {
    console.log(`Operação cancelada pelo usuário.`);
    return;
  }

  console.log(`\n${C.cyan}▶ Subindo containers com Docker Compose...${C.reset}`);
  await spawnInteractive('docker', ['compose', '-f', stackFile, 'up', '-d', '--build']);

  await waitForPostgresHealthy('openclinic-db');

  console.log(`\n${C.cyan}▶ Executando provisionamento inicial do banco de dados (migrações + roles)...${C.reset}`);
  if (useDemo) {
    await spawnInteractive('npm', ['run', 'cli', '--', 'db:setup', '--demo']);
  } else {
    await spawnInteractive('npm', ['run', 'cli', '--', 'db:setup']);
  }

  console.log(`\n${C.green}${C.bold}============================================================${C.reset}`);
  console.log(`${C.green}${C.bold}  🎉 OPENCLINIC CONFIGURADO E PRONTO PARA USO!              ${C.reset}`);
  console.log(`${C.green}${C.bold}============================================================${C.reset}\n`);
  console.log(`  🌐 ${C.bold}Frontend WebApp:${C.reset}   http://localhost (ou http://localhost:80)`);
  console.log(`  📚 ${C.bold}Swagger / OpenAPI:${C.reset} http://localhost:3000/docs`);
  console.log(`  💓 ${C.bold}API Healthcheck:${C.reset}   http://localhost:3000/health/live`);
  console.log(`  🔑 ${C.bold}Superadmin Inicial:${C.reset} Role OWNER (configurado no console acima)\n`);
}

/**
 * Standalone Database Flow with Two-Phase Bootstrap Support
 */
async function startDbOnly(rl) {
  const initStackFile = resolve(STACKS_DIR, 'openclinic-db-init.yml');
  const operationalStackFile = resolve(STACKS_DIR, 'openclinic-db.yml');

  console.log(`\n${C.bold}🐘 Gerenciamento do Banco de Dados PostgreSQL 17${C.reset}`);
  console.log(`  [1] ⚡ ${C.bold}Inicialização em Duas Fases${C.reset} (Stack descartável Init -> Stack Operacional Limpa)`);
  console.log(`  [2] 🚀 ${C.bold}Subir Apenas Stack Operacional${C.reset} (Cluster já inicializado no volume persistente)`);
  console.log(`  [3] 🧹 ${C.bold}Parar Containers do Banco de Dados${C.reset}`);
  console.log(`  [0] ↩ ${C.dim}Voltar ao menu anterior${C.reset}\n`);

  const choice = await rl.question(`Escolha uma opção [0-3, padrão: 1]: `);
  const trimmed = choice.trim();

  if (trimmed === '0') return;
  if (trimmed === '3') {
    runCommand(`docker compose -f "${operationalStackFile}" down`);
    runCommand(`docker compose -f "${initStackFile}" down`);
    console.log(`${C.green}✔ Containers do banco de dados parados.${C.reset}\n`);
    return;
  }

  if (trimmed === '2') {
    console.log(`\n${C.cyan}▶ Subindo stack operacional do PostgreSQL (openclinic-db.yml)...${C.reset}`);
    await spawnInteractive('docker', ['compose', '-f', operationalStackFile, 'up', '-d']);
    await waitForPostgresHealthy('openclinic-db');
    console.log(`\n${C.green}✔ PostgreSQL operacional em execução.${C.reset}`);
    console.log(`Para rodar a API localmente no terminal conectando neste banco:`);
    console.log(`  npm run dev:api\n`);
    return;
  }

  // Two-Phase Initialization Flow
  console.log(`\n${C.bold}⚙ Selecione o Ambiente de Inicialização:${C.reset}`);
  console.log(`  [1] 💻 ${C.bold}Desenvolvimento Local${C.reset} (Autenticação trust / senha padrão, máxima fluidez)`);
  console.log(`  [2] 🛡️  ${C.bold}Produção / VPS${C.reset} (Senha do superuser solicitada dinamicamente ou gerada)`);

  const envChoice = await rl.question(`\nEscolha o ambiente [1 ou 2, padrão: 1]: `);
  const isProd = envChoice.trim() === '2';

  let postgresPassword = '';
  let authMethod = 'trust';

  if (isProd) {
    authMethod = 'scram-sha-256';
    console.log(`\n${C.cyan}${C.bold}Definição de Senha do Superusuário (postgres):${C.reset}`);
    console.log(`  [1] Digitar uma senha forte manualmente`);
    console.log(`  [2] Gerar senha criptográfica forte aleatória automaticamente (recomendado)`);
    const pwdChoice = await rl.question(`Opção [1 ou 2, padrão: 2]: `);

    if (pwdChoice.trim() === '1') {
      const manualPwd = await rl.question(`Digite a senha do superuser postgres: `);
      postgresPassword = manualPwd.trim();
      if (!postgresPassword) {
        console.log(`${C.red}A senha não pode ser vazia em produção. Operação abortada.${C.reset}\n`);
        return;
      }
    } else {
      postgresPassword = randomBytes(24).toString('base64url');
      console.log(`\n  🔑 ${C.yellow}${C.bold}Senha forte gerada:${C.reset} ${C.green}${C.bold}${postgresPassword}${C.reset}`);
      console.log(`  ${C.dim}Guarde esta senha para manutenções emergenciais diretas no cluster.${C.reset}\n`);
    }
  } else {
    postgresPassword = 'openclinic_postgres_password';
    authMethod = 'trust';
  }

  console.log(`\n${C.cyan}▶ Fase 1: Executando container descartável de inicialização (openclinic-db-init.yml)...${C.reset}`);
  const envVars = {
    ...process.env,
    DB_USER: 'postgres',
    DB_PASS: postgresPassword,
    POSTGRES_PASSWORD: postgresPassword,
    POSTGRES_HOST_AUTH_METHOD: authMethod,
  };

  await spawnInteractive('docker', ['compose', '-f', initStackFile, 'up', '-d'], { env: envVars });
  await waitForPostgresHealthy('openclinic-db-init');

  console.log(`\n${C.green}✔ Volume persistente (openclinic_postgres_data) inicializado com sucesso!${C.reset}`);
  console.log(`${C.cyan}▶ Descartando container temporário de inicialização...${C.reset}`);
  await spawnInteractive('docker', ['compose', '-f', initStackFile, 'down']);

  console.log(`\n${C.cyan}▶ Fase 2: Subindo stack operacional contínua (openclinic-db.yml - sem senhas no YAML)...${C.reset}`);
  await spawnInteractive('docker', ['compose', '-f', operationalStackFile, 'up', '-d']);
  await waitForPostgresHealthy('openclinic-db');

  console.log(`\n${C.green}${C.bold}============================================================${C.reset}`);
  console.log(`${C.green}${C.bold}  🐘 POSTGRESQL INICIALIZADO E OPERACIONAL COM SUCESSO!     ${C.reset}`);
  console.log(`${C.green}${C.bold}============================================================${C.reset}\n`);
  console.log(`  • Stack Operacional: infra/docker/stacks/openclinic-db.yml`);
  console.log(`  • Status: Container ativo e pronto para receber conexões da aplicação.`);
  console.log(`  • Dica: Para rodar a API localmente conectando neste banco:`);
  console.log(`    npm run dev:api\n`);
}

/**
 * App Only Flow
 */
async function startAppOnly(rl) {
  const stackFile = resolve(STACKS_DIR, 'openclinic-api-webapp.yml');
  console.log(`\n${C.bold}🌐 Modo Selecionado: Apenas Aplicação (openclinic-api-webapp.yml)${C.reset}`);
  console.log(`  Arquivo: ${stackFile}`);
  console.log(`  ${C.yellow}Atenção: Requer a rede 'postgres_network' e os secrets do Swarm configurados.${C.reset}`);

  const confirm = await rl.question(`\n${C.yellow}Deseja iniciar a stack de aplicação? [S/n]: ${C.reset}`);
  if (confirm.trim().toLowerCase() === 'n') return;

  await spawnInteractive('docker', ['compose', '-f', stackFile, 'up', '-d']);
  console.log(`\n${C.green}✔ Stack de aplicação iniciada!${C.reset}\n`);
}

/**
 * Standalone Production VPS Flow (Single-Node VPS)
 */
async function startProdVps(rl) {
  const stackFile = resolve(STACKS_DIR, 'openclinic-db-api-webapp.yml');
  console.log(`\n${C.bold}🛡️  Modo Selecionado: Produção VPS Standalone (openclinic-db-api-webapp.yml)${C.reset}`);
  console.log(`  Arquivo: ${stackFile}`);
  console.log(`  ${C.yellow}Atenção: Projetado para VPS única com Traefik (HTTPS 80/443) e Docker Secrets.${C.reset}`);

  const confirm = await rl.question(`\n${C.yellow}Deseja iniciar a stack de produção VPS? [S/n]: ${C.reset}`);
  if (confirm.trim().toLowerCase() === 'n') return;

  await spawnInteractive('docker', ['compose', '-f', stackFile, 'up', '-d']);
  console.log(`\n${C.green}✔ Stack de produção VPS iniciada!${C.reset}\n`);
}

/**
 * Stop and Clean Stacks Flow
 */
async function stopStacks(rl) {
  console.log(`\n${C.bold}🛑 Parar e Limpar Containers do OpenClinic${C.reset}`);
  console.log(`  [1] 💻 Parar Stack Local (openclinic-db-api-webapp-local.yml)`);
  console.log(`  [2] 🛡️ Parar Stack Produção VPS (openclinic-db-api-webapp.yml)`);
  console.log(`  [3] 🌐 Parar Stack Desacoplada - Aplicação (openclinic-api-webapp.yml)`);
  console.log(`  [4] 🐘 Parar Stack Desacoplada - Banco de Dados (openclinic-db.yml)`);
  console.log(`  [5] 🛑 Parar Todas as Stacks`);

  const choice = await rl.question(`\nEscolha uma opção [1-5]: `);
  const stacks = {
    '1': ['openclinic-db-api-webapp-local.yml'],
    '2': ['openclinic-db-api-webapp.yml'],
    '3': ['openclinic-api-webapp.yml'],
    '4': ['openclinic-db.yml'],
    '5': [
      'openclinic-db-api-webapp-local.yml',
      'openclinic-db-api-webapp.yml',
      'openclinic-api-webapp.yml',
      'openclinic-db.yml',
      'openclinic-db-init.yml'
    ]
  };

  const selectedStacks = stacks[choice.trim()];
  if (!selectedStacks) {
    console.log(`${C.yellow}Opção inválida. Retornando ao menu principal.${C.reset}\n`);
    return;
  }

  const removeVolumes = await rl.question(`Deseja remover os volumes persistentes também? (CUIDADO: apaga dados do PostgreSQL) [s/N]: `);
  const extraArgs = removeVolumes.trim().toLowerCase() === 's' ? ['down', '-v', '--remove-orphans'] : ['down', '--remove-orphans'];

  for (const stack of selectedStacks) {
    const filePath = resolve(STACKS_DIR, stack);
    if (existsSync(filePath)) {
      console.log(`\n${C.cyan}Parando stack: ${stack}...${C.reset}`);
      await spawnInteractive('docker', ['compose', '-f', filePath, ...extraArgs]);
    }
  }

  console.log(`\n${C.green}✔ Operação concluída com sucesso!${C.reset}\n`);
}

/**
 * Main Entrypoint
 */
async function main() {
  banner();
  await runDiagnostics();

  const args = process.argv.slice(2);
  const rl = createInterface({ input, output });

  try {
    if (args.includes('--help') || args.includes('-h')) {
      console.log(`Uso: npm run setup [opções]`);
      console.log(`Opções:`);
      console.log(`  --quickstart    Inicializa diretamente a stack completa local`);
      console.log(`  --demo          Inclui dados de demonstração no quickstart`);
      console.log(`  --secrets       Exibe comandos de criação de secrets para o Swarm`);
      console.log(`  --stop          Finaliza os containers em execução`);
      console.log(`  --help          Exibe esta ajuda\n`);
      return;
    }

    if (args.includes('--secrets')) {
      await showSwarmSecretsGuide(rl);
      return;
    }

    if (args.includes('--quickstart')) {
      await startQuickstart(rl, { demo: args.includes('--demo') });
      return;
    }

    if (args.includes('--stop')) {
      await stopStacks(rl);
      return;
    }

    // Interactive Menu
    while (true) {
      console.log(`${C.bold}Selecione a ação desejada:${C.reset}`);
      console.log(`  [1] 🚀 ${C.bold}Quickstart Local Completo${C.reset} (Postgres + API + WebApp + Setup do Banco)`);
      console.log(`  [2] 🛡️ ${C.bold}Subir Produção VPS Standalone${C.reset} (openclinic-db-api-webapp.yml com Traefik)`);
      console.log(`  [3] 🐘 ${C.bold}Subir Apenas Banco de Dados${C.reset} (PostgreSQL isolado para dev no host)`);
      console.log(`  [4] 🌐 ${C.bold}Subir Apenas Aplicação${C.reset} (API + WebApp conectando a banco externo)`);
      console.log(`  [5] 🔐 ${C.bold}Gerador de Comandos de Secrets para Docker Swarm / VPS${C.reset}`);
      console.log(`  [6] 🛑 ${C.bold}Parar Containers / Limpar Stacks${C.reset}`);
      console.log(`  [0] 🚪 ${C.dim}Sair${C.reset}\n`);

      const option = await rl.question(`Digite o número da opção desejada [0-6]: `);

      switch (option.trim()) {
        case '1':
          await startQuickstart(rl);
          return;
        case '2':
          await startProdVps(rl);
          return;
        case '3':
          await startDbOnly(rl);
          return;
        case '4':
          await startAppOnly(rl);
          return;
        case '5':
          await showSwarmSecretsGuide(rl);
          break;
        case '6':
          await stopStacks(rl);
          break;
        case '0':
          console.log(`Até logo!\n`);
          return;
        default:
          console.log(`${C.yellow}Opção inválida. Tente novamente.${C.reset}\n`);
          break;
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(`\n${C.red}❌ Erro inesperado no assistente de setup:${C.reset}`, err.message || err);
  process.exit(1);
});
