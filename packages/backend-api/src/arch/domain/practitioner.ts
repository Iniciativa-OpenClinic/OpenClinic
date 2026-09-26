export interface PractitionerInput {
  full_name: string;
  practitioner_type: string;
  job_title?: string | null;
  council_type?: string | null;
  council_number?: string | null;
  council_uf?: string | null;
  primary_specialty?: string | null;
  is_clinical_staff?: boolean;
  cpf?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface Practitioner extends PractitionerInput {
  id: string;
  user_id?: string | null;
  tenant_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// The caller supplies a repository scoped to the authorized tenant.
export interface PractitionerRepository {
  list(options: { offset: number; limit: number }): Promise<{ items: Practitioner[]; total: number }>;
  getById(id: string): Promise<Practitioner | null>;
  create(input: PractitionerInput): Promise<Practitioner>;
  update(id: string, input: Partial<PractitionerInput>): Promise<Practitioner | null>;
  softDelete(id: string): Promise<void>;
}


