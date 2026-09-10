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
10. [Deploy em Produção (Portainer / Docker Swarm)](#-deploy-em-produção-portainer--docker-swarm)
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
                        │   openclinic-postgres (PostgreSQL 17 Alpine)     │
                        │   Volume Persistente: openclinic_data            │
                        └──────────────────────────────────────────────────┘
```

| Container | Imagem Base | Porta Exposta | Função |
| :--- | :--- | :--- | :--- |
| **`openclinic-postgres`** | `postgres:17-alpine` | `5432:5432` | Banco de dados relacional com isolamento de roles (Owner DDL / App DML) |
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

### Detalhamento das Variáveis do `.env`

```env
# Conexão da aplicação backend em tempo de execução (role com permissões DML)
DATABASE_URL=postgresql://openclinic_app:temp1234@localhost:5432/openclinic

# Conexão de governança/migrações (role com privilégios DDL)
DATABASE_OWNER_URL=postgresql://openclinic_owner:temp1234@localhost:5432/openclinic

# Chave secreta de assinatura dos tokens JWT (mínimo de 32 caracteres)
JWT_SECRET_KEY=openclinic-dev-only-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Parâmetros de rede do servidor HTTP da API
APP_HOST=0.0.0.0
APP_PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

> ⚠️ **Atenção (Segurança P0):** Em ambientes compartilhados ou produtivos, altere obrigatoriamente a chave `JWT_SECRET_KEY` e a senha do banco `temp1234`!

---

## 🚀 Passo 3: Inicialização da Stack

Execute o comando do Docker Compose na raiz do projeto para compilar as imagens e iniciar os containers em segundo plano:

```bash
docker compose up --build -d
```

O Docker realizará:

1. Download da imagem oficial do `postgres:17-alpine`.
2. Compilação multi-stage da API Backend (`docker/Dockerfile`).
3. Compilação multi-stage do Frontend Webapp (`docker/Dockerfile.webapp`).
4. Criação da rede virtual `openclinic_network` e do volume persistente `openclinic_data`.
5. Inicialização ordenada e monitorada por healthchecks.

Para verificar se todos os containers estão saudáveis (`healthy`):

```bash
docker compose ps
```

Saída esperada:

```text
NAME                  IMAGE                    COMMAND                  SERVICE   STATUS                    PORTS
openclinic-postgres   postgres:17-alpine       "docker-entrypoint.s…"   db        Up (healthy)              0.0.0.0:5432->5432/tcp
openclinic-api        openclinic-api:latest    "docker-entrypoint.s…"   api       Up (healthy)              0.0.0.0:3000->3000/tcp
openclinic-webapp     openclinic-webapp:latest "/docker-entrypoint.…"   webapp    Up (healthy)              0.0.0.0:80->80/tcp
```

---

## 🗄 Passo 4: Provisionamento Automatizado do Banco de Dados

Na inicialização de um volume vazio, o PostgreSQL executa apenas `000-roles.sql` para provisionar roles e grants. O serviço separado `migrate` aplica as migrations de estrutura e catálogo, e a API aguarda sua conclusão bem-sucedida.

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
| **Healthcheck da API** | [**`http://localhost:3000/health`**](http://localhost:3000/health) | Endpoint de diagnóstico e monitoramento do status da API |

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

## 🚢 Deploy em Produção (Portainer / Docker Swarm)

Para ambientes de produção com suporte a alta disponibilidade, terminação TLS/HTTPS automática com Let's Encrypt e orquestração Docker Swarm, o OpenClinic disponibiliza uma stack dedicada:

- **Arquivo da Stack:** [`stacks/openclinic-production.yml`](../stacks/openclinic-production.yml)
- **Variáveis da Stack:** [`stacks/openclinic-production.env.example`](../stacks/openclinic-production.env.example)
- **Imagens Oficiais no Docker Hub:**
  - `openclinic/openclinic-webapp:latest`
  - `openclinic/openclinic-api:latest`

### Passos de Instalação no Portainer

1. Acesse o **Portainer** → **Stacks** → **Add Stack**.
2. Cole o conteúdo de `stacks/openclinic-production.yml`.
3. Defina as variáveis de ambiente utilizando o modelo `stacks/openclinic-production.env.example`.
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
