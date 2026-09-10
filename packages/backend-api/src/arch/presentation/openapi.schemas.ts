/**
 * openapi.schemas.ts
 * Reusable JSON Schemas for Fastify OpenAPI route documentation & Swagger UI.
 */

export const ProblemDetailsSchema = {
  $id: 'ProblemDetails',
  type: 'object',
  description: 'Estrutura padronizada de erros da aplicação no padrão RFC 7807',
  properties: {
    type: { type: 'string', description: 'URI identificadora do tipo de erro' },
    title: { type: 'string', description: 'Resumo legível do erro' },
    status: { type: 'integer', description: 'Código de status HTTP' },
    detail: { type: 'string', description: 'Descrição detalhada e traduzida do erro' },
    code: { type: 'string', description: 'Código unívoco de erro da aplicação (ex: ERR_AUTH_INVALID_CREDENTIALS)' },
    instance: { type: 'string', description: 'URI do endpoint onde ocorreu o erro' },
    invalid_params: {
      type: 'array',
      description: 'Lista de parâmetros com falha de validação',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
  required: ['title', 'status', 'detail', 'code'],
};

export const ProblemDetailsRef = {
  $ref: 'ProblemDetails#',
};

export const StandardErrorResponses = {
  400: {
    description: 'Requisição inválida ou erro de validação (RFC 7807)',
    ...ProblemDetailsRef,
  },
  401: {
    description: 'Não autenticado ou token inválido/expirado (RFC 7807)',
    ...ProblemDetailsRef,
  },
  403: {
    description: 'Acesso negado — Permissão ou Role insuficiente (RFC 7807)',
    ...ProblemDetailsRef,
  },
  404: {
    description: 'Recurso não encontrado (RFC 7807)',
    ...ProblemDetailsRef,
  },
  500: {
    description: 'Erro interno do servidor (RFC 7807)',
    ...ProblemDetailsRef,
  },
};

export const SecurityBearer = [
  {
    BearerAuth: [],
  },
];
