# 0006 — Camada de cache e banco de apoio

**Situação:** **Em aberto** — aguardando estudo comparativo
**Data de abertura:** 2026-08-19
**Origem:** [Reunião de stack técnico, 19/08/2026](../reunioes/2026-08-19-stack-tecnico.md)

## Contexto

O PostgreSQL é o banco de registro do projeto ([0002](./0002-postgresql-como-banco-principal.md)). Ainda na mesma reunião surgiu a discussão sobre um **segundo banco, de natureza diferente**, para cenários que um banco transacional atende mal.

Houve **consenso sobre duas coisas**:

1. Um banco de apoio faz sentido e provavelmente entrará no projeto.
2. Ele **não entra no MVP**. A formulação que fechou o ponto: o ótimo é inimigo do bom — primeiro o sistema nasce e funciona, depois agrega-se. E agrega-se, não substitui.

O que **não** houve consenso é sobre **qual** banco, e para **qual** necessidade — porque três necessidades distintas foram misturadas no mesmo debate.

## As três necessidades, separadas

Separá-las é pré-requisito para decidir, porque a resposta pode ser diferente para cada uma:

1. **Cache e sessão.** Guardar resultado de consulta cara e estado de autenticação, com acesso muito rápido e sem exigência de durabilidade. Foi a necessidade citada de forma mais concreta.
2. **Leitura analítica.** Consultas de relatório e inteligência de negócio que, rodando sobre o banco transacional, competem com o atendimento. A observação registrada foi que uma base analítica costuma atualizar em intervalos de minutos, o que a torna inadequada para leitura em tempo real.
3. **Percepção de tempo real.** Refletir mudanças imediatamente sem que o cliente fique consultando a API repetidamente.

## Alternativas em avaliação

- **Redis** — apresentado para a necessidade 1 (cache e sessão). É a opção mais estabelecida para esse papel específico.
- **MongoDB em paralelo ao PostgreSQL** — apresentado para as necessidades 2 e 3, com a proposta de operar os dois em conjunto e absorver carga de leitura.
- **Arquitetura orientada a eventos sobre o próprio PostgreSQL** — apresentada como alternativa que entrega a percepção de tempo real da necessidade 3 **sem** introduzir um segundo banco: o sistema reage a eventos de gravação em vez de consultar repetidamente. Há stacks já construídas nesse modelo, a serem compartilhadas com o time.

Vale notar que essa terceira alternativa se relaciona diretamente com os *webhooks* já previstos no [`prd.md`](../prd.md), que resolvem o mesmo problema de notificação sem consulta repetida — para consumidores externos. Convém avaliar as duas coisas juntas em vez de resolver o mesmo problema duas vezes.

## Próximo passo

Um **estudo comparativo** das stacks orientadas a eventos já construídas será compartilhado com o time e avaliado em conjunto, com testes no ambiente de homologação ([0007](./0007-ambiente-de-homologacao.md)) antes de qualquer escolha.

## Nota sobre o que é decisão e o que é expectativa

Documentos de divulgação do projeto não devem afirmar que "o OpenClinic usa Redis". O que existe hoje é: **consenso de que haverá um banco de apoio, na versão 2, com o candidato ainda em avaliação.**

Da mesma forma, atribuir a esse componente funções como fila de tarefas ou publicação e assinatura de eventos seria antecipar escopo — essas necessidades não foram levantadas nem avaliadas até aqui.
