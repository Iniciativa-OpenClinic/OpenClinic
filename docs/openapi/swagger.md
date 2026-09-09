# 🖥 Guia do Swagger UI Interativo — OpenClinic PEP

> **URL Local**: [http://localhost:3000/docs](http://localhost:3000/docs)  
> **Backend Engine**: `@fastify/swagger` + `@fastify/swagger-ui`  
> **Especificação Base**: OpenAPI 3.0.3 (SSOT)

---

## 1. 🌐 Acesso ao Swagger UI

Quando a API backend estiver em execução (`npm run dev:api` ou `npm run dev -w packages/backend-api`), acesse a documentação interativa pelo navegador:

👉 **[http://localhost:3000/docs](http://localhost:3000/docs)**

A interface gráfica do Swagger UI permite:

- Explorar todos os endpoints disponíveis na API divididos por tags funcionais.
- Inspecionar schemas completos de requisição (JSON Schema / DTOs), campos obrigatórios e parâmetros de query/path.
- Testar chamadas HTTP diretamente pelo navegador (*Try it out*).
- Verificar o formato exato das respostas de sucesso (200, 201, 204) e erros padronizados (400, 401, 403, 404, 409, 422 - RFC 7807).

---

## 2. 🔐 Como Autenticar no Swagger UI (*Authorize*)

Muitos endpoints da API (especialmente sob `/api/v1/iam/*`) exigem autenticação via token Bearer JWT. Para testá-los no Swagger UI:

### Passo a Passo

1. **Obtenha o Token de Acesso**:
   - No Swagger UI, abra o endpoint `POST /api/v1/auth/login`.
   - Clique em **Try it out**.
   - Insira as credenciais de um usuário (por exemplo, o administrador do sistema):

     ```json
     {
       "identifier": "admin@openclinic.local",
       "password": "SuaSenhaSegura123!"
     }
     ```

   - Clique em **Execute**.
   - Na resposta 200, copie o valor do campo `accessToken`.

2. **Ative a Autorização Global**:
   - Role até o topo da página do Swagger UI e clique no botão verde **Authorize** (com ícone de cadeado 🔓).
   - No campo de valor para `bearerAuth`, cole o token no formato:

     ```text
     Bearer <seu-access-token>
     ```

     *(ou simplesmente o token JWT, dependendo da formatação do campo)*.

   - Clique em **Authorize** e depois em **Close**.

3. **Execução de Rotas Protegidas**:
   - O cadeado passará a exibir o ícone fechado 🔒.
   - Agora você pode executar qualquer endpoint protegido (ex: `GET /api/v1/iam/users`, `GET /api/v1/auth/profile`) diretamente no navegador.

---

## 3. 🏷 Agrupamento e Tags no Swagger

As rotas da API são organizadas em tags semânticas para facilitar a navegação:

| Tag | Descrição | Endpoints |
| :--- | :--- | :--- |
| **Authentication & Session** | Fluxos de autenticação, perfil, renovação de tokens e logout | `/api/v1/auth/*` |
| **IAM & Access Control** | Gestão de usuários, grupos clínicos, capabilities e permissões | `/api/v1/iam/*` |
| **System Health** | Verificação de integridade e liveness da API | `/health` |

---

## 4. ⚙ Como o Swagger está Configurado no Código

O Swagger no OpenClinic é gerado dinamicamente a partir dos schemas de rota do Fastify, garantindo que o código TypeScript seja sempre o **Single Source of Truth (SSOT)**:

- **Configurações do Swagger**: `packages/backend-api/src/config/swagger.ts`
- **Schemas Reutilizáveis**: `packages/backend-api/src/arch/presentation/openapi.schemas.ts`
- **Registro no App Fastify**: `packages/backend-api/src/app.ts` (habilitado condicionalmente via `enableSwaggerUi`).

---

## 5. 🔗 Links e Recursos Relacionados

- 📖 [Hub da Documentação de Contratos (README.md)](./README.md)
- 📄 [Contrato OpenAPI 3.0.3 em JSON](./openapi.json)
- 📄 [Contrato OpenAPI 3.0.3 em YAML](./openapi.yaml)
