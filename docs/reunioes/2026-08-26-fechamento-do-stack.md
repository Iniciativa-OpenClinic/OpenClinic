# Reunião de fechamento do stack — 26/08/2026

**Assunto:** definição do stack técnico completo e abertura da fase de código
**Duração:** cerca de 115 minutos

Este é o registro estruturado da reunião. Ele não é uma transcrição, e não atribui argumentos nem tarefas nominalmente — veja o [critério adotado](./README.md).

## Contexto

Terceira reunião técnica, continuação direta da [reunião de 19/08](./2026-08-19-stack-tecnico.md), que encerrou sem decisão sobre a linguagem do backend e remarcou expressamente a finalização para esta data. Entre as duas, o repositório ganhou o mapa completo do produto ([`prd.md`](../prd.md)), a matriz de conformidade ([`conformidade-sbis.md`](../conformidade-sbis.md)), as issues-épico de implementação e o quadro público de acompanhamento — material apresentado na abertura e usado como base do debate.

## Decisões fechadas

Cada uma tem registro próprio, com contexto, consequências e alternativas descartadas:

| Decisão | Registro |
| :--- | :--- |
| **Node.js** como linguagem e plataforma do backend | [0005](../decisions/0005-linguagem-do-backend.md) |
| O contrato OpenAPI **nasce com o código**, entregue na mesma mudança | [0008](../decisions/0008-contrato-antes-ou-depois-do-codigo.md) |
| **React com Vite** no front-end, responsivo e preparado para PWA | [0009](../decisions/0009-react-e-vite-no-front-end.md) |
| **Monolito modular**, executável por inteiro com Docker Compose | [0010](../decisions/0010-monolito-modular.md) |

A decisão da linguagem foi tomada **por votação entre os presentes**, e o placar virou ao longo do próprio debate: a conversa começou favorável a Python e terminou em Node.js, depois dos argumentos de concorrência de requisições, hospedagem e amplitude da base de contribuidores. Houve mudanças explícitas de voto — registradas assim, sem nomes, porque o que importa para o projeto é que o debate funcionou. As teses vencidas permanecem no registro da decisão, como a governança promete.

Sobre a [0008](../decisions/0008-contrato-antes-ou-depois-do-codigo.md), a transparência devida: a reunião não debateu as duas teses em pauta própria. Ela adotou, na prática, o fluxo em que o código nasce primeiro e toda entrega de backend traz a documentação da API na mesma mudança — e o fundador ratificou essa prática como decisão. As garantias que valiam nos dois caminhos continuam todas de pé, listadas no registro.

## Decisões deliberadamente deixadas para os times

- **Framework do backend** (Fastify, NestJS e afins): escolha do time de back, depois de formado.
- **Biblioteca de estilos do front** (Tailwind foi a recomendação em reunião): escolha do time de front.
- Nenhuma das duas vaza para o outro lado: front e back conversam apenas pelo contrato da API, com todas as regras de negócio no backend — reafirmação unânime da [0004](../decisions/0004-api-antes-de-interface.md).

## Regras de contribuição de código

Acordadas no debate sobre trabalho com apoio de IA, e incorporadas ao [`CONTRIBUTING.md`](../../CONTRIBUTING.md):

- Tarefas dimensionadas para caberem em **poucas horas**, não em dias — é o que torna a contribuição esporádica viável.
- **Commit atômico**, com um objetivo e uma razão só, e mensagem que explica o porquê. IA pode ajudar a redigir; a revisão final e a responsabilidade são de quem assina.
- Pull request pequeno, descrevendo **o que fez e como testou**.
- O revisor pode **devolver** uma contribuição confusa pedindo que ela volte explicada — mudança em muitos lugares ao mesmo tempo, sem razão clara por commit, não entra.
- IA é ferramenta de quem desenvolve, não substituta do raciocínio: quem submete precisa entender e responder pelo que submete.
- **Qualidade é camada própria**: além da revisão de código, o projeto precisa de atenção contínua à integração entre módulos, porque código correto com premissa de negócio errada quebra os vizinhos.

## Estrutura de trabalho

- O **status de fundador** fica aberto a quem colaborar de verdade nos primeiros meses do projeto; fechada essa janela, quem chegar depois participa pelas regras normais, sem o status. Registrado no [`GOVERNANCE.md`](../../GOVERNANCE.md).
- Cada módulo terá um **validador**, que revisa as contribuições e autoriza a incorporação no seu módulo. O primeiro papel — a validação do backend — foi assumido por voluntariado em reunião.
- Equipes de **backend, front-end, dados e segurança** formadas por voluntariado entre os presentes; squads a organizar; a condução das sprints fica com participantes experientes em gestão de equipes de desenvolvimento.
- Pendências de papéis levantadas e ainda sem ocupante: gestão de produto e liderança técnica geral.
- A composição nominal **não é publicada aqui**, pela regra do próprio projeto ([`GOVERNANCE.md`](../../GOVERNANCE.md)): cada pessoa aparece no registro assinando as próprias contribuições.

## Primeiras entregas combinadas

| # | Entrega | Situação |
| :--- | :--- | :--- |
| 1 | Protótipo de **autenticação** (backend com front mínimo) — primeiro incremento da camada transversal, na ordem que o [`roadmap.md`](../roadmap.md) fixa | Para a próxima reunião |
| 2 | Início do **SQL das tabelas de terminologia**, junto ao responsável pelo banco de dados | Em andamento |
| 3 | Abertura do quadro público de acompanhamento aos colaboradores | Em andamento |

## Custos e sustentação

Nesta fase, cada colaborador banca as próprias ferramentas de trabalho. Modelos de sustentação futura foram conversados em caráter exploratório — doações e apoio da comunidade médica ao custeio de ferramentas de desenvolvimento —, **sem nenhuma decisão**. Quando o tema amadurecer, entra pelos canais normais de decisão do projeto.

## Nota regulatória

A reunião citou a regulação de IA em saúde como razão para **não** embutir inteligência artificial no núcleo agora: software com finalidade de apoio a diagnóstico entra em enquadramento regulatório próprio, separado da certificação de prontuário. O enquadramento está mapeado em [`compliance.md`](../compliance.md) — RDC 657/2022 da ANVISA e Resolução CFM 2.454/2026 —, e a fronteira entre núcleo e IA segue como registrada na [0005](../decisions/0005-linguagem-do-backend.md): nenhum agente de IA decide o que uma função determinística pode calcular.

## O que segue em aberto

| Decisão | Situação | Registro |
| :--- | :--- | :--- |
| Camada de cache e banco de apoio | Sem novidade nesta reunião; mantido o consenso de que não entra no MVP | [0006](../decisions/0006-camada-de-cache-e-banco-de-apoio.md) |
| Formato dos endpoints (FHIR puro × API própria com fachada) | Abre com o desenho do contrato | a registrar em [`decisions/`](../decisions/) |

## Encaminhamentos da reunião anterior

| # | Encaminhamento de 19/08 | Situação |
| :--- | :--- | :--- |
| 1 | Esquema PostgreSQL em conformidade com FHIR, com dados fictícios | Em andamento — começa pelas tabelas de terminologia |
| 2 | Estudo comparativo para a decisão [0006](../decisions/0006-camada-de-cache-e-banco-de-apoio.md) | Pendente |
| 3 | Fechar a linguagem do backend | **Concluído nesta reunião** |
| 4 | Titularidade da conta do provedor de nuvem | Pendente — ver [0007](../decisions/0007-ambiente-de-homologacao.md) |
