import { eq, and, isNull, lt } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { randomUUID } from 'node:crypto';
import { iamSessions } from './drizzle-schema.js';
import type { ISessionRepository, RotateSessionInput } from '../../domain/repositories.js';
import type { SessionEntity } from '../../domain/entities.js';

export class SessionRepository implements ISessionRepository {
  constructor(private db: PostgresJsDatabase) {}

  async create(session: Omit<SessionEntity, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<SessionEntity> {
    const id = session.id || randomUUID();
    const [created] = await this.db.insert(iamSessions).values({ ...session, id } as typeof iamSessions.$inferInsert).returning();
    return created as unknown as SessionEntity;
  }

  async findById(id: string): Promise<SessionEntity | null> {
    const [session] = await this.db.select().from(iamSessions).where(eq(iamSessions.id, id)).limit(1);
    return (session as unknown as SessionEntity) ?? null;
  }

  async findByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
    const [session] = await this.db.select().from(iamSessions).where(and(eq(iamSessions.token_hash, tokenHash), isNull(iamSessions.revoked_at))).limit(1);
    return (session as unknown as SessionEntity) ?? null;
  }

  async findAnyByTokenHash(tokenHash: string): Promise<SessionEntity | null> {
    const [session] = await this.db.select().from(iamSessions).where(eq(iamSessions.token_hash, tokenHash)).limit(1);
    return (session as unknown as SessionEntity) ?? null;
  }

  async revokeIfActive(tokenHash: string): Promise<SessionEntity | null> {
    const [revoked] = await this.db
      .update(iamSessions)
      .set({ revoked_at: new Date() })
      .where(and(eq(iamSessions.token_hash, tokenHash), isNull(iamSessions.revoked_at)))
      .returning();
    return (revoked as unknown as SessionEntity) ?? null;
  }

  async rotate(
    oldTokenHash: string,
    newSession: RotateSessionInput
  ): Promise<{ oldSession: SessionEntity; newSession: SessionEntity } | null> {
    return await this.db.transaction(async (tx) => {
      const [revoked] = await tx
        .update(iamSessions)
        .set({ revoked_at: new Date() })
        .where(and(eq(iamSessions.token_hash, oldTokenHash), isNull(iamSessions.revoked_at)))
        .returning();

      if (!revoked) {
        return null;
      }

      const id = newSession.id || randomUUID();
      const [created] = await tx
        .insert(iamSessions)
        .values({
          ...newSession,
          user_id: revoked.user_id,
          user_agent: newSession.user_agent ?? revoked.user_agent,
          ip_address: newSession.ip_address ?? revoked.ip_address,
          id,
        } as typeof iamSessions.$inferInsert)
        .returning();

      return {
        oldSession: revoked as unknown as SessionEntity,
        newSession: created as unknown as SessionEntity,
      };
    });
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
