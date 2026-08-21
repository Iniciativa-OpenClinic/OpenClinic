# Dicionário de dados dos cadastros

> [!IMPORTANT]
> **Insumo para o desenho do esquema de banco — primeira versão.** Este documento lista os campos que o produto precisa, para que o time de banco de dados desenhe o esquema com o quadro completo. Ele evolui com o time, e a hierarquia é explícita: **quando o esquema e a API existirem, eles são a verdade** — este documento vira registro de intenção, não contrato.
>
> **O esquema nasce compatível com os estágios E2/E3 da certificação — por adição.** Os dados primários sobre os quais os requisitos de estágios futuros operam já estão neste dicionário; a evolução de estágio acrescenta tabelas e colunas, nunca redesenha as existentes. Onde um requisito futuro pede uma decisão de estrutura hoje, a observação do campo diz isso explicitamente.

## Convenções

- As regras de negócio de cada módulo estão em [`modulos.md`](./modulos.md); aqui ficam os campos. Uma informação vive num lugar só.
- **Toda entidade tem, implicitamente:** identificador interno, autor e data de criação e de alteração, exclusão lógica (soft delete) e proveniência. Esses campos não se repetem nas tabelas abaixo.
- Campos de código **referenciam o módulo Terminologias** — o tipo `código` indica o sistema entre parênteses. Nunca texto livre onde existe tabela oficial.
- **Obrigatório:** `Sim`, `Não`, `Condicional` (a condição está na observação) ou `Automático` (o sistema preenche, ninguém edita).
- Tipos usados: `texto`, `texto longo`, `data`, `data e hora`, `número`, `decimal`, `monetário`, `percentual`, `booleano`, `código (sistema)`, `referência (entidade)`, `lista de …`, `arquivo`, `estruturado` (subcampos descritos na observação).
- As tags [`SBIS …`](./conformidade-sbis.md) apontam o requisito de certificação que o campo atende — matriz completa em [`conformidade-sbis.md`](./conformidade-sbis.md).

---

## Paciente

Pertence à organização e é compartilhado entre as unidades. A ficha é **exclusivamente administrativa**: nenhum dado clínico aparece aqui — alergias, diagnósticos e medicações estão nas [estruturas clínicas do Prontuário](#estruturas-clínicas-do-prontuário), sob acesso clínico [`SBIS NGS1.03.06`](./conformidade-sbis.md).

### Identificação

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Número de prontuário | número | Automático | Sequencial, gerado no cadastro, imutável [`SBIS ECF.03.02`](./conformidade-sbis.md) |
| Nome civil | texto | Sim | |
| Nome social | texto | Não | Quando preenchido, é o nome exibido preferencialmente em telas e chamadas |
| Nome da mãe | texto | Sim | Com marcação estruturada "mãe desconhecida" para o caso legítimo [`SBIS ECF.03.01`](./conformidade-sbis.md) |
| CPF | texto | Não | Único na organização; duplicidade é bloqueada [`SBIS ECF.03.07`](./conformidade-sbis.md); dígito verificador validado [`SBIS ECF.17.16`](./conformidade-sbis.md). Não obrigatório: recém-nascidos e estrangeiros |
| CNS | texto | Não | Cartão Nacional de Saúde; dígito validado [`SBIS ECF.17.16`](./conformidade-sbis.md); identificador para o RNDS |
| Data de nascimento | data | Sim | |
| Sexo ao nascer | código (MS) | Sim | Masculino / Feminino / Indeterminado. Variável biológica usada por regras clínicas; distinta do registro civil, que pode ter sido retificado |
| Identidade de gênero | código (MS) | Não | Dado sensível (LGPD art. 11): valores do padrão do Ministério da Saúde, acesso controlado |
| Raça/cor | código (IBGE) | Não | Dado sensível; classificação IBGE |
| Foto | arquivo | Não | [`SBIS ECF.03.03`](./conformidade-sbis.md) |
| Data de óbito | data | Não | Administrativa. O registro clínico de óbito é do Prontuário |

### Contato

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Telefones | lista de estruturado | Não | Número + marcações: celular, WhatsApp |
| E-mail | texto | Não | |
| Endereço | estruturado | Não | CEP, logradouro, número, complemento, bairro, cidade, UF — o formato do FHIR [`Address`](https://hl7.org/fhir/R4/datatypes.html#Address) |
| Preferências e consentimentos de contato | estruturado | Não | Canal preferido + consentimentos **separados**: lembrete assistencial ≠ comunicação de marketing (LGPD trata diferente) |

### Perfil

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Apelido / como prefere ser chamado | texto | Não | |
| Profissão | texto | Não | Compõe o contexto socioeconômico usado pelo Prontuário [`SBIS ECF.07.02`](./conformidade-sbis.md) |
| Estado civil | código (MS) | Não | FHIR [`Patient.maritalStatus`](https://hl7.org/fhir/R4/patient-definitions.html#Patient.maritalStatus) nativo |
| Nacionalidade / naturalidade | estruturado | Não | |
| Documento de estrangeiro | texto | Não | Passaporte ou equivalente, para estrangeiro sem CPF |

### Vínculos e organização

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Vínculos com outros pacientes | lista de estruturado | Não | Paciente vinculado + tipo (cônjuge, filho(a), pai/mãe, outro) + marcação "é responsável legal" |
| Responsável legal externo | estruturado | Condicional | Quando o responsável não é paciente da clínica: nome, CPF, parentesco. Exigido para menor ou incapaz sem vínculo interno |
| Etiquetas | lista de referência (Etiqueta) | Não | Modelo de dados na V1; funcionalidade fora da V1 — ver [`modulos.md`](./modulos.md#pessoas) |
| Convênios | lista de estruturado | Não | Plano + número de carteirinha + validade (o vínculo paciente–plano do módulo Convênios e pagadores) |
| Origem | código (tabela da clínica) | Não | Tabela configurável: Instagram, Google, indicação… |
| Indicado por | referência (Paciente) | Não | O sistema registra a indicação; premiá-la é captação de clientela, vedada pela ética médica |
| Observações administrativas | texto longo | Não | Da recepção; jamais conteúdo clínico |
| Identificadores externos | lista de estruturado | Não | Pares sistema + identificador (FHIR [`identifier`](https://hl7.org/fhir/R4/datatypes.html#Identifier)); expostos na API |

### Etiqueta (cadastro da clínica)

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | Criação restrita a perfil de gestão |
| Cor | texto | Sim | |

---

## Profissional de saúde

Quem exerce ato profissional: tem conselho de classe e agenda. Alinhado ao paciente em nome social, sexo, nacionalidade e documento de estrangeiro [`SBIS ECF.02.01`](./conformidade-sbis.md). Anti-duplicidade por CPF e por conselho + número + UF.

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome civil | texto | Sim | |
| Nome social | texto | Não | |
| CPF | texto | Sim | Dígito validado [`SBIS ECF.17.16`](./conformidade-sbis.md); é o identificador do usuário do sistema [`SBIS NGS1.03.09`](./conformidade-sbis.md) e precisa coincidir com o CPF do certificado digital [`SBIS NGS2.01.02`](./conformidade-sbis.md) |
| Data de nascimento | data | Sim | |
| Sexo | código (MS) | Não | |
| Nacionalidade | estruturado | Não | |
| Documento de estrangeiro | texto | Não | |
| Foto | arquivo | Não | |
| Telefones | lista de estruturado | Não | |
| E-mail | texto | Sim | Canal de acesso e de recuperação de senha |
| Endereço | estruturado | Sim | Formato FHIR [`Address`](https://hl7.org/fhir/R4/datatypes.html#Address) |
| Conselho de classe | código (TISS — conselhos) | Sim | |
| Número no conselho | texto | Sim | |
| UF do conselho | código (UF) | Sim | |
| RQE | lista de estruturado | Não | Registro de Qualificação de Especialista: número + especialidade |
| CBO | código (CBO) | Não | Ocupação |
| CNS | texto | Não | Dígito validado; identificador para o RNDS |
| Método de assinatura digital | estruturado | Não | Nuvem (PSC): identificação no provedor. A1: arquivo + senha, cifrados no cofre de segredos. Regras de uso em [`modulos.md`](./modulos.md#prontuário) |
| Vínculos por unidade | lista de estruturado | Sim | Unidade + procedimentos habilitados. A disponibilidade de horários vive na Agenda, com vigência |
| Dados de pagamento do repasse | estruturado | Não | PIX ou conta bancária; alimenta o contas a pagar |
| Cor na agenda | texto | Não | |
| Identificadores externos | lista de estruturado | Não | Pares sistema + identificador |
| Usuário do sistema | referência (Usuário) | Condicional | Obrigatório para quem acessa o sistema; troca de senha no primeiro acesso [`SBIS NGS1.02.06`](./conformidade-sbis.md) |

---

## Funcionário

Quem opera o sistema sem exercer ato profissional: sem conselho de classe, sem agenda. Folha de pagamento e salário estão **fora do produto** — matrícula eSocial e NIS entram como identificadores externos, sem campo dedicado.

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | |
| CPF | texto | Condicional | Obrigatório para quem tem acesso ao sistema — é o identificador único de usuário [`SBIS NGS1.03.09`](./conformidade-sbis.md) |
| RG | texto | Não | |
| Foto | arquivo | Não | |
| Telefones | lista de estruturado | Não | |
| E-mail | texto | Condicional | Obrigatório para quem tem acesso — é o login e o canal de recuperação |
| Endereço | estruturado | Não | Formato FHIR [`Address`](https://hl7.org/fhir/R4/datatypes.html#Address) |
| Contato de emergência | estruturado | Não | Nome + telefone |
| Unidades | lista de referência (Unidade) | Sim | Onde trabalha |
| Função | texto | Não | Recepção, administrativo, gestão… |
| Tipo de vínculo | código (tabela da clínica) | Não | CLT, PJ, estágio, temporário |
| Data de contratação | data | Sim | |
| Data de desligamento | data | Não | Situação do vínculo — desligar não exclui nada |
| Identificadores externos | lista de estruturado | Não | Inclui matrícula eSocial e NIS, quando a clínica quiser |
| Usuário do sistema | referência (Usuário) | Condicional | Papéis e permissões por domínio via Identidade e Acesso; troca de senha no primeiro acesso |

---

## Procedimento

O catálogo do que a clínica oferece. O preço não mora aqui — mora na [tabela de preços](#tabela-de-preços) do pagador.

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | |
| Descrição | texto longo | Não | |
| Categoria | código (tabela da clínica) | Não | Consulta, procedimento, exame… |
| Código TUSS | código (TUSS 22) | Não | |
| Duração padrão | número | Sim | Minutos; alimenta o slot da Agenda |
| Profissionais habilitados | lista de referência (Profissional) | Não | |
| Salas compatíveis | lista de referência (Sala) | Não | A compatibilidade vem dos equipamentos da sala |
| Exige alocação de sala | booleano | Sim | Se sim, o agendamento só se completa com sala |
| Kits de consumo | lista de referência (Kit) | Não | Baixados automaticamente ao registrar a execução |
| Modelo de TCLE | referência (Modelo de TCLE) | Não | Termo de consentimento vinculado |
| Instruções de preparo | texto longo | Não | Jejum e afins; exposto na API para os parceiros de confirmação |
| Retorno previsto | número | Não | Dias; sugere o agendamento de retorno |
| Intervalo mínimo entre sessões | número | Não | Dias; orienta o agendamento de pacotes |
| Cor na agenda | texto | Não | |
| Ativo | booleano | Sim | Inativo some das telas de marcação, não do histórico |

---

## Sala

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | |
| Unidade | referência (Unidade) | Sim | |
| Tipo | código (tabela da clínica) | Não | Consultório, sala de procedimento… |
| Agendável | booleano | Sim | Se sim, vira recurso agendável na Agenda |
| Equipamentos e recursos | lista de texto | Não | Explica a compatibilidade com procedimentos |
| Observações | texto longo | Não | |

---

## Unidade de atendimento

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome fantasia | texto | Sim | |
| Razão social | texto | Não | |
| CNPJ | texto | Não | Dígito validado; anti-duplicidade [`SBIS ECF.17.16`](./conformidade-sbis.md) |
| CNES | texto | Não | Dígito validado; anti-duplicidade; sai impresso nas receitas [`SBIS ECF.10.04`](./conformidade-sbis.md) |
| Tipo de estabelecimento | código (CNES) | Não | [`SBIS ECF.01.01`](./conformidade-sbis.md) |
| Responsável técnico | referência (Profissional) | Não | [`SBIS ECF.01.01`](./conformidade-sbis.md) |
| Endereço | estruturado | Sim | Sai impresso nas receitas e atestados |
| Telefones | lista de estruturado | Não | Impressos nas receitas [`SBIS ECF.10.04`](./conformidade-sbis.md) |
| E-mail | texto | Não | |
| Identidade documental | estruturado | Não | Logo, cabeçalho e rodapé de receitas, atestados e orçamentos |
| Horários de funcionamento | estruturado | Não | |
| Feriados | lista de estruturado | Não | Data + descrição; bloqueiam a agenda da unidade |
| Fuso horário | código (IANA) | Sim | Multiunidade pode cruzar fusos [`SBIS NGS1.09.06`](./conformidade-sbis.md) |

---

## Operadora e plano

Fundação da fonte pagadora — a V1 cadastra, não fatura. O pagador **Particular** existe por padrão em toda instalação.

### Operadora

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | |
| Registro ANS | código (ANS — operadoras) | Não | Importável da lista oficial da ANS |
| CNPJ | texto | Não | Dígito validado |
| Contatos | estruturado | Não | Telefones, e-mail |

### Plano

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Operadora | referência (Operadora) | Sim | |
| Nome | texto | Sim | |
| Registro do produto na ANS | texto | Não | |

### Tabela de preços

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Pagador | referência (Particular ou Plano) | Sim | |
| Unidade | referência (Unidade) | Não | Ausente = vale para todas |
| Vigência | estruturado | Sim | Início e fim; preço novo abre período novo |
| Itens | lista de estruturado | Sim | Item (procedimento **ou** produto) + preço. Produto entra para os extras cobráveis do plano terapêutico |

---

## Produto

O que se compra e consome. **Não confundir com Medicamento** (referência clínica do que se prescreve — ver [Referência clínica de medicamentos](#referência-clínica-de-medicamentos)).

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | |
| Tipo de produto | código (tabela da clínica) | Sim | Medicamento, material, insumo de escritório… |
| Apresentação | texto | Não | Frasco 100U, caixa com 50… |
| Unidade de compra | texto | Sim | Frasco, caixa… |
| Unidade de consumo | texto | Sim | UI, ml, unidade… |
| Fator de conversão | decimal | Sim | Quantas unidades de consumo tem uma unidade de compra (frasco de 100U → 100) |
| Código TUSS | código (TUSS 19/20) | Não | Materiais (19) ou medicamentos (20) |
| Registro ANVISA | texto | Não | |
| EAN/GTIN | texto | Não | Código de barras |
| Códigos Brasíndice/SIMPRO | texto | Não | O campo existe; o dado é licenciado e não é distribuído — cada clínica importa o seu |
| Controla lote e validade | booleano | Sim | Se sim, toda entrada exige lote e validade |
| Condições de armazenamento | texto | Não | Ex.: refrigerado 2–8 °C |
| Estoque mínimo por unidade | lista de estruturado | Não | Unidade de atendimento + quantidade mínima; alimenta os alertas |
| Custo de referência | monetário | Não | |
| Fornecedor preferencial | referência (Fornecedor) | Não | |
| Código interno / SKU | texto | Não | |
| Ativo | booleano | Sim | |

---

## Kit

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | |
| Itens | lista de estruturado | Sim | Produto + quantidade, em unidade de consumo |
| Procedimentos associados | lista de referência (Procedimento) | Não | |

---

## Fornecedor

Referenciado pela entrada de compra do Estoque e pelo contas a pagar do Financeiro.

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Razão social / nome | texto | Sim | |
| CNPJ ou CPF | texto | Não | Dígito validado |
| Contatos | estruturado | Não | Telefones, e-mail |
| Endereço | estruturado | Não | |
| Categoria | código (tabela da clínica) | Não | Medicamentos, materiais, serviços… |
| Dados de pagamento | estruturado | Não | PIX ou conta bancária |
| Observações | texto longo | Não | |

---

## Financeiro — cadastros de apoio

### Forma de pagamento

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | |
| Tipo | código (fixo do sistema) | Sim | Dinheiro, Pix, débito, crédito, transferência, boleto |
| Permite parcelamento | booleano | Sim | |

### Bandeira de cartão

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | |
| Taxas por parcelamento | lista de estruturado | Sim | Número de parcelas + taxa % |

### Caixa

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | |
| Tipo | código (fixo do sistema) | Sim | Físico ou banco |
| Unidade | referência (Unidade) | Sim | |
| Dados bancários | estruturado | Condicional | Obrigatório quando o tipo é banco |

### Centro de custo

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | |
| Unidade | referência (Unidade) | Não | Ausente = global da organização |

### Regra de repasse

Edição pela aba Repasse do perfil do profissional; acesso restrito a gestão/financeiro — ver [`modulos.md`](./modulos.md#financeiro).

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Profissional | referência (Profissional) | Sim | |
| Procedimento | referência (Procedimento) | Não | Ausente = regra geral do profissional; presente = exceção, que vence a geral |
| Tipo | código (fixo do sistema) | Sim | Percentual ou valor fixo |
| Valor | percentual ou monetário | Sim | |
| Vigência | estruturado | Sim | Início e fim; mudar a regra abre período novo |

### Orçamento — campos além dos itens

O orçamento é registro operacional (itens com quantidade, procedimentos, pagador); estes são os campos de cadastro que o acompanham.

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Validade | número | Sim | Dias até expirar; alimenta o funil |
| Desconto | percentual ou monetário | Não | Limitado pela alçada do perfil de quem concede — permissão, não campo livre |
| Fonte pagadora | referência (Particular ou Plano) | Sim | Na V1, sempre Particular |
| Origem | código (fixo do sistema) | Sim | Recepção ou plano terapêutico; quando plano, referencia o [plano](#plano-terapêutico) que o gerou |
| Observações | texto longo | Não | |

---

## Agenda — estruturas

### Bloqueio

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Recurso | referência (Profissional ou Sala) | Sim | |
| Unidade | referência (Unidade) | Não | |
| Período | estruturado | Sim | Início e fim |
| Motivo | texto | Não | |
| Recorrência | estruturado | Não | Ex.: toda quarta à tarde |

### Agendamento

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Paciente | referência (Paciente) | Sim | |
| Procedimento | referência (Procedimento) | Sim | |
| Profissional | referência (Profissional) | Sim | |
| Unidade | referência (Unidade) | Sim | |
| Data e hora | data e hora | Sim | Duração herdada do procedimento, ajustável |
| Sala | referência (Sala) | Condicional | Obrigatória quando o procedimento exige alocação |
| Status | código (fixo do sistema) | Sim | Ciclo completo em [`modulos.md`](./modulos.md#agenda); mapeia 1:1 para FHIR [`Appointment.status`](https://hl7.org/fhir/R4/appointment-definitions.html#Appointment.status) |
| Encaixe | booleano | Sim | Marca agendamento fora das janelas de disponibilidade |
| Pacote / sessão | referência (Pacote) | Não | Quando o atendimento consome sessão |
| Fonte pagadora | referência (Particular ou Plano) | Sim | |
| Canal de origem | código (fixo + integrações) | Sim | Recepção, telefone, ou a integração de API que criou |
| Observações da recepção | texto longo | Não | |

---

## Movimentação de estoque

Uma entidade única com tipo; os campos condicionais dependem do tipo. Sempre em unidade de consumo, sempre por unidade de atendimento.

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Tipo | código (fixo do sistema) | Sim | Entrada por compra, saída manual, baixa por kit, ajuste de inventário, transferência entre unidades, perda/vencimento |
| Produto | referência (Produto) | Sim | |
| Quantidade | decimal | Sim | Em unidade de consumo |
| Unidade de atendimento | referência (Unidade) | Sim | Na transferência, a unidade de origem |
| Fornecedor | referência (Fornecedor) | Condicional | Entrada por compra |
| Lote | texto | Condicional | Entrada, quando o produto controla lote |
| Validade | data | Condicional | Entrada, quando o produto controla validade |
| Custo | monetário | Condicional | Entrada por compra |
| Motivo | texto | Condicional | Saída manual, ajuste, perda/vencimento |
| Unidade de destino | referência (Unidade) | Condicional | Transferência |
| Atendimento vinculado | referência (Atendimento) | Condicional | Baixa por kit — a proveniência da baixa automática |

---

## Referência clínica de medicamentos

Mantida pelo módulo Terminologias; é o que o Prontuário prescreve. Distinta do Produto de estoque.

### Princípio ativo

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Código DCB | código (DCB) | Sim | Importado da Denominação Comum Brasileira [`SBIS ECF.04.01`](./conformidade-sbis.md) |
| Nome | texto | Sim | |
| Vigência | estruturado | Sim | Acompanha a versão da tabela importada |

### Medicamento

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | [`SBIS ECF.04.02`](./conformidade-sbis.md) |
| Princípios ativos | lista de referência (Princípio ativo) | Sim | |
| Classe | código (tabela do sistema) | Não | |
| Forma farmacêutica | código (tabela do sistema) | Não | Comprimido, solução… |
| Concentração | texto | Não | |
| Vias de administração | lista de código | Não | |
| Controle especial | código (listas da Portaria 344) | Não | Define o receituário exigido |
| Ativo | booleano | Sim | |

---

## Estruturas clínicas do Prontuário

Visíveis **somente a perfil clínico** [`SBIS NGS1.03.06`](./conformidade-sbis.md). Não são cadastros da recepção — estão aqui porque o esquema de banco precisa delas. O ciclo de vida (aberto → finalizado → assinado) e as demais regras estão em [`modulos.md`](./modulos.md#prontuário).

### Alergia

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Princípio ativo | referência (Princípio ativo) | Condicional | Para alergia medicamentosa; alergias não medicamentosas usam descrição [`SBIS ECF.07.05`](./conformidade-sbis.md) |
| Descrição | texto | Condicional | Quando não há código aplicável |
| Reação | texto | Não | |
| Gravidade | código (fixo do sistema) | Não | |
| Situação | código (fixo do sistema) | Sim | Ativa, resolvida, refutada |

O paciente sem alergias conhecidas tem o registro explícito **"nega alergias"** — ausência de registro significa "não perguntado", nunca "não tem" [`SBIS ECF.07.06`](./conformidade-sbis.md).

### Diagnóstico

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Código | código (CID-10) | Sim | O modelo aceita mais de uma terminologia [`SBIS ECF.07.17`](./conformidade-sbis.md) |
| Estado | código (fixo do sistema) | Sim | Suspeito ou confirmado [`SBIS ECF.07.15`](./conformidade-sbis.md) |
| Papel | código (fixo do sistema) | Não | Principal ou secundário |
| Situação | código (fixo do sistema) | Sim | Ativo ou inativo |

### Item de receita

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Medicamento | referência (Medicamento) | Sim | Da referência clínica [`SBIS ECF.10.03`](./conformidade-sbis.md) |
| Dose | texto | Sim | |
| Frequência | texto | Sim | |
| Via de administração | código | Sim | |
| Duração | texto | Condicional | Dispensada quando uso contínuo |
| Uso contínuo | booleano | Sim | |
| Data de início | data | Não | |
| Observações | texto longo | Não | |

### Demais registros estruturados

| Registro | Conteúdo mínimo | Observação |
| :--- | :--- | :--- |
| Sinais vitais | Tipo de medida + valor + unidade + data/hora | [`SBIS ECF.07.07`](./conformidade-sbis.md) |
| Peso e altura | Valor + unidade explícita | [`SBIS ECF.07.08`](./conformidade-sbis.md) |
| Medicação em uso | Derivada do campo estruturado da anamnese/evolução | Lista viva; sem cadastro paralelo [`SBIS ECF.07.52`](./conformidade-sbis.md) |
| Imunização | Vacina + dose + data | [`SBIS ECF.07.03`](./conformidade-sbis.md) |
| Resultado de exame trazido | Exame + resultado + data + origem + solicitação vinculada (opcional) | Entrada manual de laudo externo [`SBIS ECF.13.02`](./conformidade-sbis.md); o vínculo com a solicitação prepara o fluxo automático de status do Estágio 2 [`SBIS ECF.13.03`](./conformidade-sbis.md) |
| Órteses e próteses | Descrição + data | [`SBIS ECF.07.24`](./conformidade-sbis.md) |
| Contexto socioeconômico | Ocupação e condições relevantes | Referencia a profissão do cadastro [`SBIS ECF.07.02`](./conformidade-sbis.md) |
| Queixa | Descrição + código CIAP-2 | [`SBIS ECF.07.14`](./conformidade-sbis.md) |
| Registro clínico de óbito | Data, causa (CID-10), profissional | Reflete a data administrativa do cadastro [`SBIS ECF.07.32`](./conformidade-sbis.md) |
| Agravo de notificação compulsória | Agravo (da lista parametrizada) + atendimento | Alimenta o relatório de notificação [`SBIS ECF.19.01`](./conformidade-sbis.md) |

---

## Plano terapêutico

Documento clínico do Prontuário: o profissional prescreve procedimentos com cronograma, assina, e o sistema gera o orçamento correspondente. **Sem preço aqui** — preço e desconto vivem no orçamento. As regras (geração do orçamento, fila de marcação, nova versão, acerto financeiro manual) estão em [`modulos.md`](./modulos.md#prontuário).

### Plano

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Atendimento de origem | referência (Atendimento) | Sim | Todo documento clínico nasce num Atendimento |
| Profissional autor | referência (Profissional) | Sim | Quem assina; correções geram nova versão, só pelo autor |
| Itens | lista de estruturado | Sim | Ver [Item do plano](#item-do-plano) |
| Observações clínicas | texto longo | Não | Orientações à equipe; saem na impressão |
| Situação | código (fixo do sistema) | Sim | Derivada dos fatos, nunca editada à mão: proposto, contratado, em andamento, concluído, não contratado, substituído, interrompido |
| Orçamento gerado | referência (Orçamento) | Sim | Criado pelo sistema na finalização do plano |

### Item do plano

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Procedimento | referência (Procedimento) | Sim | Do Catálogo |
| Número de sessões | número | Sim | |
| Início | número + unidade (dias ou semanas) | Sim | Daqui a quanto tempo vem a primeira sessão; âncora padrão = aprovação do orçamento |
| Intervalo entre sessões | número + unidade (dias ou semanas) | Condicional | Obrigatório com mais de uma sessão; pré-preenchido pelo intervalo mínimo do procedimento |

### Sessão planejada

Geradas pelo sistema a partir dos itens. São a fila "a marcar" da Agenda; consomem o mesmo saldo do pacote — o pacote diz quantas restam, a fila diz quando cada uma deve acontecer.

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Item do plano | referência (Item do plano) | Sim | |
| Número da sessão | número | Sim | 1..n dentro do item |
| Data-alvo | data | Sim | Calculada (início + intervalos); a data marcada pode divergir — remarcar não altera o plano |
| Produtos extras | lista de estruturado | Não | Produto + quantidade (em unidade de consumo) + marcação **"cobrar à parte"**. Cobrável vira item do orçamento; na sessão realizada, a baixa soma os extras ao kit |
| Situação | código (fixo do sistema) | Sim | A marcar, marcada, realizada, cancelada |
| Agendamento | referência (Agendamento) | Condicional | Preenchido quando a sessão é marcada |

### Modelo de plano (protocolo)

| Campo | Tipo | Obrigatório | Observação |
| :--- | :--- | :--- | :--- |
| Nome | texto | Sim | |
| Dono | referência (Organização ou Profissional) | Sim | Protocolos da clínica e protocolos pessoais do profissional |
| Itens e extras | estrutura do plano | Sim | Os mesmos campos do plano, sem paciente |
| Ativo | booleano | Sim | |
