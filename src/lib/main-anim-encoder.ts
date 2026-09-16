/**
 * Encode RGBA frames into the device's **main-screen animation** frame format
 * (`frame_NNN.bin`).
 *
 * Why this file exists rather than reusing `dialogue-bg-encoder.ts`: the two
 * targets look alike but are not the same job. The dialogue background is a
 * fixed 412×412 with a binary alpha mask; main-screen frames are 360×360,
 * keep their alpha as-is, and are resampled for visual quality rather than for
 * byte parity with an official script. The dialogue encoder is already
 * verified, so it is left untouched; the small amount of duplicated packing
 * code is the cheaper trade.
 *
 * ## Format (read out of the firmware, not guessed)
 *
 * `emote_sd_main_anim.c` accepts two encodings per frame file:
 *
 *   1. `esp_emote_gfx` — first byte `0x19`; the file is taken verbatim.
 *   2. LVGL v8 `TRUE_COLOR_ALPHA` — 4-byte header, `cf = 5`, pixels
 *      interleaved as `[rgb565_lo, rgb565_hi, alpha]`, file length `4 + w*h*3`;
 *      the firmware converts it to gfx and swaps bytes on the way in.
 *
 * This module produces **encoding 1**, the same container the dialogue
 * background uses:
 *
 *   header  (12 B) — `lv_image_header_t` as three little-endian u32 words:
 *                    [0] = magic (0x19) | cf (0x0A) << 8
 *                    [1] = width | height << 16
 *                    [2] = stride (width * 2) | 0 << 16
 *   RGB565  (w*h*2 B) — big-endian per pixel (high byte first, as written by
 *                       the firmware's own packing routine).
 *   alpha   (w*h  B)  — 8-bit alpha, verbatim.
 *
 * Total length is `12 + w*h*3`; at 360×360 that is **388,812 bytes**.
 */

/* ------------------------------------------------------------------ */
/* Device spec — every number below is a firmware constant             */
/* ------------------------------------------------------------------ */

/** Layout magic at byte 0 of a packed `esp_emote_gfx` header. */
export const GFX_HEADER_MAGIC = 0x19;
/** `GFX_COLOR_FORMAT_RGB565A8` — RGB565 plane followed by an A8 plane. */
export const GFX_CF_RGB565A8 = 0x0a;
/** Size of `gfx_image_header_t`. */
export const GFX_HEADER_BYTES = 12;

/**
 * Square edge of generated frames.
 *
 * The panel is 360×360 (`gen_board_device_config.c` → `.lcd_width =
 * .lcd_height = 360`; Waveshare ESP32-S3-Touch-LCD-1.85B, ST77916 QSPI). 412 is
 * the previous generation's size: it still displays, because `emote.c` sizes
 * the background object to the panel, but every frame would carry ~30% more
 * data and take an extra rescale. 1:1 with the panel is both smaller and
 * sharper.
 */
export const MAIN_ANIM_SIZE = 360;

/** `EMOTE_SD_MAIN_MAX_FRAMES`. Beyond this the firmware silently truncates. */
export const MAIN_ANIM_MAX_FRAMES = 512;

/** `EMOTE_SD_MAIN_READ_MAX` — a single frame file larger than this will not load. */
export const MAIN_ANIM_FRAME_READ_MAX = 512 * 1024;

/** `EMOTE_SD_MAIN_CACHE_HEADROOM_BYTES` — PSRAM kept free for `dialogue_bg.bin`. */
export const MAIN_ANIM_CACHE_HEADROOM = 640 * 1024;

/**
 * `EMOTE_SD_MAIN_ANIM_FPS` — a compile-time constant. The firmware advances
 * frames on a `1000 / 24 = 41` ms timer, so a GIF's own frame delays are
 * ignored entirely and the played duration is just `frames / 24`.
 */
export const MAIN_ANIM_FPS = 24;

/**
 * Empty marker file that makes the firmware prefer frame bins over `main.eaf`.
 *
 * Without it, a card that already has `main.eaf` would keep playing that file
 * and never look at the frames — so the export must always include it.
 */
export const MAIN_ANIM_MARKER_FILE = "use_slide_frames";

/**
 * File name for a frame at `index`.
 *
 * Zero-padded so lexicographic order matches the order the firmware sorts by
 * (`sscanf(name, "frame_%lu")` reads the number). Frames are exported as a
 * gapless sequence, so the two orderings are identical — but padding keeps it
 * that way even if a subset is ever exported.
 */
export function frameFileName(index: number, width = 3): string {
  return `frame_${String(index).padStart(width, "0")}.bin`;
}

/**
 * Conservative PSRAM figure used for the cache estimate.
 *
 * The board has 8 MB of octal PSRAM (`CONFIG_SPIRAM_MODE_OCT=y`, size
 * auto-detected), but the firmware places instructions and rodata in PSRAM
 * (`CONFIG_SPIRAM_FETCH_INSTRUCTIONS=y`, `CONFIG_SPIRAM_RODATA=y`) and the
 * runtime figure is only known on-device via `heap_caps_get_free_size()`.
 * Quoting 6 MB keeps the estimate on the pessimistic side, which is the right
 * direction: it makes the UI warn earlier rather than later.
 */
export const MAIN_ANIM_ASSUMED_FREE_PSRAM = 6 * 1024 * 1024;

/** Bytes required for one packed square frame of `size`. */
export function expectedMainAnimFrameBytes(size: number = MAIN_ANIM_SIZE): number {
  return GFX_HEADER_BYTES + size * size * 3;
}

/* ------------------------------------------------------------------ */
/* Budget                                                             */
/* ------------------------------------------------------------------ */

export type BudgetTier = "cacheable" | "streaming" | "rejected";

export interface FrameBudget {
  /** Bytes of a single frame at the target size. */
  bytesPerFrame: number;
  /** Total bytes of all frames, before ZIP overhead. */
  totalBytes: number;
  /** Playback duration in seconds, derived from the fixed 24 FPS. */
  durationSeconds: number;
  /** How many frames fit in PSRAM alongside the required headroom. */
  cacheableFrames: number;
  tier: BudgetTier;
  /** i18n key suffix under `sections.assets.mainAnim.budget.*`. */
  reasonKey: "ok" | "streaming" | "tooManyFrames" | "frameTooLarge";
}

/**
 * Classify a planned export against the firmware's own limits.
 *
 * The important nuance: exceeding the PSRAM cache budget is **not** a failure.
 * `emote_sd_main_build_frame_cache()` falls back to double-buffered streaming
 * from the SD card, which the firmware fully supports. It is a quality
 * downgrade (frame pacing then depends on card speed), not a rejection.
 */
export function frameBudget(
  frameCount: number,
  size: number = MAIN_ANIM_SIZE,
): FrameBudget {
  const bytesPerFrame = expectedMainAnimFrameBytes(size);
  const totalBytes = bytesPerFrame * frameCount;
  const cacheableFrames = Math.max(
    0,
    Math.floor((MAIN_ANIM_ASSUMED_FREE_PSRAM - MAIN_ANIM_CACHE_HEADROOM) / bytesPerFrame),
  );

  let tier: BudgetTier = "cacheable";
  let reasonKey: FrameBudget["reasonKey"] = "ok";

  if (frameCount > MAIN_ANIM_MAX_FRAMES) {
    tier = "rejected";
    reasonKey = "tooManyFrames";
  } else if (bytesPerFrame > MAIN_ANIM_FRAME_READ_MAX) {
    tier = "rejected";
    reasonKey = "frameTooLarge";
  } else if (frameCount > cacheableFrames) {
    tier = "streaming";
    reasonKey = "streaming";
  }

  return {
    bytesPerFrame,
    totalBytes,
    durationSeconds: frameCount / MAIN_ANIM_FPS,
    cacheableFrames,
    tier,
    reasonKey,
  };
}

/* ------------------------------------------------------------------ */
/* Encoding                                                            */
/* ------------------------------------------------------------------ */

/**
 * How the A8 plane is derived.
 *
 * - `passthrough` — keep the source alpha verbatim. Matches the firmware's own
 *   converter (`alpha_plane[i] = pixels[src_offset + 2]`) and is what main-screen
 *   frames use.
 * - `binary` — threshold at 128. Kept for callers that want the dialogue
 *   background's mask semantics.
 */
export type AlphaMode = "passthrough" | "binary";

export interface EncodeFrameOptions {
  /** Square edge of the output. Defaults to {@link MAIN_ANIM_SIZE}. */
  size?: number;
  alpha?: AlphaMode;
}

/**
 * Pack a single frame into an `esp_emote_gfx` RGB565A8 buffer.
 *
 * The source may be any size; it is area-averaged down to `size × size`
 * (or upscaled with nearest-neighbour). Source pixels are weighted by their
 * own alpha while averaging, so transparent regions do not bleed dark halos
 * into the edges of a subject.
 */
export function encodeMainAnimFrame(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  options: EncodeFrameOptions = {},
): ArrayBuffer {
  const size = options.size ?? MAIN_ANIM_SIZE;
  const alphaMode = options.alpha ?? "passthrough";

  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError(`size must be a positive integer, got ${size}`);
  }
  if (rgba.length !== width * height * 4) {
    throw new RangeError(
      `rgba length ${rgba.length} does not match ${width}x${height}x4 = ${width * height * 4}`,
    );
  }

  const src =
    width === size && height === size
      ? rgba
      : resample(rgba, width, height, size, size);

  const out = new ArrayBuffer(expectedMainAnimFrameBytes(size));
  const view = new DataView(out);
  const bytes = new Uint8Array(out);

  view.setUint32(0, GFX_HEADER_MAGIC | (GFX_CF_RGB565A8 << 8), true);
  view.setUint32(4, (size & 0xffff) | ((size & 0xffff) << 16), true);
  view.setUint32(8, (size * 2) & 0xffff, true);

  const pixelCount = size * size;
  let off = GFX_HEADER_BYTES;

  for (let i = 0; i < pixelCount; i++) {
    const c = rgbToRgb565(src[i * 4]!, src[i * 4 + 1]!, src[i * 4 + 2]!);
    bytes[off++] = (c >> 8) & 0xff; // high byte first
    bytes[off++] = c & 0xff;
  }

  for (let i = 0; i < pixelCount; i++) {
    const a = src[i * 4 + 3]!;
    bytes[off++] = alphaMode === "binary" ? (a >= 128 ? 255 : 0) : a;
  }

  return out;
}

/** Decode an RGB565A8 buffer back to RGBA. Used for previews and self-checks. */
export function decodeMainAnimFrame(buf: ArrayBuffer): {
  width: number;
  height: number;
  rgba: Uint8ClampedArray<ArrayBuffer>;
} {
  if (buf.byteLength < GFX_HEADER_BYTES) {
    throw new Error(`Buffer too small for a gfx header (${buf.byteLength} B)`);
  }
  const view = new DataView(buf);
  const word0 = view.getUint32(0, true);
  const word1 = view.getUint32(4, true);
  const word2 = view.getUint32(8, true);

  if ((word0 & 0xff) !== GFX_HEADER_MAGIC || ((word0 >> 8) & 0xff) !== GFX_CF_RGB565A8) {
    throw new Error(
      `Bad RGB565A8 magic 0x${word0.toString(16)} (expected 0x19 / cf 0x0a)`,
    );
  }

  const width = word1 & 0xffff;
  const height = (word1 >>> 16) & 0xffff;
  const stride = word2 & 0xffff;

  if (width === 0 || height === 0) {
    throw new Error(`Bad frame dimensions ${width}x${height}`);
  }
  if (stride !== width * 2) {
    throw new Error(`Bad stride ${stride} for width ${width} (expected ${width * 2})`);
  }
  const expected = GFX_HEADER_BYTES + width * height * 3;
  if (buf.byteLength !== expected) {
    throw new Error(
      `Buffer length ${buf.byteLength} does not match expected ${expected} for ${width}x${height}`,
    );
  }

  const u8 = new Uint8Array(buf);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const pixelCount = width * height;
  let off = GFX_HEADER_BYTES;

  for (let i = 0; i < pixelCount; i++) {
    const v = (u8[off]! << 8) | u8[off + 1]!;
    off += 2;
    pixels[i * 4] = (((v >> 11) & 0x1f) * 255) / 31;
    pixels[i * 4 + 1] = (((v >> 5) & 0x3f) * 255) / 63;
    pixels[i * 4 + 2] = ((v & 0x1f) * 255) / 31;
  }
  for (let i = 0; i < pixelCount; i++) {
    pixels[i * 4 + 3] = u8[off++]!;
  }

  return { width, height, rgba: pixels };
}

export interface FrameCheck {
  ok: boolean;
  width: number;
  height: number;
  bytes: number;
  /** Number of differing bytes between the buffer and a decode→encode round trip. */
  mismatches: number;
  error?: string;
}

/**
 * Self-check: decode the buffer and re-encode the result, then compare bytes.
 *
 * This proves the container is internally consistent (header, plane sizes,
 * byte order, RGB565 round-trip stability) before the user downloads anything.
 * It cannot prove the firmware will accept the file — only a real device can
 * answer that — but it removes every failure mode that is checkable offline.
 */
export function verifyMainAnimFrame(frame: ArrayBuffer): FrameCheck {
  try {
    const decoded = decodeMainAnimFrame(frame);
    const again = encodeMainAnimFrame(decoded.rgba, decoded.width, decoded.height, {
      size: decoded.width,
    });
    const a = new Uint8Array(frame);
    const b = new Uint8Array(again);
    let mismatches = 0;
    if (a.length !== b.length) {
      mismatches = Math.max(a.length, b.length);
    } else {
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) mismatches++;
      }
    }
    return {
      ok: mismatches === 0,
      width: decoded.width,
      height: decoded.height,
      bytes: frame.byteLength,
      mismatches,
    };
  } catch (e) {
    return {
      ok: false,
      width: 0,
      height: 0,
      bytes: frame.byteLength,
      mismatches: -1,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/* ------------------------------------------------------------------ */
/* Internals                                                           */
/* ------------------------------------------------------------------ */

/** Pack 8-bit R, G, B into a 16-bit RGB565 word. */
function rgbToRgb565(r: number, g: number, b: number): number {
  // Same truncating quantization the firmware's own converter uses.
  return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
}

/**
 * Area-averaging resampler.
 *
 * Colours are accumulated pre-multiplied by alpha and divided by the summed
 * alpha, so fully transparent pixels (which carry RGB 0,0,0) do not darken the
 * result. Upscaling falls back to nearest-neighbour, which is fine because the
 * target is a fixed small square and large upscales are rare in practice.
 */
function resample(
  src: Uint8ClampedArray,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(dw * dh * 4);

  if (dw >= sw && dh >= sh) {
    return resampleNearest(src, sw, sh, dw, dh);
  }

  const xRatio = sw / dw;
  const yRatio = sh / dh;

  for (let y = 0; y < dh; y++) {
    const sy0 = y * yRatio;
    const sy1 = sy0 + yRatio;
    const iy0 = Math.floor(sy0);
    const iy1 = Math.min(Math.ceil(sy1), sh);

    for (let x = 0; x < dw; x++) {
      const sx0 = x * xRatio;
      const sx1 = sx0 + xRatio;
      const ix0 = Math.floor(sx0);
      const ix1 = Math.min(Math.ceil(sx1), sw);

      let rAcc = 0;
      let gAcc = 0;
      let bAcc = 0;
      let aAcc = 0;
      let aWeight = 0;

      for (let sy = iy0; sy < iy1; sy++) {
        const wy = Math.min(sy1, sy + 1) - Math.max(sy0, sy);
        if (wy <= 0) continue;
        for (let sx = ix0; sx < ix1; sx++) {
          const wx = Math.min(sx1, sx + 1) - Math.max(sx0, sx);
          if (wx <= 0) continue;
          const w = wx * wy;
          const si = (sy * sw + sx) * 4;
          const a = src[si + 3]!;
          const aw = w * a;
          rAcc += src[si]! * aw;
          gAcc += src[si + 1]! * aw;
          bAcc += src[si + 2]! * aw;
          aAcc += a * w;
          aWeight += w;
        }
      }

      const di = (y * dw + x) * 4;
      if (aWeight > 0) {
        dst[di + 3] = aAcc / aWeight; // mean alpha over the covered area
        if (aAcc > 0) {
          // `rAcc`/`gAcc`/`bAcc` are weighted by `area * alpha`, and `aAcc` is
          // exactly `sum(area * alpha)`, so this divides out to the mean colour
          // of the non-transparent samples.
          dst[di] = rAcc / aAcc;
          dst[di + 1] = gAcc / aAcc;
          dst[di + 2] = bAcc / aAcc;
        }
      }
    }
  }

  return dst;
}

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
    const sy = Math.min(Math.floor((y + 0.5) * yRatio), sh - 1);
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(Math.floor((x + 0.5) * xRatio), sw - 1);
      const si = (sy * sw + sx) * 4;
      const di = (y * dw + x) * 4;
      dst[di] = src[si]!;
      dst[di + 1] = src[si + 1]!;
      dst[di + 2] = src[si + 2]!;
      dst[di + 3] = src[si + 3]!;
    }
  }
  return dst;
}
