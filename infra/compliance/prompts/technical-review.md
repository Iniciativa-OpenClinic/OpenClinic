# Relatório geral de arquitetura, segurança e governança

Atue como arquiteto e revisor técnico do projeto local. Produza um relatório geral consolidado para a liderança técnica, com parecer fundamentado, comparação entre componentes e plano por fases. A prioridade é autenticação, autorização e a camada transversal. Não implemente correções durante a auditoria.

## Recursos locais e autonomia

Leia o [protocolo comum](./audit-protocol.md) e aplique os critérios de [verificação operacional](./application-verification.md), [arquitetura](./architecture-review.md) e [governança](./engineering-governance.md). Todos esses arquivos pertencem ao clone auditado. Não são necessários Appserver, registro externo de projetos, snapshots externos, agentes nomeados, serviços pagos ou scripts de outra máquina.

Descubra o nome e a estrutura do projeto nos manifests e na configuração local; não fixe marca ou versão neste prompt. Consulte diretrizes locais (como `.agent/` se presente), [docs](../../../docs/), [manifests](../../../package.json), [packages](../../../packages/), [infra](../../), [workflows](../../../.github/workflows/) e [relatórios](../reports/README.md). Se um recurso local esperado tiver sido removido/renomeado, procure seu equivalente e registre a mudança; se ausente, prossiga com os critérios disponíveis e declare a limitação. Nunca invente contratos aprovados ou resultados.

O relatório funciona desde as primeiras fases de desenvolvimento: módulos futuros são não aplicáveis quando fora do escopo aprovado, não requisitos artificialmente reprovados. Recursos de segurança anunciados mas não implementados são pendências, não itens dispensados. Histórico remoto ou conversa anterior é opcional; a execução deve ser possível apenas com o repositório.

## Procedimento

1. Identifique data/fuso, autor real, raiz, commit, branch, alterações locais relevantes, manifests, lockfile e alvo/artefato. Registre modo completo ou consolidação documental.
2. Descubra componentes e responsabilidades: core, API, CLI, frontend, infraestrutura/compliance e módulos novos. Não presuma quatro pacotes fixos nem dependa de projects-registry.json.
3. Monte inventário de critérios aplicáveis antes de pontuar, com IDs, eixo, componente, teste/evidência necessária e obrigatoriedade. Use os três prompts especializados como checklists; não os substitua por uma impressão geral.
4. Por padrão, execute a auditoria completa dentro das autorizações e pré-condições do protocolo. Reaproveite somente evidências cuja base e contexto tenham sido conferidos. Quando solicitada apenas consolidação documental, não execute suites e rotule claramente a limitação.
5. Inspecione scripts/runner antes de executá-los. Ausência de automação permite revisão manual delimitada; não exige instalação de ferramentas externas. Gere as evidências faltantes permitidas e marque bloqueios. Não transforme o resumo do runner em prova de seus controles.
6. Consolide achados duplicados por causa, preservando IDs/origens, cenários afetados e evidências. Registre conflitos entre relatórios e entre documento/código/instância.
7. Redija os pareceres e calcule indicadores pela rubrica abaixo. Faça a revisão final de coerência e grave o relatório no projeto.

## Formato obrigatório do relatório

Grave em `infra/compliance/reports/YYYY-MM-DD-technical-review-HHmmss.md`, com sufixo adicional em colisões. Use links relativos a arquivos existentes; referências a evidências não disponíveis devem ser texto com limitação, não links fictícios. Não sobrescreva relatórios anteriores.

### Cabeçalho

Título: Relatório Geral de Arquitetura, Segurança e Governança — nome observado do projeto.

Informe data/hora/fuso, autor e participantes reais, destinatário (liderança técnica/mantenedores), modo, base Git/working tree, componentes e ambientes avaliados. Mostre status da auditoria, cobertura e índice técnico quando calculável. Não atribua autoria a um conselho de agentes que não participou.

### 1. Resumo executivo para a liderança técnica

Apresente o estado atual, pontos fortes comprovados, principais riscos, lacunas de evidência, decisões necessárias e ordem de ação. Diferencie continuidade de desenvolvimento de prontidão para produção; autorização de deploy não decorre deste relatório. Não conclua imunidade a XSS/SQL injection ou ausência de vulnerabilidades apenas por uso de memória/ORM ou ausência de alerta.

### 2. Quadro geral comparativo por componente

Use as colunas: componente/categoria; DDD (20%); SOLID/qualidade (15%); Clean Architecture (25%); segurança/infraestrutura (25%); contratos/modelagem (15%); índice; cobertura; delta; status; evidências.

Cada célula deve distinguir nota, não aplicável justificado e não verificado. Conte endpoints, tabelas, testes e pacotes somente se efetivamente inventariados, com definição da unidade (path não equivale a operação HTTP). Exiba infraestrutura e CLI quando aplicáveis; não invente SDK mobile ou outro stack.

### 3. Pareceres técnicos por domínio

Inclua cinco subseções, redigidas pelo auditor real a partir das perspectivas técnicas abaixo:

1. Segurança e infraestrutura: login, reset, sessões, revogação, concorrência, RBAC/ACL, isolamento, configuração efetiva, secrets, privilégios, dependências e imagem final.
2. Backend e banco: domínio/aplicação/adaptadores, DI, transações, repositories, constraints, migrations, catálogo atual, auditoria e integridade sob falha.
3. Frontend: integração HTTP, bootstrap/renovação de sessão, concorrência/logout, capacidades, i18n, acessibilidade verificada, mocks versus persistência e desempenho medido.
4. Core, CLI e reutilização: fronteiras browser/server, duplicações e extrações justificadas, dependências empacotadas, hardcode, identidade configurável e CLI offline.
5. Governança e evolução: contratos entre pacotes, onboarding, gates reais de CI, qualidade do runner, versões/package/banco, deploy/rollback e autonomia do template.

Em cada subseção registre: escopo e métodos; pontos fortes com evidências; achados e impacto; itens não aplicáveis; limitações; recomendações; parecer setorial. Não use citações de especialistas fictícios nem elogios pré-escritos. Uma área não inspecionada deve receber parecer inconclusivo.

### 4. Mapa de relacionamentos e contratos

Inclua tabela produtor → consumidor → contrato/export/endpoint → regra de autorização/compatibilidade → evidência → divergência. Relacione core, API, CLI, frontend, banco e infraestrutura segundo o grafo real.

Confronte OpenAPI gerado/versionado/consumido, DTO/schema/JSON, configuração e metadados de release. Não exija que toda rota tenha consumidor frontend se houver cliente CLI/externo ou operação interna documentada. Para recursos ainda inexistentes, registre roadmap sem declarar implementação. Use Mermaid conforme o protocolo para representar dependências ou estados relevantes; não invente ligações.

### 5. Conclusão e parecer técnico de conformidade

Conclua com um dos estados do protocolo: aprovado no escopo verificado, com pendências ou inconclusivo. Explique quais critérios sustentam o parecer, quais pendências bloqueiam a entrega afetada, os riscos residuais e a revalidação necessária após mudanças.

Este é parecer técnico sobre evidências delimitadas, não certificação oficial/legal nem garantia de segurança total. Nenhuma nota permite compensar falha de autenticação/autorização, controle obrigatório ou integridade de dados. Falha conhecida gera pendência; ausência de evidência obrigatória torna inconclusiva a conclusão correspondente. Se coexistirem, declare ambas.

### 6. Achados e plano por fases

Use o esquema do protocolo: ID, causa, localização, evidência/reprodução, impacto, severidade, prioridade P0–P3, confiança, recomendação, dependências e teste de aceite. Nomeie responsáveis por função sugerida, sem alegar atribuição efetiva.

Ordene por risco: contenção e contratos → autenticação/sessões → autorização/isolamento → infraestrutura/contratos → portabilidade/governança → manutenção. Diferencie fase de prioridade. Liste decisões pendentes, critérios de conclusão e efeitos de compatibilidade.

### 7. Evolução histórica, cobertura e anexos

Inclua matriz histórico → base → evidência → corrigido/reaberto/pendente/não revalidado; gates e cenários executados, reutilizados, bloqueados, ignorados e não aplicáveis; comandos/exit codes/durações/artefatos sanitizados; itens fora do escopo. Finalize com avaliação da eficácia dos próprios prompts e melhorias propostas.

## Rubrica local de avaliação

Os cinco eixos e pesos preservam a estrutura comparativa de referência, com cálculo independente e auditável:

| Eixo | Peso | Critérios a decompor em verificações |
| --- | --- | --- |
| DDD | 20 | Linguagem e contexto, invariantes, responsabilidades de entidades/casos de uso, separação ARCH/BUSINESS quando aplicável |
| SOLID e qualidade | 15 | SRP/DIP, contratos de interfaces, duplicação semântica, tipagem e supressões justificadas |
| Clean Architecture | 25 | Direção real de imports, pureza do domínio, composição, ciclos, autonomia dos pacotes e core browser/server |
| Segurança e infraestrutura | 25 | Controles de identidade/autorização/sessão, isolamento, secrets, auditoria, privilégios e distribuição aplicáveis |
| Contratos e modelagem | 15 | DTO/JSON/OpenAPI, validação, persistência/transações/migrations, exports públicos e compatibilidade |

Antes de calcular, publique os critérios atômicos e associe evidências. Por critério avaliado: 1 = atende integralmente; 0,5 = atende parcialmente, com pendência identificada; 0 = não atende. Não verificado/bloqueado não recebe zero nem aprovação: fica fora da nota observada e dentro do denominador de cobertura. Não aplicável sai de ambos os denominadores, com justificativa por critério.

Nota do eixo = 10 × soma dos pontos / quantidade de critérios avaliados. Cobertura = avaliados / aplicáveis, informando numerador e denominador. Sem avaliados, nota = não determinada. Critério parcialmente atendido exige descrição objetiva do que falta; não divida artificialmente verificações para inflar pontuação.

Índice do componente = soma(peso × nota do eixo) / soma dos pesos aplicáveis, somente quando todos os critérios aplicáveis tiverem evidência suficiente. Em cobertura incompleta, mostre notas parciais por eixo e índice final não determinado. Se um eixo inteiro for não aplicável, normalize proporcionalmente os pesos restantes e mostre a conta; não dispense contratos automaticamente para core/SDK, pois exports e compatibilidade continuam aplicáveis.

Índice geral descritivo = média dos índices dos componentes, com composição e pesos iguais explicitados, apenas se todos forem calculáveis. Ele nunca define o parecer de aprovação. Apresente riscos e bloqueios separadamente.

Delta só pode comparar mesmo escopo, critérios, pesos e método com relatório local anterior identificável. Mudança de base do código é esperada na evolução; mudança de rubrica/cobertura exige delta não comparável, com explicação. Não dependa de latest-scores.json e não crie baseline perfeito.

## Revisão final obrigatória

Confira se toda conclusão possui evidência e se notas/totais/cobertura/deltas são reproduzíveis. Verifique conflitos entre pareceres, skips e conclusão; autoria verdadeira; ausência de marca/versão/contagens fixas; preservação de histórico; links relativos, tabelas e cercas Markdown válidos. Use validadores locais disponíveis sem instalar dependências. Declare validações indisponíveis, incluindo renderização Mermaid se não observada.

Entregue no chat o link do relatório salvo, o parecer, os principais bloqueios/próximos passos e as limitações. Não entregue somente um plano nem modifique código, versões, banco ou deploy para melhorar a nota.

## Catálogo local e runner

Consulte [scenarios/catalog.json](../scenarios/catalog.json), as [regras de manutenção](../scenarios/README.md) e o [guia de comandos](../README.md). Use IDs estáveis nos achados e na matriz de cobertura. Valide referências com `npm run compliance -- catalog validate`. O runner registra gates e vínculos, mas não aprova cenários por associação nem gera pareceres técnicos fixos. Para novos módulos, siga o [prompt de manutenção](./scenario-catalog-maintenance.md).
