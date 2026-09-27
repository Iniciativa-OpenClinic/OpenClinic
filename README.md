# OpenClinic

![OpenClinic](docs/assets/logo.png)

## Prontuário eletrônico médico open source, com API aberta desde a concepção

Um contraponto aos prontuários de mercado que fecham seu ecossistema e não liberam suas APIs.

[![Licença](https://img.shields.io/badge/licen%C3%A7a-AGPL--3.0-2E7D9A?style=flat-square)](./LICENSE)
[![Status](https://img.shields.io/badge/status-pr%C3%A9--alfa-E8A33D?style=flat-square)](./docs/roadmap.md)
[![Padrão](https://img.shields.io/badge/interoperabilidade-HL7%20FHIR-3B6FB0?style=flat-square)](./docs/decisions/0001-fhir-como-padrao-de-dados.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?style=flat-square&logo=fastify&logoColor=white)](https://www.fastify.io/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](./CONTRIBUTING.md)

[![Entrar no grupo de WhatsApp](https://img.shields.io/badge/ENTRAR%20NO%20GRUPO%20DE%20WHATSAPP-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/LPxRX9ivXUm6VF4atVKYW7)

### É no grupo que a conversa do projeto acontece

## 📑 Sumário

1. [Por que este projeto existe](#por-que-este-projeto-existe)
2. [O que torna isto difícil](#o-que-torna-isto-difícil)
3. [Arquitetura & Estrutura do Monorepo](#-arquitetura--estrutura-do-monorepo)
4. [Inicialização Rápida (Onboarding)](#-inicialização-rápida-onboarding)
5. [Execução com Docker & Compose](#-execução-com-docker--compose)
6. [Credenciais de Teste Padrão](#-credenciais-de-teste-padrão)
7. [Padrões de Engenharia & Segurança](#-padrões-de-engenharia--segurança)
8. [Comandos de Qualidade & Testes](#-comandos-de-qualidade--testes)
9. [Como este projeto decide](#como-este-projeto-decide)
10. [Como participar](#como-participar)
11. [Documentação](#documentação)
12. [Licença & Idioma](#licença)

---

## Por que este projeto existe

Prontuários eletrônicos comerciais, em geral, fecham seus dados. Sair de um fornecedor ou integrar outro sistema costuma ser difícil, caro ou simplesmente impossível. A clínica gera os dados, mas depende da boa vontade de quem vende o software para acessá-los.

O OpenClinic nasce como contraponto: um prontuário cujo código é aberto e cuja API é, desde o primeiro dia, tratada como um produto tão importante quanto a própria interface. E cuja licença, a [AGPL-3.0](./LICENSE), impede que alguém pegue o que nasceu aberto e feche.

Missão, princípios e escopo completos em [`vision.md`](./docs/vision.md).

## O que torna isto difícil

Um prontuário parece um CRUD. Não é.

O **[HL7 FHIR](https://www.hl7.org/fhir/)** não é um formato de exportação que se acrescenta no fim. No OpenClinic, ele é a forma como o sistema pensa ([decisão 0001](./docs/decisions/0001-fhir-como-padrao-de-dados.md)). O padrão organiza informação em *bundles*: conjuntos montados para fazer sentido a quem lê, reunindo dados de várias entidades e repetindo o que o contexto clínico exigir. Um banco relacional quer exatamente o oposto: normalizar, separar, não repetir nada.

Esse descasamento **não é um obstáculo que se resolve uma vez e passa**. Ele reaparece a cada recurso novo que o sistema implementa: um esquema que responde bem a um recurso pode inviabilizar a consulta que outro exige. É a restrição que governa cada decisão de modelagem deste projeto, e vai continuar governando.

Some-se o que a regulação exige de um prontuário, e que molda o modelo de dados antes da primeira linha de código:

- Nada é apagado de verdade: exclusão marca, não remove.
- Toda informação carrega de onde veio e quem a registrou, de forma permanente.
- O registro precisa sobreviver **vinte anos**.
- Dados de clínicas diferentes nunca se encostam (isolamento multi-tenant rigoroso).
- Quem acessou o quê fica registrado em trilha que ninguém pode editar.

Nenhum desses requisitos é opcional. O mapeamento completo das normas está em [`compliance.md`](./docs/compliance.md); os requisitos de produto, em [`prd.md`](./docs/prd.md).

### Se isso te parece um problema interessante em vez de um aborrecimento, você é o tipo de pessoa que este projeto procura

---

## 🏛 Arquitetura & Estrutura do Monorepo

O sistema foi estruturado sob os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)** pragmático e um **Monorepo NPM em TypeScript**:

```text
openclinic/
├── packages/
│   ├── core/               # Primitivas compartilhadas, criptografia, logging, erros RFC 7807
│   ├── backend-api/        # API REST Fastify 5.x, RBAC/ACL, autenticação e casos de uso
│   ├── backend-cli/        # Utilitários de CLI, DDL migrations e seeding
│   └── frontend-webapp/    # SPA React 19 + Vite 6, autenticação segura em memória e i18n
├── infra/
│   ├── compliance/         # Auditorias, cenários canônicos e relatórios locais
│   ├── database/           # DDL versionado linear com Drizzle ORM (0000_baseline, 0001_catalog)
│   ├── docker/             # Imagens Docker e configuração Nginx do frontend
│   ├── secrets/            # Gestão de segredos para orquestração e deploy seguro
│   └── stacks/             # Stacks Docker Swarm / Portainer para deploy em produção
└── docs/                   # Central de especificações, decisões (ADRs) e governança
```

| Pacote | Caminho | Descrição |
| :--- | :--- | :--- |
| **`@openclinic/core`** | [`packages/core`](./packages/core) | Primitivas compartilhadas, DTOs clínicos canônicos, criptografia Argon2id, JWT, pooling de DB e erros RFC 7807. |
| **`@openclinic/backend-api`** | [`packages/backend-api`](./packages/backend-api) | API REST Fastify 5.x estruturada em Clean Architecture (Use Cases, Repositories e Presentation), RBAC e auditoria. |
| **`@openclinic/backend-cli`** | [`packages/backend-cli`](./packages/backend-cli) | CLI multiplataforma para provisionamento de roles, migrations DDL e seed do banco. |
| **`@openclinic/frontend-webapp`** | [`packages/frontend-webapp`](./packages/frontend-webapp) | SPA em React 19 + Vite 6 com autenticação em memória, menus adaptativos, i18n bilíngue e gestão clínica. |

---

## ⚡ Inicialização Rápida (Onboarding)

### 1. Pré-requisitos

- **Node.js:** `>= 20.0.0` (recomendado Node 22+)
- **NPM:** `>= 10.0.0`
- **Docker & Docker Compose:** Para banco de dados PostgreSQL 17

### 2. Instalação de Dependências

```bash
git clone https://github.com/Iniciativa-OpenClinic/OpenClinic.git openclinic
cd openclinic
npm install
```

### 3. Subir o Banco de Dados Local

Suba o container do PostgreSQL isoladamente:

```bash
docker compose up -d db
```

### 4. Provisionamento e Migrations DDL

Configure seu arquivo local `.env` (baseado em [`.env.example`](./.env.example)) e aplique as migrations versionadas:

```bash
npm run build -w packages/core
npm run db:setup
```

> O comando `npm run db:setup` aplica a baseline de 19 tabelas, insere o catálogo de recursos do sistema e provisiona o Superadministrador padrão.

### 5. Executar em Modo de Desenvolvimento

Abra dois terminais na raiz do projeto:

```bash
# Terminal 1: Backend API Fastify (porta 3000)
npm run dev:api

# Terminal 2: Frontend Webapp React 19 (porta 5173)
npm run dev:webapp
```

- **Frontend Webapp:** [`http://localhost:5173`](http://localhost:5173)
- **API Swagger UI:** [`http://localhost:3000/docs`](http://localhost:3000/docs)
- **Health Check:** [`http://localhost:3000/health/live`](http://localhost:3000/health/live)

---

## 🐳 Execução com Docker & Compose

Você pode subir a stack completa (**Banco PostgreSQL 17**, **Backend API Fastify** e **Frontend Webapp React/Nginx**) de forma imediata:

```bash
# Opção 1: Assistente interativo do projeto (Recomendado)
npm run setup
# Ou diretamente pelo terminal: .\setup.ps1 (Windows) ou ./setup.sh (Linux/macOS)

# Opção 2: Execução direta da Stack Unificada Local (Build a partir do código-fonte)
docker compose -f infra/docker/stacks/openclinic-db-api-webapp-local.yml up --build -d
```

> 📖 **Documentação e Guias Oficiais de Infraestrutura:**
>
> - [**Catálogo Arquitetural das Stacks Docker**](./infra/docker/stacks/README.md): Matriz de decisão entre as 5 stacks (Desenvolvimento Local, VPS Única de Produção com Traefik/SSL e Clusters Desacoplados Swarm/Portainer), convenções de portas e gestão de secrets.
> - [**Manual de Instalação e Operação via Docker**](./docs/docker-installation-guide.md): Guia passo a passo com fluxo de onboarding, migrações, scripts de seed e topologias de produção.

### URLs de Acesso Local

| Serviço | URL | Descrição |
| :--- | :--- | :--- |
| **Frontend Webapp** | [`http://localhost`](http://localhost) | Interface Web servida via Nginx reverso (porta 80) |
| **Backend REST API** | [`http://localhost:3000`](http://localhost:3000) | API REST Fastify 5.x |
| **Swagger UI** | [`http://localhost:3000/docs`](http://localhost:3000/docs) | Documentação interativa OpenAPI 3.0/3.1 |
| **Health Check** | [`http://localhost:3000/health/live`](http://localhost:3000/health/live) | Verificação de integridade dos serviços |
| **PostgreSQL Local** | `localhost:5432` | Banco acessível diretamente para ferramentas (DBeaver, psql) |

### Comandos Úteis do Compose

```bash
# Visualizar logs da stack local
docker compose -f infra/docker/stacks/openclinic-db-api-webapp-local.yml logs -f

# Parar os serviços locais
docker compose -f infra/docker/stacks/openclinic-db-api-webapp-local.yml down

# Estado e atualização incremental do banco
npm run db:status
npm run db:migrate
```

---

## 🔑 Credenciais de Teste Padrão

### 1. Superadministrador Inicial (Instalação Automática)

Provisionado automaticamente no `npm run db:setup` ou ao subir a stack Docker:

| Papel (RBAC) | Usuário (Username) | E-mail de Acesso | Senha Padrão | Perfil de Acesso |
| :--- | :--- | :--- | :--- | :--- |
| **`OWNER`** | `superadmin` | `superadmin@openclinic.local` | **`temp1234`** | Acesso irrestrito a governança, tenants, configurações e gestão de usuários |

### 2. Base de Demonstração (Opcional)

Para popular o banco local com perfis de atendimento (recepcionista, enfermeira, médico cardiologista e administrador), execute:

```bash
npm run db:seed -- --demo
```

#### (Todas as contas de demonstração utilizam a senha padrão `temp1234`)

---

## 🛡 Padrões de Engenharia & Segurança

- **Separação Canônica (ARCH vs BUSINESS):**
  - **`ARCH`:** Governança, autenticação, IAM, controle de acesso e multi-tenancy (`sys_*` e `iam_*`).
  - **`BUSINESS`:** Prontuário, pacientes, encontros clínicos e cadastros (`app_*`).
- **Segurança Criptográfica (P0):**
  - Senhas com derivação de chave **Argon2id** (salt dinâmico).
  - Prevenção a timing attacks com `crypto.timingSafeEqual`.
  - **Zero JWT em LocalStorage:** Tokens de acesso JWT residem estritamente em memória volátil, com refresh tokens seguros em cookies HttpOnly.
  - Formato de erro padronizado conforme a especificação RFC 7807 (*Problem Details*).
- **English Everywhere:** Código, tipos TypeScript, variáveis, commits, tabelas SQL e contratos de API são estritamente em **Inglês**. Mensagens de interface em Português residem em dicionários i18n centralizados.

---

## 🛠 Comandos de Qualidade & Testes

```bash
# Verificação estrita de tipagem em todos os 4 pacotes (zero erros)
npm run typecheck

# Execução da suíte completa de testes automatizados (287 testes)
npm test

# Compilação de todos os pacotes do monorepo
npm run build

# Exportação estática dos contratos OpenAPI (JSON e YAML)
npm run export:openapi
```

---

## Como este projeto decide

Toda decisão de arquitetura vira um documento com contexto, consequências assumidas e, obrigatoriamente, as alternativas descartadas e o motivo. Ficam em **[`docs/decisions/`](./docs/decisions/)** e **[`docs/adr/`](./docs/adr/)**, que são sempre a fonte atual do que já está fechado e do que segue em aberto.

Três regras valem aqui:

**Argumento é assinado.** Quem defende uma posição assina. O projeto não atribui opinião a ninguém por conta própria.

**Tese vencida não é apagada.** Ela permanece no registro, explicando o que já foi pesado. Discordar e perder não apaga sua contribuição do histórico do projeto.

**Decisão não se fecha com gente ausente.** Encaminhamento verbal no fim de uma reunião, com participantes fora da sala, não vale como decisão tomada.

Isso quer dizer que aqui se defende ideia por escrito e se aceita ser contrariado em público. Dá mais trabalho que abrir um pull request e sumir, e é de propósito. Detalhes em [`GOVERNANCE.md`](./GOVERNANCE.md).

## Como participar

**A conversa do projeto acontece no [grupo de WhatsApp](https://chat.whatsapp.com/LPxRX9ivXUm6VF4atVKYW7). Entre.** Se o link estiver expirado, avise por uma [Issue](../../issues).

Quem chega de fora, ou prefere um canal público e permanente, **abre uma [Issue](../../issues)**, que é a porta registrada e pesquisável do projeto, e o time responde por lá.

A contribuição mais valiosa hoje é **ajudar a fechar as decisões que ainda estão em aberto**. Elas estão marcadas como tal no [índice de decisões](./docs/decisions/), e são as mais caras de reverter depois. Traga sua posição ao grupo ou registre-a numa Issue: posição assinada entra no registro da decisão.

Experiência especialmente bem-vinda: **HL7 FHIR e interoperabilidade em saúde**, **modelagem de dados clínicos**, **segurança da informação em dado sensível** e **quem já operou um prontuário na prática** e sabe onde dói. **Não é preciso programar para contribuir**: donos e gestores de clínica são parte da comunidade que este projeto quer formar, e o que eles sabem da operação orienta o desenho tanto quanto o código. Guia completo em [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Documentação

| Documento | O que contém |
| :--- | :--- |
| [`docs/vision.md`](./docs/vision.md) | Missão, problema, princípios e escopo do projeto |
| [`docs/prd.md`](./docs/prd.md) | O que o sistema precisa fazer, e por quê |
| [`docs/modulos.md`](./docs/modulos.md) | Proposta de arquitetura de módulos da V1 |
| [`docs/cadastros.md`](./docs/cadastros.md) | Dicionário de dados dos cadastros clínicos |
| [`docs/project-specification.md`](./docs/project-specification.md) | Especificação técnica de arquitetura e fundação IAM |
| [`docs/database-schema.md`](./docs/database-schema.md) | Modelagem DDL de banco de dados e constraints |
| [`docs/iam-rbac-acl-backend-architecture.md`](./docs/iam-rbac-acl-backend-architecture.md) | Arquitetura de segurança, IAM, RBAC e ACL |
| [`docs/openapi/README.md`](./docs/openapi/README.md) | Especificação e contratos da API (OpenAPI 3.0.3) |
| [`docs/openapi/swagger.md`](./docs/openapi/swagger.md) | Guia de uso da interface interativa Swagger UI |
| [`docs/conformidade-sbis.md`](./docs/conformidade-sbis.md) | Matriz de rastreabilidade da certificação SBIS v5.2 |
| [`docs/decisions/`](./docs/decisions/) | Decisões de arquitetura da comunidade |
| [`docs/adr/`](./docs/adr/) | Architecture Decision Records (ADRs) técnicas de código |
| [`docs/compliance.md`](./docs/compliance.md) | Normas brasileiras aplicáveis (LGPD, ANVISA, SBIS, RNDS, TISS) |
| [`docs/docker-installation-guide.md`](./docs/docker-installation-guide.md) | Manual passo a passo de instalação e operação via Docker |
| [`docs/DEVELOPMENT_README.md`](./docs/DEVELOPMENT_README.md) | Guia técnico aprofundado do monorepo para desenvolvedores |
| [`docs/roadmap.md`](./docs/roadmap.md) | As fases e roadmap do projeto |
| [`docs/reunioes/`](./docs/reunioes/) | O que cada reunião decidiu e deixou em aberto |
| [`GOVERNANCE.md`](./GOVERNANCE.md) | Como o projeto é conduzido e regras de governança |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Guia de contribuição e fluxo de Pull Requests |
| [`SECURITY.md`](./SECURITY.md) | Como reportar vulnerabilidades de segurança |

## Licença

Distribuído sob a **[GNU Affero General Public License v3.0](./LICENSE)**.

Qualquer pessoa pode usar, modificar e hospedar o OpenClinic, inclusive comercialmente, desde que mantenha as modificações abertas sob a mesma licença. Existe também a previsão de uma licença comercial alternativa para quem não puder cumprir essa condição. Detalhes e limites em [`licensing.md`](./docs/licensing.md).

Copyright © 2026 Dr. Daniel Dorta Santiago de Carvalho Duarte, CRM 174209, e colaboradores do OpenClinic.

## Idioma

A documentação deste repositório é escrita em português, que é onde está a comunidade do projeto, e brasileira é a regulação que o condiciona. Código, identificadores, tipos, mensagens de commit e a especificação da API seguem o padrão internacional e são escritos em inglês.

---

### Iniciativa OpenClinic
