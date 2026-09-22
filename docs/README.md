# 📚 Central de Documentação Técnica - OpenClinic

Bem-vindo à documentação oficial do projeto **OpenClinic**. Este repositório de documentação centraliza todas as especificações funcionais, decisões arquiteturais (ADRs), diretrizes de segurança, modelagem do banco de dados e contratos de integração da plataforma.

---

## 🧭 Índice Geral da Documentação

### 1. 🏛 Visão Geral & Especificações

- [**Especificação Funcional e Técnica (SRS)**](./project-specification.md): Módulos, requisitos não-funcionais, regras clínicas e arquitetura geral.
- [**Apresentação e Governança do Projeto**](./project-presentation-and-governance.md): Objetivos estratégicos, ecossistema open-source e governança institucional.

### 2. 📐 Arquitetura do Sistema

- [**Diretrizes e Decisões Arquiteturais**](./architectural-decisions-and-guidelines.md): Padrões de Clean Architecture, separação de contextos (`ARCH` vs `BUSINESS`) e Clean Code.
- [**Visão Geral de Camadas (Overview)**](./architecture.md): Estrutura de diretórios, monorepo e responsabilidades de cada pacote.
- [**Architecture Decision Records (ADR)**](./adr/README.md):
  - [ADR 0001: Registro de Decisões de Arquitetura](./adr/0001-record-architecture-decisions.md)
  - [ADR 0002: Taxonomia Canônica ARCH vs BUSINESS](./adr/0002-canonical-architecture-taxonomy-arch-vs-business.md)
  - [ADR 0003: Invariantes de Autenticação e Segurança](./adr/0003-authentication-and-security-invariants.md)
  - [ADR 0004: Seleção do Drizzle ORM sobre Prisma](./adr/0004-persistence-strategy-drizzle-orm-over-prisma.md)

### 3. 🗄 Banco de Dados & Persistência

- [**Schema e Modelagem de Dados**](./database-schema.md): DDL canônico, convenções de nomenclatura (`sys_*`, `iam_*`, `app_*`), índices e constraints.
- [**Desacoplamento e Arquitetura UUID**](./database-decoupling-and-uuid-architecture.md): Uso de UUID v4 como chave primária gerada na aplicação.
- [**Drizzle ORM vs Stored Procedures**](./database-access-drizzle-vs-stored-procedures.md): Justificativa para orquestração em TypeScript sem lock-in em banco.
- [**Seleção de ORM (Drizzle vs Prisma)**](./database-orm-selection-drizzle-vs-prisma.md): Benchmark e análise comparativa de performance.

### 4. 🛡 Segurança & Identidade (IAM / RBAC / ACL)

- [**Fase 0 — Contratos e limites de identidade, sessões e autorização**](./auth-spec.md): comportamento-alvo local, premissas D01–D03 revisáveis e critérios de aceite das próximas fases; controles ainda não implementados.
- [**Arquitetura de IAM, RBAC e ACL**](./iam-rbac-acl-backend-architecture.md): Matriz de permissões, papéis de usuário (`OWNER`, `ADMIN`, `USER`), grupos clínicos e auditoria.
- [**Controle de Acesso e Perfis de Usuário**](./user-roles-and-access-control.md): Detalhamento dos níveis de privilégio e escopos.
- [**Módulo de Autenticação**](./authentication-module.md): Argon2id, tokens JWT efêmeros e Silent Refresh Token em memória.

### 5. 🌐 Internacionalização & Idiomas

- [**Padronização de Idiomas e Diretrizes de i18n**](./language-standardization-and-i18n.md): Política *English Everywhere* no código e dicionários centralizados em `locales/pt-br.ts` e `locales/en-us.ts`.

### 6. 🔌 Contratos de API & OpenAPI

- [**Central de Contratos OpenAPI (Hub)**](./openapi/README.md): Visão geral dos contratos, arquitetura de segurança, catálogo de endpoints e comandos de exportação.
- [**Guia do Swagger UI Interativo**](./openapi/swagger.md): Como acessar o Swagger no navegador (`/docs`) e efetuar login e autorização Bearer.
- [**Contrato OpenAPI 3.0.3 (JSON)**](./openapi/openapi.json): Especificação completa dos endpoints em formato JSON (SSOT).
- [**Contrato OpenAPI 3.0.3 (YAML)**](./openapi/openapi.yaml): Especificação completa dos endpoints em formato YAML.

### 7. 🔐 Credenciais, Secrets & Variáveis de Ambiente

- [**Arquitetura de Secrets & Credenciais**](../secrets/README.md): Especificação dos provedores agnósticos suportados (`env`, `file`, `gsm`, `aws`), isolamento de roles (PoLP: `openclinic_owner` DDL vs `openclinic_app` DML), síntese dinâmica de `DATABASE_URL` em memória e padrão de arquivos de segredos (`.json` e `.txt`).
- [**Arquivo de Configuração de Ambiente (.env.example)**](../.env.example): Template oficial com variáveis atômicas e identificadores lógicos de secrets para desenvolvimento e produção.

### 8. 📋 Auditorias e Conformidade

- [**Auditoria Técnica 360° (Branch feature/auth)**](./audit-feature-auth.md): Relatório de conformidade, diagnóstico de migrations, contratos de API e checklist pré-publicação para o upstream oficial.
- [**Auditoria de Conformidade e Segurança (Setembro/2026)**](../infra/compliance/reports/README.md): Relatório de auditoria de arquitetura, integridade e conformidade de segurança.
- [**Governança de Compliance & Playbooks](../infra/compliance/README.md): Playbooks operacionais de compliance e relatórios cronológicos padronizados.

### 9. 🐳 Infraestrutura, Docker & Deploy

- [**Manual de Instalação e Execução Local via Docker**](./docker-installation-guide.md): Guia passo a passo completo para clonar, configurar variáveis `.env`, compilar e executar o OpenClinic localmente com Docker Compose e PostgreSQL.

- [Versionamento e operação do banco](../infra/database/README.md): baseline, migrations, preservação de dados, atualização remota e clonagem excepcional.
