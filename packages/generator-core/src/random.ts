export class Mulberry32 {
  readonly #initialSeed: number;
  #state: number;

  constructor(seed: number) {
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) {
      throw new RangeError("seed must be a uint32");
    }
    this.#initialSeed = seed >>> 0;
    this.#state = this.#initialSeed;
  }

  get initialSeed(): number {
    return this.#initialSeed;
  }

  next(): number {
    let value = (this.#state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  float(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.next();
  }

  integer(minimum: number, maximum: number): number {
    if (!Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum > maximum) {
      throw new RangeError("integer bounds must be ordered integers");
    }
    return minimum + Math.floor(this.next() * (maximum - minimum + 1));
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new RangeError("cannot pick from an empty array");
    return values[this.integer(0, values.length - 1)]!;
  }

  weightedPick<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
    if (!(total > 0)) throw new RangeError("at least one weight must be positive");
    let cursor = this.next() * total;
    for (const [value, weight] of entries) {
      cursor -= Math.max(0, weight);
      if (cursor < 0) return value;
    }
    return entries[entries.length - 1]![0];
  }
}
