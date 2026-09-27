# 💻 @openclinic/frontend-webapp

> Aplicação Web Single Page (SPA) moderna do **OpenClinic**, construída com **React 19**, **TypeScript**, **Vite 6** e **React Router 7**.

---

## 🌟 Funcionalidades Implementadas

### 🔐 1. Tela de Acesso & Segurança

- **Identificação Flexível:** Login por **Nome de Usuário ou E-mail**.
- **Visualização de Senha:** Ícones vetoriais SVG monocromáticos e discretos (`EyeIcon` / `EyeOffIcon`).
- **Acessibilidade & Produtividade no Teclado:**
  - Fluxo natural com a tecla `Tab` direto do campo de senha para o botão *"Entrar na Conta"*.
  - Submissão instantânea ao teclar `Enter` nos inputs.
  - O link *"Esqueci a senha"* fica posicionado abaixo do input à direita com `tabIndex={-1}` (não intercepta tabs).
- **Recuperação de Senha:** Fluxo de solicitação de token simulado com tela de redefinição de senha.

### 📊 2. Dashboard & Sidebar Dinâmica (RBAC)

- **Menu Adaptativo:** Renderizado a partir do endpoint `/api/v1/auth/menu`, filtrando seções conforme o papel:
  - **USER:** Dados do Perfil, Alterar Senha, Ajuda & Suporte.
  - **ADMIN:** (Menus de USER) + Configurações Operacionais, Usuários & Grupos.
  - **OWNER:** (Menus de USER e ADMIN) + Configurações do Sistema, Gestão de Tenants.
- **Gestão de Sessão Segura:** JWT mantido **exclusivamente em memória** via `AuthContext` (sem armazenamento vulnerável em `localStorage`).
- **Renovação de Sessão:** Botão de teste para *Refresh Token* com rotação atômica.

### 👥 3. Painel de Usuários & Grupos (Aba Admin/Owner)

- Tabela dinâmica com lista de usuários, status, papéis e data de cadastro.
- **Cadastrar Novo Usuário:** Formulário modal com validação de hierarquia RBAC.
- **🔑 Alterar Senha de Usuário:** O Administrador/Owner define imediatamente uma nova senha provisória para qualquer colaborador.
- **🔓 Desbloquear Acesso:** Desativa o bloqueio decorrente de excesso de tentativas falhas de login.
- **Ativar / Desativar:** Controle de acesso instantâneo da conta.

### 💬 4. Central de Ajuda & Suporte

- Documentação dos pilares técnicos do OpenClinic.
- Formulário de abertura de chamado com geração de protocolo (`TKT-XXXX`).

---

## 📁 Estrutura de Pastas

```text
packages/frontend-webapp/
├── public/
│   ├── favicon.png         # Ícone oficial da aplicação
│   └── logo.png            # Logo oficial do OpenClinic
├── src/
│   ├── assets/             # Recursos estáticos
│   ├── components/
│   │   └── EyeIcons.tsx    # Ícones SVG monocromáticos de visibilidade de senha
│   ├── contexts/
│   │   └── AuthContext.tsx # Provedor de autenticação e estado de sessão em memória
│   ├── hooks/
│   │   └── useAuth.ts      # Hook customizado de acesso ao AuthContext
│   ├── pages/
│   │   ├── LoginPage.tsx   # Tela de login, recuperação e redefinição de senha
│   │   └── DashboardPage.tsx # Painel principal com sidebar RBAC e módulos
│   ├── services/
│   │   └── api.ts          # Cliente HTTP com interceptors e suporte a pt-BR
│   ├── types/
│   │   └── auth.ts         # Tipos TypeScript de usuário, tokens e menus
│   ├── App.tsx             # Roteamento e guards de autenticação
│   └── main.tsx            # Ponto de montagem React DOM
├── index.html              # HTML base com meta tags e favicon
├── vite.config.ts          # Configuração do Vite (Proxy para http://localhost:3000)
└── package.json
```

---

## 🚀 Execução & Desenvolvimento

```bash
# Iniciar o servidor de desenvolvimento Vite (localhost:5173)
npm run dev:webapp

# Compilar para produção (TypeScript + Vite Build)
npm run build:webapp
```
