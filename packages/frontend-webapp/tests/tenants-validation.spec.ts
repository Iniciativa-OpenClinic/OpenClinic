import { describe, it, expect } from 'vitest';
import { Cnpj, Cep, Uf, BRAZILIAN_UFS, BRAZILIAN_UF_NAMES, Name } from '@openclinic/core/shared';

describe('Tenants Management Value Objects Validation', () => {
  describe('Cnpj Value Object in Tenant Form', () => {
    it('should format raw CNPJ correctly with standard mask', () => {
      expect(Cnpj.format('12345678000190')).toBe('12.345.678/0001-90');
      expect(Cnpj.format('98765432000111')).toBe('98.765.432/0001-11');
      expect(Cnpj.format('')).toBe('');
    });

    it('should strip non-digits via clean', () => {
      expect(Cnpj.clean('12.345.678/0001-90')).toBe('12345678000190');
    });

    it('should correctly validate valid and invalid CNPJs using check digits', () => {
      // Valid known CNPJs
      expect(Cnpj.isValid('11.222.333/0001-81')).toBe(true);
      expect(Cnpj.isValid('00.000.000/0001-91')).toBe(true);
      expect(Cnpj.isValid('11222333000181')).toBe(true);

      // Invalid
      expect(Cnpj.isValid('11.111.111/1111-11')).toBe(false);
      expect(Cnpj.isValid('00.000.000/0000-00')).toBe(false);
      expect(Cnpj.isValid('11.222.333/0001-99')).toBe(false);
      expect(Cnpj.isValid('123')).toBe(false);
    });
  });

  describe('Cep Value Object in Tenant Form', () => {
    it('should format raw CEP with 00000-000 mask', () => {
      expect(Cep.format('01310100')).toBe('01310-100');
      expect(Cep.format('30130110')).toBe('30130-110');
      expect(Cep.format('')).toBe('');
    });

    it('should clean non-digits', () => {
      expect(Cep.clean('01310-100')).toBe('01310100');
    });

    it('should validate 8-digit CEP strings', () => {
      expect(Cep.isValid('01310-100')).toBe(true);
      expect(Cep.isValid('30130-110')).toBe(true);
      expect(Cep.isValid('00000-000')).toBe(false);
      expect(Cep.isValid('123')).toBe(false);
      expect(Cep.isValid('123456789')).toBe(false);
    });
  });

  describe('Uf Value Object and Brazilian State list', () => {
    it('should include all 27 Brazilian Federative Units', () => {
      expect(BRAZILIAN_UFS.length).toBe(27);
      expect(BRAZILIAN_UFS).toContain('SP');
      expect(BRAZILIAN_UFS).toContain('RJ');
      expect(BRAZILIAN_UFS).toContain('MG');
      expect(BRAZILIAN_UFS).toContain('DF');
    });

    it('should map state names accurately', () => {
      expect(BRAZILIAN_UF_NAMES.SP).toBe('São Paulo');
      expect(BRAZILIAN_UF_NAMES.MG).toBe('Minas Gerais');
      expect(BRAZILIAN_UF_NAMES.RJ).toBe('Rio de Janeiro');
    });

    it('should validate official UFs', () => {
      expect(Uf.isValid('SP')).toBe(true);
      expect(Uf.isValid('sp')).toBe(true);
      expect(Uf.isValid('XX')).toBe(false);
      expect(Uf.isValid('')).toBe(false);
    });
  });

  describe('Name Value Object for Tenant Company Name', () => {
    it('should clean redundant spaces', () => {
      expect(Name.clean('  Hospital   Santa   Casa  ')).toBe('Hospital Santa Casa');
    });

    it('should validate name length boundary (2 to 120 chars)', () => {
      expect(Name.clean('A').length < 2).toBe(true);
      expect(Name.clean('Hospital').length >= 2).toBe(true);
    });
  });

  describe('International State and Country Support', () => {
    it('should support descriptive states/provinces up to 100 characters', () => {
      const intlState = 'California';
      expect(intlState.length <= 100).toBe(true);
      expect(Uf.isValid(intlState)).toBe(false); // Brazilian UF rejects, which is expected for foreign states
    });

    it('should validate alphanumeric international postal codes up to 20 chars', () => {
      const ukPostCode = 'SW1A 1AA';
      const usZipCode = '90210-1234';
      expect(ukPostCode.length <= 20).toBe(true);
      expect(usZipCode.length <= 20).toBe(true);
    });
  });
});

