/**
 * openapi.schemas.ts
 * Reusable JSON Schemas for Fastify OpenAPI route documentation & Swagger UI.
 */

export const ProblemDetailsSchema = {
  $id: 'ProblemDetails',
  type: 'object',
  description: 'Standardized application error structure adhering to RFC 7807',
  properties: {
    type: { type: 'string', description: 'URI identifier for the error type' },
    title: { type: 'string', description: 'Human-readable summary of the error' },
    status: { type: 'integer', description: 'HTTP status code' },
    detail: { type: 'string', description: 'Detailed and localized error description' },
    code: { type: 'string', description: 'Unique application error code (e.g. ERR_AUTH_INVALID_CREDENTIALS)' },
    instance: { type: 'string', description: 'URI of the endpoint where the error occurred' },
    invalid_params: {
      type: 'array',
      description: 'List of parameters that failed validation',
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
    description: 'Bad request or validation failure (RFC 7807)',
    ...ProblemDetailsRef,
  },
  401: {
    description: 'Unauthenticated or invalid/expired token (RFC 7807)',
    ...ProblemDetailsRef,
  },
  403: {
    description: 'Forbidden — Insufficient role or permissions (RFC 7807)',
    ...ProblemDetailsRef,
  },
  404: {
    description: 'Resource not found (RFC 7807)',
    ...ProblemDetailsRef,
  },
  500: {
    description: 'Internal server error (RFC 7807)',
    ...ProblemDetailsRef,
  },
};

export const SecurityBearer = [
  {
    BearerAuth: [],
  },
];

/**
 * Creates a standard OpenAPI JSON schema matching ActionResponseDTO<T>.
 */
export function createActionResponseSchema(
  dataSchema?: Record<string, unknown>,
  description = 'Action executed successfully'
) {
  const dataDef = dataSchema
    ? 'type' in dataSchema
      ? dataSchema
      : { type: 'object', properties: dataSchema }
    : undefined;

  return {
    description,
    type: 'object',
    properties: {
      code: { type: 'string' },
      message: { type: 'string' },
      ...(dataDef ? { data: dataDef } : {}),
    },
    required: ['code', 'message'],
  };
}
