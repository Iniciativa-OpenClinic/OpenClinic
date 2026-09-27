# Verificação operacional da aplicação

Atue como revisor de qualidade e plataforma. Execute verificações do template e produza evidências reproduzíveis. Não refatore a aplicação durante a auditoria.

Leia primeiro o [protocolo comum](./audit-protocol.md), obrigatório para pré-condições, limites, classificação e relatório. Use a [auditoria arquitetural](./architecture-review.md) para diagnóstico de design e a [governança](./engineering-governance.md) para identidade, release e adoção.

## Fontes e preparação

Consulte diretrizes locais (como `.agent/` se presente), [auth-spec](../../../docs/auth-spec.md), [ADRs](../../../docs/adr/), [manifests](../../../package.json), [workflows](../../../.github/workflows/) e [relatórios](../reports/README.md). Descubra scripts e ferramentas disponíveis; não fixe números mínimos de testes nem versões de runtime neste prompt.

Confirme raiz, working tree, alvo HTTP, proxy e readiness. Página HTML com 200 não comprova API ativa. Preserve os dados do mantenedor e registre os efeitos dos testes.

## 1. Gates separados

Após examinar os scripts atuais, execute os aplicáveis e autorizados, registrando cada resultado independentemente:

| Gate | Referência inicial | Evidência mínima |
| --- | --- | --- |
| Build | npm run build | Exit code, artefatos e warnings relevantes |
| Tipagem | npm run typecheck | Todos os workspaces previstos, sem fallback que esconda falha |
| Suíte padrão | npm test | Pacotes efetivamente executados, aprovados/falhos/ignorados |
| Secrets | npm run test:secrets | Verificar se já coberto; executar separadamente se o encadeamento anterior impediu a suíte |
| Metadados de migrations | npm run db:verify | Histórico, checksum e snapshots |
| Banco | npm run test:migrations | PostgreSQL descartável, todos os arquivos de teste descobertos |
| Distribuição | npm run test:secrets:swarm, se existente | Imagem final, setup, API e limpeza, não só build |
| HTTP/navegador | Ferramenta disponível e alvo autorizado | Cenários e respostas; não confundir mocks com instância |

Não repita gates aprovados sem mudança, falha ou hipótese nova que justifique. Não execute instalação implícita via ferramentas ausentes. Mantenha testes independentes disponíveis mesmo quando outro gate falhar.

## 2. Autenticação: contratos positivos e negativos

Cubra com fixtures próprias:

- Credencial correta/incorreta, identidade inexistente, payload ausente e JSON malformado. Verifique status, erro e serialização efetivos.
- Recuperação pública: corpo não revela token ou identidade existente; secrets não aparecem em logs. Teste entrega em canal sintético apropriado, expiração, uso único e revogação; remover token da resposta não comprova entrega.
- JWT adulterado/expirado, sid ausente, sessão inexistente/revogada/expirada e sid pertencente a outro usuário.
- Identidade desativada/excluída e mudança de papel/organização refletidas na política atual; não confiar apenas em claims antigas.
- Logout por cookie/corpo conforme contrato; usuário não revoga sessão alheia. Access e refresh deixam de autorizar após encerramento previsto.
- Refresh válido, replay sequencial, limite absoluto e concorrência: consumo e criação na mesma fronteira transacional, apenas um vencedor e rollback sem sessão órfã.
- Force a ordem A rotaciona → B detecta reutilização/revoga → A prossegue; nenhuma sessão deve sobreviver à invalidação prevista. Registre a política para retries e alcance da revogação.
- Lockout por aliases normalizados, incremento concorrente e proteção por origem; enumeração por tempo exige medição controlada, hash fictício equivalente e incerteza estatística.
- Comprimento de senha, TTL, MFA, primeiro acesso e inatividade: configuração aceita precisa alterar o comportamento backend; timer da UI não é controle de servidor.

### Regressões explícitas e abuso dos fluxos

- Logout: capture o refresh vigente e o access antes de encerrar; tente ambos após logout e confira ausência de nova sessão. Teste cookie somente, corpo somente e conflito entre ambos segundo a precedência aprovada, ausência de credencial, repetição e logout global quando suportado. Limpar cookie não comprova revogação no servidor.
- Reset e troca de senha: duas requisições concorrentes não consomem o mesmo token; senha, consumo do token e revogação prevista devem permanecer consistentes sob falha. Cubra reset administrativo, autoatendimento, senha temporária/primeiro acesso e endpoints alternativos API/CLI.
- Cadastro público: verifique habilitação e rejeição de campos como role, tenant, status e permissões que permitam autopromoção. Teste também mass assignment nas alterações administrativas e limites de autoridade do ator.
- Lockout/rate limit: confira limiar e tentativa seguinte, desbloqueio após prazo, reset do contador conforme política e aliases CPF/e-mail/username. Controle amostras, aquecimento e ordem na comparação temporal; não trate mensagens iguais como eliminação de enumeração. Se houver múltiplas réplicas, verifique compartilhamento do controle e confiança no proxy/origem.
- JWT: verifique algoritmo permitido e claims exigidas pela política (incluindo expiração, emissor e audiência quando aplicáveis), validação de formato e falha fechada; teste sem ler chaves reais.
- Cookies e CSRF: avalie HttpOnly, Secure, SameSite, Path, Domain, expiração e remoção no ambiente correspondente. CORS sozinho não é proteção CSRF; cubra refresh/logout e outras mutações autenticadas por cookie com origem não autorizada. Diferencie requisição cross-origin de cross-site.

## 3. Autorização e isolamento

Construa matriz papel × ação × recurso × organização. Inclua acesso direto à API, mesmo com menu oculto:

- OWNER, ADMIN e USER conforme política aprovada, sem inventar autoridade global.
- Leitura/escrita A → B em tenants, usuários, grupos, membros e concessões.
- Tenant ausente, suspenso ou inconsistente não remove filtros.
- DENY individual/de grupo versus MANAGE/ALL; grupos inativos não concedem acesso.
- Mudança de capacidades, autoexclusão/autorrebaixamento e proteção de contas privilegiadas.
- Correlação entre políticas declaradas, middleware realmente registrado e resultados HTTP.

Não certifique isolamento de uma listagem apenas porque retornou 200; compare os registros autorizados usando dados sintéticos.

Verifique default deny para ação/recurso desconhecido, cache de permissões invalidado e concessões mais amplas que a autoridade do ator. Cubra alteração de tenant padrão e sincronização ACL sob falha parcial. Para cada mutação sensível, confira evento de auditoria com ator, alvo, organização, resultado e correlação, sem credenciais; defina e teste a consistência entre mutação e gravação do evento.

## 4. Contrato HTTP, UI e OpenAPI

Confronte rota → caso de uso → DTO → schema de resposta → JSON no fio → consumidor. Verifique respostas de criação, IDs e dados públicos permitidos; nunca inclua token de recuperação em schema público para “corrigir serialização”.

Respeite envelopes previstos por operação; login, health e outras exceções devem ter contrato explícito, não adaptação forçada. Valide 400/401/403/422/429 conforme contrato, erros Fastify/Zod e detalhes de validação. HTTP 500 para erro de cliente requer investigação.

Examine o exportador antes de rodar: ele pode inicializar configuração e sobrescrever docs/openapi. Realize a verificação de drift OpenAPI de forma não-destrutiva através de comparação em memória ou exportação para diretório efêmero temporário (`.temp/`), comparando o schema resultante contra `docs/openapi/openapi.json` e `.yaml` sem sobrescrever os arquivos versionados rastreados pelo Git. Valide operationId, respostas e security scheme compatível com autenticação HTTP bearer; não imponha esquema OAuth2/apiKey de outro projeto.

No navegador (Edge ou Chrome), registre tráfego de rede e erros de console (pageerrors), fluxo de login, refresh, logout, recarregamento da página (`F5`) mantendo a sessão autenticada via renovação silenciosa de cookie HttpOnly sem deslogamento involuntário, capacidades limpas após encerramento de sessão, identidade/versão exibidas e responsividade de tela. Separe páginas demonstrativas (protótipos com MockDataBanner) de persistidas e leitura de CRUD. Confira CORS allowlist, cookies e headers observados, conforme transporte/ambiente. Tokens em memória não eliminam XSS.

### Concorrência e estado no frontend

Teste bootstrap autenticado e anônimo, refresh expirado/revogado e indisponibilidade de rede. Diferencie 401 de 403: falta de permissão não deve iniciar ciclo de refresh. Verifique renovação coordenada em requisições simultâneas e múltiplas abas, ausência de loops/retries ilimitados e limpeza de dados/capacidades ao trocar usuário ou tenant. Uma resposta atrasada de refresh após logout não pode restaurar a sessão. Confira o ciclo adicional de efeitos em desenvolvimento quando aplicável e não substitua evidência de navegador por testes mockados.

Use regressões transversais em CRUD IAM existente: entrada inválida retorna erro de cliente, criação devolve dados públicos previstos e leitura subsequente confirma persistência. Reutilize as lições do Patient original sem criar módulo clínico para testar o template. Verifique paginação/limites e exposição excessiva de campos nas listagens.

Quando houver autorização para mini-carga em alvo descartável, registre concorrência, duração, erros, recursos e percentis de health, rota autenticada e login. Não use os tempos históricos do Fable como SLA nem custo Argon2 como defeito por si só. Avalie bundle por carregamento medido e orçamento acordado; reduzir cada chunk abaixo de um aviso não comprova ganho.

## 5. Banco e distribuição

- Confira fixtures contra NOT NULL, FK e unicidade antes de concluir sobre a lógica; preserve a falha original se usar cópia diagnóstica.
- Teste instalação nova, catálogo atual/customizado, colisões de IDs, reaplicação pelo runner, rollback e adulteração de histórico. Não exija que toda instrução SQL possa ser reaplicada fora do runner.
- Descubra pré-requisitos como DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS e cliente pg_dump/pg_restore no código da suíte; registre disponibilidade e privilégios necessários, nunca valores de conexão. Ausência de pré-requisito é bloqueio/skip explícito, não sucesso.
- Habilite explicitamente cenários opcionais de clone/restore quando houver cliente e alvo descartável; declare skips.
- Para concorrência, use conexões independentes e barreiras verificáveis.
- Confirme owner/runtime por grants reais, incluindo auditoria protegida contra alteração indevida.
- Teste providers suportados, precedência, configuração incompleta e falha sem vazamento. Não teste contra secrets reais.
- Verifique confirmação de identidade do destino e backup antes de escritas remotas conforme contrato do CLI; nomes portáveis, restore validado e interrupção quando o backup obrigatório falha. Use somente destinos descartáveis autorizados.
- Verifique dependências na imagem final, startup, liveness/readiness, fechamento de conexão e cleanup restrito aos recursos da suíte.

## 6. Identidade e versão

Execute os cenários de [governança](./engineering-governance.md) somente em modo de teste autorizado: CLI --help/--version sem banco, nome configurável e versão do artefato. Fluxos de release devem ser simulados em alvo descartável; não aumentar versão nem publicar durante a auditoria.

## Relatório e conclusão

Use o formato do protocolo em `infra/compliance/reports/YYYY-MM-DD-application-verification-HHmmss.md` (onde `HHmmss` representa a hora, minuto e segundo no fuso local, tal como `YYYY-MM-DD-application-verification-HHmmss.md`). Inclua matriz por gate e por cenário de segurança, limitações e regressões históricas. Diagramas de fluxo de autorização e estados devem ser apresentados em blocos cercados por três crases, com `mermaid` após a cerca de abertura, válidos e renderizáveis graficamente. Gate aprovado não compensa outro falho ou bloqueado. A conclusão exige evidência de todos os cenários declarados como cobertos, não uma contagem fixa.

## Catálogo local e runner

Consulte [scenarios/catalog.json](../scenarios/catalog.json), as [regras de manutenção](../scenarios/README.md) e o [guia de comandos](../README.md). Use IDs estáveis nos achados e na matriz de cobertura. Valide referências com `npm run compliance -- catalog validate`. O runner registra gates e vínculos, mas não aprova cenários por associação nem gera pareceres técnicos fixos. Para novos módulos, siga o [prompt de manutenção](./scenario-catalog-maintenance.md).
