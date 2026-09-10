# Versionamento e operação do banco

## Decisão e plano executado

O SQL mestre acumulado foi substituído por migrations Drizzle imutáveis. A primeira versão pública contém:

- `migrations/0000_baseline.sql`: estrutura consolidada das 19 tabelas, constraints e índices. Sem remendos de versões antigas.
- `migrations/0001_reference_catalog.sql`: aplicação, tenant, recursos e grupos iniciais. Insere o que falta e preserva configurações e ACLs de grupos existentes.
- `migrations/meta/`: journal e snapshots usados pelo Drizzle Kit para gerar a próxima alteração.
- `baseline-schema.json`: estrutura PostgreSQL esperada para aceitar a adoção de um banco existente. Não contém dados de usuários.
- `verify-migrations.ts` e `tests/`: verificação de modelo/snapshots e testes de integração em PostgreSQL descartável.

O modelo editável continua em `packages/backend-api/src/arch/infrastructure/database/drizzle-schema.ts`. Os nomes das constraints e índices foram alinhados ao SQL anterior, incluindo o CHECK de permissões e o índice parcial de sessões. O antigo `schema.sql` e o seed SQL duplicado foram removidos.

O número da migration é independente da versão comercial da aplicação. Uma release Git identifica um conjunto exato de migrations; local e remoto mantêm seus próprios registros em `drizzle.__drizzle_migrations` (hash SHA-256 e timestamp do journal). Dados operacionais podem ser diferentes com a mesma versão estrutural.

## Conexões e credenciais

Defina `DATABASE_OWNER_URL` para desenvolvimento local e `REMOTE_DATABASE_OWNER_URL` para manutenção remota. A CLI carrega `.env` e também aceita variáveis do ambiente. O runtime usa apenas `DATABASE_URL`, com role DML.

O destino padrão é local e recusa hosts externos. Toda escrita remota exige `--target remote --confirm-target HOST:PORT/DATABASE`. Antes de migrations ou adoção remota, a CLI gera um backup completo em `backups/`; falha de backup interrompe a operação. Use um client `pg_dump` compatível com a versão do servidor. `PG_CLIENT_CONTAINER` seleciona um container para executar os clients se eles não estiverem instalados no host. Opções de conexão, inclusive SSL, são mantidas quando fornecidas na URL.

Roles, ownership, grants, extensões e permissões de infraestrutura não são dados de demonstração. São provisionados separadamente. No Docker local, `000-roles.sql` cuida das roles e grants padrão. A adoção compara a estrutura de `public`, mas não certifica credenciais, privilégios de roles nem configurações globais do servidor.

## Transição única dos bancos atuais

Não execute reset, seed de demonstração nem CREATE TABLE da baseline sobre a base atual.

1. Faça backup e ensaie a restauração em uma base isolada. Pause alterações estruturais durante a transição.
2. Execute `npm run db:baseline -- --check` no local. Isso compara tabelas, colunas, tipos, defaults, nulidade, constraints, índices, triggers, RLS e rotinas com a referência da baseline.
3. Se houver diferenças, o comando aborta e mostra o relatório. Investigue cada diferença; não force o registro nem apague tabelas. Ajustes de compatibilidade devem ser escritos e revisados para aquela base, com backup e ensaio. Não há um comando que silenciosamente "corrija tudo".
4. Com estrutura equivalente, execute `npm run db:baseline -- --apply`. Isso registra somente `0000`; preserva os registros existentes.
5. Execute `npm run db:migrate` para aplicar o catálogo `0001` e demais migrations pendentes. `npm run db:status` mostra o resultado.
6. Depois de validar localmente, repita check, adoção e migrate no remoto, explicitando o destino. A aplicação remota é uma etapa operacional separada; alterações no repositório não modificam bancos existentes.

Exemplos para o remoto, substituindo a identidade pelos valores reais da URL:

```text
npm run db:status -- --target remote
npm run db:baseline -- --target remote --check
npm run db:baseline -- --target remote --apply --confirm-target HOST:5432/openclinic
npm run db:migrate -- --target remote --confirm-target HOST:5432/openclinic
```

Uma adoção registra apenas estrutura; não afirma que os bancos têm os mesmos registros. Após a adoção não repita `db:baseline`: use `db:status` e `db:migrate`. O modo `db:sync-remote --mode users` consulta atividade; somente `clone` copia dados.

### Compatibilidade com a base de desenvolvimento anterior ao versionamento

A inspeção local de 2026-09-09 encontrou seis campos de texto maiores que o modelo, configurações sem NOT NULL, nomes antigos das constraints de `iam_permissions` e a coluna obsoleta `sys_applications.app_title`.

Para essa estrutura conhecida, `npm run db:baseline -- --check --reconcile-legacy` mostra uma transição concreta sem executar alterações. O comando verifica se os valores cabem nos tamanhos finais e se os campos obrigatórios estão preenchidos. Recusa diferenças estruturais não previstas e dados incompatíveis. O valor de `app_title` é preservado em `default_extra_settings.legacy_app_title` antes da remoção da coluna; um conflito nessa chave também interrompe o procedimento.

`npm run db:baseline -- --apply --reconcile-legacy` faz backup inclusive no local, aplica essa transição e registra a baseline na mesma transação. Locks bloqueiam escritas concorrentes durante a preparação; timeout ou erro reverte o lote. Depois execute `npm run db:migrate`. No remoto, acrescente `--target remote --confirm-target HOST:5432/openclinic`. Nunca suponha que a equivalência local/remoto ainda é válida: execute o check separadamente em cada base.

## Instalação nova

No desenvolvimento, suba `docker compose up -d db`, copie/configure `.env`, instale dependências e compile o core. Depois execute `npm run db:setup`. O banco e as roles precisam existir; setup não redefine senhas de roles. Para infraestrutura externa, `db:init` continua sendo um provisionamento administrativo explícito, separado das atualizações rotineiras.

O Compose completo tem um serviço `migrate` que roda antes da API. Não monta mais schema e seed de demonstração em `/docker-entrypoint-initdb.d`. Volumes antigos precisam da adoção acima; o migrador falha em vez de tentar recriar tabelas existentes.

Opcionalmente, antes de cadastrar usuários ou iniciar testes, execute `npm run db:seed -- --demo` ou use `npm run db:setup -- --demo`. A demonstração cria contas fictícias com senha `temp1234` e dados clínicos de exemplo, em transação. É exclusiva do destino local e recusa bancos com dados operacionais, inclusive uma segunda execução. Uma instalação sem demonstração usa `npm run user:create-admin` para criar a primeira conta.

`db:seed` sem `--demo` explica que o catálogo é instalado por migrations. O atalho destrutivo `db:reset` foi removido.

## Alterações futuras de estrutura e dados

1. Altere o modelo Drizzle e execute `npm run db:generate -- --name descriptive_change`. Revise o SQL e seus impactos, incluindo renames/drops sugeridos pelo gerador.
2. Para dados de referência ou backfills, crie uma migration customizada com `npm run db:generate -- --custom --name descriptive_data_change` e escreva SQL explícito, com escopo definido e validações. Não importe funções, manifesto ou seed mutáveis da aplicação em migrations históricas.
3. Execute `npm run db:verify`, `npm run typecheck`, `npm test` e os testes de migrations. Teste a atualização em uma cópia representativa do banco anterior.
4. Aplique localmente com `npm run db:migrate` e verifique `npm run db:status`.
5. Publique código e migrations juntos em uma release Git identificável. Use o mesmo checkout/release para operar local e remoto.
6. No remoto, confira status, faça a atualização com backup automático e valide login, permissões e fluxos afetados.

Uma migration de dados pode cadastrar um novo recurso, preencher uma coluna ou converter valores. Ela não sincroniza alterações feitas manualmente no banco local. Não transporte pacientes, sessões ou usuários dos testadores em atualizações normais. O catálogo inicial preserva ACLs de grupos existentes; mudanças de permissão posteriores precisam de uma migration explícita e revisada.

Nunca edite, renumere ou remova uma migration já aplicada em um ambiente compartilhado. Corrija com outra migration. Os arquivos usam LF para que o hash seja o mesmo em Windows e Linux. A CLI verifica toda a sequência aplicada, recusa divergências e impede duas operações de manutenção simultâneas com advisory lock.

As migrations pendentes e seu histórico são aplicados em uma transação; erro provoca rollback do lote. Há `lock_timeout` de 5 segundos e `statement_timeout` de 60 segundos para evitar espera indefinida. Isso não significa ausência de locks nem atualização sempre sem interrupção. Não escreva BEGIN/COMMIT/ROLLBACK nas migrations: a transação pertence ao runner. Comandos que não podem executar em transação, como CREATE INDEX CONCURRENTLY, exigem um procedimento próprio revisado e não são suportados por esse runner.

Enquanto houver testadores, prefira expandir antes de contrair: adicionar campo compatível, publicar código que o utilize, fazer backfill controlado e só em outra release remover a estrutura antiga. Para alterações incompatíveis, programe manutenção e pause todos os writers. Não há rollback automático de releases: prefira correção para frente; restauração de backup requer parada e pode descartar dados posteriores ao backup. O backup não substitui testes de compatibilidade.

## Clonagem excepcional local → remoto

Use apenas para substituir integralmente a base de testes por uma fotografia controlada do local. Os registros feitos remotamente deixam de existir na base ativa após essa operação.

```text
npm run db:sync-remote -- --mode clone --maintenance --confirm-target HOST:5432/openclinic
```

Pré-condições: fonte com todas as migrations aplicadas, URL remota explícita ou credenciais informadas, API/workers remotos pausados, sessões de banco fechadas, role de manutenção com CREATEDB e propriedade das bases envolvidas, roles referenciadas nos grants já provisionadas e espaço para backups e duas bases extras. Nenhuma permissão administrativa é concedida automaticamente. Também pause escritas no local se precisar de uma fotografia exata de um instante escolhido.

O comando verifica identidade de origem/destino e locks de manutenção, exige confirmação explícita mesmo com `--force`, faz backup dos dois bancos e restaura em uma nova base temporária. Erros de `pg_restore` abortam e nunca são convertidos em sucesso. Só depois de validar o histórico restaurado ocorre a troca de nomes das bases em transação. A antiga permanece como `oc_previous_TIMESTAMP`, com novas conexões desabilitadas, e os dumps permanecem em `backups/`.

A staging preserva encoding, locale libc, limite de conexões, grants de database e configurações por database/role do destino. A conexão de manutenção deve usar o owner do database com CREATEDB. Providers de locale diferentes de libc exigem preparação específica e são recusados, em vez de mudar implicitamente o comportamento de ordenação. Não há cópia de roles globais ou de configurações do servidor.

Sessões e tokens de recuperação de senha são removidos da cópia antes da ativação; usuários precisarão autenticar novamente. Depois, reinicie a release compatível, confira `db:status` e valide login e dados. A clonagem inclui `drizzle.__drizzle_migrations`, por isso a cópia mantém a versão da origem.

Em falha anterior à troca, a base original permanece ativa ou tem suas conexões reabilitadas; uma staging pode permanecer para investigação. Se uma falha de conexão impedir reabilitar ALLOW_CONNECTIONS, o comando emite erro crítico para intervenção. A limpeza de stagings, bases anteriores e dumps é deliberadamente manual após validar a recuperação. Não apague o último backup utilizável.

O modo `audit` é somente leitura e compara dados; contagens diferentes são normais com testadores. Ele não oferece mais reconciliação via seed. O modo `reset` foi removido. Nenhum monitoramento de sessões garante sozinho que não há writers: pause efetivamente os serviços para clonar.

## Testes

`npm run db:verify` é offline. Os testes de integração exigem `TEST_DATABASE_ADMIN_URL` de um PostgreSQL descartável em loopback com CREATEDB; criam e removem exclusivamente bancos `oc_test_*`. Execute `npm run test:migrations`. A CI usa PostgreSQL 17 e executa os cenários de instalação, adoção com preservação de dados, drift, checksum, concorrência, rollback e seed.

Para incluir o ensaio real de dump/restore e clonagem, defina também `TEST_PG_CLIENT=1` e disponibilize clients compatíveis, nativos ou via `PG_CLIENT_CONTAINER`. Esse ensaio mantém dumps e a base anterior até a destruição do servidor descartável, como a operação real. Os testes não usam `DATABASE_OWNER_URL` nem `REMOTE_DATABASE_OWNER_URL` para conexão.
