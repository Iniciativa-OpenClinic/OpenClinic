export interface BlockRecurrence {
  frequency: 'DAILY' | 'WEEKLY';
  interval: number;
  until?: string | null;
}
export interface ScheduleBlockInput {
  unit_id?: string | null;
  practitioner_id?: string | null;
  room_id?: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  reason?: string | null;
  recurrence?: BlockRecurrence | null;
}
export interface ScheduleBlock extends Omit<ScheduleBlockInput, 'starts_at' | 'ends_at'> {
  id: string;
  tenant_id: string;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}
export interface BlockFilters {
  unit_id?: string;
  practitioner_id?: string;
  room_id?: string;
  offset: number;
  limit: number;
}
export interface BlockOccurrenceFilters extends BlockFilters { from: string; to: string; }
export interface BlockOccurrence {
  block_id: string;
  unit_id: string | null;
  practitioner_id: string | null;
  room_id: string | null;
  reason: string | null;
  timezone: string;
  starts_at: Date;
  ends_at: Date;
}
export interface ScheduleBlockRepository {
  list(options: BlockFilters): Promise<{ items: ScheduleBlock[]; total: number }>;
  occurrences(options: BlockOccurrenceFilters): Promise<{ items: BlockOccurrence[]; total: number }>;
  getById(id: string): Promise<ScheduleBlock | null>;
  create(input: ScheduleBlockInput): Promise<ScheduleBlock>;
  update(id: string, input: Partial<ScheduleBlockInput>): Promise<ScheduleBlock | null>;
  softDelete(id: string): Promise<boolean>;
}
