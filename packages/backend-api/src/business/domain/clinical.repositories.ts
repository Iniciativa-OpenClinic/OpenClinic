import type {
  PatientDTO,
  CreatePatientDTO,
  PractitionerDTO,
  CreatePractitionerDTO,
  EncounterSummaryDTO,
  CreateEncounterDTO,
  EncounterDTO,
} from '@openclinic/core';

export interface IPatientRepository {
  listActive(tenantId?: string): Promise<PatientDTO[]>;
  getById(id: string, tenantId?: string): Promise<PatientDTO | null>;
  create(data: CreatePatientDTO & { id: string; tenant_id: string }): Promise<PatientDTO>;
}

export interface IPractitionerRepository {
  listActive(tenantId?: string): Promise<PractitionerDTO[]>;
  getById(id: string, tenantId?: string): Promise<PractitionerDTO | null>;
  create(data: CreatePractitionerDTO & { id: string; tenant_id: string }): Promise<PractitionerDTO>;
}

export interface IEncounterRepository {
  listSummaries(tenantId?: string): Promise<EncounterSummaryDTO[]>;
  getById(id: string, tenantId?: string): Promise<EncounterDTO | null>;
  create(data: CreateEncounterDTO & { id: string; tenant_id: string }): Promise<EncounterDTO>;
}
