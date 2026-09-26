# API de salas

Cadastro conforme [Sala](./cadastros.md#sala) e o módulo
[Organização](./modulos.md#organização). Base: `/api/v1/business/rooms`.
Exige JWT, tenant e permissão no recurso institucional `menu_sys_institution`,
o mesmo utilizado por Unidade.

| Método | Caminho | Permissão | Resultado |
| --- | --- | --- | --- |
| GET | `/` | READ | `{ items, total }` |
| POST | `/` | WRITE | Criação, status 201 |
| GET | `/:id` | READ | Consulta, status 200 |
| PUT | `/:id` | WRITE | Atualização dos campos enviados, status 200 |
| DELETE | `/:id` | DELETE | Exclusão lógica, status 204 sem corpo |

## Campos

| Campo | Obrigatório na criação | Contrato |
| --- | --- | --- |
| `name` | Sim | Nome não vazio, até 255 caracteres |
| `unit_id` | Sim | ID de uma unidade ativa, não excluída, do tenant autenticado |
| `is_schedulable` | Sim | Booleano: a sala pode ser selecionada como recurso da Agenda |
| `room_type` | Não | Código local do tipo de sala, até 100 caracteres; aceita null |
| `equipment` | Não | Lista de equipamentos/recursos; padrão `[]`, até 100 textos distintos não vazios de até 255 caracteres |
| `notes` | Não | Observações, até 10.000 caracteres; aceita null |
| `is_active` | Não | Booleano, padrão true |

```json
{
  "name": "Consultório 1",
  "unit_id": "ID_DA_UNIDADE",
  "room_type": "consultorio",
  "is_schedulable": true,
  "equipment": ["Maca", "Ultrassom"],
  "notes": "Primeiro andar"
}
```

PUT preserva campos omitidos. `equipment: []` limpa a lista; `room_type: null`
e `notes: null` limpam os textos opcionais. Booleanos exigem true/false;
null, números e strings não substituem valores booleanos no corpo.
Alterar a unidade exige novamente uma unidade ativa e do mesmo tenant.
Se já houver histórico de disponibilidade para a sala, a troca de unidade retorna
409 para preservar a localização histórica; cadastrar outra sala na unidade de destino.
Vínculo inválido retorna 422, sem gravar alterações parciais.

IDs, tenant e timestamps são definidos pelo servidor. A resposta inclui
`created_at`, `updated_at` e `deleted_at`. Exclusão lógica marca a sala inativa
e preenche `deleted_at`; salas excluídas ou de outro tenant retornam 404.
Desativar via PUT preserva a consulta e permite reativar; exclusão via DELETE
não pode ser revertida neste CRUD.

## Consulta

GET aceita `offset` (padrão 0), `limit` (padrão 20, máximo 100), `unit_id`,
`is_active`, `is_schedulable` e `q` (busca literal por nome, sem distinguir
maiúsculas). Os filtros são combinados; `total` considera os mesmos filtros.
Ordenação por nome e ID. Sem filtros booleanos, inclui ativos/inativos e
agendáveis/não agendáveis; registros excluídos nunca são listados.

Para selecionar salas na Agenda, filtrar por unidade, `is_active=true` e
`is_schedulable=true`. O módulo Agenda também precisa validar a atividade da
unidade, disponibilidade e conflitos no momento da reserva. Marcar uma sala
como agendável não cria horários nem reservas.

## Persistência e dependências

A migração [0003_room_catalog.sql](../infra/database/migrations/0003_room_catalog.sql)
cria `app_rooms`, índices por tenant/nome e tenant/unidade e chave estrangeira
composta `(tenant_id, unit_id)`, que também bloqueia vínculos entre tenants em
SQL direto. A chave única adicional em Unidade preserva seus dados existentes.
Criação e alteração validam a unidade dentro da mesma transação, com bloqueio
de leitura durante a gravação. Salas existentes permanecem no histórico se a
unidade for desativada ou excluída posteriormente.

Aplicar a migração pelo fluxo oficial `npm run db:migrate` antes de usar a API
em uma instalação existente. A baseline permanece inalterada.

Tipos de sala são códigos locais textuais; o cadastro de terminologias ainda
não existe. Equipamentos descrevem a sala, mas não calculam automaticamente
compatibilidade com procedimentos. Reservas, conflitos, manutenção predial,
auditoria por autor e proveniência ficam para seus respectivos módulos.

Contrato completo no [OpenAPI](./openapi/openapi.yaml).
