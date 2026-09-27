# Governança, identidade, versionamento e onboarding

Atue como revisor de engenharia de um template que origina outras aplicações. Avalie a adoção, fontes de identidade e fluxo de release; entregue recomendações e gates verificáveis. Não altere código, versão, banco, CI ou deploy durante esta auditoria.

Leia o [protocolo comum](./audit-protocol.md). Consulte a [auditoria arquitetural](./architecture-review.md) para duplicação/core e a [verificação operacional](./application-verification.md) para execução dos cenários.

## Fontes e pré-condições

Leia diretrizes locais (como `.agent/` se presente), [ADRs](../../../docs/adr/), [auth-spec](../../../docs/auth-spec.md), [manifest raiz](../../../package.json), manifests dos pacotes, [CLI](../../../packages/backend-cli/src/index.ts), configuração pública, persistência de aplicação, [workflows](../../../.github/workflows/), Dockerfiles/stacks e [relatórios](../reports/README.md).

Descubra scripts de build/release/deploy existentes. Distinga rigorosamente publicação de imagens em registry de deployment operacional: workflows como `publish-docker.yml` compilam e enviam imagens, mas não constituem deployment concluído nem sincronizam versão no banco. Se não existir fluxo de release/deploy contínuo, registre a lacuna e proponha contrato de estados com rollback; não presuma deploy ativo a partir de push de branch.

Referências externas só são material comparativo. O resultado deve funcionar no clone do template sem aliases de máquina, registries corporativos ou acesso ao repositório Appserver. Preserve licenças/atribuições; não presuma licença ou upstream ausentes.

## 1. Matriz canônica de identidade e versão

Preencha estado observado, alternativas, recomendação, precedência, fallback e decisão pendente para cada linha:

| Informação | Alternativas a comparar | Critério |
| --- | --- | --- |
| Nome técnico do pacote | Manifest do pacote, namespace | Identificador técnico não é branding |
| Nome público e branding | Configuração do projeto, banco institucional, metadado build | Derivável sem literais espalhados |
| Versão da release do produto | package.json raiz ou manifest explicitamente eleito | Fonte versionada e reproduzível |
| Versão do CLI distribuído | Manifest do pacote ou metadado de build dessa versão | Reflete o executável real, inclusive offline |
| Versão implantada registrada | Registro de aplicação no banco do destino | Reflete implantação verificada, não intenção |
| Versão do schema | Histórico de migrations/checksum | Não equivale à versão do produto |
| Imagem/artefato | Tag imutável/digest/commit + versão | Identifica exatamente o código entregue |

Recomendação inicial a avaliar, não decisão presumida: release do produto em manifest versionado; CLI lê metadados locais empacotados; branding vem de configuração explícita e pode ser complementado pelo banco; banco registra deployment. Justifique divergências conforme distribuição conjunta ou independente dos pacotes.

Não force pacotes independentes a ter a mesma versão. Exija que os manifests participantes da release estejam coerentes com a política aprovada. A versão do banco não pode substituir silenciosamente a versão do código executado.

## 2. CLI portátil e bootstrap

Examine index, parser, banners, erros, --help e --version:

- Nenhum nome de produto ou versão fixo em string funcional; exceções técnicas são classificadas, não substituídas cegamente.
- Leitura de metadados deve funcionar tanto no runtime de desenvolvimento (`src/index.ts`) quanto no executável empacotado (`dist/index.js`), e a partir de diretório arbitrário, garantindo resolução determinística de `import.meta.url`.
- --help/--version funcionam antes do banco existir e com banco/secrets indisponíveis; não dependem de carregar configuração operacional antecipadamente nem de efetuar I/O desnecessário no top-level.
- Banco indisponível não produz versão fictícia nem impede identificar o executável.
- Nenhuma atualização de versão no import, startup, ajuda ou consulta.
- Identidade configurável tem validação e fallback explícitos; nome técnico permanece distinguível.

Aceite: mesmas informações corretas no desenvolvimento e artefato, sem conexão obrigatória ao banco e sem duplicação de literais.

## 3. Contrato de versionamento dinâmico no deploy

Avalie e documente este comportamento-alvo:

1. Ler a versão atual do package.json eleito pela política.
2. Calcular a próxima versão e exibir atual → proposta, tipo de incremento, pacotes afetados, destino e identidade da release.
3. Solicitar confirmação explícita antes de qualquer alteração. Recusa ou ausência de resposta não autoriza escrita.
4. Após confirmação, atualizar manifests e lockfiles participantes de forma consistente e preparar artefato identificável.
5. Implantar conforme a autorização de deployment e verificar saúde/compatibilidade.
6. Atualizar o registro de versão no banco do destino no estágio correto; não marcar release concluída antes de ela ocorrer.
7. Conferir artefato em execução, manifests pertinentes e versão registrada no banco; persistir resultado verificável.

“Próxima versão” exige política: patch, minor, major e prerelease. Se ausente, proponha patch padrão com escolha explícita de minor/major, sem adotar automaticamente. Confirmação de incremento não substitui autorização para publicar ou alterar ambiente.

Defina máquina de estados simples para planejada, confirmada, artefato pronto, implantação verificada, registro sincronizado e falha/recuperação. O registro pode distinguir versão pretendida de concluída; nunca apresentar a pretendida como já implantada.

### Cenários obrigatórios de análise/aceite

| Cenário | Resultado exigido |
| --- | --- |
| Recusa/cancelamento | Nenhum manifest, lockfile ou registro de banco alterado |
| Sem interação | Versão e autorização explícitas por mecanismo documentado; não presumir sim |
| Mesma release repetida | Reutiliza identidade/versão, sem novo incremento |
| Dois deploys concorrentes | Serialização ou rejeição de conflito de versão/estado |
| Falha antes de publicar | Estado recuperável, sem banco anunciando sucesso |
| Artefato ativo, falha no registro | Divergência visível; retomar sincronização ou compensar, sem novo bump |
| Rollback | Artefato e registro reconciliados; avaliar compatibilidade do schema sem rollback destrutivo automático |
| Instâncias antigas e novas | Não aplicável enquanto não houver rollout misto; justificar necessidade antes de exigir suporte |
| Prerelease/promover release | Sem ordenação lexical ingênua; regra determinística e testada |
| Pacotes independentes | Apenas manifests previstos sincronizados, com mapa de compatibilidade |

Tags semver ou SHA ainda podem ser sobrescritas conforme a política do registry. Verifique proteção de tags e registre digest do artefato; o nome da tag sozinho não garante imutabilidade. Não proponha migration com versão de release fixa como mecanismo recorrente de sincronização; eventual reconciliação legada precisa de alvo explícito e não pode anunciar como implantada uma versão ainda não verificada.

Filesystem, banco e plataforma não formam uma transação única. Exija recuperação/compensação e teste de falhas parciais. Não reescreva migrations históricas para mudar app_version. A política de registro deve identificar o ambiente e o aplicativo corretos, não atualizar todas as organizações indiscriminadamente.

Nesta auditoria, somente analisar/simular com autorização e dados descartáveis. Não incrementar versões, executar deployment ou escrever no banco operacional.

## 4. Onboarding e derivação

Teste documentalmente um clone limpo e uma aplicação derivada:

- runtime e gerenciador definidos, lockfile canônico, instalação determinística e prerequisitos reais;
- configuração de nome, branding, imagens, serviços, banco e URLs sem editar lógica;
- comandos reais de bootstrap, owner/runtime e secrets, sem valores reais ou aliases privados;
- bootstrap do primeiro administrador separado de seed demo; repetição não redefine credenciais;
- perfis demo e rotas obtidos dos seeds atuais, sem usuários inventados no guia;
- nenhuma credencial demo exposta em produção;
- páginas mock identificadas e não anunciadas como CRUD persistido;
- política de idiomas/catálogos, contribuição, revisão de PR e links portáveis.

“Um clique” não pode ocultar criação/destruição de banco, download, publicação ou coleta de credenciais. Descreva etapas e confirmação quando aplicável.

## 5. Gates de entrega e governança

Compare scripts disponíveis com os realmente executados pelo CI. Separe tipagem, suíte padrão, integração PostgreSQL, contratos, navegador e distribuição. Um job definido mas não acionado não protege a entrega.

Exija:

- fixtures válidas e testes que atinjam asserções;
- descoberta de todos os arquivos e explicitação de cenários opcionais;
- concorrência real com pool/conexões apropriados;
- contratos gerados comparados sem sobrescrita silenciosa;
- smoke da imagem final e menor privilégio comprovado;
- atribuições/licença verificadas a partir de arquivos presentes;
- atualização de documentação e registro de decisões com status explícito.

Não copie pontuação/ordem de áreas de outro ecossistema como severidade universal. Testes de documentação precisam verificar links e consistência; não exigem redeploy nem repetição de suítes da aplicação quando não houve mudança executável.
Diagramas de ciclo de vida de release, máquina de estados de deploy e fluxos de onboarding devem ser apresentados em blocos cercados por três crases, com `mermaid` após a cerca de abertura, válidos e que renderizem o gráfico em renderizadores compatíveis.

## 6. Verificação do próprio processo de compliance

Quando houver runner local, confronte cada gate com o controle que afirma verificar. Exija comparação real entre contrato gerado e versionado para drift; cobertura dos pacotes/aliases/imports para arquitetura; e execução src/dist em ambiente isolado sem configuração de banco para CLI offline. Compare a versão parseada com a fonte canônica, separando notices do gerenciador de pacotes de stdout do executável.

Verifique propagação de exit code, timeout, comandos indisponíveis, skips opcionais/obrigatórios, perfis rápido/completo, descoberta de testes, duração medida e relatórios com nome único. Pareceres precisam ser derivados dos resultados e conter links para evidência; não embuta versões, resultados de segurança ou participação de especialistas como texto fixo. Aplique os limites de conclusão do protocolo comum.

Mantenha rastreabilidade critério → teste/comando → workflow/job → evento de disparo → condição de bloqueio da entrega. Para dependências e scanners, registre escopo, lockfile, ferramenta/base consultada e limitações; falha de consulta ou parser não significa zero vulnerabilidades. Não instale nem execute scanners externos automaticamente.

A comparação com repositórios externos é opcional e só ocorre quando solicitada e disponível; sua ausência não bloqueia a auditoria local. Na comparação Appserver, identifique arquivo/versão consultada, prática aproveitada, adaptação e critério rejeitado com motivo. Não declare paridade com funcionalidades que não foram inspecionadas; não transforme sugestões de outro stack, registry ou orquestrador em requisitos obrigatórios do template.

## Relatório e conclusão

Grave `infra/compliance/reports/YYYY-MM-DD-engineering-governance-audit-HHmmss.md` (onde `HHmmss` representa a hora, minuto e segundo no fuso local, tal como `YYYY-MM-DD-engineering-governance-HHmmss.md`) conforme protocolo. Entregue matriz canônica preenchida, contratos de release, gaps do CLI, mapa de onboarding/CI, decisões pendentes e fases de adoção. Conclusão exige critérios observáveis, não número fixo de testes nem versão de marco hardcoded.

## Catálogo local e runner

Consulte [scenarios/catalog.json](../scenarios/catalog.json), as [regras de manutenção](../scenarios/README.md) e o [guia de comandos](../README.md). Use IDs estáveis nos achados e na matriz de cobertura. Valide referências com `npm run compliance -- catalog validate`. O runner registra gates e vínculos, mas não aprova cenários por associação nem gera pareceres técnicos fixos. Para novos módulos, siga o [prompt de manutenção](./scenario-catalog-maintenance.md).
