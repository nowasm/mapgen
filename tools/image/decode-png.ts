import { inflateSync } from "node:zlib";

export interface DecodedPng {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

function paeth(left: number, above: number, upperLeft: number): number {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance ? left
    : aboveDistance <= upperLeftDistance ? above : upperLeft;
}

export function decodeRgbaPng(bytes: Uint8Array): DecodedPng {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((value, index) => bytes[index] === value)) throw new TypeError("Invalid PNG signature");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let palette = new Uint8Array();
  let transparency = new Uint8Array();
  const dataChunks: Uint8Array[] = [];
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    const data = bytes.slice(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      const header = new DataView(data.buffer, data.byteOffset, data.byteLength);
      width = header.getUint32(0);
      height = header.getUint32(4);
      colorType = data[9]!;
      if (data[8] !== 8 || (colorType !== 3 && colorType !== 6) || data[12] !== 0) {
        throw new TypeError("Only non-interlaced 8-bit indexed or RGBA PNG files are supported");
      }
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") transparency = data;
    else if (type === "IDAT") dataChunks.push(data);
    else if (type === "IEND") break;
    offset += length + 12;
  }
  if (width <= 0 || height <= 0 || dataChunks.length === 0) throw new TypeError("PNG is missing IHDR or IDAT data");
  const compressed = Buffer.concat(dataChunks.map((chunk) => Buffer.from(chunk)));
  const raw = inflateSync(compressed);
  const bytesPerPixel = colorType === 6 ? 4 : 1;
  const stride = width * bytesPerPixel;
  const decoded = new Uint8Array(stride * height);
  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (stride + 1)]!;
    for (let column = 0; column < stride; column += 1) {
      const source = raw[row * (stride + 1) + 1 + column]!;
      const target = row * stride + column;
      const left = column >= bytesPerPixel ? decoded[target - bytesPerPixel]! : 0;
      const above = row > 0 ? decoded[target - stride]! : 0;
      const upperLeft = row > 0 && column >= bytesPerPixel ? decoded[target - stride - bytesPerPixel]! : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above
        : filter === 3 ? Math.floor((left + above) / 2) : filter === 4 ? paeth(left, above, upperLeft) : -1;
      if (predictor < 0) throw new TypeError(`Unsupported PNG filter: ${filter}`);
      decoded[target] = (source + predictor) & 0xff;
    }
  }
  if (colorType === 6) return { width, height, rgba: decoded };
  if (palette.length === 0 || palette.length % 3 !== 0) throw new TypeError("Indexed PNG is missing a valid PLTE chunk");
  const rgba = new Uint8Array(width * height * 4);
  for (let index = 0; index < decoded.length; index += 1) {
    const paletteIndex = decoded[index]!;
    const paletteOffset = paletteIndex * 3;
    if (paletteOffset + 2 >= palette.length) throw new TypeError("Indexed PNG references an invalid palette entry");
    const outputOffset = index * 4;
    rgba[outputOffset] = palette[paletteOffset]!;
    rgba[outputOffset + 1] = palette[paletteOffset + 1]!;
    rgba[outputOffset + 2] = palette[paletteOffset + 2]!;
    rgba[outputOffset + 3] = transparency[paletteIndex] ?? 255;
  }
  return { width, height, rgba };
}

export function samplePng(image: DecodedPng, u: number, v: number): readonly [number, number, number] {
  const x = Math.max(0, Math.min(image.width - 1, Math.round(u * (image.width - 1))));
  const y = Math.max(0, Math.min(image.height - 1, Math.round((1 - v) * (image.height - 1))));
  const offset = (y * image.width + x) * 4;
  return [image.rgba[offset]!, image.rgba[offset + 1]!, image.rgba[offset + 2]!];
}
