# 0007 — Ambiente de homologação

**Situação:** Aceita
**Data:** 2026-08-19
**Origem:** [Reunião de stack técnico, 19/08/2026](../reunioes/2026-08-19-stack-tecnico.md)

## Contexto

O projeto precisa de um lugar para publicar o MVP e testá-lo em condições reais, antes e independentemente de qualquer instalação em produção. O time também precisa de um ambiente onde comparar alternativas em aberto — notadamente as da decisão [0006](./0006-camada-de-cache-e-banco-de-apoio.md) — rodando versões diferentes lado a lado.

## Decisão

O ambiente de homologação do OpenClinic roda em **camada gratuita da Oracle Cloud**, com aproximadamente 2 processadores, 12 GB de memória e 50 GB de disco.

**Este ambiente é de testes e demonstração, com dados fictícios.** Ele não recebe dado real de paciente, sob nenhuma hipótese.

## O hardware modesto é um requisito, não uma limitação

O critério foi enunciado assim: **se rodar no servidor mais modesto possível, o projeto está no caminho certo.**

Isso não é economia — é engenharia com propósito. O público-alvo do OpenClinic são clínicas e consultórios que vão autohospedar o sistema, muitas sem orçamento de infraestrutura e sem equipe técnica. Um sistema que só se comporta bem em máquina cara exclui exatamente quem o projeto quer atender.

Portanto, **o consumo de recursos é métrica de projeto**, e o ambiente de homologação funciona como o piso mínimo que a aplicação precisa respeitar. Isso alimenta diretamente o critério de eficiência em disputa na decisão [0005](./0005-linguagem-do-backend.md).

## Por que este ambiente não serve como produção

Registrado explicitamente para que ninguém coloque dado de paciente aqui por engano:

- **Sem acordo de nível de serviço.** Uma camada gratuita não oferece garantia de disponibilidade.
- **Sem cópia de segurança gerenciada.** Prontuário exige guarda mínima de vinte anos ([`compliance.md`](../compliance.md)); um ambiente sem política de backup verificada não cumpre esse requisito.
- **Instâncias gratuitas podem ser reivindicadas pelo provedor** conforme os termos do serviço.
- **Capacidade limitada por construção** — o que é justamente a virtude do ambiente para testar, e o que o desqualifica para operar.

A documentação de instalação, quando existir, deve orientar cada clínica a hospedar em ambiente adequado e assumir sua própria responsabilidade de disponibilidade e backup. O OpenClinic não oferece hospedagem de produção como parte desta decisão.

## Pendência em aberto: titularidade da conta

A conta do provedor precisa estar vinculada à **Iniciativa OpenClinic**, e não a uma pessoa física.

Infraestrutura de projeto hospedada em conta pessoal cria dois problemas concretos: quem sai do projeto leva o servidor junto, e a responsabilidade pelo ambiente fica juridicamente ambígua — relevante mesmo com dados fictícios, e determinante caso qualquer dado real venha a existir.

Enquanto a entidade jurídica do projeto não estiver constituída ([`GOVERNANCE.md`](../../GOVERNANCE.md)), a conta deve ao menos usar as credenciais institucionais do projeto, com acesso compartilhado entre mais de uma pessoa responsável.

**Esta pendência não está resolvida** e precisa ser encaminhada antes de o ambiente virar dependência do trabalho do time.
