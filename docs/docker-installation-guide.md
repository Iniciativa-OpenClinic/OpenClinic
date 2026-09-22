# 🐳 Manual de Instalação e Execução Local via Docker — OpenClinic

> Banco versionado: o procedimento vigente de instalação, adoção, migrations, demonstração opcional e clonagem está no [guia de operação do banco](../infra/database/README.md). O SQL mestre e o seed Docker foram substituídos por migrations; exemplos históricos de bootstrap abaixo não devem ser usados para atualizar bancos existentes.

Este documento é o guia oficial e definitivo para baixar, configurar e executar a plataforma **OpenClinic** localmente utilizando **Docker** e **Docker Compose**.

---

## 📑 Índice

1. [Visão Geral da Arquitetura de Containers](#-visão-geral-da-arquitetura-de-containers)
2. [Pré-requisitos](#-pré-requisitos)
3. [Passo 1: Clonar o Repositório](#-passo-1-clonar-o-repositório)
4. [Passo 2: Configuração de Variáveis de Ambiente](#-passo-2-configuração-de-variáveis-de-ambiente)
5. [Passo 3: Inicialização da Stack](#-passo-3-inicialização-da-stack)
6. [Passo 4: Provisionamento Automatizado do Banco de Dados](#-passo-4-provisionamento-automatizado-do-banco-de-dados)
7. [Passo 5: URLs de Acesso e Serviços](#-passo-5-urls-de-acesso-e-serviços)
8. [Passo 6: Credenciais de Acesso Padrão](#-passo-6-credenciais-de-acesso-padrão)
9. [Operação e Comandos Úteis do Docker](#-operação-e-comandos-úteis-do-docker)
10. [Deploy em Produção (Portainer / Docker Swarm / VPS)](#-deploy-em-produção-portainer--docker-swarm--vps)
11. [Resolução de Problemas (Troubleshooting & FAQ)](#-resolução-de-problemas-troubleshooting--faq)

---

## 🏛 Visão Geral da Arquitetura de Containers

A stack do **OpenClinic** é composta por três serviços desacoplados e orquestrados via rede interna Docker (`openclinic_network`):

```text
                               ┌────────────────────────────────────────┐
                               │           Navegador Web (Host)         │
                               └──────────────────┬─────────────────────┘
                                                  │
                                                  ▼
                        ┌──────────────────────────────────────────────────┐
                        │           Porta 80 (HTTP)                        │
                        │   openclinic-webapp (Nginx Alpine + React 19)    │
                        └─────────────────────────┬────────────────────────┘
                                                  │ Proxy Reverso (/api/v1)
                                                  ▼
                        ┌──────────────────────────────────────────────────┐
                        │           Porta 3000 (HTTP)                      │
                        │   openclinic-api (Node 20 Alpine + Fastify 5.x)  │
                        └─────────────────────────┬────────────────────────┘
                                                  │ Pool de Conexões DML/DDL
                                                  ▼
                        ┌──────────────────────────────────────────────────┐
                        │           Porta 5432 (TCP)                       │
                        │   openclinic-db (PostgreSQL 17 Alpine)           │
                        │   Volume Persistente: openclinic_postgres_data   │
                        └──────────────────────────────────────────────────┘
```

| Container | Imagem Base | Porta Exposta | Função |
| :--- | :--- | :--- | :--- |
| **`openclinic-db`** | `postgres:17-alpine` | `5432:5432` | Banco de dados relacional com isolamento de roles (Owner DDL / App DML) |
| **`openclinic-api`** | `node:20-alpine` (multi-stage) | `3000:3000` | Backend REST Fastify com Clean Architecture, Argon2id e JWT |
| **`openclinic-webapp`** | `nginx:alpine` (multi-stage) | `80:80` | Frontend SPA React 19 compilado via Vite e servido com Nginx |

---

## 💻 Pré-requisitos

Antes de iniciar, certifique-se de possuir instalado em sua máquina:

1. **Git:** Para clonar o repositório ([Download Git](https://git-scm.com/)).
2. **Docker Engine & Docker Compose:**
   - **Windows e macOS:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (com WSL 2 ativado no Windows).
   - **Linux:** Docker Engine + Docker Compose Plugin (`docker-compose-plugin`).
3. **Hardware Recomendado:**
   - Mínimo de **4 GB de RAM** disponível.
   - Pelo menos **5 GB de espaço livre em disco**.

> 💡 **Nota:** Você **não precisa** ter Node.js, NPM ou PostgreSQL instalados diretamente em seu computador para rodar a stack com Docker. Todos os compiladores, dependências e servidores executam de forma isolada dentro dos containers.

---

## 📥 Passo 1: Clonar o Repositório

Abra seu terminal (PowerShell, Bash ou Zsh) e clone o repositório:

```bash
git clone https://github.com/Iniciativa-OpenClinic/OpenClinic.git openclinic
cd openclinic
```

---

## ⚙ Passo 2: Configuração de Variáveis de Ambiente

O projeto já inclui um arquivo de ambiente padrão pronto para uso (`.env.example`). Crie sua cópia local `.env`:

### Linux / macOS

```bash
cp .env.example .env
```

#### Windows (PowerShell)

```powershell
Copy-Item .env.example .env
```

##### Windows (CMD)

```cmd
copy .env.example .env
```

### Detalhamento das Variáveis do `.env` & Arquitetura de Secrets

O OpenClinic adota uma arquitetura agnóstica de **Secrets Provider** com estrita observância ao Princípio do Menor Privilégio (**PoLP**):

```env
# ============================================================
# 🐘 1. CONFIGURAÇÃO DIRETA ATÔMICA (SECRETS_PROVIDER=env)
# ============================================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=openclinic
DB_USER=openclinic_app
DB_PASS="sua-senha-de-desenvolvimento"

# Chave criptográfica de assinatura dos tokens JWT (mínimo de 32 caracteres)
JWT_KEY="gere-uma-chave-aleatoria-criptograficamente-segura-min-32-chars"

# ============================================================
# 🔐 2. ARQUITETURA DE PROVEDOR DE SECRETS (Provider Pattern)
# ============================================================
# Provedor ativo: 'env', 'file', 'gsm' (Google Secret Manager) ou 'aws' (AWS Secrets Manager)
SECRETS_PROVIDER=env

# Identificadores lógicos de secrets (resolvidos em 'file', 'gsm' ou 'aws'):
DB_APP_SECRET_NAME=database-secret-app
DB_OWNER_SECRET_NAME=database-secret-owner
JWT_SECRET_NAME=jwt-secret
SECRETS_DIR=./secrets

# ============================================================
# 🌐 3. PARÂMETROS DO SERVIDOR HTTP (API)
# ============================================================
APP_HOST=0.0.0.0
APP_PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

#### 🛡 Invariantes de Segurança nas Credenciais

1. **Zero Hardcoded `DATABASE_URL`**: A string de conexão completa `DATABASE_URL` **nunca** é persistida no arquivo `.env`. A aplicação e o CLI a sintetizam dinamicamente em memória a partir dos componentes atômicos.
2. **Isolamento de Roles de Banco (PoLP)**:
   - **Runtime da API (`openclinic_app`)**: Permissões estritamente restritas a DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Sem privilégios de DDL ou superuser.
   - **Migrações e Governança (`openclinic_owner`)**: Permissões de DDL para criação/alteração de tabelas e schemas. Utilizado exclusivamente pelo container de migrações ou tarefas CLI administrativas via `DB_OWNER_SECRET_NAME`.
   Para simular o ambiente de containers ou orquestradores (Swarm/K8s), copie os templates de `secrets/*.example.*` para seus respectivos arquivos reais (`secrets/*.json` e `secrets/*.txt`). Consulte a especificação completa em [**`secrets/README.md`**](../secrets/README.md).

> ⚠️ **Atenção (Segurança P0):** Em ambientes de homologação ou produção, altere obrigatoriamente a `JWT_KEY` e as senhas das roles `openclinic_app` e `openclinic_owner`!

---

## 🚀 Passo 3: Inicialização da Stack

O OpenClinic oferece duas formas de inicialização: o **Assistente Automatizado Interativo** (recomendado para desenvolvedores) ou os comandos manuais do Docker Compose.

### Opção A: Via Assistente Interativo (Recomendado — 1 Comando)

O assistente verifica automaticamente os pré-requisitos (Docker CLI, Docker Daemon ativo, Compose v2 e portas livres), inicializa os segredos locais se necessário, sobe os containers monitorando o healthcheck e executa o provisionamento do banco:

```bash
# Via NPM (multiplataforma)
npm run setup

# Ou diretamente pelo terminal:
.\setup.ps1    # No Windows (PowerShell)
./setup.sh     # No Linux ou macOS (Bash)
```

O assistente apresentará um menu interativo com confirmação a cada passo:

1. **Quickstart Local Completo:** Sobe a stack unificada local (`openclinic-db-api-webapp-local.yml`), pergunta se você quer provisionar apenas o **Superadmin** ou incluir os **dados de demonstração/teste**, aguarda o banco e finaliza o setup.
2. **Produção VPS Standalone:** Sobe `openclinic-db-api-webapp.yml` (para VPS única com Traefik e HTTPS automático).
3. **Apenas Banco de Dados:** Sobe `openclinic-db.yml` (porta 5432).
4. **Apenas Aplicação:** Sobe `openclinic-api-webapp.yml`.
5. **Gerador de Secrets:** Exibe comandos prontos para criação de secrets no Docker Swarm / Portainer.
6. **Parar Containers / Limpar Stacks:** Finaliza containers locais ou de produção.

---

### Opção B: Via Docker Compose Direto

Caso prefira gerenciar os containers manualmente via CLI:

```bash
# 1. Subir a stack unificada local (compila a partir do código-fonte)
docker compose -f infra/docker/stacks/openclinic-db-api-webapp-local.yml up --build -d

# 2. Provisionar o banco de dados (migrações + superadmin inicial)
npm run db:setup
# (ou para incluir massa de dados de teste: npm run cli -- db:setup --demo)
```

Para verificar se todos os containers estão saudáveis (`healthy`):

```bash
docker compose -f infra/docker/stacks/openclinic-db-api-webapp-local.yml ps
```

Saída esperada:

```text
NAME                  IMAGE                    COMMAND                  SERVICE   STATUS                    PORTS
openclinic-db         postgres:17-alpine       "docker-entrypoint.s…"   postgres  Up (healthy)              0.0.0.0:5432->5432/tcp
openclinic-api        openclinic-api:latest    "node packages/backen…"  api       Up (healthy)              0.0.0.0:3000->3000/tcp
openclinic-webapp     openclinic-webapp:latest "/docker-entrypoint.…"   webapp    Up (healthy)              0.0.0.0:80->80/tcp
```

---

## 🗄 Passo 4: Provisionamento Automatizado do Banco de Dados

Na inicialização de um volume vazio, o PostgreSQL executa `000-roles.sh` para provisionar roles e grants dinamicamente com base nas variáveis do `.env`. O serviço separado `migrate` aplica as migrations de estrutura e catálogo, e a API aguarda sua conclusão bem-sucedida.

As contas e os dados de demonstração são opcionais: em uma base sem dados operacionais, execute `npm run db:seed -- --demo` com a conexão local configurada. Para uma instalação sem demonstração, crie a conta inicial com `npm run user:create-admin`.

Volumes antigos exigem verificação e adoção da baseline antes da atualização. Consulte o [guia de operação](../infra/database/README.md); não remova volumes para atualizar um banco com dados.

---

## 🌐 Passo 5: URLs de Acesso e Serviços

Após a subida dos containers, acesse os serviços pelo navegador:

| Serviço | URL de Acesso | Descrição |
| :--- | :--- | :--- |
| **Frontend Webapp** | [**`http://localhost`**](http://localhost) | Interface gráfica completa do sistema clínico e administrativo |
| **Backend REST API** | [**`http://localhost:3000`**](http://localhost:3000) | Endpoints REST da API Fastify |
| **Swagger UI Interativo** | [**`http://localhost:3000/docs`**](http://localhost:3000/docs) | Documentação interativa OpenAPI 3.0 / 3.1 com teste de endpoints |
| **Healthcheck da API** | [**`http://localhost:3000/health/live`**](http://localhost:3000/health/live) | Endpoint de diagnóstico e monitoramento do status da API |

> 📖 **Guia do Swagger UI**: Para instruções detalhadas sobre como autenticar via Bearer Token JWT e testar rotas protegidas diretamente no navegador, consulte o [**Guia do Swagger UI Interativo**](./openapi/swagger.md) e o [**Hub de Contratos OpenAPI**](./openapi/README.md).

---

## 🔑 Passo 6: Credenciais de Acesso Padrão

Todas as contas foram configuradas com a senha padrão de teste: **`temp1234`**

| Papel (RBAC) | Usuário (Username) | CPF de Acesso | E-mail Institucional | Perfil / Cargo | Responsabilidades |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`USER`** | **`ana.souza`** | `444.555.666-19` | `ana@clinica.com.br` | Atendente de Recepção | Agendamentos, marcações, cadastro de pacientes e faturamento |
| **`USER`** | **`marta.lima`** | `333.444.555-08` | `marta@clinica.com.br` | Enfermeira Chefe | Triagem, acolhimento, prontuário e evolução |
| **`USER`** | **`mateus.oliveira`** | `222.333.444-05` | `mateus@clinica.com.br` | Médico Cardiologista | Consultas clínicas, prescrições, PEP e agenda |
| **`USER`** | **`marcos.ferreira`** | `111.222.333-96` | `marcos@clinica.com.br` | Diretor Clínico / RT | Gestão clínica, indicadores, prontuários e consultas |
| **`ADMIN`** | **`lucas.santos`** | `987.654.321-00` | `lucas@clinica.com.br` | Administrador de Sistemas | Gestão de contas, grupos, permissões e configurações |
| **`OWNER`** | **`joao.silva`** | `123.456.789-09` | `joao@clinica.com.br` | Superadministrador / Proprietário | Governança institucional, multi-tenancy e auditoria |

---

## 🛠 Operação e Comandos Úteis do Docker

### Visualizar Logs dos Serviços

```bash
# Ver logs de todos os containers juntos (streaming)
docker compose logs -f

# Ver logs apenas da API Backend
docker compose logs -f api

# Ver logs apenas do Frontend Webapp
docker compose logs -f webapp

# Ver logs apenas do Banco de Dados
docker compose logs -f db
```

### Reiniciar Serviços

```bash
# Reiniciar todos os serviços
docker compose restart

# Reiniciar apenas a API
docker compose restart api
```

### Parar os Serviços

```bash
# Para a execução preservando os dados do banco
docker compose down
```

### Reset Completo do Banco de Dados

Caso você queira apagar todos os dados e recriar o banco do zero (executando novamente os scripts de schema e seed):

```bash
docker compose down -v
docker compose up -d
```

> ⚠️ O comando `docker compose down -v` remove o volume `openclinic_data`, descartando todos os registros cadastrados!

### Acessar o Banco PostgreSQL Diretamente pelo Terminal

```bash
docker compose exec db psql -U openclinic_owner -d openclinic
```

---

## 🔐 Arquitetura Secrets-First & Conformidade LGPD / HIPAA

Por ser um sistema de gestão em saúde voltado a clínicas médicas, o OpenClinic manipula dados altamente sensíveis de pacientes (prontuários, laudos e histórico clínico). Em estrita conformidade com a **LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018, Art. 46)** e o padrão internacional de segurança **HIPAA Security Rule (§ 164.312)**, o projeto adota o padrão **Secrets-First**:

1. **Eliminação de Parâmetros e Credenciais no `.env` da Aplicação:** Arquivos `.env` das stacks de aplicação contêm exclusivamente metadados de orquestração (portas HTTP, domínios e identificadores de segredos). Parâmetros do banco de dados (host, porta, nome do banco, usuário e senha) são completamente desconsiderados do `.env` da aplicação, residindo de forma 100% encapsulada no payload JSON do secret.
2. **Ambiente Local (Desenvolvedor / Docker Desktop):**
   - Ao executar `npm run setup`, o script lê os templates da pasta `./secrets/*.example.*` e inicializa os arquivos locais de credenciais em `./secrets/` (protegidos pelo `.gitignore`).
   - A stack local monta a pasta `./secrets` como volume somente leitura (`/app/secrets:ro`).
   - O desenvolvedor não precisa criar segredos manuais no Docker Desktop: a aplicação consome os arquivos montados automaticamente.
3. **Ambiente VPS / Produção (Docker Swarm / Portainer):**
   - Os segredos são gerenciados nativamente pelo Docker Swarm criptografados em repouso no cluster e injetados em memória (`/run/secrets/`).
   - Para registrar os segredos no Swarm a partir da máquina VPS, utilize o gerador interativo:

     ```bash
     npm run setup -- --secrets
     ```

     Ou crie diretamente a partir dos arquivos locais:

     ```bash
     docker secret create openclinic-prod-app-postgres-credentials ./secrets/openclinic-prod-app-postgres-credentials.json
     docker secret create openclinic-prod-owner-postgres-credentials ./secrets/openclinic-prod-owner-postgres-credentials.json
     printf 'SUA_SENHA_FORTE_POSTGRES' | docker secret create openclinic-prod-postgres-password -
     docker secret create openclinic-prod-jwt-secret ./secrets/openclinic-prod-jwt-secret.txt
     ```

---

## 🚢 Deploy em Produção (Portainer / Docker Swarm / VPS)

Para produção, o OpenClinic oferece duas topologias oficiais pré-configuradas:

### Topologia A: VPS Única / Clínica Pequena (Produção Standalone VPS)

Ideal para consultórios ou clínicas de pequeno e médio porte em uma única VPS (ex: Hetzner, Contabo, DigitalOcean, AWS Lightsail de 2 vCPUs e 4GB RAM). Roda o banco, backend e frontend com HTTPS automático via Traefik. A porta 5432 do PostgreSQL fica isolada internamente (não aberta na internet).

- **Arquivo da Stack:** [`infra/docker/stacks/openclinic-db-api-webapp.yml`](../infra/docker/stacks/openclinic-db-api-webapp.yml)
- **Variáveis da Stack:** [`infra/docker/stacks/openclinic-db-api-webapp.env.example`](../infra/docker/stacks/openclinic-db-api-webapp.env.example)
- **Comando de Deploy:**

  ```bash
  docker stack deploy -c infra/docker/stacks/openclinic-db-api-webapp.yml openclinic
  # ou via Docker Compose Standalone na VPS:
  docker compose -f infra/docker/stacks/openclinic-db-api-webapp.yml up -d
  ```

---

### Topologia B: Produção Desacoplada Enterprise (Multi-Node / Swarm)

Para clínicas maiores, hospitais ou redes com múltiplos servidores, onde a persistência do banco é isolada dos nós de aplicação stateless:

- **Stack da Aplicação (Fastify + React com réplicas):** [`infra/docker/stacks/openclinic-api-webapp.yml`](../infra/docker/stacks/openclinic-api-webapp.yml)
- **Variáveis da Aplicação:** [`infra/docker/stacks/openclinic-api-webapp.env.example`](../infra/docker/stacks/openclinic-api-webapp.env.example)
- **Stack do Banco Dedicado (Fase 2 - Operacional):** [`infra/docker/stacks/openclinic-db.yml`](../infra/docker/stacks/openclinic-db.yml)
- **Stack de Bootstrap Inicial (Fase 1 - Efêmera):** [`infra/docker/stacks/openclinic-db-init.yml`](../infra/docker/stacks/openclinic-db-init.yml)
- **Variáveis do Bootstrap:** [`infra/docker/stacks/openclinic-db-init.env.example`](../infra/docker/stacks/openclinic-db-init.env.example)

> [!WARNING]
> **Segurança Mandatória em Produção / VPS / Servidor Remoto:**
> Enquanto em desenvolvimento local o banco suporta inicialização com senha vazia (`DB_PASS=`) e `POSTGRES_HOST_AUTH_METHOD=trust` para máxima fluidez, **em qualquer ambiente remoto, VPS ou produção é TERMINANTEMENTE PROIBIDO deixar a senha em branco ou usar trust**.
>
> 1. Na stack de bootstrap inicial (`openclinic-db-init`), defina uma senha forte para o superusuário `postgres` na variável `DB_PASS`.
> 2. Configure obrigatoriamente `POSTGRES_HOST_AUTH_METHOD=scram-sha-256`.
> 3. Após o container de bootstrap finalizar a inicialização do volume, ele é descartado e você sobe a stack operacional (`openclinic-db.yml`), que opera sem senhas no YAML.

### Passos de Instalação no Portainer

1. Acesse o **Portainer** → **Stacks** → **Add Stack**.
2. Cole o conteúdo da stack escolhida (`openclinic-db-api-webapp.yml` para VPS única ou `openclinic-api-webapp.yml` para cluster desacoplado).
3. Defina as variáveis de ambiente utilizando o modelo `.env.example` correspondente.
4. Clique em **Deploy the stack**.

---

## 🔍 Resolução de Problemas (Troubleshooting & FAQ)

### 1. Conflito de Porta: `bind: address already in use` (Porta 80, 3000 ou 5432)

- **Causa:** Outro serviço local (ex: IIS, Apache, Postgres local) está usando a porta.
- **Solução:** No arquivo `docker-compose.yml`, você pode alterar a porta exposta do lado esquerdo do mapeamento. Por exemplo, para expor o webapp na porta `8080`:

  ```yaml
  ports:
    - "8080:80"
  ```

  O acesso passará a ser em `http://localhost:8080`.

### 2. O Frontend abre, mas a tela de login exibe erro ao autenticar

- **Causa:** O container da API ainda está iniciando ou não conseguiu conectar ao PostgreSQL.
- **Solução:**
  1. Verifique o status com `docker compose ps`.
  2. Verifique os logs da API com `docker compose logs api`.
  3. Garanta que o PostgreSQL terminou a execução dos scripts de inicialização.

### 3. As tabelas ou usuários não foram criados

- **Causa:** O PostgreSQL já havia sido inicializado anteriormente com um volume vazio. O PostgreSQL só executa os scripts da pasta `/docker-entrypoint-initdb.d/` na **primeira vez** em que o volume de dados é criado.
- **Solução:** Execute o reset do volume:

  ```bash
  docker compose down -v
  docker compose up -d
  ```

---

## 📜 Licença e Suporte

O OpenClinic é um software livre distribuído sob a licença **GNU Affero General Public License v3.0 (AGPL-3.0)**.
Dúvidas e contribuições podem ser enviadas abrindo uma *Issue* ou *Pull Request* no repositório oficial.

## Docker Swarm Secrets

O template aceita secrets montados por arquivo para API e CLI. A stack de produção usa `SECRETS_PROVIDER=file`; seus parâmetros recebem nomes de secrets externos, sem os valores de senha ou JWT. Antes de atualizar, construa a imagem compatível e siga o [contrato, ensaio local e procedimento de operação](../infra/secrets/secrets-architecture.md).
