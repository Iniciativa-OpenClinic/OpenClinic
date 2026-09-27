# ADR — Estratégia de Acesso a Dados: Drizzle ORM como Padrão e Stored Procedures por Exceção

> **Status:** Proposto para ratificação pelo grupo OpenClinic  
> **Data:** Setembro de 2026  
> **Decisão proposta:** Drizzle ORM e SQL versionado em migrations são o caminho padrão de acesso a dados. Stored procedures não devem ser usadas como mecanismo normal de regra de negócio ou persistência; só podem ser adotadas como exceção documentada.

---

## 1. Resumo para a reunião

O OpenClinic é uma aplicação TypeScript com Clean Architecture, PostgreSQL e Drizzle ORM. A regra proposta é simples: **o banco garante integridade, concorrência e armazenamento; a aplicação implementa os casos de uso e regras de domínio**.

Stored procedures não são “erradas” por definição. Elas são uma ferramenta válida do PostgreSQL. O problema começa quando viram a forma habitual de implementar funcionalidades: o código de negócio passa a ficar dividido entre TypeScript e PL/pgSQL, perde-se parte da tipagem, dos testes e da revisão de código já estabelecidos pelo projeto, e a evolução do sistema fica mais cara.

**Recomendação:** manter o Drizzle ORM como porta de entrada da aplicação para dados, com repositories na infraestrutura e transações explícitas. Usar SQL em migrations para DDL, constraints, índices, views e ajustes de performance. Aceitar procedures somente quando houver uma razão mensurável que não possa ser atendida de modo mais claro pelo Drizzle/SQL transacional.

---

## 2. A decisão arquitetural

| Área | Padrão OpenClinic | Onde fica |
| --- | --- | --- |
| Regras de negócio e casos de uso | TypeScript, serviços de aplicação e domínio | `domain` e `application` |
| Acesso transacional a tabelas | Drizzle ORM, repositories e Unit of Work | `infrastructure` |
| DDL, constraints, índices e dados de referência | SQL revisável e versionado | migrations |
| Integridade que deve valer para qualquer cliente do banco | `NOT NULL`, `CHECK`, `UNIQUE`, `FOREIGN KEY`, políticas e permissões | PostgreSQL |
| Leitura analítica reutilizável | Preferencialmente views; materialized views quando justificadas | PostgreSQL + migration |
| Stored procedure | Exceção, com ADR curta, testes e owner definido | PostgreSQL + migration |

Essa divisão respeita a ordem `domain → application → infrastructure → presentation`: o domínio não depende do banco, e o banco não se torna um segundo lugar para esconder casos de uso.

---

## 3. Por que Drizzle ORM deve ser o padrão

### 3.1 Um único lugar principal para entender o comportamento

Um fluxo como criar atendimento, registrar evolução ou trocar um refresh token deve poder ser acompanhado no repositório: DTO validado, autorização, caso de uso, transação e auditoria. Com Drizzle, a query é TypeScript explícito e próxima de SQL. O revisor encontra o fluxo com busca normal, navega por tipos e enxerga as relações sem alternar entre código da API, função no banco e permissões de execução.

Quando procedures são usadas rotineiramente, a mesma regra passa a ter duas fontes de verdade: a aplicação decide quando chamar e o banco decide como agir. Com o tempo, há risco de uma chamada direta, job ou integração executar a procedure com pressupostos diferentes daqueles da API.

### 3.2 Tipagem, refatoração e contratos verificáveis

O schema do Drizzle gera inferência de tipos para colunas, inserts, selects e relações. Uma alteração de nome, nulidade ou formato tende a aparecer no `typecheck` antes do deploy. Isso é especialmente valioso num prontuário eletrônico, no qual campos clínicos e de auditoria evoluem ao longo do tempo.

PL/pgSQL também pode ser bem escrito, mas não participa da mesma cadeia de tipos TypeScript. Assinaturas, `RETURNS TABLE`, nomes de campos e códigos de erro de uma procedure exigem contratos paralelos e testes adicionais para impedir divergências com os DTOs da aplicação.

### 3.3 Testes mais próximos do comportamento do usuário

No padrão proposto, regras de domínio e serviços de aplicação podem ser testados de forma unitária com dependências controladas; repositories e migrations são validados por testes de integração contra PostgreSQL. Isso permite testes rápidos para regras e testes reais para persistência.

Ao concentrar regras em procedures, o teste normalmente precisa de banco disponível até para validar decisões de negócio simples. O resultado costuma ser uma suíte mais lenta, com cenários menos legíveis e maior custo de manutenção.

### 3.4 Segurança e autorização permanecem explícitas

Autorização clínica não é somente “quem pode executar uma query”. Ela depende de identidade, tenant, papel, vínculo com unidade, contexto do paciente e trilha de auditoria. Essas informações já entram pela camada de apresentação e são orquestradas pelos serviços de aplicação.

Uma procedure pode receber todos esses parâmetros, mas isso amplia sua assinatura, duplica políticas que já existem no backend e aumenta o risco de uma rota ou integração chamá-la com contexto incompleto. A regra é: **o banco protege a integridade dos dados; a aplicação aplica a política de negócio e de acesso; ambas as camadas se complementam.**

### 3.5 Transações sem abrir mão de clareza

“Precisamos de atomicidade” não é argumento suficiente para mover um fluxo para uma procedure. Drizzle permite agrupar inserts, updates e leituras sob uma transação PostgreSQL. O caso de uso continua legível em TypeScript, com rollback automático em falhas, mantendo as garantias ACID do banco.

O ganho real de uma procedure só aparece quando reduzir idas e voltas entre aplicação e banco, executar lógica massiva perto dos dados ou aproveitar um recurso nativo específico traz benefício demonstrável.

### 3.6 Evolução, revisão e operação mais previsíveis

O OpenClinic já usa migrations SQL versionadas. Esse mecanismo é excelente para mudanças estruturais e objetos de banco, pois o DBA pode revisar o SQL que será executado. Transformar cada funcionalidade em uma procedure, porém, aumenta muito a superfície de migrations e torna rollback, compatibilidade entre versões da API e depuração de incidentes mais difíceis.

No modelo Drizzle-first, há uma separação saudável:

- migrations descrevem como o banco muda;
- a aplicação descreve o que o produto faz;
- observabilidade correlaciona a ação de domínio, o usuário e as queries executadas.

---

## 4. Por que stored procedures não devem ser o uso normal

| Risco do uso rotineiro | Efeito prático no OpenClinic | Como o padrão Drizzle reduz o risco |
| --- | --- | --- |
| Regra de negócio distribuída | É difícil saber se a regra está na API, no serviço ou no banco. | Casos de uso ficam em serviços TypeScript nomeados e testáveis. |
| Contratos duplicados | DTOs, tipos TypeScript e assinatura `CALL`/`SELECT` podem divergir. | Tipos são inferidos do schema e usados pelo repository. |
| Menor testabilidade unitária | Testes exigem PostgreSQL mesmo para regras puras. | Domínio e aplicação são testados isoladamente; infraestrutura é integrada. |
| Depuração mais difícil | Stack traces e logs ficam separados entre runtime Node e PostgreSQL. | Fluxo e contexto de negócio são registrados no serviço de aplicação. |
| Acoplamento ao PostgreSQL | A lógica do produto fica presa a PL/pgSQL e semântica específica. | SQL continua disponível onde agrega valor, sem capturar o domínio inteiro. |
| Governança de permissões mais complexa | Além de DML, é preciso gerir `EXECUTE`, ownership e, possivelmente, `SECURITY DEFINER`. | A role de aplicação mantém privilégios mínimos de DML necessários. |
| Versões API–banco mais frágeis | Uma API nova pode depender de assinatura ainda não migrada, ou uma antiga continuar chamando contrato alterado. | Mudanças são evoluídas em repositories e migrations coordenadas. |
| Contribuição menos acessível | Contribuidores precisam dominar TypeScript, SQL e PL/pgSQL para uma única feature. | SQL é necessário para dados; lógica cotidiana permanece no stack principal do projeto. |

### 4.1 O risco especial de `SECURITY DEFINER`

Procedures com `SECURITY DEFINER` são por vezes usadas para contornar permissões da role da aplicação. Isso exige cuidados rigorosos: owner confiável, `search_path` fixado, validação completa de parâmetros, grants mínimos e revisão de segurança. Como erro de configuração pode elevar privilégios, essa modalidade não deve ser introduzida para conveniência de desenvolvimento.

Se uma operação requer privilégios adicionais, a primeira pergunta deve ser se ela pertence a um processo administrativo separado, auditável e executado pela role adequada — e não se uma procedure pode ocultar essa elevação.

### 4.2 Procedures não substituem constraints

Integridade essencial — chaves estrangeiras, unicidade, validações de formato e consistência referencial — deve estar em constraints declarativas. Elas são aplicadas a toda escrita, são fáceis de inspecionar e o otimizador do PostgreSQL as entende. Depositar essa integridade apenas numa procedure falha assim que outro caminho de escrita surgir, como uma migration, uma rotina administrativa ou uma integração.

---

## 5. Objeções esperadas e respostas curtas

### “Stored procedure é mais rápida.”

Não automaticamente. A maior parte do custo está no plano de execução, índices, volume de dados, contenção e rede. Uma query Drizzle bem formada é SQL executado pelo mesmo PostgreSQL. Antes de mover lógica para uma procedure, deve haver medição com dados representativos, plano de execução (`EXPLAIN ANALYZE`) e comparação com a alternativa transacional na aplicação.

### “Toda regra deve ficar no banco para impedir bypass.”

Integridade invariável deve ficar no banco; regras de produto, autorização e orquestração devem ficar na aplicação. O banco não deve confiar que uma API sempre chamará o fluxo certo, por isso constraints são obrigatórias. Mas duplicar todo o domínio no banco não elimina bypass: apenas cria outra implementação que também precisa ser protegida, testada e evoluída.

### “Procedure reduz round trips.”

Pode reduzir, e esse é um motivo legítimo em operações comprovadamente críticas. Ainda assim, é possível reduzir round trips com uma única query SQL, CTEs, operações em lote e transações Drizzle. A procedure só é escolhida após comparar essas opções e registrar a justificativa.

### “DBAs preferem a lógica no banco.”

DBAs devem ter controle e visibilidade sobre schema, índices, planos de execução, backup, replicação, segurança e objetos críticos. A proposta preserva isso com migrations SQL legíveis e revisáveis. Ela não transforma o banco em uma camada de aplicação paralela, cuja evolução fica desconectada dos casos de uso.

---

## 6. Exceções admissíveis

Uma stored procedure pode ser aprovada quando **todos** os critérios abaixo forem atendidos:

1. há problema concreto e mensurado — não apenas preferência pessoal;
2. Drizzle com query única, CTE, batch, transação, view ou materialized view foi considerado e não resolve adequadamente;
3. o ganho justifica a complexidade adicional, por exemplo operação massiva perto dos dados ou rotina administrativa controlada;
4. a procedure é criada em migration versionada, revisada por engenharia e, quando aplicável, por DBA;
5. sua assinatura, permissões, comportamento transacional e estratégia de rollback estão documentados;
6. existem testes de integração e observabilidade suficiente para auditar chamadas e falhas;
7. não contém autorização clínica complexa nem lógica de apresentação; e
8. qualquer uso de `SECURITY DEFINER` recebeu revisão de segurança explícita.

Exemplos que podem se qualificar: manutenção massiva programada, consolidação pesada de dados históricos, rotina de migração operacional cuidadosamente controlada, ou algoritmo que comprovadamente precisa executar inteiramente no banco por volume e latência.

Exemplos que normalmente **não** se qualificam: CRUD comum, validação de formulário, regras de workflow clínico, RBAC da API, envio de notificações, montagem de respostas HTTP e consultas comuns de tela.

---

## 7. Processo de decisão para cada nova necessidade

```text
Necessidade de dados
        |
        +-- É integridade invariável? --> Constraint declarativa no PostgreSQL
        |
        +-- É leitura reutilizável/analítica? --> View ou materialized view
        |
        +-- É caso de uso normal? --> Serviço + repository com Drizzle/transação
        |
        +-- Há gargalo medido que exige execução no banco? --> Avaliar procedure pela checklist de exceção
```

---

## 8. Encaminhamento para deliberação

1. Ratificar **Drizzle ORM como padrão obrigatório** para acesso a dados da aplicação.
2. Manter SQL versionado para migrations, schema, constraints, índices, views e objetos de banco necessários.
3. Proibir novas stored procedures sem justificativa técnica documentada e revisão de arquitetura.
4. Revisar procedures já existentes para classificá-las como: manter por exceção, substituir por constraint/view/query Drizzle, ou descontinuar.
5. Medir performance antes de decidir por procedure; opinião não substitui benchmark, plano de execução e requisito operacional.

## Conclusão

Para o OpenClinic, Drizzle não representa uma abstração que esconde o banco: representa uma forma tipada, explícita e próxima de SQL para manter a lógica do produto no stack principal, sem abrir mão da força do PostgreSQL. Stored procedures continuam disponíveis como ferramenta especializada. Transformá-las em padrão, entretanto, fragmentaria o domínio, aumentaria a complexidade operacional e reduziria a capacidade da comunidade de evoluir o sistema com segurança.

**Decisão recomendada:** Drizzle por padrão; banco declarativo e seguro; procedures somente por exceção comprovada.
