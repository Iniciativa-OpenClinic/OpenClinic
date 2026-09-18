# Relatórios de Conformidade e Auditoria

Este diretório armazena os relatórios de conformidade e auditorias técnicas geradas sob demanda pelas ferramentas de compliance do projeto.

## Geração de Relatórios

Para gerar relatórios e pareceres atualizados da base de código:

```bash
# Execução do menu interativo de compliance
npm run compliance

# Preparar parecer consolidado de conformidade
npm run compliance:report

# Verificação estrita de gates locais
npm run compliance:quick
```

> **Política de Versionamento:** Relatórios gerados em formato Markdown (`*.md`) são transitórios e locais, sendo ignorados pelo controle de versão Git (`.gitignore`) para evitar ruído e atrito em pull requests. As especificações de cenários canônicos residem no catálogo [`infra/compliance/scenarios/catalog.json`](../scenarios/catalog.json).
