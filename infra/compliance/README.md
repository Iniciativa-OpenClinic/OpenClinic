# Compliance: catálogo, verificações e auditoria assistida

Este diretório acompanha a evolução do template usado como base para o OpenClinic oficial. As ferramentas também podem ser usadas por aplicações derivadas: nome e versão são lidos do package.json; não há dependência de caminhos privados, do Appserver ou de um serviço de IA.

## Começar pelo menu

Na raiz do clone, com as dependências do projeto já instaladas:

```bash
npm run compliance
```

O menu em português permite executar gates, consultar/validar o catálogo, criar rascunhos e preparar auditorias assistidas. Use o número da opção. Antes de rodar os gates, o menu mostra o plano e pede confirmação. Sem TTY, nenhum menu ou teste inicia implicitamente: informe um subcomando.

```bash
npm run compliance -- --help
```

## Comandos para desenvolvedores e CI

| Objetivo | Comando |
| --- | --- |
| Listar cenários de sessão/autenticação | `npm run compliance -- catalog list --scope auth,sessions` |
| Validar catálogo e referências | `npm run compliance:catalog` |
| Ver plano sem executar/escrever | `npm run compliance -- verify --scope auth,sessions --dry-run` |
| Rodar verificações locais | `npm run compliance:quick` |
| Rodar e exigir evidência de cada cenário obrigatório | `npm run compliance -- verify --scope auth,sessions --strict --non-interactive` |
| Testar o runner | `npm run compliance:test` |
| Criar cenário em novo módulo | `npm run compliance -- catalog new --module scheduling --id SCH-CREATE-001 --title "Criar agendamento"` |
| Preparar manutenção do catálogo | `npm run compliance -- guide --task catalog --scope all` |
| Preparar auditoria operacional | `npm run compliance -- guide --task verification --scope auth,sessions` |
| Preparar revisão de arquitetura | `npm run compliance -- guide --task architecture` |
| Preparar revisão de governança | `npm run compliance -- guide --task governance` |
| Preparar parecer geral | `npm run compliance:report` |

As opções e IDs são em inglês. Prompts, catálogo e documentação são PT-BR. O menu usa [catálogo de mensagens](./locales/pt-BR.json); é possível acrescentar tradução posteriormente sem manter cópias divergentes de regras técnicas.

## Perfis e limites de execução

O registro de gates está em [config.json](./config.json). O perfil local valida o catálogo, testa o runner e executa tipagem, suites unitárias/secrets e verificação de metadados de migrations. Esses comandos podem produzir artefatos de build, mas não provisionam banco pelo runner. Antes de alterar scripts registrados, revise seus efeitos; npm executa o código do clone.

O filtro scope seleciona **cenários para o relatório**, não reduz as suites globais de unidade/tipagem. Essa abrangência aparece no plano. Ainda não há um adaptador que atribua resultado a cada asserção individual: uma suite aprovada não marca automaticamente seus cenários como aprovados. O catálogo mostra referências parciais e lacunas.

O perfil integration acrescenta os testes PostgreSQL existentes, que criam/excluem bancos sintéticos. Exige DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS configurada explicitamente para servidor descartável em loopback e autorização específica:

```bash
npm run compliance:full -- --allow-disposable
```

Configure a variável pelo mecanismo seguro do seu ambiente; não cole credenciais em comandos versionados ou relatórios. Não há conexão padrão no runner, nem leitura automática de .env. Loopback não garante que o servidor seja descartável: quem autoriza precisa confirmar isso. Sem variável ou autorização, o gate fica BLOCKED e retorna código 2. Os scripts de integração chamados diretamente fora do runner podem ter defaults próprios; use este caminho protegido e revise seus contratos.

Swarm, navegador, HTTP contra aplicação publicada, MFA real, mini-carga, CLI offline e drift OpenAPI real permanecem verificações dos prompts/cenários quando não houver adaptador específico. O runner não os apresenta como aprovados por aproximações. Não instala ferramentas, não faz deploy nem altera versões/banco operacional.

## Resultados e códigos de saída

| Código | Significado |
| --- | --- |
| 0 | Operação concluída ou gates selecionados aprovados; não certifica todos os cenários |
| 1 | Um ou mais gates falharam, inclusive timeout |
| 2 | Argumento/pré-requisito inválido, gate bloqueado/skip ou cobertura obrigatória incompleta com strict |

Os relatórios Markdown e JSON são gravados em reports com data/hora e sufixo único. Contêm projeto/versão observados, commit, branch, indicador de alterações, fingerprint dos arquivos-fonte selecionados, comandos, duração, exit code, contadores reconhecidos e lacunas por cenário. Fingerprint não identifica o estado de um banco/processo externo e não inclui secrets: não use isoladamente como prova de mesma implantação.

Saída bruta dos processos não é persistida nem exibida, para evitar exposição de credenciais. Erros indicam o comando a reproduzir em ambiente controlado. Contadores não reconhecidos são null; suites com skips ficam pendentes de revisão. Os relatórios não atribuem notas, autoria de especialistas ou conformidade de segurança fictícias.

O modo strict retorna 2 enquanto cenários obrigatórios estiverem NOT_VERIFIED. Nesta primeira versão, isso é esperado: os vínculos são parciais e o runner ainda não importa evidência individual. Use-o como bloqueio conservador de aceite, não como substituto do resultado dos testes.

## Auditoria com IA, sem dependência de IA

O comando guide grava um pacote em .temp/compliance contendo os prompts locais e os cenários selecionados. Abra esse arquivo no assistente escolhido, com acesso ao clone, e solicite a execução da tarefa indicada no cabeçalho. Nenhuma IA é chamada automaticamente, nenhuma chave de provedor é necessária e nenhuma informação é enviada para terceiros pelo runner.

O pacote é uma fotografia. Se o código ou os prompts mudarem, gere outro. Relatórios anteriores e evidências devem ser consultados no clone e revalidados conforme o protocolo. Não execute o pacote como script de terminal.

O comando compliance:report prepara a tarefa de parecer geral; **não simula a auditoria nem produz um parecer completo por texto fixo**. O assistente deve realizar a análise e salvar o relatório técnico no projeto.

## Catálogo e evolução por módulo

A fonte canônica é [scenarios/catalog.json](./scenarios/catalog.json). Veja as [regras do catálogo](./scenarios/README.md).

1. Abra um rascunho para comportamento novo ou use um ID existente para regressão.
2. Defina contrato, pré-condições, passos, resultado observável e cleanup.
3. Associe testes reais por arquivo/título e gate; descreva cobertura parcial ou lacuna.
4. Revise e ative o cenário, preservando IDs e histórico.
5. Execute validação e gates; use auditoria assistida para os controles ainda não automatizados.

Módulos clínicos entram quando seus requisitos existirem; não são condição para encerrar a base transversal. Não é necessário criar um prompt por módulo: o catálogo é extensível. Prompts específicos só se justificam para critérios próprios de domínio.

## Prompts locais

| Tarefa | Documento |
| --- | --- |
| Regras comuns e evidências | [audit-protocol.md](./prompts/audit-protocol.md) |
| Verificação operacional | [application-verification.md](./prompts/application-verification.md) |
| Arquitetura, duplicação e core | [architecture-review.md](./prompts/architecture-review.md) |
| Governança, CLI e releases | [engineering-governance.md](./prompts/engineering-governance.md) |
| Parecer técnico consolidado | [technical-review.md](./prompts/technical-review.md) |
| Evolução de cenários | [scenario-catalog-maintenance.md](./prompts/scenario-catalog-maintenance.md) |

Os prompts têm nomes canônicos por responsabilidade. Referências internas foram atualizadas; não há aliases para nomes anteriores. Nenhum prompt externo é necessário. Notas técnicas só podem ser produzidas pela rubrica do prompt geral e com evidências.

## Manutenção

- O executável canônico é runner.mjs, usando apenas bibliotecas nativas do Node.
- Use subcomandos explícitos verify, catalog e guide; flags e atalhos obsoletos não são aceitos.
- --no-report suprime apenas a persistência da verificação; --dry-run também evita execução e escrita.
- Gates/configuração são código de confiança do repositório: revise alterações em PR. O runner não usa shell para interpolar argumentos do usuário.
- Novos gates devem ter finalidade delimitada, timeout e resultados verificáveis. Não usar exit code zero para inventar cobertura de cenários.
- Não editar relatórios anteriores como se fossem medições atuais.

As revisões de formato e origem permanecem nos [relatórios](./reports/). A documentação de contribuição e o catálogo devem acompanhar mudanças de comportamento em cada PR.

### Conexão atômica dos testes

A suíte lê DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASS do .env, com precedência das variáveis exportadas no processo. Não armazene URLs de conexão no .env. Para integração, selecione um servidor descartável em loopback, use DB_NAME=postgres e uma role com CREATEDB. A base da aplicação é recusada como conexão administrativa dos testes. As URLs são compostas apenas em memória, com encoding das credenciais. O runner continua exigindo autorização explícita para criar/remover bancos sintéticos.
