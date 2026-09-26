# 🏛 Diretrizes Arquiteturais e Decisões Técnicas (OpenClinic)

> **Documento de Alinhamento e Pauta Técnica para o Comitê de Desenvolvimento**  
> **Data:** Agosto / 2026  
> **Status:** Ativo / Em Discussão  
> **Público-Alvo:** Mantenedores, Desenvolvedores, Designers e Especialistas de Saúde do OpenClinic.

---

## 1. Sumário Executivo & Objetivos

O **OpenClinic** é uma plataforma clínica e hospitalar *open source* desenvolvida com padrões rigorosos de engenharia de software, segurança de dados em saúde e desacoplamento arquitetural.

Este documento consolida as **Decisões de Arquitetura (ADRs)** e justificativas estratégicas para apreciação do grupo de mantenedores, servindo como base técnica para as reuniões de evolução do projeto.

---

## 2. Decisão Arquitetural: Internacionalização (i18n) e Centralização de Vocabulário

### 2.1 Contexto e Desafio

Mesmo sendo uma aplicação com foco inicial de operação no Brasil (em língua portuguesa), surgiu a questão:  
*Por que estruturar a internacionalização (i18n) e a separação de mensagens de texto desde o estágio inicial do projeto?*

---

### 2.2 Justificativas Técnicas e Estratégicas para o Grupo

#### 🎯 1. Governança de Vocabulário e Separação de Responsabilidades (*Separation of Concerns*)

- **O Problema de Textos no Código:** Quando textos e mensagens estão dispersos no meio de componentes React (`JSX/TSX`) e regras de negócio no backend, qualquer alteração editorial exige intervenção direta de um desenvolvedor, aumentando o risco de quebras de layout e regressões.
- **O Ganho com Catálogos Centralizados:** 
  - Centralizar os textos em arquivos dedicados (`messages-pt-br.ts` e `messages-en-us.ts`) permite que médicos, consultores jurídicos, auditores do SUS e especialistas de UX revisem todo o dicionário e tom de voz da aplicação em um único ponto.
  - Facilita adequações de nomenclaturas regulatórias sem tocar na lógica funcional.

#### 🌍 2. Padrão Global de Projetos *Open Source* em Saúde (*Open Health Ecosystem*)

- **Inspiração em Referências Globais:** Projetos globais como *OpenMRS*, *OpenEMR*, *GNU Health* e *Medplum* demonstram que softwares abertos de saúde de alto impacto costumam ser adotados por países lusófonos (Angola, Moçambique, Portugal), iniciativas da América Latina e parcerias acadêmicas.
- **Custo Marginal Zero no Início:** Implementar os alicerces de i18n na fase de arquitetura fundacional tem custo computacional e de desenvolvimento próximo de zero. Em contrapartida, tentar refatorar um sistema maduro com centenas de telas para adicionar i18n posteriormente exige meses de esforço árduo e correção de falhas.

#### 📡 3. Conformidade com Padrões Web e RFCs de API (RFC 7807)

- **RFC 7807 (*Problem Details for HTTP APIs*):** As APIs do OpenClinic retornam erros estruturados e tipados para integrações de terceiros.
- **Cabeçalho HTTP `Accept-Language`:** O backend é capaz de responder requisições e diagnósticos de erro no idioma solicitado pelo cliente (seja o frontend web, um aplicativo mobile, um laboratório parceiro ou um webhook hospitalar).

#### ⚡ 4. Arquitetura Leve e Segura (*Zero-Overhead TypeScript Pattern*)

- **Sem Dependências Pesadas:** Não há bibliotecas externas sobrecarregadas ou downloads dinâmicos de arquivos JSON pela rede.
- **Padrão Ouro TypeScript (`const object` + `type` derivado):**
  - Autocomplete nativo no editor.
  - Detecção imediata de chaves inexistentes ou erros de digitação em tempo de compilação (`tsc`).
  - Totalmente compatível com tipos nativos e APIs de armazenamento (`localStorage`, Headers).

---

### 2.3 Diretriz de Adoção: Pragmática e Gradual (Não Bloqueante)

- **A infraestrutura está pronta e homologada:** O `core` compartilhado e o `frontend-webapp` já possuem a camada de resolução e contexto configurados.
- **Não há obrigação de tradução imediata em massa:** As equipes podem focar na implementação dos novos módulos funcionais (PEP, Triagem, Agendamento) priorizando o português brasileiro (`pt-BR`), sabendo que o sistema está arquitetado para expansão internacional a qualquer momento.

---

## 3. Decisão Arquitetural: Telemetria e Logs Estruturados em Inglês vs. Mensagens de Apresentação (i18n)

### 3.1 Contexto e Definição de Escopo

Uma distinção fundamental de arquitetura deve ser observada entre **mensagens destinadas a usuários finais (clientes)** e **mensagens de telemetria / logs internos do sistema**.

| Dimensão | Logs de Sistema (`logger.info/warn/error`) | Mensagens ao Usuário / Resposta da API |
| :--- | :--- | :--- |
| **Destinatário** | Desenvolvedores, SRE, SIEM, APMs, Agregadores de Log (Datadog, Loki, CloudWatch). | Usuário final da clínica, médicos, administradores, pacientes. |
| **Idioma Padrão** | **Inglês** (Padrão global da indústria). | **Internacionalizado** (pt-BR padrão, en-US via catálogos de i18n). |
| **Estrutura** | **JSON Estruturado** com chaves de contexto (`userId`, `role`, `action`, `resource`, `err`). | Dicionários centralizados (`messagesPtBr`, `SuccessCode`, `ErrorCode`). |
| **Finalidade** | Rastreabilidade, depuração, monitoramento de anomalias e auditoria técnica. | Clareza na experiência do usuário, mensagens de feedback e acessibilidade. |

### 3.2 Justificativa para Logs em Inglês

1. **Interoperabilidade com o Ecossistema:** O runtime do Node.js, middlewares HTTP, bibliotecas de banco de dados e frameworks emitem seus eventos em inglês. Manter os logs da aplicação em inglês impede a poluição bilíngue nas ferramentas de agregação.
2. **Análise Automatizada de Log (AI & APMs):** Ferramentas de observabilidade modernas utilizam detecção de anomalias e correlação de traces cujo processamento de linguagem natural é calibrado primariamente para o vocabulário em inglês.

> 📖 **Guia Completo e Mandatório:** Para especificações técnicas detalhadas, matriz de camadas e exemplos de código, consulte o documento [language-standardization-and-i18n.md](./language-standardization-and-i18n.md).

---

## 4. Decisão Arquitetural: Uso Estrito de Enums de Domínio (`UserRole`) e Limites da Comparação Segura

### 4.1 Banimento de Strings Literais (*No Magic Strings*)

O uso de strings soltas no código (como `'OWNER'`, `'ADMIN'`, `'USER'`) para regras de negócio é estritamente proibido.

- Todas as validações e atribuições de papéis devem consumir o enum tipado `UserRole` exportado em `@openclinic/core` / `shared/domain/enums.ts`.
- **Benefícios:** Autocomplete garantido, verificação estática de tipos pelo compilador (`tsc`), refatoração segura e prevenção de bugs por erros de digitação (*typos*).

```typescript
// ❌ Incorreto (Magic String):
if (creatorRole === 'ADMIN' && input.role === 'OWNER') { ... }

// ✅ Correto (Tipado via Enum):
if (creatorRole === UserRole.ADMIN && input.role === UserRole.OWNER) { ... }
```

### 4.2 Critério de Comparação: Igualdade Estrita (`===`) vs. Tempo Constante (`crypto.timingSafeEqual`)

Para manter a clareza e o equilíbrio entre segurança criptográfica e performance:

1. **Comparação em Tempo Constante (`crypto.timingSafeEqual` / `timing-safe`):**
   - **Obrigatória exclusivamente para:** Tokens de autenticação, hashes de senha, tokens de recuperação de senha, assinaturas HMAC e segredos criptográficos.
   - **Motivo:** Impede que um invasor meça variações de nanossegundos de CPU para deduzir o segredo byte a byte (*Timing Attack*).
2. **Igualdade Estrita (`===`):**
   - **Padrão correto para:** Enums (`UserRole`, `TenantStatus`), IDs públicos, booleanos (`is_active`), códigos de status e tipos primitivos de domínio.
   - **Motivo:** Atributos de domínio possuem valores públicos e pré-definidos; aplicar comparações criptográficas neles adiciona overhead sem qualquer ganho de segurança.

### 4.3 Padrões de UI/UX: Ordenação Interativa de Listagens e Semântica Visual de Status

1. **Ordenação Interativa e Determinística:**
   - Listagens administrativas (Usuários, Grupos, Membros) possuem ordenação alfabética por padrão (`localeCompare` com suporte a `pt-BR`) e ordenação interativa com setas indicadoras (`▲` para ascendente, `▼` para descendente, `↕` para neutro).
   - Colunas com suporte a ordenação: **Nome**, **Username** e **Status** em usuários; **Nome** e **Status** em grupos.

2. **Semântica Visual de Status (`ToggleSwitch`):**
   - **Ativo:** Verde esmeralda (`#16a34a`, container `#f0fdf4`, borda `#bbf7d0`, texto `#15803d`).
   - **Desativado / Inativo:** Laranja de alerta (`#ea580c`, container `#fff7ed`, borda `#fed7aa`, texto `#ea580c`), garantindo alto contraste visual sem confundir com exclusão destrutiva vermelha.

### 4.4 Arquitetura de Módulos Isomórficos e Subpath Seguro (`@openclinic/core/shared`)

Para garantir que pacotes de clientes (como `@openclinic/frontend-webapp`, futuros aplicativos mobile, CLIs ou microsserviços) possam consumir contratos, enums e constantes de forma limpa e sem conflitos com dependências exclusivas de servidor (Node.js/C++):

1. **Por que o termo `shared` em vez de `frontend`?**
   - As definições contidas nesse módulo (`UserRole`, `SupportedLocales`, `DEFAULT_LOCALE`, `ErrorCode`, `SuccessCode`, `ProblemDetail`) são **contratos compartilhados de domínio (*Shared Domain Contracts*)**.
   - Elas não pertencem exclusivamente ao frontend web: são consumidas pelo **Backend** (ao emitir erros e validar RBAC), pelo **Frontend Web** (ao chavear i18n e validar permissões na UI) e por futuros clientes como o **Aplicativo Mobile**.
   - O termo `@openclinic/core/shared` representa de forma precisa essa natureza isomórfica e agnóstica a *runtime*.

2. **Separação entre Domínio Puro vs. Infraestrutura de Servidor:**
   - **Escopo Exclusivo de Servidor:** Módulos que utilizam APIs nativas do Node.js (`node:crypto`, driver `pg`, `argon2`, `pino`) ficam acessíveis apenas na raiz `@openclinic/core` para serviços backend.
   - **Escopo Universal / Isomórfico (`@openclinic/core/shared`):** Ponto de entrada leve, tipado e 100% *Browser-Safe* que não inclui nenhum pacote nativo de servidor no bundle.

3. **Subpath Exports no `package.json` do Core:**
   - `@openclinic/core/shared`: Ponto de entrada canônico universal (Locales, Enums de RBAC, Códigos de Status e Tipos de Problema RFC 7807).
   - `@openclinic/core/locales`: Exportação granular de definições de internacionalização.
   - `@openclinic/core/enums`: Exportação granular de papéis (`UserRole`) e permissões.

---

## 5. Pilares de Segurança e Integridade Já Implementados

1. **Criptografia e Hashes:**
   - Senhas hasheadas exclusivamente via algoritmo **Argon2id** (resistente a ataques de GPU e *side-channel*).
   - Comparação segura em tempo constante (`timingSafeEqual` / `timing-safe`) contra *Timing Attacks* em dados sensíveis.
2. **Gestão de Sessão & RBAC:**
   - Tokens JWT curtos com *Refresh Tokens* rotativos em cookies seguros (`HttpOnly`, `SameSite=Strict`).
   - Proteção contra força bruta com bloqueio temporário e desbloqueio administrativo auditado.
   - Controle estrito de acesso baseado em papéis (`UserRole.OWNER`, `UserRole.ADMIN`, `UserRole.USER`).

---

## 6. Pauta e Próximos Tópicos para a Reunião do Grupo

Abaixo estão os tópicos sugeridos para validação e deliberações nas próximas reuniões:

- [ ] **Aprovação das Diretrizes de i18n, Logs Estruturados em Inglês e Uso de Enums**
- [x] **Homologação da Camada de Banco de Dados / ORM (Drizzle ORM vs. Prisma)**
  - *Parecer Técnico detalhado:* [database-orm-selection-drizzle-vs-prisma.md](./database-orm-selection-drizzle-vs-prisma.md)
  - *Decisão:* Manutenção e consolidação do Drizzle ORM (TypeScript nativo, zero overhead de runtime, sem dependência de binários Rust).
- [x] **Desacoplamento de Banco de Dados, Identificadores UUID e Simplificação de Roles (ADR-004)**
  - *Parecer Técnico detalhado:* [database-decoupling-and-uuid-architecture.md](./database-decoupling-and-uuid-architecture.md)
  - *Decisão:* Adoção de schema ANSI agnóstico (`VARCHAR(36)` para UUIDs gerados na aplicação via `crypto.randomUUID()` e `VARCHAR(20)` para enums/status validados por domínio). Eliminação da tabela redundante `iam_roles` em favor da coluna direta `iam_users.role VARCHAR(20) NOT NULL DEFAULT 'USER'`, delegando a criação dinâmica de perfis e cargos hospitalares para a tabela `iam_groups` e a matriz ACL `iam_permissions`.
- [ ] **Mapeamento e Modelagem do Prontuário Eletrônico do Paciente (PEP)**
  - Estrutura de anamnese, evolução clínica e prescrição digital.
  - Conformidade com padrões CFM / TISS / FHIR.
- [ ] **Fluxo de Triagem e Agendamento Ambulatorial**
- [ ] **Definição dos Níveis de Auditoria e Logs Hospitalares (LGPD)**
- [ ] **Outros Assuntos / Informações Adicionais da Reunião:**
  - *(Espaço reservado para contribuições da comunidade)*

---

### Documento mantido pelo time de Engenharia e Arquitetura do OpenClinic
