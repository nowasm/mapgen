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
}
