# Visão

*v0.3, documento vivo, escrito na fase de fundação do projeto.*

## Missão

Criar um prontuário eletrônico médico open source, com API aberta, robusta e documentada desde a concepção, para que clínicas e desenvolvedores nunca fiquem presos a um único fornecedor para acessar os próprios dados que geram.

## O problema

Os prontuários eletrônicos hoje disponíveis no mercado, em geral, fecham seu ecossistema: os dados entram, mas não saem facilmente, e a integração com outros sistemas depende da boa vontade (e do preço) de quem vende o software. Uma clínica que quer trocar de fornecedor, conectar um sistema de laboratório, ou construir sua própria automação, esbarra em APIs fechadas, mal documentadas ou simplesmente inexistentes.

O OpenClinic nasce como contraponto a isso: um prontuário cujo código é aberto e cuja API é, desde o primeiro dia, um produto tão cuidado quanto a própria interface do sistema.

## Princípios norteadores

**API aberta como pilar fundacional.** A API não é um recurso adicionado depois. Ela é parte do desenho original do sistema. Robusta, bem documentada e pública. O padrão técnico adotado é o **HL7 FHIR**, por ser tanto o padrão exigido pela Rede Nacional de Dados em Saúde (RNDS) quanto o padrão internacional de interoperabilidade em saúde, implementado como especificação e não como formato de exportação ([decisão 0001](./decisions/0001-fhir-como-padrao-de-dados.md)).

**Webhooks para integração em tempo real.** Além de consultar a API, sistemas externos devem poder ser notificados quando algo relevante acontece no OpenClinic, sem precisar ficar consultando repetidamente. Nesta fase inicial, essa integração é só de saída (o OpenClinic notifica; não recebe eventos externos), e as notificações carregam apenas o essencial (tipo do evento, identificador e data/hora), nunca conteúdo clínico: quem recebe a notificação busca o dado na API autenticada. Isso significa que, mesmo que o destino de uma notificação seja mal configurado ou comprometido, nenhum dado clínico é exposto por essa via. O catálogo de quais eventos existirão ainda não foi definido, e isso é trabalho para a comunidade técnica.

**Segurança e conformidade regulatória desde o desenho.** Dado de saúde é dado sensível. O projeto assume, desde a concepção, os requisitos que isso implica, como trilha de auditoria, controle de acesso e portabilidade de dados, em vez de tratá-los como um retrofit posterior. O mapeamento das normas brasileiras aplicáveis está em [`compliance.md`](./compliance.md).

**Os dados pertencem ao paciente.** A clínica é a guardiã dos dados do prontuário durante o atendimento, não a dona deles. Esse é o entendimento consolidado do Conselho Federal de Medicina sobre o prontuário médico, e o OpenClinic é desenhado para respeitá-lo na prática: o software não aprisiona ninguém. Exportação e portabilidade completas, a qualquer momento, via API, são parte do compromisso do projeto, para o paciente e para a clínica.

**Núcleo neutro, sem IA embutida.** O OpenClinic armazena, organiza e expõe dados. Ele não toma decisões clínicas, não emite alertas automatizados, não calcula escores de risco, não sugere diagnósticos. Essa neutralidade é intencional: mantém o núcleo do projeto fora do enquadramento de dispositivo médico da ANVISA (detalhes em [`compliance.md`](./compliance.md)) e deixa claro, desde o início, o que o projeto é e o que não é. Quem quiser construir inteligência artificial ou apoio à decisão clínica pode fazê-lo por cima da API aberta, por conta e risco próprios.

**Sustentabilidade sem fechar o ecossistema.** O OpenClinic é licenciado sob AGPL-3.0: qualquer pessoa pode usar, modificar e até hospedar o sistema comercialmente, contanto que mantenha essas modificações abertas. É essa obrigação, e não uma autorização que os mantenedores concedem ou negam, que impede que alguém feche o que nasceu aberto. Para quem não pode ou não quer manter suas modificações abertas, uma licença comercial alternativa está prevista. Os detalhes desse modelo estão em [`licensing.md`](./licensing.md).

## O que se constrói por cima

O OpenClinic quer ser uma **base sólida**. Não um produto que tenta cobrir sozinho cada nicho, mas o alicerce sobre o qual outras pessoas constroem aquilo que um prontuário, por si só, não resolve.

Hoje quem tem uma boa ideia para uma clínica esbarra num muro. Construir um prontuário do zero é caro, demorado e regulado demais para uma pessoa ou uma equipe pequena. Sobra depender de quem já tem essa infraestrutura, e nem sempre esses fornecedores dão ao desenvolvedor externo a documentação, o suporte ou a abertura de que ele precisa. É esse muro que a API aberta derruba.

Alguns exemplos do que cabe por cima, e que deliberadamente não estão no escopo do OpenClinic:

- **CRM**, hoje uma das ferramentas mais procuradas por clínicas de todas as especialidades, e uma das mais oferecidas por desenvolvedores;
- **automações** de rotina, do lembrete de retorno ao fluxo interno da equipe;
- **integrações** com sistemas externos: assinatura digital, comunicação, financeiro, gestão, ferramentas de BI;
- **apoio à decisão diagnóstica**, que por opção de projeto fica fora do núcleo neutro e, por isso mesmo, é território aberto a quem quiser construí-lo.

Cada uma dessas frentes é uma oportunidade comercial real para quem hoje não consegue bancar sozinho a infraestrutura de um prontuário. O OpenClinic não cobra pedágio por isso nem escolhe quem pode construir, porque a licença não dá esse poder a ninguém (veja [`licensing.md`](./licensing.md)).

## Escopo inicial e filosofia de expansão

A ideia original, e o escopo desta fase, é um **prontuário médico**. Não há compromisso, nesta v0.1, de cobrir odontologia ou outras especialidades desde o início. O modelo de dados e a arquitetura, no entanto, devem ser pensados para permitir esse tipo de expansão no futuro, inclusive o super-nichamento por especialidade médica.

Nada nos impede, no futuro, de partir para estruturas mais robustas, como um prontuário hospitalar, nem de atender outros idiomas e outros países. Essa possibilidade não é retórica: ela existe porque adotamos o HL7 FHIR como base desde a primeira linha, e porque código, identificadores e a especificação da API são escritos em inglês. O que muda de um país para outro é a camada regulatória, aqui SBIS, RNDS e TISS, lá fora os equivalentes locais, e é justamente por ela estar separada do núcleo clínico que a travessia se torna possível. Queremos ser referência mundial: como prontuário de saúde e como projeto de código aberto.

Cada expansão de escopo, seja odontologia, outras especialidades ou novos módulos, será decidida pelo conselho fundador, conforme a necessidade e a maturidade do projeto (veja [`GOVERNANCE.md`](../GOVERNANCE.md)). Não há prazo definido para essas expansões.

## Público-alvo inicial

Clínicas e consultórios médicos. O modelo de negócio da oferta oficial do OpenClinic prevê **autohospedagem gratuita para uso próprio de uma única organização (single-tenant)**. Isso é uma característica da oferta, não um limite imposto pela licença: a AGPL-3.0 por si só permite usos mais amplos a quem cumprir suas obrigações (veja [`licensing.md`](./licensing.md)).

## Antes de um prontuário, uma comunidade

Queremos, antes de ser um prontuário, ser uma **comunidade unida de desenvolvedores da área da saúde**: gente que se ajuda de verdade e que busca servir à comunidade como um todo.

O coração deste projeto nasceu do interesse genuíno de ajudar e de abrir as portas de um nicho que sempre foi fechado. Por isso o mínimo que esperamos de quem usar esta base, construída com tanto carinho, é que retribua de alguma forma à comunidade de desenvolvedores da saúde. Pode ser código devolvido, uma dúvida respondida, uma documentação melhorada, um conhecimento repassado a quem está começando.

Isto é um pedido, não uma cláusula. A licença não obriga ninguém a retribuir, e não dá aos mantenedores nenhum poder de decidir quem pode ou não construir sobre o OpenClinic (veja [`licensing.md`](./licensing.md)). Quem preferir apenas usar está no seu direito e continua bem-vindo. Mas quem retribuir estará fazendo o projeto ser aquilo que ele se propôs a ser.

## Idioma

Este e os demais documentos do projeto são escritos em português. Tradução para inglês e espanhol está nos planos, conforme o projeto e sua comunidade crescerem.
