# 🏛 Parecer Técnico e Decisão Arquitetural (ADR)

## Seleção de Camada de Acesso a Dados: Drizzle ORM vs. Prisma

> **Documento de Alinhamento e Defesa para o Comitê Open Source do OpenClinic**  
> **Status:** Aprovado / Vigente (Manutenção do Drizzle ORM)  
> **Data:** Agosto / 2026  
> **Autores:** Especialistas de Arquitetura e Engenharia de Backend  
> **Público-Alvo:** Mantenedores, Engenheiros de Software, Líderes de Comunidade e Gestores de Projeto.

---

## 1. 🎯 Sumário Executivo (Pitch de 1 Minuto)

O **OpenClinic** utiliza o **Drizzle ORM** com driver nativo PostgreSQL (`postgres`).

Enquanto o **Prisma** foi pioneiro em tipagem em Node.js por meio de uma abordagem baseada em binários compilados em Rust e uma linguagem própria (`.prisma`), o **Drizzle ORM** representa a evolução do ecossistema TypeScript moderno:

1. **100% TypeScript Nativo:** Sem compiladores ou motores externos intermediários.
2. **Performance Próxima ao SQL Nativo:** Zero overhead de comunicação entre processos (IPC).
3. **Consumo Mínimo de Recursos:** Footprint de ~30 KB contra dezenas de megabytes do Prisma.
4. **Alinhamento Open Source:** Independente de serviços proprietários em nuvem e telemetrias.

### Recomendação Oficial dos Especialistas:** **Manter e consolidar o Drizzle ORM no OpenClinic

---

## 2. 📊 Quadro Comparativo Direto

| Critério de Avaliação | Drizzle ORM (Atual no OpenClinic) | Prisma ORM | Impacto Estratégico no OpenClinic |
| :--- | :--- | :--- | :--- |
| **Arquitetura de Execução** | **TypeScript Nativo puro** (zero dependências de binários). | **Engine em Rust** executando em segundo plano via IPC. | Menor consumo de RAM/CPU; build universal e imune a problemas de compilação C/Rust. |
| **Definição de Schemas** | **TypeScript puro** (`drizzle-schema.ts`), modular e divisível em múltiplos arquivos. | **Linguagem própria (DSL)** em arquivo único `schema.prisma`. | Tipos inferidos automaticamente; sem necessidade de rodar `prisma generate` a cada branch. |
| **Throughput & Performance** | **Próximo ao SQL puro** (gera queries diretas e previsíveis). | **Mais lento** (overhead de tradução do motor Rust e subqueries em memória). | Respostas mais rápidas em prontuários eletrônicos (PEP), triagens e relatórios com alto volume. |
| **Controle de Consultas SQL** | **Total**. Suporte nativo a CTEs, Joins complexos, Window Functions e agregações. | **Limitado**. Força o uso de `$queryRaw` para escapar das limitações da API. | Flexibilidade para consultas clínicas avançadas, auditorias e relatórios analíticos. |
| **Tamanho do Pacote (Footprint)** | **~30 KB** (ultra leve). | **~30 MB a 100 MB+** (devido aos binários multiplataforma). | Imagens Docker muito menores, deploys rápidos e menor consumo de tráfego. |
| **Cold Start / Inicialização** | **Instantâneo** (< 5ms). | **Lento** (dezenas a centenas de ms para carregar o binário Rust). | Reinicializações instantâneas de serviços e facilidade em arquiteturas serverless/containers. |
| **Interface Visual (GUI)** | Drizzle Studio (`drizzle-kit studio`). | Prisma Studio (`npx prisma studio`). | Ambos oferecem painel web visual e moderno para inspecionar e editar dados. |
| **Migrações de Banco** | SQL puro gerado e versionado (`drizzle-kit generate / migrate`). | Sistema proprietário de migração com shadow databases. | Facilidade de auditoria por DBAs e execução segura em pipelines de produção. |
| **Filosofia & Governança** | Biblioteca 100% aberta, focada em padrões web e SQL. | Empresa comercial com foco em monetização de nuvem proprietária (*Prisma Accelerate / Pulse*). | Total conformidade com a autonomia e liberdade da comunidade *Open Source*. |

---

## 3. 🛠 Defesa Técnica para Engenheiros e Arquitetos

### 3.1 TypeScript Puro vs. DSL e Geração de Código Intermediária

- **No Drizzle:** Os schemas são objetos e tipos TypeScript reais ([drizzle-schema.ts](../packages/backend-api/src/arch/infrastructure/database/drizzle-schema.ts)). Se uma coluna é renomeada ou seu tipo é alterado, o compilador do TypeScript aponta o erro instantaneamente em todos os repositórios.
- **No Prisma:** O arquivo `.prisma` exige a execução contínua de `prisma generate` para recriar o `@prisma/client`. Em monorepos e ambientes com múltiplos desenvolvedores, isso costuma gerar conflitos de tipagem desincronizada e locks de arquivos no Windows.

### 3.2 Previsibilidade de Queries e Eliminação de Problemas N+1

- O Drizzle segue o lema *"If you know SQL, you know Drizzle"*. Não há mágica oculta: o desenvolvedor tem visão exata de cada `INNER JOIN`, `LEFT JOIN` ou subquery gerada.
- O Prisma frequentemente decompõe queries relacionais complexas em múltiplas consultas sequenciais ou agregações em memória, o que pode causar degradação severa de performance em tabelas clínicas com grande volume de dados.

### 3.3 Pipeline de CI/CD e Docker sem Atritos de Binários

- No Prisma, para construir imagens Docker multiplataforma (ex: desenvolvimento em macOS/Windows e produção em Linux Alpine/Debian), é necessário configurar `binaryTargets` e instalar bibliotecas de sistema como `openssl` e `musl`.
- No Drizzle, o código é puramente interpretado pelo runtime Node.js/TSX, tornando as imagens Docker minimalistas, seguras e com menor superfície de vulnerabilidades.

---

## 4. 💼 Defesa Estratégica para Gestão e Membros Não Técnicos

### 4.1 Redução de Custos de Hospedagem para Clínicas e Hospitais

- O OpenClinic foi projetado para rodar tanto em grandes hospitais quanto em pequenas clínicas comunitárias com infraestrutura modesta ou servidores locais de baixo custo.
- O baixo consumo de memória RAM e CPU do Drizzle garante que o sistema execute com estabilidade em instâncias enxutas (economizando custos de nuvem e hardware).

### 4.2 Facilidade de Contribuição para a Comunidade Open Source

- Novos contribuidores não precisam aprender uma linguagem de esquema proprietária (DSL do Prisma). Qualquer desenvolvedor com conhecimento padrão em SQL e TypeScript torna-se imediatamente produtivo.

### 4.3 Independência Tecnológica e Sustentabilidade a Longo Prazo

- O projeto permanece 100% desacoplado de ecossistemas comerciais que tentam induzir o uso de serviços gerenciados em nuvem.

---

## 5. 🛡 Guia Rápido de Respostas a Objeções (FAQ da Reunião)

### 💬 Objeção 1: *"O Prisma é mais maduro e possui mais estrelas no GitHub."*

> **Argumento:**  
> O Prisma é mais antigo (2019) e foi essencial para popularizar a tipagem de dados em Node.js. No entanto, o ecossistema moderno evoluiu, e o Drizzle consolidou-se como o novo padrão da indústria justamente para superar as limitações de performance, tamanho de pacote e complexidade de compilação Rust do Prisma.

#### 💬 Objeção 2: *"O Prisma tem o Prisma Studio para visualizar tabelas no navegador."*

> **Argumento:**  
> O Drizzle possui o **Drizzle Studio** integrado (`npx drizzle-kit studio`), que disponibiliza uma interface web idêntica e moderna para explorar, filtrar e manipular os dados do banco sem custo adicional.

#### 💬 Objeção 3: *"Migrar o banco de dados com Drizzle é confiável?"*

> **Argumento:**  
> Sim. O `drizzle-kit` gera arquivos `.sql` puros, legíveis e versionáveis no Git. Isso oferece maior segurança técnica para ambientes hospitalares, permitindo que administradores de banco de dados (DBAs) revisem e aprovem o SQL antes da execução.

---

## 6. 🏆 Parecer Final e Conclusão

1. **Aderência Arquitetural Plena:** A base de dados do OpenClinic já está implementada e validada com Drizzle ORM, padrão Repositories e Unit of Work.
2. **Sem Débito Técnico ou Retrabalho:** A substituição pelo Prisma traria degradação de performance, aumento de complexidade de build e retrabalho desnecessário.
3. **Decisão:** **Ratificar o Drizzle ORM como a camada oficial de persistência de dados do OpenClinic.**
