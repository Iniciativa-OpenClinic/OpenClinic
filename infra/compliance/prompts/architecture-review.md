# Auditoria arquitetural do template reutilizável

Atue como arquiteto de software. Diagnostique acoplamentos, duplicação, divergências de regras e riscos transversais; entregue plano de mudanças verificáveis, sem editar código nesta auditoria.

Leia o [protocolo comum](./audit-protocol.md). A [verificação operacional](./application-verification.md) prova comportamento; a [governança](./engineering-governance.md) define avaliação de identidade, versão, release e adoção.

## Fontes, pré-condições e limites

Consulte diretrizes locais (como `.agent/` se presente), [auth-spec](../../../docs/auth-spec.md), [ADRs](../../../docs/adr/), [packages](../../../packages/), [infra](../../), [CI](../../../.github/workflows/) e [relatórios](../reports/README.md). Confirme base e alterações locais. Não importe topologia corporativa nem exija banco em revisão estática.

Reconstrua dependências reais de imports/exports, manifests e composição. Diretórios com nomes de Clean Architecture não comprovam fronteiras corretas. Separe ARCH/BUSINESS e contexto/papel; mantenha modelos clínicos futuros fora do escopo de implementação.

## 1. Mapa de responsabilidades

Desenhe o fluxo apresentação → aplicação → domínio e a implementação de portas pela infraestrutura. Liste dependências que violam essa direção, ciclos, SQL fora da infraestrutura e regras em handlers.

Verifique:

- domínio dependente de Fastify, React, Drizzle, filesystem ou env;
- casos de uso importando tipos concretos de infraestrutura (violação do DIP);
- interfaces de UnitOfWork com commit/rollback sem efeito;
- autonomia de pacotes: workspaces consumindo arquivos ou scripts fora de seus limites (ex: `../../../../infra/`) via imports relativos em código produtivo, quebrando a independência de publicação;
- lógica duplicada entre API/CLI e uso divergente de repositories;
- efeitos no import: configuração, secrets, conexão, versão ou escrita síncrona no top-level;
- código morto, exports sem consumidores, proxies redundantes e caminhos alternativos contraditórios;
- any, casts e supressões, distinguindo código produtivo, fronteiras externas e fixtures. Relacione-os às regras locais e ao efeito concreto; não trate remoção textual como prova de correção.

## 2. Duplicação semântica e candidatos a core

Busque primeiro com rg e leia os chamadores. Match lexical é pista, não achado confirmado. Compare algoritmos, condições, erros, defaults e efeitos para detectar funções equivalentes com nomes diferentes e funções parecidas com responsabilidades distintas.

Para cada candidato, preencha:

| Implementações/localização | Consumidores | Regra comum/divergências | Destino e API proposta | Dependências | Benefício/risco | Migração e testes |
| --- | --- | --- | --- | --- | --- | --- |
| Evidência real | API/CLI/UI | Semântica, não só linhas iguais | Core, domínio local ou manter separado | Runtime e efeitos | Compatibilidade e custo | Critério observável |

Priorize resolvedores de conexão, normalização, validação, erros, constantes, contratos e políticas repetidos. Não mover tudo para core: infraestrutura de deploy, I/O, UI/CSS e regra exclusiva de um módulo precisam de responsabilidade própria.

Examine exports do core e grafo transitivo. Verifique a separação estrita de entrypoints: os subpath exports consumidos pelo navegador (`./shared`, `./enums`, `./locales`) devem conter apenas tipos puros e código isomórfico, sem importar módulos nativos do Node (`fs`, `crypto`, `pg`, `argon2`, `dotenv`); subpaths de servidor (ex: `./server`) devem conter o runtime exclusivo de backend. Compartilhar tipo não exige compartilhar a implementação inteira. Não criar biblioteca/abstração nova sem benefício comprovado e validação dos consumidores atuais.

## 3. Hardcode e identidade portátil

Inventarie OpenClinic e variações em código, CLI, branding, manifests, imagens, serviços, bancos, seeds, IDs, URLs, caminhos e documentação. Classifique:

1. Identidade configurável do produto.
2. Namespace/estrutura técnica, como @openclinic/core.
3. Identificador persistido/contrato externo.
4. Fixture/exemplo.
5. Atribuição/licença/histórico.
6. Acoplamento indevido.

Evite branding fixo em lógica funcional e mensagens; preserve namespaces justificados e atribuições. Identificadores persistidos exigem avaliar dados de desenvolvimento e migrations, sem criar aliases preventivos. Nenhuma substituição global cega.

Para números mágicos, limites, prazos, papéis e textos, informe origem, consumidores, variações e destino correto: domínio, catálogo, constante compartilhada, configuração ou persistência. Centralizar literal inadequado não resolve responsabilidade errada. Não tornar negociável uma invariável de segurança.

Simule conceitualmente uma aplicação derivada: quais arquivos precisariam mudar para nome, branding, banco, serviços e imagens? Diferencie defaults técnicos legítimos de referências ao produto. Catálogos i18n devem concentrar mensagens; enums/valores externos podem exigir representação fixa.

## 4. Identidade do CLI e versões

Aplique integralmente a matriz de fontes e os cenários de release da [governança](./engineering-governance.md). Examine index/boot, Commander, banners e fallbacks; compare package raiz, pacote CLI, metadados empacotados e sys_applications.

Entregue proposta justificada para cada fonte canônica, não somente “ler package.json”. Investigue resolução fora da raiz, pacote distribuído, bootstrap sem banco, indisponibilidade e versão incorreta mostrada como versão do executável.

## 5. Segurança, dados e contratos

Use os cenários operacionais como hipóteses de revisão:

- sid obrigatório, proprietário/estado atual, revogação, transação de rotação e reutilização;
- ordem de concorrência, validade absoluta, rollback e retry;
- contexto institucional em todas as camadas, DENY, grupos e autoridade OWNER;
- auditoria com ator/alvo, consistência com a mutação e privilégios de escrita;
- parâmetros de segurança declarados mas não aplicados;
- DTO/schema/OpenAPI/cliente divergentes;
- constraints, índices úteis, consultas sem escopo, catálogo atual e migrations imutáveis;
- providers e resolvedores duplicados, configuração carregada cedo demais;
- identidade/versionamento divergentes entre UI, CLI, artefato e banco.

Não conclua atomicidade a partir de comentário ou nome de método; identifique a transação/lock e os limites reais. Se não executar o cenário, classifique como inspeção ou indício e indique o teste necessário.

### Fronteiras adicionais a verificar

- Trate domínio → dependências internas como direção de imports, distinguindo-a do fluxo de chamadas. Um subpath de servidor no core deve ter responsabilidade explícita e não contaminar os exports isomórficos.
- Após extrações, procure implementações antigas, wrappers desnecessários, imports legados, aliases de tsconfig e divergência entre tipos e código emitido. Valide o pacote distribuível e suas dependências declaradas; build conjunto com hoisting não prova autonomia.
- Compare normalização, regras de senha, DTOs, códigos de erro, configuração e políticas entre API, CLI e frontend; compartilhamento não pode criar caminho administrativo que contorne invariantes.
- Inspecione resolvedores de configuração para defaults inseguros, precedência inconsistente, aceitação silenciosa de provider não implementado e leitura de secrets no bundle/configuração pública.
- Inclua branding em chaves de storage, cookies, caches, nomes de recursos e runner de compliance. Avalie colisões entre aplicações derivadas e compatibilidade de dados persistidos ao renomear.
- Diferencie ADRs do OpenClinic original dos ADRs locais por conteúdo e origem, não apenas pelo número. Se houver compromisso FHIR aplicável, identifique sua versão/perfil e fronteira de interoperabilidade; DTO interno não prova conformidade. Validação de recursos clínicos fica para a fase que os disponibilizar, sem introduzir Patient, Coverage ou AllergyIntolerance como requisito de encerramento da camada transversal.

## 6. Plano e critérios de aceite

Ordene o plano por risco e dependências: contratos pendentes → autenticação/sessão → autorização/isolamento → infraestrutura/configuração → regularização/portabilidade. Não reabra como atual uma falha histórica já corrigida sem evidência nova.

Cada mudança proposta deve ter consumidor, benefício, risco de compatibilidade, fases de migração e teste de aceite. Uma recomendação de core precisa preservar build servidor/navegador; uma de branding precisa permitir derivação sem editar lógica; uma de versão deve fechar artefato/banco sem mascarar falha parcial.

## Relatório

Grave `infra/compliance/reports/YYYY-MM-DD-architecture-review-HHmmss.md` (onde `HHmmss` representa a hora, minuto e segundo no fuso local, tal como `YYYY-MM-DD-architecture-review-HHmmss.md`), conforme protocolo, com:

- mapa de camadas/dependências e cobertura inspecionada;
- inventário classificado de hardcode;
- tabela de duplicação/candidatos a core;
- matriz de fontes de identidade/versão e decisões pendentes;
- achados, evidências, prioridades e roadmap por critérios de conclusão.

Diagramas de Clean Architecture, fronteiras de pacotes e árvore de dependências devem ser apresentados em blocos cercados por três crases, com `mermaid` após a cerca de abertura, válidos e que renderizem o gráfico em renderizadores compatíveis.

Dispense notas genéricas de maturidade. Não confunda ausência de alerta de scanner com conformidade.

## Catálogo local e runner

Consulte [scenarios/catalog.json](../scenarios/catalog.json), as [regras de manutenção](../scenarios/README.md) e o [guia de comandos](../README.md). Use IDs estáveis nos achados e na matriz de cobertura. Valide referências com `npm run compliance -- catalog validate`. O runner registra gates e vínculos, mas não aprova cenários por associação nem gera pareceres técnicos fixos. Para novos módulos, siga o [prompt de manutenção](./scenario-catalog-maintenance.md).
