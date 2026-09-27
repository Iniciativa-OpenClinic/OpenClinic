# 🏥 OpenClinic — Visão do Projeto, Governança Open Source & Guia de Apresentação

> Banco versionado: o procedimento vigente de instalação, adoção, migrations, demonstração opcional e clonagem está no [guia de operação do banco](../infra/database/README.md). O SQL mestre e o seed Docker foram substituídos por migrations; exemplos históricos de bootstrap abaixo não devem ser usados para atualizar bancos existentes.

---

## 1. 🎯 Visão Geral do Projeto OpenClinic

O **OpenClinic** é uma plataforma moderna e aberta de **Prontuário Eletrônico do Paciente (PEP)** e **Gestão Clínica**, concebida desde o primeiro dia com os seguintes pilares fundamentais:

- **API Aberta por Padrão:** Contraponto direto aos sistemas proprietários de mercado que fecham dados de saúde e restringem integrações.
- **Interoperabilidade em Saúde:** Projetado para adoção do padrão internacional **HL7 FHIR** em bundles clínicos.
- **Segurança da Informação e Conformidade Regulatória:** Atendimento a normas rigorosas de dados sensíveis (LGPD, HIPAA ready), com trilha de auditoria permanente e imutável (`sys_audit_logs`), isolamento multi-tenant e política de não-exclusão destrutiva de dados clínicos (soft-delete).
- **Licenciamento Copyleft Forte:** Licenciado sob a **GNU Affero General Public License v3 (AGPL-3.0)**, garantindo que o software permaneça sempre livre e código aberto, mesmo quando executado como serviço em nuvem.

---

## 2. 🏛 Arquitetura do Software (Monorepo TypeScript)

O ecossistema é estruturado como um Monorepo modular e desacoplado:

| Pacote | Finalidade | Tecnologias Principais |
| :--- | :--- | :--- |
| **`@openclinic/core`** | Primitivas compartilhadas de segurança, criptografia, logging e exceções. | TypeScript, Argon2id, JWT (HS256), Pino Logger, RFC 7807 Problem Details. |
| **`@openclinic/backend-api`** | API REST corporativa com Clean Architecture e controle de acesso híbrido (RBAC + ACL). | Fastify 5.x, Drizzle ORM, PostgreSQL, Zod, Vitest. |
| **`@openclinic/backend-cli`** | CLI administrativa de infraestrutura, migrações DDL e carga de dados inicial (*seed*). | Commander.js, TSX, Postgres.js. |
| **`@openclinic/frontend-webapp`** | Aplicação SPA reativa com controle de permissões dinâmicas e internacionalização. | React 19, Vite 6, Tailwind CSS, Lucide Icons, Vitest. |

### Invariantes de Engenharia & Clean Code (P0)

1. **Argon2id (RFC 9106):** Hashing dinâmico obrigatório para todas as credenciais de acesso (zero senhas em texto claro).
2. **Proteção contra Timing Attacks:** Comparações criptográficas via `crypto.timingSafeEqual`.
3. **Segurança em Memória no Frontend:** Tokens de acesso JWT mantidos estritamente em memória no React (zero armazenamento de JWT em `localStorage`).
4. **Erros Padronizados (RFC 7807):** Respostas de exceção no padrão Problem Details com suporte a múltiplos idiomas (`pt-BR` / `en-US`).
5. **Auditoria Contínua:** Registro automático de acessos, falhas de autenticação, bloqueios por força bruta e mutações administrativas em `sys_audit_logs`.

---

## 3. 🛡 Matriz de Conformidade e Qualidade Arquitetural

O OpenClinic adota uma esteira de governança e garantia de qualidade organizada por ordem estrita de prioridade de entrega:

```text
[P0: Segurança & Criptografia] ➔ [P1: Linter & Tipagem Estrita] ➔ [P2: Schemas SQL DDL] ➔ [P3: Testes Unitários] ➔ [P4: i18n & UX] ➔ [P5: Contratos OpenAPI]
```

- **P0 - Segurança Máxima:** Zero bypass em autenticação, proteção anti-brute-force com lockout automático de 15 minutos e auditoria granular.
- **P1 - Tipagem Estrita:** TypeScript com `strict = true` em todos os pacotes monorepo (0 erros em `npm run typecheck`).
- **P2 - Banco Agnóstico:** Schema ANSI SQL com chaves primárias UUID v4 geradas na camada de aplicação via `crypto.randomUUID()`.
- **P3 - Pirâmide de Testes:** Cobertura de testes unitários em Vitest para 100% das regras de negócio, use cases de IAM e internacionalização.
- **P4 - Internacionalização Nativa:** Mensagens de erro (`ERR_*`) e sucesso (`MSG_*`) centralizadas em dicionários sem strings mágicas soltas no código.
- **P5 - Contratos REST Sincronizados:** O código e a especificação OpenAPI nascem juntos em cada Pull Request.

---

## 4. 🌐 Governança e Processos no GitHub para Open Source

### A. Estratégia de Lançamento e Ciclo de Vida

```text
┌───────────────────────────────┐     ┌───────────────────────────────┐     ┌───────────────────────────────┐
│   FASE 1: Incubação / MVP     │ ──> │   FASE 2: Beta Colaborativo   │ ──> │   FASE 3: Lançamento Público  │
│ - Repositório Privado (Org)   │     │ - Equipe do Grupo Convidada   │     │ - Repositório Público         │
│ - Módulo Auth & Monorepo OK   │     │ - Cadastros, Agenda e PEP     │     │ - Versão v1.0.0 (SemVer)      │
│ - CI/CD & Regras de PR ativas │     │ - Revisão contínua de PRs     │     │ - Comunidade global aberta    │
└───────────────────────────────┘     └───────────────────────────────┘     └───────────────────────────────┘
```

1. **Repositório Inicial:** Mantido inicialmente sob a organização `Iniciativa-OpenClinic` (ou conta do mantenedor) com acesso restrito aos contribuidores do grupo.
2. **Admissão de Contribuidores:** Membros do grupo de trabalho recebem permissão de colaborador para envio de branches e abertura de Pull Requests.
3. **Abertura Pública (v1.0):** Quando o escopo funcional mínimo (Auth + Cadastros + Prontuário Básico) for homologado, o repositório é tornado **Público** com tag oficial de lançamento.

### B. Artefatos de Comunidade Essenciais

- **`LICENSE`**: GNU Affero General Public License v3 (AGPL-3.0).
- **`CONTRIBUTING.md`**: Guia de onboarding para desenvolvedores, convenção de branches (`feat/...`, `fix/...`), commits atômicos e obrigatoriedade de testes.
- **`.github/workflows/ci.yml`**: Esteira automatizada de Integração Contínua (CI) que executa `npm run typecheck` e `npm test` em cada Push e Pull Request.

### C. Regras de Branch e Proteção de Código

- Branch `main` protegida contra commits diretos (`force-push` bloqueado).
- Merge de código condicionado a:
  1. Pelo menos 1 aprovação formal de Code Review.
  2. Execução com sucesso (status verde) da pipeline de CI no GitHub Actions.

---

## 5. ⚡ Guia de Inicialização Rápida (Onboarding para o Grupo)

Para qualquer desenvolvedor do grupo baixar e rodar a aplicação localmente:

### 1. Clonar e Instalar

```bash
git clone https://github.com/Iniciativa-OpenClinic/OpenClinic.git openclinic
cd openclinic
npm install
```

### 2. Provisionar o Banco de Dados (1 Clique)

```powershell
npm run db:setup
```

> O script inicializa o banco `openclinic`, as roles com privilégios mínimos (`openclinic_owner` e `openclinic_app`), executa o DDL completo e gera os dados iniciais de teste.

### 3. Executar a Aplicação

```bash
# Terminal 1: Backend Fastify API (porta 3000)
npm run dev:api

# Terminal 2: Frontend React Webapp (porta 5173)
npm run dev:webapp
```

Acesse no navegador: **`http://localhost:5173`**

### 4. Perfis de Acesso e Credenciais de Desenvolvimento

O comando de seed (`npm run db:seed -- --demo`), opcional em banco local vazio, provisiona contas para cada nível de autoridade da hierarquia RBAC:

| Papel (`UserRole`) | Escopo de Autoridade | Descrição Funcional |
| :--- | :--- | :--- |
| **`OWNER`** | Governança Global e Gestão de Tenants | Acesso total irrestrito a configurações de plataforma, auditoria e instâncias multi-tenant. |
| **`ADMIN`** | Gestão de Unidade e Governança Local | Gestão de contas de usuários, grupos clínicos, catálogos de permissões e parâmetros operacionais. |
| **`USER`** | Atendimento Clínico e Operacional | Execução do prontuário eletrônico (PEP), agendamentos, triagem e registros assistenciais. |

> As credenciais padrão do ambiente local utilizam a senha inicial de desenvolvimento (`temp1234`), conforme documentado no [`README.md`](../README.md) e provisionado pelo utilitário CLI.
