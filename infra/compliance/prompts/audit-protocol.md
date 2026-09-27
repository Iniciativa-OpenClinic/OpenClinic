# Protocolo comum de auditoria

Leia este protocolo junto ao prompt escolhido. Ele define evidência, segurança de execução e formato de saída; os três prompts especializados definem os cenários e o [relatório geral](./technical-review.md) define sua consolidação. Se este arquivo estiver ausente, registre a limitação, não presuma seus critérios.

## Escopo e autoridade

A prioridade do template é a camada transversal: identidade, sessões, autorização, isolamento, auditoria, configuração e infraestrutura. BUSINESS representa domínio da aplicação derivada, não obriga implementação clínica. ARCH é contexto; ADMIN é papel.

Consulte as instruções aplicáveis (como `.agent/` se presente), [auth-spec](../../../docs/auth-spec.md), [ADRs](../../../docs/adr/), manifests, workflows e [relatórios](../reports/README.md). Resolva os caminhos a partir deste arquivo; comandos partem da raiz confirmada do repositório. Não presuma upstream, diretório ou aplicação em execução a partir do nome do template.

Memória, ADR, relatório e código têm funções diferentes. Registre conflitos entre contrato e implementação; não altere decisões para fazer uma auditoria passar. Premissas propostas, incluindo D01–D03 de auth-spec enquanto assim identificadas, não são decisões aprovadas.

Relatórios antigos são históricos. Contagem de testes, presença de arquivo, match de regex e nome de role não comprovam segurança. Armazenamento de JWT em memória reduz persistência, mas não elimina XSS; igualdade em busca por hash no banco não é automaticamente comparação insegura de senha. Verifique o mecanismo real e registre interpretações de regras amplas de criptografia/tipagem sem enfraquecê-las silenciosamente.

Reutilize evidências anteriores somente após comparar commit, hashes/diff do working tree relevante, testes, configuração sanitizada, dependências, schema e artefato/instância. Mesmo commit ou mesmo dia não implica mesma base. Cite a execução original, a disponibilidade do artefato e o motivo de sua aplicabilidade; marque como evidência reaproveitada, não como teste reexecutado. Se houver alteração relevante, contradição ou evidência indisponível, revalide o cenário ou declare não revalidado. Uma solicitação explícita de repetir todos os testes prevalece sobre a otimização de reaproveitamento, respeitando os limites de execução.

## Rastreabilidade desde a análise original

Construa uma matriz ponto histórico → projeto/base de origem → cenário/ID → prompt responsável → evidência atual → estado. Inclua a análise Fable se disponível no contexto ou nos registros locais e os retestes disponíveis, sem inventar resultados ou recuperar detalhes não disponíveis. O OpenClinic original, o template e uma aplicação derivada são alvos distintos: não transfira bugs de pacientes ou decisões FHIR automaticamente entre eles. Registre ausências e itens fora do escopo, preservando os critérios transversais aprendidos.

Não considere encerrados R01–R10 apenas porque A01–A03 passaram: recupere cada ID com o relatório de origem (IDs podem se repetir). Lacunas de ACL, isolamento, configuração, entrega de recuperação e auditoria exigem evidência própria.

## Pré-condições e execução segura

1. Registre data/fuso, raiz, commit, branch, alterações rastreadas e arquivos novos relevantes. Para working tree modificado, capture manifesto/diff ou hashes dos arquivos testados sem incluir secrets.
2. Identifique runtime, dependências já disponíveis, scripts e efeitos colaterais antes de executar. Fonte local e processo publicado são evidências distintas; informe como a versão da instância foi identificada.
3. Auditar não autoriza refatorar aplicação, alterar configuração operacional, incrementar versão, fazer deploy ou commit. Produza recomendações; implemente somente se houver autorização específica no escopo da tarefa.
4. Não leia valores reais de secrets nem os inclua em comandos, logs ou relatórios. Se uma varredura revelar dado sensível, registre apenas localização e categoria, com valor omitido.
5. Testes que mutam dados usam fixtures sintéticas e alvo descartável confirmado. Login demo somente em ambiente de homologação autorizado; não redefina senha nem bloqueie contas existentes para comprovar falhas.
6. Nunca execute migrations, clone/restore, seed, carga ou smoke de implantação contra alvo desconhecido. Loopback sozinho não prova que o banco é descartável. Confirme identidade, propriedade dos recursos e limpeza restrita aos criados pela execução.
7. Não execute automaticamente scripts de repositórios de referência. Não instale ferramentas, modifique serviços ou publique artefatos para completar uma auditoria sem autorização correspondente.
8. Preserve alterações locais. Exportadores OpenAPI e builds podem escrever arquivos: use destino temporário ou checkout isolado quando necessário; não sobrescreva o contrato do mantenedor nem restaure seus arquivos por Git.
9. Registre indisponibilidades e prossiga nas verificações independentes. Não transforme timeout, comando ausente, parse inesperado ou teste ignorado em aprovação.

Tokens adversariais devem ser assinados exclusivamente com chave sintética de uma instância de teste sob controle da auditoria. Não extraia a chave ativa da aplicação nem use identidades reais para fabricar JWTs. Capturas HTTP/HAR e navegador devem omitir Authorization, Cookie, Set-Cookie e dados pessoais. Observe também a autorização aplicável ao uso de navegador.

## Evidência e classificação

Para cada verificação, registre comando/procedimento, ambiente/alvo, expectativa, resultado observado, exit code, contadores e referência ao artefato sanitizado. Separe:

- revisão estática;
- teste unitário ou injeção HTTP com mocks;
- teste HTTP contra a instância;
- navegador;
- integração PostgreSQL;
- build/imagem final/deployment descartável.

Resultados de cópia temporária corrigida não substituem os originais. Falha de fixture significa lógica ainda não alcançada. Chamadas simultâneas com pool de uma conexão podem serializar o cenário; declare conexões, barreiras e ordem forçada. Não confunda replay sequencial com corrida.

Use eixos independentes:

| Eixo | Valores e significado |
| --- | --- |
| Resultado | Passou, falhou, bloqueado, não executado, não aplicável com justificativa |
| Evidência | Confirmado por execução ou inspeção direta delimitada; indício estático; não verificado |
| Severidade | Crítica, alta, média, baixa ou não relacionada à segurança; justifique impacto técnico, pré-condições e alcance |
| Prioridade | P0 contenção imediata; P1 antes da próxima entrega afetada; P2 evolução planejada; P3 melhoria de manutenção |
| Confiança | Alta, média ou baixa, com fundamento e incerteza residual |

Não use P0–P5 como nomes de áreas e simultaneamente como severidade. Regras estruturais de segurança e arquitetura devem ser denominadas "Invariantes Fundamentais", reservando P0–P3 exclusivamente para a prioridade temporal do plano de ação corretivo. Um build quebrado pode bloquear entrega (Prioridade P1) sem ser vulnerabilidade crítica de segurança. Contagens e notas agregadas não compensam falhas de controles obrigatórios; evite nota numérica sem rubrica, cobertura e denominador explícitos.

## Integridade do auditor e melhoria dos prompts

Inspecione também o runner de compliance, quando existir: nome de gate, implementação, evidência e conclusão devem corresponder. Parse de JSON não prova drift OpenAPI; busca de poucas strings não prova DIP; exit code zero de ajuda não prova CLI offline; suíte com skips não prova os cenários omitidos. Não atribua pareceres a especialistas ou agentes que não participaram, nem publique conclusões de segurança pré-escritas como resultado medido.

O relatório deve distinguir novo teste, evidência reaproveitada e cenário ausente, com totais coerentes e durações medidas. Falha obrigatória deve impedir aprovação do seu gate e propagar exit code de falha no runner/CI; requisito obrigatório bloqueado torna a conclusão correspondente inconclusiva. Execução rápida só aprova o subconjunto explicitado. Não sobrescreva relatório da mesma data nem deduza aprovação integral da ausência de falha no processo.

Ao concluir cada auditoria, registre ambiguidades, redundâncias, critérios ausentes e falsos positivos/negativos do prompt: trecho afetado → evidência da limitação → ajuste proposto → validação esperada. Consolide regras comuns neste protocolo e preserve critérios específicos em seus prompts. A auditoria recomenda esses ajustes; só os aplica quando autorizado.

## Visualização e Diagramas Mermaid

Sempre que diagramas de fluxo, arquitetura ou transição de estados forem apresentados nos relatórios e na documentação, utilize blocos cercados por três crases, com `mermaid` após a cerca de abertura, válidos que renderizem visualmente o gráfico. Siga as regras de parser do Mermaid: use aspas em rótulos contendo caracteres especiais ou parênteses, evite HTML inline em nós e assegure identificadores sintaticamente válidos para garantir a exibição gráfica sem erros em renderizadores compatíveis.

## Formato de saída obrigatório

Grave relatório em `infra/compliance/reports/YYYY-MM-DD-<escopo>-HHmmss.md` (onde `HHmmss` representa a hora, minuto e segundo no fuso local, tal como `2026-09-14-complete-architecture-review-194400.md`), usando sufixo incremental caso ocorra colisão no mesmo segundo. Não sobrescreva relatórios históricos. Referências internas devem ser links relativos portáveis; identificação pública do projeto não deve expor caminhos de máquina ou dados privados.

Inclua:

1. Objetivo, base exata, escopo, fontes, contratos aplicáveis e limitações.
2. Matriz de verificações com expectativa, observação, método e resultado.
3. Achados: ID, problema, arquivo/linha, causa, reprodução/evidência, impacto e pré-condições, severidade, prioridade, confiança, correção recomendada, dependências e teste/critério de aceite.
4. Matriz histórica: achado anterior → contrato atual → evidência nova → corrigido/reaberto/pendente/não revalidado.
5. Plano por fases com responsável sugerido, dependências e conclusão verificável.
6. Relação de artefatos gerados e efeitos realizados, sem secrets.

Conclua “aprovado no escopo verificado”, “com pendências” ou “inconclusivo”, justificando. Não prometa segurança completa nem cobertura exaustiva. Um cenário obrigatório não executado não passa. Não recomende implementar módulos clínicos para concluir autenticação.

## Catálogo local e runner

Consulte [scenarios/catalog.json](../scenarios/catalog.json), as [regras de manutenção](../scenarios/README.md) e o [guia de comandos](../README.md). Use IDs estáveis nos achados e na matriz de cobertura. Valide referências com `npm run compliance -- catalog validate`. O runner registra gates e vínculos, mas não aprova cenários por associação nem gera pareceres técnicos fixos. Para novos módulos, siga o [prompt de manutenção](./scenario-catalog-maintenance.md).

## Política de estágio inicial

O projeto ainda não tem versões em produção. Use contratos canônicos e remova aliases, wrappers e caminhos mantidos apenas por retrocompatibilidade; atualize consumidores e referências na mesma alteração. Não imponha expand/contract ou suporte a releases antigas sem necessidade concreta. Diferencie isso de compatibilidade entre componentes atuais, suporte a ambientes e integridade dos dados: migrations registradas e controles de backup não são aliases de API. Não recrie nem altere bancos como efeito implícito da auditoria.
