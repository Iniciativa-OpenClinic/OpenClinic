export interface AvailabilityInput {
  unit_id: string;
  practitioner_id?: string | null;
  room_id?: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  timezone: string;
  valid_from: string;
  valid_until?: string | null;
  notes?: string | null;
}

export type AvailabilityVersionInput = Pick<AvailabilityInput, 'valid_from'> &
  Partial<Pick<AvailabilityInput, 'day_of_week' | 'start_time' | 'end_time' | 'slot_duration_minutes' | 'valid_until' | 'notes'>>;

export interface Availability extends AvailabilityInput {
  id: string;
  tenant_id: string;
  series_id: string;
  replaces_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface AvailabilityListOptions {
  offset: number;
  limit: number;
  unit_id?: string;
  practitioner_id?: string;
  room_id?: string;
  on_date?: string;
}

export interface AvailabilityRepository {
  list(options: AvailabilityListOptions): Promise<{ items: Availability[]; total: number }>;
  getById(id: string): Promise<Availability | null>;
  history(id: string, options: { offset: number; limit: number }): Promise<{ items: Availability[]; total: number } | null>;
  create(input: AvailabilityInput): Promise<Availability>;
  version(id: string, input: AvailabilityVersionInput): Promise<Availability | null>;
  softDelete(id: string): Promise<boolean>;
}
