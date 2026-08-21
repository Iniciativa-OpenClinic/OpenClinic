# Requisitos de Produto (conceitual, pré-técnico)

*v0.3 — documento vivo.*

> [!NOTE]
> Este documento foi escrito **antes** das primeiras reuniões do projeto, e deliberadamente deixou as escolhas de tecnologia em aberto.
>
> Desde então: os requisitos levantados na [reunião de 12/08](./reunioes/2026-08-12-primeira-reuniao.md) foram incorporados abaixo, e as decisões de stack da [reunião de 19/08](./reunioes/2026-08-19-stack-tecnico.md) estão em [`decisions/`](./decisions/). O que segue continua valendo como a descrição do **quê** e do **porquê** que aquelas decisões precisam atender.

## O que este documento é — e o que não é

Este é um PRD (Product Requirements Document) **conceitual**, escrito antes de qualquer decisão técnica. Ele descreve **o quê** o OpenClinic precisa fazer e **por quê**, não **como** — arquitetura, banco de dados, linguagem de programação e demais escolhas de stack couberam à reunião técnica com os desenvolvedores da comunidade e estão registradas em [`decisions/`](./decisions/). Este documento existe para que aquela conversa técnica começasse com um objetivo compartilhado, não para substituí-la.

Para o contexto de missão e princípios, veja [`vision.md`](./vision.md). Para o mapeamento regulatório que fundamenta vários requisitos abaixo, veja [`compliance.md`](./compliance.md). A tradução destes requisitos em módulos, entidades e campos está proposta em [`modulos.md`](./modulos.md) e [`cadastros.md`](./cadastros.md).

## Personas de alto nível

- **Médico(a)**: usa o prontuário no atendimento; precisa de acesso rápido e confiável ao histórico do paciente e de confiança de que o registro é seguro e íntegro.
- **Equipe da clínica** (recepção, administrativo): usa o sistema para agendamento, cadastro e rotinas administrativas, com acesso mais restrito que o do médico.
- **Paciente**: é o titular dos dados registrados no prontuário; tem direito de acessá-los, entendê-los e levá-los embora.

## Pilares funcionais (nível de conceito)

### Registro de prontuário
O núcleo do sistema: armazenar e organizar o histórico clínico do paciente de forma estruturada, íntegra e auditável — sem tomar decisões clínicas por conta própria (veja "núcleo neutro" em [`vision.md`](./vision.md) e em [`compliance.md`](./compliance.md)).

### Cadastro de pessoas
**Profissional de saúde e funcionário são cadastros distintos, não papéis de um mesmo cadastro.** O profissional exige registro em conselho de classe, CPF, data de nascimento e endereço completo; o funcionário não tem essas exigências, porque não exerce ato profissional.

A distinção não é burocrática: é ela que sustenta a regra de acesso ao prontuário descrita nos requisitos não-funcionais.

### Agendamento
O **coração operacional da clínica**, com exigência de usabilidade acima da média do resto do sistema: intuitivo, visual, com arrastar e soltar, utilizável sem treinamento.

O motivo é de produto, não de estética. Vende-se o prontuário para o médico, mas quem opera o sistema o dia inteiro é a equipe de recepção — a qualidade do agendamento decide a adoção do produto na prática, independentemente do que o prontuário faça de bom.

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

Derivados do mapeamento em [`compliance.md`](./compliance.md) — não são escolhas de tecnologia, são capacidades que o sistema precisa ter, para que uma clínica que o usa consiga cumprir suas próprias obrigações legais:

- **Trilha de auditoria imutável**: registro de quem acessou ou alterou o quê, sem possibilidade de remoção ou edição desse registro.
- **Controle de acesso granular**: além da separação entre perfil administrativo (sem acesso a dado clínico), perfil de profissional de saúde e perfil de gestão do sistema, as permissões precisam ser concedidas separadamente por domínio — financeiro, administrativo, clínico. Acesso a prontuário é, por padrão, restrito a profissional de saúde; a clínica pode concedê-lo a outros perfis, mas isso é decisão explícita e registrada, nunca comportamento padrão.
- **Isolamento entre organizações**: dados de clínicas distintas nunca se misturam. É um requisito separado do controle de acesso — resolver um não resolve o outro.
- **Exclusão reversível (*soft delete*)**: nenhum registro é removido de fato. A exclusão marca o registro como excluído e o dado permanece, íntegro e auditável.
- **Proveniência do dado**: toda informação carrega sua origem — de onde veio e quem a registrou — de forma permanente. Isso é parte do modelo de dados, não log de aplicação: log serve para diagnosticar erro; proveniência precisa ser consultável por quem tem permissão para auditar.
- **Suporte a assinatura digital**: para documentos e registros que precisem de validade jurídica plena sem papel.
- **Portabilidade de dados**: exportação completa dos dados de um paciente, a pedido, em formato utilizável — é o que sustenta o compromisso de "o software não aprisiona ninguém" declarado na visão do projeto.
- **Retenção de dados**: suporte à guarda mínima de 20 anos exigida para prontuários.

## Requisitos a confirmar

Levantados em reunião com justificativa que o mapeamento regulatório do projeto ainda não sustenta. Ficam registrados como **pendentes de verificação**, e não como requisitos firmes — publicar afirmação regulatória incorreta é o tipo de erro que custa credibilidade a um projeto de saúde.

- **Localização dos dados em território nacional.** Levantado como proibição da LGPD. O [`compliance.md`](./compliance.md) registra algo mais preciso: a LGPD não proíbe hospedagem no exterior, ela sujeita a transferência internacional às regras dos artigos 33 a 36. Manter os dados no Brasil segue sendo uma decisão de projeto legítima e provavelmente desejável — simplifica a conformidade e atende à expectativa do mercado —, mas é decisão do OpenClinic, não imposição legal preexistente. Se adotada, merece registro próprio em [`decisions/`](./decisions/).
- **Senha com mínimo de 8 caracteres como exigência obrigatória — confirmado.** Verificado contra a fonte primária: é o requisito NGS1.02.03 da certificação SBIS v5.2, de Estágio 1, e o projeto o cumpre — ver [`conformidade-sbis.md`](./conformidade-sbis.md). A divergência técnica manifestada em reunião — autenticação por link de uso único ou código por e-mail seria mais segura que senha — permanece registrada como possível evolução, mas não substitui a exigência da certificação.

## Fora de escopo deste documento

- Escolha de linguagem de programação, banco de dados, framework ou infraestrutura de hospedagem.
- Arquitetura de sistema (monolito, microsserviços, etc.).
- Cronograma de desenvolvimento — veja [`roadmap.md`](./roadmap.md) para as fases planejadas.
- Catálogo definitivo de eventos de webhook.
- Funcionalidades de especialidades além da médica (odontologia etc.) — veja a filosofia de expansão em [`vision.md`](./vision.md).

Essas escolhas couberam às reuniões técnicas e estão registradas em [`decisions/`](./decisions/), não neste documento.
