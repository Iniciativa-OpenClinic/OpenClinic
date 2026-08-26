# 0009 — React com Vite no front-end

**Situação:** **Aceita** — decidida na [reunião de 26/08/2026](../reunioes/2026-08-26-fechamento-do-stack.md)
**Data:** 2026-08-26

## Contexto

A decisão [0004](./0004-api-antes-de-interface.md) adiou a escolha de tecnologia do front-end de propósito: toda interface é cliente da API, então o front não precisava ser escolhido antes de a fundação existir. Com o backend decidido ([0005](./0005-linguagem-do-backend.md)) e as equipes se formando, o adiamento perdeu a função — e os requisitos funcionais da certificação ([`conformidade-sbis.md`](../conformidade-sbis.md)) já permitem desenhar telas desde agora.

## Decisão

**React** como biblioteca de interface, com **Vite** como ferramenta de build e de desenvolvimento.

- O front nasce **responsivo e preparado para PWA**: funciona no navegador do computador e do celular desde o primeiro dia.
- **Aplicativo nativo** (o portal do paciente, distribuído pelas lojas) continua fora da V1, como o [`prd.md`](../prd.md) já registrava. A escolha do React mantém esse caminho aberto, pela proximidade com React Native.
- A **biblioteca de estilos** (Tailwind foi a recomendação feita em reunião) é escolha do time de front — o mesmo tratamento dado ao framework do backend.
- Front e back se falam **apenas pelo contrato da API** ([0008](./0008-contrato-antes-ou-depois-do-codigo.md)); nenhuma regra de negócio vive no front.

## Por quê

- **Base de contribuidores.** React é a biblioteca de interface mais difundida do mercado — o mesmo critério que decidiu o backend vale aqui.
- **Experiência de quem vai construir.** A maioria de quem se voluntariou para o front na reunião trabalha com React.
- **Um conhecimento, vários alvos.** A proximidade com React Native aproveita o mesmo time quando o aplicativo do paciente entrar (V2).
- **Leveza de desenvolvimento.** O Vite dá partida e recarga rápidas, o que pesa num projeto em que cada contribuidor roda tudo na própria máquina ([0010](./0010-monolito-modular.md)).

## Alternativas descartadas

- **Angular** — citado em reunião como a praia de um dos participantes, mas sem defesa sustentada: menor adesão entre quem vai construir, e o critério da base de contribuidores decide contra.
- **Seguir adiando** — perdeu o objeto: com o backend definido e voluntários de front na mesa, adiar só atrasaria telas que os requisitos da certificação já permitem desenhar.
