# Reunião de alinhamento técnico e agendamento — 16/09/2026

**Assunto:** consolidação do módulo de autenticação e IAM (Issue #19), infraestrutura Docker local, terminologias de saúde e priorização dos cadastros da agenda
**Duração:** cerca de 75 minutos

Este é o registro estruturado da reunião. Ele não é uma transcrição, e não atribui argumentos nem tarefas nominalmente — veja o [critério adotado](./README.md).

## Contexto

Reunião técnica de acompanhamento da fase de código e dos primeiros protótipos transversais. O encontro teve como objetivos: avaliar a conformidade de segurança e arquitetura do módulo de autenticação/IAM (alinhado à Issue #19 — Plataforma e Obrigações Transversais); padronizar o ambiente de desenvolvimento local com Docker Compose; definir a persistência das terminologias em saúde; e delimitar o escopo da primeira entrega funcional de negócio do sistema: o módulo de agendamento.

## Stack técnico e infraestrutura

- **Ratificação do stack oficial:** reafirmação unânime do ecossistema composto por **Node.js com Fastify** no backend, **PostgreSQL** no banco de dados e **React com Vite** no frontend.
- **Ambiente Docker local:** alinhamento para fornecimento de ambiente totalmente conteinerizado via Docker Compose (orquestrando aplicação, API e PostgreSQL), permitindo que contribuidores executem o ecossistema localmente sem necessidade de instalar dependências de banco de dados diretamente no sistema operacional.
- **Princípio de API First e validação:** manutenção estrita da entrega concomitante de código e especificação OpenAPI, associada aos validadores estruturais do repositório para garantia de qualidade.

## Arquitetura de Autenticação, IAM e Isolamento (Issue #19)

- **Status e conformidade de segurança:** protótipo funcional atendendo aos requisitos de auditoria de segurança (incluindo triagem inicial por IA), cobrindo autenticação, usuários, perfis e permissões granulares com capacidade de negação explícita.
- **Hierarquia canônica de acesso:** estruturação formal em 3 níveis bem delimitados, com proibição estrita de regras de negócio ou permissões hardcoded no código:
  1. *Usuário comum:* acesso restrito às rotinas operacionais autorizadas;
  2. *Administrador do Tenant:* gestão interna da clínica/organização contratante;
  3. *Proprietário / Superadministrador técnico:* governança global e parametrizações da plataforma.
- **Multi-tenancy:** consolidação do isolamento lógico por organização/tenant, garantindo independência operacional e segurança em cenários de locatário único e múltiplos locatários.
- **Categorização das tabelas:** persistência particionada em tabelas de *Sistema*, tabelas de *IAM* e tabelas de *Aplicação/Negócio*.

## Vínculo automático entre Profissionais e Usuários

- **Decisão fechada:** o fluxo de cadastro de profissionais de saúde (médicos, dentistas) e colaboradores operacionais (secretárias, recepcionistas, gestores) deve disparar automaticamente a criação do usuário com login e senha na própria API.
- **Objetivo:** eliminar atrito administrativo, prevenir retrabalho e assegurar consistência imediata entre a equipe clínica e os acessos ao sistema.

## Terminologias de saúde (TUSS e CID)

- **Escopo definido:** persistência e disponibilização das tabelas auxiliares obrigatórias para faturamento e certificação, contemplando **TUSS** (Terminologia Unificada da Saúde Suplementar da ANS) e classificações **CID-10 / CID-11**.
- **Gestão e atualização:** disponibilização via endpoints da API, permitindo consumo pelo prontuário/faturamento e manutenção/atualização pelo administrador técnico quando houver publicações de novas versões oficiais. Desenvolvimento estimado em cerca de 80% de conclusão.

## Priorização do módulo de Agendamento e escopo de cadastros

- **Agendamento como prioridade máxima de produto:** consenso de que a interface de marcação e gestão de consultas é a área de maior intensidade de uso e deve ser a primeira frente funcional entregue à validação.
- **Delimitação estrita de escopo (CRUDs essenciais):** para garantir a entrega sem dispersão de esforço, acordou-se priorizar exclusivamente os cadastros pré-requisitos para a operação da agenda:
  - Unidades de atendimento;
  - Salas e consultórios;
  - Procedimentos clínicos;
  - Pacientes;
  - Profissionais de saúde.
- **Postergamento de cadastros secundários:** módulos periféricos ou sem impacto imediato na agenda (como estoque complexo e rotinas financeiras avançadas) foram formalmente deixados para etapas posteriores.
- **Estratégia de desacoplamento no frontend:** autorização para que o desenvolvimento de interface da agenda utilize mocks ou banco em memória (como SQLite/dados locais) para avançar nas telas e fluxos visuais paralelamente à construção dos endpoints definitivos no backend.

## Organização do trabalho e apoio técnico

- **Divisão de frentes:** organização de squads colaborativas cobrindo Autenticação/IAM, Infraestrutura/Docker, Terminologias, Agendamento e Frontend.
- **Programação em dupla (*pair programming*):** acordo coletivo para realização periódica de sessões de pair programming, promovendo transferência mútua de conhecimento técnico e apoiando novos membros no desbloqueio de tarefas.

## Próximas entregas combinadas

| # | Entrega | Situação |
| :-- | :--- | :--- |
| 1 | Atualização de PR com scripts Docker Compose, documentação e correções de autenticação/IAM (Issue #19) | Em andamento |
| 2 | Finalização da estrutura de dados e endpoints das tabelas de terminologias (TUSS / CID) | Em andamento |
| 3 | Implementação dos CRUDs essenciais de suporte ao agendamento (unidades, salas, profissionais e procedimentos) | Início imediato |
| 4 | Criação de mock/dados em memória no frontend e início do desenvolvimento da interface da agenda | Início imediato |
| 5 | Condução de sessões de programação em dupla para nivelamento da equipe | Em andamento |
