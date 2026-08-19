# 0004 — API antes de interface

**Situação:** Aceita
**Data:** 2026-08-19
**Origem:** [Reunião de stack técnico, 19/08/2026](../reunioes/2026-08-19-stack-tecnico.md)

## Contexto

Há duas formas de construir um sistema com interface e API: começar pela interface e expor uma API depois, ou construir a API primeiro e tratar toda interface como cliente dela.

A primeira é mais rápida de demonstrar e produz, quase inevitavelmente, uma API de segunda classe — que reflete o que a tela precisava, não o que o domínio é. É assim que se chega ao prontuário de ecossistema fechado que este projeto existe para contestar.

## Decisão

O esforço inicial concentra-se no **backend: banco de dados e API**. Frontend, geração de documentos, relatórios e demais camadas de apresentação ficam explicitamente adiados.

Toda interface do OpenClinic — web, mobile, ou qualquer outra — é **cliente da mesma API pública** que qualquer integrador externo consome. Não existe caminho privilegiado entre interface própria e banco de dados.

## Consequências

- As regras de negócio, a segurança e a validação ficam concentradas em **um** lugar. Uma segunda interface não duplica regra nem cria uma segunda porta para o dado clínico.
- A API não pode virar cidadã de segunda classe: ela é o único caminho, inclusive para o próprio projeto.
- Testes e validação começam pelo backend, onde é possível verificá-los sem depender de interface.
- A escolha de tecnologia de frontend fica **livre e adiável**, sem bloquear o desenvolvimento. Não é indecisão: é a consequência pretendida.
- **Custo assumido:** o projeto passa um período sem nada visualmente demonstrável. É um custo real em atração de colaboradores e em comunicação, e foi aceito conscientemente.

## Nota sobre o frontend

A tecnologia de frontend **não está decidida**. Foram mencionadas em reunião, sem debate conclusivo, alternativas baseadas em TypeScript — entre elas Angular e React com Vite.

Quando o momento chegar, essa escolha vira um ADR próprio. Até lá, qualquer afirmação sobre o frontend do OpenClinic é especulação, não decisão do projeto.

## Alternativas consideradas

- **Construir interface e API em paralelo** — descartada por diluir o esforço de um time em formação e por arriscar que a API acabe modelada pelas necessidades da primeira tela.
