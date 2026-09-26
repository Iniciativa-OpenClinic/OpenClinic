export interface ProcedureInput {
  name: string;
  estimated_duration_minutes: number;
  requires_room: boolean;
  description?: string | null;
  category?: string | null;
  tuss_code?: string | null;
  preparation_instructions?: string | null;
  return_after_days?: number | null;
  minimum_interval_days?: number | null;
  calendar_color?: string | null;
  is_active?: boolean;
  practitioner_ids?: string[];
}

export interface Procedure extends ProcedureInput {
  id: string;
  tenant_id: string;
  is_active: boolean;
  practitioner_ids: string[];
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ProcedureListOptions {
  offset: number;
  limit: number;
  is_active?: boolean;
  q?: string;
}

// Every operation is scoped to the authenticated tenant, including relationships.
export interface ProcedureRepository {
  list(options: ProcedureListOptions): Promise<{ items: Procedure[]; total: number }>;
  getById(id: string): Promise<Procedure | null>;
  create(input: ProcedureInput): Promise<Procedure>;
  update(id: string, input: Partial<ProcedureInput>): Promise<Procedure | null>;
  softDelete(id: string): Promise<boolean>;
}
