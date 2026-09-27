# Revisão de Agendamento frente à branch principal

## Referência e conclusão

Comparação com `origin/main` após `git fetch origin main`, commit
`c6627a1ba468bfefbf11562d9064a1e9ea9789c8`. Implementação revisada a partir de
`9d18fdf381617a2b2cd95f46684d98bee0600316`, na branch `feature/auth`, mais as
correções desta revisão. Os requisitos foram lidos diretamente da referência
remota, pois alguns documentos locais diferem da principal.

**Não há conformidade integral.** O CRUD e a checagem operacional de agenda
estão implementados e testados. Requisitos obrigatórios do produto continuam
ausentes; a documentação específica da API não pode dispensá-los.

Fontes normativas do projeto, fixadas no commit revisado:

- [Dicionário de dados](https://github.com/Iniciativa-OpenClinic/OpenClinic/blob/c6627a1ba468bfefbf11562d9064a1e9ea9789c8/docs/cadastros.md): campos implícitos, Agendamento e Sessão planejada.
- [Módulos](https://github.com/Iniciativa-OpenClinic/OpenClinic/blob/c6627a1ba468bfefbf11562d9064a1e9ea9789c8/docs/modulos.md): princípios, Auditoria e Proveniência, Catálogo, Convênios e Agenda.
- [PRD](https://github.com/Iniciativa-OpenClinic/OpenClinic/blob/c6627a1ba468bfefbf11562d9064a1e9ea9789c8/docs/prd.md): API, FHIR e webhooks.
- [Decisão 0001](https://github.com/Iniciativa-OpenClinic/OpenClinic/blob/c6627a1ba468bfefbf11562d9064a1e9ea9789c8/docs/decisions/0001-fhir-como-padrao-de-dados.md): FHIR é a especificação a implementar, inclusive no subconjunto do MVP.

## Pendências encontradas

| Prioridade | Achado e consequência | Evidência na implementação | Encaminhamento |
| --- | --- | --- | --- |
| Alta | Alterações e mudanças de status sobrescrevem o registro sem autoria, versões ou trilha de leitura/escrita. Não é possível recuperar os valores anteriores nem saber quem realizou a ação. | `appointment.repository.ts`: update, changeStatus e softDelete; `appAppointments` não guarda autor e as rotas não registram auditoria. | Implementar proveniência e histórico transacional consultável, além da trilha imutável com referências opacas, sem dados clínicos. Soft delete isolado não satisfaz esses requisitos. |
| Alta | O contrato é um DTO próprio sem conformidade FHIR demonstrada; códigos operacionais e estados de atendimento foram colocados no mesmo ciclo. | `appointment.ts`, `appointment.schemas.ts`, `appointment.service.ts`; ausência de perfil, serialização e testes de conformidade. | Definir o perfil R4 e separar semântica de Appointment, aceitação dos participantes e Encounter. A decisão da principal não autoriza adiar FHIR para uma exportação futura. |
| Alta | Pacote/sessão planejada e fila “a marcar” não têm vínculo persistido nem operação de marcação. Não há como reservar uma sessão e retirá-la da fila atomicamente. | Ausência de referência no input, no schema e na tabela de agendamentos. | Implementar junto dos modelos de plano/pacote, com validação de paciente, procedimento, tenant e confirmação humana. Não adicionar apenas um ID sem integridade referencial. |
| Média | `source_channel=API` agrega todos os parceiros. A identidade da integração e sua autoria não ficam registradas. | Somente enum RECEPTION/PHONE/API; autenticação das rotas por JWT de usuário. | Vincular à identidade autenticada da integração e preservar proveniência. Um texto fornecido pelo cliente não substitui identidade verificada. |
| Média | Particular está presente, mas como enum, não como referência à fonte pagadora. | `payer_type` e ausência de vínculo a pagador/plano. | A regra V1 “sempre Particular” é atendida; a fundação de referência extensível exigida no dicionário ainda não está pronta. |
| Média | Não há publicação de eventos de agendamento. | Nenhum produtor/outbox ou entrega associado às operações. | Integrar ao módulo de webhooks com payload mínimo, assinatura, reenvio e idempotência. O catálogo de eventos ainda está aberto no próprio PRD; não foi inventado nesta revisão. |
| Dependência | Compatibilidade de sala por procedimento/equipamentos não é verificável. | O catálogo atual só guarda `requires_room`; a reserva valida unidade, atividade e agendabilidade da sala. | Completar o vínculo de compatibilidade no Catálogo e então aplicá-lo na reserva. |
| Interface | Agenda e fila de atendimento ainda são telas em construção. | `ScheduleView.tsx` e `AttendanceQueueView.tsx` renderizam `UnderConstructionCard`. | Implementação e testes da UI são entrega própria; os endpoints não concluem a experiência de Agenda descrita no PRD. |

Há também uma inconsistência na própria descrição da principal: o ciclo
“em atendimento → finalizado” não tem correspondência 1:1 literal em
`Appointment.status` do R4. `checked-in` significa preparação administrativa
concluída; `fulfilled` transfere o acompanhamento ao Encounter. Não equivalem
automaticamente a atendimento em curso e alta. A regra operacional precisa ser
preservada com um modelo correto de Appointment/Encounter, sem renomear enums
para aparentar conformidade. Fonte: [HL7 R4 AppointmentStatus](https://hl7.org/fhir/R4/valueset-appointmentstatus.html).

## Correções realizadas nesta revisão

1. **Origem imutável.** PUT deixou de aceitar `source_channel`; o repositório
   também impede sua alteração. Registros antigos podem receber os vínculos
   obrigatórios mantendo `LEGACY`, sem atribuir retrospectivamente uma origem.
2. **Contrato estrito de escrita.** POST, PUT e PATCH rejeitam campos não
   suportados antes da remoção automática feita pelo AJV do Fastify. Antes,
   POST com `session_id` ou status indevido retornava 201 descartando o campo;
   PUT com apenas `tenant_id` e PATCH com dados extras retornavam sucesso.
   Agora retornam 400 sem acessar a operação do repositório.
3. **Documentação/OpenAPI.** O PUT não anuncia mais canal editável, e o manual
   distingue o contrato atual das pendências obrigatórias da principal.

Cinco casos de regressão foram executados antes da correção e reproduziram
201/200 onde o contrato deveria rejeitar a requisição. Foram acrescentados
testes de preservação do canal no PostgreSQL e de edição de registro legado.
Essas correções não substituem o módulo de auditoria/proveniência ausente.

## Endpoints e comportamento revisados

| Endpoint | Verificação |
| --- | --- |
| GET `/api/v1/business/appointments` | Tenant, permissão READ, paginação, filtros e interseção de períodos semiabertos. |
| POST `/api/v1/business/appointments` | WRITE, referências ativas, duração herdada, sala obrigatória, disponibilidade, bloqueios e conflitos. |
| GET `/api/v1/business/appointments/:id` | Consulta dentro do tenant; registros excluídos ou de outro tenant não são retornados. |
| PUT `/api/v1/business/appointments/:id` | WRITE, edição somente antes da chegada, revalidação e rollback; origem preservada. |
| PATCH `/api/v1/business/appointments/:id/status` | WRITE, transições permitidas e estados terminais; repetir status é idempotente. |
| DELETE `/api/v1/business/appointments/:id` | DELETE, cancelamento e exclusão lógica nas fases permitidas; sem remoção física. |

Os testes de banco cobrem conflito de profissional entre unidades, ocupação de
sala, encaixe que não ignora bloqueios, recorrência, janelas adjacentes, vigência,
horário de verão, isolamento de tenant e duas reservas simultâneas em conexões
independentes. A migração preserva os agendamentos anteriores e adiciona FKs
compostas por tenant e por unidade/sala.

## Banco e limites da verificação

Não foram alteradas migrações já versionadas, a branch principal, nem os dados
da instalação. A migração 0006, seus snapshots e as migrações anteriores foram
verificados em PostgreSQL 17 descartável, com testes de instalação e atualização.
Isso não confirma que o banco da aplicação já recebeu a migração: a instalação
precisa ser inspecionada separadamente pelo fluxo oficial de `db:status`.

A exclusão de sobreposição é garantida pela trava e pelas consultas da API,
não por uma constraint de exclusão no PostgreSQL. A tabela também não impõe
todos os enums e limites validados pela API. Escritas SQL externas podem violar
essas regras; a proteção atual pressupõe uso da API. Unidade/procedimento
nullable no banco são compatibilidade explícita para registros legados, não
permissão para omiti-los em novas requisições.

Limites como duração máxima de 1440 minutos, bloqueio da edição após chegada,
estados terminais sem reabertura e ausência de alinhamento obrigatório ao slot
são escolhas da implementação. Não foram encontrados como requisitos expressos
na principal; devem ser reconhecidos como decisões locais, não atribuídos à
especificação. O documento da API os explicita.

## Validação

Comandos executados via Node 22 em Docker, com dependências do workspace:

- Build de `packages/core` e TypeScript de backend/frontend.
- `npm run db:verify`.
- `npm run test:migrations` em banco descartável.
- `npm test -w packages/backend-api -- --maxWorkers=2`.
- Exportação do OpenAPI e comparação dos seis endpoints com as rotas.
- `git diff --check`.

Resultado final: **420 testes do backend aprovados em 26 arquivos**; build e
TypeScript aprovados; sete migrações/snapshots verificados; suíte de banco
aprovada, com um teste opcional de clone/restauração ignorado. OpenAPI exportado
e conferido: os seis endpoints estão presentes, e PUT não anuncia mais
`source_channel`. `git diff --check` sem erros (somente avisos de LF/CRLF).

Não há
testes de conformidade FHIR, auditoria, sessão planejada ou webhooks de
agendamento, pois esses fluxos ainda não foram implementados.
