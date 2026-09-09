import { eq, and, isNull, lt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import { iamSessions } from './drizzle-schema.js';
import type { ISessionRepository } from '../../domain/repositories.js';
import type { SessionEntity } from '../../domain/entities.js';

export class SessionRepository implements ISessionRepository {
  constructor(private db: PostgresJsDatabase) {}

  async create(session: Omit<SessionEntity, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<SessionEntity> {
    const id = session.id || randomUUID();
    const [created] = await this.db.insert(iamSessions).values({ ...session, id } as typeof iamSessions.$inferInsert).returning();
    return created as unknown as SessionEntity;
  }

  async findByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
    const [session] = await this.db.select().from(iamSessions).where(and(eq(iamSessions.token_hash, tokenHash), isNull(iamSessions.revoked_at))).limit(1);
    return (session as unknown as SessionEntity) ?? null;
  }

  async revoke(id: string): Promise<void> {
    await this.db.update(iamSessions).set({ revoked_at: new Date() }).where(eq(iamSessions.id, id));
  }

  async revokeAllByUser(userId: string): Promise<void> {
    await this.db.update(iamSessions).set({ revoked_at: new Date() }).where(and(eq(iamSessions.user_id, userId), isNull(iamSessions.revoked_at)));
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db.delete(iamSessions).where(lt(iamSessions.expires_at, new Date())).returning();
    return result.length;
  }
}
