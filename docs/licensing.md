# Modelo de licenciamento

Este documento explica, em linguagem simples, como o OpenClinic é licenciado e por quê. Não é um documento jurídico e não substitui aconselhamento de um advogado — veja o aviso no final.

## A licença é AGPL-3.0

O código deste repositório é distribuído sob a **GNU Affero General Public License, versão 3 (AGPL-3.0)** — veja o arquivo [`LICENSE`](../LICENSE).

Na prática, a AGPL-3.0 garante a **qualquer pessoa ou empresa**, sem pedir permissão a ninguém, o direito de:

- usar o OpenClinic livremente, inclusive em uma clínica ou rede de clínicas;
- estudar e modificar o código-fonte;
- **hospedar o OpenClinic como serviço para terceiros — inclusive cobrando por isso.**

A contrapartida (é isso que torna a licença "copyleft" e "Affero") é: **quem disponibiliza uma versão modificada do OpenClinic para outras pessoas usarem pela rede — inclusive como um serviço pago (SaaS) — é obrigado a publicar o código-fonte completo dessa versão modificada**, para todo mundo que interage com ela. Não existe atalho: rodar uma versão fechada e não publicar as modificações é violar a licença.

É por isso que escolhemos AGPL-3.0, e não uma licença mais permissiva (como MIT ou Apache 2.0): ela é o mecanismo legal que impede alguém de pegar o OpenClinic, fechar as melhorias e transformá-lo em mais um prontuário de ecossistema fechado — exatamente o problema que este projeto existe para combater. A licença já inclui, no seu texto (seção 11), uma concessão explícita de patentes pelos contribuidores — não é algo que precisamos adicionar por fora.

**O que isso não é**: a AGPL-3.0 não dá aos mantenedores do OpenClinic nenhum poder de decidir quem pode ou não comercializar o software. Qualquer texto que dissesse "comercialização exige nossa autorização" seria incompatível com essa licença e, na prática, sem efeito legal algum — a própria AGPL proíbe impor restrições adicionais desse tipo (seções 7 e 10). Preferimos ser diretos sobre isso a prometer um controle que a licença escolhida não permite.

## A licença comercial é uma alternativa, não uma barreira

Para quem **não pode ou não quer** cumprir as obrigações da AGPL-3.0 — por exemplo, uma empresa que quer oferecer o OpenClinic como parte de um produto maior sem publicar suas modificações — pretendemos oferecer uma **licença comercial alternativa**, mediante contrato com a entidade jurídica responsável pelo projeto (a constituir — veja [`GOVERNANCE.md`](../GOVERNANCE.md)), com uma mensalidade ainda não definida.

Esse modelo é conhecido como **licenciamento duplo** e é usado por projetos como MySQL, MinIO e Grafana: a versão AGPL é real, completa e gratuita; a licença comercial vende a **isenção** das obrigações de copyleft, não o direito de usar o software (que já é livre).

**Compromisso**: a versão sob AGPL-3.0 do OpenClinic permanecerá sempre completa e funcional — não haverá recursos essenciais retirados da versão aberta para forçar a migração para a licença paga ("open core" mutilado).

## O que a AGPL-3.0 não cobre

A licença cobre o código. Ela **não** dá a ninguém o direito de:

- usar o nome e a marca "OpenClinic" ou os materiais da Iniciativa OpenClinic;
- afirmar que uma versão modificada possui a certificação obtida pela distribuição oficial (veja a seção "Certificação" abaixo e o [`compliance.md`](./compliance.md)).

## Certificação

Quando o projeto tiver um produto maduro, pretendemos buscar a **Certificação de S-RES da SBIS** (Sociedade Brasileira de Informática em Saúde) para a **distribuição oficial** do OpenClinic — é a certificação técnica de referência para prontuários eletrônicos no Brasil, embora seja voluntária (detalhes em [`compliance.md`](./compliance.md)).

Um ponto importante e honesto: a certificação é emitida para uma **versão específica e auditada** do software.
- Quem roda a distribuição oficial, sem modificações, está rodando o software certificado.
- **Um fork modificado por outra pessoa não herda automaticamente o selo** — quem modifica e redistribui precisa buscar sua própria certificação se quiser o mesmo selo.

Isso não é uma restrição da licença; é apenas como certificações de software funcionam em qualquer contexto.

## Contribuições e o futuro CLA

Para que o modelo de licenciamento duplo seja juridicamente sustentável, o projeto precisará, no futuro, de um **CLA (Contributor License Agreement)** — um acordo simples que cada contribuidor externo assina, permitindo que suas contribuições sejam distribuídas tanto sob AGPL-3.0 quanto sob a licença comercial.

Enquanto o CLA formal não existe, vale a regra descrita em [`CONTRIBUTING.md`](../CONTRIBUTING.md): nenhuma contribuição de terceiros (código ou texto) é incorporada ao projeto sem concordância explícita com os termos de licenciamento vigentes. O texto do CLA será publicado para comentário público antes de passar a ser exigido.

## Aviso

Este documento descreve a **intenção** de licenciamento do projeto em linguagem acessível. Ele **não foi revisado por um advogado** e não é parecer jurídico. Antes de qualquer cobrança comercial efetiva ou da formalização do CLA, o modelo aqui descrito passará por revisão jurídica própria.
