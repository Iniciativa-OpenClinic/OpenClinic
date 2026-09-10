import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, desc, asc, and, isNull } from 'drizzle-orm';
import {
  appPatients,
  appPractitioners,
  appEncounters,
} from '../../arch/infrastructure/database/drizzle-schema.js';
import type {
  IPatientRepository,
  IPractitionerRepository,
  IEncounterRepository,
} from '../domain/clinical.repositories.js';
import type {
  PatientDTO,
  CreatePatientDTO,
  PractitionerDTO,
  CreatePractitionerDTO,
  EncounterSummaryDTO,
  CreateEncounterDTO,
  EncounterDTO,
} from '@openclinic/core';

export class PatientRepository implements IPatientRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async listActive(tenantId?: string): Promise<PatientDTO[]> {
    const conditions = [
      eq(appPatients.is_active, true),
      isNull(appPatients.deleted_at),
    ];
    if (tenantId) {
      conditions.push(eq(appPatients.tenant_id, tenantId));
    }

    const rows = await this.db
      .select()
      .from(appPatients)
      .where(and(...conditions))
      .orderBy(asc(appPatients.full_name));

    return rows as unknown as PatientDTO[];
  }

  async getById(id: string, tenantId?: string): Promise<PatientDTO | null> {
    const conditions = [
      eq(appPatients.id, id),
      isNull(appPatients.deleted_at),
    ];
    if (tenantId) {
      conditions.push(eq(appPatients.tenant_id, tenantId));
    }

    const [patient] = await this.db
      .select()
      .from(appPatients)
      .where(and(...conditions))
      .limit(1);

    return (patient as unknown as PatientDTO) ?? null;
  }

  async create(data: CreatePatientDTO & { id: string; tenant_id: string }): Promise<PatientDTO> {
    const newRecord = {
      id: data.id,
      tenant_id: data.tenant_id,
      full_name: data.full_name,
      cpf: data.cpf ?? null,
      cns: data.cns ?? null,
      birth_date: data.birth_date ?? null,
      gender: data.gender ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      emergency_contact: data.emergency_contact ?? null,
      insurance_name: data.insurance_name ?? null,
      insurance_number: data.insurance_number ?? null,
      allergies_notes: data.allergies_notes ?? null,
      is_active: true,
    };

    const [inserted] = await this.db
      .insert(appPatients)
      .values(newRecord as typeof appPatients.$inferInsert)
      .returning();

    return inserted as unknown as PatientDTO;
  }
}

export class PractitionerRepository implements IPractitionerRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async listActive(tenantId?: string): Promise<PractitionerDTO[]> {
    const conditions = [
      eq(appPractitioners.is_active, true),
      isNull(appPractitioners.deleted_at),
    ];
    if (tenantId) {
      conditions.push(eq(appPractitioners.tenant_id, tenantId));
    }

    const rows = await this.db
      .select()
      .from(appPractitioners)
      .where(and(...conditions))
      .orderBy(asc(appPractitioners.full_name));

    return rows as unknown as PractitionerDTO[];
  }

  async getById(id: string, tenantId?: string): Promise<PractitionerDTO | null> {
    const conditions = [
      eq(appPractitioners.id, id),
      isNull(appPractitioners.deleted_at),
    ];
    if (tenantId) {
      conditions.push(eq(appPractitioners.tenant_id, tenantId));
    }

    const [practitioner] = await this.db
      .select()
      .from(appPractitioners)
      .where(and(...conditions))
      .limit(1);

    return (practitioner as unknown as PractitionerDTO) ?? null;
  }

  async create(data: CreatePractitionerDTO & { id: string; tenant_id: string }): Promise<PractitionerDTO> {
    const newRecord = {
      id: data.id,
      tenant_id: data.tenant_id,
      full_name: data.full_name,
      cpf: data.cpf ?? null,
      practitioner_type: data.practitioner_type ?? 'ADMINISTRATIVE',
      job_title: data.job_title ?? null,
      council_type: data.council_type ?? null,
      council_number: data.council_number ?? null,
      council_uf: data.council_uf ?? null,
      primary_specialty: data.primary_specialty ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      is_clinical_staff: data.is_clinical_staff ?? false,
      is_active: true,
    };

    const [inserted] = await this.db
      .insert(appPractitioners)
      .values(newRecord as typeof appPractitioners.$inferInsert)
      .returning();

    return inserted as unknown as PractitionerDTO;
  }
}

export class EncounterRepository implements IEncounterRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async listSummaries(tenantId?: string): Promise<EncounterSummaryDTO[]> {
    const conditions = [
      eq(appEncounters.is_active, true),
      isNull(appEncounters.deleted_at),
      isNull(appPatients.deleted_at),
      isNull(appPractitioners.deleted_at),
    ];
    if (tenantId) {
      conditions.push(eq(appEncounters.tenant_id, tenantId));
    }

    const rows = await this.db
      .select({
        id: appEncounters.id,
        start_time: appEncounters.start_time,
        end_time: appEncounters.end_time,
        status: appEncounters.status,
        chief_complaint: appEncounters.chief_complaint,
        diagnosis: appEncounters.diagnosis,
        clinical_notes: appEncounters.clinical_notes,
        patient_id: appEncounters.patient_id,
        patient_name: appPatients.full_name,
        practitioner_id: appEncounters.practitioner_id,
        practitioner_name: appPractitioners.full_name,
        specialty: appPractitioners.primary_specialty,
      })
      .from(appEncounters)
      .innerJoin(appPatients, eq(appEncounters.patient_id, appPatients.id))
      .innerJoin(appPractitioners, eq(appEncounters.practitioner_id, appPractitioners.id))
      .where(and(...conditions))
      .orderBy(desc(appEncounters.start_time));

    return rows as EncounterSummaryDTO[];
  }

  async getById(id: string, tenantId?: string): Promise<EncounterDTO | null> {
    const conditions = [
      eq(appEncounters.id, id),
      isNull(appEncounters.deleted_at),
    ];
    if (tenantId) {
      conditions.push(eq(appEncounters.tenant_id, tenantId));
    }

    const [encounter] = await this.db
      .select()
      .from(appEncounters)
      .where(and(...conditions))
      .limit(1);

    return (encounter as unknown as EncounterDTO) ?? null;
  }

  async create(data: CreateEncounterDTO & { id: string; tenant_id: string }): Promise<EncounterDTO> {
    const newRecord = {
      id: data.id,
      tenant_id: data.tenant_id,
      patient_id: data.patient_id,
      practitioner_id: data.practitioner_id,
      appointment_id: data.appointment_id ?? null,
      chief_complaint: data.chief_complaint ?? null,
      diagnosis: data.diagnosis ?? null,
      clinical_notes: data.clinical_notes ?? null,
      status: 'IN_PROGRESS',
      is_active: true,
    };

    const [inserted] = await this.db
      .insert(appEncounters)
      .values(newRecord as typeof appEncounters.$inferInsert)
      .returning();

    return inserted as unknown as EncounterDTO;
  }
}
