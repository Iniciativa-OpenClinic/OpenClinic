export abstract class ValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this._value = Object.freeze(value);
  }

  get value(): T {
    return this._value;
  }

  public equals(vo?: ValueObject<T> | null): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.constructor.name !== this.constructor.name) {
      return false;
    }
    return JSON.stringify(this._value) === JSON.stringify(vo._value);
  }
}
