# API de bloqueios

Cadastro de períodos indisponíveis conforme [Bloqueio](./cadastros.md#bloqueio)
e o módulo [Agenda](./modulos.md#agenda). Base: `/api/v1/business/blocks`.
Todos os endpoints exigem JWT, tenant e permissão no recurso `op_schedule`.

| Método | Caminho | Permissão | Resultado |
| --- | --- | --- | --- |
| GET | `/` | READ | Lista paginada de definições de bloqueio |
| POST | `/` | WRITE | Criação, status 201 |
| GET | `/:id` | READ | Consulta, status 200 |
| PUT | `/:id` | WRITE | Atualiza os campos enviados, status 200 |
| DELETE | `/:id` | DELETE | Exclusão lógica, status 204 sem corpo |
| GET | `/occurrences` | READ | Ocorrências que interceptam o período consultado |

## Contrato

```json
{
  "practitioner_id": "ID_DO_PROFISSIONAL",
  "unit_id": null,
  "starts_at": "2026-10-07T13:00:00-03:00",
  "ends_at": "2026-10-07T17:00:00-03:00",
  "timezone": "America/Fortaleza",
  "reason": "Reunião de equipe",
  "recurrence": {
    "frequency": "WEEKLY",
    "interval": 1,
    "until": "2026-12-30T13:00:00-03:00"
  }
}
```

Informar exatamente um de `practitioner_id` e `room_id`. O recurso deve estar
ativo, não excluído e no tenant autenticado. Salas também devem ser agendáveis.
`unit_id` é opcional; quando informado, a unidade deve estar ativa e pertencer
ao tenant. Para salas, deve corresponder à unidade da sala.

`starts_at`, `ends_at` e `timezone` são obrigatórios. Datas/horas exigem offset
explícito ou `Z`; o fim deve ser posterior ao início. Instantes são armazenados
com fuso no PostgreSQL e retornados em UTC. `timezone` identifica o fuso IANA
usado na recorrência e deve ser aceito pelo runtime e pelo banco.
`reason` é opcional, com até 10.000 caracteres, e aceita null.

Sem unidade, o bloqueio de profissional se aplica a todas as unidades. O bloqueio
de uma sala continua limitado àquela sala. Filtrar por unidade inclui os bloqueios
globais de profissionais e os bloqueios globais das salas localizadas nela.

## Recorrência

`recurrence` é opcional e aceita null. Quando presente, exige:

- `frequency`: `DAILY` ou `WEEKLY`.
- `interval`: inteiro de 1 a 52; por exemplo, `WEEKLY` com 2 repete a cada duas semanas.
- `until`: instante opcional, inclusivo para o início da última ocorrência; null ou ausência significa sem limite final.

O primeiro período ancora as repetições. Recorrências semanais mantêm o mesmo
dia da semana e os horários locais no fuso informado. A expansão usa aritmética
de calendário do PostgreSQL, preservando os horários locais ao atravessar mudanças
de horário de verão. Horários ambíguos ou inexistentes seguem a resolução de fuso
do PostgreSQL; ocorrências que resultariam em duração não positiva são omitidas.
A ocorrência inicial mantém exatamente os instantes enviados.

Cada ocorrência recorrente pode durar até 31 dias, incluindo períodos que
atravessam meia-noite. Seu fim também deve ser posterior ao início em horário
local. Recorrência mensal, anual, múltiplos dias na mesma regra e exceções
individuais não fazem parte deste contrato; usar definições separadas quando
necessário. Bloqueios podem se sobrepor; a Agenda deve considerar a união dos
períodos ao verificar indisponibilidade.

## Consulta de ocorrências

`GET /occurrences` exige `from` e `to`, com offset explícito, início anterior ao
fim e intervalo máximo de 366 dias. Aceita `unit_id`, `practitioner_id`, `room_id`,
`offset` e `limit`. Retorna `{ items, total }`; cada item contém `block_id`, recurso,
unidade, motivo, fuso e os instantes efetivos `starts_at`/`ends_at`.

Os intervalos são semiabertos: `[início, fim)`. Um bloqueio que termina exatamente
em `from`, ou começa exatamente em `to`, não intercepta a consulta. A resposta
preserva os limites reais da ocorrência, mesmo que ela comece antes de `from`.
`total` conta ocorrências, não definições. A paginação mantém o total mesmo quando
o offset ultrapassa a última ocorrência.

A lista comum também aceita filtros de recurso/unidade, mas retorna definições
sem expandir recorrências nem aplicar filtros de data. Ambas as listas usam
`offset=0`, `limit=20`, máximo 100, ordenação por início e ID do bloqueio.
A expansão começa próxima do intervalo consultado; não percorre cada repetição
desde a criação de séries antigas ou sem data final.

## Alteração, exclusão e integração

PUT preserva campos omitidos. `unit_id: null` torna o bloqueio global,
`reason: null` limpa o motivo e `recurrence: null` remove a repetição. Informar
`recurrence` substitui a estrutura inteira. Para trocar o tipo de recurso, limpar
a referência anterior com null e fornecer a nova na mesma requisição.
Validações consideram o registro completo e ocorrem em transação; falhas não
gravam alterações parciais. Vínculos inválidos retornam 422. Itens inexistentes,
excluídos ou de outro tenant retornam 404.

DELETE mantém o registro e preenche `deleted_at`, retirando a definição e todas
as suas ocorrências das consultas. Não existe versionamento de Bloqueio neste
contrato: alterar ou excluir a definição também altera sua expansão histórica.
Não há exclusão de uma única ocorrência nem auditoria por autor nesta entrega.

Uma sala com bloqueios vinculados explicitamente à unidade não pode ser movida
para outra unidade; a API de Sala retorna 409, inclusive para registros de
bloqueios excluídos preservados no banco.

Cadastrar um bloqueio não cancela nem desloca consultas existentes. A integração
com criação/alteração de agendamentos deve consultar estas ocorrências e aplicar
a política de conflitos. Os endpoints de Disponibilidade continuam retornando
janelas padrão e não descontam bloqueios automaticamente.

## Banco e implantação

[0005_schedule_blocks.sql](../infra/database/migrations/0005_schedule_blocks.sql)
cria `app_schedule_blocks`, índices, checks e chaves estrangeiras compostas que
impedem vínculos entre tenants e salas de outra unidade. Adiciona uma chave única
em salas sem alterar os registros existentes. Aplicar com o fluxo oficial
`npm run db:migrate` antes de usar os endpoints na instalação.

Contrato completo no [OpenAPI](./openapi/openapi.yaml).
