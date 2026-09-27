# API de profissionais

Implementação equivalente ao CRUD de Patient, baseada na tabela existente
`app_practitioners` e no [esquema de banco](./database-schema.md).
Não exige migração: a tabela já pertence à baseline.

## Contrato

Base: `/api/v1/business/practitioners`. Todas as operações exigem JWT,
organização do usuário autenticado e permissão no recurso `base_staff`.

| Método | Caminho | Permissão | Resultado |
| --- | --- | --- | --- |
| GET | `/` | READ | Lista `{ items, total }`, offset 0 e limit 20 por padrão, máximo 100 |
| POST | `/` | WRITE | Criação, status 201 |
| GET | `/:id` | READ | Consulta, status 200 |
| PUT | `/:id` | WRITE | Atualização dos campos enviados, status 200 |
| DELETE | `/:id` | DELETE | Exclusão lógica, status 204 |

Criação exige `full_name` e `practitioner_type`. Campos opcionais: `cpf`,
`job_title`, `council_type`, `council_number`, `council_uf`, `primary_specialty`,
`phone`, `email` e `is_clinical_staff`. Campos textuais opcionais aceitam null
para limpeza. CPF deve conter 11 dígitos e verificadores válidos; UF deve ser
brasileira; email e limites de tamanho são validados.

O tipo permanece texto conforme o esquema atual, que admite tanto categorias
funcionais quanto profissões dos DTOs compartilhados. Não há enum unificado
entre essas referências atualmente.

IDs, organização, vínculo com usuário e timestamps não são editáveis nesta API.
Registros excluídos ou de outra organização retornam 404. A exclusão preserva
o registro e marca `is_active=false`, `deleted_at` e `updated_at`.

## Limites desta entrega

O [dicionário de cadastros](./cadastros.md) prevê uma evolução mais ampla:
nome social, nascimento, endereço estruturado, CNS, RQE, vínculos por unidade,
dados de repasse e assinatura digital. Esses campos ainda não existem na tabela
atual e não são implementados por este CRUD. A vinculação de contas de acesso,
auditoria de alterações e bloqueio de duplicidade por CPF/conselho também
dependem de evolução específica; não são garantidos por esta entrega.

O contrato completo é gerado em [OpenAPI](./openapi/openapi.yaml).
