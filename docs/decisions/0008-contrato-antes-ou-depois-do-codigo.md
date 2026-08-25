# 0008 — Contrato da API antes ou depois do código

**Situação:** **Em aberto** — decisão do conselho fundador, em reunião
**Data de abertura:** 2026-08-22
**Origem:** revisão da documentação de arquitetura de 21–22/08/2026, com a consulta a desenvolvedores de fora do projeto

## Contexto

A decisão [0004](./0004-api-antes-de-interface.md) estabeleceu que **toda interface é cliente da API**, nunca o contrário. Ela não disse, porém, em que momento a descrição escrita dessa API nasce: **antes** do código, como projeto a ser implementado, ou **depois** dele, gerada a partir do que o código já faz.

A proposta de arquitetura e as primeiras versões do [`roadmap.md`](../roadmap.md) recomendaram a primeira ordem. **Essa recomendação nunca passou por decisão do grupo** — e desenvolvedores consultados fora do projeto apontaram, corretamente, que a prática dominante no mercado é a segunda. Como a escolha condiciona o fluxo de trabalho de todos os que vierem contribuir, ela vira decisão registrada em vez de pressuposto herdado de um documento de proposta.

## O que é um contrato de API

Um **contrato de API** é um arquivo que descreve, num formato que tanto uma pessoa quanto um programa conseguem ler, tudo o que a API oferece: quais endereços existem (`/pacientes`, `/agendamentos`), o que cada um aceita receber, o que devolve, quais campos são obrigatórios, que erros podem acontecer. **OpenAPI** é o formato padrão desse arquivo; o nome antigo, ainda muito usado no dia a dia, é **Swagger**.

Vale a analogia do restaurante: se o *endpoint* é o balcão onde se faz o pedido, o contrato é o **cardápio** — a lista do que dá para pedir e do que vem em cada prato. Sem cardápio, só descobre o que existe quem pergunta ao garçom.

Ter esse arquivo permite quatro coisas, independentemente de quando ele foi escrito:

- **Documentação navegável** — a página onde qualquer pessoa lê a API e experimenta as chamadas.
- **Geração de bibliotecas cliente** — quem for integrar não precisa escrever do zero o código que conversa com o OpenClinic.
- **Servidor de mentira (*mock*)** — um serviço que responde conforme o contrato, permitindo construir e testar contra a API antes de ela existir de verdade.
- **Verificação automática** — comparar o que o código realmente faz com o que o contrato promete, e barrar a diferença.

**O contrato existe nos dois caminhos.** A pergunta desta decisão não é se ele existe: é **quando nasce e quem manda em quem** — se o código descreve o contrato, ou se o contrato descreve o código.

## Tese A — Código primeiro, contrato gerado a partir dele

**A favor.** É a prática dominante do mercado, por motivos legítimos: na maioria dos projetos, a API tem um único consumidor — a interface da própria equipe —, e o custo de coordenação que um contrato resolve simplesmente não existe. Mantém **uma só fonte da verdade**: o contrato gerado não consegue divergir do formato que o código expõe, e documentação que mente é pior que documentação nenhuma. Vem **de graça** nos frameworks atuais, que produzem o contrato a partir do código já escrito. Respeita a instabilidade dos requisitos: projetar a API antes de entender o domínio congela decisão errada, e escrever código é o caminho mais barato de descobrir o que a API deveria ser. E entrega **progresso visível cedo**, o que num projeto de voluntários é combustível de moral e de recrutamento.

**Contra.** A API tende a espelhar a estrutura interna do código em vez do domínio — é exatamente assim que nasce a "API de segunda classe" que a [0004](./0004-api-antes-de-interface.md) existe para evitar. Consumidores externos só começam quando o backend existe. E o contrato gerado descreve o **formato**, raramente o **significado**: sem revisão deliberada, ele vira listagem do que foi feito, não projeto do que deveria ser.

## Tese B — Contrato primeiro, código escrito para cumpri-lo

**A favor.** Consumidores independentes — interface e parceiros de integração — começam antes do backend, construindo contra um servidor de mentira gerado do contrato. A API é projetada e revisada como **interface pública**, não como reflexo do código. É **neutra de linguagem**: pode avançar com a [0005](./0005-linguagem-do-backend.md) em aberto, e o tamanho real da API é insumo dessa própria decisão. Boa parte do formato do dado clínico já vem prescrita de fora pelo **FHIR** ([0001](./0001-fhir-como-padrao-de-dados.md)), o que reduz o risco de projetar no vácuo. E é o modelo dos padrões de interoperabilidade que este projeto consome: o próprio FHIR e a RNDS existem como especificação antes de qualquer implementação.

**Contra.** São dois artefatos que podem divergir, e contrato que promete o que o código não cumpre é pior que documentação nenhuma. Exige disciplina e verificação automática desde o início — sem isso, vira ficção em poucos meses. Atrasa a primeira demonstração funcional. E tem **custo de adoção real**: é prática minoritária, e boa parte de quem chega ao projeto nunca trabalhou assim — método que ninguém domina vira teatro.

## O que vale em qualquer das duas

Estes pontos não dependem da ordem escolhida, e seguem valendo enquanto a decisão estiver aberta:

- Quem muda a API **atualiza o contrato na mesma entrega** — documentar não é etapa posterior.
- **Verificação automática** de que código e contrato descrevem a mesma API; a ferramenta é escolha do time.
- **Documentação navegável publicada** junto com o ambiente de homologação ([0007](./0007-ambiente-de-homologacao.md)).
- Mudança na API passa por **revisão explícita** antes de virar compromisso com terceiros — é esse portão, e não a ordem dos arquivos, que impede a API de segunda classe.

## Critérios que devem pesar na escolha

1. **Quantos consumidores independentes** a API terá antes de o backend estabilizar — e se eles podem esperar.
2. **Quanto do formato já vem prescrito** pelo FHIR e pela RNDS, reduzindo o que sobra para projetar.
3. **A prática real de quem vai contribuir.** Um método que a equipe não domina custa adesão, e regra que ninguém segue é pior que regra nenhuma.
4. **Custo de reverter.** Abandonar o contrato-primeiro é barato; refazer uma API pública que já tem consumidores, não.
5. **Velocidade até a primeira versão demonstrável**, que num projeto voluntário sustenta o engajamento.

## Próximo passo

Decisão do **conselho fundador**, em reunião (veja [`GOVERNANCE.md`](../../GOVERNANCE.md)). Até lá, nenhum documento do projeto afirma qual das duas ordens o OpenClinic segue: o [`roadmap.md`](../roadmap.md) descreve a frente do contrato sem fixar a ordem, e o que vale nos dois caminhos continua escrito no [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## Como participar desta decisão

- **Para assinar sua posição:** abra um Pull Request adicionando seu argumento com seu nome nesta seção, ou deixe-o escrito numa Issue. Posição debatida no grupo de WhatsApp ou em reunião entra no registro assim — por escrito e assinada.
- **Para trazer uma tese nova:** leve-a ao grupo de WhatsApp ou abra uma Issue do tipo *Proposta de decisão técnica*.

Experiência prática com qualquer um dos dois caminhos — inclusive relato de onde deu errado — é a contribuição mais útil aqui.
