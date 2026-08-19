<div align="center">

<img src="logo.png" alt="OpenClinic" width="180">

# OpenClinic

**Prontuário eletrônico médico open source, com API aberta desde a concepção.**

Um contraponto aos prontuários de mercado que fecham seu ecossistema e não liberam suas APIs.

[![Licença](https://img.shields.io/badge/licen%C3%A7a-AGPL--3.0-2E7D9A?style=flat-square)](./LICENSE)
[![Status](https://img.shields.io/badge/status-defini%C3%A7%C3%A3o%20de%20stack-E8A33D?style=flat-square)](./docs/roadmap.md)
[![Padrão](https://img.shields.io/badge/interoperabilidade-HL7%20FHIR-3B6FB0?style=flat-square)](./docs/decisions/0001-fhir-como-padrao-de-dados.md)

</div>

<br>

> [!WARNING]
> **Ainda não existe software.** O projeto está definindo seu stack técnico. Nada aqui pode ser usado em atendimento a pacientes.

<br>

## Por que este projeto existe

Prontuários eletrônicos comerciais, em geral, fecham seus dados. Sair de um fornecedor ou integrar outro sistema costuma ser difícil, caro ou simplesmente impossível.

O OpenClinic nasce para ser diferente: um prontuário cujo código é aberto e cuja API é, desde o primeiro dia, tratada como um produto tão importante quanto a própria interface.

<br>

## Os pilares

### 🔓 API aberta e pública
Robusta e bem documentada desde a concepção, com [HL7 FHIR](https://www.hl7.org/fhir/) como padrão de dados — implementado como especificação, não como formato de exportação.

### 🔐 Segurança e conformidade desde o desenho
Dado de saúde é dado sensível. O projeto assume isso desde a fundação, não como um remendo posterior. Veja o mapeamento regulatório em [`compliance.md`](./docs/compliance.md).

### 🤝 Comunidade aberta
Construído com quem quiser participar, não atrás de portas fechadas. As decisões técnicas são tomadas e registradas em público — inclusive as que ainda não foram tomadas.

Detalhes completos em [`vision.md`](./docs/vision.md).

<br>

## Onde o projeto está

Fase de **definição do stack técnico**. Cada decisão abaixo tem um registro próprio com o contexto, as consequências assumidas e as alternativas descartadas.

### Já decidido

| Decisão | Registro |
| :--- | :--- |
| **HL7 FHIR** como padrão de dados, implementado como especificação | [0001](./docs/decisions/0001-fhir-como-padrao-de-dados.md) |
| **PostgreSQL** como banco principal | [0002](./docs/decisions/0002-postgresql-como-banco-principal.md) |
| **Docker** como unidade de implantação | [0003](./docs/decisions/0003-docker-como-unidade-de-implantacao.md) |
| **API antes de interface** — frontend deliberadamente adiado | [0004](./docs/decisions/0004-api-antes-de-interface.md) |
| **Ambiente de homologação** em hardware modesto, com dados fictícios | [0007](./docs/decisions/0007-ambiente-de-homologacao.md) |

### Ainda em aberto

| Decisão | Situação |
| :--- | :--- |
| [**Linguagem e plataforma do backend**](./docs/decisions/0005-linguagem-do-backend.md) | Teses concorrentes registradas. Aberta a contribuição. |
| [**Camada de cache e banco de apoio**](./docs/decisions/0006-camada-de-cache-e-banco-de-apoio.md) | Consenso de que existirá na v2; candidato em avaliação. |
| [**Tecnologia de frontend**](./docs/decisions/0004-api-antes-de-interface.md) | Adiada por decisão, não por indefinição. |

Se você tem experiência que ajude a fechar alguma delas, [sua opinião é bem-vinda](#como-participar) — e fica registrada com o seu nome.

<br>

## Documentação

Toda a documentação está em [`docs/`](./docs/). Os pontos de partida:

| Documento | O que contém |
| :--- | :--- |
| [`docs/vision.md`](./docs/vision.md) | Missão, problema, princípios e escopo |
| [`docs/prd.md`](./docs/prd.md) | Requisitos de produto conceituais, pré-técnicos |
| [`docs/decisions/`](./docs/decisions/) | As decisões de arquitetura, uma por arquivo |
| [`docs/compliance.md`](./docs/compliance.md) | Normas brasileiras relevantes (LGPD, ANVISA, SBIS, RNDS, TISS) |
| [`docs/roadmap.md`](./docs/roadmap.md) | As fases planejadas do projeto |
| [`GOVERNANCE.md`](./GOVERNANCE.md) | Como o projeto é decidido, e como isso deve evoluir |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Como participar |

<br>

## Como participar

O projeto ainda não tem código. Nesta fase, o que mais vale é **ajudar a fechar bem as decisões técnicas em aberto** — elas são caras de reverter depois.

**Abra uma [Issue](../../issues).** É o canal oficial e pesquisável do projeto. Para opinar sobre uma decisão em aberto, comente nela e assine sua posição — argumentos entram no registro permanente com o nome de quem os defende.

**Entre no [grupo de WhatsApp da comunidade](https://chat.whatsapp.com/LPxRX9ivXUm6VF4atVKYW7).** Se o link estiver expirado, avise por uma Issue.

O mais valioso agora é gente com experiência em **saúde digital**, **HL7 FHIR** e **segurança da informação**. Veja o guia completo em [`CONTRIBUTING.md`](./CONTRIBUTING.md).

<br>

## Licença

Este repositório, código e conteúdo, é distribuído sob a **[GNU Affero General Public License v3.0](./LICENSE)**.

Qualquer pessoa pode usar, modificar e hospedar o OpenClinic, inclusive comercialmente, desde que mantenha as modificações abertas sob a mesma licença. O projeto também prevê uma licença comercial alternativa para quem não puder cumprir essa condição. Detalhes em [`licensing.md`](./docs/licensing.md).

Copyright © 2026 Dr. Daniel Dorta Santiago de Carvalho Duarte, CRM 174209, e colaboradores do OpenClinic.

<br>

## Idioma

A documentação deste repositório é escrita em português — é onde está a comunidade do projeto e é brasileira a regulação que o condiciona. Código, identificadores, mensagens de commit e a especificação da API seguem o padrão internacional e são escritos em inglês.

Tradução da documentação para inglês e espanhol está nos planos, conforme o projeto e sua comunidade crescerem.

<div align="center">
<br>
<sub>Iniciativa OpenClinic</sub>
</div>
