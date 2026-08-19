# Roadmap

*v0.2 — visão de fases em alto nível, sem datas fixas (exceto onde indicado).*

## Fase 0 — Visão e estrutura do repositório ✅

Definição da missão, princípios, licenciamento e mapeamento regulatório do projeto. A fundação documental sobre a qual tudo o resto é construído.

## Fase 1 — Formação da comunidade ✅

Primeiras pessoas desenvolvedoras e profissionais de saúde digital reunidas em torno do projeto, via GitHub e o grupo de WhatsApp (veja [`CONTRIBUTING.md`](../CONTRIBUTING.md)). A [reunião de 12/08](./reunioes/2026-08-12-primeira-reuniao.md) organizou as frentes de trabalho e produziu o primeiro levantamento de requisitos do produto.

## Fase 2 — Reuniões técnicas e definição de stack 🔄 *(atual)*

Decidir coletivamente as escolhas de tecnologia que o [`prd.md`](./prd.md) deliberadamente deixou em aberto. Cada decisão fica registrada em [`decisions/`](./decisions/), com contexto, consequências e alternativas descartadas.

O que já foi decidido e o que segue em aberto está no [índice de decisões](./decisions/) — esta fase termina quando não restar nenhuma em aberto.

**Também em andamento:** desenho do esquema PostgreSQL em conformidade com FHIR, acompanhado de dados fictícios, para permitir construir e testar a API antes de qualquer dado real existir.

## Fase 3 — PRD técnico e definição do MVP

Traduzir os requisitos conceituais do [`prd.md`](./prd.md) em um PRD técnico e um escopo de MVP, já com as decisões de stack da Fase 2 e o esquema de dados validado pelo time.

Requisitos de engenharia já acordados para esta fase: conformidade com SOLID, desenho orientado ao domínio (DDD), arquitetura limpa e documentação técnica da API suficiente para viabilizar uma reimplementação independente.

## Fase 4 — Desenvolvimento do MVP

Construção da primeira versão funcional do OpenClinic, publicada continuamente no ambiente de homologação ([0007](./decisions/0007-ambiente-de-homologacao.md)) com dados fictícios.

## Fase 5 (futuro) — Certificação da distribuição oficial

Quando houver um produto maduro, buscar a Certificação de S-RES da SBIS para a distribuição oficial do OpenClinic (veja [`compliance.md`](./compliance.md) e [`licensing.md`](./licensing.md)).

## Expansões de escopo

A arquitetura prevê que especialidades sejam atendidas por **módulos acoplados à API**, sem alteração do núcleo — um módulo de odontograma para odontologia, um de bioimpedância para nutrologia, e assim por diante.

Odontologia, outras especialidades médicas ou qualquer super-nichamento **não têm data prevista**. Essas expansões acontecem sob decisão do conselho fundador, conforme a necessidade (veja [`GOVERNANCE.md`](../GOVERNANCE.md) e a filosofia de expansão em [`vision.md`](./vision.md)).
