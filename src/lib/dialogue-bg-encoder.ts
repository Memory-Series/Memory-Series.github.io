/**
 * Encode a decoded RGBA image to an `esp_emote_gfx` RGB565A8 `.bin`
 * (used for the device's dialogue background, e.g. `dialogue_bg.bin`).
 *
 * Layout (verified against the real `boot/.../dialogue_bg.bin` shipped in
 * `public/assets/dialogue/<role>/`):
 *
 *   header  (12 B) — `lv_image_header_t` packed in 3 LE u32 words:
 *                    [0]=magic(0x19) | cf(0x0A)<<8
 *                    [1]=width | height<<16
 *                    [2]=(width*2) stride | 0<<16
 *   RGB565  (w*h*2 B) — RGB565 written big-endian (high byte first).
 *                       The panel byte-order swap, when applicable, is
 *                       handled at runtime by the firmware via
 *                       `disp->flags.swap`, so the file is invariant.
 *   alpha   (w*h  B) — `255` if src.a >= 128, else `0` (binary mask, not scaled).
 *
 * Total length is therefore `12 + w*h*3`; for the conversation background
 * (`412×412`) that is exactly **509,244 bytes**.
 */

export const HEADER_MAGIC = 0x19;
export const GFX_COLOR_FORMAT_RGB565A8 = 0x0a;

/** Square edge length used by the shipped dialogue background asset. */
export const DIALOGUE_BG_SIZE = 412;

/** Expected file size for a square edge `size`. */
export function expectedDialogueBgBytes(size: number): number {
  return 12 + size * size * 3;
}

export interface EncodeOptions {
  /** Square edge of the encoded image. Defaults to {@link DIALOGUE_BG_SIZE}. */
  size?: number;
}

/**
 * Encode raw RGBA pixels (length must be a multiple of 4) to an RGB565A8 binary.
 *
 * The source `rgba` may have any dimensions; it is bilinearly resized to
 * `size × size` using a high-quality pipeline (matching what the official
 * Python `convert_png_to_gfx.py` does via Pillow's `Image.Resampling.NEAREST`
 * — we default to bilinear here for the conversation background, which is
 * smoother on photographs; pass `size` matching the source to keep 1:1 pixel
 * mapping without resampling).
 *
 * @returns A fresh `ArrayBuffer` of length {@link expectedDialogueBgBytes}.
 */
export function encodeDialogueBg(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: EncodeOptions = {},
): ArrayBuffer {
  const size = options.size ?? DIALOGUE_BG_SIZE;
  if (size <= 0 || !Number.isFinite(size)) {
    throw new RangeError(`size must be a positive integer, got ${size}`);
  }
  if (rgba.length !== width * height * 4) {
    throw new RangeError(
      `rgba length ${rgba.length} does not match ${width}x${height}x4 = ${width * height * 4}`,
    );
  }

  // 1. Resample to `size × size` RGBA via NEAREST to keep byte-for-byte parity
  // with the official Python `convert_png_to_gfx.py` (which uses
  // `Image.Resampling.NEAREST`). Switching to bilinear would yield smoother
  // previews but bytes would diverge at any non-identity resize.
  let srcRgba: Uint8ClampedArray;
  if (width === size && height === size) {
    srcRgba = rgba;
  } else {
    srcRgba = resampleNearest(rgba, width, height, size, size);
  }

  // 2. Pack 12-byte header + RGB565 BE plane + alpha plane.
  const out = new ArrayBuffer(expectedDialogueBgBytes(size));
  const view = new DataView(out);
  const bytes = new Uint8Array(out);

  // word0 = magic | (cf << 8)  (no other bits used)
  view.setUint32(0, HEADER_MAGIC | (GFX_COLOR_FORMAT_RGB565A8 << 8), true);
  // word1 = width | (height << 16)
  view.setUint32(4, (size & 0xffff) | ((size & 0xffff) << 16), true);
  // word2 = stride | (0 << 16)  ; stride is width*2 for RGB565
  view.setUint32(8, (size * 2) & 0xffff, true);

  // RGB565 plane begins at offset 12, big-endian per pixel.
  let off = 12;
  for (let i = 0; i < size * size; i++) {
    const r = srcRgba[i * 4 + 0]!;
    const g = srcRgba[i * 4 + 1]!;
    const b = srcRgba[i * 4 + 2]!;
    const c = rgbToRgb565(r, g, b);
    bytes[off++] = (c >> 8) & 0xff; // high byte first (BE)
    bytes[off++] = c & 0xff;
  }
  // Alpha plane: 1-byte-per-pixel binary mask.
  for (let i = 0; i < size * size; i++) {
    const a = srcRgba[i * 4 + 3]!;
    bytes[off++] = a >= 128 ? 255 : 0;
  }

  return out;
}

/**
 * Decode the RGB565A8 binary back to RGBA pixels (length = `size*size*4`).
 * Useful for in-browser self-checks: encode → decode → compare.
 */
export function decodeDialogueBg(buf: ArrayBuffer): {
  width: number;
  height: number;
  rgba: Uint8ClampedArray<ArrayBuffer>;
} {
  const view = new DataView(buf);
  const word0 = view.getUint32(0, true);
  const word1 = view.getUint32(4, true);
  const word2 = view.getUint32(8, true);
  if ((word0 & 0xff) !== HEADER_MAGIC || ((word0 >> 8) & 0xff) !== GFX_COLOR_FORMAT_RGB565A8) {
    throw new Error(`Bad RGB565A8 magic 0x${word0.toString(16)} (expect 0x19 / cf 0x0a)`);
  }
  const width = word1 & 0xffff;
  const height = (word1 >>> 16) & 0xffff;
  const stride = word2 & 0xffff;
  if (stride !== width * 2) {
    throw new Error(`Bad stride ${stride} for width ${width} (expect ${width * 2})`);
  }
  const expected = expectedDialogueBgBytes(width);
  if (buf.byteLength !== expected) {
    throw new Error(
      `Buffer length ${buf.byteLength} does not match expected ${expected} for ${width}x${height} RGB565A8`,
    );
  }
  if (width !== height) {
    throw new Error(`Background must be square; got ${width}x${height}`);
  }

  const buffer = new ArrayBuffer(width * height * 4);
  const pixels = new Uint8ClampedArray(buffer);
  const u8 = new Uint8Array(buf);
  let off = 12;
  for (let i = 0; i < width * height; i++) {
    const hi = u8[off++]!;
    const lo = u8[off++]!;
    const v = (hi << 8) | lo;
    pixels[i * 4 + 0] = ((v >> 11) & 0x1f) * 255 / 31;
    pixels[i * 4 + 1] = ((v >> 5) & 0x3f) * 255 / 63;
    pixels[i * 4 + 2] = (v & 0x1f) * 255 / 31;
  }
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4 + 3] = u8[12 + width * height * 2 + i]!;
  }
  return { width, height, rgba: new Uint8ClampedArray(pixels) };
}

/* ------------------------------------------------------------------ */
/* RGB565 packing                                                      */
/* ------------------------------------------------------------------ */

/** Pack 8-bit R, G, B to a 16-bit RGB565 word (caller responsible for endian). */
function rgbToRgb565(r: number, g: number, b: number): number {
  // Matches `((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)` from the official script.
  return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
}

/* ------------------------------------------------------------------ */
/* Nearest-neighbour RGBA resampler                                    */
/* ------------------------------------------------------------------ */

/**
 * Nearest-neighbour RGBA resampler — chosen for byte-for-byte parity
 * with the official Python script (which uses `PIL.Image.Resampling.NEAREST`).
 * On small UI images previews look slightly pixelated at large downscales,
 * but the produced `.bin` is bit-identical to firmware-built output and that
 * matters more than the preview.
 */
function resampleNearest(
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dw * dh * 4);
  const xRatio = sw / dw;
  const yRatio = sh / dh;
  for (let y = 0; y < dh; y++) {
    // centre-of-pixel mapping for parity with PIL conventions
    const sy = clampInt(Math.floor((y + 0.5) * yRatio), 0, sh - 1);
    for (let x = 0; x < dw; x++) {
      const sx = clampInt(Math.floor((x + 0.5) * xRatio), 0, sw - 1);
      const si = (sy * sw + sx) * 4;
      const di = (y * dw + x) * 4;
      dst[di + 0] = src[si + 0]!;
      dst[di + 1] = src[si + 1]!;
      dst[di + 2] = src[si + 2]!;
      dst[di + 3] = src[si + 3]!;
    }
  }
  return dst;
}

function clampInt(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
