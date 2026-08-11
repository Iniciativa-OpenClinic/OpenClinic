# Requisitos de Produto (conceitual, pré-técnico)

*v0.1 — documento vivo.*

## O que este documento é — e o que não é

Este é um PRD (Product Requirements Document) **conceitual**, escrito antes de qualquer decisão técnica. Ele descreve **o quê** o OpenClinic precisa fazer e **por quê**, não **como** — arquitetura, banco de dados, linguagem de programação e demais escolhas de stack ficam para a reunião técnica com os desenvolvedores da comunidade, prevista no [`ROADMAP.md`](./ROADMAP.md). Este documento existe para que essa conversa técnica comece com um objetivo compartilhado, não para substituí-la.

Para o contexto de missão e princípios, veja [`vision.md`](./vision.md). Para o mapeamento regulatório que fundamenta vários requisitos abaixo, veja [`COMPLIANCE.md`](./COMPLIANCE.md).

## Personas de alto nível

- **Médico(a)**: usa o prontuário no atendimento; precisa de acesso rápido e confiável ao histórico do paciente e de confiança de que o registro é seguro e íntegro.
- **Equipe da clínica** (recepção, administrativo): usa o sistema para agendamento, cadastro e rotinas administrativas, com acesso mais restrito que o do médico.
- **Paciente**: é o titular dos dados registrados no prontuário; tem direito de acessá-los, entendê-los e levá-los embora.

## Pilares funcionais (nível de conceito)

### Registro de prontuário
O núcleo do sistema: armazenar e organizar o histórico clínico do paciente de forma estruturada, íntegra e auditável — sem tomar decisões clínicas por conta própria (veja "núcleo neutro" em [`vision.md`](./vision.md) e em [`COMPLIANCE.md`](./COMPLIANCE.md)).

### API aberta
Toda funcionalidade relevante do sistema deve ser acessível também por API, não só pela interface do usuário — é assim que o OpenClinic evita se tornar mais um ecossistema fechado. Padrão de referência pretendido: **HL7 FHIR**.

### Webhooks (notificações de eventos)
Sistemas externos devem poder ser avisados quando algo relevante acontece no OpenClinic, sem precisar consultar a API repetidamente. Nesta fase, as garantias exigidas — a serem detalhadas tecnicamente na reunião com a comunidade — são:

- **Somente saída**: o OpenClinic notifica sistemas externos; ele não recebe eventos de fora por este canal (entrada de dados continua pela API, com sua própria autenticação e validação).
- **Payload mínimo**: a notificação carrega apenas o tipo do evento, um identificador opaco e a data/hora — **nenhum conteúdo clínico**. Quem recebe a notificação consulta a API autenticada para obter o dado em si.
- **Nomes de evento sem informação clínica**: o próprio nome do tipo de evento não pode revelar o que aconteceu clinicamente (por exemplo, um evento cujo nome já denuncia um resultado de exame violaria esse princípio, mesmo sem carregar o dado).
- **Entrega confiável**: reenvio automático em caso de falha, com espaçamento crescente entre tentativas.
- **Autenticidade**: cada notificação deve ser assinada criptograficamente, para que quem recebe possa confirmar que ela realmente veio do OpenClinic.
- **Idempotência**: o mesmo evento não pode ser processado duas vezes pelo receptor, mesmo que seja entregue mais de uma vez.
- **Registro de falhas**: notificações que não puderem ser entregues devem ficar registradas para acompanhamento.

O **catálogo concreto de eventos** (quais acontecimentos geram notificação) ainda não foi definido — será construído com a comunidade técnica, respeitando as garantias acima.

## Requisitos não-funcionais

Derivados do mapeamento em [`COMPLIANCE.md`](./COMPLIANCE.md) — não são escolhas de tecnologia, são capacidades que o sistema precisa ter, para que uma clínica que o usa consiga cumprir suas próprias obrigações legais:

- **Trilha de auditoria imutável**: registro de quem acessou ou alterou o quê, sem possibilidade de remoção ou edição desse registro.
- **Controle de acesso por perfil**: no mínimo, separação entre perfil administrativo (sem acesso a dado clínico), perfil de profissional de saúde e perfil de gestão do sistema.
- **Suporte a assinatura digital**: para documentos e registros que precisem de validade jurídica plena sem papel.
- **Portabilidade de dados**: exportação completa dos dados de um paciente, a pedido, em formato utilizável — é o que sustenta o compromisso de "o software não aprisinga ninguém" declarado na visão do projeto.
- **Retenção de dados**: suporte à guarda mínima de 20 anos exigida para prontuários.

## Fora de escopo deste documento

- Escolha de linguagem de programação, banco de dados, framework ou infraestrutura de hospedagem.
- Arquitetura de sistema (monolito, microsserviços, etc.).
- Cronograma de desenvolvimento — veja [`ROADMAP.md`](./ROADMAP.md) para as fases planejadas.
- Catálogo definitivo de eventos de webhook.
- Funcionalidades de especialidades além da médica (odontologia etc.) — veja a filosofia de expansão em [`vision.md`](./vision.md).

Essas decisões pertencem à reunião técnica com a comunidade de desenvolvedores, não a este documento.
