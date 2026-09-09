# Fase 0 — Identidade, Sessões e Autorização

Data: 2026-09-09. Escopo: implementação local OpenClinic.

**Status: especificação entregue; controles a implementar nas fases seguintes.** D01–D03 são premissas locais recomendadas, revisáveis pelo mantenedor. Não representam aprovação individual dessas escolhas nem decisão da comunidade. Este documento especifica o comportamento-alvo; não descreve garantias já implementadas.

## 1. Escopo e autoridade

Esta fase fixa contratos, limites e critérios de aceite. Não altera backend, frontend, banco, implantação ou contrato OpenAPI publicado. Para o planejamento local, esta especificação prevalece sobre descrições conflitantes de sessão, isolamento e autoridade nos guias anteriores. As decisões comunitárias aceitas permanecem a referência do projeto público; divergências exigem seu processo de governança.

Referências públicas consultadas na análise de 2026-09-05, sem nova verificação do upstream nesta entrega:

- [Módulos propostos](https://github.com/Iniciativa-OpenClinic/OpenClinic/blob/main/docs/modulos.md).
- [Decisão pública 0001 — FHIR](https://github.com/Iniciativa-OpenClinic/OpenClinic/blob/main/docs/decisions/0001-fhir-como-padrao-de-dados.md).
- [Decisão pública 0008 — Contrato com o código](https://github.com/Iniciativa-OpenClinic/OpenClinic/blob/main/docs/decisions/0008-contrato-antes-ou-depois-do-codigo.md).
- [ADR local 0003 — Segurança](./adr/0003-authentication-and-security-invariants.md).

A decisão pública 0001 sobre FHIR não é o ADR local 0001 sobre registro de decisões.

## 2. Revalidação dos achados

Base local: commit `95ad433779b3d9054542acb70c4207f9ba0f5f68`. Revisão estática em 2026-09-09; as sondagens da análise anterior não foram reexecutadas nesta fase.

| Achado | Estado observado | Destino |
| :--- | :--- | :--- |
| Logout | A rota continua chamando o caso de uso apenas quando há cookie. | Fase 1 |
| Refresh | Leitura, revogação e criação separadas; commit/rollback da UoW vazios. | Fase 1 |
| Revogação | Guard JWT não verifica sessão nem estado atual da identidade. | Fase 1 |
| Enumeração | Login sem usuário evita a verificação Argon2. | Fase 1 |
| Recuperação | Token em texto claro e log de simulação permanecem. | Fase 1 |
| ACL | MANAGE/ALL continuam funcionando como autorização universal após consolidar ações. | Fase 2 |
| CPF | Já existe na entidade, schema e criação administrativa com validação quando informado; ainda opcional, com índice Drizzle não único. A ausência de CPF descrita anteriormente está superada parcialmente. | Fase 4 |
| Contratos e isolamento | Documentos ainda confundem metas e implementação; inventário completo de políticas por rota e testes institucionais pertencem às próximas fases. | Fases 2–3 |

Evidências principais: [logout HTTP](../packages/backend-api/src/arch/presentation/auth.router.ts), [refresh](../packages/backend-api/src/arch/application/use-cases/refresh-token.use-case.ts), [UoW](../packages/backend-api/src/arch/infrastructure/database/uow.ts), [guard](../packages/backend-api/src/arch/presentation/middlewares/authenticate-jwt.ts), [login](../packages/backend-api/src/arch/application/use-cases/login.use-case.ts), [recuperação](../packages/backend-api/src/arch/application/use-cases/forgot-password.use-case.ts), [ACL](../packages/backend-api/src/arch/application/services/iam-permission.service.ts) e [criação administrativa](../packages/backend-api/src/arch/application/use-cases/create-user-admin.use-case.ts).

## 3. Decisões e alternativas

| ID | Comportamento-alvo local | Alternativa e consequência |
| :--- | :--- | :--- |
| D01 | Uma organização por instalação no MVP; várias unidades futuras; escopo institucional obrigatório. | Organizações em banco compartilhado exigem isolamento completo desde o início. Evolução futura exige decisão própria. |
| D02 | OWNER governa sua organização; BUSINESS, inclusive conteúdo clínico, exige concessão explícita. | Bypass global simplifica gestão, mas mistura autoridade técnica e acesso aos dados. |
| D03 | CPF identifica a pessoa na organização; UUID identifica a conta; username/e-mail continuam aliases de login. | CPF como login principal muda UX e exposição de identificadores sem ser necessário para identidade única. |
| D04 | Sessão persistida e JWT associado à sessão; estado consultado a cada requisição protegida. | JWT inteiramente stateless mantém acesso até expirar após revogação. |
| D05 | Operações concretas, DENY prevalente e negação por padrão. | Papel ou menu isoladamente não expressam nem protegem concessões granulares. |

D01–D03 são premissas explícitas de trabalho; D04–D05 concretizam o plano solicitado. Custos assumidos: consulta de segurança por requisição, transações e migração das políticas atuais. Cache distribuído e serviço externo de identidade não são necessários nesta etapa.

## 4. Organização e identidade

- Organização é a fronteira representada por `tenant_id`; unidade pertence à organização e não é tenant. Cadastro completo de unidades pertence à fase de estrutura.
- A organização operacional é configurada explicitamente. Ausência, suspensão ou ambiguidade impede operação; não escolher o primeiro tenant encontrado.
- Consultas e mutações recebem contexto institucional validado no servidor. Tenant ausente não remove filtros; `NULL` não concede acesso global; payload não define autoridade.
- Usuário, grupo, associação, permissão e sessão pertencem à mesma organização. Catálogo global somente leitura não torna concessões globais. OWNER não atravessa organizações.
- Administração do host/banco é responsabilidade de operação, separada de OWNER; não existe conta de suporte com acesso clínico implícito na API.
- Username é aparado, preserva diferenciação de caixa e não aceita `@`; e-mail é aparado e normalizado em minúsculas. Migrar colisões antes de impor a regra; impedir ambiguidade entre aliases de contas distintas.
- CPF é normalizado para 11 dígitos e validado; unicidade por organização, inclusive para contas excluídas logicamente. Relações usam UUID; reativação preserva identidade e autoria histórica.
- Na fase 4, contas humanas novas exigem CPF. Contas existentes serão regularizadas antes da restrição definitiva, sem criar CPF fictício ou outra conta para a mesma pessoa.
- Cadastro público fica desabilitado no MVP. Bootstrap do primeiro OWNER é controlado, separado do seed demonstrativo, e sua repetição não redefine senha.
- Usuário não é Patient nem Practitioner. Identidade profissional pertence ao módulo Pessoas; integrações terão identidade própria.

## 5. Sessões e autenticação

### 5.1. Parâmetros iniciais

São valores operacionais propostos para a implementação local, não uma afirmação de mínimos regulatórios.

| Parâmetro | Valor | Regra |
| :--- | :--- | :--- |
| Access token | 15 minutos | Nunca ultrapassa a validade absoluta da sessão. |
| Sessão absoluta | 7 dias desde login | Refresh não reinicia esse prazo. |
| Inatividade | 15 minutos | Bloqueio no servidor e nova autenticação. |
| Recuperação | 30 minutos | Token de uso único, persistido como hash. |
| Falhas consecutivas | 5 | Quinta falha ativa bloqueio; tentativas seguintes recebem 429 por 15 minutos. |
| Senha | Mínimo 8 caracteres, letras e números | Mesma política em criação, troca e reset; preservar Argon2id. |

Persistir datas em UTC; `now >= expires_at` significa expirado. Atividade é operação autenticada iniciada pelo usuário e reconhecida pela política da rota. Refresh, health check e polling não prolongam inatividade; horário fornecido pelo cliente não define atividade. Cada rota deve declarar se atualiza atividade.

### 5.2. Estado e revogação

- Uma sessão representa um login/dispositivo e mantém `sid` estável. Refresh rotacionados pertencem à mesma família; consumir um token não equivale a encerrar toda a sessão.
- JWT contém `sub`, `sid`, `tenant_id`, `iat`, `exp`, emissor e audiência esperados. Verificar estrutura, assinatura e algoritmo permitido. Role no JWT, se preservada, não é autoridade atual.
- Toda requisição protegida verifica sessão, prazos, usuário ativo/não excluído, organização ativa e autoridade atual. Indisponibilidade do estado nega execução e retorna erro de serviço.
- Senha provisória ou termo pendente restringe sessão a perfil mínimo, troca de senha, leitura/aceite dos termos e logout. Rotas operacionais/administrativas ficam bloqueadas. Termo novo restringe também sessões já abertas.
- Troca/reset de senha revoga todas as sessões e exige novo login. Reset administrativo define senha provisória, exige troca e invalida recuperação pendente.
- Revogação imediata: autorizações iniciadas após seu commit falham. Operações já concluídas não são revertidas; mutações críticas revalidam estado dentro da transação antes de efetivar mudanças.
- Falha ao persistir revogação nunca retorna sucesso. Limpeza de cookie não substitui revogação.
- Login inválido não distingue usuário inexistente de senha errada; usar hash fictício pré-calculado de custo Argon2 equivalente. Não gerar hash fictício a cada tentativa.
- Limites por conta agregam aliases; limites por origem e custo global protegem também contas inexistentes e recuperação/troca de senha. Contadores são atômicos.

### 5.3. Rotação e concorrência

Consumo do refresh e criação do sucessor são uma transação com atualização condicional ou bloqueio. Apenas uma chamada consome o token; falha de criação reverte o consumo. Guardar hash, vínculo de família e estado para reconhecer reutilização.

Replay de token consumido retorna 401 e revoga a família. Em duas renovações simultâneas, a segunda pode revogar a família emitida pela primeira: o cliente coordena refresh entre requisições e abas. Não há tolerância silenciosa à reutilização.

Refresh e logout usam a mesma fronteira de serialização da sessão. Se refresh concluir primeiro, logout revoga seu sucessor; se logout concluir primeiro, refresh falha. Reset, desativação e revogação global também coordenam emissão concorrente de tokens.

### 5.4. Transporte e operações

Navegador: access token em memória; refresh exclusivamente em cookie HttpOnly, Secure em produção, SameSite Strict, path `/api/v1/auth`. Não devolver refresh no JSON web nem persistir tokens em localStorage. Recarregar página restaura sessão pelo cookie.

Cliente externo: canal JSON explicitamente habilitado na instalação. Login aceita `token_transport: cookie | body`, com default `cookie`; `body` indisponível retorna 403. O modo é persistido na sessão. Refresh/logout seguem o modo da sessão e rejeitam transporte incompatível. Ausência de cookie não seleciona automaticamente o canal. Requisição com cookie e body conflitantes retorna 400. Operações mutáveis por cookie validam origem esperada; CORS usa lista explícita. A fase 1 entrega esse discriminador no OpenAPI junto com a implementação.

| Operação-alvo | Semântica |
| :--- | :--- |
| `POST /api/v1/auth/login` | Identifier/password; access token, token_type, expires_in e perfil mínimo; refresh conforme canal. |
| `POST /api/v1/auth/refresh` | Não exige access token válido; rotaciona sem eliminar restrições de senha/termos. |
| `POST /api/v1/auth/logout` | Encerra somente sessão identificada pelo sid autenticado ou refresh válido; funciona com access expirado e refresh válido, sem renovar para sair. |
| `POST /api/v1/auth/logout-all` (novo) | Autenticação válida; encerra todas as sessões do próprio usuário na organização. |
| `GET /api/v1/auth/me` | Perfil mínimo, sem hashes/tokens; alias profile segue a mesma política. |
| `POST /api/v1/auth/change-password` | Senha atual, política, atualização e revogação global; novo login. |
| `POST /api/v1/auth/forgot-password` | Resposta genérica; canal cadastrado; hash do token, nenhum segredo em log/JSON. |
| `POST /api/v1/auth/reset-password` | Uso único, atualização e revogação global na mesma transação; novo login. |
| Reset administrativo | Permissão própria, senha provisória e revogação; nunca recuperar senha anterior. |

Logout rejeita identidades/sessões conflitantes. Sessão reconhecida já encerrada admite resposta idempotente, sem revelar dados; ausência de credencial utilizável retorna 401. Sid autenticado funciona sem cookie; nunca há fallback implícito para logout global. Respostas de sucesso de logout usam 200 com code/message e limpam cookie web.

## 6. Autoridade e ACL

| Papel | Governança | BUSINESS |
| :--- | :--- | :--- |
| OWNER | Sua organização; bootstrap garante administração inicial. | ACL explícita; sem bypass clínico. |
| ADMIN | Gestão delegada de USER/ADMIN e grupos; não altera OWNER nem promove a OWNER. | ACL explícita. |
| USER | Próprio perfil/sessão e operações concedidas. | ACL explícita. |

Perfis iniciais: administração do sistema, administrativo sem conteúdo clínico e profissional de saúde, compostos por permissões. Role não comprova habilitação profissional. Concessão clínica exige ato explícito de autoridade habilitada e registro auditável, inclusive quando o beneficiário é OWNER.

Impedir exclusão/desativação própria e remoção/rebaixamento do último OWNER ativo. Validar último OWNER em transação. Recuperação administrativa usa procedimento auditado com exceções ARCH enumeradas; não concede BUSINESS.

Ordem única da decisão de acesso:

1. Validar identidade, sessão, organização e estados atuais.
2. Exigir política explícita de rota/recurso/operação; ausência ou inatividade nega.
3. Verificar organização do objeto e papel mínimo; nenhum deles concede acesso isoladamente.
4. Reunir concessões diretas e de grupos ativos da mesma organização.
5. Expandir agregadores nas operações declaradas; aplicar DENY direto ou herdado depois da expansão.
6. Autorizar apenas operação concedida e não negada; aplicar invariantes do caso de uso.

Operações-alvo: READ, CREATE, UPDATE, DELETE (lógica), EXECUTE. WRITE migra para CREATE+UPDATE; MANAGE/ALL expandem operações declaradas naquele recurso, sem conceder gestão de ACL de outros recursos. NONE não concede. Nova operação não amplia automaticamente permissões históricas.

ALLOW MANAGE + DENY DELETE bloqueia DELETE. ALLOW READ + DENY UPDATE preserva READ. DENY READ não apaga outras operações independentes, salvo regra explícita do recurso. Propagação visual para menu pai não concede API.

Gestão de ACL é permissão própria. ADMIN não concede além da autoridade delegável. Payload identifica exatamente usuário ou grupo; validar todos os recursos, operações, alvos e escopos antes de substituir ACL. Erro não pode resultar em substituição parcial. Recurso desconhecido é rejeitado, não ignorado.

Fase 2 deve registrar impacto da migração de WRITE e DENY de grupos. Guards, capabilities e menus derivam da mesma política; frontend não é barreira de segurança. Inventário `endpoint → recurso → operação → escopo` cobre também aliases legados.

## 7. Dependências transversais

- Portas de domínio/aplicação não importam repositórios concretos; composição ocorre na inicialização. IAM não instancia repositórios clínicos.
- UoW transacional real para credenciais, sessões, ACL e auditoria correspondente. Falha de auditoria crítica impede confirmação; falhas de autenticação têm evento próprio, sem rollback apagar evidência.
- Auditoria distingue ator/alvo opacos, organização, horário, ação, resultado e correlação. Sem CPF, senha, token ou conteúdo clínico. Role da aplicação não altera/exclui trilha; consulta tem permissão e paginação.
- Termos registram versão, usuário e data de aceite. Chaves de API e cofre têm identidades, escopos e custódia próprios, detalhados na fase 4.
- ProblemDetails tem campos coerentes com schema, incluindo code/title/status/detail. Definir 400 para payload, 401 para credencial inválida, 403 para acesso negado, 409 para conflito, 429 para bloqueio e 503 para indisponibilidade de segurança.
- Testar respostas serializadas e entregar OpenAPI com a implementação. Endpoints futuros desta especificação não são acrescentados ao contrato publicado nesta fase.
- IAM não é FHIR. Preparar auditoria/proveniência para AuditEvent/Provenance; modelagem clínica seguirá FHIR na fase correspondente. Não criar tabelas clínicas nesta entrega.

## 8. Critérios de aceite das próximas fases

São cenários planejados, não testes executados nesta entrega.

| ID | Resultado esperado | Fase |
| :--- | :--- | :--- |
| S01 | Logout por cookie/sid/canal suportado revoga sessão; refresh anterior falha; outra sessão permanece válida. | 1 |
| S02 | Logout-all não afeta outro usuário/organização. | 1 |
| S03 | Refresh concorrente consome uma vez; replay revoga família; falha de insert reverte consumo. | 1 |
| S04 | Corrida logout/refresh não deixa sucessor utilizável após revogação. | 1 |
| S05 | JWT antigo não permite acesso de usuário desativado/excluído, organização suspensa ou sessão revogada. | 1 |
| S06 | Reset/troca revoga sessões; token de recuperação só funciona uma vez, inclusive em concorrência. | 1 |
| S07 | Login inexistente executa custo Argon2 equivalente; comparação estatística não exige tempos idênticos. | 1 |
| S08 | Aliases/falhas concorrentes respeitam limites; refresh/polling não prolongam inatividade. | 1 |
| A01 | ADMIN rebaixado perde autoridade; API direta respeita ACL, independentemente do menu. | 2 |
| A02 | MANAGE + DENY DELETE impede exclusão; negação parcial preserva outras concessões. | 2 |
| A03 | Grupo inativo não concede; rota sem política nega; menu pai não concede API. | 2 |
| A04 | IDs de outra organização não permitem leitura/associação/mutação, mesmo para OWNER; fixture com duas organizações testa defesa do MVP single-tenant. | 2 |
| A05 | ADMIN não altera OWNER nem amplia autoridade delegável; corrida preserva último OWNER ativo. | 2 |
| A06 | Falha na ACL preserva estado anterior; dois alvos ou ação desconhecida falham integralmente. | 2 |
| T01 | Erros 400/401 e sucesso 201 preservam campos exigidos; serialização não transforma validação em 500. | 3 |
| T02 | Aplicação não altera/exclui auditoria; eventos distinguem ator/alvo e não contêm segredos. | 3 |
| I01 | CPF duplicado é impedido sob concorrência; regularização preserva autoria histórica. | 4 |
| I02 | Senha provisória/termos pendentes bloqueiam operações mesmo com interface manipulada. | 4 |

## 9. Conclusão e sequência

A fase 0 documental entrega uma especificação única com premissas identificadas, semântica de revogação, operações, fronteira institucional e cenários de aceite. D01–D03 permanecem visíveis para revisão, sem atribuir aprovação à comunidade.

Fase 1: autenticação/sessões com testes HTTP e PostgreSQL. Fase 2: autorização institucional em toda a API. Fase 3: auditoria, contratos e CI. Fase 4: completar identidade/integrações. Fase 5: terminologias e início de estrutura. Pacientes e demais módulos clínicos continuam fora do desenvolvimento atual, salvo contenção e correções transversais de contrato.

A implementação deve começar pela leitura desta especificação e revalidação da base. Esta entrega documental não comprova correção dos P0 nem conformidade regulatória.
