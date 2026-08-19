# Primeira reunião — 12/08/2026

**Assunto:** apresentação do projeto, organização das frentes de trabalho e levantamento de requisitos
**Duração:** cerca de 62 minutos

Este é o registro estruturado da reunião. Ele não é uma transcrição, e não atribui argumentos nominalmente — veja o [critério adotado](./README.md).

## Contexto

Primeira reunião do OpenClinic, correspondente à Fase 1 do [`roadmap.md`](../roadmap.md). O repositório existia apenas com a fundação documental; nenhuma decisão técnica havia sido tomada.

Além da formação da comunidade, esta reunião produziu o **primeiro levantamento concreto de requisitos** do produto — material que até então não existia em lugar nenhum e que agora está incorporado ao [`prd.md`](../prd.md).

## Organização das frentes de trabalho

Definidas duas frentes: **técnica** e **marketing, estratégia e parcerias**. Uma mesma pessoa pode atuar nas duas, e a separação existe para organizar as conversas, não para separar pessoas.

O motivo declarado da segunda frente: um projeto de código aberto precisa de relevância pública para atrair contribuidores, e isso não acontece sozinho. A frente também absorve **parcerias** — a hipótese levantada foi que fornecedores hoje bloqueados pelos prontuários fechados do mercado (empresas de automação, chatbots de agendamento, ferramentas de escrita clínica) são aliados naturais de um prontuário com API aberta, e podem construir módulos sobre ela.

### Decisão: o time técnico não se subdivide agora

Houve debate real aqui, e a proposta inicial foi revista.

A ideia inicial era criar subgrupos dentro da frente técnica — infraestrutura, banco de dados, captação de desenvolvedores. O contra-argumento que prevaleceu: **segmentar o desenvolvimento em times por área força comunicação entre as partes e leva, na prática, a definir interfaces internas desnecessárias** — acabando por segmentar o próprio software de uma forma ruim, por um motivo que é apenas organizacional. O projeto não tem escala que justifique especialização rígida.

A conciliação aceita por todos: **a subdivisão acontece de forma natural, conforme o trabalho exigir**, e não por desenho antecipado.

Registrado em [`GOVERNANCE.md`](../../GOVERNANCE.md).

## Requisitos levantados

O levantamento abaixo foi feito em reunião, a partir da experiência de uso de prontuários no atendimento e do mapeamento regulatório do repositório. Todos foram incorporados ao [`prd.md`](../prd.md).

### Cadastro de pessoas

**Profissional de saúde e funcionário são cadastros distintos, não papéis de um mesmo cadastro.** O profissional exige registro em conselho de classe, CPF, data de nascimento e endereço completo. O funcionário não tem essas exigências, porque não exerce ato profissional.

A distinção não é burocrática: é ela que sustenta a regra de acesso ao prontuário.

### Controle de acesso

- Acesso a prontuário é, por padrão, **restrito a profissional de saúde**.
- A clínica pode conceder acesso a outros perfis — a recepção, por exemplo — mas isso tem que ser uma **decisão explícita e registrada**, nunca o comportamento padrão.
- As permissões precisam ser **granulares** e não apenas por papel: financeira, administrativa, clínica, cada uma concedida separadamente.

### Isolamento entre clínicas

Dados de organizações distintas **nunca se misturam**. Levantado explicitamente como preocupação separada do controle de acesso — são dois problemas diferentes, e resolver um não resolve o outro.

### Soft delete e proveniência

- **Nada é removido de fato.** Exclusão marca o registro como excluído; o dado permanece.
- **Toda informação carrega sua origem**: de onde veio, quem a registrou, e isso é permanente.

Observação relevante feita em reunião: **proveniência não é log de aplicação.** Log serve para diagnosticar erro; isso aqui é parte do modelo de dados, e precisa ser consultável por quem tiver permissão para auditar.

Surgiu também a ideia de, periodicamente, mover registros marcados como excluídos para uma área de arquivamento separada — a ser avaliada no desenho do banco.

### Agendamento

Identificado como **o coração operacional da clínica**, com uma exigência de usabilidade acima da média do resto do sistema: intuitivo, visual, com arrastar e soltar, utilizável por qualquer pessoa sem treinamento.

O motivo é um insight de produto que vale registrar:

> Vende-se para o médico, mas entrega-se para a secretária.

Quem usa o sistema o dia inteiro é a equipe de recepção. A qualidade do agendamento decide a adoção do produto na prática, independentemente do que o prontuário faça de bom.

### Retenção e autenticação

- Guarda mínima de **20 anos** — já registrada no `prd.md` desde a fundação.
- **Autenticação por senha**, com mínimo de 8 caracteres. Ver a ressalva na seção seguinte.

## Pontos que exigem verificação antes de virarem afirmação do projeto

Dois requisitos foram levantados com uma justificativa que o próprio repositório não sustenta. Ficam registrados como **a confirmar**, e não como fato — publicar afirmação regulatória incorreta é o tipo de erro que custa credibilidade num projeto de saúde.

**1. "Os dados não podem sair do país porque a LGPD proíbe."**

O [`compliance.md`](../compliance.md) do projeto registra algo diferente e mais preciso: a LGPD **não proíbe** hospedagem no exterior — ela sujeita a transferência internacional às regras dos artigos 33 a 36.

Manter os dados no Brasil continua sendo uma **decisão de projeto legítima e provavelmente desejável** — simplifica a conformidade, atende à expectativa do mercado de saúde e evita discussão jurídica desnecessária. Mas é uma decisão do OpenClinic, não uma imposição legal preexistente. Se o projeto quiser adotá-la, ela merece um registro próprio em [`decisions/`](../decisions/) com essa justificativa honesta.

**2. "Senha de no mínimo 8 caracteres é exigência obrigatória."**

Atribuído em reunião aos requisitos de certificação. O `compliance.md` declara abertamente que seu levantamento foi feito com auxílio de inteligência artificial e não foi verificado contra as fontes primárias. Antes de virar requisito firme, precisa ser confirmado no manual de certificação de S-RES da SBIS.

Vale registrar também a divergência técnica manifestada na própria reunião por quem levantou o requisito: autenticação por link de uso único ou código enviado por e-mail seria, na avaliação dele, mais segura que senha. Se a exigência se confirmar, o projeto a cumpre; se não se confirmar, a decisão de mecanismo de autenticação fica aberta.

## Lacunas identificadas

**Front-end, UI e UX.** Ninguém no grupo tem essa especialidade, e a exigência levantada é específica: não basta fazer bonito, é preciso conhecer a dor real de quem opera uma clínica. Dado o peso do agendamento na adoção do produto, esta é a lacuna mais crítica do time hoje.

**Concentração da modelagem de dados.** A capacidade de desenhar e sustentar o banco está concentrada em uma pessoa, o que foi reconhecido na própria reunião como insustentável quando o trabalho engrenar.

## Ideias registradas sem decisão

- **Docker** para empacotamento e implantação — levantado aqui, decidido na reunião seguinte ([0003](../decisions/0003-docker-como-unidade-de-implantacao.md)).
- **Interpretação automática de mensagens de cancelamento** para liberar horário na agenda. Vale um alerta: isso encosta na fronteira de inteligência artificial dentro do fluxo operacional, e precisa ser avaliado sob o princípio de núcleo neutro do [`vision.md`](../vision.md) antes de entrar em escopo — mesmo não sendo decisão clínica.

## Sustentação do projeto

- O fundador declarou não haver finalidade lucrativa própria na criação do prontuário.
- Previsto um **canal de doação com conta bancária separada** do restante, com os recursos revertidos em infraestrutura e, quando necessário, contratação pontual de especialista em área deficitária.
- Financiamento coletivo foi cogitado para quando o projeto tiver algo demonstrável.
- Confirmada a obrigação copyleft já descrita em [`licensing.md`](../licensing.md): quem construir sobre o OpenClinic e distribuir precisa abrir seu código.

## Postura sobre certificação

Formulada com clareza e vale preservar: **o objetivo não é necessariamente obter os selos, é ter a capacidade de ser certificado.**

Um prontuário que atende aos requisitos técnicos de certificação pode sustentar tecnicamente sua seriedade quando questionado — e um projeto que se propõe a contestar o mercado estabelecido será questionado. Consistente com o que está em [`licensing.md`](../licensing.md) e [`compliance.md`](../compliance.md).

## Cadência

Reunião semanal, **quarta-feira às 9h (horário de Brasília)**. O horário foi escolhido considerando participantes em outros fusos.

Cogitou-se separar a reunião geral da reunião técnica em dias distintos; optou-se por manter uma só, para não ocupar duas manhãs de pessoas que participariam das duas.

## Encaminhamentos

| # | Encaminhamento | Situação |
| :--- | :--- | :--- |
| 1 | Estudo das normas listadas em [`compliance.md`](../compliance.md), distribuído entre o time técnico — cada pessoa aprofunda um tema e apresenta ao grupo | Parcialmente cumprido |
| 2 | Desenhar a arquitetura de banco contemplando soft delete, auditoria e proveniência | Em andamento — reaparece na [reunião de 19/08](./2026-08-19-stack-tecnico.md) |
| 3 | Criar os grupos de comunicação das duas frentes | Concluído |
| 4 | Abrir canal de doação e conta bancária separada | Pendente |
| 5 | Ampliar a equipe de dados, hoje concentrada em uma pessoa | Pendente |
| 6 | Procurar especialista em front-end, UI e UX que conheça o mercado de saúde | Pendente |
| 7 | Confirmar os dois requisitos marcados como "a verificar" acima contra suas fontes normativas | Pendente |
| 8 | Publicar o registro da reunião | Concluído neste commit |
