# 🏥 OpenClinic - Prontuário Eletrônico do Paciente (PEP) Open Source

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?logo=fastify&logoColor=white)](https://www.fastify.io/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

> Plataforma moderna, segura e modular de Prontuário Eletrônico do Paciente (PEP) e Gestão Clínica desenvolvida em **TypeScript Monorepo**, **Fastify**, **React 19**, **PostgreSQL** e **Drizzle ORM**.

---

## 📑 Índice (Table of Contents)

1. [Visão Geral & Arquitetura](#-visão-geral--arquitetura)
2. [Estrutura do Monorepo](#-estrutura-do-monorepo)
3. [Guia de Inicialização Rápida (Onboarding)](#-guia-de-inicialização-rápida-onboarding)
4. [Execução com Docker & Compose](#-execução-com-docker--compose)
5. [Credenciais de Acesso e Contas Padrão](#-credenciais-de-acesso-e-contas-padrão)
6. [Separação Canônica: ARCH vs BUSINESS](#-separação-canônica-arch-vs-business)
7. [Internacionalização (i18n) & Dicionários](#-internacionalização-i18n--dicionários)
8. [Padrões de Segurança & Boas Práticas (P0)](#-padrões-de-segurança--boas-práticas-p0)
9. [Scripts e Comandos de Qualidade](#-scripts-e-comandos-de-qualidade)
10. [Central de Documentação Técnica](#-central-de-documentação-técnica)
11. [Contribuindo](#-contribuindo)
12. [Licença](#-licença)

---

## 🏛 Visão Geral & Arquitetura

O **OpenClinic** foi projetado sob os princípios de **Clean Architecture**, **Domain-Driven Design (DDD) pragmático** e **Separação Canônica de Contextos**:

- **Núcleo de Governança (`ARCH`):** Autenticação (Argon2id + JWT com rotação em memória), controle de acesso granular (IAM / RBAC / ACL), multi-tenancy e trilhas de auditoria imutáveis.
- **Núcleo Clínico e Operacional (`BUSINESS`):** Gestão de pacientes alinhada aos padrões HL7 FHIR (`app_patients`), profissionais de saúde (`app_practitioners`), atendimentos/consultas (`app_encounters`), convênios (`app_health_plans`) e procedimentos TUSS (`app_procedures`).

---

## 📦 Estrutura do Monorepo

O projeto está organizado como um Monorepo NPM com 4 pacotes desacoplados e independentes:

| Pacote | Caminho | Descrição |
| :--- | :--- | :--- |
| **`@openclinic/core`** | [`packages/core`](./packages/core) | Primitivas compartilhadas, DTOs clínicos canônicos, criptografia Argon2id, JWT, pooling de DB, Logger e erros RFC 7807. |
| **`@openclinic/backend-api`** | [`packages/backend-api`](./packages/backend-api) | API REST Fastify 5.x estruturada em Clean Architecture (Use Cases, Repositories e Presentation), RBAC e auditoria. |
| **`@openclinic/backend-cli`** | [`packages/backend-cli`](./packages/backend-cli) | CLI multiplataforma para criação de roles, migrations DDL e seed automatizado do banco. |
| **`@openclinic/frontend-webapp`** | [`packages/frontend-webapp`](./packages/frontend-webapp) | SPA em React 19 + Vite 6 com autenticação em memória, menus adaptativos, i18n bilíngue e gestão clínica. |

---

## ⚡ Guia de Inicialização Rápida (Onboarding)

### 1. Pré-requisitos

- **Node.js:** Versão `>= 20.0.0` (recomendado Node 22+)
- **NPM:** Versão `>= 10.0.0`
- **Docker & Docker Compose:** Para execução do banco PostgreSQL e containers

### 2. Instalação de Dependências

```bash
git clone https://github.com/Iniciativa-OpenClinic/OpenClinic.git openclinic
cd openclinic
npm install
```

### 3. Inicialização do Banco de Dados PostgreSQL

Suba o container do PostgreSQL isoladamente pelo Compose:

```bash
docker compose up -d db
```

### 4. Migrations e dados iniciais

Configure a conexão local em `.env` e aplique o histórico versionado:

```bash
npm run build -w packages/core
npm run db:setup
```

O setup aplica migrations de estrutura e catálogo obrigatório e valida autenticação. Não redefine senhas de roles nem cria contas fictícias automaticamente. Opcionalmente, em uma base sem dados operacionais, use `npm run db:seed -- --demo` para carregar a demonstração. Sem demonstração, crie a primeira conta com `npm run user:create-admin`.

**Banco já existente:** execute primeiro `npm run db:baseline -- --check`. A adoção preserva registros e recusa diferenças estruturais; a transição legada conhecida tem um procedimento explícito. Consulte o [guia de versionamento, atualização remota e clonagem](infra/database/README.md).

O Compose completo executa um serviço de migrations antes da API. Atualizar um container PostgreSQL ou seu volume não substitui a execução das migrations.

### 5. Executar os Servidores em Desenvolvimento

Abra dois terminais na raiz do projeto (`openclinic`):

```bash
# Terminal 1: Backend API Fastify (porta 3000)
npm run dev:api

# Terminal 2: Frontend Webapp React (porta 5173)
npm run dev:webapp
```

Acesse a aplicação no navegador em: **`http://localhost:5173`**  
Acesse a documentação interativa Swagger UI em: **`http://localhost:3000/docs`**

#### Atualização do banco

O atalho destrutivo `db:reset` foi removido. Para atualizar use `npm run db:migrate`; para substituir excepcionalmente a base remota, siga o [procedimento de clonagem com staging e backup](infra/database/README.md).

---

## 🐳 Execução com Docker & Compose

Você pode subir a stack completa (**Banco PostgreSQL 17**, **Backend API Fastify** e **Frontend Webapp React/Nginx**) com um único comando:

```bash
docker compose up --build -d
```

> 📖 **Manual Completo:** Para o guia detalhado passo a passo (instalação do Docker, configuração de variáveis `.env`, logs, migrations e troubleshooting), consulte o [**Manual de Instalação e Operação via Docker**](./docs/docker-installation-guide.md).

### URLs de Acesso

| Serviço | URL | Descrição |
| :--- | :--- | :--- |
| **Frontend Webapp** | [`http://localhost`](http://localhost) | Interface Web servida via Nginx reverso |
| **Backend REST API** | [`http://localhost:3000`](http://localhost:3000) | API REST Fastify 5.x |
| **Swagger UI** | [`http://localhost:3000/docs`](http://localhost:3000/docs) | Documentação interativa OpenAPI 3.0/3.1 |
| **Health Check** | [`http://localhost:3000/health`](http://localhost:3000/health) | Verificação de integridade dos serviços |

### Comandos Úteis do Compose

```bash
# Visualizar logs em tempo real
docker compose logs -f

# Parar os serviços
docker compose down

# Estado e atualizacao incremental do banco
npm run db:status
npm run db:migrate
```

---

## 🔑 Credenciais de Acesso e Contas Padrão

### 1. Superadministrador Inicial (Instalação Automática)

Ao inicializar o banco (`npm run db:setup` ou via `docker compose up`), o sistema provisiona automaticamente a conta do **Superadministrador**:

| Papel (RBAC) | Usuário (Username) | E-mail de Acesso | Senha Padrão | Perfil de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| **`OWNER`** | `superadmin` | `superadmin@openclinic.local` | **`temp1234`** | Acesso irrestrito a governança, tenants, configurações e gestão de usuários |

> ⚠️ **Segurança:** A senha padrão `temp1234` deve ser alterada após o primeiro acesso ou redefinida via `npm run user:reset-password`.

### 2. Contas de Demonstração (Opcional)

O seed opcional de demonstração (`npm run db:seed -- --demo`) cria as contas abaixo com a senha padrão **`temp1234`** em uma base local sem dados operacionais:

| Papel (RBAC) | Usuário (Username) | CPF de Acesso | E-mail Institucional | Cargo / Função | Perfil de Acesso |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`USER`** | `ana.souza` | `444.555.666-19` | `ana@clinica.com.br` | Atendente de Recepção | Agendamento, fila de espera, cadastro de pacientes e faturamento |
| **`USER`** | `marta.lima` | `333.444.555-08` | `marta@clinica.com.br` | Enfermeira Chefe | Triagem, acolhimento, prontuário, agenda e plantões |
| **`USER`** | `mateus.oliveira` | `222.333.444-05` | `mateus@clinica.com.br` | Médico Cardiologista | Atendimento médico, prescrições, consultas, agenda e PEP |
| **`USER`** | `marcos.ferreira` | `111.222.333-96` | `marcos@clinica.com.br` | Diretor Clínico / RT | Gestão institucional, relatórios clínicos, consultas e PEP |
| **`ADMIN`** | `lucas.santos` | `987.654.321-00` | `lucas@clinica.com.br` | Administrador de Sistemas | Gestão operacional, usuários, grupos, permissões e cadastros mestres |
| **`OWNER`** | `joao.silva` | `123.456.789-09` | `joao@clinica.com.br` | Superadministrador / Proprietário | Acesso irrestrito a plataforma, governança, tenants e configurações |

---

## 🧩 Separação Canônica: ARCH vs BUSINESS

A arquitetura do OpenClinic impõe estrita separação entre camadas de plataforma e de negócio:

- **`ARCH` (Arquitetura & Governança):**
  - Módulos de infraestrutura, IAM, ACL, autenticação e auditoria (`packages/backend-api/src/arch/`).
  - Tabelas de banco com prefixos `sys_*` (tenants, audit logs) e `iam_*` (usuários, roles, grupos, permissões).
- **`BUSINESS` (Lógica Clínica e Cadastros):**
  - Módulos de domínio, casos de uso e rotas clínicas (`packages/backend-api/src/business/`).
  - DTOs canônicos centralizados em `@openclinic/core` (`PatientDTO`, `PractitionerDTO`, `EncounterDTO`, `HealthPlanDTO`, `ProcedureDTO`).
  - Tabelas de banco com prefixo `app_*` (`app_patients`, `app_practitioners`, `app_encounters`, etc.).

---

## 🌐 Internacionalização (i18n) & Dicionários

- **Política English Everywhere:** O código-fonte, tipos TypeScript, DTOs, tabelas do PostgreSQL e parâmetros de API são 100% em **Inglês**.
- **Catálogos Centralizados:** Todas as strings de interface do usuário em Português ou Inglês residem exclusivamente em catálogos centralizados (`packages/frontend-webapp/src/i18n/locales/pt-br.ts` e `en-us.ts`).
- **Função e Hook Canônicos:** O frontend utiliza o hook `useTranslation()` e a função `t('KEY', params)` para tradução reativa.
- **Prefixos de Chave Alinhados ao Banco de Dados:**
  - `PRACTITIONER_*`: Rótulos, filtros e modais para profissionais (`app_practitioners`).
  - `HEALTH_PLAN_*`: Rótulos e cabeçalhos para operadoras de saúde (`app_health_plans`).
  - `PROCEDURE_*`: Rótulos e tabelas para códigos TUSS (`app_procedures`).
  - `GLOBAL_*`: Rótulos reutilizáveis universais (`GLOBAL_BTN_SAVE`, `GLOBAL_LABEL_NAME`, etc.).

---

## 🛡 Padrões de Segurança & Boas Práticas (P0)

1. **Zero Hardcoded Secrets:** Todas as credenciais e chaves JWT são injetadas exclusivamente via variáveis de ambiente.
2. **Hashing Criptográfico Forte:** Senhas usam **Argon2id** com salt dinâmico e custo de memória calibrado.
3. **Prevenção a Timing Attacks:** Comparações de tokens e hashes usam `crypto.timingSafeEqual`.
4. **Sem JWT em LocalStorage:** Tokens de acesso residem estritamente em memória volátil no React para mitigar ataques XSS.
5. **Erros Padronizados (RFC 7807):** Respostas de erro utilizam a especificação *Problem Details* com `type`, `title`, `status` e `detail`.
6. **Integridade de Guards:** Proibição de atalhos ou desativação de guards de autorização em qualquer rota.

---

## 🛠 Scripts e Comandos de Qualidade

```bash
# Checagem estrita de tipos em todos os 4 pacotes (0 erros esperados)
npm run typecheck

# Execução de toda a suíte de testes automatizados
npm test

# Compilar todos os pacotes do monorepo (Core, API, CLI e Frontend)
npm run build

# Exportar contratos OpenAPI atualizados (docs/openapi/openapi.json e docs/openapi/openapi.yaml)
npm run export:openapi
```

---

## 📚 Central de Documentação Técnica

Para especificações detalhadas, decisões de arquitetura e diagramas, consulte a **[Central de Documentação](./docs/README.md)**:

- 🏛 [Especificação Geral do Projeto](./docs/project-specification.md)
- 🤝 [Visão do Projeto & Governança](./docs/project-presentation-and-governance.md)
- 📐 [Diretrizes de Arquitetura & Governança](./docs/architectural-decisions-and-guidelines.md)
- 📝 [Architecture Decision Records (ADRs)](./docs/adr/README.md)
- 🗄 [Modelagem do Banco de Dados & DDL](./docs/database-schema.md)
- 🛡 [Arquitetura de IAM, RBAC e ACL](./docs/iam-rbac-acl-backend-architecture.md)
- 🔌 [Contratos OpenAPI & Especificações](./docs/openapi/README.md)
- 🖥️ [Guia Interativo do Swagger UI](./docs/openapi/swagger.md)
- 📋 [Relatório de Auditoria de Conformidade](./docs/compliance/compliance-architecture-review-2026_09_02.md)
- 🐳 [Manual de Instalação e Operação via Docker](./docs/docker-installation-guide.md)

---

## 🤝 Contribuindo

Contribuições da comunidade Open Source são muito bem-vindas! Consulte o guia em [CONTRIBUTING.md](./CONTRIBUTING.md) para diretrizes de desenvolvimento, branches e Pull Requests.

---

## 📜 Licença

Este projeto é software livre sob a licença **GNU Affero General Public License v3.0 (AGPL-3.0)**. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
