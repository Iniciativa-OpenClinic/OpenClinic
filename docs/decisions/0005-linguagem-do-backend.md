# 0005 — Linguagem e plataforma do backend

**Situação:** **Em aberto** — decisão prevista para a reunião de 26/08/2026
**Data de abertura:** 2026-08-19
**Origem:** [Reunião de stack técnico, 19/08/2026](../reunioes/2026-08-19-stack-tecnico.md)

## Contexto

Definidos o padrão de dados ([0001](./0001-fhir-como-padrao-de-dados.md)), o banco ([0002](./0002-postgresql-como-banco-principal.md)) e a prioridade do backend ([0004](./0004-api-antes-de-interface.md)), resta a escolha que mais condiciona o dia a dia do projeto: em que linguagem e plataforma a API é escrita.

Esta decisão é diferente das anteriores. As outras foram consenso rápido. Esta tem **teses concorrentes, sustentadas por pessoas com experiência real e argumentos legítimos** — e é a decisão mais cara de reverter depois.

## Situação do debate

A reunião de 19/08/2026 dedicou a maior parte do tempo a este tema e foi **encerrada sem decisão**, com a finalização remarcada para o encontro seguinte, expressamente para que as teses amadurecessem.

Ao final daquela reunião, já fora da parte formal e com parte dos participantes ausente, houve uma formulação verbal de encaminhamento em favor de Node.js com Python para serviços de inteligência artificial. **Este projeto não trata essa formulação como decisão tomada.** Nem todos os participantes do debate estavam presentes naquele momento, e pelo menos uma tese concorrente não havia sido retirada por quem a defendia.

Registrar isso é deliberado. Um projeto de código aberto se sustenta na legitimidade das suas decisões: uma escolha técnica que atropela quem discordou não economiza tempo, cobra depois — em contribuidor que some sem dizer por quê.

## Critérios em disputa

O debate não foi sobre qual linguagem é melhor em abstrato. Foi sobre **qual critério deve pesar mais**:

1. **Tamanho da base de desenvolvedores.** Um projeto de código aberto vive de quem chega. Uma tecnologia pouco difundida limita o funil de contribuição, independentemente da sua qualidade técnica.
2. **Eficiência de recursos.** Menos memória e menos CPU significam menos servidor, custo de operação menor para cada clínica autohospedada, e viabilidade em hardware modesto — critério reforçado pela decisão [0007](./0007-ambiente-de-homologacao.md).
3. **Segurança de tipos.** Em domínio clínico, erro de tipo que só aparece em tempo de execução, num caminho de código pouco percorrido, é risco sobre dado de paciente.
4. **Afinidade com serviços de inteligência artificial.** Ver decisão relacionada sobre a fronteira entre núcleo e IA, mais abaixo.
5. **Custo de transição agora versus custo de complexidade depois.** Argumento levantado explicitamente nos dois sentidos.

## Teses apresentadas

Resumo dos argumentos, **sem atribuição nominal**. Quem defendeu cada tese e quiser assinar sua posição pode fazê-lo — veja "Como participar desta decisão" no fim.

### Tese A — Go

**A favor:** eficiência de memória e CPU muito superior a plataformas interpretadas; compilação para binário único, o que torna a publicação trivial e permite contêiner mínimo; tipagem verificada em tempo de compilação, com tipos reais e não uma camada sobre outra linguagem; coletor de lixo que trabalha em paralelo, sem as pausas do modelo alternativo; uma forma óbvia de fazer cada coisa, incluindo formatação automática de código; densidade de instâncias por servidor muito maior — a comparação citada foi da ordem de cinco contra trinta instâncias no mesmo hardware; e simplicidade operacional, dispensando especialista em nuvem para escalar.

**Contra, reconhecido pela própria defesa:** o tratamento de erros é verboso e desagrada quem vem de linguagens com exceções; representa barreira real para quem se formou apenas em uma stack de JavaScript; e há menos desenvolvedores disponíveis — a defesa reconheceu não conseguir trazer contribuidores de Go para o projeto.

### Tese B — Python

**A favor:** base de desenvolvedores ampla e acessível; afinidade forte com serviços de inteligência artificial; ecossistema maduro para API e para linha de comando; e o argumento de que o volume transacional de um prontuário não justifica otimização de baixo nível — a aplicação não tem o perfil de carga que tornaria a eficiência de Go decisiva.

**Contra:** ausência de tipagem forte garantida, com erros aparecendo em tempo de execução. A contra-argumentação sustentou que ferramentas de verificação automática mitigam isso.

### Tese C — Node.js

**A favor:** a maior base de desenvolvedores entre as opções; maturidade; bibliotecas prontas para praticamente tudo; boa aderência a API, interoperabilidade e ao próprio HL7; e facilidade de manutenção.

**Contra:** consumo de recursos e quantidade de dependências; e a observação de que a tipagem via TypeScript é uma camada sobre uma linguagem sem tipos, o que exige estudo para usar corretamente.

### Tese D — Node.js no núcleo, Python nos serviços de IA

Combinação apresentada por mais de um participante e que reúne os critérios 1 e 4: o backend sistêmico em Node.js, conversando com o banco e servindo a API; e Python restrito às funções determinísticas consumidas por serviços de inteligência artificial.

### Tese E — Rust

Mencionada como alternativa também eficiente e com comunidade forte, mas reconhecida como mais difícil de trabalhar que Go. Não foi desenvolvida.

## Ponto correlato: portabilidade da decisão

Levantou-se se seria viável reimplementar em outra linguagem no futuro. A resposta convergente foi: **depende inteiramente da qualidade e da documentação da primeira implementação.**

Registrou-se também um alerta concreto: tradução automatizada arquivo a arquivo, inclusive com auxílio de inteligência artificial, produz código que funciona sem ser idiomático na linguagem de destino — foi citado o caso de um projeto portado dessa forma, que resultou em milhares de trechos marcados como inseguros. Reimplementar é trabalho de engenharia, não de tradução.

**Consequência prática, independente de qual tese vença:** a qualidade da documentação técnica da API é o que preserva a liberdade de mudar de ideia depois. Isso reforça a decisão [0004](./0004-api-antes-de-interface.md).

## Requisitos que a implementação deve atender, qualquer que seja a escolha

Levantados em reunião e não contestados:

- Conformidade com princípios SOLID.
- Desenho orientado ao domínio (DDD).
- Arquitetura limpa, com separação clara entre domínio, aplicação e infraestrutura.
- Documentação técnica da API suficiente para que uma reimplementação independente seja viável.

## Fronteira entre núcleo e inteligência artificial

Um princípio operacional emergiu do debate e merece registro, porque resolve uma tensão aparente com o [`vision.md`](../vision.md), que declara o núcleo do sistema neutro e sem IA embutida:

> Nenhum agente de inteligência artificial decide aquilo que uma função determinística pode calcular.

Sob esse princípio, o papel do Python não é "colocar IA no prontuário": é fornecer **funções determinísticas e auditáveis** que serviços de IA invocam como ferramentas, em vez de deixar o modelo inferir o resultado. Os usos cogitados — transcrição, por exemplo — são de apoio operacional, não de decisão clínica.

Isso é **compatível** com o núcleo neutro descrito no `vision.md` e com o enquadramento regulatório de [`compliance.md`](../compliance.md), desde que a fronteira seja respeitada: o serviço de IA fica fora do caminho crítico do prontuário e não emite juízo clínico. Se em algum momento o projeto quiser cruzar essa fronteira, isso exige ADR próprio e avaliação regulatória específica — não é decorrência desta decisão.

## Como participar desta decisão

Esta decisão está aberta e o registro acima é público justamente para que o debate continue por escrito.

- **Para assinar sua posição:** comente na Issue vinculada ou abra um Pull Request adicionando seu argumento com seu nome nesta seção. O projeto não atribui argumentos a pessoas a partir de transcrição de reunião.
- **Para trazer uma tese nova:** abra uma Issue do tipo *Proposta de decisão técnica*.

Quando houver decisão, este documento passa a **Aceita**, com a justificativa registrada. As teses vencidas **permanecem aqui** — elas explicam por que o projeto é como é, e permitem que uma revisão futura saiba o que já foi pesado.
