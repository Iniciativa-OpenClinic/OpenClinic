# Mapa regulatório

*Revisado em: 2026-08-11 · v0.1*

## Antes de tudo, dois avisos que valem mais que o resto do documento

**Este documento não é parecer jurídico.** É um levantamento inicial, feito por pesquisa, para orientar as decisões de arquitetura do projeto e ajudar clínicas e desenvolvedores a entenderem o terreno regulatório. Antes de qualquer decisão com peso legal ou comercial real, busque um advogado especializado em direito digital/saúde.

**Usar o OpenClinic não torna uma clínica conforme à LGPD (nem a nenhuma outra norma).** A clínica que usa o sistema continua sendo a responsável legal pelos dados dos seus pacientes. O que o OpenClinic pode fazer é oferecer os recursos técnicos (trilha de auditoria, controle de acesso, portabilidade, criptografia etc.) que ajudam essa clínica a cumprir suas próprias obrigações — a conformidade em si depende de como a clínica usa o sistema, seus processos internos e suas próprias políticas.

Por isso, cada seção abaixo separa **quem é o obrigado por lei** de **o que o OpenClinic deve suportar tecnicamente** para ajudar esse obrigado a cumprir a norma.

## Premissa central

**Não existe, no Brasil, um único órgão que "certifique" prontuários eletrônicos de forma obrigatória.** O que existe é um conjunto de normas de fontes diferentes (proteção de dados, vigilância sanitária, conselhos profissionais, saúde suplementar) mais uma certificação técnica **voluntária**. Este documento organiza esse conjunto.

## Resumo

| Regime | Obrigatório para um EHR básico? | Quem é o obrigado |
|---|---|---|
| LGPD | Sim, sempre | A clínica (controladora); o software deve suportar |
| Certificação SBIS (S-RES) | Não — voluntária | Quem opta por buscar o selo |
| ANVISA (SaMD) | Não, se o núcleo só armazena/organiza dados | Só se o software ganhar finalidade médica autônoma |
| RNDS / HL7 FHIR | Parcial, crescente por tipo de evento | A clínica, quando o evento for regulamentado |
| TISS / ANS | Só se a clínica atender convênios | A clínica e a operadora |
| ISO 27001 / 13485 / 27701 | Não — voluntárias | Quem opta por buscar a certificação |

## LGPD (Lei nº 13.709/2018) e ANPD

**Quem é o obrigado**: a clínica que trata os dados dos pacientes é a **controladora**, nos termos da lei. O OpenClinic, como fornecedor do software, não responde pela conformidade da clínica — mas deve ser desenhado para tornar essa conformidade possível e simples.

Dado de saúde é **dado pessoal sensível** (art. 5º, II), porque seu uso indevido pode gerar discriminação. A base legal típica para uma clínica tratar dados de saúde no atendimento, sem precisar de consentimento a cada procedimento, é o **art. 11, II, "f"**: tratamento indispensável à tutela da saúde, em procedimento realizado por profissional ou serviço de saúde.

**O que a LGPD diz sobre compartilhar dados de saúde entre sistemas** — central para um projeto construído em torno de uma API aberta: o **art. 11, §4º** proíbe a comunicação ou uso compartilhado de dados de saúde entre controladores com o objetivo de obter vantagem econômica, **exceto** para prestação de serviços de saúde, assistência farmacêutica, assistência à saúde, portabilidade de dados a pedido do titular, ou transações financeiras/administrativas decorrentes do uso de serviços de saúde. Isso significa que a API do OpenClinic — e os futuros webhooks — precisam ser desenhados para que o compartilhamento de dados aconteça sob controle e a pedido do titular ou da própria prestação do serviço de saúde, não como uma "torneira aberta" de dados entre sistemas. O art. 18 garante ao paciente o direito à portabilidade de seus dados a outro fornecedor, sem custo.

**Encarregado (DPO)**: o art. 41 exige que todo controlador indique um encarregado. A Resolução CD/ANPD nº 2/2022 dispensa dessa obrigação agentes de tratamento de pequeno porte, sob determinadas condições (que não foram aprofundadas neste levantamento — consulte a resolução ou um advogado antes de assumir a dispensa).

**Medidas de segurança (art. 46)**: todo agente de tratamento deve adotar medidas técnicas e administrativas de proteção de dados desde a concepção do produto ("privacy by design") até sua execução.

**Notificação de incidentes (Resolução CD/ANPD nº 15/2024)**: quando um incidente de segurança envolver risco ou dano relevante aos titulares, o controlador deve comunicar **tanto a ANPD quanto os titulares afetados**, em até **3 dias úteis** a partir do momento em que toma conhecimento — com prazo em **dobro para agentes de tratamento de pequeno porte** (relevante para o público-alvo inicial do OpenClinic: consultórios e clínicas pequenas). Se a extensão do incidente ainda não estiver apurada, cabe comunicação preliminar dentro do prazo, complementada em até 20 dias úteis. Todo incidente — comunicado ou não — deve ficar registrado por no mínimo 5 anos.

**Certificação/selo**: a própria ANPD já esclareceu publicamente que **não credencia nem reconhece nenhuma entidade para emitir selos de conformidade com a LGPD**. Não existe "certificação LGPD" oficial — é um regime de conformidade contínua e autodeclarada, fiscalizado a posteriori pela autoridade.

**Norma específica para dados de saúde**: "dados pessoais sensíveis — dados de saúde" consta como tema prioritário da Agenda Regulatória da ANPD para 2025–2026, mas **ainda está em elaboração** — não há norma técnica específica vigente até a data deste documento.

**O que o OpenClinic deve suportar (requisitos, não implementação)**: trilha de auditoria de quem acessou o quê; controle de acesso por perfil; mecanismo de portabilidade/exportação completa dos dados do paciente; suporte a registro estruturado de incidentes; base técnica para que a clínica cumpra os prazos de notificação. Também vale registrar, para decisão futura da clínica com apoio jurídico próprio: se houver tratamento de alto risco, pode ser recomendável um Relatório de Impacto à Proteção de Dados Pessoais (RIPD); se os dados forem hospedados fora do Brasil, aplicam-se as regras de transferência internacional da LGPD (arts. 33–36).

## Certificação de S-RES da SBIS (antes "SBIS-CFM")

A certificação de **Sistemas de Registro Eletrônico em Saúde (S-RES)** é mantida pela **SBIS (Sociedade Brasileira de Informática em Saúde)**. Até 2018 havia um convênio formal com o CFM para essa certificação — daí o nome histórico "SBIS-CFM", ainda comum no mercado. A **Resolução CFM nº 2.218/2018** revogou o artigo da Resolução CFM nº 1.821/2007 que prescrevia esse selo conjunto, porque **o convênio entre as duas entidades terminou** — isso não foi uma decisão de que a certificação passou a ser dispensável, apenas o fim da parceria formal. Hoje a certificação é conduzida pela SBIS.

Os artigos da Resolução CFM nº 1.821/2007 que tratam da guarda de prontuários **continuam vigentes**: guarda permanente para prontuário mantido eletronicamente; guarda mínima de 20 anos, a partir do último registro, para prontuário mantido apenas em papel. A Lei federal nº 13.787/2018 trouxe essas regras para nível de lei, permitindo eliminar o papel original desde que o arquivo digitalizado seja assinado digitalmente com certificado ICP-Brasil **ou outro padrão legalmente aceito**, com a mesma guarda mínima de 20 anos.

**A certificação SBIS é voluntária.** Não é exigida por lei para operar um prontuário eletrônico. Ela é, no entanto, o padrão técnico de referência reconhecido pelo mercado e pelos conselhos profissionais para demonstrar que um sistema atende aos requisitos de segurança esperados.

Dois níveis de garantia de segurança:
- **NGS1** (básico): múltiplos perfis de usuário com controle de acesso, autenticação, bloqueio de sessão por inatividade, trilha de auditoria imutável, disponibilidade, backup, documentação. Um sistema NGS1 ainda depende de impressão em papel para validade jurídica plena.
- **NGS2**: tudo do NGS1, **mais assinatura digital com certificado ICP-Brasil** para os processos de assinatura e autenticação. É o nível que permite eliminar totalmente o papel, com validade jurídica plena.

O certificado tem validade de 2 anos. O custo varia por faixa de faturamento da empresa solicitante — os valores exatos não foram confirmados neste levantamento.

**Posição do OpenClinic**: a Iniciativa pretende buscar a certificação de S-RES da SBIS para a **distribuição oficial** do projeto quando houver um produto maduro o suficiente para ser auditado. A certificação vale para a versão específica auditada — forks modificados por terceiros não a herdam automaticamente (ver [`LICENSING.md`](./LICENSING.md)).

## ANVISA — Software como Dispositivo Médico (SaMD)

A base regulatória atual é a **RDC nº 751/2022** (que revogou a antiga RDC nº 185/2001), complementada pela **RDC nº 657/2022**, específica para regularização de software como dispositivo médico.

Um software se torna **SaMD** (sujeito a notificação/registro na ANVISA conforme sua classe de risco) quando tem **finalidade médica** — destinado a diagnóstico, prevenção, monitoramento ou tratamento de doenças, ou a apoiar decisão clínica. O próprio material de Perguntas e Respostas da ANVISA sobre a RDC 657/2022 esclarece que um software que apenas registra dados em prontuário, para verificação posterior por um profissional de saúde, **não** se enquadra como SaMD.

**Posição do OpenClinic — núcleo deliberadamente neutro**: o núcleo do projeto é desenhado para **armazenar, organizar e expor dados via API**, sem nenhuma finalidade médica autônoma. Concretamente, o núcleo **não terá**:
- alertas clínicos automatizados;
- escores ou cálculos de risco clínico;
- checagem automatizada de interação medicamentosa;
- calculadoras clínicas;
- qualquer função de diagnóstico, prevenção, monitoramento ou tratamento operando de forma automatizada.

Essa é uma decisão de posicionamento, não uma limitação técnica: mantém o projeto fora do enquadramento de dispositivo médico da ANVISA. Terceiros podem construir esse tipo de funcionalidade por cima da API aberta do OpenClinic — por conta e risco próprios, e sujeitos às normas aplicáveis a esse tipo de funcionalidade (incluindo, potencialmente, a própria ANVISA e a Resolução CFM nº 2.454/2026, abaixo).

## RNDS (Rede Nacional de Dados em Saúde) e HL7 FHIR

A RNDS é a plataforma federal de interoperabilidade em saúde, mantida pelo Ministério da Saúde, e recebe dados de estabelecimentos públicos e privados. O **HL7 FHIR é o padrão técnico obrigatório** para qualquer sistema que envie ou receba dados da RNDS.

Não existe uma norma única que obrigue todo prontuário eletrônico privado a se conectar à RNDS. O que existe é um conjunto crescente de obrigações específicas por tipo de evento clínico — por exemplo, registros de vacinação e determinados resultados de exames laboratoriais. A tendência regulatória é de expansão progressiva dessas obrigações.

**Posição do OpenClinic**: **HL7 FHIR é declarado como o padrão de referência pretendido** para a API aberta do projeto — alinhado tanto à RNDS quanto ao padrão internacional de interoperabilidade em saúde. A implementação concreta será definida com a comunidade técnica.

## TISS / ANS

O padrão **TISS (Troca de Informação em Saúde Suplementar)**, hoje consolidado pela **Resolução Normativa ANS nº 501/2022**, é obrigatório para operadoras de planos de saúde e para os prestadores (clínicas, hospitais, laboratórios) que atendem beneficiários desses planos — cobrindo solicitação de guias, autorização prévia e faturamento.

**Relevância**: só se aplica a clínicas que atendem convênios, e afeta a camada de faturamento/administrativa do sistema — não os dados clínicos do prontuário em si.

## Outras normas relevantes

- **Lei federal nº 13.787/2018** — digitalização e eliminação do papel do prontuário, guarda mínima de 20 anos.
- **Resolução CFM nº 2.299/2021** — regulamenta a emissão de documentos médicos eletrônicos.
- **Resolução CFM nº 2.314/2022** e **Lei federal nº 14.510/2022** — telemedicina e telessaúde; exigem registro no mesmo sistema de prontuário do atendimento presencial.
- **Resolução CFM nº 2.381/2024** — atualiza as regras de emissão de documentos médicos eletrônicos.
- **Resolução COFEN nº 754/2024** — normatiza prontuário eletrônico no contexto da Enfermagem, exigindo assinatura digital ICP-Brasil (ou, em condições específicas, login/senha individual).
- **Resolução CFM nº 2.454/2026** — normatiza o uso de Inteligência Artificial na medicina, com vigência a partir de **26/08/2026**. Exige que o uso de IA como apoio à decisão médica seja registrado no prontuário, que o médico permaneça responsável final e que o paciente tenha direito de saber e de recusar o uso de IA. Não afeta o núcleo do OpenClinic (deliberadamente sem IA/apoio à decisão), mas é diretamente relevante para qualquer integração de terceiros que use a API do OpenClinic para oferecer recursos de IA.
- **ISO 27001, 13485, 27701** — certificações internacionais voluntárias de segurança da informação e qualidade para dispositivos médicos. Não exigidas por lei brasileira; buscadas por diferencial competitivo ou para parcerias/investidores internacionais.

Não foi localizada, neste levantamento, uma resolução do Conselho Federal de Odontologia (CFO) equivalente às do CFM sobre prontuário eletrônico — se isso for relevante a uma futura expansão odontológica do projeto, recomenda-se verificação direta junto ao CFO.

## Limitações deste levantamento

- Feito por pesquisa (não há acesso a advogado nesta etapa) — trate como ponto de partida, não como fonte definitiva.
- Valores e prazo médio do processo de certificação da SBIS não foram confirmados.
- Detalhes das condições de dispensa do encarregado (Resolução CD/ANPD nº 2/2022) não foram aprofundados.
- Normas municipais/estaduais de vigilância sanitária, quando aplicáveis, não foram cobertas.
- Este documento será revisado conforme o projeto evolui e conforme normas em elaboração (como a norma da ANPD específica para dados de saúde) forem publicadas.
