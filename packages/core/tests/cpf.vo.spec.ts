import { describe, it, expect } from 'vitest';
import { Cpf } from '../src/domain/value-objects/cpf.vo.js';

describe('Cpf Value Object', () => {
  it('should validate and create a valid CPF with digits only', () => {
    const validRaw = '52998224725'; // Valid generated CPF
    const cpf = Cpf.create(validRaw);
    expect(cpf.value).toBe(validRaw);
    expect(cpf.format()).toBe('529.982.247-25');
    expect(cpf.toString()).toBe(validRaw);
  });

  it('should clean and validate formatted CPF string', () => {
    const formatted = '529.982.247-25';
    const cpf = Cpf.create(formatted);
    expect(cpf.value).toBe('52998224725');
    expect(cpf.format()).toBe('529.982.247-25');
  });

  it('should reject invalid check digits', () => {
    expect(Cpf.isValid('52998224726')).toBe(false);
    expect(() => Cpf.create('52998224726')).toThrow();
  });

  it('should reject sequences of identical digits', () => {
    const identicals = [
      '00000000000',
      '11111111111',
      '22222222222',
      '33333333333',
      '44444444444',
      '55555555555',
      '66666666666',
      '77777777777',
      '88888888888',
      '99999999999',
    ];
    for (const seq of identicals) {
      expect(Cpf.isValid(seq)).toBe(false);
      expect(() => Cpf.create(seq)).toThrow();
    }
  });

  it('should reject inputs with incorrect length or null/undefined', () => {
    expect(Cpf.isValid('')).toBe(false);
    expect(Cpf.isValid('12345')).toBe(false);
    expect(Cpf.isValid('123456789012')).toBe(false);
    expect(Cpf.isValid(null)).toBe(false);
    expect(Cpf.isValid(undefined)).toBe(false);
  });

  it('should format partial or complete raw inputs correctly', () => {
    expect(Cpf.format('123')).toBe('123');
    expect(Cpf.format('123456')).toBe('123.456');
    expect(Cpf.format('123456789')).toBe('123.456.789');
    expect(Cpf.format('12345678900')).toBe('123.456.789-00');
  });

  it('should support equality comparison', () => {
    const cpf1 = Cpf.create('52998224725');
    const cpf2 = Cpf.create('529.982.247-25');
    const cpf3 = Cpf.create('39053344020');
    expect(cpf1.equals(cpf2)).toBe(true);
    expect(cpf1.equals(cpf3)).toBe(false);
  });
});
