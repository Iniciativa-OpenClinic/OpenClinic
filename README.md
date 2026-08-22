<div align="center">

<img src="docs/assets/logo.png" alt="OpenClinic" width="180">

# OpenClinic

**Prontuário eletrônico médico open source, com API aberta desde a concepção.**

Um contraponto aos prontuários de mercado que fecham seu ecossistema e não liberam suas APIs.

[![Licença](https://img.shields.io/badge/licen%C3%A7a-AGPL--3.0-2E7D9A?style=flat-square)](./LICENSE)
[![Status](https://img.shields.io/badge/status-pr%C3%A9--alfa-E8A33D?style=flat-square)](./docs/roadmap.md)
[![Padrão](https://img.shields.io/badge/interoperabilidade-HL7%20FHIR-3B6FB0?style=flat-square)](./docs/decisions/0001-fhir-como-padrao-de-dados.md)

[![Entrar no grupo de WhatsApp](https://img.shields.io/badge/ENTRAR%20NO%20GRUPO%20DE%20WHATSAPP-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://chat.whatsapp.com/LPxRX9ivXUm6VF4atVKYW7)

*É no grupo que a conversa do projeto acontece.*

</div>

<br>

> [!WARNING]
> **Não use em atendimento a pacientes.** O OpenClinic ainda não é um produto. Em que fase ele está, o [`roadmap.md`](./docs/roadmap.md) diz.

<br>

## Por que este projeto existe

Prontuários eletrônicos comerciais, em geral, fecham seus dados. Sair de um fornecedor ou integrar outro sistema costuma ser difícil, caro ou simplesmente impossível. A clínica gera os dados, mas depende da boa vontade de quem vende o software para acessá-los.

O OpenClinic nasce como contraponto: um prontuário cujo código é aberto e cuja API é, desde o primeiro dia, tratada como um produto tão importante quanto a própria interface. E cuja licença, a [AGPL-3.0](./LICENSE), impede que alguém pegue o que nasceu aberto e feche.

Missão, princípios e escopo completos em [`vision.md`](./docs/vision.md).

<br>

## O que torna isto difícil

Um prontuário parece um CRUD. Não é.

O **[HL7 FHIR](https://www.hl7.org/fhir/)** não é um formato de exportação que se acrescenta no fim. No OpenClinic, ele é a forma como o sistema pensa ([decisão 0001](./docs/decisions/0001-fhir-como-padrao-de-dados.md)). O padrão organiza informação em *bundles*: conjuntos montados para fazer sentido a quem lê, reunindo dados de várias entidades e repetindo o que o contexto clínico exigir. Um banco relacional quer exatamente o oposto: normalizar, separar, não repetir nada.

Esse descasamento **não é um obstáculo que se resolve uma vez e passa**. Ele reaparece a cada recurso novo que o sistema implementa: um esquema que responde bem a um recurso pode inviabilizar a consulta que outro exige. É a restrição que governa cada decisão de modelagem deste projeto, e vai continuar governando.

Some-se o que a regulação exige de um prontuário, e que molda o modelo de dados antes da primeira linha de código:

- Nada é apagado de verdade: exclusão marca, não remove.
- Toda informação carrega de onde veio e quem a registrou, de forma permanente.
- O registro precisa sobreviver **vinte anos**.
- Dados de clínicas diferentes nunca se encostam.
- Quem acessou o quê fica registrado em trilha que ninguém pode editar.

Nenhum desses requisitos é opcional. O mapeamento completo das normas está em [`compliance.md`](./docs/compliance.md); os requisitos de produto, em [`prd.md`](./docs/prd.md).

**Se isso te parece um problema interessante em vez de um aborrecimento, você é o tipo de pessoa que este projeto procura.**

<br>

## Como este projeto decide

Toda decisão de arquitetura vira um documento com contexto, consequências assumidas e, obrigatoriamente, as alternativas descartadas e o motivo. Ficam em **[`docs/decisions/`](./docs/decisions/)**, que é sempre a fonte atual do que já está fechado e do que segue em aberto.

Três regras valem aqui:

**Argumento é assinado.** Quem defende uma posição assina. O projeto não atribui opinião a ninguém por conta própria.

**Tese vencida não é apagada.** Ela permanece no registro, explicando o que já foi pesado. Discordar e perder não apaga sua contribuição do histórico do projeto.

**Decisão não se fecha com gente ausente.** Encaminhamento verbal no fim de uma reunião, com participantes fora da sala, não vale como decisão tomada.

Isso quer dizer que aqui se defende ideia por escrito e se aceita ser contrariado em público. Dá mais trabalho que abrir um pull request e sumir, e é de propósito.

Detalhes em [`GOVERNANCE.md`](./GOVERNANCE.md).

<br>

## Como participar

**A conversa do projeto acontece no [grupo de WhatsApp](https://chat.whatsapp.com/LPxRX9ivXUm6VF4atVKYW7). Entre.** Se o link estiver expirado, avise por uma [Issue](../../issues).

Quem chega de fora, ou prefere um canal público e permanente, **abre uma [Issue](../../issues)**, que é a porta registrada e pesquisável do projeto, e o time responde por lá.

A contribuição mais valiosa hoje é **ajudar a fechar as decisões que ainda estão em aberto**. Elas estão marcadas como tal no [índice de decisões](./docs/decisions/), e são as mais caras de reverter depois. Traga sua posição ao grupo ou registre-a numa Issue: posição assinada entra no registro da decisão.

Experiência especialmente bem-vinda: **HL7 FHIR e interoperabilidade em saúde**, **modelagem de dados clínicos**, **segurança da informação em dado sensível** e **quem já operou um prontuário na prática** e sabe onde dói. Guia completo em [`CONTRIBUTING.md`](./CONTRIBUTING.md).

<br>

## Documentação

| Documento | O que contém |
| :--- | :--- |
| [`docs/vision.md`](./docs/vision.md) | Missão, problema, princípios e escopo |
| [`docs/prd.md`](./docs/prd.md) | O que o sistema precisa fazer, e por quê |
| [`docs/modulos.md`](./docs/modulos.md) | Proposta de arquitetura de módulos da V1 |
| [`docs/cadastros.md`](./docs/cadastros.md) | Dicionário de dados dos cadastros, insumo para o esquema de banco |
| [`docs/conformidade-sbis.md`](./docs/conformidade-sbis.md) | Matriz de rastreabilidade da certificação SBIS v5.2 |
| [`docs/decisions/`](./docs/decisions/) | As decisões de arquitetura, uma por arquivo |
| [`docs/compliance.md`](./docs/compliance.md) | Normas brasileiras aplicáveis (LGPD, ANVISA, SBIS, RNDS, TISS) |
| [`docs/roadmap.md`](./docs/roadmap.md) | As fases do projeto |
| [`docs/reunioes/`](./docs/reunioes/) | O que cada reunião decidiu e deixou em aberto |
| [`GOVERNANCE.md`](./GOVERNANCE.md) | Como o projeto é conduzido, e como isso deve evoluir |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Como participar |
| [`SECURITY.md`](./SECURITY.md) | Como reportar uma vulnerabilidade |

<br>

## Licença

Distribuído sob a **[GNU Affero General Public License v3.0](./LICENSE)**.

Qualquer pessoa pode usar, modificar e hospedar o OpenClinic, inclusive comercialmente, desde que mantenha as modificações abertas sob a mesma licença. Existe também a previsão de uma licença comercial alternativa para quem não puder cumprir essa condição. Detalhes e limites em [`licensing.md`](./docs/licensing.md).

Copyright © 2026 Dr. Daniel Dorta Santiago de Carvalho Duarte, CRM 174209, e colaboradores do OpenClinic.

<br>

## Idioma

A documentação deste repositório é escrita em português, que é onde está a comunidade do projeto, e brasileira é a regulação que o condiciona. Código, identificadores, mensagens de commit e a especificação da API seguem o padrão internacional e são escritos em inglês.

<div align="center">
<br>
<sub>Iniciativa OpenClinic</sub>
</div>
