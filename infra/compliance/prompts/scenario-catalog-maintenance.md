# Manutenção do catálogo local de cenários

Atue como revisor de requisitos e testes. Leia o [protocolo](./audit-protocol.md), o [catálogo](../scenarios/catalog.json), suas [regras](../scenarios/README.md) e os prompts especializados locais.

## Objetivo

Evoluir o catálogo junto com o projeto sem depender de histórico da conversa, Appserver ou agentes externos. Preserve IDs, decisões e rastreabilidade. O foco inicial é autenticação/autorização; módulos novos entram conforme contratos aprovados.

## Procedimento

1. Confirme base Git, alterações locais, módulos presentes e escopo solicitado.
2. Compare requisitos/ADRs atuais com código e testes. Diferencie contrato aprovado, proposta e implementação divergente.
3. Para cada comportamento novo ou alterado, proponha casos positivos, negativos, limites, autorização, isolamento, concorrência, falhas parciais e cleanup conforme risco.
4. Consulte IDs existentes antes de criar. Não duplique a mesma regra por arquivo/tela. Uma mudança de implementação mantém o ID; substituição incompatível aposenta o cenário com rastreabilidade.
5. Preencha todos os campos de catalog.json. Fontes são caminhos relativos à raiz; testes precisam de arquivo e título exatos, gate e avaliação de cobertura. Não conclua cobertura plena por nome de teste.
6. Marque lacunas com tests vazio e coverageNote objetiva. Novos rascunhos ficam draft, nunca active para melhorar indicadores. Não esconda requisitos anunciados como não aplicáveis.
7. Quando autorizado a atualizar o catálogo, altere somente arquivos pertinentes, preserve mudanças do mantenedor e valide com `npm run compliance -- catalog validate`. Sem autorização de edição, apresente proposta concreta.
8. Registre relatório de mudanças em infra/compliance/reports com data/hora e nome único: IDs adicionados/alterados/aposentados, fontes, vínculos de testes, lacunas, prioridades e validação.

## Critérios de conclusão

IDs únicos e estáveis; módulos registrados; fontes locais existentes; passos reproduzíveis e resultados observáveis; fixtures sintéticas; testes realmente relacionados; zero aprovação histórica embutida. Os cenários devem funcionar como especificação em uma aplicação derivada, sem branding funcional fixo.

O runner prepara rascunhos e pacotes de prompts; ele não chama IA nem escreve asserções automaticamente. Não invente resultados, não execute contra produção e não altere testes apenas para acomodar comportamento incorreto.
