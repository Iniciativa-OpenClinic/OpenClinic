# OpenClinic database CLI

O fluxo vigente está no [guia de versionamento e operação](../../infra/database/README.md).

| Comando na raiz | Uso |
| --- | --- |
| `npm run db:status` | Consulta histórico e migrations pendentes. |
| `npm run db:baseline -- --check` | Compara uma base existente com a baseline, sem escrever histórico. |
| `npm run db:migrate` | Aplica somente migrations pendentes, incluindo dados de referência versionados. |
| `npm run db:setup` | Migrations e verificação de autenticação sobre banco já provisionado. |
| `npm run db:seed -- --demo` | Dados fictícios opcionais em banco local sem dados operacionais. |
| `npm run db:init` | Provisionamento administrativo explícito; não faz parte de atualizações normais. |
| `npm run db:backup` / `npm run db:restore` | Backup e restauração completos. Erros do client PostgreSQL interrompem a operação. |
| `npm run db:sync-remote -- --mode users` | Consulta atividade, sem copiar dados. |
| `npm run db:sync-remote -- --mode audit` | Comparação de dados somente leitura. |
| `npm run db:sync-remote -- --mode clone --maintenance --confirm-target <HOST>:<PORT>/<DB_NAME>` | Substituição excepcional da base remota, com staging, backups e retenção da base anterior. |

O destino padrão de migrations é local, resolvido por `DATABASE_OWNER_URL` (ou sintetizado automaticamente a partir das variáveis atômicas `DB_*` do `.env`). Para o remoto use `REMOTE_DATABASE_OWNER_URL` e `--target remote`. Escritas remotas exigem também `--confirm-target HOST:PORT/DATABASE` e fazem backup antes de alterar o banco. `DATABASE_URL` é exclusiva do runtime e de comandos de autenticação, nunca fallback de migrations.

Os arquivos de dump e backup em `backups/` seguem o padrão Database-First (`${database}_${action}_${timestamp}.dump`), as roles derivam diretamente do banco (`<database>_owner` e `<database>_app`) e bases de staging/clone utilizam nomenclatura agnóstica (`${targetDb}_stage_${timestamp}` e `${targetDb}_previous_${timestamp}`), conforme detalhado em [Convenções de Nomenclatura](../../infra/database/README.md#convenções-de-nomenclatura-bancos-e-backups).

Migrations antigas são imutáveis. `npm run db:generate -- --name descriptive_change` gera a próxima mudança de estrutura. `npm run db:generate -- --custom --name descriptive_data_change` cria uma migration de dados revisável. `npm run db:verify` verifica o modelo contra snapshots; `npm run test:migrations` usa exclusivamente as variáveis atômicas `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASS` de um servidor descartável em loopback.

`db:reset` e o modo remoto `reset` foram removidos. O modo `audit` não chama seed nem oferece reconciliação automática. Contagens locais/remotas distintas são esperadas quando há testadores.
