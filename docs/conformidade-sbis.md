# Conformidade com a certificação SBIS

Matriz de rastreabilidade entre os requisitos da certificação **SBIS S-RES v5.2** e o desenho da V1 do OpenClinic. É o destino das tags [`SBIS …`] usadas em [`modulos.md`](./modulos.md) e [`cadastros.md`](./cadastros.md).

## Estratégia de certificação

- **Categoria:** Clínica/Ambulatório.
- **Alvo:** Estágio 1 completo (ECF + NGS1) **mais o NGS2** — o nível de segurança com assinatura digital, obrigatório para emitir receita digital com validade plena.
- **Estágios 2 e 3:** evolução declarada, não meta da V1. Onde o desenho da V1 já cobre um requisito de estágio posterior, a matriz marca a antecipação.

> [!NOTE]
> **"Situação" descreve o desenho registrado em [`modulos.md`](./modulos.md) e [`cadastros.md`](./cadastros.md) — o software ainda não existe.** Esta matriz orienta o desenvolvimento; não é autodeclaração de conformidade nem certificação.

## Como ler a matriz

- **Estágio** é o da coluna *Clínica/Ambulatório* da Planilha de Requisitos oficial — o mesmo requisito pode ter estágio diferente em outra categoria.
- **Descrição** é **paráfrase própria do projeto**, em uma linha, para orientação interna. O texto oficial de cada requisito é **© SBIS** e não está transcrito aqui: consulte o Manual de Certificação S-RES v5.2 e a Planilha de Requisitos v5.2 em [sbis.org.br/documentos-e-manuais](https://sbis.org.br/documentos-e-manuais/); em qualquer divergência, vale o documento oficial.
- **Módulo** aponta o dono em [`modulos.md`](./modulos.md). `Plataforma` = obrigação técnica de qualquer implementação; `Documentação` = manuais do produto; `Processo` = obrigação do processo de certificação em si.
- **Situação:**
  - `V1` — contemplado no desenho da V1;
  - `V1 (antecipa E2)` / `V1 (antecipa E3)` — requisito de estágio posterior que o desenho já contempla por decisão de projeto;
  - `E2` / `E3` — fora da V1; entra quando o projeto mirar o estágio correspondente;
  - `N/A` — a condição do requisito não se aplica ao OpenClinic (o motivo está na descrição).
- O conjunto **RIS** (radiologia e diagnóstico por imagem) existe na planilha oficial, mas está fora do escopo do OpenClinic e não aparece aqui.

**Números:** 256 requisitos se aplicam à categoria Clínica/Ambulatório. Os 131 de Estágio 1 com condição aplicável estão todos contemplados no desenho da V1; 24 de estágios posteriores já vêm antecipados; 9 não se aplicam por condição; os 92 restantes ficam para os Estágios 2 e 3.

| Conjunto | Requisitos | E1 | E2 | E3 |
| :--- | ---: | ---: | ---: | ---: |
| ECF — funcionais | 133 | 56 | 41 | 36 |
| NGS1 — segurança | 88 | 62 | 15 | 11 |
| NGS2 — assinatura digital | 35 | 19 | 8 | 8 |
| **Total** | **256** | **137** | **64** | **55** |

## ECF — Requisitos funcionais

Os requisitos ECF.14 (apoio à decisão clínica) são todos de Estágio 2 ou 3 nesta categoria; a posição do projeto sobre eles está em [`modulos.md` → Questões abertas](./modulos.md#questões-abertas).

| ID | Título | Estágio | Descrição (paráfrase própria) | Módulo | Situação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| ECF.01.01 | Identificação do estabelecimento de saúde | E1 | Cadastro unívoco do estabelecimento onde o atendimento acontece, com tipo e responsável técnico | Organização | V1 |
| ECF.01.02 | Duplicidade de cadastros de estabelecimentos de saúde | E1 | Aviso e bloqueio de cadastro duplicado de estabelecimento | Organização | V1 |
| ECF.01.03 | Identificação dos setores da organização | E2 | Cadastro dos setores da organização (consultórios, salas) | Organização | V1 (antecipa E2) |
| ECF.02.01 | Identificação dos profissionais da organização | E1 | Cadastro de profissionais com dados civis completos: nome social, nome da mãe, sexo, raça/cor, nascimento | Pessoas | V1 |
| ECF.02.02 | Duplicidade de cadastros de profissionais | E1 | Aviso e bloqueio de cadastro duplicado de profissional | Pessoas | V1 |
| ECF.02.03 | Vínculo entre profissionais e setores | E2 | Indicação dos setores aos quais cada profissional está vinculado | Pessoas | E2 |
| ECF.03.01 | Dados demográficos do paciente | E1 | Cadastro demográfico aderente às regras do CNS, incluindo nome da mãe com "mãe desconhecida" estruturado | Pessoas | V1 |
| ECF.03.02 | Número de identificação do paciente no sistema | E1 | Número de prontuário gerado automaticamente para todo paciente | Pessoas | V1 |
| ECF.03.03 | Fotografia do paciente | E1 | Foto no cadastro e no cabeçalho do prontuário, substituível com histórico | Pessoas | V1 |
| ECF.03.04 | Parametrização de dados obrigatórios | E2 | Configurar quais campos do cadastro do paciente são obrigatórios | Pessoas | E2 |
| ECF.03.05 | Histórico de alterações de dados demográficos | E1 | Alteração de dados demográficos com histórico de quem mudou o quê e quando | Pessoas | V1 |
| ECF.03.07 | Verificação de duplicidade de cadastros de pacientes | E1 | Aviso e bloqueio de cadastro duplicado de paciente | Pessoas | V1 |
| ECF.03.08 | Verificação avançada de duplicidade de cadastros de pacientes | E3 | Busca de similaridade durante o cadastro para apontar possíveis duplicatas | Pessoas | E3 |
| ECF.03.09 | Pesquisa por potenciais prontuários duplicados | E3 | Pesquisa fonética dedicada a encontrar prontuários duplicados | Pessoas | E3 |
| ECF.03.10 | Unificação de cadastros duplicados de pacientes | E3 | Fusão de cadastros duplicados, unificando todos os registros | Pessoas | E3 |
| ECF.03.11 | Busca simples de pacientes | E1 | Busca de pacientes por nome, número de prontuário, CPF e nome da mãe | Pessoas | V1 |
| ECF.03.12 | Busca avançada de pacientes | E2 | Busca com critérios adicionais: sexo, faixa etária, setor | Pessoas | E2 |
| ECF.03.13 | Busca fonética de pacientes | E3 | Busca por nome tolerante a variações de grafia | Pessoas | E3 |
| ECF.03.14 | Dados da lista de pacientes para seleção de prontuários | E1 | Lista de resultados com os dados mínimos para escolher o paciente certo | Pessoas | V1 |
| ECF.03.15 | Usabilidade da lista de pacientes para seleção de prontuários | E2 | Linhas da lista de seleção visualmente distintas e destacáveis | Pessoas | E2 |
| ECF.03.17 | Cabeçalho de identificação do paciente | E1 | Cabeçalho fixo de identificação em todas as telas do prontuário | Prontuário | V1 |
| ECF.03.18 | Abertura de mais de um prontuário na mesma sessão de usuário | E1 | Com vários prontuários abertos, só o primeiro edita; os demais ficam sinalizados como somente leitura | Prontuário | V1 |
| ECF.04.01 | Cadastro de princípios ativos | E2 | Cadastro de princípios ativos com classes terapêuticas | Terminologias | V1 (antecipa E2) |
| ECF.04.02 | Cadastro de medicamentos | E2 | Cadastro de medicamentos com princípios ativos, forma, concentração e vias | Terminologias | V1 (antecipa E2) |
| ECF.04.04 | Distinção entre drogas com nomes semelhantes | E3 | Tall Man Lettering para distinguir nomes de drogas parecidos | Terminologias | E3 |
| ECF.04.06 | Cadastro de exames e procedimentos | E2 | Cadastro de exames e procedimentos com grupo, subgrupo e nome | Catálogo | V1 (antecipa E2) |
| ECF.05.01 | Parametrização de agendas de consultas | E2 | Agendas configuráveis por profissional e especialidade (dias e horários) | Agenda | V1 (antecipa E2) |
| ECF.05.02 | Bloqueios na agenda | E2 | Bloqueio de agendamento em dias específicos (feriados, fins de semana) | Agenda | V1 (antecipa E2) |
| ECF.05.03 | Agendamento de consultas por profissionais | E1 | Agendamento com data/hora, especialidade, profissional, duração e paciente | Agenda | V1 |
| ECF.05.04 | Especificação do tipo de consulta | E2 | Tipos de consulta parametrizáveis, indicados no agendamento | Agenda | V1 (antecipa E2) |
| ECF.06.01 | Registro de atendimento ao paciente | E1 | Atendimento como contato assistencial, com tipo, agregando os registros clínicos feitos nele | Prontuário | V1 |
| ECF.06.02 | Histórico de atendimentos | E1 | Linha do tempo dos atendimentos do paciente, com abertura e fechamento | Prontuário | V1 |
| ECF.06.03 | Lista de atendimentos | E2 | Lista dos atendimentos da organização com paciente, tipo e status | Prontuário | V1 (antecipa E2) |
| ECF.07.02 | Registro do contexto socioeconômico do paciente | E1 | Contexto socioeconômico: raça/cor, escolaridade, ocupação e afins | Prontuário | V1 |
| ECF.07.03 | Registro de imunização | E1 | Imunizações, inclusive as anteriores ao atendimento atual | Prontuário | V1 |
| ECF.07.04 | Registro de alergias e intolerâncias | E1 | Registro e lista de alergias e intolerâncias em campo próprio | Prontuário | V1 |
| ECF.07.05 | Registro estruturado de alergias e intolerâncias | E2 | Alergia estruturada: origem da informação, classificação e gravidade | Prontuário | V1 (antecipa E2) |
| ECF.07.06 | Indicação da ausência de alergias e intolerâncias | E2 | Registro explícito de "nega alergias", reversível se uma alergia surgir depois | Prontuário | V1 (antecipa E2) |
| ECF.07.07 | Registro de sinais vitais | E1 | Sinais vitais mínimos: PA, temperatura, FC, FR, saturação, glicemia, dor | Prontuário | V1 |
| ECF.07.08 | Registro de medidas antropométricas | E1 | Peso, altura e circunferências, com IMC e superfície corpórea calculados | Prontuário | V1 |
| ECF.07.10 | Apresentação tabular de séries temporais de sinais vitais e medidas antropométricas | E2 | Séries temporais de sinais vitais em tabela cronológica | Prontuário | E2 |
| ECF.07.11 | Apresentação gráfica de séries temporais de sinais vitais e medidas antropométricas | E3 | Séries temporais de sinais vitais em gráfico | Prontuário | E3 |
| ECF.07.12 | Dados da anamnese | E1 | Anamnese completa: queixa, história, antecedentes, exame físico, hipótese, plano | Prontuário | V1 |
| ECF.07.13 | Dados da anamnese conforme SOAP | E1 | Anamnese estruturada no modelo SOAP | Prontuário | V1 |
| ECF.07.14 | Registro de queixas utilizando CIAP2 | E1 | Queixas e motivos de consulta codificados com CIAP-2 | Prontuário | V1 |
| ECF.07.15 | Registro estruturado de diagnósticos | E1 | Diagnósticos estruturados (CID-10), marcados como suspeitos ou confirmados | Prontuário | V1 |
| ECF.07.17 | Registro de diagnósticos com base em mais de uma terminologia | E1 | Diagnóstico codificável por mais de uma terminologia (CID e CIAP) | Prontuário | V1 |
| ECF.07.18 | Estrutura da lista de problemas | E2 | Lista de problemas com agudo/crônico e estado ativo/inativo | Prontuário | E2 |
| ECF.07.19 | Diagnósticos na lista de problemas | E2 | Diagnósticos estruturados compondo a lista de problemas do paciente | Prontuário | V1 (antecipa E2) |
| ECF.07.20 | Inserção automática de alergias e intolerâncias na lista de problemas | E3 | Alergias entrando automaticamente na lista de problemas | Prontuário | E3 |
| ECF.07.21 | Lista personalizada de problemas | E3 | Lista de problemas própria da clínica, manual ou importada | Prontuário | E3 |
| ECF.07.22 | Evolução médica | E1 | Registro de evolução médica | Prontuário | V1 |
| ECF.07.23 | Texto padrão para evoluções médicas | E2 | Textos padrão nomeados como base para evoluções | Prontuário | V1 (antecipa E2) |
| ECF.07.24 | Registro de órteses e próteses | E1 | Registro de órteses e próteses do paciente | Prontuário | V1 |
| ECF.07.25 | Registro de atestado | E1 | Emissão de atestados | Prontuário | V1 |
| ECF.07.26 | Atestado baseado em modelos | E2 | Atestado por modelo, com paciente, instituição e profissional preenchidos automaticamente | Prontuário | V1 (antecipa E2) |
| ECF.07.27 | Solicitação de encaminhamentos | E1 | Encaminhamento com especialidade, motivo e profissional | Prontuário | V1 |
| ECF.07.30 | Aprovação de registros por preceptoria | E3 | Registros de estudantes validados pelo preceptor responsável | Prontuário | E3 |
| ECF.07.32 | Registro de óbito | E1 | Óbito com data, causa (CID) e número da declaração | Prontuário | V1 |
| ECF.07.35 | Criação de formulários personalizados | E3 | Formulários clínicos dinâmicos criados pela clínica | Prontuário | E3 |
| ECF.07.36 | Campos calculáveis em formulários personalizados | E3 | Campos calculados (escores) em formulários personalizados | Prontuário | E3 |
| ECF.07.38 | Anexos de documentos ao prontuário | E2 | Anexos ao prontuário (PDF, TIFF, JPG) com indicação do tipo de documento | Prontuário | V1 (antecipa E2) |
| ECF.07.52 | Registro de medicamentos em uso | E2 | Medicamentos em uso registrados a partir de lista de seleção | Prontuário | V1 (antecipa E2) |
| ECF.10.01 | Emissão de receita não estruturada | E1 | Receita em texto livre | Prontuário | V1 |
| ECF.10.02 | Texto padrão para receita | E1 | Textos padrão nomeados como base para receitas, editáveis ao usar | Prontuário | V1 |
| ECF.10.03 | Emissão de receita estruturada | E2 | Receita estruturada com busca de princípios ativos e medicamentos cadastrados | Prontuário | V1 (antecipa E2) |
| ECF.10.04 | Impressão de receita | E1 | Receita impressa com paciente, prescritor, conselho, CNES, endereço e telefone da instituição | Prontuário | V1 |
| ECF.10.07 | Usabilidade da lista de seleção de medicamentos | E2 | Linhas da lista de medicamentos visualmente distintas e destacáveis | Prontuário | E2 |
| ECF.10.10 | Medicamentos favoritos | E3 | Lista de medicamentos favoritos por profissional | Prontuário | E3 |
| ECF.10.19 | Solicitação de exames e procedimentos | E1 | Pedido de exames e procedimentos, minimamente em texto livre | Prontuário | V1 |
| ECF.10.20 | Solicitação estruturada de exames e procedimentos | E2 | Pedido estruturado a partir do catálogo de exames e procedimentos | Prontuário | V1 (antecipa E2) |
| ECF.10.21 | Usabilidade da lista de seleção de exames e procedimentos | E2 | Linhas da lista de exames visualmente distintas e destacáveis | Prontuário | E2 |
| ECF.13.01 | Consulta de exames e procedimentos solicitados | E2 | Consulta das solicitações com filtro por status (pendente, realizado) | Prontuário | E2 |
| ECF.13.02 | Entrada de resultados de exames não vinculados à uma solicitação no sistema | E1 | Registro de resultado de exame trazido pelo paciente, sem solicitação prévia no sistema | Prontuário | V1 |
| ECF.13.03 | Entrada de resultados de exames vinculados à uma solicitação no sistema | E2 | Resultado vinculado à solicitação, que muda automaticamente para "realizado" | Prontuário | E2 |
| ECF.14.01 | Restrição entre sexo e exames/procedimentos | E2 | Regras de restrição entre sexo e exame/procedimento | Prontuário | E2 |
| ECF.14.02 | Restrição entre sexo e diagnóstico | E2 | Regras de restrição entre sexo e diagnóstico | Prontuário | E2 |
| ECF.14.03 | Restrição entre faixa etária e exames/procedimentos | E3 | Regras de restrição entre faixa etária e exame/procedimento | Prontuário | E3 |
| ECF.14.04 | Parametrização de ação a ser tomada para alertas de alergia | E3 | Ação do alerta de alergia configurável: notificar, justificar ou impedir | Prontuário | E3 |
| ECF.14.05 | Alerta de alergia na prescrição eletrônica | E2 | Alerta de alergia na prescrição, verificado por princípio ativo | Prontuário | E2 |
| ECF.14.07 | Parametrização de regras para interação medicamentosa | E3 | Regras de interação medicamentosa criadas pela própria clínica | Prontuário | E3 |
| ECF.14.08 | Alerta de interação medicamentosa na prescrição eletrônica | E3 | Alerta de interação medicamentosa na prescrição | Prontuário | E3 |
| ECF.14.10 | Verificação de interação medicamentosa com medicamentos em uso pelo paciente | E3 | Interação verificada também contra os medicamentos em uso | Prontuário | E3 |
| ECF.14.12 | Alertas de duplicidade de medicamentos na prescrição eletrônica | E3 | Alerta de medicamento duplicado na mesma prescrição ou atendimento | Prontuário | E3 |
| ECF.14.13 | Alertas de duplicidade de solicitações de exames e procedimentos | E3 | Alerta de exame solicitado em duplicidade dentro de um período configurável | Prontuário | E3 |
| ECF.14.14 | Parametrização de restrições entre diagnósticos e medicamentos | E2 | Regras de restrição entre diagnóstico e princípio ativo | Prontuário | E2 |
| ECF.14.15 | Alerta de restrições entre diagnósticos e medicamentos na prescrição eletrônica | E2 | Alerta de conflito diagnóstico × medicamento na prescrição | Prontuário | E2 |
| ECF.14.17 | Parametrização de regras para dose máxima e mínima | E3 | Dose máxima e mínima parametrizáveis por princípio ativo | Prontuário | E3 |
| ECF.14.18 | Alerta de dose máxima e dose mínima na prescrição eletrônica | E3 | Alerta de dose fora dos limites, considerando idade, peso e superfície corpórea | Prontuário | E3 |
| ECF.14.19 | Parametrização de regras para dose máxima por período de tempo | E3 | Dose máxima por período parametrizável | Prontuário | E3 |
| ECF.14.20 | Alerta de dose máxima por período de tempo na prescrição eletrônica | E3 | Alerta de dose acumulada acima do limite do período | Prontuário | E3 |
| ECF.14.22 | Parametrização de regras de restrições entre medicamentos e faixa etária | E3 | Regras de restrição entre princípio ativo e faixa etária | Prontuário | E3 |
| ECF.14.23 | Alerta de restrições entre medicamentos e faixa etária na prescrição de medicamentos | E3 | Alerta de medicamento × faixa etária na prescrição | Prontuário | E3 |
| ECF.14.27 | Recomendações de uso de medicamentos em relação à dieta | E3 | Recomendações de uso em relação à dieta exibidas ao prescrever | Prontuário | E3 |
| ECF.14.28 | Restrição de vias de administração não recomendadas | E3 | Impedir via de administração não registrada no cadastro do medicamento | Prontuário | E3 |
| ECF.14.31 | Prescrição padrão/protocolo | E2 | Prescrições padrão nomeadas, com itens pré-definidos | Prontuário | E2 |
| ECF.14.32 | Limites de valores para sinais vitais e medidas antropométricas | E3 | Limites parametrizáveis para sinais vitais, com contexto clínico | Prontuário | E3 |
| ECF.14.35 | Acesso a bases de conhecimento clínico | E3 | Acesso a bases de conhecimento clínico para apoio à decisão | Prontuário | E3 |
| ECF.14.36 | Envio de lembretes | E3 | Regras de lembrete para acompanhamento de pacientes | Prontuário | E3 |
| ECF.14.37 | Visualização de lembretes aplicáveis ao paciente | E3 | Lembretes aplicáveis visíveis no prontuário do paciente | Prontuário | E3 |
| ECF.14.38 | Visualização dos pacientes aplicáveis a uma regra de lembrete | E3 | Lista dos pacientes alcançados por uma regra de lembrete | Prontuário | E3 |
| ECF.15.01 | Registro de notas vinculadas a um paciente | E2 | Notas do profissional vinculadas a um paciente, com resolver/inativar | Prontuário | E2 |
| ECF.15.02 | Registro de notas para o profissional | E3 | Notas do profissional sem vínculo com prontuário | Prontuário | E3 |
| ECF.15.03 | Envio de mensagens coletivas | E3 | Mensagens internas para grupos de profissionais | Prontuário | E3 |
| ECF.16.01 | Controle do status de registros em aberto | E1 | Documento em aberto: retomável pelo autor, sinalizado, com pendências visíveis ao entrar e avisos ao sair | Prontuário | V1 |
| ECF.16.02 | Registro em aberto | E3 | Salvar registro clínico sem liberá-lo (rascunho) | Prontuário | V1 (antecipa E3) |
| ECF.17.01 | Identificação do profissional responsável pelo episódio/evento | E1 | Todo registro identifica paciente, profissional responsável e instituição | Auditoria e Proveniência | V1 |
| ECF.17.02 | Registro de tempo do armazenamento do evento no S-RES | E1 | Data/hora de entrada gravada automaticamente em todo registro | Auditoria e Proveniência | V1 |
| ECF.17.03 | Registro de tempo da ocorrência do evento | E1 | Registro retroativo guarda a data/hora em que o fato ocorreu, além da de digitação | Prontuário | V1 |
| ECF.17.04 | Cronologia de eventos | E1 | Exibição e impressão em ordem cronológica pela data de ocorrência | Prontuário | V1 |
| ECF.17.05 | Validação de consistência cronológica | E1 | Validação entre datas dependentes (resultado nunca antes da solicitação) | Plataforma | V1 |
| ECF.17.06 | Padronização de unidades de medida | E1 | Unidades de medida padronizadas para dados quantificáveis | Plataforma | V1 |
| ECF.17.07 | Regras para unidades de medida | E1 | Unidade sempre exibida e gravada junto com o valor | Plataforma | V1 |
| ECF.17.08 | Uso de diferentes unidades de medida | E2 | Registro em unidades alternativas (kg/g, m/cm, mmHg/cmHg) | Plataforma | E2 |
| ECF.17.10 | Captura de códigos padronizados | E1 | Código gravado com sistema, versão, idioma, código e termo original | Terminologias | V1 |
| ECF.17.11 | Resolução de imagens para interpretação clínica | E1 | Opção de informar a resolução de imagens médicas exibidas | Prontuário | V1 |
| ECF.17.12 | Independência dos dados e do código do S-RES | E1 | Parâmetros, tabelas e terminologias em banco de dados, nunca em código-fonte | Terminologias | V1 |
| ECF.17.15 | Corretude funcional | E1 | Auditoria de certificação executa todas as funcionalidades sem defeitos | Processo | V1 |
| ECF.17.16 | Validação de dados estruturados | E1 | Validação de CPF, CNS, CNES e datas por formato e dígito verificador | Plataforma | V1 |
| ECF.17.17 | Compatibilidade retroativa | E1 | Compatibilidade com versão certificada anterior — não há versão anterior do OpenClinic | Processo | N/A |
| ECF.17.18 | Idioma do S-RES | E1 | Toda a interface em português do Brasil | Plataforma | V1 |
| ECF.17.19 | Mensagens do sistema | E1 | Mensagens ao usuário em linguagem não técnica, em português | Plataforma | V1 |
| ECF.18.01 | Modelos para consentimento livre e esclarecido | E2 | Modelos de TCLE com tipos e títulos | Catálogo | V1 (antecipa E2) |
| ECF.18.02 | Gerenciamento de termos de consentimento livre e esclarecido | E2 | Emissão de TCLE, anexo do termo assinado e status (autorizado, não autorizado, revogado) | Prontuário | V1 (antecipa E2) |
| ECF.18.04 | Impressão do prontuário do paciente | E1 | Prontuário impresso num único comando, com identificação e numeração em todas as páginas | Prontuário | V1 |
| ECF.18.05 | Recibo para impressão do prontuário do paciente | E1 | Recibo de entrega do prontuário, com solicitante e finalidade, parte do próprio prontuário | Prontuário | V1 |
| ECF.19.01 | Parametrização de agravos de notificação compulsória | E1 | Lista parametrizável de agravos de notificação compulsória, conforme a portaria vigente | Prontuário | V1 |
| ECF.19.02 | Relatório para notificação compulsória de agravos | E1 | Relatório dos agravos de notificação registrados num período | Prontuário | V1 |
| ECF.19.03 | Aviso sobre a necessidade de notificação | E2 | Status notificado/não notificado e aviso de pendências de notificação | Prontuário | E2 |
| ECF.19.04 | Mecanismo de busca de termos | E2 | Busca de termos em todos os campos de todos os prontuários | Prontuário | E2 |
| ECF.19.05 | Emissão de relatórios clínicos | E2 | Relatórios de pacientes por diagnóstico e por medicamento prescrito | Prontuário | E2 |
| ECF.19.06 | Emissão de relatórios e indicadores operacionais | E3 | Indicadores operacionais (volumes de atendimento e afins) | Prontuário | E3 |
| ECF.20.02 | Geração do Registro de Atendimento Clínico | E2 | Sumário do atendimento no modelo RAC, o formato do RNDS | Prontuário | E2 |

## NGS1 — Segurança nível 1

| ID | Título | Estágio | Descrição (paráfrase própria) | Módulo | Situação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| NGS1.01.01 | Versão do software | E1 | Tela com nome do software, fornecedor e identificação completa da versão | Plataforma | V1 |
| NGS1.02.01 | Método de autenticação de pessoa | E1 | Identificação e autenticação obrigatórias antes de qualquer acesso | Identidade e Acesso | V1 |
| NGS1.02.02 | Proteção dos parâmetros de autenticação de usuário | E1 | Senha armazenada como hash irreversível, nunca em claro | Identidade e Acesso | V1 |
| NGS1.02.03 | Qualidade da senha | E1 | Senha mínima de 8 caracteres, com letras e números | Identidade e Acesso | V1 |
| NGS1.02.04 | Impedimento de senhas com base em dados de identificação | E2 | Impedir senha derivada dos próprios dados do usuário (nome, nascimento…) | Identidade e Acesso | E2 |
| NGS1.02.05 | Parametrização da qualidade da senha | E3 | Regras de qualidade da senha parametrizáveis | Identidade e Acesso | E3 |
| NGS1.02.06 | Geração de senha para o usuário pelo administrador | E1 | Senha inicial criada pelo administrador, com troca obrigatória no primeiro acesso | Identidade e Acesso | V1 |
| NGS1.02.07 | Geração automática de senha para o usuário | E2 | Geração automática de senha pelo sistema | Identidade e Acesso | E2 |
| NGS1.02.08 | Troca de senha pelo próprio usuário | E1 | Troca de senha pelo próprio usuário, seguindo as regras de qualidade | Identidade e Acesso | V1 |
| NGS1.02.09 | Troca forçada de senha | E2 | Administrador força a troca de senha de um usuário | Identidade e Acesso | E2 |
| NGS1.02.10 | Periodicidade de troca de senhas | E2 | Expiração periódica de senha, configurável | Identidade e Acesso | E2 |
| NGS1.02.11 | Igualdade de senhas | E1 | Nova senha obrigatoriamente diferente da anterior | Identidade e Acesso | V1 |
| NGS1.02.12 | Obtenção de nova senha | E1 | Recuperação de senha na tela de login, pelo canal registrado no cadastro | Identidade e Acesso | V1 |
| NGS1.02.13 | Controle de tentativas de login | E1 | Bloqueio após um máximo configurável de tentativas (não mais que 10) | Identidade e Acesso | V1 |
| NGS1.02.14 | Autenticação para operações críticas | E3 | Nova autenticação exigida para operações críticas | Identidade e Acesso | E3 |
| NGS1.02.15 | Informações na autenticação | E2 | Exibir data/hora do último acesso após o login | Identidade e Acesso | E2 |
| NGS1.02.16 | Informações em autenticação inválida | E1 | Erro de login sem revelar qual dado está errado | Identidade e Acesso | V1 |
| NGS1.02.17 | Revelação de credenciais na interface de autenticação | E1 | Tela de login não exibe nem retém as credenciais digitadas | Identidade e Acesso | V1 |
| NGS1.02.18 | Autenticação de dois fatores | E3 | Segundo método de autenticação combinável (dois fatores) | Identidade e Acesso | E3 |
| NGS1.02.19 | Uso de SALT para a senha | E2 | SALT novo a cada senha codificada | Identidade e Acesso | V1 (antecipa E2) |
| NGS1.02.20 | Bloqueio ou encerramento por inatividade | E1 | Sessão bloqueada automaticamente por inatividade, com tempo configurável em banco | Identidade e Acesso | V1 |
| NGS1.02.21 | Bloqueio por inatividade | E2 | Bloqueio que preserva a tela e os dados não salvos | Identidade e Acesso | E2 |
| NGS1.02.22 | Aviso de bloqueio ou encerramento de sessão | E2 | Aviso prévio, com antecedência configurável, antes do bloqueio | Identidade e Acesso | E2 |
| NGS1.02.23 | Segurança contra roubo de sessão de usuário | E1 | Proteção contra roubo e reuso de sessão; credenciais nunca trafegam em claro | Plataforma | V1 |
| NGS1.03.01 | Impedir acesso por pessoas não autorizadas | E1 | Acesso somente a usuários autorizados, via permissões atribuídas a perfis | Identidade e Acesso | V1 |
| NGS1.03.03 | Gerenciamento de perfis | E1 | Gestão de perfis pela aplicação, com permissões específicas | Identidade e Acesso | V1 |
| NGS1.03.04 | Segregação de permissões por tipo de operação | E2 | Permissões do prontuário separadas por operação: consultar, incluir, alterar, excluir | Identidade e Acesso | E2 |
| NGS1.03.05 | Segregação de permissões por campo | E3 | Permissões por campo, com mascaramento de dados | Identidade e Acesso | E3 |
| NGS1.03.06 | Papéis relacionados à TI | E2 | Papéis de TI: administrador sem acesso a dado clínico real e operador de backup | Identidade e Acesso | V1 (antecipa E2) |
| NGS1.03.07 | Atribuição de mais de um perfil para um usuário | E1 | Mais de um perfil atribuível ao mesmo usuário | Identidade e Acesso | V1 |
| NGS1.03.08 | Gerenciamento de usuários | E1 | Gestão de usuários (cadastro, ativação, inativação) pela aplicação | Identidade e Acesso | V1 |
| NGS1.03.09 | Identidade única da pessoa e responsabilização | E1 | Identidade única por CPF; usuário que já operou o sistema nunca é removido | Identidade e Acesso | V1 |
| NGS1.03.10 | Usuário mínimo ativo | E1 | Sempre existe ao menos um administrador ativo | Identidade e Acesso | V1 |
| NGS1.03.11 | Restrição de autoconcessão de direitos | E1 | Ninguém altera as permissões do próprio usuário | Identidade e Acesso | V1 |
| NGS1.04.01 | Geração de cópia de segurança | E1 | Backup completo com dados, metadados e atributos de segurança | Plataforma | V1 |
| NGS1.04.02 | Restrição para geração e restauração de cópia de segurança | E2 | Backup restrito ao perfil de operador de cópias de segurança | Plataforma | E2 |
| NGS1.04.03 | Sigilo da cópia de segurança | E1 | Backup cifrado | Plataforma | V1 |
| NGS1.04.04 | Restauração de cópia de segurança | E1 | Restauração recupera dados e metadados sem intervenção manual | Plataforma | V1 |
| NGS1.04.05 | Integridade na restauração da cópia de segurança | E1 | Verificação de integridade na restauração, com alerta e reversão em caso de falha | Plataforma | V1 |
| NGS1.04.06 | Alerta de limiar de ocupação | E1 | Alerta aos administradores ao cruzar um limiar de ocupação do armazenamento | Plataforma | V1 |
| NGS1.05.01 | Segurança da comunicação com componente de interação com o usuário | E1 | Comunicação cliente–servidor com autenticação do servidor, integridade e sigilo | Plataforma | V1 |
| NGS1.05.02 | Processamento de dados no lado servidor | E1 | Todo processamento e toda validação acontecem no servidor | Plataforma | V1 |
| NGS1.05.03 | Segurança da comunicação entre componentes | E1 | Comunicação cifrada e mutuamente autenticada entre componentes internos | Plataforma | V1 |
| NGS1.05.04 | Integridade e origem de componentes dinâmicos | E1 | Verificação de componentes baixados para execução — a V1 é aplicação web, sem componentes baixáveis | Plataforma | N/A |
| NGS1.06.01 | Utilização de SGBD | E1 | Dados do prontuário exclusivamente em SGBD; anexos fora dele só com sigilo e nomes de arquivo opacos | Plataforma | V1 |
| NGS1.06.02 | Segurança de componentes que manipulam dados do RES | E3 | Arquivos temporários apagados após o uso | Plataforma | E3 |
| NGS1.06.03 | Validação de dados de entrada | E1 | Toda entrada validada contra injeção e estouro de buffer | Plataforma | V1 |
| NGS1.06.04 | Segregação dos dados por organização | E1 | Isolamento total dos dados entre organizações | Plataforma | V1 |
| NGS1.06.05 | Criptografia de documentos exportados | E2 | Criptografia de documentos exportados para mídia portátil | Plataforma | E2 |
| NGS1.07.01 | Auditoria contínua | E1 | Trilha de auditoria contínua, impossível de desativar | Auditoria e Proveniência | V1 |
| NGS1.07.02 | Proteção dos registros de auditoria | E1 | Trilha imutável, consultável apenas por auditor ou administrador | Auditoria e Proveniência | V1 |
| NGS1.07.03 | Eventos registrados na trilha de auditoria | E1 | Eventos mínimos na trilha: criação, consulta, inativação, impressão, exportação, login | Auditoria e Proveniência | V1 |
| NGS1.07.04 | Eventos avançados registrados na trilha de auditoria | E2 | Eventos adicionais na trilha: bloqueio de sessão, aceite de termo, preceptoria | Auditoria e Proveniência | E2 |
| NGS1.07.05 | Informações do registro de auditoria | E1 | Cada evento com identificador único, data/hora, tipo e autor | Auditoria e Proveniência | V1 |
| NGS1.07.06 | Privacidade do paciente na trilha de auditoria | E1 | Trilha sem dado clínico e sem identificação de paciente | Auditoria e Proveniência | V1 |
| NGS1.07.07 | Visualização dos registros da trilha de auditoria | E1 | Consulta da trilha em ordem cronológica, com filtros por data, evento e identificador | Auditoria e Proveniência | V1 |
| NGS1.07.08 | Exportação dos registros da trilha de auditoria | E3 | Exportação da trilha em formato aberto | Auditoria e Proveniência | E3 |
| NGS1.08.01 | Tópicos dos manuais | E1 | Manuais de uso, instalação e operação cobrindo todos os papéis | Documentação | V1 |
| NGS1.08.02 | Referência à versão do software na documentação | E1 | Manuais versionados e vinculados à versão do software | Documentação | V1 |
| NGS1.08.03 | Operações de backup | E1 | Manual explica o usuário de backup e a configuração do SGBD para exportação | Documentação | V1 |
| NGS1.08.04 | Restrição de acesso a entidades não autenticadas e autorizadas | E1 | Manual explica como impedir acesso não autenticado a todos os componentes | Documentação | V1 |
| NGS1.08.05 | Configuração da segurança da comunicação entre componentes | E1 | Manual orienta a configuração da comunicação segura entre componentes | Documentação | V1 |
| NGS1.08.06 | Sincronização de relógio | E1 | Manual exige relógios sincronizados e referenciados ao UTC | Documentação | V1 |
| NGS1.08.07 | Guarda da cópia de segurança | E1 | Manual manda guardar backup em local separado, com controle de acesso e sigilo | Documentação | V1 |
| NGS1.08.08 | Segregação dos componentes | E1 | Manual descreve a segregação lógica e física dos componentes | Documentação | V1 |
| NGS1.08.09 | Importação de dados de dispositivos externos de saúde | E1 | Procedimentos de importação de dispositivos de saúde — capacidade fora da V1 | Documentação | N/A |
| NGS1.08.10 | Idioma | E1 | Todos os manuais em português do Brasil | Documentação | V1 |
| NGS1.08.11 | Recomendações sobre configurações de segurança | E1 | Manuais trazem recomendações de configuração de segurança | Documentação | V1 |
| NGS1.08.12 | Histórico de alteração | E1 | Release notes com data, mudanças, responsável e impacto | Documentação | V1 |
| NGS1.09.01 | Fonte temporal | E1 | Hora de referência do servidor, contínua — nunca a da estação do usuário | Plataforma | V1 |
| NGS1.09.02 | Uniformidade da representação para exportação de tempo | E1 | Datas exportadas no formato RFC 3339 | Plataforma | V1 |
| NGS1.09.03 | Registro de tempo no banco de dados | E1 | Data/hora gravada com precisão completa e fuso horário (UTC) | Plataforma | V1 |
| NGS1.09.04 | Uniformidade da representação para entrada de tempo | E1 | Entrada de datas na ordem dia, mês, ano | Plataforma | V1 |
| NGS1.09.05 | Uniformidade da representação para exibição de tempo | E1 | Exibição de datas na ordem dia, mês, ano | Plataforma | V1 |
| NGS1.09.06 | Time zone e local da instituição de saúde | E1 | Fuso horário da instituição parametrizável, mesmo com servidor em outra localidade | Plataforma | V1 |
| NGS1.09.07 | Ajuste automático de horários | E1 | Alerta e ajuste de atividades agendadas afetadas por mudança de fuso (horário de verão) | Agenda | V1 |
| NGS1.11.01 | Concordância com termos de uso | E1 | Termo de uso e privacidade aceito no primeiro acesso e a cada mudança de conteúdo | Identidade e Acesso | V1 |
| NGS1.11.02 | Periodicidade da concordância com termos de uso | E3 | Periodicidade configurável de reapresentação do termo | Identidade e Acesso | E3 |
| NGS1.11.04 | Controle de acesso ao prontuário indicado pelo paciente | E2 | Restringir quais profissionais acessam um prontuário, a pedido do paciente | Prontuário | E2 |
| NGS1.11.05 | Consentimento do paciente para acesso a dados pessoais | E1 | Consentimentos do paciente com propósito de uso, termo anexado e status | Prontuário | V1 |
| NGS1.11.06 | Revogação de consentimentos do paciente para acesso a dados pessoais | E1 | Revogação de consentimento registrada com data, autor e estados anterior e novo | Prontuário | V1 |
| NGS1.11.07 | Acesso de emergência | E3 | Acesso de emergência a prontuário restrito, com justificativa e rastro | Prontuário | E3 |
| NGS1.11.08 | Contestação do paciente em relação às suas informações | E3 | Registro de contestação do paciente sobre a exatidão dos seus dados | Prontuário | E3 |
| NGS1.11.11 | Anonimização | E2 | Anonimização de pacientes em relatórios e na base | Plataforma | E2 |
| NGS1.11.12 | Pseudonimização | E3 | Pseudonimização de pacientes em relatórios e na base | Plataforma | E3 |
| NGS1.12.01 | Regras para correção de dados já finalizados | E1 | Correção de registro finalizado: apenas o autor, gerando nova versão rastreada | Prontuário | V1 |
| NGS1.12.02 | Correção de dados já finalizados | E3 | Nova versão criada a partir do conteúdo da versão atual | Prontuário | E3 |
| NGS1.12.03 | Inativação de registros clínicos já finalizados | E1 | Inativação com justificativa; o registro permanece visível como inativado | Prontuário | V1 |

## NGS2 — Segurança nível 2 (assinatura digital)

| ID | Título | Estágio | Descrição (paráfrase própria) | Módulo | Situação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| NGS2.01.01 | Certificado digital ICP-Brasil | E1 | Assinatura de documentos do prontuário com certificado ICP-Brasil | Prontuário | V1 |
| NGS2.01.02 | Validação do CPF do usuário | E1 | Certificado só é usável se o CPF dele for idêntico ao do usuário | Prontuário | V1 |
| NGS2.01.03 | Validação do certificado digital antes do uso | E1 | Validação do certificado e da cadeia (validade e revogação) a cada uso, no servidor | Prontuário | V1 |
| NGS2.01.04 | Configuração de certificados raiz do S-RES | E3 | Gestão dos certificados raiz de confiança, com acesso restrito | Plataforma | E3 |
| NGS2.01.05 | Compatibilidade com diferentes Autoridades Certificadoras | E1 | Pelo menos duas ACs distintas por tipo de mídia (cartão, token, A1, PSC) | Prontuário | V1 |
| NGS2.02.01 | Formato de assinatura | E1 | Assinaturas em CAdES, XAdES ou PAdES, no mínimo na política AD-RB | Prontuário | V1 |
| NGS2.02.02 | Verificação do propósito do certificado digital para assinatura | E1 | Verificação do propósito de assinatura (key usage) antes de assinar | Prontuário | V1 |
| NGS2.02.03 | Instante da assinatura | E1 | Instante da assinatura incluído no objeto assinado | Prontuário | V1 |
| NGS2.02.04 | Visualização das informações a serem assinadas | E1 | Visualização exata do que será assinado, sem elementos de interface | Prontuário | V1 |
| NGS2.02.05 | Pendência de assinatura | E2 | Pendência gerada quando o profissional não assina no ato do registro | Prontuário | V1 (antecipa E2) |
| NGS2.02.06 | Aviso de registro pendente de assinatura | E1 | Aviso ao sair com assinatura pendente e lista de pendências após o login | Prontuário | V1 |
| NGS2.02.07 | Indisponibilidade da chave privada | E3 | Assinatura institucional provisória quando a chave do profissional está indisponível | Prontuário | E3 |
| NGS2.02.08 | Indisponibilidade de acesso a serviços externos | E3 | Conduta definida quando OCSP, LCR ou carimbo de tempo estão fora do ar | Prontuário | E3 |
| NGS2.02.09 | Informações sobre assinatura | E1 | Status "assinado" visível, com quem assinou e quando | Prontuário | V1 |
| NGS2.02.10 | Encadeamento de registros assinados digitalmente | E3 | Encadeamento criptográfico que prova a ordem dos registros assinados | Prontuário | E3 |
| NGS2.02.11 | Verificação do encadeamento de registros | E3 | Verificação do encadeamento pelo usuário, a qualquer momento | Prontuário | E3 |
| NGS2.03.01 | Validação da assinatura digital | E1 | Assinatura validada na inclusão, na geração, na impressão e na importação | Prontuário | V1 |
| NGS2.03.02 | Referência temporal para verificação de revogação sem carimbo de tempo | E1 | Sem carimbo de tempo, a revogação é verificada pelo instante da assinatura | Prontuário | V1 |
| NGS2.03.03 | Referência temporal para verificação de revogação com carimbo de tempo | E2 | Com carimbo de tempo, a revogação é verificada pelo carimbo | Prontuário | E2 |
| NGS2.03.04 | Resultado da validação da assinatura digital | E1 | Estado da assinatura consultável: válida, inválida ou indeterminada | Prontuário | V1 |
| NGS2.04.01 | Política AD-RT para assinaturas digitais | E2 | Política AD-RT, com os objetos necessários à validação incluídos | Prontuário | E2 |
| NGS2.04.02 | Suporte ao Carimbo de Tempo homologado ICP-Brasil | E2 | Carimbo de tempo de autoridade homologada ICP-Brasil, incluído após a assinatura | Prontuário | E2 |
| NGS2.04.03 | Parametrização de uso de Carimbo de Tempo | E2 | Uso de carimbo de tempo ligável/desligável pela aplicação | Prontuário | E2 |
| NGS2.04.04 | Parametrização de uso de Carimbo de Tempo por tipo de documento | E3 | Carimbo de tempo configurável por tipo de documento | Prontuário | E3 |
| NGS2.04.05 | Verificação do carimbo de tempo | E3 | Verificação do certificado do próprio carimbo de tempo | Prontuário | E3 |
| NGS2.05.01 | Configuração das fontes de autoridade | E2 | Fontes de autoridade para certificados de atributo — recurso não suportado pelo OpenClinic | Prontuário | N/A |
| NGS2.05.02 | Tratamento de certificado de atributo | E2 | Tratamento de certificados de atributo — recurso não suportado pelo OpenClinic | Prontuário | N/A |
| NGS2.06.01 | Validação da assinatura de documentos importados | E1 | Validação de assinaturas em registros importados — a V1 não importa registros assinados | Prontuário | N/A |
| NGS2.06.02 | Adequação da assinatura de documentos importados | E3 | Alerta de não conformidade em assinaturas importadas — mesma condição acima | Prontuário | N/A |
| NGS2.06.03 | Exportação de registros assinados digitalmente | E1 | Documento assinado exportável e validável fora do sistema (Validador do ITI) | Prontuário | V1 |
| NGS2.06.04 | Exportação de documentos específicos assinados digitalmente | E2 | Receitas, pedidos, atestados e laudos exportados conforme a especificação SBIS (PAdES com QR Code) | Prontuário | V1 (antecipa E2) |
| NGS2.06.05 | Impressão de registros assinados digitalmente | E1 | Impressão de assinados com mensagem de rodapé ou relatório de assinaturas | Prontuário | V1 |
| NGS2.06.06 | Impressão de mensagem de rodapé | E1 | Rodapé padrão em cada página, com a assinatura validada no momento de imprimir | Prontuário | V1 |
| NGS2.06.07 | Impressão de relatório de assinaturas | E1 | Relatório de assinaturas para conjuntos de registros — a V1 adota a opção de rodapé | Prontuário | N/A |
| NGS2.07.01 | Certificado digital para autenticação | E1 | Login por certificado digital — a V1 autentica por senha; o certificado é usado para assinar | Identidade e Acesso | N/A |
