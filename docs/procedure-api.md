# API de procedimentos

Catálogo de procedimentos conforme o [dicionário de cadastros](./cadastros.md#procedimento).
Base: `/api/v1/business/procedures`. Todas as operações exigem JWT, tenant
e permissão no recurso existente `base_procedures`.

| Método | Caminho | Permissão | Resultado |
| --- | --- | --- | --- |
| GET | `/` | READ | Lista `{ items, total }` |
| POST | `/` | WRITE | Criação, status 201 |
| GET | `/:id` | READ | Consulta, status 200 |
| PUT | `/:id` | WRITE | Atualização dos campos enviados, status 200 |
| DELETE | `/:id` | DELETE | Exclusão lógica, status 204 sem corpo |

## Contrato

Criação exige `name`, `estimated_duration_minutes` (inteiro positivo) e
`requires_room` (booleano). `is_active` assume true quando omitido.

```json
{
  "name": "Consulta inicial",
  "description": "Avaliação inicial",
  "category": "consulta",
  "estimated_duration_minutes": 30,
  "requires_room": true,
  "preparation_instructions": "Trazer exames anteriores",
  "return_after_days": 30,
  "minimum_interval_days": 0,
  "calendar_color": "#2288CC",
  "practitioner_ids": [],
  "is_active": true
}
```

Campos opcionais: `description`, `category`, `tuss_code`,
`preparation_instructions`, `return_after_days`, `minimum_interval_days`,
`calendar_color`, `practitioner_ids` e `is_active`.
Nome tem até 255 caracteres, categoria até 100, descrição e preparo até 10.000.
TUSS admite oito dígitos; a validação é de formato, sem consulta ao catálogo oficial.
Cor usa `#RRGGBB`. Retorno e intervalo admitem inteiros não negativos.
Inteiros são limitados a 2.147.483.647, conforme PostgreSQL.

PUT preserva campos omitidos. Campos textuais opcionais, retorno e intervalo
aceitam null para limpeza. `practitioner_ids: []` remove todos os vínculos;
omitir a lista preserva os vínculos existentes. A lista aceita até 500 IDs únicos,
de profissionais ativos, não excluídos e do tenant autenticado. Vínculo inválido
retorna 422 e desfaz toda a alteração, inclusive os campos do procedimento.
A resposta ordena os IDs; a ordem enviada não tem significado.

Lista aceita `offset` (padrão 0), `limit` (padrão 20, máximo 100),
`q` (busca literal, sem distinguir maiúsculas, em nome ou TUSS) e `is_active`.
Sem filtro de atividade, inclui ativos e inativos, sempre excluindo apagados.
Para seleção na agenda, usar `is_active=true`.
Ordenação: nome e ID. `total` considera os mesmos filtros da página.

Desativar via PUT preserva a consulta e permite reativar. DELETE marca
`is_active=false`, `deleted_at` e `updated_at`; o item deixa de ser acessível
neste CRUD. Item inexistente, excluído ou de outro tenant retorna 404.
ID, tenant e timestamps são controlados pelo servidor.

## Banco e implantação

A migração [0002_procedure_catalog.sql](../infra/database/migrations/0002_procedure_catalog.sql)
cria `app_procedures` e `app_procedure_practitioners`, com índices, checks e
chaves estrangeiras compostas por tenant. Adiciona uma chave única composta
em profissionais, preservando as colunas e os dados existentes.
Criação e alteração do procedimento e seus vínculos são transacionais.
Vínculos existentes são preservados como histórico se o profissional for
excluído posteriormente; a lista não substitui a validação de disponibilidade
do profissional no agendamento.

Antes de usar a API em uma instalação existente, aplicar a migração pelo fluxo
oficial `npm run db:migrate`. Não modificar a baseline nem executar geração
de esquema diretamente sobre o banco da aplicação.

## Dependências do produto

Preços pertencem às tabelas de preços dos pagadores e não integram este contrato.
O DTO compartilhado de Procedimento foi alinhado ao novo catálogo; seus antigos
campos de preço e especialidade não tinham consumidores no repositório.
Categoria permanece um código textual local; ainda não há cadastro persistido
de categorias nem validação contra a terminologia TUSS.
Salas compatíveis e kits dependem de seus próprios cadastros e não têm vínculos
nesta entrega. `requires_room` registra a exigência; aplicá-la ao agendamento
e executar baixas de estoque pertencem aos respectivos módulos.
Auditoria por autor e proveniência também dependem de evolução específica.

Contrato completo no [OpenAPI](./openapi/openapi.yaml).
