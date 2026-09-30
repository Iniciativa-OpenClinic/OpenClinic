import { describe, test, expect } from 'vitest';
import { allAdapters, adapterByCode } from './index.js';

describe('adapter registry', () => {
  test('every registered adapter has a unique, non-empty sourceCode', () => {
    const codes = allAdapters.map((a) => a.sourceCode);
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.every((c) => c.length > 0)).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test('adapterByCode returns the matching adapter', () => {
    const adapter = adapterByCode('cid10');
    expect(adapter.sourceCode).toBe('cid10');
  });

  test('adapterByCode throws a clear error for an unknown code', () => {
    expect(() => adapterByCode('not-a-real-source')).toThrow(/not-a-real-source/);
  });
});
