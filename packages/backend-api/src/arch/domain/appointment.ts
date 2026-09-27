export const appointmentStatuses = ['SCHEDULED', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] as const;
export type AppointmentStatus = typeof appointmentStatuses[number];
export interface AppointmentInput {
  patient_id: string;
  procedure_id: string;
  practitioner_id: string;
  unit_id: string;
  room_id?: string | null;
  appointment_date: string;
  duration_minutes?: number;
  is_overbook?: boolean;
  payer_type: 'PARTICULAR';
  source_channel: 'RECEPTION' | 'PHONE' | 'API';
  notes?: string | null;
}
export type AppointmentUpdateInput = Partial<Omit<AppointmentInput, 'source_channel'>>;
export interface Appointment extends Omit<AppointmentInput, 'appointment_date' | 'procedure_id' | 'unit_id' | 'source_channel'> {
  id: string;
  tenant_id: string;
  procedure_id: string | null;
  unit_id: string | null;
  source_channel: string;
  appointment_date: Date;
  duration_minutes: number;
  status: string;
  is_overbook: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
export interface AppointmentFilters {
  offset: number; limit: number;
  patient_id?: string; practitioner_id?: string; unit_id?: string; room_id?: string;
  status?: AppointmentStatus; from?: string; to?: string;
}
export interface AppointmentRepository {
  list(options: AppointmentFilters): Promise<{ items: Appointment[]; total: number }>;
  getById(id: string): Promise<Appointment | null>;
  create(input: AppointmentInput): Promise<Appointment>;
  update(id: string, input: AppointmentUpdateInput): Promise<Appointment | null>;
  changeStatus(id: string, status: AppointmentStatus): Promise<Appointment | null>;
  softDelete(id: string): Promise<boolean>;
}
