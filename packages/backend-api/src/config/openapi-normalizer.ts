/**
 * Normalizes an OpenAPI / JSON Schema object to strictly adhere to the OpenAPI 3.0.3 specification:
 * 1. Converts array types such as `type: ['string', 'null']` into `type: 'string', nullable: true`.
 * 2. If multiple non-null types exist, converts them to `anyOf: [{ type: '...' }]` with `nullable: true` if null was present.
 * 3. Recursively processes properties, items, allOf, anyOf, oneOf, parameters, headers, and responses.
 */
export function normalizeOpenApi30<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeOpenApi30(item)) as unknown as T;
  }

  const obj = value as Record<string, any>;
  const result: Record<string, any> = {};

  for (const [k, v] of Object.entries(obj)) {
    if (k === 'type' && Array.isArray(v)) {
      const nonNullTypes = v.filter((t) => t !== 'null');
      const isNullable = v.includes('null');

      if (nonNullTypes.length === 1) {
        result['type'] = nonNullTypes[0];
        if (isNullable) {
          result['nullable'] = true;
        }
      } else if (nonNullTypes.length > 1) {
        result['anyOf'] = nonNullTypes.map((t) => ({ type: t }));
        if (isNullable) {
          result['nullable'] = true;
        }
      } else {
        result['type'] = 'string';
        if (isNullable) {
          result['nullable'] = true;
        }
      }
    } else {
      result[k] = normalizeOpenApi30(v);
    }
  }

  return result as T;
}
