# API de unidades de atendimento

CRUD equivalente ao de Patient e Profissional sobre a tabela existente
`app_organization_units`, descrita no [esquema de banco](./database-schema.md).
A tabela já pertence à baseline; não é necessária migração.

Base: `/api/v1/business/units`. Exige JWT, tenant e permissão no recurso
institucional existente `menu_sys_institution` (papel mínimo ADMIN).

| Método | Caminho | Permissão | Resultado |
| --- | --- | --- | --- |
| GET | `/` | READ | `{ items, total }`; offset 0, limit 20, máximo 100 |
| POST | `/` | WRITE | Criação, status 201 |
| GET | `/:id` | READ | Consulta, status 200 |
| PUT | `/:id` | WRITE | Atualização dos campos enviados, status 200 |
| DELETE | `/:id` | DELETE | Exclusão lógica, status 204 |

Criação exige `name` e `organization_id`. A organização deve existir, não estar
excluída e pertencer ao tenant autenticado; isso também é validado ao alterar
o vínculo. Organização inválida retorna 422, sem revelar dados de outro tenant.

Campos opcionais: `trade_name`, `cnes_code`, `tax_id`, `cnpj`, `phone`, `email`,
`postal_code`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`,
`country` e `is_headquarters`. Textos opcionais aceitam null para limpeza.
CNPJ exige 14 dígitos numéricos e verificadores válidos. Email e comprimentos
são validados conforme a tabela. `state` permanece texto para compatibilidade
com o esquema que admite endereços internacionais.

IDs, tenant, estado ativo e timestamps são controlados pelo servidor.
Unidades excluídas ou de outro tenant retornam 404. A exclusão preserva os dados
e atualiza `is_active=false`, `deleted_at` e `updated_at`.

## Limites do modelo atual

O [dicionário de cadastros](./cadastros.md#unidade-de-atendimento) prevê campos
que ainda não existem na tabela: razão social da unidade, tipo de estabelecimento,
responsável técnico, identidade documental, horários, feriados e fuso IANA.
O endereço permanece opcional conforme o esquema vigente. CNES é armazenado
como texto com até 15 caracteres, sem validação de dígito nesta entrega.
Unicidade de CNPJ/CNES, unicidade de matriz e auditoria de alterações não são
garantidas por este CRUD e exigem evolução específica.

Contrato completo no [OpenAPI](./openapi/openapi.yaml).
