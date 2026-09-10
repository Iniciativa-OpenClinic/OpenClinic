import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { type JwtConfig, UserRole, ValidationError } from '@openclinic/core';
import type { UnitOfWork } from '../arch/infrastructure/database/uow.js';
import { createAuthenticateJwt } from '../arch/presentation/middlewares/authenticate-jwt.js';
import { requireRole } from '../arch/presentation/middlewares/require-permission.js';
import { SecurityBearer, StandardErrorResponses } from '../arch/presentation/openapi.schemas.js';
import { ListPatientsUseCase } from './application/list-patients.use-case.js';
import { CreatePatientUseCase } from './application/create-patient.use-case.js';
import { ListPractitionersUseCase } from './application/list-practitioners.use-case.js';
import { ListEncountersUseCase } from './application/list-encounters.use-case.js';
import type { CreatePatientDTO } from '@openclinic/core';

export function registerClinicalRoutes(
  app: FastifyInstance,
  uow: UnitOfWork,
  jwtConfig: JwtConfig
): void {
  const authenticateJwt = createAuthenticateJwt(jwtConfig);

  const listPatientsUseCase = new ListPatientsUseCase(uow.patients);
  const createPatientUseCase = new CreatePatientUseCase(uow.patients);
  const listPractitionersUseCase = new ListPractitionersUseCase(uow.practitioners);
  const listEncountersUseCase = new ListEncountersUseCase(uow.encounters);

  // ══════════════════════════════════════════════════════════════
  // 1. PATIENTS (app_patients - HL7 FHIR Patient Aligned)
  // ══════════════════════════════════════════════════════════════

  const listPatientsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (req as unknown as { user?: { tenant_id?: string } }).user?.tenant_id;
      const patients = await listPatientsUseCase.execute(tenantId);
      return reply.status(200).send(patients);
    } catch (err) {
      req.log.error(err, 'Failed to list patients');
      return reply.status(500).send({
        type: 'https://openclinic.local/errors/internal',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to retrieve patients from database',
      });
    }
  };

  app.get(
    '/api/v1/clinical/patients',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.USER)],
      schema: {
        tags: ['Clínico: Pacientes (FHIR)'],
        summary: 'Listar Pacientes',
        description: 'Retorna a lista de pacientes ativos cadastrados na clínica.',
        security: SecurityBearer,
        response: {
          200: {
            description: 'Lista de pacientes',
            type: 'array',
          },
          ...StandardErrorResponses,
        },
      },
    },
    listPatientsHandler
  );
  app.get('/api/clinical/patients', { preHandler: [authenticateJwt, requireRole(UserRole.USER)] }, listPatientsHandler);

  const createPatientHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = (req.body ?? {}) as CreatePatientDTO;
      const tenantId = (req as unknown as { user?: { tenant_id?: string } }).user?.tenant_id ?? 'default-tenant';

      const created = await createPatientUseCase.execute(body, tenantId);
      return reply.status(201).send(created);
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply.status(400).send({
          type: 'https://openclinic.local/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: err.message,
        });
      }
      req.log.error(err, 'Failed to create patient');
      return reply.status(500).send({
        type: 'https://openclinic.local/errors/internal',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to create patient in database',
      });
    }
  };

  app.post(
    '/api/v1/clinical/patients',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.USER)],
      schema: {
        tags: ['Clínico: Pacientes (FHIR)'],
        summary: 'Cadastrar Novo Paciente',
        description: 'Cadastra um novo paciente no banco de dados.',
        security: SecurityBearer,
        response: {
          201: {
            description: 'Paciente cadastrado com sucesso',
            type: 'object',
          },
          ...StandardErrorResponses,
        },
      },
    },
    createPatientHandler
  );
  app.post('/api/clinical/patients', { preHandler: [authenticateJwt, requireRole(UserRole.USER)] }, createPatientHandler);

  // ══════════════════════════════════════════════════════════════
  // 2. PRACTITIONERS (app_practitioners - HL7 FHIR Practitioner)
  // ══════════════════════════════════════════════════════════════

  const listPractitionersHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (req as unknown as { user?: { tenant_id?: string } }).user?.tenant_id;
      const practitioners = await listPractitionersUseCase.execute(tenantId);
      return reply.status(200).send(practitioners);
    } catch (err) {
      req.log.error(err, 'Failed to list practitioners');
      return reply.status(500).send({
        type: 'https://openclinic.local/errors/internal',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to retrieve practitioners from database',
      });
    }
  };

  app.get(
    '/api/v1/registries/practitioners',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.USER)],
      schema: {
        tags: ['Cadastros: Profissionais (FHIR)'],
        summary: 'Listar Profissionais de Saúde',
        description: 'Retorna a equipe médica, assistencial e administrativa.',
        security: SecurityBearer,
        response: {
          200: {
            description: 'Lista de profissionais',
            type: 'array',
          },
          ...StandardErrorResponses,
        },
      },
    },
    listPractitionersHandler
  );
  app.get('/api/registries/practitioners', { preHandler: [authenticateJwt, requireRole(UserRole.USER)] }, listPractitionersHandler);

  // ══════════════════════════════════════════════════════════════
  // 3. ENCOUNTERS & APPOINTMENTS (app_encounters - HL7 FHIR Encounter)
  // ══════════════════════════════════════════════════════════════

  const listEncountersHandler = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = (req as unknown as { user?: { tenant_id?: string } }).user?.tenant_id;
      const encounters = await listEncountersUseCase.execute(tenantId);
      return reply.status(200).send(encounters);
    } catch (err) {
      req.log.error(err, 'Failed to list encounters');
      return reply.status(500).send({
        type: 'https://openclinic.local/errors/internal',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to retrieve encounters from database',
      });
    }
  };

  app.get(
    '/api/v1/clinical/encounters',
    {
      preHandler: [authenticateJwt, requireRole(UserRole.USER)],
      schema: {
        tags: ['Clínico: Atendimentos (FHIR)'],
        summary: 'Listar Atendimentos e Consultas',
        description: 'Retorna atendimentos clínicos com dados de pacientes e profissionais vinculados.',
        security: SecurityBearer,
        response: {
          200: {
            description: 'Lista de atendimentos',
            type: 'array',
          },
          ...StandardErrorResponses,
        },
      },
    },
    listEncountersHandler
  );
  app.get('/api/clinical/encounters', { preHandler: [authenticateJwt, requireRole(UserRole.USER)] }, listEncountersHandler);
}
