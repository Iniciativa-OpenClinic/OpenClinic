# 0003 — Docker como unidade de implantação

**Situação:** Aceita
**Data:** 2026-08-19
**Origem:** [Reunião de stack técnico, 19/08/2026](../reunioes/2026-08-19-stack-tecnico.md)

## Contexto

O OpenClinic prevê autohospedagem por clínicas e consultórios (veja [`vision.md`](../vision.md)). Isso significa que o sistema será instalado por pessoas com níveis muito diferentes de experiência em infraestrutura, em ambientes que o projeto não controla.

Some-se a isso um compromisso do projeto: não aprisionar ninguém. Um prontuário que só roda num provedor específico contradiz esse compromisso na camada de infraestrutura, mesmo que o código seja aberto.

## Decisão

O OpenClinic é distribuído e executado em **contêineres Docker**.

## Consequências

- **Portabilidade entre provedores.** Sair de um provedor para outro deixa de ser um projeto de migração e passa a ser uma operação corriqueira. Isso é uma extensão natural do princípio de não aprisionamento para a camada de infraestrutura.
- **Dependências resolvidas de forma isolada e reprodutível.** Conflito de versão entre o que a aplicação precisa e o que a máquina tem deixa de existir: cada contêiner carrega o seu próprio conjunto.
- **A instalação por uma clínica fica viável** sem exigir um especialista em infraestrutura.
- Permite rodar múltiplas versões lado a lado, o que sustenta o ambiente de homologação da decisão [0007](./0007-ambiente-de-homologacao.md).

**Custo assumido:** o peso da imagem e o consumo de recursos passam a ser uma métrica de projeto, não um detalhe. Isso é especialmente relevante dado o critério deliberado de rodar em hardware modesto, descrito em [0007](./0007-ambiente-de-homologacao.md), e é um argumento que pesa na decisão [0005](./0005-linguagem-do-backend.md) — plataformas diferentes produzem imagens de tamanhos muito diferentes e permitem densidades de instância muito diferentes no mesmo servidor.

## Alternativas consideradas

- **Instalação direta no sistema operacional** — descartada. Transfere para cada clínica o problema de dependências que o contêiner resolve uma vez só.
- **Orquestração (Kubernetes e afins)** — fora de escopo por ora. O alvo inicial é uma organização única (*single-tenant*), onde orquestração adiciona complexidade operacional sem benefício correspondente. Contêiner não impede adotar orquestração depois.
