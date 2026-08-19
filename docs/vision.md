# Visão

*v0.2 — documento vivo, escrito na fase de fundação do projeto.*

## Missão

Criar um prontuário eletrônico médico open source, com API aberta, robusta e documentada desde a concepção — para que clínicas e desenvolvedores nunca fiquem presos a um único fornecedor para acessar os próprios dados que geram.

## O problema

Os prontuários eletrônicos hoje disponíveis no mercado, em geral, fecham seu ecossistema: os dados entram, mas não saem facilmente, e a integração com outros sistemas depende da boa vontade (e do preço) de quem vende o software. Uma clínica que quer trocar de fornecedor, conectar um sistema de laboratório, ou construir sua própria automação, esbarra em APIs fechadas, mal documentadas ou simplesmente inexistentes.

O OpenClinic nasce como contraponto a isso: um prontuário cujo código é aberto e cuja API é, desde o primeiro dia, um produto tão cuidado quanto a própria interface do sistema.

## Princípios norteadores

**API aberta como pilar fundacional.** A API não é um recurso adicionado depois — é parte do desenho original do sistema. Robusta, bem documentada e pública. O padrão técnico adotado é o **HL7 FHIR**, por ser tanto o padrão exigido pela Rede Nacional de Dados em Saúde (RNDS) quanto o padrão internacional de interoperabilidade em saúde — implementado como especificação, não como formato de exportação ([decisão 0001](./decisions/0001-fhir-como-padrao-de-dados.md)).

**Webhooks para integração em tempo real.** Além de consultar a API, sistemas externos devem poder ser notificados quando algo relevante acontece no OpenClinic — sem precisar ficar consultando repetidamente. Nesta fase inicial, essa integração é só de saída (o OpenClinic notifica; não recebe eventos externos), e as notificações carregam apenas o essencial (tipo do evento, identificador e data/hora), nunca conteúdo clínico — quem recebe a notificação busca o dado na API autenticada. Isso significa que, mesmo que o destino de uma notificação seja mal configurado ou comprometido, nenhum dado clínico é exposto por essa via. O catálogo de quais eventos existirão ainda não foi definido — isso é trabalho para a comunidade técnica.

**Segurança e conformidade regulatória desde o desenho.** Dado de saúde é dado sensível. O projeto assume, desde a concepção, os requisitos que isso implica — trilha de auditoria, controle de acesso, portabilidade de dados — em vez de tratá-los como um retrofit posterior. O mapeamento das normas brasileiras aplicáveis está em [`compliance.md`](./compliance.md).

**Os dados pertencem ao paciente.** A clínica é a guardiã dos dados do prontuário durante o atendimento — não a dona deles. Esse é o entendimento consolidado do Conselho Federal de Medicina sobre o prontuário médico, e o OpenClinic é desenhado para respeitá-lo na prática: o software não aprisiona ninguém. Exportação e portabilidade completas, a qualquer momento, via API, são parte do compromisso do projeto — para o paciente e para a clínica.

**Núcleo neutro, sem IA embutida.** O OpenClinic armazena, organiza e expõe dados. Ele não toma decisões clínicas, não emite alertas automatizados, não calcula escores de risco, não sugere diagnósticos. Essa neutralidade é intencional: mantém o núcleo do projeto fora do enquadramento de dispositivo médico da ANVISA (detalhes em [`compliance.md`](./compliance.md)) e deixa claro, desde o início, o que o projeto é e o que não é. Quem quiser construir inteligência artificial ou apoio à decisão clínica pode fazê-lo por cima da API aberta — por conta e risco próprios.

**Sustentabilidade sem fechar o ecossistema.** O OpenClinic é licenciado sob AGPL-3.0: qualquer pessoa pode usar, modificar e até hospedar o sistema comercialmente, contanto que mantenha essas modificações abertas. É essa obrigação — não uma autorização que os mantenedores concedem ou negam — que impede que alguém feche o que nasceu aberto. Para quem não pode ou não quer manter suas modificações abertas, uma licença comercial alternativa está prevista. Os detalhes desse modelo estão em [`licensing.md`](./licensing.md).

## Escopo inicial e filosofia de expansão

A ideia original — e o escopo desta fase — é um **prontuário médico**. Não há compromisso, nesta v0.1, de cobrir odontologia ou outras especialidades desde o início. O modelo de dados e a arquitetura, no entanto, devem ser pensados para permitir esse tipo de expansão no futuro, inclusive o super-nichamento por especialidade médica.

Cada expansão de escopo — odontologia, outras especialidades, novos módulos — será decidida pelo conselho fundador, conforme a necessidade e a maturidade do projeto (veja [`GOVERNANCE.md`](../GOVERNANCE.md)). Não há prazo definido para essas expansões.

## Público-alvo inicial

Clínicas e consultórios médicos. O modelo de negócio da oferta oficial do OpenClinic prevê **autohospedagem gratuita para uso próprio de uma única organização (single-tenant)** — isso é uma característica da oferta, não um limite imposto pela licença: a AGPL-3.0 por si só permite usos mais amplos a quem cumprir suas obrigações (veja [`licensing.md`](./licensing.md)).

## Idioma

Este e os demais documentos do projeto são escritos em português. Tradução para inglês e espanhol está nos planos, conforme o projeto e sua comunidade crescerem.
