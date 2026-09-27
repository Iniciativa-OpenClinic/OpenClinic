# API de agendamentos

Base: `/api/v1/business/appointments`. Todos os endpoints exigem JWT, tenant
e a permissão indicada no recurso `op_schedule`.

| Método | Caminho | Permissão | Resultado |
| --- | --- | --- | --- |
| GET | `/` | READ | Lista paginada e painel por status |
| POST | `/` | WRITE | Cria agendamento, 201 |
| GET | `/:id` | READ | Consulta, 200 |
| PUT | `/:id` | WRITE | Altera campos enviados, 200 |
| PATCH | `/:id/status` | WRITE | Executa transição de status, 200 |
| DELETE | `/:id` | DELETE | Cancela e exclui logicamente, 204 |

## Criação

```json
{
  "patient_id": "ID_PACIENTE",
  "procedure_id": "ID_PROCEDIMENTO",
  "practitioner_id": "ID_PROFISSIONAL",
  "unit_id": "ID_UNIDADE",
  "room_id": "ID_SALA",
  "appointment_date": "2026-10-05T09:00:00-03:00",
  "is_overbook": false,
  "payer_type": "PARTICULAR",
  "source_channel": "RECEPTION",
  "notes": "Primeira consulta"
}
```

Paciente, procedimento, profissional, unidade, data/hora, pagador e canal são
obrigatórios. As referências devem estar ativas e não excluídas no tenant.
Quando o procedimento possui uma lista de profissionais, o selecionado deve
pertencer a ela; lista vazia não restringe profissionais.
Sala é obrigatória se `requires_room=true`; quando informada, deve estar ativa,
agendável e pertencer à unidade selecionada.

`duration_minutes` é opcional, inteiro de 1 a 1440. Se omitido na criação,
herda `estimated_duration_minutes` do procedimento. A duração é gravada como
valor do agendamento: alterações posteriores no catálogo não mudam reservas.
Datas exigem offset explícito ou `Z`; a resposta usa UTC. `notes` aceita null
e até 10.000 caracteres. `is_overbook` assume false.

Na V1 o pagador aceito é `PARTICULAR`. `source_channel` aceita `RECEPTION`,
`PHONE` ou `API`. O status inicial é sempre `SCHEDULED` e não pode ser enviado
para pular etapas na criação. Identificador, tenant e timestamps são definidos
pelo servidor.

## Agenda e conflitos

Os intervalos são semiabertos `[início, fim)`: reservas consecutivas são
permitidas. Há conflito quando o profissional já possui um agendamento no
período, inclusive em outra unidade, ou quando a sala está ocupada. Registros
cancelados, com falta, inativos ou excluídos não ocupam horário. Concluídos
preservam a ocupação histórica. Paciente não é um terceiro recurso exclusivo
neste contrato.

Bloqueios globais, por unidade, de sala e recorrentes são considerados por meio
da mesma expansão usada pela API de Bloqueio. Encaixe **não** ignora bloqueios
nem conflito com outro agendamento.

Sem encaixe, todo o período deve ser coberto pela união das disponibilidades
do profissional e, quando selecionada, da sala na unidade. Janelas adjacentes
ou sobrepostas podem cobrir um único agendamento. A checagem respeita dia da
semana, fuso e vigência `[valid_from, valid_until)`, inclusive horário de verão.
O slot orienta a grade; a API não exige alinhamento ou duração múltipla dele.
Ausência de disponibilidade impede a reserva comum; `is_overbook=true`
permite explicitamente horários fora das janelas.

Criação e alteração são transacionais. Uma trava transacional por tenant
serializa gravações de agendamento e evita duas reservas simultâneas do mesmo
recurso. Esta garantia cobre gravações pela API; integrações não devem gravar
diretamente nas tabelas. Mudanças posteriores em disponibilidades e bloqueios
não cancelam nem deslocam reservas existentes.

## Alteração e status

PUT preserva campos omitidos e só permite editar agendamentos `SCHEDULED` ou
`CONFIRMED`. Trocar o procedimento sem enviar duração herda a duração do novo
procedimento. Sem troca, mantém a duração já gravada. `room_id: null` libera
a sala apenas quando o procedimento não a exige. A alteração revalida os
recursos e a agenda; falha deixa o registro anterior intacto.

Enviar, por exemplo, `{"status":"CONFIRMED"}` para `PATCH /:id/status`.

| Atual | Próximos estados permitidos |
| --- | --- |
| SCHEDULED (agendado) | CONFIRMED, ARRIVED, NO_SHOW, CANCELLED |
| CONFIRMED (confirmado) | ARRIVED, NO_SHOW, CANCELLED |
| ARRIVED (chegou/aguardando) | IN_PROGRESS, CANCELLED |
| IN_PROGRESS (em atendimento) | COMPLETED |
| COMPLETED, NO_SHOW, CANCELLED | Nenhum |

Repetir o mesmo status é idempotente. A chegada pode ocorrer sem confirmação
prévia. Estados terminais não podem ser reabertos. Esta API usa os códigos
operacionais existentes no projeto; não é uma serialização FHIR Appointment.
Iniciar ou finalizar não cria um Encounter automaticamente.

DELETE só aceita agendamentos agendados, confirmados ou já cancelados. Grava
`CANCELLED`, `is_active=false` e `deleted_at`, preservando o registro. Para
cancelar mantendo a visibilidade na agenda, usar PATCH de status.

## Consultas e erros

GET aceita `patient_id`, `practitioner_id`, `unit_id`, `room_id`, `status`,
`from`, `to`, `offset` (padrão 0) e `limit` (padrão 20, máximo 100).
Datas filtram intervalos que interceptam o período, inclusive reservas
iniciadas antes de `from`. Ambos os limites são opcionais; quando presentes
juntos, `from` deve preceder `to`. Ordenação por data/hora e ID. Resposta
`{ items, total }`; offset além do fim preserva total. A fila do dia usa esses
filtros, por exemplo `status=ARRIVED&unit_id=...&from=...&to=...`.

400 indica contrato inválido; 401/403, autenticação ou permissão; 404, registro
inexistente, excluído ou de outro tenant; 409, conflito de agenda ou ciclo de
status; 422, recurso inválido ou período de consulta invertido.

## Migração e limites de integração

Aplicar [0006_appointment_scheduling.sql](../infra/database/migrations/0006_appointment_scheduling.sql)
pelo fluxo oficial `npm run db:migrate` antes de usar as rotas. A migração
adiciona campos e chaves estrangeiras por tenant à tabela existente, preserva
os registros e mantém o campo legado `type` internamente. Novos registros usam
`type=PROCEDURE`. Unidade/procedimento ficam nullable no banco para não inventar
vínculos em agendamentos antigos; a nova API exige ambos. Registros antigos
recebem canal `LEGACY` e precisam dos dados obrigatórios ao serem editados.
Inconsistências antigas de tenant nas referências impedem a migração e devem
ser corrigidas previamente. Sala com histórico de agendamento não pode mudar
de unidade (409), inclusive após exclusão lógica.

Vínculo com pacote/sessão planejada, cadastro de planos pagadores, identificação
individual de parceiros, auditoria de transições, webhooks e criação de
atendimento dependem de seus módulos e não são criados por estas rotas.
Lembretes e mensagens de confirmação permanecem responsabilidade das integrações.

Contrato completo no [OpenAPI](./openapi/openapi.yaml).
