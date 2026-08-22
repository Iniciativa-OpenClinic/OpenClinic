# Requisitos de Produto (conceitual, pré-técnico)

*v0.4 — documento vivo.*

> [!NOTE]
> Este documento foi escrito **antes** das primeiras reuniões do projeto, como um mapa conceitual dos requisitos.
>
> Desde então: os requisitos levantados na [reunião de 12/08](./reunioes/2026-08-12-primeira-reuniao.md) foram incorporados, as decisões de stack da [reunião de 19/08](./reunioes/2026-08-19-stack-tecnico.md) estão em [`decisions/`](./decisions/), e a revisão de arquitetura de 21/08 — [`modulos.md`](./modulos.md) e [`cadastros.md`](./cadastros.md) — detalhou e ampliou este mapa muito além do rascunho inicial. Este documento continua respondendo ao **quê** e ao **porquê** de cada pilar; para o **como** — entidades, regras de negócio, campos —, ele aponta para lá.

## O que este documento é — e o que não é

Este é um PRD (Product Requirements Document) **conceitual**: descreve o quê o OpenClinic precisa fazer e por quê, não como — arquitetura, banco de dados, linguagem de programação e demais escolhas de stack couberam à reunião técnica com os desenvolvedores da comunidade e estão registradas em [`decisions/`](./decisions/).

Ele funciona como **mapa do produto**: reúne todos os pilares funcionais em resumo executivo, cada um apontando para onde vive o detalhe real — entidades e regras de negócio em [`modulos.md`](./modulos.md), campos de cadastro em [`cadastros.md`](./cadastros.md). Nada aqui repete o que já está lá; quem precisa de profundidade segue o link. O mapa cobre o produto **por inteiro**, não só a V1 — cada pilar marca o que está na V1 e o que é evolução futura, seguindo a mesma fronteira que [`modulos.md`](./modulos.md#fora-da-v1) já traça.

A meta de certificação também molda este mapa, e não só o desenho técnico: o projeto mira a certificação **SBIS S-RES v5.2**, categoria Clínica/Ambulatório, Estágio 1 completo mais o nível de segurança **NGS2** — detalhes em [`compliance.md`](./compliance.md) e a matriz de rastreabilidade em [`conformidade-sbis.md`](./conformidade-sbis.md). É por isso que pilares como Registro de prontuário e os requisitos não-funcionais abaixo trazem exigências específicas — assinatura digital, cabeçalho clínico fixo, controle de senha — que não nasceram de uma persona: nasceram da regulação.

Para o contexto de missão e princípios, veja [`vision.md`](./vision.md).

## Personas

- **Profissional de saúde** — médico(a), enfermeiro(a) e demais categorias com conselho de classe: usa o prontuário no atendimento — registra, prescreve dentro do que sua profissão permite, monta planos terapêuticos e assina digitalmente; precisa de acesso rápido e confiável ao histórico do paciente e da confiança de que o registro é seguro e íntegro.
- **Enfermagem**: é profissional de saúde como qualquer outra categoria — tem agenda, executa procedimentos, registra evolução de enfermagem e sinais vitais e assina com certificado próprio, como a Resolução COFEN 754/2024 exige. Conta ainda com uma visão de preparo do dia a partir da agenda: quem vem, com qual procedimento, kit e produtos extras.
- **Recepção / administrativo**: agenda, cadastra e opera as rotinas do dia a dia da clínica, com acesso **sem dado clínico** — é o cadastro de pessoas quem sustenta essa separação, não uma tela filtrada por cima.
- **Gestor(a) da clínica**: acompanha financeiro, repasse de profissionais e relatórios de produção, e concede permissões — acesso mais amplo que o operacional, e o único que vê dado de repasse.
- **Paciente**: é o titular dos dados registrados no prontuário; tem direito de acessá-los, entendê-los e levá-los embora.
- **Parceiro de integração**: sistema externo que consome a API e os webhooks — confirmação de agendamento, prontuário complementar, faturamento. É persona de primeira classe: a API aberta é o que evita que o OpenClinic vire mais um ecossistema fechado.

## Pilares funcionais

### Cadastro de pessoas

Três cadastros distintos — não um só com papéis diferentes: **paciente**, que pertence à clínica como organização e é compartilhado entre unidades; **profissional de saúde**, que exige registro em conselho de classe e tem agenda — medicina, enfermagem e as demais categorias compartilham esse mesmo cadastro; e **funcionário**, que opera o sistema sem exercer ato profissional e não tem agenda nem conselho. Essa distinção não é burocrática — é ela que sustenta a regra de acesso ao prontuário dos requisitos não-funcionais abaixo. Todos os três aceitam identificadores externos, para integração com outros sistemas da clínica. **Fora da V1:** portal do paciente, onde a própria pessoa acessaria seus dados diretamente. Entidades e regras: [`modulos.md`](./modulos.md#pessoas) · campos: [`cadastros.md`](./cadastros.md#paciente).

### Catálogo de procedimentos e produtos

Define o que a clínica oferece: o **procedimento**, com duração padrão, profissionais e salas compatíveis, kit de consumo associado e, quando aplicável, modelo de termo de consentimento (TCLE) vinculado. O preço não mora aqui — mora na tabela de preços do pagador, no módulo Convênios e pagadores; o procedimento apenas a exibe em modo de consulta. O intervalo mínimo entre sessões e as instruções de preparo (jejum e afins) também nascem aqui, e são o dado que um parceiro de agendamento consulta pela API. Entidades e regras: [`modulos.md`](./modulos.md#catálogo) · campos: [`cadastros.md`](./cadastros.md#procedimento).

### Agenda

O **coração operacional da clínica**, com exigência de usabilidade acima da média do resto do sistema — intuitivo, visual, utilizável sem treinamento. O motivo é de produto, não de estética: vende-se o prontuário para o médico, mas quem opera o sistema o dia inteiro é a recepção, e a qualidade do agendamento decide a adoção do produto na prática. Cobre disponibilidade de profissionais e salas — em quantas unidades a clínica tiver, com checagem de conflito —, bloqueios, encaixe e o ciclo completo do agendamento, além da fila de marcação que o plano terapêutico alimenta. **Fora do núcleo, de propósito:** lembretes e confirmação de agendamento são território de parceiros via API — o primeiro caso de uso real dos webhooks descritos abaixo. Entidades e regras: [`modulos.md`](./modulos.md#agenda) · campos: [`cadastros.md`](./cadastros.md#agendamento).

### Registro de prontuário

O núcleo do sistema: o **Atendimento** é a espinha, e todo documento clínico nasce vinculado a ele — anamnese, evolução, receita comum e de controle especial, solicitação de exames, encaminhamento, atestado, anexos e modelos por especialidade. Mantém também o resumo clínico estruturado do paciente — alergias, diagnósticos, medicações em uso —, sempre sem tomar decisão clínica por conta própria (**núcleo neutro**, [`vision.md`](./vision.md)). Todo documento segue o mesmo ciclo — aberto, finalizado, assinado —, e corrigir um documento finalizado é sempre nova versão, nunca edição silenciosa. O registro é **multiprofissional**: cada documento tem seu autor e sua assinatura, e quais tipos cada categoria emite é configurado pela clínica, não fixado pelo sistema. **Fora da V1:** apoio à decisão clínica (alertas de alergia e interação, Estágio 2 da certificação) e envio ao RNDS. Entidades e regras: [`modulos.md`](./modulos.md#prontuário) · campos: [`cadastros.md`](./cadastros.md#estruturas-clínicas-do-prontuário).

### Plano terapêutico

Quando o tratamento não é uma consulta única, o profissional monta um **plano terapêutico**: procedimentos com cronograma — quando cada um começa, quantas sessões, com que intervalo — e produtos extras por sessão. É um documento clínico como os demais, com o mesmo ciclo de vida e a mesma assinatura, mas **não carrega preço**: ao ser finalizado, gera automaticamente o orçamento correspondente no Financeiro; aprovado o orçamento, as sessões entram na fila de marcação da Agenda, uma a uma, sempre com confirmação humana. A clínica e cada profissional podem salvar **modelos de plano** (protocolos) reutilizáveis, para não montar do zero a cada paciente. Entidades e regras: [`modulos.md`](./modulos.md#prontuário) · campos: [`cadastros.md`](./cadastros.md#plano-terapêutico).

### Convênios e pagadores

A fundação completa de quem paga um atendimento — operadora, plano, vínculo do paciente com o plano e tabela de preços com vigência —, ainda que a **V1 fature apenas o pagador Particular**. Orçamento, agendamento e atendimento carregam fonte pagadora desde o primeiro dia, para que a chegada do convênio não exija redesenho. **Fora da V1:** faturamento TISS — geração de guias, lotes e glosas; quando entrar, encontra planos cadastrados, carteirinhas vinculadas e a fundação de terminologias pronta para importar as tabelas de guia. Entidades e regras: [`modulos.md`](./modulos.md#convênios-e-pagadores).

### Financeiro

O ciclo comercial da clínica nasce no orçamento — com validade e desconto por alçada por perfil — e segue para contas a receber com baixa parcial (total ou parcial, sempre com o saldo remanescente visível), pacotes com saldo de sessões, contas a pagar, caixa diário com abertura, fechamento e sangria, e repasse por produção, com regra padrão por profissional e exceções por procedimento. Nada aqui toca dado clínico: o financeiro é camada de apoio, alimentado pelos fatos que Agenda e Prontuário geram. **Questão em aberto:** como ratear o repasse quando uma parcela é recebida parcialmente. Entidades e regras: [`modulos.md`](./modulos.md#financeiro) · campos: [`cadastros.md`](./cadastros.md#financeiro--cadastros-de-apoio).

### Estoque

Produtos, kits e toda a movimentação por unidade de atendimento: entrada de compra, saída manual, ajuste de inventário, transferência entre unidades, perda e vencimento — e a **baixa automática** que dispara quando um procedimento com kit é registrado como realizado. Produto controla lote e validade quando a clínica define que deve controlar, com estoque mínimo por unidade gerando alerta. **Fora da V1:** pedido de compra e cotação, e a nota fiscal de entrada como documento fiscal — a entrada registra os dados da compra, não escritura o fiscal. Entidades e regras: [`modulos.md`](./modulos.md#estoque) · campos: [`cadastros.md`](./cadastros.md#produto) e [`cadastros.md`](./cadastros.md#movimentação-de-estoque).

### API aberta

Toda funcionalidade relevante do sistema deve ser acessível também por API, não só pela interface do usuário — é assim que o OpenClinic evita se tornar mais um ecossistema fechado. O padrão de dados é **HL7 FHIR** ([decisão 0001](./decisions/0001-fhir-como-padrao-de-dados.md)), e o contrato que descreve os endpoints nasce **antes do código**, como OpenAPI ([`roadmap.md`](./roadmap.md), Fase 3) — o desenho concreto dos endpoints é insumo direto da revisão de arquitetura mapeada em [`modulos.md`](./modulos.md) e [`cadastros.md`](./cadastros.md).

### Webhooks (notificações de eventos)

Sistemas externos devem poder ser avisados quando algo relevante acontece no OpenClinic, sem precisar consultar a API repetidamente. As garantias exigidas — a serem detalhadas tecnicamente com a comunidade — são:

- **Somente saída**: o OpenClinic notifica sistemas externos; ele não recebe eventos de fora por este canal (entrada de dados continua pela API, com sua própria autenticação e validação).
- **Payload mínimo**: a notificação carrega apenas o tipo do evento, um identificador opaco e a data/hora — **nenhum conteúdo clínico**. Quem recebe a notificação consulta a API autenticada para obter o dado em si.
- **Nomes de evento sem informação clínica**: o próprio nome do tipo de evento não pode revelar o que aconteceu clinicamente.
- **Entrega confiável**: reenvio automático em caso de falha, com espaçamento crescente entre tentativas.
- **Autenticidade**: cada notificação é assinada criptograficamente, para que quem recebe possa confirmar que ela realmente veio do OpenClinic.
- **Idempotência**: o mesmo evento não pode ser processado duas vezes pelo receptor, mesmo entregue mais de uma vez.
- **Registro de falhas**: notificações que não puderem ser entregues ficam registradas para acompanhamento.

O **catálogo concreto de eventos** ainda não foi definido — será construído com a comunidade técnica, respeitando as garantias acima.

## Requisitos não-funcionais

Derivados do mapeamento em [`compliance.md`](./compliance.md), e vários deles moldados também pela meta de certificação SBIS descrita acima — não são escolhas de tecnologia, são capacidades que o sistema precisa ter, para que uma clínica que o usa consiga cumprir suas próprias obrigações legais:

- **Trilha de auditoria imutável**: registro de quem acessou ou alterou o quê, sem possibilidade de remoção ou edição desse registro.
- **Controle de acesso granular**: além da separação entre perfil administrativo (sem acesso a dado clínico), perfil de profissional de saúde e perfil de gestão do sistema, as permissões precisam ser concedidas separadamente por domínio — financeiro, administrativo, clínico. Acesso a prontuário é, por padrão, restrito a profissional de saúde; a clínica pode concedê-lo a outros perfis, mas isso é decisão explícita e registrada, nunca comportamento padrão.
- **Isolamento entre organizações**: dados de clínicas distintas nunca se misturam. É um requisito separado do controle de acesso — resolver um não resolve o outro.
- **Exclusão reversível (*soft delete*)**: nenhum registro é removido de fato. A exclusão marca o registro como excluído e o dado permanece, íntegro e auditável.
- **Proveniência do dado**: toda informação carrega sua origem — de onde veio e quem a registrou — de forma permanente. Isso é parte do modelo de dados, não log de aplicação: log serve para diagnosticar erro; proveniência precisa ser consultável por quem tem permissão para auditar.
- **Suporte a assinatura digital**: para documentos e registros que precisem de validade jurídica plena sem papel.
- **Portabilidade de dados**: exportação completa dos dados de um paciente, a pedido, em formato utilizável — é o que sustenta o compromisso de "o software não aprisiona ninguém" declarado na visão do projeto.
- **Retenção de dados**: suporte à guarda mínima de 20 anos exigida para prontuários.

O desenho completo de cada um destes — entidades, regras de negócio e a tag do requisito de certificação correspondente — vive em [`modulos.md`](./modulos.md), na camada transversal (Identidade e Acesso, Auditoria e Proveniência).

## Requisitos a confirmar

Levantados em reunião com justificativa que o mapeamento regulatório do projeto ainda não sustenta. Ficam registrados como **pendentes de verificação**, e não como requisitos firmes — publicar afirmação regulatória incorreta é o tipo de erro que custa credibilidade a um projeto de saúde.

- **Localização dos dados em território nacional.** Levantado como proibição da LGPD. O [`compliance.md`](./compliance.md) registra algo mais preciso: a LGPD não proíbe hospedagem no exterior, ela sujeita a transferência internacional às regras dos artigos 33 a 36. Manter os dados no Brasil segue sendo uma decisão de projeto legítima e provavelmente desejável — simplifica a conformidade e atende à expectativa do mercado —, mas é decisão do OpenClinic, não imposição legal preexistente. Se adotada, merece registro próprio em [`decisions/`](./decisions/).
- **Senha com mínimo de 8 caracteres — resolvido.** Confirmado contra a fonte primária: é o requisito NGS1.02.03 da certificação SBIS v5.2, Estágio 1, e a regra completa vive hoje em [`modulos.md`](./modulos.md#identidade-e-acesso). A divergência técnica manifestada em reunião — autenticação por link de uso único ou código por e-mail seria mais segura que senha — permanece registrada como possível evolução, mas não substitui a exigência da certificação.

## Fora de escopo deste documento

- **Detalhamento de regras de negócio, entidades e campos de cada pilar** — vive em [`modulos.md`](./modulos.md) e [`cadastros.md`](./cadastros.md), não aqui.
- Escolha de linguagem de programação, banco de dados, framework ou infraestrutura de hospedagem.
- Arquitetura de sistema (monolito, microsserviços, etc.).
- Cronograma de desenvolvimento — veja [`roadmap.md`](./roadmap.md) para as fases planejadas.
- Catálogo definitivo de eventos de webhook.
- Funcionalidades de especialidades além da médica (odontologia etc.) — veja a filosofia de expansão em [`vision.md`](./vision.md).

Essas escolhas couberam às reuniões técnicas e estão registradas em [`decisions/`](./decisions/), não neste documento.
