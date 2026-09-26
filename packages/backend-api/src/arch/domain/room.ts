export interface RoomInput {
  name: string;
  unit_id: string;
  is_schedulable: boolean;
  room_type?: string | null;
  equipment?: string[];
  notes?: string | null;
  is_active?: boolean;
}

export interface Room extends RoomInput {
  id: string;
  tenant_id: string;
  equipment: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface RoomListOptions {
  offset: number;
  limit: number;
  unit_id?: string;
  is_schedulable?: boolean;
  is_active?: boolean;
  q?: string;
}

// All operations, including unit references, are scoped to the authenticated tenant.
export interface RoomRepository {
  list(options: RoomListOptions): Promise<{ items: Room[]; total: number }>;
  getById(id: string): Promise<Room | null>;
  create(input: RoomInput): Promise<Room>;
  update(id: string, input: Partial<RoomInput>): Promise<Room | null>;
  softDelete(id: string): Promise<boolean>;
}
