# 0010 — Monolito modular

**Situação:** **Aceita** — decidida na [reunião de 26/08/2026](../reunioes/2026-08-26-fechamento-do-stack.md)
**Data:** 2026-08-26

## Contexto

Um projeto open source vive de contribuição esporádica, e a primeira barreira de qualquer contribuição é conseguir **rodar o sistema na própria máquina**. Uma arquitetura distribuída — serviços separados em rede, filas gerenciadas, dependências de provedor de nuvem — exigiria de cada contribuidor uma infraestrutura que a maioria não tem e um custo que o projeto não quer impor. O tema foi levantado e decidido em reunião sem tese contrária.

## Decisão

**A V1 do OpenClinic é um monolito modular**: uma aplicação de backend única, organizada internamente nos módulos de [`modulos.md`](../modulos.md). As fronteiras entre módulos existem no código, não na rede.

- **`docker compose` sobe o sistema inteiro** na máquina de quem contribui — banco de dados, backend e front-end — sem conta em nuvem, sem serviço externo, sem custo. É a decisão [0003](./0003-docker-como-unidade-de-implantacao.md) levada à consequência.
- A separação entre **front e back permanece absoluta** mesmo no monolito: são aplicações distintas que conversam apenas pelo contrato da API ([0004](./0004-api-antes-de-interface.md), [0008](./0008-contrato-antes-ou-depois-do-codigo.md)), e todas as regras de negócio vivem no back.
- Os **limites entre módulos** seguem o desenho em camadas. Se um dia for necessário extrair um serviço — um processador de fila, um serviço de IA fora do núcleo —, a costura já estará desenhada; extrair é decisão futura, com registro próprio, não pressuposto de agora.

## Por quê

- **Contribuição sem barreira.** Baixar, subir com um comando, mexer, testar. É o que um projeto de contribuição voluntária precisa para receber gente.
- **Autohospedagem barata.** Uma clínica sobe tudo num servidor modesto — coerente com o princípio registrado na [reunião de 19/08](../reunioes/2026-08-19-stack-tecnico.md): se rodar no servidor mais modesto possível, o projeto está no caminho certo.
- **Sem escala que justifique o contrário.** A complexidade de uma arquitetura distribuída só se paga numa escala que o projeto não tem. Monolito bem modularizado é o caminho comprovado para chegar até lá — e para sair dele, se um dia for preciso.

## Alternativas descartadas

- **Microsserviços / arquitetura distribuída** — custo de infraestrutura e de coordenação sem benefício na escala atual, e barreira de entrada letal para contribuição voluntária.
- **Amarração a serviços gerenciados de um provedor específico** (banco, filas ou autenticação como serviço de uma nuvem) — contradiz a promessa de autohospedagem e criaria, na infraestrutura, o aprisionamento que o projeto existe para combater.
