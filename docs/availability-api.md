# API de disponibilidade

Implementa janelas semanais de atendimento do recurso, com vigência e histórico,
conforme o módulo [Agenda](./modulos.md#agenda). Base:
`/api/v1/business/availabilities`. Exige JWT, tenant e permissão `op_schedule`.

| Método | Caminho | Permissão | Resultado |
| --- | --- | --- | --- |
| GET | `/` | READ | Lista paginada de janelas não excluídas |
| POST | `/` | WRITE | Cria janela, status 201 |
| GET | `/:id` | READ | Consulta uma versão, status 200 |
| PUT | `/:id` | WRITE | Cria nova versão, status 201 e novo ID |
| GET | `/:id/history` | READ | Histórico paginado, incluindo versões excluídas |
| DELETE | `/:id` | DELETE | Exclui logicamente a última versão, status 204 |

## Janela semanal

```json
{
  "unit_id": "ID_DA_UNIDADE",
  "practitioner_id": "ID_DO_PROFISSIONAL",
  "day_of_week": 1,
  "start_time": "08:00",
  "end_time": "12:00",
  "slot_duration_minutes": 30,
  "timezone": "America/Fortaleza",
  "valid_from": "2026-10-01",
  "valid_until": null,
  "notes": "Atendimento às segundas-feiras"
}
```

`unit_id`, `day_of_week`, horários, duração do slot, fuso e `valid_from` são
obrigatórios. Informar exatamente um de `practitioner_id` e `room_id`.
Profissional e unidade devem estar ativos, não excluídos e no mesmo tenant.
Sala também deve ser agendável e pertencer à unidade indicada. Os vínculos
são validados em transação; chaves estrangeiras compostas reforçam o isolamento.

`day_of_week`: 0 = domingo, 1 = segunda, até 6 = sábado. Horários são locais,
no formato `HH:mm`, com início anterior ao fim no mesmo dia. Janelas noturnas
que atravessam a meia-noite precisam ser modeladas separadamente; `24:00` não
é aceito. O slot é um inteiro positivo e deve caber na janela. Se sobrar tempo
ao dividir a janela em slots, essa sobra não constitui um slot completo.
O fuso é explícito porque o cadastro atual de Unidade ainda não o armazena.
Notas opcionais aceitam null e até 10.000 caracteres.

A vigência usa datas locais: `valid_from` é inclusivo e `valid_until` é
**exclusivo**. null significa sem data final. Uma janela de outubro termina
em `2026-11-01`. Cada registro representa um dia semanal e uma janela; horários
de manhã/tarde ou dias diferentes são registros distintos.

## Alteração com preservação do histórico

PUT exige um novo `valid_from`, posterior ao início atual e anterior ao fim
atual, caso exista. Pode alterar dia da semana, horários, duração, data final
e notas; campos omitidos são herdados. Recurso, unidade e fuso não mudam dentro
da série. Para outra combinação, cadastrar uma nova janela.

```json
{
  "valid_from": "2026-11-01",
  "start_time": "09:00",
  "end_time": "13:00"
}
```

A transação encerra a versão anterior na nova data inicial e insere outra
linha. O cliente deve usar o novo `id` retornado; `series_id` identifica a
série e `replaces_id` aponta para a versão anterior. Apenas a última versão
pode ser alterada ou excluída; tentar modificar uma versão substituída retorna
409. Alterações simultâneas na mesma versão têm apenas um vencedor.
Validações falhas retornam 422 sem encerrar o período anterior.

DELETE é uma retirada lógica da última janela. Ela deixa as consultas normais,
mas continua no histórico, acessível pelo ID de qualquer versão da série.
Excluir a última versão não reabre a vigência da anterior. Não existe restauração
neste contrato. Para encerramento planejado, criar uma versão com data final.
Não há bloqueio automático de datas retroativas; correções não alteram reservas
já existentes, cuja gestão pertence aos endpoints de agendamento.

## Consultas e limites

Lista e histórico retornam `{ items, total }`, com `offset=0`, `limit=20` e
máximo 100. A lista aceita `unit_id`, `practitioner_id`, `room_id` e `on_date`.
`on_date` filtra simultaneamente vigência e dia da semana, considerando a data
local da janela; não recebe instante UTC. Sem data, lista todos os períodos
não excluídos, inclusive históricos e futuros. Itens de outro tenant retornam
404 ou lista vazia. Histórico inclui versões excluídas apenas do tenant atual.

São **janelas padrão**, não horários livres confirmados: a consulta não desconta
bloqueios, feriados nem reservas, não materializa slots e não resolve mudanças
de horário de verão. Janelas independentes podem se sobrepor; antes de reservar,
o módulo de agendamento deve considerar sua união e validar conflitos reais de
profissional e sala, inclusive entre unidades. A validação de atividade do
recurso deve ser repetida na reserva. O vínculo persistido profissional–unidade
ainda não existe; nesta entrega é validado o pertencimento ao tenant.

## Implantação

[0004_availability_schedule.sql](../infra/database/migrations/0004_availability_schedule.sql)
cria `app_availabilities` e uma chave composta adicional em salas, sem modificar
as migrações anteriores. Aplicar pelo fluxo oficial `npm run db:migrate` antes
de usar os endpoints em uma instalação existente.

Contrato no [OpenAPI](./openapi/openapi.yaml).
