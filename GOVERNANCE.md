# Governança

*v0.2 — documento vivo.*

## Modelo atual: liderança do fundador

O OpenClinic está, nesta fase, sob liderança do seu fundador, **Dr. Daniel Dorta Santiago de Carvalho Duarte, CRM 174209**. Ele é hoje o responsável final pelas decisões de visão, escopo e rumo do projeto.

Quando este documento se refere ao "conselho fundador" em outros lugares (como em [`vision.md`](./docs/vision.md) e no [`roadmap.md`](./docs/roadmap.md)), isso significa, na prática atual, **o fundador e as pessoas que ele vier a nomear para compor esse conselho** — não é, hoje, um órgão colegiado formal com processo de entrada definido. Decisões de expansão de escopo (por exemplo, adicionar odontologia ou outras especialidades) cabem a essa instância.

## Frentes de trabalho

O projeto organiza-se em duas frentes:

**Frente técnica** — padrão de dados e modelagem, banco de dados, API, infraestrutura e segurança. É quem toma as decisões registradas em [`docs/decisions/`](./docs/decisions/).

**Frente de estratégia, comunicação e parcerias** — posicionamento do projeto, formação de comunidade, relacionamento com instituições e articulação com o setor de saúde.

As frentes não são compartimentos estanques: uma mesma pessoa pode atuar nas duas, e decisões de peso são discutidas em conjunto.

**A frente técnica não se subdivide por especialidade.** A proposta inicial de criar subgrupos — infraestrutura, banco de dados, e assim por diante — foi revista já na primeira reunião. O argumento que prevaleceu: segmentar o desenvolvimento em times por área força comunicação entre as partes e leva, na prática, a definir interfaces internas desnecessárias, acabando por segmentar o próprio software por um motivo que é apenas organizacional. O projeto não tem escala que justifique especialização rígida.

Se a subdivisão vier, virá de forma natural conforme o trabalho exigir — não por desenho antecipado.

**Este repositório não publica a composição nominal das frentes.** Duas razões: a equipe está em formação e uma lista desatualizada informa mal; e ninguém tem seu nome publicado num repositório público sem ter dito que quer. Quem participa e deseja aparecer no registro do projeto o faz assinando suas próprias contribuições — em Issues, Pull Requests e no registro de decisões.

Quando a composição estabilizar e houver consentimento de cada pessoa, um documento de mantenedores será publicado.

## Como as decisões técnicas são tomadas

1. **A proposta é pública.** Toda decisão de arquitetura começa numa Issue, antes de virar decisão.
2. **O debate é registrado.** Decisões relevantes são gravadas em [`docs/decisions/`](./docs/decisions/), com contexto, consequências assumidas e — obrigatoriamente — as alternativas descartadas e o motivo.
3. **Teses vencidas não são apagadas.** Elas permanecem no registro. É o que permite a uma revisão futura saber o que já foi pesado, e é o que garante a quem discordou que sua posição não foi varrida para debaixo do tapete.
4. **Uma decisão não é considerada tomada** enquanto quem participou do debate não tiver tido oportunidade real de se posicionar. Encaminhamento verbal ao final de uma reunião, com participantes ausentes, não fecha decisão.
5. **Decisões são reversíveis, com custo.** Uma decisão aceita pode ser substituída por outra; o documento antigo ganha um aviso apontando para o novo, e não é reescrito.

Argumentos **não são atribuídos nominalmente** a partir de transcrição de reunião: transcrições automáticas erram, e atribuir publicamente uma posição técnica a alguém com base nelas é injusto. Atribuição é sempre de quem assina.

## Para onde isso caminha

A expectativa explícita é que esse modelo **evolua para um formato mais colegiado** conforme o projeto e sua comunidade amadurecem — com processo definido de participação, critérios de entrada e mecanismos de decisão compartilhada. Como e quando essa transição acontece ainda não está definido; será construído com a comunidade que se formar em torno do projeto, não decidido unilateralmente nem imposto de cima para baixo.

## Compromissos

Espelhando o que está em [`licensing.md`](./docs/licensing.md):

- A versão do OpenClinic sob AGPL-3.0 permanecerá sempre completa e funcional.
- Qualquer CLA (acordo de licenciamento de contribuidor) será publicado para comentário público antes de passar a ser exigido.
- Decisões relevantes do projeto serão registradas publicamente (em Issues do GitHub e em [`docs/decisions/`](./docs/decisions/), não apenas em conversas de canais como o WhatsApp — veja [`CONTRIBUTING.md`](./CONTRIBUTING.md)).

## Titularidade

"Iniciativa OpenClinic" ainda não é uma entidade jurídica constituída. Até que essa entidade exista, direitos de copyright e eventuais contratos comerciais (veja [`licensing.md`](./docs/licensing.md)) ficam provisoriamente sob a titularidade do fundador, com o compromisso de transferi-los à entidade jurídica quando ela for formalizada.

**Recursos de infraestrutura do projeto** — contas em provedores de nuvem, domínios, credenciais — devem ser vinculados às credenciais institucionais do projeto, nunca a contas pessoais de participantes, com acesso compartilhado entre mais de uma pessoa responsável. Ver a pendência registrada em [0007](./docs/decisions/0007-ambiente-de-homologacao.md).
