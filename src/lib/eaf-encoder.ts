/**
 * Encode RGBA frames into an **EAF** container — the only format the device's
 * boot-animation slot will read.
 *
 * ## The format was read, not guessed
 *
 * Espressif's own decoder ships inside this firmware tree at
 * `application/edge_agent/managed_components/espressif2022__esp_emote_gfx/
 * src/lib/eaf/gfx_eaf_dec.c` (+ its header). Every layout rule below comes
 * from that source, and the three variants produced here (RLE, JPEG, and a
 * known-good shipping asset) were each confirmed to play on real hardware.
 *
 * ## Layout (little endian)
 *
 *   file  : 89 'E' 'A' 'F' | u32 total_frames | u32 checksum | u32 stored_len
 *           checksum   = sum(bytes[16 : 16+stored_len]) & 0xFFFFFFFF
 *                        (a plain byte sum — NOT a CRC)
 *           stored_len = table_bytes + sum(frame_size)
 *   table : total_frames * { u32 frame_size, u32 frame_offset }
 *           frame_offset is relative to the TABLE END (16 + total_frames*8)
 *   frame : 5A 5A | "_S" | 00 | version[6] | u8 bit_depth | u16 w | u16 h
 *           | u16 blocks | u16 block_height
 *           | blocks * u32 block_len        (block_len INCLUDES the tag byte)
 *           | palette — omitted when bit_depth == 24, else (1<<bd) * 4 B, BGRA
 *           | block payloads, back to back
 *   block : u8 encoding_type | payload
 *           0 RLE / 1 HUFF+RLE / 2 JPEG / 3 HUFF / 4 HEATSHRINK / 5 RAW
 *           non-JPEG decodes to width*block_height bytes (1 B/px, palette index)
 *           JPEG     decodes to width*block_height*2  (RGB565)
 *
 * `bit_depth` is validated by the firmware: only 4, 8 or 24 are accepted.
 *
 * ## Two encodings, and why both exist
 *
 * `bd = 8` needs a 256-entry palette; `bd = 24` has no palette and therefore
 * only works with JPEG. So the real choice is between two complete routes:
 *
 *   - **rle**   — bd8, median-cut palette, RLE payload. Lossless once the
 *                 palette is chosen, by far the smallest, and the cheapest for
 *                 the ESP32 to decode (a `[count][value]` byte stream). Cost:
 *                 colour is quantised to 256 entries per frame.
 *   - **jpeg**  — bd24, full colour, one bare JPEG per frame. Cost: larger
 *                 files and much more work for the decoder on a device with no
 *                 hardware JPEG unit.
 *
 * RLE is the default because boot animations are usually flat or cartoon-like,
 * where quantisation is invisible and decode cost dominates. `jpeg` is offered
 * for photographic or heavily gradient content.
 */

import { BOOT_EAF_FPS, BOOT_EAF_SIZE_LIMIT } from "./device-assets";
import { toBlobPart } from "./bytes";
import { resampleRgba } from "./main-anim-encoder";

/* ------------------------------------------------------------------ */
/* Device spec — firmware constants                                    */
/* ------------------------------------------------------------------ */

/**
 * Square edge of generated boot frames.
 *
 * The panel is 360×360. The reference boot animation that ships with the
 * firmware is 412×412 — a previous generation's figure — and frame size here
 * is self-describing per frame, so 412 would still display, but it would carry
 * ~30% more data and take an extra rescale. 1:1 with the panel is both
 * smaller and sharper, and it is what the hardware test confirmed.
 */
export const BOOT_ANIM_SIZE = 360;

/**
 * Firmware advances boot frames on a compile-time 24 FPS timer.
 *
 * Both values below are re-exported from the device manifest rather than
 * restated: they are the same firmware constants, and two copies of "8 MB"
 * would eventually drift apart.
 */
export const BOOT_ANIM_FPS = BOOT_EAF_FPS;
export const BOOT_EAF_READ_MAX = BOOT_EAF_SIZE_LIMIT;

export const EAF_ENC_RLE = 0;
export const EAF_ENC_HUFF_RLE = 1;
export const EAF_ENC_JPEG = 2;
export const EAF_ENC_HUFF = 3;
export const EAF_ENC_HEATSHRINK = 4;
export const EAF_ENC_RAW = 5;

/** Bit depths the firmware accepts (`eaf_get_frame_info` rejects anything else). */
const VALID_BIT_DEPTHS = new Set([4, 8, 24]);

const FILE_MAGIC = [0x89, 0x45, 0x41, 0x46] as const;
const FRAME_MAGIC = [0x5a, 0x5a] as const;
/** Copied verbatim from the frames of Espressif's shipping `offline.eaf`. */
const FRAME_VERSION = [0x00, 0x00, 0x00, 0x00, 0x00, 0x01] as const;

/** File header size: magic + three u32 words. */
const FILE_HEADER_BYTES = 16;
/** Fixed part of a frame header, up to (not including) the block-length array. */
const FRAME_HEADER_BYTES = 20;

export type BootEncoding = "rle" | "jpeg";

export interface EncodeEafFrameOptions {
  /** Square edge of the output. Defaults to {@link BOOT_ANIM_SIZE}. */
  size?: number;
  encoding?: BootEncoding;
  /** JPEG quality, 0–1. Only used by the `jpeg` route. */
  quality?: number;
}

export interface EafFrameResult {
  bytes: Uint8Array;
  /**
   * Mean per-channel absolute error introduced by palette quantisation, 0–255.
   * `null` for the `jpeg` route, which does not quantise.
   */
  quantizationError: number | null;
}

/* ------------------------------------------------------------------ */
/* Frame building                                                      */
/* ------------------------------------------------------------------ */

interface Block {
  encoding: number;
  payload: Uint8Array;
}

function buildFrame(
  width: number,
  height: number,
  bitDepth: number,
  blocks: Block[],
  palette: Uint8Array | null,
): Uint8Array {
  const blockHeight = height; // one full-height block per frame
  const paletteBytes = palette ? palette.length : 0;
  const payloadBytes = blocks.reduce((n, b) => n + 1 + b.payload.length, 0);
  const total = FRAME_HEADER_BYTES + blocks.length * 4 + paletteBytes + payloadBytes;

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let off = 0;

  out[off++] = FRAME_MAGIC[0];
  out[off++] = FRAME_MAGIC[1];
  out[off++] = 0x5f; // '_'
  out[off++] = 0x53; // 'S'
  out[off++] = 0x00;
  for (const v of FRAME_VERSION) out[off++] = v;
  out[off++] = bitDepth & 0xff;
  view.setUint16(off, width, true);
  off += 2;
  view.setUint16(off, height, true);
  off += 2;
  view.setUint16(off, blocks.length, true);
  off += 2;
  view.setUint16(off, blockHeight, true);
  off += 2;

  for (const b of blocks) {
    view.setUint32(off, 1 + b.payload.length, true); // +1: the encoding tag
    off += 4;
  }
  if (palette) {
    out.set(palette, off);
    off += palette.length;
  }
  for (const b of blocks) {
    out[off++] = b.encoding & 0xff;
    out.set(b.payload, off);
    off += b.payload.length;
  }

  return out;
}

/** Wrap encoded frames into a complete EAF file. */
export function buildEaf(frames: Uint8Array[]): Uint8Array {
  const count = frames.length;
  const table = new Uint8Array(count * 8);
  const tableView = new DataView(table.buffer);
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    tableView.setUint32(i * 8, frames[i]!.length, true);
    tableView.setUint32(i * 8 + 4, cursor, true);
    cursor += frames[i]!.length;
  }

  const body = new Uint8Array(table.length + cursor);
  body.set(table, 0);
  let off = table.length;
  for (const f of frames) {
    body.set(f, off);
    off += f.length;
  }

  const out = new Uint8Array(FILE_HEADER_BYTES + body.length);
  const view = new DataView(out.buffer);
  for (let i = 0; i < 4; i++) out[i] = FILE_MAGIC[i]!;
  view.setUint32(4, count, true);
  // Checksum covers the table and every frame, but not the 16-byte header.
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum = (sum + body[i]!) >>> 0;
  view.setUint32(8, sum, true);
  view.setUint32(12, body.length, true);
  out.set(body, FILE_HEADER_BYTES);

  return out;
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

/**
 * Pack one source frame.
 *
 * The source may be any size; it is area-averaged down to `size × size` using
 * the same resampler as the main-screen exporter, so both tools agree on what
 * a downscaled frame looks like.
 */
export async function encodeEafFrame(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: EncodeEafFrameOptions = {},
): Promise<EafFrameResult> {
  const size = options.size ?? BOOT_ANIM_SIZE;
  const encoding = options.encoding ?? "rle";
  const quality = options.quality ?? 0.9;

  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError(`size must be a positive integer, got ${size}`);
  }
  if (rgba.length !== width * height * 4) {
    throw new RangeError(
      `rgba length ${rgba.length} does not match ${width}x${height}x4 = ${width * height * 4}`,
    );
  }

  const src = width === size && height === size ? rgba : resampleRgba(rgba, width, height, size, size);
  // EAF carries no alpha plane, so anything semi-transparent has to be
  // flattened first — otherwise it would appear at full colour over whatever
  // the panel happened to hold.
  const flat = flattenOntoBlack(src);

  if (encoding === "jpeg") {
    const jpeg = await encodeJpeg(flat, size, quality);
    return { bytes: buildFrame(size, size, 24, [{ encoding: EAF_ENC_JPEG, payload: jpeg }], null), quantizationError: null };
  }

  const quantized = quantize(flat, 256);
  const payload = rleEncode(quantized.indices);
  return {
    bytes: buildFrame(size, size, 8, [{ encoding: EAF_ENC_RLE, payload }], quantized.paletteBgra),
    quantizationError: quantized.meanError,
  };
}

/* ------------------------------------------------------------------ */
/* RLE                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Firmware RLE: a stream of `[count:u8][value:u8]`.
 *
 * `count` is capped at 255 by the byte width, so longer runs are emitted as
 * several pairs — the decoder simply concatenates them.
 */
export function rleEncode(indices: Uint8Array): Uint8Array {
  const out = new Uint8Array(indices.length * 2);
  let o = 0;
  let i = 0;
  const n = indices.length;
  while (i < n) {
    const v = indices[i]!;
    let run = 1;
    while (i + run < n && run < 255 && indices[i + run] === v) run++;
    out[o++] = run;
    out[o++] = v;
    i += run;
  }
  return out.subarray(0, o);
}

/* ------------------------------------------------------------------ */
/* Palette quantisation (median cut)                                   */
/* ------------------------------------------------------------------ */

/** Histogram bucketing cap — beyond this, pixels are sampled for the palette. */
const PALETTE_SAMPLE_CAP = 8192;
/** 15-bit nearest-colour cache: 5 bits per channel. */
const LUT_BITS = 5;
const LUT_SIZE = 1 << (LUT_BITS * 3);

interface Quantized {
  /** 256 entries × 4 bytes, BGRA — the order the firmware reads. */
  paletteBgra: Uint8Array;
  indices: Uint8Array;
  meanError: number;
}

/**
 * Reduce a frame to 256 colours.
 *
 * Median cut: repeatedly split the colour cloud along whichever channel spans
 * the widest range, at the point that halves the pixel population. Splitting
 * by population rather than by position is what keeps a large flat area from
 * being merged into one bucket while a handful of outliers get their own.
 *
 * Nearest-colour lookups go through a 15-bit cache. A naive search would be
 * `pixels × 256` per frame; the cache makes repeated lookups O(1) after the
 * first, which is the difference between usable and not on a 100-frame GIF.
 */
function quantize(rgba: Uint8ClampedArray, maxColors: number): Quantized {
  const pixelCount = rgba.length / 4;
  const step = Math.max(1, Math.ceil(pixelCount / PALETTE_SAMPLE_CAP));

  // ---- histogram keyed by packed RGB
  const histogram = new Map<number, number>();
  for (let i = 0; i < pixelCount; i += step) {
    const key =
      ((rgba[i * 4]! << 16) | (rgba[i * 4 + 1]! << 8) | rgba[i * 4 + 2]!) >>> 0;
    histogram.set(key, (histogram.get(key) ?? 0) + 1);
  }

  const keys = Array.from(histogram.keys());
  const counts = keys.map((k) => histogram.get(k)!);
  const total = counts.reduce((a, b) => a + b, 0);

  // ---- median cut
  const boxes: number[][] = [keys.map((_, i) => i)];
  const channelOf = (idx: number, c: number) =>
    c === 0 ? (keys[idx]! >> 16) & 0xff : c === 1 ? (keys[idx]! >> 8) & 0xff : keys[idx]! & 0xff;

  while (boxes.length < maxColors) {
    // Take the box with the widest channel spread that still has >1 colour.
    let target = -1;
    let bestSpread = 0;
    for (let b = 0; b < boxes.length; b++) {
      const box = boxes[b]!;
      if (box.length < 2) continue;
      let spread = 0;
      for (let c = 0; c < 3; c++) {
        let lo = 255;
        let hi = 0;
        for (const idx of box) {
          const v = channelOf(idx, c);
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        if (hi - lo > spread) spread = hi - lo;
      }
      if (spread > bestSpread) {
        bestSpread = spread;
        target = b;
      }
    }
    if (target < 0) break; // every box is already a single colour

    const box = boxes[target]!;
    let channel = 0;
    let widest = -1;
    for (let c = 0; c < 3; c++) {
      let lo = 255;
      let hi = 0;
      for (const idx of box) {
        const v = channelOf(idx, c);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (hi - lo > widest) {
        widest = hi - lo;
        channel = c;
      }
    }

    box.sort((a, b) => channelOf(a, channel) - channelOf(b, channel));

    let acc = 0;
    let split = 0;
    const half = total / boxes.length / 2; // rough; exactness is not required
    for (let i = 0; i < box.length - 1; i++) {
      acc += counts[box[i]!]!;
      if (acc >= half) {
        split = i + 1;
        break;
      }
    }
    if (split <= 0 || split >= box.length) split = Math.floor(box.length / 2);

    boxes.splice(target, 1, box.slice(0, split), box.slice(split));
  }

  // ---- palette entries are population-weighted box means
  const paletteR = new Uint8Array(boxes.length);
  const paletteG = new Uint8Array(boxes.length);
  const paletteB = new Uint8Array(boxes.length);
  for (let b = 0; b < boxes.length; b++) {
    let r = 0;
    let g = 0;
    let bl = 0;
    let w = 0;
    for (const idx of boxes[b]!) {
      const c = counts[idx]!;
      r += ((keys[idx]! >> 16) & 0xff) * c;
      g += ((keys[idx]! >> 8) & 0xff) * c;
      bl += (keys[idx]! & 0xff) * c;
      w += c;
    }
    if (w > 0) {
      paletteR[b] = Math.round(r / w);
      paletteG[b] = Math.round(g / w);
      paletteB[b] = Math.round(bl / w);
    }
  }

  const paletteBgra = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const c = Math.min(i, boxes.length - 1);
    paletteBgra[i * 4] = paletteB[c]!;
    paletteBgra[i * 4 + 1] = paletteG[c]!;
    paletteBgra[i * 4 + 2] = paletteR[c]!;
    paletteBgra[i * 4 + 3] = 255;
  }

  // ---- map every pixel to its nearest entry
  const lut = new Int16Array(LUT_SIZE).fill(-1);
  const shift = 8 - LUT_BITS;
  const indices = new Uint8Array(pixelCount);
  let errorSum = 0;

  for (let i = 0; i < pixelCount; i++) {
    const r = rgba[i * 4]!;
    const g = rgba[i * 4 + 1]!;
    const b = rgba[i * 4 + 2]!;
    const lutKey = ((r >> shift) << (LUT_BITS * 2)) | ((g >> shift) << LUT_BITS) | (b >> shift);
    let best = lut[lutKey]!;
    if (best < 0) {
      let bestDist = Infinity;
      best = 0;
      for (let c = 0; c < boxes.length; c++) {
        const dr = r - paletteR[c]!;
        const dg = g - paletteG[c]!;
        const db = b - paletteB[c]!;
        // Luma-weighted: the eye is far more tolerant of blue error than green.
        const dist = dr * dr * 2 + dg * dg * 4 + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      lut[lutKey] = best;
    }
    indices[i] = best;
    errorSum +=
      Math.abs(r - paletteR[best]!) + Math.abs(g - paletteG[best]!) + Math.abs(b - paletteB[best]!);
  }

  return { paletteBgra, indices, meanError: errorSum / (pixelCount * 3) };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Composite RGBA over black.
 *
 * Both routes drop alpha, so a semi-transparent pixel must be darkened rather
 * than left at its unpremultiplied colour.
 */
function flattenOntoBlack(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3]!;
    if (a === 255) {
      out[i] = rgba[i]!;
      out[i + 1] = rgba[i + 1]!;
      out[i + 2] = rgba[i + 2]!;
    } else if (a === 0) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
    } else {
      const f = a / 255;
      out[i] = rgba[i]! * f;
      out[i + 1] = rgba[i + 1]! * f;
      out[i + 2] = rgba[i + 2]! * f;
    }
    out[i + 3] = 255;
  }
  return out;
}

let scratchCanvas: HTMLCanvasElement | null = null;

function getScratchCanvas(): HTMLCanvasElement {
  if (!scratchCanvas) scratchCanvas = document.createElement("canvas");
  return scratchCanvas;
}

/**
 * Encode a bare JPEG for the frame payload.
 *
 * The firmware feeds the block straight to its JPEG decoder, so this must be a
 * plain JFIF stream — not wrapped, not chunked — and its dimensions must equal
 * `width × block_height`, which is why the block spans the full frame height.
 */
async function encodeJpeg(
  rgba: Uint8ClampedArray,
  size: number,
  quality: number,
): Promise<Uint8Array> {
  const canvas = getScratchCanvas();
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), size, size), 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) throw new Error("JPEG encoding failed");

  // `imageSmoothingQuality` is not set deliberately: the frame is written at
  // the panel's native size, so no resampling happens inside the encoder.
  return new Uint8Array(await blob.arrayBuffer());
}

/* ------------------------------------------------------------------ */
/* Self-check                                                          */
/* ------------------------------------------------------------------ */

export interface EafCheck {
  ok: boolean;
  frameCount: number;
  bytes: number;
  /** Mean quantisation error across frames, or `null` for the JPEG route. */
  quantizationError: number | null;
  error?: string;
}

/**
 * Re-walk the finished file exactly the way `gfx_eaf_dec.c` does.
 *
 * This cannot prove the device will accept the file — only real hardware can —
 * but it removes every failure mode that is checkable offline: magic, byte
 * order, the checksum definition, frame-table offsets, header arithmetic and
 * block payload lengths. A mistake in any of those is silent on-device (the
 * boot animation simply does not appear), so catching them here matters.
 */
export function verifyEaf(bytes: Uint8Array, expectedEncoding?: number): EafCheck {
  const fail = (error: string): EafCheck => ({
    ok: false,
    frameCount: 0,
    bytes: bytes.length,
    quantizationError: null,
    error,
  });

  if (bytes.length < FILE_HEADER_BYTES) return fail("file shorter than the EAF header");
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== FILE_MAGIC[i]) return fail("bad EAF file magic");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(4, true);
  const checksum = view.getUint32(8, true);
  const storedLen = view.getUint32(12, true);

  if (FILE_HEADER_BYTES + storedLen !== bytes.length) {
    return fail(`stored_len ${storedLen} does not match file length ${bytes.length}`);
  }
  let sum = 0;
  for (let i = FILE_HEADER_BYTES; i < bytes.length; i++) sum = (sum + bytes[i]!) >>> 0;
  if (sum !== checksum) return fail(`checksum ${sum} != stored ${checksum}`);

  const tableEnd = FILE_HEADER_BYTES + count * 8;
  if (tableEnd > bytes.length) return fail("frame table runs past end of file");

  let running = 0;
  for (let i = 0; i < count; i++) {
    const frameSize = view.getUint32(FILE_HEADER_BYTES + i * 8, true);
    const frameOffset = view.getUint32(FILE_HEADER_BYTES + i * 8 + 4, true);
    if (frameOffset !== running) {
      return fail(`frame ${i} offset ${frameOffset} != running ${running}`);
    }
    running += frameSize;

    const d = tableEnd + frameOffset;
    if (d + FRAME_HEADER_BYTES > bytes.length) return fail(`frame ${i} header out of range`);
    if (bytes[d] !== FRAME_MAGIC[0] || bytes[d + 1] !== FRAME_MAGIC[1]) {
      return fail(`frame ${i} bad frame magic`);
    }
    const fmt = String.fromCharCode(bytes[d + 2]!, bytes[d + 3]!);
    if (fmt === "_C") continue; // comment frame; the firmware skips it
    if (fmt !== "_S") return fail(`frame ${i} unexpected format '${fmt}'`);

    const bitDepth = bytes[d + 11]!;
    if (!VALID_BIT_DEPTHS.has(bitDepth)) {
      return fail(`frame ${i} bit_depth ${bitDepth} is rejected by the firmware`);
    }
    const width = view.getUint16(d + 12, true);
    const height = view.getUint16(d + 14, true);
    const blocks = view.getUint16(d + 16, true);
    const blockHeight = view.getUint16(d + 18, true);
    // Blocks tile the frame top to bottom. A gap or an overrun would leave part
    // of the picture undefined on screen, so this is asserted rather than
    // merely read.
    if (blocks * blockHeight !== height) {
      return fail(
        `frame ${i} blocks*block_height ${blocks * blockHeight} != height ${height}`,
      );
    }

    const lens: number[] = [];
    for (let k = 0; k < blocks; k++) {
      lens.push(view.getUint32(d + FRAME_HEADER_BYTES + k * 4, true));
    }
    const paletteBytes = bitDepth === 24 ? 0 : (1 << bitDepth) * 4;
    const head = FRAME_HEADER_BYTES + blocks * 4 + paletteBytes;
    const payloadTotal = lens.reduce((a, b) => a + b, 0);
    if (head + payloadTotal !== frameSize) {
      return fail(`frame ${i} size ${frameSize} != header ${head} + payload ${payloadTotal}`);
    }

    let p = d + head;
    for (let k = 0; k < blocks; k++) {
      const len = lens[k]!;
      const enc = bytes[p]!;
      if (expectedEncoding !== undefined && enc !== expectedEncoding) {
        return fail(`frame ${i} block ${k} encoding ${enc} != expected ${expectedEncoding}`);
      }
      const payload = bytes.subarray(p + 1, p + len);
      if (enc === EAF_ENC_RLE) {
        let decoded = 0;
        for (let q = 0; q + 1 < payload.length; q += 2) decoded += payload[q]!;
        if (decoded !== width * blockHeight) {
          return fail(`frame ${i} RLE decodes to ${decoded}, expected ${width * blockHeight}`);
        }
      } else if (enc === EAF_ENC_JPEG) {
        if (payload.length < 4 || payload[0] !== 0xff || payload[1] !== 0xd8) {
          return fail(`frame ${i} JPEG missing SOI`);
        }
        if (payload[payload.length - 2] !== 0xff || payload[payload.length - 1] !== 0xd9) {
          return fail(`frame ${i} JPEG missing EOI`);
        }
      } else if (enc === EAF_ENC_RAW) {
        if (payload.length !== width * blockHeight) {
          return fail(`frame ${i} RAW payload ${payload.length} != ${width * blockHeight}`);
        }
      }
      p += len;
    }
    if (p !== d + frameSize) return fail(`frame ${i} block walk ended at ${p}, expected ${d + frameSize}`);
  }
  if (tableEnd + running !== bytes.length) {
    return fail(`table + frames ${tableEnd + running} != file ${bytes.length}`);
  }

  return { ok: true, frameCount: count, bytes: bytes.length, quantizationError: null };
}

/**
 * Decode a finished EAF back into RGB pixels, for preview playback.
 *
 * The preview deliberately renders **the generated bytes** rather than the
 * source image: if the container, palette or block payload were wrong, the
 * preview would show it. Each frame is returned as packed RGB (3 bytes per
 * pixel) — no alpha plane exists in this format, so carrying one would just
 * waste memory across a few hundred frames.
 */
export async function decodeEafFrames(
  bytes: Uint8Array,
): Promise<{ width: number; height: number; rgb: Uint8Array }[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(4, true);
  const tableEnd = FILE_HEADER_BYTES + count * 8;
  const out: { width: number; height: number; rgb: Uint8Array }[] = [];

  for (let i = 0; i < count; i++) {
    const frameSize = view.getUint32(FILE_HEADER_BYTES + i * 8, true);
    const frameOffset = view.getUint32(FILE_HEADER_BYTES + i * 8 + 4, true);
    const d = tableEnd + frameOffset;

    const fmt = String.fromCharCode(bytes[d + 2]!, bytes[d + 3]!);
    if (fmt === "_C") continue;
    if (fmt !== "_S") throw new Error(`frame ${i} unexpected format '${fmt}'`);

    const bitDepth = bytes[d + 11]!;
    const width = view.getUint16(d + 12, true);
    const height = view.getUint16(d + 14, true);
    const blocks = view.getUint16(d + 16, true);
    const blockHeight = view.getUint16(d + 18, true);

    const lens: number[] = [];
    for (let k = 0; k < blocks; k++) {
      lens.push(view.getUint32(d + FRAME_HEADER_BYTES + k * 4, true));
    }
    const paletteBytes = bitDepth === 24 ? 0 : (1 << bitDepth) * 4;
    const head = FRAME_HEADER_BYTES + blocks * 4 + paletteBytes;

    const rgb = new Uint8Array(width * height * 3);
    let written = 0;

    let p = d + head;
    for (let k = 0; k < blocks; k++) {
      const len = lens[k]!;
      const enc = bytes[p]!;
      const payload = bytes.subarray(p + 1, p + len);
      const span = width * blockHeight;

      if (enc === EAF_ENC_RLE) {
        // Palette entries are BGRA; indices resolve to one pixel each.
        for (let q = 0; q + 1 < payload.length; q += 2) {
          const run = payload[q]!;
          const index = payload[q + 1]!;
          const e = d + FRAME_HEADER_BYTES + blocks * 4 + index * 4;
          const b = bytes[e]!;
          const g = bytes[e + 1]!;
          const r = bytes[e + 2]!;
          for (let n = 0; n < run && written < span; n++) {
            rgb[written * 3] = r;
            rgb[written * 3 + 1] = g;
            rgb[written * 3 + 2] = b;
            written++;
          }
        }
      } else if (enc === EAF_ENC_JPEG) {
        const slice = await decodeJpegToRgb(payload, width, blockHeight);
        rgb.set(slice.subarray(0, Math.min(slice.length, rgb.length - written * 3)), written * 3);
        written += span;
      } else if (enc === EAF_ENC_RAW) {
        for (let n = 0; n < payload.length && written < span; n++) {
          const e = d + FRAME_HEADER_BYTES + blocks * 4 + payload[n]! * 4;
          rgb[written * 3] = bytes[e + 2]!;
          rgb[written * 3 + 1] = bytes[e + 1]!;
          rgb[written * 3 + 2] = bytes[e]!;
          written++;
        }
      } else {
        throw new Error(`frame ${i} uses encoding ${enc}, which has no preview decoder`);
      }
      p += len;
    }

    if (written !== width * height) {
      throw new Error(`frame ${i} decoded ${written} px, expected ${width * height}`);
    }
    out.push({ width, height, rgb });
    void frameSize;
  }

  return out;
}

/** Decode one bare JPEG block to packed RGB at its natural size. */
async function decodeJpegToRgb(
  payload: Uint8Array,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const blob = new Blob([toBlobPart(payload)], { type: "image/jpeg" });
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = getScratchCanvas();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("canvas 2d context unavailable");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
      rgb[i * 3] = data[i * 4]!;
      rgb[i * 3 + 1] = data[i * 4 + 1]!;
      rgb[i * 3 + 2] = data[i * 4 + 2]!;
    }
    return rgb;
  } finally {
    bitmap.close();
  }
}

/* ------------------------------------------------------------------ */
/* Budget                                                              */
/* ------------------------------------------------------------------ */

export interface BootBudget {
  totalBytes: number;
  frameCount: number;
  durationSeconds: number;
  /** True when the file is within `EMOTE_SD_BOOT_EAF_READ_MAX`. */
  withinLimit: boolean;
}

/**
 * Classify a finished export against the boot slot's single hard limit.
 *
 * Unlike the main screen there is no streaming fallback here — over 8 MB the
 * animation is dropped silently, so this is a binary pass/fail rather than a
 * quality downgrade.
 */
export function bootBudget(totalBytes: number, frameCount: number): BootBudget {
  return {
    totalBytes,
    frameCount,
    durationSeconds: frameCount / BOOT_ANIM_FPS,
    withinLimit: totalBytes <= BOOT_EAF_READ_MAX,
  };
}
