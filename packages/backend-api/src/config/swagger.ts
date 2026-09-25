import type { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { normalizeOpenApi30 } from './openapi-normalizer.js';

export const swaggerOptions: FastifyDynamicSwaggerOptions = {
  openapi: {
    openapi: '3.0.3',
    info: {
      title: 'OpenClinic — Electronic Health Record (EHR) & Governance API',
      description: 'Open, modular, and auditable Electronic Health Record (EHR) and Clinical Management API with hybrid access control (RBAC + ACL), multi-tenancy, dynamic capabilities resolution, and enterprise security (Argon2id + in-memory JWT).',
      version: process.env['npm_package_version'] ?? '0.1.0',
      contact: {
        name: 'Iniciativa OpenClinic',
        url: 'https://github.com/Iniciativa-OpenClinic/OpenClinic',
      },
      license: {
        name: 'GNU AGPL-3.0',
        url: 'https://www.gnu.org/licenses/agpl-3.0.html',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Current Origin (Domain / Reverse Proxy)',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local Direct Server',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User login, logout, JWT renewal, and password management' },
      { name: 'IAM & Access Control', description: 'Effective capabilities, dynamic navigation trees, and ACL permissions' },
      { name: 'User Management', description: 'User administration, account unlock, role assignment (RBAC), and admin password reset' },
      { name: 'User Groups', description: 'Functional group administration, role inheritance, and member associations' },
      { name: 'Platform & Applications', description: 'System application configuration and public settings' },
      { name: 'Tenants', description: 'Multi-tenancy administration and organization isolation' },
      { name: 'Practitioners', description: 'Practitioner registration, pagination and soft deletion within the authenticated tenant' },
      { name: 'Patients', description: 'Patient registration, pagination and soft deletion within the authenticated tenant' },
      { name: 'Health & Monitoring', description: 'API health check and service status' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer token in Authorization header: `Bearer <token>`',
        },
      },
      schemas: {
        ProblemDetails: {
          type: 'object',
          description: 'RFC 7807 Problem Details error format',
          properties: {
            type: { type: 'string', description: 'Error type URI' },
            title: { type: 'string', description: 'Short summary of the error' },
            status: { type: 'integer', description: 'HTTP status code' },
            detail: { type: 'string', description: 'Detailed human-readable message' },
            code: { type: 'string', description: 'Application error code (e.g., ERR_AUTH_INVALID_CREDENTIALS)' },
            instance: { type: 'string', description: 'Request URI reference' },
            invalid_params: {
              type: 'array',
              description: 'List of schema validation violations',
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
        },
      },
    },
  },
};

export const swaggerUiOptions: FastifySwaggerUiOptions = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
    displayRequestDuration: true,
    filter: true,
    persistAuthorization: true,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  transformSpecification: (swaggerObject) => normalizeOpenApi30(swaggerObject),
  transformSpecificationClone: true,
};
