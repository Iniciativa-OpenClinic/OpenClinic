# Roadmap

*v0.3 — visão de fases em alto nível, sem datas fixas (exceto onde indicado).*

## Fase 0 — Visão e estrutura do repositório ✅

Definição da missão, princípios, licenciamento e mapeamento regulatório do projeto. A fundação documental sobre a qual tudo o resto é construído.

## Fase 1 — Formação da comunidade ✅

Primeiras pessoas desenvolvedoras e profissionais de saúde digital reunidas em torno do projeto, via GitHub e o grupo de WhatsApp (veja [`CONTRIBUTING.md`](../CONTRIBUTING.md)). A [reunião de 12/08](./reunioes/2026-08-12-primeira-reuniao.md) organizou as frentes de trabalho e produziu o primeiro levantamento de requisitos do produto.

## Fase 2 — Reuniões técnicas e definição de stack ✅

Concluída em [26/08/2026](./reunioes/2026-08-26-fechamento-do-stack.md), com o stack completo fechado em três reuniões técnicas: **Node.js** no backend, **React com Vite** no front-end e **monolito modular** executável com Docker Compose — somando-se ao FHIR, PostgreSQL e Docker das reuniões anteriores. Cada decisão está registrada em [`decisions/`](./decisions/), com contexto, consequências e alternativas descartadas. As que seguem em aberto (camada de cache e banco de apoio; formato dos endpoints) não bloqueiam as fases seguintes.

## Fase 3 — PRD técnico e definição do MVP 🔄 *(atual)*

Traduzir os requisitos conceituais do [`prd.md`](./prd.md) em um PRD técnico e um escopo de MVP, com o stack fechado na Fase 2 e o esquema de dados validado pelo time. O desenho do esquema PostgreSQL em conformidade com FHIR está em andamento, começando pelas tabelas de terminologia e acompanhado de dados fictícios; os primeiros protótipos de validação (autenticação) correm em paralelo, na ordem das camadas que a Fase 4 fixa.

Requisitos de engenharia já acordados para esta fase: conformidade com SOLID, desenho orientado ao domínio (DDD), arquitetura limpa e documentação técnica da API suficiente para viabilizar uma reimplementação independente.

A API é **REST** — o estilo de conversa da web, o mesmo do FHIR e do RNDS; o **contrato OpenAPI** a descreve, e o **FHIR** dá a forma do dado clínico que ela carrega. **O contrato nasce com o código: toda mudança de API o entrega atualizado no mesmo pull request** — decisão [0008](./decisions/0008-contrato-antes-ou-depois-do-codigo.md) —, é verificado automaticamente contra o código e revisado como **interface pública**, não como subproduto; o desenho dos endpoints deriva de [`modulos.md`](./modulos.md) e [`cadastros.md`](./cadastros.md), concretizando a decisão [0004](./decisions/0004-api-antes-de-interface.md). O contrato aplica **minimização por endpoint** — cada um devolve o mínimo da sua finalidade — e coleções são **paginadas por padrão**. Resta uma decisão de arquitetura a registrar em [`decisions/`](./decisions/): o formato dos endpoints — API no padrão FHIR puro, ou API própria com os dados clínicos em recursos FHIR e uma fachada FHIR para interoperabilidade.

## Fase 4 — Desenvolvimento do MVP

Construção da primeira versão funcional do OpenClinic, publicada continuamente no ambiente de homologação ([0007](./decisions/0007-ambiente-de-homologacao.md)) com dados fictícios.

O MVP cresce em incrementos que seguem a ordem das camadas da arquitetura ([`modulos.md`](./modulos.md)): transversal → estrutura → operação → apoio. Versões 0.x são cortadas conforme os incrementos ficam prontos; o fatiamento fino vive nos épicos e milestones do repositório, não aqui. A cada mudança, código e contrato OpenAPI são verificados automaticamente um contra o outro — a ferramenta dessa verificação é escolha do time — e a documentação navegável da API é publicada junto com a homologação.

Com o núcleo do MVP de pé, entra a **integração com o Memed** (grupo Afya, em transição de marca para AfyaRX): módulo **opcional, fora do núcleo**, acoplado pela API como qualquer outro. Ele antecipa para quem usa parte do que o Estágio 2 da certificação pede, com receita estruturada sobre a base de medicamentos da plataforma e alertas de interação e alergia, mas não substitui os requisitos próprios da certificação, que avaliam o sistema em si ([`conformidade-sbis.md`](./conformidade-sbis.md)). Cada clínica liga o módulo com credencial própria, guardada no cofre de segredos, e a receita assinada volta ao prontuário como documento, com a origem registrada: a guarda de vinte anos é do OpenClinic, não da plataforma.

## Fase 5 (futuro) — Certificação da distribuição oficial

Quando houver um produto maduro, buscar a Certificação de S-RES da SBIS para a distribuição oficial do OpenClinic (veja [`compliance.md`](./compliance.md) e [`licensing.md`](./licensing.md)).

## Expansões de escopo

A arquitetura prevê que especialidades sejam atendidas por **módulos acoplados à API**, sem alteração do núcleo — um módulo de odontograma para odontologia, um de bioimpedância para nutrologia, e assim por diante.

Odontologia, outras especialidades médicas ou qualquer super-nichamento **não têm data prevista**. Essas expansões acontecem sob decisão do conselho fundador, conforme a necessidade (veja [`GOVERNANCE.md`](../GOVERNANCE.md) e a filosofia de expansão em [`vision.md`](./vision.md)).
