export interface UnitInput {
  name: string;
  organization_id: string;
  trade_name?: string | null;
  cnes_code?: string | null;
  tax_id?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  postal_code?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  is_headquarters?: boolean;
}
export interface Unit extends UnitInput {
  id: string;
  tenant_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// The caller supplies a repository scoped to the authorized tenant.
export interface UnitRepository {
  organizationExists(id: string): Promise<boolean>;
  list(options: { offset: number; limit: number }): Promise<{ items: Unit[]; total: number }>;
  getById(id: string): Promise<Unit | null>;
  create(input: UnitInput): Promise<Unit>;
  update(id: string, input: Partial<UnitInput>): Promise<Unit | null>;
  softDelete(id: string): Promise<void>;
}


