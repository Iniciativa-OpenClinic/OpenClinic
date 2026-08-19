# 0002 — PostgreSQL como banco principal

**Situação:** Aceita
**Data:** 2026-08-19
**Origem:** [Reunião de stack técnico, 19/08/2026](../reunioes/2026-08-19-stack-tecnico.md)

## Contexto

O prontuário precisa de um banco de registro: a fonte da verdade dos dados clínicos, com garantias transacionais, integridade referencial e capacidade de sustentar guarda por vinte anos (exigência mapeada em [`compliance.md`](../compliance.md)).

A decisão [0001](./0001-fhir-como-padrao-de-dados.md) impõe uma restrição específica: os dados são trocados em *bundles* desnormalizados, mas armazenados de forma normalizada. O banco precisa dar conta dessa remontagem de forma eficiente.

## Decisão

**PostgreSQL** é o banco de registro do OpenClinic.

O esquema é desenhado em conformidade com o FHIR desde o início, e é acompanhado de um **conjunto de dados fictícios** que permite construir e testar a API antes de qualquer dado real existir.

## Consequências

- Garantias transacionais e integridade referencial adequadas a registro clínico.
- Licença permissiva e comunidade grande — coerente com um projeto de código aberto, sem risco de mudança de licenciamento a montante.
- O suporte nativo a `jsonb` oferece um caminho para armazenar fragmentos de recursos FHIR sem normalizar tudo, aliviando parte do descasamento descrito em [0001](./0001-fhir-como-padrao-de-dados.md). O quanto usar disso é decisão de modelagem ainda em aberto — normalizar demais dificulta a remontagem dos bundles, normalizar de menos joga fora as garantias que motivaram escolher um banco relacional.
- Disponível em qualquer provedor e rodável localmente em contêiner, o que sustenta a decisão [0003](./0003-docker-como-unidade-de-implantacao.md).

## Alternativas consideradas

- **Adicionar um banco não-relacional desde o início** — descartada para o MVP, mas não descartada para o projeto. Virou a decisão [0006](./0006-camada-de-cache-e-banco-de-apoio.md), ainda em aberto.
- **Servidor FHIR pronto** (HAPI FHIR e similares) — não foi debatida. Registrada aqui porque é a alternativa óbvia que qualquer pessoa com experiência em FHIR vai levantar ao ver este repositório: existem implementações de referência do padrão que poderiam servir de base ou de ponto de comparação. Merece avaliação explícita.

## Nota sobre o escopo desta decisão

Esta decisão fixa **qual banco**. Ela não fixa **como o esquema é modelado** — o desenho concreto do esquema FHIR sobre PostgreSQL é trabalho em andamento e será submetido ao time para revisão antes de virar base do desenvolvimento.
