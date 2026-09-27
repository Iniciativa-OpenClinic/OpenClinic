export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface RepositoryInterface<T> {
  create(entity: Partial<T>): Promise<T>;
  getById(id: string): Promise<T | null>;
  listAll(skip?: number, limit?: number): Promise<T[]>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  getByField(fieldName: string, value: unknown): Promise<T | null>;
  listByField(fieldName: string, value: unknown): Promise<T[]>;
}
