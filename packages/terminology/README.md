# @openclinic/terminology

Mecanismo de terminologia do OpenClinic: importa tabelas de códigos oficiais (TUSS, CID-10,
CIAP-2, CBO, operadoras ANS, conselhos profissionais, tabelas de domínio do Ministério da Saúde)
como dado versionado em banco, nunca fixado em código-fonte — conforme
[`docs/modulos.md`](../../docs/modulos.md#terminologias) e a certificação SBIS
([`ECF.17.10`](../../docs/conformidade-sbis.md), [`ECF.17.12`](../../docs/conformidade-sbis.md)).

O comando fica no CLI unificado do projeto (`packages/backend-cli`), não é uma ferramenta à
parte — veja [`packages/backend-cli/README.md`](../backend-cli/README.md) para a lista completa
de comandos.

## Uso

| Comando na raiz | Uso |
| --- | --- |
| `npm run terminology:sync -- --source <codigo>` | Sincroniza apenas a fonte indicada. |
| `npm run terminology:sync` | Sincroniza todas as fontes, na ordem abaixo. |
| `npm run terminology:sync -- --resume` | Ao sincronizar todas, pula fontes que já têm uma sincronização bem-sucedida e continua na próxima. Retomada de uma fonte específica a partir do ponto interrompido acontece automaticamente em qualquer chamada, com ou sem `--resume`. |

Exemplo real de saída — progresso periódico durante uma fonte paginada, e o resumo final de uma
fonte já concluída (bytes, páginas, tempo):

```
[..] tuss-22: page(s)=3 bytes=13.5KB (total unknown) elapsed=2m21s
[OK] ans-operadoras: fetched=1106 new=0 versioned=0 unchanged=1106 bytes=338.7KB pages=1 elapsed=1.2s
```

## Fontes disponíveis

| Código | Origem | Observação |
| --- | --- | --- |
| `tuss-19` | API paginada OCL da ANS | Materiais/OPME — cerca de 1,4 milhão de registros; muito lento. |
| `tuss-20` | API paginada OCL da ANS | Medicamentos. |
| `tuss-22` | API paginada OCL da ANS | Procedimentos — cerca de 5.964 registros. |
| `ans-operadoras` | CSV da ANS | Operadoras de planos de saúde ativas. |
| `cid10` | Bundle FHIR do Ministério da Saúde | ⚠️ A fonte limita a lista a 1000 conceitos — não é a tabela CID-10 completa. Um aviso é registrado no log quando esse limite é atingido. |
| `ciap2` | Bundle FHIR do Ministério da Saúde | CIAP-2. |
| `conselho-profissional` | Bundle FHIR do Ministério da Saúde | CRM, COREN, CRO etc. |
| `ms-estado-civil` | Bundle FHIR do Ministério da Saúde | Tabela de domínio (estado civil). |
| `ms-identidade-genero` | Bundle FHIR do Ministério da Saúde | Tabela de domínio (identidade de gênero). |
| `ms-raca-cor` | Bundle FHIR do Ministério da Saúde | Tabela de domínio (raça/cor). |
| `ms-tipo-documento` | Bundle FHIR do Ministério da Saúde | Tabela de domínio (tipo de documento). |
| `cbo-ocupacao` | CSVs do Ministério do Trabalho | Classificação Brasileira de Ocupações. |

As fontes `cid10`, `ciap2`, `conselho-profissional` e as quatro tabelas `ms-*` compartilham um
único download (o bundle FHIR "Terminologias do Brasil", ~26MB) — numa sincronização com várias
dessas fontes, o arquivo é baixado uma única vez e reaproveitado.

## Modelo de dados

Todas as fontes gravam no mesmo formato, no schema `terminology` (não `public` — é dado de
referência externo, não dado de tenant):

- **`terminology.sources`** — registro de cada fonte (código, nome, tipo, última sincronização).
- **`terminology.concepts`** — um conceito por `(sistema, código, idioma)`. Cada linha tem
  `version`, `language`, `display_name` (termo original), `inicio_vigencia`/`fim_vigencia`
  (vigência) — os campos exigidos pelo `ECF.17.10`.
- **`terminology.sync_runs`** — trilha de auditoria de cada tentativa de sincronização, incluindo
  o cursor de retomada em caso de interrupção.

### Versionamento — nada é sobrescrito

Rodar a sincronização de novo **nunca** apaga ou sobrescreve um conceito já gravado. Se o valor
mudou na fonte, a linha atual é fechada (`fim_vigencia = now()`) e uma nova linha "atual" é
criada; se nada mudou, a linha é preservada intacta. Um índice único parcial garante no máximo
uma linha "atual" (`fim_vigencia IS NULL`) por `(source_code, code, language)`.

```sql
-- Conceitos atuais de uma fonte
SELECT code, display_name FROM terminology.concepts
WHERE source_code = 'tuss-22' AND fim_vigencia IS NULL;

-- Histórico completo de um código específico
SELECT version, display_name, inicio_vigencia, fim_vigencia FROM terminology.concepts
WHERE source_code = 'tuss-22' AND code = '87000199' ORDER BY inicio_vigencia;
```

### Retomada após interrupção

A sincronização grava cada página/lote em sua própria transação — uma interrupção (`kill`,
queda de conexão, falha após esgotar as tentativas) preserva tudo que já foi gravado até ali.

- **Fontes paginadas** (as três tabelas TUSS): o ponto de retomada (`cursor`) é salvo a cada
  lote. Uma nova tentativa para a mesma fonte encontra a linha `RUNNING` órfã em
  `terminology.sync_runs`, reaproveita essa mesma linha e continua exatamente da página salva —
  nunca reinicia do zero.
- **Fontes de arquivo único** (CSV/ZIP — `ans-operadoras`, `cid10`, `cbo-ocupacao` etc.): não há
  um ponto natural de retomada no meio do download; uma nova tentativa refaz o download inteiro
  dessa fonte, o que é esperado e aceitável dado o tamanho desses arquivos.

Para verificar o estado de uma sincronização:

```sql
SELECT source_code, status, cursor, records_upserted, error_message
FROM terminology.sync_runs ORDER BY started_at DESC LIMIT 10;
```

Uma linha `RUNNING` sem `finished_at` indica uma tentativa interrompida — rodar o comando de
novo para essa fonte retoma automaticamente.

## Limitações conhecidas

- `cid10` traz no máximo 1000 conceitos (limite do próprio bundle publicado pelo Ministério da
  Saúde, confirmado contra o endpoint ao vivo) — não é a tabela CID-10 oficial completa.
- `tuss-19` tem cerca de 1,4 milhão de registros; uma sincronização completa é impraticável em
  uma sessão curta.
- O host da API TUSS (ANS) é frequentemente lento (dezenas de segundos a minutos por página) e
  às vezes fica indisponível — o mecanismo tolera isso (timeout configurável, novas tentativas
  com backoff, retomada), mas não pode garantir disponibilidade de um serviço de terceiros.

## Desenvolvimento

```bash
npm run build -w packages/terminology   # necessário antes de rodar o CLI via backend-cli
npm test -w packages/terminology        # testes unitários (vitest)
```

Testes que exercitam o banco real (`sync.test.ts`, `*.test.ts` dos adaptadores que tocam banco)
usam as mesmas variáveis atômicas `DB_HOST`, `DB_PORT`, `DB_NAME=postgres`, `DB_USER`, `DB_PASS`
de um servidor descartável em loopback, seguindo a convenção descrita em
[`infra/database/README.md`](../../infra/database/README.md#testes).
