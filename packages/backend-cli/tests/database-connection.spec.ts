import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isLocalHost,
  resolveDatabaseTarget,
  backupBeforeRemoteWrite,
  type DatabaseOptions,
} from '../src/utils/database-connection.js';
import * as pgRunner from '../src/utils/pg-runner.js';
import * as core from '@openclinic/core';

describe('Database Connection & Target Contract (Phase 2)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['DATABASE_OWNER_URL'];
    delete process.env['REMOTE_DATABASE_OWNER_URL'];
    delete process.env['DB_USER'];
    delete process.env['DB_PASS'];
    delete process.env['DB_HOST'];
    delete process.env['DB_PORT'];
    delete process.env['DB_NAME'];
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('isLocalHost', () => {
    it('should correctly identify loopback and container hostnames', () => {
      expect(isLocalHost('localhost')).toBe(true);
      expect(isLocalHost('127.0.0.1')).toBe(true);
      expect(isLocalHost('::1')).toBe(true);
      expect(isLocalHost('[::1]')).toBe(true);
      expect(isLocalHost('0.0.0.0')).toBe(true);
      expect(isLocalHost('db')).toBe(true);
      expect(isLocalHost('postgres')).toBe(true);
      expect(isLocalHost('host.docker.internal')).toBe(true);
      expect(isLocalHost('server.local')).toBe(true);
      expect(isLocalHost('app.localhost')).toBe(true);
    });

    it('should reject external and non-local hostnames', () => {
      expect(isLocalHost('example.com')).toBe(false);
      expect(isLocalHost('db.production.myclinic.org')).toBe(false);
      expect(isLocalHost('192.168.1.50')).toBe(false);
      expect(isLocalHost('10.0.0.1')).toBe(false);
      expect(isLocalHost('')).toBe(false);
    });
  });

  describe('resolveDatabaseTarget', () => {
    it('should reject invalid target options', () => {
      expect(() =>
        resolveDatabaseTarget({ target: 'staging' } as DatabaseOptions)
      ).toThrowError(/Invalid target: "staging"/i);
    });

    it('should reject local target if owner credentials are not configured', () => {
      vi.spyOn(core, 'resolveDatabaseOwnerUrl').mockReturnValue(undefined);
      expect(() => resolveDatabaseTarget({ target: 'local' })).toThrowError(
        /owner credentials \(DDL\) are required/i
      );
    });

    it('should resolve local target when owner URL points to a loopback host', () => {
      process.env['DATABASE_OWNER_URL'] =
        'postgres://owner:secret@localhost:5432/openclinic_db';

      const result = resolveDatabaseTarget({ target: 'local' });
      expect(result.target).toBe('local');
      expect(result.isRemote).toBe(false);
      expect(result.identity).toBe('localhost:5432/openclinic_db');
      expect(result.url).toBe(
        'postgresql://owner:secret@localhost:5432/openclinic_db'
      );
    });

    it('should resolve local target when owner URL points to a docker service container (db)', () => {
      process.env['DATABASE_OWNER_URL'] =
        'postgres://owner:secret@db:5432/openclinic_db';

      const result = resolveDatabaseTarget();
      expect(result.target).toBe('local');
      expect(result.isRemote).toBe(false);
      expect(result.identity).toBe('db:5432/openclinic_db');
    });

    it('should reject local target when owner URL points to an external host', () => {
      process.env['DATABASE_OWNER_URL'] =
        'postgres://owner:secret@db.cloud.corp:5432/openclinic_db';

      expect(() => resolveDatabaseTarget({ target: 'local' })).toThrowError(
        /Refusing connection to external host "db.cloud.corp" with target "local"/i
      );
    });

    it('should reject remote target when REMOTE_DATABASE_OWNER_URL is missing', () => {
      expect(() => resolveDatabaseTarget({ target: 'remote' })).toThrowError(
        /Remote database owner URL is not configured/i
      );
    });

    it('should allow remote read-only target without --confirm-target', () => {
      process.env['REMOTE_DATABASE_OWNER_URL'] =
        'postgres://remote_owner:secret123@db.remote.com:5433/prod_clinic';

      const result = resolveDatabaseTarget({ target: 'remote' }, false);
      expect(result.target).toBe('remote');
      expect(result.isRemote).toBe(true);
      expect(result.identity).toBe('db.remote.com:5433/prod_clinic');
    });

    it('should reject remote write operation when --confirm-target is missing', () => {
      process.env['REMOTE_DATABASE_OWNER_URL'] =
        'postgres://remote_owner:secret123@db.remote.com:5433/prod_clinic';

      expect(() =>
        resolveDatabaseTarget({ target: 'remote' }, true)
      ).toThrowError(
        /Remote write operation requires explicit confirmation. Specify --confirm-target "db.remote.com:5433\/prod_clinic"/i
      );
    });

    it('should reject remote write operation when --confirm-target does not match identity', () => {
      process.env['REMOTE_DATABASE_OWNER_URL'] =
        'postgres://remote_owner:secret123@db.remote.com:5433/prod_clinic';

      expect(() =>
        resolveDatabaseTarget(
          { target: 'remote', confirmTarget: 'wrong-host:5433/prod_clinic' },
          true
        )
      ).toThrowError(
        /Target confirmation mismatch: expected "db.remote.com:5433\/prod_clinic", got "wrong-host:5433\/prod_clinic"/i
      );
    });

    it('should accept remote write operation when --confirm-target matches identity exactly', () => {
      process.env['REMOTE_DATABASE_OWNER_URL'] =
        'postgres://remote_owner:secret123@db.remote.com:5433/prod_clinic';

      const result = resolveDatabaseTarget(
        {
          target: 'remote',
          confirmTarget: 'db.remote.com:5433/prod_clinic',
        },
        true
      );

      expect(result.target).toBe('remote');
      expect(result.isRemote).toBe(true);
      expect(result.identity).toBe('db.remote.com:5433/prod_clinic');
    });
  });

  describe('backupBeforeRemoteWrite', () => {
    it('should skip backup for local targets when force is false', async () => {
      process.env['DATABASE_OWNER_URL'] =
        'postgres://owner:pass@localhost:5432/clinic';
      const target = resolveDatabaseTarget({ target: 'local' });

      const dumpSpy = vi
        .spyOn(pgRunner, 'executePgDump')
        .mockResolvedValue(undefined);

      await backupBeforeRemoteWrite(target, false);
      expect(dumpSpy).not.toHaveBeenCalled();
    });

    it('should automatically trigger backup for remote targets', async () => {
      process.env['REMOTE_DATABASE_OWNER_URL'] =
        'postgres://remote_owner:pass@db.remote.com:5432/clinic';
      const target = resolveDatabaseTarget(
        {
          target: 'remote',
          confirmTarget: 'db.remote.com:5432/clinic',
        },
        true
      );

      const dumpSpy = vi
        .spyOn(pgRunner, 'executePgDump')
        .mockResolvedValue(undefined);

      await backupBeforeRemoteWrite(target);
      expect(dumpSpy).toHaveBeenCalledTimes(1);
      expect(dumpSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'db.remote.com',
          port: 5432,
          database: 'clinic',
          user: 'remote_owner',
          password: 'pass',
        })
      );
    });

    it('should trigger backup for local target when force is true', async () => {
      process.env['DATABASE_OWNER_URL'] =
        'postgres://owner:pass@localhost:5432/clinic';
      const target = resolveDatabaseTarget({ target: 'local' });

      const dumpSpy = vi
        .spyOn(pgRunner, 'executePgDump')
        .mockResolvedValue(undefined);

      await backupBeforeRemoteWrite(target, true);
      expect(dumpSpy).toHaveBeenCalledTimes(1);
      expect(dumpSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          database: 'clinic',
        })
      );
    });
  });
});
