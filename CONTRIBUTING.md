# Como contribuir

Obrigado pelo interesse no OpenClinic! O projeto está na fase de **definição do stack técnico** — ainda não existe código. É exatamente por isso que discussão técnica é a contribuição mais valiosa agora: as decisões que estão sendo tomadas neste momento são as mais caras de reverter depois.

## O que mais precisamos agora

**Ajudar a fechar bem as [decisões em aberto](./docs/decisions/).** Duas estão em disputa neste momento — a linguagem do backend e a camada de cache e banco de apoio. Se você tem experiência que ajude a decidir qualquer uma delas, é a contribuição de maior impacto que existe hoje no projeto.

Nesta fase, é especialmente valiosa a experiência em:
- **HL7 FHIR** e interoperabilidade em saúde — em particular sobre a modelagem de *bundles* FHIR sobre banco relacional, o problema técnico central já identificado ([0001](./docs/decisions/0001-fhir-como-padrao-de-dados.md));
- **saúde digital** — quem já trabalhou com prontuário eletrônico e sabe onde estão as dores reais;
- **segurança da informação**, especialmente em contexto de dados sensíveis.

## Onde a conversa acontece

- **GitHub Issues** é o canal **canônico** do projeto — onde propostas e decisões ficam registradas e pesquisáveis.
- **GitHub Discussions**, quando estiver habilitado neste repositório, é um espaço complementar para conversas mais abertas.
- Também existe um **grupo de WhatsApp** da comunidade: <https://chat.whatsapp.com/LPxRX9ivXUm6VF4atVKYW7> (o link pode expirar — se não funcionar, abra uma Issue pedindo um novo). O WhatsApp é bom para conversa em tempo real, mas **decisões do projeto são registradas no repositório**, não apenas discutidas por lá.

## Como participar de uma decisão técnica

1. **Leia o registro da decisão** em [`docs/decisions/`](./docs/decisions/). Ele traz o contexto, os critérios em disputa e as teses já apresentadas — para que você não precise repetir o que já foi dito.
2. **Comente na Issue vinculada**, ou abra uma Issue do tipo *Proposta de decisão técnica* se sua contribuição for uma tese nova.
3. **Assine sua posição.** Argumentos entram no registro permanente com o nome de quem os defende. O projeto não atribui posições a pessoas por conta própria — nem a partir de transcrição de reunião.

Teses vencidas **permanecem no registro**. Discordar e perder não apaga sua contribuição do histórico do projeto: ela fica lá, explicando o que já foi pesado.

## Regra de contribuição

**Nenhuma contribuição — código ou texto — é incorporada ao projeto sem que a pessoa que contribui concorde com os termos de licenciamento vigentes do OpenClinic**, descritos em [`licensing.md`](./docs/licensing.md). Isso vale desde já, mesmo antes de existir um CLA formal.

Quando o projeto entrar em fase de código, um **CLA (Contributor License Agreement)** será exigido de todo contribuidor externo — e o texto desse CLA será publicado para comentário público antes de passar a ser exigido, não imposto de surpresa.

## Quando a fase de código começar

Os requisitos de engenharia já acordados para o backend, qualquer que seja a linguagem escolhida: conformidade com **SOLID**, desenho orientado ao domínio (**DDD**), **arquitetura limpa** e documentação técnica da API suficiente para viabilizar uma reimplementação independente.

A documentação do projeto é escrita em **português**. Código, identificadores, mensagens de commit e a especificação da API são escritos em **inglês**.

## Código de conduta

Toda interação no projeto — Issues, Discussions, WhatsApp — segue o [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
