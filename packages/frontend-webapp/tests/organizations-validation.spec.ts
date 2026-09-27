import { describe, it, expect } from 'vitest';
import { Cnpj, Cnes, Cep, Phone, Email, Name, Uf, BRAZILIAN_UFS, Website } from '@openclinic/core/shared';

describe('Organizations and Units Value Objects Validation', () => {
  describe('Cnpj Value Object', () => {
    it('should format raw 14-digit CNPJ into standard format', () => {
      expect(Cnpj.format('12345678000190')).toBe('12.345.678/0001-90');
      expect(Cnpj.format('')).toBe('');
    });

    it('should clean formatted CNPJ down to numeric string', () => {
      expect(Cnpj.clean('12.345.678/0001-90')).toBe('12345678000190');
    });

    it('should validate official Modulo 11 check digits', () => {
      expect(Cnpj.isValid('11222333000181')).toBe(true);
      expect(Cnpj.isValid('11.222.333/0001-81')).toBe(true);
      expect(Cnpj.isValid('00000000000000')).toBe(false);
      expect(Cnpj.isValid('11111111111111')).toBe(false);
      expect(Cnpj.isValid('12345678000100')).toBe(false);
    });
  });

  describe('Cnes Value Object', () => {
    it('should format/slice raw CNES to 7 digits', () => {
      expect(Cnes.format('9876543')).toBe('9876543');
      expect(Cnes.format('987654321')).toBe('9876543');
      expect(Cnes.format('')).toBe('');
    });

    it('should strip non-numeric characters via clean', () => {
      expect(Cnes.clean('CNES-9876543')).toBe('9876543');
    });

    it('should validate exactly 7 numeric digits and reject zero-only sequences', () => {
      expect(Cnes.isValid('9876543')).toBe(true);
      expect(Cnes.isValid('0000000')).toBe(false);
      expect(Cnes.isValid('123456')).toBe(false);
      expect(Cnes.isValid('12345678')).toBe(false);
      expect(Cnes.isValid('ABC1234')).toBe(false);
    });
  });

  describe('Name Value Object in Organization & Units', () => {
    it('should trim and clean redundant whitespaces', () => {
      expect(Name.clean('   Clínica Exemplo Ltda   ')).toBe('Clínica Exemplo Ltda');
      expect(Name.clean('Unidade   Centro   ')).toBe('Unidade Centro');
    });

    it('should validate acceptable length bounds', () => {
      expect(Name.clean('Hospital Central').length).toBeGreaterThanOrEqual(2);
      expect(Name.clean('A').length).toBeLessThan(2);
    });
  });

  describe('Cep and Phone in Facility Addresses', () => {
    it('should format and validate Brazilian CEP', () => {
      expect(Cep.format('01310100')).toBe('01310-100');
      expect(Cep.isValid('01310-100')).toBe(true);
      expect(Cep.isValid('00000-000')).toBe(false);
    });

    it('should format and validate Brazilian Phone numbers', () => {
      expect(Phone.format('1130000000')).toBe('(11) 3000-0000');
      expect(Phone.format('11999998888')).toBe('(11) 99999-8888');
      expect(Phone.isValid('1130000000')).toBe(true);
      expect(Phone.isValid('11999998888')).toBe(true);
      expect(Phone.isValid('1111111111')).toBe(false);
    });
  });

  describe('Uf and Email Validations', () => {
    it('should validate Brazilian State against BRAZILIAN_UFS', () => {
      expect(Uf.isValid('SP')).toBe(true);
      expect(Uf.isValid('RJ')).toBe(true);
      expect(Uf.isValid('MG')).toBe(true);
      expect(Uf.isValid('XX')).toBe(false);
      expect(BRAZILIAN_UFS).toContain('SP');
    });

    it('should validate institutional email formats', () => {
      expect(Email.isValid('diretoria@exemplo.com.br')).toBe(true);
      expect(Email.isValid('atendimento.matriz@exemplo.com.br')).toBe(true);
      expect(Email.isValid('invalid-email')).toBe(false);
    });

    it('should validate and clean institutional website URLs', () => {
      expect(Website.isValid('www.exemplo.com.br')).toBe(true);
      expect(Website.isValid('https://exemplo.com.br')).toBe(true);
      expect(Website.clean('  www.exemplo.com.br/  ')).toBe('https://www.exemplo.com.br');
      expect(Website.isValid('invalid-site')).toBe(false);
      expect(Website.isValid('javascript:alert(1)')).toBe(false);
    });
  });
});
