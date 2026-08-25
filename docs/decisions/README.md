# Registro de decisões técnicas

Esta pasta guarda as decisões de arquitetura do OpenClinic, uma por arquivo, no formato conhecido como **ADR** (*Architecture Decision Record*).

A ideia é simples: quem chega ao projeto seis meses depois consegue entender **por que** ele é do jeito que é, sem precisar perguntar a alguém ou garimpar histórico de reunião. Cada arquivo registra o contexto, a decisão, as consequências assumidas e — igualmente importante — as alternativas que foram descartadas e por quê.

## Situação atual

| # | Decisão | Situação |
| :--- | :--- | :--- |
| [0001](./0001-fhir-como-padrao-de-dados.md) | HL7 FHIR como padrão de dados | Aceita |
| [0002](./0002-postgresql-como-banco-principal.md) | PostgreSQL como banco principal | Aceita |
| [0003](./0003-docker-como-unidade-de-implantacao.md) | Docker como unidade de implantação | Aceita |
| [0004](./0004-api-antes-de-interface.md) | API antes de interface | Aceita |
| [0005](./0005-linguagem-do-backend.md) | Linguagem e plataforma do backend | **Em aberto** |
| [0006](./0006-camada-de-cache-e-banco-de-apoio.md) | Camada de cache e banco de apoio | **Em aberto** |
| [0007](./0007-ambiente-de-homologacao.md) | Ambiente de homologação | Aceita |
| [0008](./0008-contrato-antes-ou-depois-do-codigo.md) | Contrato da API antes ou depois do código | **Em aberto** |

Esta tabela é o único lugar que declara a situação de cada decisão — o resto da documentação aponta para cá em vez de repetir.

## Situações possíveis

- **Proposta** — está escrita, mas ainda não foi decidida. O documento existe justamente para organizar o debate antes dele acontecer.
- **Aceita** — é a decisão vigente do projeto.
- **Substituída** — foi trocada por outra decisão. O arquivo **não é apagado nem reescrito**: ele ganha um aviso no topo apontando para a decisão que o substituiu. O histórico de um projeto vale tanto quanto o seu estado atual.

## Como propor uma decisão

1. Leve a proposta a debate — no grupo de WhatsApp (link em [`CONTRIBUTING.md`](../../CONTRIBUTING.md)), numa reunião ou numa [Issue](https://github.com/iniciativa-openclinic/openclinic/issues/new/choose) do tipo **Proposta de decisão técnica**. A Issue é o caminho de quem chega de fora: pública e pesquisável desde o primeiro dia.
2. Quando houver convergência, abra um Pull Request criando o arquivo `NNNN-titulo-curto.md` nesta pasta, seguindo a estrutura dos existentes.
3. O número é o próximo da sequência e não se reaproveita, mesmo que a decisão seja depois substituída.

## Como registrar sua posição numa decisão em aberto

Decisões marcadas como **Em aberto** têm uma seção de posições registradas. O debate pode acontecer em qualquer canal — grupo de WhatsApp, reunião, Issue —, mas posição só entra no registro **por escrito e assinada**: abra um Pull Request adicionando a sua, ou deixe-a escrita numa Issue para ser incorporada com seu nome.

O projeto não atribui argumentos a pessoas por conta própria a partir de transcrição de reunião: a atribuição é sempre de quem assina.
