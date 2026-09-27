# Catálogo local de cenários

A fonte canônica é [catalog.json](./catalog.json), em UTF-8. O catálogo descreve requisitos e cobertura; resultados pertencem aos relatórios de execução. Não armazene um status permanente de “teste passou” aqui.

## Estrutura e ciclo de vida

Cada cenário possui ID estável, módulo, título, prioridade, obrigatoriedade, método, aplicabilidade, fontes locais, pré-condições, passos, resultados esperados, limpeza e mapeamento de testes por arquivo/título/gate. A descrição é PT-BR; chaves, IDs e comandos são em inglês.

- `draft`: rascunho incompleto, excluído de execução/cobertura ativa.
- `active`: requisito revisado e aplicável; não significa teste aprovado.
- `retired`: requisito descontinuado, preservado para rastreabilidade. Não reutilize seu ID.

Os métodos distinguem unit, http, postgres, browser, manual e distribution. Cada referência de teste informa cobertura parcial ou integral. O runner atual relaciona suites e cenários, mas não interpreta asserções individuais: sempre registra NOT_VERIFIED por cenário, mesmo quando gates relacionados passam. O relatório técnico deve completar essa avaliação com evidências.

## Consultar e manter

Execute na raiz do clone:

```bash
npm run compliance -- catalog list --scope auth,sessions
npm run compliance -- catalog validate
npm run compliance -- catalog new --module scheduling --id SCH-CREATE-001 --title "Criar agendamento"
npm run compliance -- guide --task catalog --scope all
```

Um módulo novo pode ser cadastrado pelo comando de rascunho. Complete o cenário e revise seu contrato antes de mudar para active. Adicione testes e associe o gate em [config.json](../config.json); uma referência ausente ou título divergente invalida o catálogo. Os títulos são pistas verificáveis de vínculo, não prova de cobertura integral.

Para mudança incompatível de requisito, preserve o cenário anterior como retired e crie novo ID com referência à decisão. Alterações de implementação não exigem trocar IDs. Revise lacunas a cada PR que muda comportamento, especialmente autenticação/autorização.

## Escopo inicial

O catálogo começa com 29 cenários de autenticação, recuperação, sessões, autorização, tenants e infraestrutura/contratos. Esse número é inventário inicial, não meta fixa nem certificação. Os módulos clínicos da aplicação derivada serão acrescentados quando existirem requisitos aprovados. Contratos de autoridade OWNER, MFA e configuração precisam ser confrontados com as decisões atuais; não inferir aprovação só porque há teste correspondente.

Consulte o [prompt de manutenção](../prompts/scenario-catalog-maintenance.md) e o [guia de comandos](../README.md). O perfil integration exige um servidor PostgreSQL descartável explicitamente configurado e autorizado; não carrega credenciais da aplicação por conveniência.
