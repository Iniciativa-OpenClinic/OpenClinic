# Reunião de stack técnico — 19/08/2026

**Assunto:** definição do stack técnico do OpenClinic
**Duração:** cerca de 70 minutos

Este é o registro estruturado da reunião. Ele não é uma transcrição, e não atribui argumentos nominalmente — veja o [critério adotado](./README.md).

## Contexto

Primeira reunião técnica do projeto, correspondente à Fase 2 do [`roadmap.md`](../roadmap.md). Até esta data o repositório continha apenas a fundação documental do projeto, com todas as escolhas de tecnologia deliberadamente em aberto — como registrado no [`prd.md`](../prd.md), que declara explicitamente que essas decisões pertenciam a esta reunião, não àquele documento.

## Decisões fechadas

Todas com consenso na reunião. Cada uma tem seu registro próprio, com contexto, consequências e alternativas descartadas:

| Decisão | Registro |
| :--- | :--- |
| HL7 FHIR como padrão de dados, implementado como especificação | [0001](../decisions/0001-fhir-como-padrao-de-dados.md) |
| PostgreSQL como banco principal | [0002](../decisions/0002-postgresql-como-banco-principal.md) |
| Docker como unidade de implantação | [0003](../decisions/0003-docker-como-unidade-de-implantacao.md) |
| API antes de interface; frontend adiado | [0004](../decisions/0004-api-antes-de-interface.md) |
| Ambiente de homologação em camada gratuita, com dados fictícios | [0007](../decisions/0007-ambiente-de-homologacao.md) |

## Decisões em aberto

| Decisão | Situação | Registro |
| :--- | :--- | :--- |
| Linguagem e plataforma do backend | Debatida a fundo, **finalização remarcada para 26/08/2026** | [0005](../decisions/0005-linguagem-do-backend.md) |
| Camada de cache e banco de apoio | Consenso de que existirá na v2; candidato em avaliação | [0006](../decisions/0006-camada-de-cache-e-banco-de-apoio.md) |
| Tecnologia de frontend | Adiada por decisão, não por indefinição | [0004](../decisions/0004-api-antes-de-interface.md) |

## Questões de escopo levantadas

**O OpenClinic é médico ou odontológico?** A resposta convergente foi que a base técnica é a mesma, e a diferenciação por especialidade acontece em **módulos acoplados à API** — a imagem usada foi a de um tronco de árvore com galhos encaixados. Um módulo de odontograma para odontologia, um de bioimpedância para nutrologia, e assim por diante.

Isso é consistente com a filosofia de expansão já descrita no [`vision.md`](../vision.md) e não altera o escopo inicial declarado. A arquitetura, porém, passa a ter um requisito explícito: **suportar módulos por especialidade sem alterar o núcleo.**

## Problema técnico central identificado

O descasamento entre o formato de intercâmbio do FHIR — *bundles* desnormalizados, organizados para fazer sentido ao usuário — e a normalização típica de um banco relacional. Modelar o banco sem antecipar como esses bundles serão remontados pode produzir um esquema em que as consultas necessárias fiquem ineficientes ou inviáveis.

Está registrado em [0001](../decisions/0001-fhir-como-padrao-de-dados.md) e condiciona [0002](../decisions/0002-postgresql-como-banco-principal.md). **Não está resolvido.**

## Requisitos de engenharia acordados

Levantados e não contestados, aplicáveis ao backend qualquer que seja a linguagem escolhida:

- Conformidade com princípios SOLID
- Desenho orientado ao domínio (DDD)
- Arquitetura limpa
- Documentação técnica da API suficiente para viabilizar uma reimplementação independente

## Princípios que emergiram do debate

Dois merecem registro porque orientam decisões futuras:

**Sobre inteligência artificial:** nenhum agente de IA decide aquilo que uma função determinística pode calcular. O papel de serviços de IA no projeto é operacional e apoiado em funções auditáveis — nunca decisão clínica. Compatível com o núcleo neutro do [`vision.md`](../vision.md); detalhado em [0005](../decisions/0005-linguagem-do-backend.md).

**Sobre infraestrutura:** se rodar no servidor mais modesto possível, o projeto está no caminho certo. Consumo de recursos é métrica de projeto, não detalhe de implementação. Detalhado em [0007](../decisions/0007-ambiente-de-homologacao.md).

## Encaminhamentos

| # | Encaminhamento | Situação |
| :--- | :--- | :--- |
| 1 | Desenhar o esquema PostgreSQL em conformidade com FHIR e compartilhar com o time, junto de um conjunto de dados fictícios | Em andamento |
| 2 | Compartilhar estudo comparativo de stacks orientadas a eventos, para subsidiar a decisão [0006](../decisions/0006-camada-de-cache-e-banco-de-apoio.md) | Pendente |
| 3 | Fechar a decisão de linguagem do backend | Previsto para 26/08/2026 |
| 4 | Resolver a titularidade da conta do provedor de nuvem, hoje vinculada a pessoa física | Pendente — ver [0007](../decisions/0007-ambiente-de-homologacao.md) |
| 5 | Publicar as decisões da reunião no repositório e organizar o trabalho em blocos | Concluído neste commit |

## Observação sobre a decisão de backend

A reunião foi **encerrada sem decisão** sobre a linguagem do backend, com a finalização expressamente remarcada para o encontro seguinte. Uma formulação verbal de encaminhamento ocorreu ao final, já fora da parte formal e com parte dos participantes ausente.

O projeto **não trata essa formulação como decisão tomada**. O tema segue aberto em [0005](../decisions/0005-linguagem-do-backend.md), com todas as teses registradas, e será decidido com o time completo.
