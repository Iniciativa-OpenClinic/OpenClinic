# OpenClinic — Dicionário e Referência do Esquema de Banco de Dados

> **Padrão Arquitetural**: ANSI SQL Agnóstico (Zero Vendor Lock-in).  
> **Identificadores (PK/FK)**: `VARCHAR(36)` gerados estritamente na camada de aplicação via `crypto.randomUUID()`.  
> **Campos de Controle e Enum**: `VARCHAR(20)` / `VARCHAR(50)` validados por domínio/código (Zod e TypeScript).  
> **Organização do DDL**: Ordem Alfabética Estrita de Tabelas, Restrições e Índices.

---

## 🏛 Visão Geral das 3 Camadas de Tabelas

O OpenClinic organiza seu banco de dados em 3 camadas conceituais com prefixos distintos:

```text
├── sys_*  → Governança, Instâncias Multi-tenant, Catálogo de Recursos e Trilha de Auditoria
├── iam_*  → Identidade, Usuários, Grupos, Matriz de Permissões ACL, Sessões e Defesa contra Força Bruta
└── app_*  → Domínio de Negócio Clínico: Pacientes, Colaboradores, Prontuários (PEP) e Atendimento
```

---

## 🔐 Roles & Permissões no PostgreSQL

| Role | Finalidade | Permissões |
| :--- | :--- | :--- |
| `openclinic_owner` | DDL / Migrações | Controle total sobre schema, tabelas e migrações estruturais (`ALL ON SCHEMA public`). |
| `openclinic_app` | DML / Runtime | Operações restritas de execução da aplicação (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Sem permissão de DDL. |

---

## 📋 Catálogo Completo das 19 Tabelas (Ordem Alfabética)

---

### 1. `app_appointments` — Agendamento de Consultas e Procedimentos (FHIR Appointment)

Gerencia o fluxo de marcação de horários de consultas presenciais e teleconsultas.

```sql
CREATE TABLE IF NOT EXISTS app_appointments (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    practitioner_id VARCHAR(36) NOT NULL,
    appointment_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    type VARCHAR(30) NOT NULL DEFAULT 'ROUTINE',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

| Coluna | Tipo | Restrições & Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PK | UUID v4 gerado na aplicação |
| `tenant_id` | `VARCHAR(36)` | NOT NULL, FK $\rightarrow$ `sys_tenants(id)` | Clínica / Tenant vinculado |
| `patient_id` | `VARCHAR(36)` | NOT NULL, FK $\rightarrow$ `app_patients(id)` | Paciente agendado |
| `practitioner_id` | `VARCHAR(36)` | NOT NULL, FK $\rightarrow$ `app_practitioners(id)` | Profissional de saúde |
| `appointment_date` | `TIMESTAMPTZ` | NOT NULL | Data e horário previsto da consulta |
| `duration_minutes` | `INTEGER` | DEFAULT 30 | Duração estimada do atendimento |
| `status` | `VARCHAR(20)` | DEFAULT 'SCHEDULED' | `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| `type` | `VARCHAR(30)` | DEFAULT 'ROUTINE' | `ROUTINE`, `FIRST_VISIT`, `FOLLOW_UP`, `EMERGENCY`, `TELEMEDICINE` |
| `notes` | `TEXT` | Nullable | Observações ou motivo do agendamento |
| `is_active` | `BOOLEAN` | DEFAULT TRUE | Status do registro |
| `deleted_at` | `TIMESTAMPTZ` | Nullable | Timestamp de exclusão lógica (soft delete) |

---

### 2. `app_encounters` — Atendimentos e Sessões Clínicas (FHIR Encounter)

Representa o encontro assistencial entre o paciente e o profissional de saúde.

```sql
CREATE TABLE IF NOT EXISTS app_encounters (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    practitioner_id VARCHAR(36) NOT NULL,
    appointment_id VARCHAR(36),
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    chief_complaint TEXT,
    diagnosis TEXT,
    clinical_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

| Coluna | Tipo | Restrições & Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PK | UUID v4 gerado na aplicação |
| `tenant_id` | `VARCHAR(36)` | NOT NULL, FK $\rightarrow$ `sys_tenants(id)` | Clínica / Tenant vinculado |
| `patient_id` | `VARCHAR(36)` | NOT NULL, FK $\rightarrow$ `app_patients(id)` | Paciente atendido |
| `practitioner_id` | `VARCHAR(36)` | NOT NULL, FK $\rightarrow$ `app_practitioners(id)` | Profissional de saúde responsável |
| `appointment_id` | `VARCHAR(36)` | Nullable, FK $\rightarrow$ `app_appointments(id)` | Agendamento de origem (se houver) |
| `start_time` | `TIMESTAMPTZ` | DEFAULT NOW() | Início do atendimento |
| `end_time` | `TIMESTAMPTZ` | Nullable | Término do atendimento |
| `status` | `VARCHAR(20)` | DEFAULT 'IN_PROGRESS' | `IN_PROGRESS`, `FINISHED`, `CANCELLED` |
| `chief_complaint` | `TEXT` | Nullable | Queixa principal relatada pelo paciente |
| `diagnosis` | `TEXT` | Nullable | Hipótese diagnóstica ou CID-10 |
| `clinical_notes` | `TEXT` | Nullable | Anotações clínicas e conduta adotada |
| `deleted_at` | `TIMESTAMPTZ` | Nullable | Timestamp de exclusão lógica (soft delete) |

---

### 3. `app_medical_records` — Prontuários e Evoluções (FHIR Composition / ClinicalImpression)

Armazena as evoluções clínicas, anamneses e histórico contínuo do prontuário eletrônico.

```sql
CREATE TABLE IF NOT EXISTS app_medical_records (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    encounter_id VARCHAR(36),
    record_type VARCHAR(30) NOT NULL DEFAULT 'EVOLUTION',
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    record_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

### 4. `app_organizations` — Instituições e Empresas de Saúde (FHIR Organization)

Representa a entidade jurídica, mantenedora corporativa ou instituição de saúde (Pessoa Jurídica) vinculada à contratante/tenant. O endereço registrado nesta tabela corresponde ao **domicílio fiscal e sede estatutária** da mantenedora (para fins tributários, contratuais e faturamento). Os locais físicos e operacionais de atendimento clínico residem em `app_organization_units`.

```sql
CREATE TABLE IF NOT EXISTS app_organizations (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50),
    cnpj VARCHAR(14),
    state_registration VARCHAR(30),
    municipal_registration VARCHAR(30),
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    postal_code VARCHAR(20),
    street VARCHAR(255),
    number VARCHAR(20),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

| Coluna | Tipo | Restrições & Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PK | UUID v4 gerado na aplicação |
| `tenant_id` | `VARCHAR(36)` | NOT NULL, FK $\rightarrow$ `sys_tenants(id)` | Tenant contratante |
| `legal_name` | `VARCHAR(255)` | NOT NULL | Razão Social |
| `trade_name` | `VARCHAR(255)` | Nullable | Nome Fantasia / Marca |
| `cnes` | `VARCHAR(15)` | Nullable | Cadastro Nacional de Estabelecimentos de Saúde |
| `tax_id` | `VARCHAR(50)` | Nullable | Identificador fiscal genérico / internacional |
| `cnpj` | `VARCHAR(14)` | Nullable | CNPJ matriz (14 dígitos numéricos limpos) |
| `email` | `VARCHAR(255)` | Nullable | E-mail institucional da organização |
| `phone` | `VARCHAR(20)` | Nullable | Telefone da sede |
| `website` | `VARCHAR(255)` | Nullable | URL do portal institucional |
| `postal_code` | `VARCHAR(20)` | Nullable | CEP / Código Postal |
| `street` | `VARCHAR(255)` | Nullable | Logradouro / Rua / Avenida |
| `number` | `VARCHAR(20)` | Nullable | Número predial |
| `complement` | `VARCHAR(100)` | Nullable | Complemento (sala, andar) |
| `neighborhood` | `VARCHAR(100)` | Nullable | Bairro |
| `city` | `VARCHAR(100)` | Nullable | Cidade / Município |
| `state` | `VARCHAR(100)` | Nullable | Estado / Província / Região |
| `country` | `VARCHAR(50)` | Nullable | País (ISO 3166-1 alpha-3) |
| `is_active` | `BOOLEAN` | DEFAULT TRUE | Status do registro |
| `deleted_at` | `TIMESTAMPTZ` | Nullable | Timestamp de exclusão lógica (soft delete) |

---

### 5. `app_organization_units` — Unidades e Estabelecimentos de Atendimento (FHIR Location / Facility)

Representa as unidades físicas de atendimento à saúde (Matriz e Filiais), onde ocorrem as consultas, exames e atendimentos clínicos presenciais.

```sql
CREATE TABLE IF NOT EXISTS app_organization_units (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    cnes_code VARCHAR(15),
    tax_id VARCHAR(50),
    cnpj VARCHAR(14),
    phone VARCHAR(20),
    email VARCHAR(255),
    postal_code VARCHAR(20),
    street VARCHAR(255),
    number VARCHAR(20),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(50),
    is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

| Coluna | Tipo | Restrições & Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PK | UUID v4 gerado na aplicação |
| `tenant_id` | `VARCHAR(36)` | NOT NULL, FK $\rightarrow$ `sys_tenants(id)` | Tenant contratante |
| `organization_id` | `VARCHAR(36)` | NOT NULL, FK $\rightarrow$ `app_organizations(id)` | Organização / Empresa mantenedora |
| `name` | `VARCHAR(255)` | NOT NULL | Nome da unidade (ex: "Unidade Paulista", "Matriz") |
| `trade_name` | `VARCHAR(255)` | Nullable | Nome fantasia específico da unidade |
| `cnes_code` | `VARCHAR(15)` | Nullable | Código CNES do estabelecimento de saúde |
| `tax_id` | `VARCHAR(50)` | Nullable | Identificador fiscal genérico / internacional |
| `cnpj` | `VARCHAR(14)` | Nullable | CNPJ da filial (14 dígitos numéricos limpos) |
| `phone` | `VARCHAR(20)` | Nullable | Telefone da recepção / atendimento |
| `email` | `VARCHAR(255)` | Nullable | E-mail da unidade |
| `postal_code` | `VARCHAR(20)` | Nullable | CEP / Código Postal |
| `street` | `VARCHAR(255)` | Nullable | Endereço / Logradouro |
| `number` | `VARCHAR(20)` | Nullable | Número predial |
| `complement` | `VARCHAR(100)` | Nullable | Complemento |
| `neighborhood` | `VARCHAR(100)` | Nullable | Bairro |
| `city` | `VARCHAR(100)` | Nullable | Cidade |
| `state` | `VARCHAR(100)` | Nullable | Estado / Província / Região |
| `country` | `VARCHAR(50)` | Nullable | País (ISO 3166-1 alpha-3) |
| `is_headquarters` | `BOOLEAN` | DEFAULT FALSE | Flag identificadora de sede / matriz |
| `is_active` | `BOOLEAN` | DEFAULT TRUE | Status do registro |
| `deleted_at` | `TIMESTAMPTZ` | Nullable | Timestamp de exclusão lógica (soft delete) |

---

### 6. `app_patients` — Cadastro de Pacientes (FHIR Patient)

Armazena os dados demográficos e clínicos essenciais dos pacientes com identificadores regulatórios brasileiros (CPF e CNS).

```sql
CREATE TABLE IF NOT EXISTS app_patients (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    cpf VARCHAR(11),
    cns VARCHAR(15),
    birth_date DATE,
    gender VARCHAR(20),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    emergency_contact VARCHAR(255),
    insurance_name VARCHAR(100),
    insurance_number VARCHAR(100),
    allergies_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

| Coluna | Tipo | Restrições & Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PK | UUID v4 gerado na aplicação |
| `tenant_id` | `VARCHAR(36)` | NOT NULL, FK $\rightarrow$ `sys_tenants(id)` | Clínica / Tenant vinculado |
| `full_name` | `VARCHAR(255)` | NOT NULL | Nome completo do paciente |
| `cpf` | `VARCHAR(11)` | Nullable | CPF (11 dígitos numéricos limpos) |
| `cns` | `VARCHAR(15)` | Nullable | Cartão Nacional de Saúde (SUS) |
| `birth_date` | `DATE` | Nullable | Data de nascimento |
| `gender` | `VARCHAR(20)` | Nullable | `MASCULINO`, `FEMININO`, `OUTRO` |
| `email` | `VARCHAR(255)` | Nullable | E-mail do paciente (RFC 5321) |
| `phone` | `VARCHAR(20)` | Nullable | Telefone de contato (ITU-T E.164) |
| `allergies_notes` | `TEXT` | Nullable | Alergias e alertas clínicos vitais |
| `deleted_at` | `TIMESTAMPTZ` | Nullable | Timestamp de exclusão lógica (soft delete) |

---

### 7. `app_practitioners` — Profissionais de Saúde e Colaboradores (FHIR Practitioner)

Centraliza o cadastro funcional e técnico de toda a equipe assistencial e administrativa da clínica. O vínculo com `iam_users` (`user_id`) é opcional.

```sql
CREATE TABLE IF NOT EXISTS app_practitioners (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    full_name VARCHAR(255) NOT NULL,
    cpf VARCHAR(11),
    practitioner_type VARCHAR(50) NOT NULL DEFAULT 'ADMINISTRATIVE',
    job_title VARCHAR(100),
    council_type VARCHAR(20),
    council_number VARCHAR(20),
    council_uf VARCHAR(2),
    primary_specialty VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_clinical_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

| Coluna | Tipo | Restrições & Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PK | UUID v4 gerado na aplicação |
| `tenant_id` | `VARCHAR(36)` | NOT NULL, FK $\rightarrow$ `sys_tenants(id)` | Clínica / Tenant vinculado |
| `user_id` | `VARCHAR(36)` | Nullable, FK $\rightarrow$ `iam_users(id)` | Vínculo opcional com a conta de usuário |
| `full_name` | `VARCHAR(255)` | NOT NULL | Nome completo do profissional |
| `cpf` | `VARCHAR(11)` | Nullable | CPF (11 dígitos numéricos limpos) |
| `practitioner_type` | `VARCHAR(50)` | DEFAULT 'ADMINISTRATIVE' | `CLINICAL`, `ADMINISTRATIVE`, `OPERATIONAL`, `MANAGEMENT` |
| `job_title` | `VARCHAR(100)` | Nullable | Cargo funcional ou ocupação |
| `council_type` | `VARCHAR(20)` | Nullable | CRM, COREN, CRO, CRP, CRF, etc. |
| `council_number` | `VARCHAR(20)` | Nullable | Número de registro no conselho |
| `council_uf` | `VARCHAR(2)` | Nullable | UF do conselho regional |
| `primary_specialty` | `VARCHAR(150)` | Nullable | Especialidade médica ou assistencial |
| `phone` | `VARCHAR(20)` | Nullable | Telefone institucional/contato (ITU-T E.164) |
| `email` | `VARCHAR(255)` | Nullable | E-mail profissional (RFC 5321) |
| `is_clinical_staff` | `BOOLEAN` | DEFAULT FALSE | Flag de corpo clínico assistencial |
| `deleted_at` | `TIMESTAMPTZ` | Nullable | Timestamp de exclusão lógica (soft delete) |

---

### 8. `app_prescriptions` — Receituário e Prescrições Médicas (FHIR MedicationRequest)

Prescrições medicamentosas emitidas durante o atendimento clínico.

```sql
CREATE TABLE IF NOT EXISTS app_prescriptions (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    encounter_id VARCHAR(36) NOT NULL,
    patient_id VARCHAR(36) NOT NULL,
    practitioner_id VARCHAR(36) NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    instructions TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

---

---

### 3. `iam_groups` — Grupos Funcionais de Usuários

Agrupamentos funcionais para concessão de permissões coletivas por setor.

```sql
CREATE TABLE IF NOT EXISTS iam_groups (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_id VARCHAR(36),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

---

### 4. `iam_lockouts` — Proteção Ativa Contra Ataques de Força Bruta

Registra tentativas consecutivas de senha incorreta por identificador (`email` ou `username`) e aplica bloqueio temporário após 5 falhas.

```sql
CREATE TABLE IF NOT EXISTS iam_lockouts (
    id VARCHAR(36) PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    tenant_id VARCHAR(36),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 5. `iam_permissions` — Matriz Granular de Acesso (RBAC / ACL)

Define regras de autorização granulares por recurso do sistema. Suporta concessão direta ao usuário ou herdada por grupo, com ação (`READ`, `CREATE`, `UPDATE`, `DELETE`, `EXECUTE`, `ADMIN`) e efeito (`ALLOW`, `DENY`).

```sql
CREATE TABLE IF NOT EXISTS iam_permissions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    group_id VARCHAR(36),
    resource_id VARCHAR(36) NOT NULL,
    action VARCHAR(20) NOT NULL DEFAULT 'READ',
    effect VARCHAR(20) NOT NULL DEFAULT 'ALLOW',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id VARCHAR(36),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CHECK (user_id IS NOT NULL OR group_id IS NOT NULL)
);
```

---

### 6. `iam_sessions` — Sessões Ativas e Rotação de Tokens

Armazena os hashes criptográficos SHA-256 (`token_hash`) dos Refresh Tokens emitidos, permitindo renovação de sessão e revogação instantânea (*Logout remoto*).

```sql
CREATE TABLE IF NOT EXISTS iam_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(500) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 7. `iam_user_groups` — Associação N:N entre Usuários e Grupos

Tabela associativa de ligação muitos-para-muitos entre operadores e perfis funcionais.

```sql
CREATE TABLE IF NOT EXISTS iam_user_groups (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    group_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, group_id)
);
```

---

### 8. `iam_users` — Contas de Usuários e Autenticação

Contas de acesso, dados cadastrais de login e credenciais com hash seguro **Argon2id**.

```sql
CREATE TABLE IF NOT EXISTS iam_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    cpf VARCHAR(11),
    hashed_password VARCHAR(500),
    full_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    access_count INT NOT NULL DEFAULT 0,
    last_access TIMESTAMPTZ,
    require_password_change BOOLEAN NOT NULL DEFAULT FALSE,
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMPTZ,
    tenant_id VARCHAR(36),
    is_tenant_owner BOOLEAN NOT NULL DEFAULT FALSE,
    timezone VARCHAR(50),
    locale VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

---

### 9. `sys_application_configs` — Parametrizações Dinâmicas por Tenant

Armazena configurações dinâmicas de cada clínica/aplicação em formato JSONB.

```sql
CREATE TABLE IF NOT EXISTS sys_application_configs (
    id VARCHAR(36) PRIMARY KEY,
    application_id VARCHAR(36) NOT NULL,
    tenant_id VARCHAR(36),
    is_primary_for_tenant BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    enforce_document_acceptance_on_login BOOLEAN NOT NULL DEFAULT FALSE,
    config_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

---

### 10. `sys_application_resources` — Árvore Hierárquica de Recursos Protegidos

Mapeia todos os itens protegíveis da interface e das rotas de API (alimenta dinamicamente a sidebar e a matriz ACL).

```sql
CREATE TABLE IF NOT EXISTS sys_application_resources (
    id VARCHAR(36) PRIMARY KEY,
    item_code VARCHAR(255) NOT NULL,
    resource_type VARCHAR(20) NOT NULL DEFAULT 'API',
    context VARCHAR(20) NOT NULL DEFAULT 'BUSINESS',
    description TEXT,
    parent_id VARCHAR(36),
    path VARCHAR(500),
    label_key VARCHAR(255),
    icon VARCHAR(100),
    route VARCHAR(500),
    sort_order INT NOT NULL DEFAULT 0,
    min_role VARCHAR(20) NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    application_id VARCHAR(36),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

---

### 11. `sys_applications` — Catálogo de Aplicações e Microsserviços

Registra os sistemas, portais e subsistemas integrados ao ecossistema OpenClinic, centralizando seus metadados de branding e políticas padrão de governança e segurança da plataforma.

```sql
CREATE TABLE IF NOT EXISTS sys_applications (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    app_name VARCHAR(255) NOT NULL,
    app_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    app_logo_url VARCHAR(500),
    app_favicon_url VARCHAR(500),
    app_subtitle VARCHAR(255),
    app_description TEXT,
    default_locale VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    default_supported_locales JSONB NOT NULL DEFAULT '["pt-BR", "en-US"]'::jsonb,
    default_timezone VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    default_dialing_code VARCHAR(5) NOT NULL DEFAULT '+55',
    default_max_login_attempts INT NOT NULL DEFAULT 5,
    default_lockout_duration_minutes INT NOT NULL DEFAULT 15,
    default_session_timeout_minutes INT NOT NULL DEFAULT 30,
    default_min_password_length INT NOT NULL DEFAULT 8,
    default_mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    default_password_reset_token_ttl_hours INT NOT NULL DEFAULT 24,
    default_enable_audit_log BOOLEAN NOT NULL DEFAULT TRUE,
    default_audit_retention_days INT NOT NULL DEFAULT 365,
    default_accepted_login_methods JSONB NOT NULL DEFAULT '["PASSWORD"]'::jsonb,
    default_extra_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_multi_tenant BOOLEAN NOT NULL DEFAULT FALSE,
    is_default_application BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT sys_applications_code_key UNIQUE (code)
);
```

| Coluna | Tipo | Restrições & Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PK | UUID v4 gerado na aplicação |
| `code` | `VARCHAR(100)` | UNIQUE, NOT NULL | Identificador canônico da aplicação (ex: `openclinic`) |
| `app_name` | `VARCHAR(255)` | NOT NULL | Nome oficial de exibição da aplicação |
| `app_version` | `VARCHAR(50)` | NOT NULL, DEFAULT '1.0.0' | Versão corrente do software |
| `app_logo_url` | `VARCHAR(500)` | Nullable | URL pública para o logo da aplicação |
| `app_favicon_url` | `VARCHAR(500)` | Nullable | URL pública para o favicon da aplicação |
| `app_subtitle` | `VARCHAR(255)` | Nullable | Subtítulo / Tagline descritiva da aplicação (usado no login, headers e apresentações) |
| `app_description` | `TEXT` | Nullable | Descrição institucional textual completa da aplicação |
| `default_locale` | `VARCHAR(10)` | NOT NULL, DEFAULT 'pt-BR' | Localidade/idioma padrão |
| `default_supported_locales` | `JSONB` | NOT NULL, DEFAULT '["pt-BR", "en-US"]' | Localidades suportadas pela aplicação |
| `default_timezone` | `VARCHAR(50)` | NOT NULL, DEFAULT 'America/Sao_Paulo' | Fuso horário padrão |
| `default_dialing_code` | `VARCHAR(5)` | NOT NULL, DEFAULT '+55' | DDI telefônico padrão |
| `default_max_login_attempts` | `INT` | NOT NULL, DEFAULT 5 | Limite de tentativas consecutivas de login inválido |
| `default_lockout_duration_minutes` | `INT` | NOT NULL, DEFAULT 15 | Tempo de bloqueio preventivo após lockout |
| `default_session_timeout_minutes` | `INT` | NOT NULL, DEFAULT 30 | Tempo de expiração de sessão por inatividade |
| `default_min_password_length` | `INT` | NOT NULL, DEFAULT 8 | Comprimento mínimo de senha |
| `default_mfa_enabled` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | Exigência padrão de autenticação multifator |
| `default_password_reset_token_ttl_hours` | `INT` | NOT NULL, DEFAULT 24 | Duração da validade do token de recuperação de senha |
| `default_enable_audit_log` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Habilitação padrão de trilhas de auditoria |
| `default_audit_retention_days` | `INT` | NOT NULL, DEFAULT 365 | Retenção padrão dos logs de auditoria em dias |
| `default_accepted_login_methods` | `JSONB` | NOT NULL, DEFAULT '["PASSWORD"]' | Métodos aceitos de autenticação (`PASSWORD`, `OAUTH2`, etc.) |
| `default_extra_settings` | `JSONB` | NOT NULL, DEFAULT '{}' | Metadados e configurações extras da aplicação |
| `is_multi_tenant` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | Flag indicando se a aplicação suporta multi-tenancy |
| `is_default_application` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | Indica se é a aplicação default da plataforma |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Status de ativação da aplicação |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Timestamp de criação |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Timestamp da última atualização |
| `deleted_at` | `TIMESTAMPTZ` | Nullable | Timestamp de exclusão lógica (soft delete) |

---

### 12. `sys_audit_logs` — Trilha Imutável de Auditoria

Registra eventos críticos e auditoria de segurança (login, logout, criação/alteração de registros, tentativas bloqueadas).

```sql
CREATE TABLE IF NOT EXISTS sys_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    username VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    tenant_id VARCHAR(36),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 13. `sys_tenants` — Contratantes e Instâncias Multi-tenant

Representa as contas e empresas contratantes do sistema, definindo o isolamento lógico e a governança dos dados multi-tenant (`tenant_id`).

```sql
CREATE TABLE IF NOT EXISTS sys_tenants (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    tax_id VARCHAR(50),
    cnpj VARCHAR(14),
    contact_name VARCHAR(255),
    contact_title VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    postal_code VARCHAR(20),
    street VARCHAR(255),
    number VARCHAR(20),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(50),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

| Coluna | Tipo | Restrições & Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | PK | UUID v4 gerado na aplicação |
| `name` | `VARCHAR(255)` | NOT NULL | Nome da contratante |
| `slug` | `VARCHAR(100)` | UNIQUE | Identificador URL/Tenant |
| `status` | `VARCHAR(20)` | DEFAULT 'ACTIVE' | `ACTIVE`, `SUSPENDED`, `INACTIVE` |
| `tax_id` | `VARCHAR(50)` | Nullable | Identificador fiscal genérico / internacional |
| `cnpj` | `VARCHAR(14)` | Nullable | CNPJ (14 dígitos numéricos limpos) |
| `contact_name` | `VARCHAR(255)` | Nullable | Nome do responsável institucional |
| `contact_title` | `VARCHAR(100)` | Nullable | Cargo / função do responsável |
| `contact_email` | `VARCHAR(255)` | Nullable | E-mail corporativo de contato |
| `contact_phone` | `VARCHAR(20)` | Nullable | Telefone do responsável |
| `postal_code` | `VARCHAR(20)` | Nullable | CEP / Código Postal Internacional |
| `street` | `VARCHAR(255)` | Nullable | Logradouro / Rua |
| `number` | `VARCHAR(20)` | Nullable | Número predial |
| `complement` | `VARCHAR(100)` | Nullable | Complemento |
| `neighborhood` | `VARCHAR(100)` | Nullable | Bairro |
| `city` | `VARCHAR(100)` | Nullable | Cidade |
| `state` | `VARCHAR(100)` | Nullable | Estado / Província / Região |
| `country` | `VARCHAR(50)` | Nullable | País (ISO 3166-1 alpha-3) |
| `is_default` | `BOOLEAN` | DEFAULT FALSE | Tenant padrão da instalação |
| `is_active` | `BOOLEAN` | DEFAULT TRUE | Status do registro |
| `deleted_at` | `TIMESTAMPTZ` | Nullable | Timestamp de exclusão lógica (soft delete) |

---

## 🗺 Diagrama de Relacionamento entre as 3 Camadas

```text
  [ sys_tenants ] ────────┬─────────────────────────────┐
         │                │                             │
         ▼                ▼                             ▼
  [ iam_users ] ──── [ iam_groups ]              [ app_patients ]
         │                │                             │
         ├────────────────┤                             │
         ▼                ▼                             ▼
  [ iam_user_groups ] ──> [ iam_permissions ] <── [ sys_application_resources ]
         │                        │
         ▼                        ▼
  [ iam_sessions ]        [ sys_audit_logs ]
  [ iam_lockouts ]
         │
         ▼
  [ app_practitioners ] (Vínculo opcional: user_id ──> iam_users.id)
```
