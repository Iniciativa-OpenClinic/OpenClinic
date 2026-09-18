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

Roles, ownership, grants, extensões e permissões de infraestrutura não são dados de demonstração. São provisionados separadamente. No Docker local, o cluster é inicializado com `POSTGRES_USER` e `POSTGRES_PASSWORD` (por padrão `postgres`), e o script de inicialização `000-roles.sh` provisiona os roles separados de owner e runtime (`DB_USER` / `DB_PASS`). A adoção compara a estrutura de `public`, mas não certifica credenciais, privilégios de roles nem configurações globais do servidor.

## Instalação limpa após a consolidação de 2026-09-15

O mantenedor autorizou descartar o histórico inicial e recriar as bases de desenvolvimento. O catálogo agora cria o tenant de sistema antes dos grupos e ACLs. Existem duas migrations: estrutura (0000) e catálogo (0001). A antiga 0002 foi incorporada à 0001 e removida junto do snapshot e registro no journal.

Bancos com o histórico anterior precisam ser recriados; não apague somente o journal nem force hashes para ocultar divergências. A recriação local já foi executada. A VPS exige identificar o destino exato e parar seus serviços consumidores antes de uma operação separada.

Para uma base vazia: provisione roles owner/app e grants, execute migrations como owner, confira db:status e crie o primeiro administrador. Dados de demonstração são opcionais. Os comandos de migrations não recriam bancos implicitamente.

A versão inicial do catálogo foi alinhada ao package.json nesta consolidação. Releases futuras devem registrar mudanças por novas migrations ou pelo fluxo de release, sem editar SQL já aplicado.

A adoção db:baseline permanece restrita a schemas equivalentes sem histórico. Não é uma atualização de bases com o histórico descartado.

### Contrato de desenvolvimento

Não há reconciliador automático de schemas de versões antigas. Use o schema atual e migrations verificadas. A adoção por db:baseline exige igualdade estrutural; divergências são rejeitadas. Recriar um banco descartável é uma operação explícita, nunca efeito de uma auditoria.

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

Nesta fase inicial não é necessário implementar expand/contract para versões antigas. Mantenha integridade de migrations, backups e confirmação de destino para proteger dados de desenvolvimento; uma recriação de banco exige ação explícita.

## Clonagem excepcional local → remoto

Use apenas para substituir integralmente a base de testes por uma fotografia controlada do local. Os registros feitos remotamente deixam de existir na base ativa após essa operação.

```text
npm run db:sync-remote -- --mode clone --maintenance --confirm-target <HOST>:<PORT>/<DB_NAME>
```

Pré-condições: fonte com todas as migrations aplicadas, URL remota explícita ou credenciais informadas, API/workers remotos pausados, sessões de banco fechadas, role de manutenção com CREATEDB e propriedade das bases envolvidas, roles referenciadas nos grants já provisionadas e espaço para backups e duas bases extras. Nenhuma permissão administrativa é concedida automaticamente. Também pause escritas no local se precisar de uma fotografia exata de um instante escolhido.

O comando verifica identidade de origem/destino e locks de manutenção, exige confirmação explícita mesmo com `--force`, faz backup dos dois bancos e restaura em uma nova base temporária. Erros de `pg_restore` abortam e nunca são convertidos em sucesso. Só depois de validar o histórico restaurado ocorre a troca de nomes das bases em transação. A antiga permanece como `<targetDb>_previous_<timestamp>`, com novas conexões desabilitadas, e os dumps permanecem em `backups/`.

A staging preserva encoding, locale libc, limite de conexões, grants de database e configurações por database/role do destino. A conexão de manutenção deve usar o owner do database com CREATEDB. Providers de locale diferentes de libc exigem preparação específica e são recusados, em vez de mudar implicitamente o comportamento de ordenação. Não há cópia de roles globais ou de configurações do servidor.

Sessões e tokens de recuperação de senha são removidos da cópia antes da ativação; usuários precisarão autenticar novamente. Depois, reinicie a release compatível, confira `db:status` e valide login e dados. A clonagem inclui `drizzle.__drizzle_migrations`, por isso a cópia mantém a versão da origem.

Em falha anterior à troca, a base original permanece ativa ou tem suas conexões reabilitadas; uma staging pode permanecer para investigação. Se uma falha de conexão impedir reabilitar ALLOW_CONNECTIONS, o comando emite erro crítico para intervenção. A limpeza de stagings, bases anteriores e dumps é deliberadamente manual após validar a recuperação. Não apague o último backup utilizável.

O modo `audit` é somente leitura e compara dados; contagens diferentes são normais com testadores. Ele não oferece mais reconciliação via seed. O modo `reset` foi removido. Nenhum monitoramento de sessões garante sozinho que não há writers: pause efetivamente os serviços para clonar.

## Convenções de Nomenclatura (Bancos e Backups)

Para garantir rastreabilidade, ordenação consistente e agnosticismo de projeto (sem prefixos proprietários ou hardcoded), as operações de banco seguem os seguintes padrões formais:

### 1. Backups e Dumps (`backups/`)

Padrão **Database-First** (`${database}_${action}_${timestamp}.dump`), com timestamp ISO compacto `YYYYMMDD_HHmmss`:

- **Backup manual local:** `<database>_local_backup_YYYYMMDD_HHmmss.dump`
- **Backup manual remoto:** `<database>_remote_backup_YYYYMMDD_HHmmss.dump`
- **Backup de segurança pré-migration:** `<database>_before-migration_YYYYMMDD_HHmmss.dump`
- **Backup de segurança pré-clone (origem):** `<sourceDb>_clone-source_YYYYMMDD_HHmmss.dump`
- **Backup de segurança pré-clone (destino):** `<targetDb>_clone-target_YYYYMMDD_HHmmss.dump`

### 2. Bancos de Staging, Arquivo e Testes

Nomes de bancos dinâmicos são derivados do banco alvo ou identificadores descartáveis, com banimento estrito de prefixos fixos como `oc_*`:

- **Staging temporário durante clonagem:** `<targetDb>_stage_YYYYMMDD_HHmmss`
- **Base anterior preservada para recuperação:** `<targetDb>_previous_YYYYMMDD_HHmmss`
- **Bancos descartáveis em testes de integração:** `db_test_<uuid>`

### 3. Nomenclatura de Roles e Banco de Dados (PoLP)

As roles de acesso ao PostgreSQL derivam diretamente do nome do banco de dados `<nome-db>`:

- **Banco de Dados:** `<nome-db>` (exemplo: `acme`)
- **Role de Aplicação (DML / Runtime):** `<nome-db>_app` (exemplo: `acme_app`)
- **Role de Owner (DDL / Migrações & CLI):** `<nome-db>_owner` (exemplo: `acme_owner`)

## Testes

`npm run db:verify` é offline. Os testes de integração exigem `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS` de um PostgreSQL descartável em loopback com CREATEDB; criam e removem exclusivamente bancos `db_test_*`. Execute `npm run test:migrations`. A CI usa PostgreSQL 17 e executa os cenários de instalação, adoção com preservação de dados, drift, checksum, concorrência, rollback e seed.

Para incluir o ensaio real de dump/restore e clonagem, defina também `TEST_PG_CLIENT=1` e disponibilize clients compatíveis, nativos ou via `PG_CLIENT_CONTAINER`. Esse ensaio mantém dumps e a base anterior até a destruição do servidor descartável, como a operação real. Os testes não usam `DATABASE_OWNER_URL` nem `REMOTE_DATABASE_OWNER_URL` para conexão.

### Conexão atômica dos testes

A suíte lê DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASS do .env, com precedência das variáveis exportadas no processo. Não armazene URLs de conexão no .env. Para integração, selecione um servidor descartável em loopback, use DB_NAME=postgres e uma role com CREATEDB. A base da aplicação é recusada como conexão administrativa dos testes. As URLs são compostas apenas em memória, com encoding das credenciais. O runner continua exigindo autorização explícita para criar/remover bancos sintéticos.
