import { describe, it, expect } from 'vitest';
import { Cpf } from '@openclinic/core/shared';
import { TEST_USERS } from '../src/pages/LoginPage.js';

describe('LoginPage Test Credentials and CPF Validation', () => {
  describe('TEST_USERS list configuration', () => {
    it('should contain exactly 6 database test users in the specified order', () => {
      expect(TEST_USERS).toHaveLength(6);

      const expectedUsers = [
        { username: 'ana.souza', cpf: '444.555.666-19', role: 'Atendente' },
        { username: 'marta.lima', cpf: '333.444.555-08', role: 'Enfermeira' },
        { username: 'mateus.oliveira', cpf: '222.333.444-05', role: 'Médico' },
        { username: 'marcos.ferreira', cpf: '111.222.333-96', role: 'Diretor' },
        { username: 'lucas.santos', cpf: '987.654.321-00', role: 'Administrador' },
        { username: 'joao.silva', cpf: '123.456.789-09', role: 'Superadministrador' },
      ];

      expectedUsers.forEach((expected, idx) => {
        expect(TEST_USERS[idx].username).toBe(expected.username);
        expect(TEST_USERS[idx].cpf).toBe(expected.cpf);
        expect(TEST_USERS[idx].role).toBe(expected.role);
      });
    });

    it('should have mathematically valid CPFs for all 6 test users', () => {
      TEST_USERS.forEach((user) => {
        const isValid = Cpf.isValid(user.cpf);
        expect(isValid, `CPF for user ${user.username} (${user.cpf}) must be valid`).toBe(true);

        const cleanDigits = Cpf.clean(user.cpf);
        expect(cleanDigits).toHaveLength(11);
        expect(Cpf.isValid(cleanDigits)).toBe(true);
      });
    });
  });

  describe('CPF validation logic used by login screen', () => {
    it('should accept valid CPFs with or without formatting', () => {
      expect(Cpf.isValid('123.456.789-09')).toBe(true);
      expect(Cpf.isValid('12345678909')).toBe(true);
      expect(Cpf.isValid('987.654.321-00')).toBe(true);
      expect(Cpf.isValid('98765432100')).toBe(true);
    });

    it('should reject invalid CPFs with wrong check digits', () => {
      expect(Cpf.isValid('123.456.789-00')).toBe(false);
      expect(Cpf.isValid('12345678900')).toBe(false);
      expect(Cpf.isValid('444.555.666-00')).toBe(false);
      expect(Cpf.isValid('987.654.321-99')).toBe(false);
    });

    it('should reject CPFs with repeated identical digits', () => {
      expect(Cpf.isValid('000.000.000-00')).toBe(false);
      expect(Cpf.isValid('111.111.111-11')).toBe(false);
      expect(Cpf.isValid('222.222.222-22')).toBe(false);
      expect(Cpf.isValid('999.999.999-99')).toBe(false);
    });

    it('should reject CPFs with incorrect lengths or non-digit characters', () => {
      expect(Cpf.isValid('')).toBe(false);
      expect(Cpf.isValid('123')).toBe(false);
      expect(Cpf.isValid('123.456.789')).toBe(false);
      expect(Cpf.isValid('abc.def.ghi-jk')).toBe(false);
    });

    it('should correctly format 11 digits to standard mask XXX.XXX.XXX-XX', () => {
      expect(Cpf.format('12345678909')).toBe('123.456.789-09');
      expect(Cpf.format('44455566619')).toBe('444.555.666-19');
      expect(Cpf.format('98765432100')).toBe('987.654.321-00');
    });
  });
});
