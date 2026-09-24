export interface PatientInput {
  full_name: string;
  cpf?: string | null;
  cns?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  insurance_name?: string | null;
  insurance_number?: string | null;
  allergies_notes?: string | null;
}

export interface Patient extends PatientInput {
  id: string;
  tenant_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// The caller supplies a repository scoped to the authorized tenant.
export interface PatientRepository {
  list(options: { offset: number; limit: number }): Promise<{ items: Patient[]; total: number }>;
  getById(id: string): Promise<Patient | null>;
  create(input: PatientInput): Promise<Patient>;
  update(id: string, input: Partial<PatientInput>): Promise<Patient | null>;
  softDelete(id: string): Promise<void>;
}


