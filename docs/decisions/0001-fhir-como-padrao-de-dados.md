# 0001 — HL7 FHIR como padrão de dados

**Situação:** Aceita
**Data:** 2026-08-19
**Origem:** [Reunião de stack técnico, 19/08/2026](../reunioes/2026-08-19-stack-tecnico.md)

## Contexto

O OpenClinic nasce declarando interoperabilidade como pilar fundacional (veja [`vision.md`](../vision.md)). Existiam dois caminhos: modelar o domínio clínico do zero e exportar para um padrão depois, ou adotar um padrão existente como forma nativa dos dados.

Dois fatos pesaram: o **HL7 FHIR** é o padrão exigido pela Rede Nacional de Dados em Saúde (RNDS) e é o padrão internacional de interoperabilidade em saúde. Adotá-lo depois significaria reescrever o modelo de dados; adotá-lo agora significa que a compatibilidade é consequência da arquitetura, não de uma camada de tradução.

## Decisão

O FHIR é a **especificação a implementar**, não uma referência a se inspirar. O modelo de dados e a API são derivados da especificação publicada pelo HL7.

Onde o padrão não cobrir necessidades brasileiras, usam-se os **mecanismos de extensão previstos pelo próprio FHIR** — nunca invenções paralelas ao padrão.

O escopo do MVP não é implementar o FHIR inteiro: implementa-se o subconjunto de recursos que o MVP exige, já em conformidade, ampliando depois.

## Consequências

**Assumidas de bom grado:**

- Interoperabilidade com qualquer sistema que também siga o padrão, sem trabalho adicional de integração.
- O caminho para a RNDS fica aberto por construção.
- A especificação responde antecipadamente muitas perguntas de modelagem que o projeto teria que debater do zero.

**Custos reais:**

- Curva de aprendizado: contribuir com o projeto exige entender o padrão, não só a linguagem de programação.
- **Descasamento entre o formato de intercâmbio e o formato de armazenamento.** O FHIR organiza informação em *bundles* — conjuntos que fazem sentido para o usuário, desnormalizados. Um banco relacional tende ao oposto: normalização em tabelas separadas. Modelar o banco sem considerar como esses bundles serão remontados na consulta pode gerar um esquema onde as consultas necessárias ficam ineficientes ou inviáveis.

Esse descasamento é o **problema técnico central identificado até aqui**, e condiciona a decisão [0002](./0002-postgresql-como-banco-principal.md). Ele não está resolvido: o desenho do esquema precisa ser avaliado explicitamente sob essa ótica.

## Alternativas consideradas

- **Modelo próprio com exportação FHIR posterior** — descartada. É exatamente o padrão de comportamento dos prontuários fechados que o projeto existe para contestar, e transforma interoperabilidade em dívida técnica.
- **openEHR** — não chegou a ser debatida. Registrada aqui como alternativa conhecida no setor, para que a ausência do debate seja explícita em vez de parecer desconhecimento.

## Referências

- [Especificação HL7 FHIR](https://www.hl7.org/fhir/)
- [`docs/compliance.md`](../compliance.md) — seção sobre RNDS
