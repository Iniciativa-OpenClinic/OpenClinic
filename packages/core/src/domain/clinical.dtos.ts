export type PatientGender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';

export interface PatientDTO {
  id: string;
  tenant_id: string;
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
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface CreatePatientDTO {
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

export type PractitionerType =
  | 'PHYSICIAN'
  | 'NURSE'
  | 'PHYSIOTHERAPIST'
  | 'PSYCHOLOGIST'
  | 'DENTIST'
  | 'PHARMACIST'
  | 'NUTRITIONIST'
  | 'ADMINISTRATIVE'
  | 'OTHER';

export interface PractitionerDTO {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  full_name: string;
  cpf?: string | null;
  practitioner_type: string;
  job_title?: string | null;
  council_type?: string | null;
  council_number?: string | null;
  council_uf?: string | null;
  primary_specialty?: string | null;
  phone?: string | null;
  email?: string | null;
  is_clinical_staff: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface CreatePractitionerDTO {
  full_name: string;
  cpf?: string | null;
  practitioner_type?: string;
  job_title?: string | null;
  council_type?: string | null;
  council_number?: string | null;
  council_uf?: string | null;
  primary_specialty?: string | null;
  phone?: string | null;
  email?: string | null;
  is_clinical_staff?: boolean;
}

export type EncounterStatus =
  | 'PLANNED'
  | 'ARRIVED'
  | 'TRIAGED'
  | 'IN_PROGRESS'
  | 'ON_LEAVE'
  | 'FINISHED'
  | 'CANCELLED';

export interface EncounterDTO {
  id: string;
  tenant_id: string;
  patient_id: string;
  practitioner_id: string;
  appointment_id?: string | null;
  start_time: Date;
  end_time?: Date | null;
  status: string;
  chief_complaint?: string | null;
  diagnosis?: string | null;
  clinical_notes?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface EncounterSummaryDTO {
  id: string;
  start_time: Date;
  end_time?: Date | null;
  status: string;
  chief_complaint?: string | null;
  diagnosis?: string | null;
  clinical_notes?: string | null;
  patient_id: string;
  patient_name: string;
  practitioner_id: string;
  practitioner_name: string;
  specialty?: string | null;
}

export interface CreateEncounterDTO {
  patient_id: string;
  practitioner_id: string;
  appointment_id?: string | null;
  chief_complaint?: string | null;
  diagnosis?: string | null;
  clinical_notes?: string | null;
}

export interface HealthPlanDTO {
  id: string;
  name: string;
  ans_code?: string | null;
  tiss_version?: string | null;
  payment_term_days?: number | null;
  is_active: boolean;
}

export interface ProcedureDTO {
  id: string;
  tuss_code: string;
  description: string;
  specialty?: string | null;
  base_price_cents?: number | null;
  estimated_duration_minutes?: number | null;
  is_active: boolean;
}
