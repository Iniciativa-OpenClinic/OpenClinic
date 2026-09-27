# Testes de Agenda e critérios de prontidão

## O que cada aprovação significa

- `npm test -w packages/backend-api`: testes unitários e de componentes. Os de
  rota que usam mocks verificam validação, encaminhamento, serialização e hooks;
  não demonstram gravação ou conflito real. Seus nomes identificam essa limitação.
- `npm run test:migrations`: instalação/atualização e testes de repositório no
  PostgreSQL, incluindo transações, isolamento e concorrência.
- `npm run test:api:functional`: aplicação real ouvindo HTTP em porta local
  aleatória, login com senha/Argon2, sessão e ACL persistidas, serviços e
  repositórios reais, banco migrado e releitura via GET e SQL. Não usa `vi.mock`,
  UOW falso, respostas prontas, `app.inject` ou tokens fabricados.
- `npm run verify:agenda-readiness`: verificação separada de cobertura dos
  requisitos obrigatórios. Consome o resultado real da execução funcional,
  rejeita falhas/skips e verifica que os arquivos de teste não mudaram após a
  execução. Não é um teste funcional nem entra no contador de testes aprovados.

Nenhuma dessas aprovações isoladamente garante que o produto inteiro está
pronto para produção. A referência de produto é `origin/main` no commit
`c6627a1ba468bfefbf11562d9064a1e9ea9789c8`: `docs/cadastros.md`, `docs/modulos.md`,
`docs/prd.md` e a decisão FHIR 0001. URLs, campos e escolhas ainda não definidas
na principal usam os contratos publicados de cada API, explicitamente como
contratos locais. As expectativas dos testes não são geradas dos mapas ou
resultados da implementação.

## Cenários funcionais

| Requisito | Verificação observável |
| --- | --- |
| REG-CRUD | Paciente, profissional, unidade, procedimento e sala: leitura, alteração persistida, lista, isolamento e exclusão lógica. |
| AG-CREATE / AG-DURATION | Reserva com vínculos reais; duração herdada/ajustada, preservada após mudar o catálogo. |
| AG-ROOM / AG-RESOURCES | Sala obrigatória e da unidade correta; recursos inativos, excluídos ou inelegíveis rejeitados. |
| AG-FITIN | Sem janela disponível, reserva comum falha e encaixe explícito é persistido. |
| AG-AVAILABILITY / AG-AVAILABILITY-INPUT | União de janelas adjacentes, lacunas, dia/vigência e rejeição de slot maior que a janela. |
| AG-TIMEZONE | Mesmo horário local atravessando mudança de horário de verão. |
| AG-VERSION | Alteração cria versão; período anterior continua no histórico e mantém sua cobertura. |
| AG-CONFLICT / AG-CONCURRENCY | Exclusividade de sala/profissional entre unidades; duas requisições concorrentes deixam exatamente uma reserva. |
| AG-BLOCKS / AG-BLOCK-CRUD | Bloqueios globais/recorrentes e de sala, limites de período, alteração e exclusão efetivas. |
| AG-LIFECYCLE / AG-QUEUE / AG-DEVIATIONS | Status conferido na resposta, em novo GET e no banco; fila filtrada; cancelamento/falta liberam horário. |
| AG-DELETE | Reserva sai das consultas e permanece fisicamente no banco com exclusão lógica. |
| SEC-TENANT / SEC-AUTH / SEC-ACL | Outro tenant não acessa/altera dados; sessão revogada falha; READ persistido não concede WRITE/DELETE. |

`appointment-domain.spec.ts` testa funções reais de validação e transições,
sem mocks. Sua lista esperada é explícita; não importa a tabela de transições
do código para construir o resultado esperado.

## Ambiente e execução

Usar PostgreSQL 17 **descartável**, com `DB_HOST` de loopback, `DB_NAME=postgres`
e credenciais explícitas de teste em `DB_PORT`, `DB_USER` e `DB_PASS`. O harness
recusa um alvo de aplicação, cria um banco novo, aplica as migrações e cria um
usuário de aplicação sem superuser, CREATEDB ou CREATEROLE. O usuário de
manutenção prepara somente identidade/estrutura; os cadastros clínicos são
criados pela API. Senhas e JWT de teste são fornecidos ao aplicativo por arquivos
temporários. Não usar credenciais nem dados reais de pacientes.

O teste encerra o servidor HTTP, remove seu banco/role e os segredos temporários.
O contêiner PostgreSQL continua sendo responsabilidade do executor. Como em
qualquer teste de integração, interrupção forçada do processo pode exigir
descartar o contêiner de teste inteiro.

```sh
npm ci
npm run build -w packages/core
npm run test:api:functional
npm run verify:agenda-readiness
```

O runner grava `artifacts/functional-tests.tap` (log completo) e
`artifacts/functional-tests.json` (resultado por cenário). O CI publica ambos,
mesmo quando há falhas. A etapa de migração/funcional e a etapa de prontidão
aparecem como jobs distintos. O gate de prontidão não usa `continue-on-error`
nem converte requisitos pendentes em testes aprovados.

Ainda faltam testes de aceitação sustentados por implementação/contrato para
histórico/autoria, FHIR, sessões planejadas, identidade de parceiros, referência
a pagador e webhooks. O gate permanece reprovado por esses requisitos. Não se
deve remover um requisito para obter verde: implementar o comportamento e seu
cenário identificável, ou aprovar formalmente uma mudança na especificação.
Ver [revisão de conformidade](./appointment-review.md).

## Correção do erro inicial do CI

O cenário de união de janelas usava slot padrão de 30 minutos em janelas de
15 e 10 minutos. A API rejeitava corretamente a preparação com 422. O contrato
de [Disponibilidade](./availability-api.md) exige que o slot caiba na janela.
As fixtures agora informam 15 e 10 minutos explicitamente, e um cenário
separado exige 422 para a combinação inválida. Não se alterou a API para
aceitar dados inválidos nem se afrouxaram as asserções de conflito.

O novo cenário de versionamento exige **201**, conforme o contrato publicado
do PUT de Disponibilidade, além de novo ID e preservação dos valores antigos.
Isso difere de edição comum com status 200.

O trecho de log do usuário indicava duas falhas, mas omitia os blocos `not ok`.
A falha de preparação acima foi reproduzida; a outra não pode ser identificada
a partir desse recorte. O artefato TAP preserva os detalhes para investigação.

## Resultado da verificação local

- 26 cenários funcionais passaram com HTTP e PostgreSQL reais, sem skips.
- 434 testes unitários e de componentes do backend passaram.
- `npm run typecheck` passou.
- Em uma cópia temporária, remover a validação de agenda fez AG-FITIN falhar:
  recebeu 201 onde o contrato exige 409. O código original permaneceu intacto.
- O gate de prontidão reprovou pelos seis requisitos pendentes listados acima.

Esses resultados são locais; não representam uma nova execução do GitHub Actions.

## Limites que continuam exigindo validação de produção

Esta suíte não substitui teste de carga, múltiplas instâncias da API,
infraestrutura TLS/proxy, recuperação de desastre, avaliação clínica ou
conformidade FHIR/SBIS. Usa conexões concorrentes de verdade, mas não afirma
cobertura de todas as intercalações possíveis. Testes de CI não devem ser
descritos como garantia absoluta de produção.
