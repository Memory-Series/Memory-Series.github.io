/**
 * Turn an uploaded GIF / still image into device-ready main-screen animation
 * frames (`frame_NNN.bin` payloads).
 *
 * The whole pipeline runs in the browser — nothing is uploaded. Frames are
 * decoded and encoded **one at a time**: each decoded RGBA buffer is packed
 * immediately and then dropped, so peak memory is roughly
 * `frameCount × 388 KB` instead of `frameCount × fullSizeRGBA`. A 1000×1000
 * source with 120 frames would otherwise hold ~480 MB of pixels at once.
 *
 * Decoding uses the platform `ImageDecoder` when available (Chromium). It
 * handles GIF, APNG and animated WebP, and — usefully — also still images, so
 * a single code path covers every accepted input. When it is missing, still
 * images still work through `createImageBitmap`; animated sources then get an
 * explicit error instead of silently collapsing to their first frame.
 */

import {
  encodeMainAnimFrame,
  MAIN_ANIM_SIZE,
  MAIN_ANIM_MAX_FRAMES,
  type AlphaMode,
} from "./main-anim-encoder";

/** Keep the same ceiling as the dialogue-background converter. */
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

export interface ConvertOptions {
  /** Output square edge. Defaults to {@link MAIN_ANIM_SIZE}. */
  size?: number;
  /**
   * Export at most this many frames. When the source has more, frames are
   * sampled at even intervals across the whole clip so the motion still reads
   * end to end. Capped at {@link MAIN_ANIM_MAX_FRAMES}.
   */
  maxFrames?: number;
  alpha?: AlphaMode;
  onProgress?: (encoded: number, total: number) => void;
  signal?: AbortSignal;
}

export interface ConvertResult {
  /** Encoded `esp_emote_gfx` buffers, in playback order. */
  frames: ArrayBuffer[];
  /** Source pixel dimensions (before resampling). */
  sourceWidth: number;
  sourceHeight: number;
  /** Frames present in the source file. */
  sourceFrameCount: number;
  /** Indices taken from the source, ascending. */
  sampledIndices: number[];
  animated: boolean;
  /**
   * Sum of the source's own frame delays in seconds — only available when every
   * frame was decoded (i.e. nothing was sampled away), otherwise `null`.
   *
   * Worth showing when present: the device ignores these delays entirely and
   * always plays at 24 FPS, so the user should see how the timing will change.
   */
  sourceDurationSeconds: number | null;
  elapsedMs: number;
}

export type ConvertErrorCode =
  | "unsupportedType"
  | "tooBig"
  | "animationUnsupported"
  | "decodeFailed"
  | "aborted";

export class ConvertError extends Error {
  code: ConvertErrorCode;
  detail?: string;

  constructor(code: ConvertErrorCode, detail?: string) {
    super(code);
    this.name = "ConvertError";
    this.code = code;
    this.detail = detail;
  }
}

const ANIMATED_TYPES = new Set(["image/gif", "image/webp", "image/apng", "image/png"]);
const SUPPORTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
]);

interface Decoder {
  frameCount: number;
  /** Decode one frame into RGBA pixels at the decoder's native size. */
  read(index: number, canvas: HTMLCanvasElement): Promise<FrameRead>;
  close(): void;
}

interface FrameRead {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  /** Frame delay in seconds, when the container reports one. */
  durationSeconds: number | null;
}

/** Whether the browser exposes the animated-image decoding API. */
export function supportsAnimatedDecoding(): boolean {
  return typeof (globalThis as { ImageDecoder?: unknown }).ImageDecoder === "function";
}

/** Whether the browser can decode animated sources at all. */
export function canDecodeAnimation(): boolean {
  return supportsAnimatedDecoding();
}

function isAnimatedType(file: File): boolean {
  // Deliberately conservative. `image/webp` and `image/png` may be still images,
  // but a still image costs nothing here (the decoder reports frameCount === 1),
  // whereas treating an animated source as still would silently export its first
  // frame only. Erring toward "needs a real decoder" is the safer mistake.
  return ANIMATED_TYPES.has(file.type);
}

/* ------------------------------------------------------------------ */
/* Decoder implementations                                             */
/* ------------------------------------------------------------------ */

interface ImageDecoderCtor {
  new (init: { data: ArrayBuffer | Uint8Array; type: string }): {
    completed: Promise<void>;
    tracks: {
      /** Resolves once `selectedTrack` is populated. */
      ready: Promise<void>;
      selectedTrack: { frameCount: number } | null;
    };
    decode(options: { frameIndex: number }): Promise<{ image: VideoFrame }>;
    close(): void;
  };
}

async function openImageDecoder(file: File): Promise<Decoder> {
  const ctor = (globalThis as { ImageDecoder?: ImageDecoderCtor }).ImageDecoder;
  if (!ctor) throw new ConvertError("animationUnsupported");

  const data = await file.arrayBuffer();
  const decoder = new ctor({ data, type: file.type || "image/gif" });
  try {
    await decoder.completed;
  } catch (e) {
    decoder.close();
    throw new ConvertError("decodeFailed", e instanceof Error ? e.message : String(e));
  }

  // `selectedTrack` stays null until `tracks.ready` resolves. Reading it any
  // earlier makes every animated source look like a single-frame image — the
  // frame-count fallback below would then quietly export just one frame.
  await decoder.tracks.ready;
  const track = decoder.tracks.selectedTrack;
  const frameCount = track && track.frameCount > 0 ? track.frameCount : 1;

  return {
    frameCount,
    async read(index: number, canvas: HTMLCanvasElement): Promise<FrameRead> {
      let image: VideoFrame;
      try {
        ({ image } = await decoder.decode({ frameIndex: index }));
      } catch (e) {
        throw new ConvertError("decodeFailed", e instanceof Error ? e.message : String(e));
      }
      try {
        const width = image.displayWidth;
        const height = image.displayHeight;
        const ctx = prepareCanvas(canvas, width, height);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        const raw = image.duration; // microseconds, may be null
        return {
          width,
          height,
          rgba: ctx.getImageData(0, 0, width, height).data,
          durationSeconds: typeof raw === "number" && raw > 0 ? raw / 1_000_000 : null,
        };
      } finally {
        image.close();
      }
    },
    close() {
      decoder.close();
    },
  };
}

async function openBitmapDecoder(file: File): Promise<Decoder> {
  const bitmap = await createImageBitmap(file).catch((e: unknown) => {
    throw new ConvertError("decodeFailed", e instanceof Error ? e.message : String(e));
  });
  let consumed = false;

  return {
    frameCount: 1,
    async read(_index: number, canvas: HTMLCanvasElement): Promise<FrameRead> {
      if (consumed) throw new ConvertError("decodeFailed", "bitmap already consumed");
      consumed = true;
      const width = bitmap.width;
      const height = bitmap.height;
      const ctx = prepareCanvas(canvas, width, height);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0);
      const rgba = ctx.getImageData(0, 0, width, height).data;
      bitmap.close();
      return { width, height, rgba, durationSeconds: null };
    },
    close() {
      if (!consumed) {
        bitmap.close();
        consumed = true;
      }
    },
  };
}

function prepareCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new ConvertError("decodeFailed", "canvas 2d context unavailable");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Frame sampling                                                      */
/* ------------------------------------------------------------------ */

/**
 * Pick at most `max` frame indices spread evenly across `total`.
 *
 * Even spacing matters more than it looks: the device plays frames in file
 * order at a fixed 24 FPS, so simply keeping the first N frames would cut the
 * clip short instead of compressing it.
 */
export function sampleIndices(total: number, max: number): number[] {
  if (total <= 0) return [];
  const limit = Math.max(1, Math.min(max, MAIN_ANIM_MAX_FRAMES));
  if (total <= limit) return Array.from({ length: total }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < limit; i++) {
    out.push(Math.floor((i * total) / limit));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export async function convertToDeviceFrames(
  file: File,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  const started = performance.now();
  const size = options.size ?? MAIN_ANIM_SIZE;
  const maxFrames = Math.max(1, Math.min(options.maxFrames ?? MAIN_ANIM_MAX_FRAMES, MAIN_ANIM_MAX_FRAMES));

  if (file.type && !SUPPORTED_TYPES.has(file.type)) {
    throw new ConvertError("unsupportedType", file.type);
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ConvertError("tooBig", String(file.size));
  }

  const needsAnimated = isAnimatedType(file);
  if (needsAnimated && !supportsAnimatedDecoding()) {
    throw new ConvertError("animationUnsupported");
  }

  const decoder =
    supportsAnimatedDecoding() ? await openImageDecoder(file) : await openBitmapDecoder(file);

  const canvas = document.createElement("canvas");
  const indices = sampleIndices(decoder.frameCount, maxFrames);
  const frames: ArrayBuffer[] = [];

  let sourceWidth = 0;
  let sourceHeight = 0;
  let durationTotal = 0;
  let durationComplete = true;

  try {
    for (let i = 0; i < indices.length; i++) {
      if (options.signal?.aborted) throw new ConvertError("aborted");

      const read = await decoder.read(indices[i]!, canvas);
      if (i === 0) {
        sourceWidth = read.width;
        sourceHeight = read.height;
      }
      if (read.durationSeconds === null) durationComplete = false;
      else durationTotal += read.durationSeconds;

      frames.push(
        encodeMainAnimFrame(read.rgba, read.width, read.height, {
          size,
          alpha: options.alpha,
        }),
      );

      options.onProgress?.(i + 1, indices.length);
      await yieldToUi();
    }
  } finally {
    decoder.close();
  }

  const decodedAll = indices.length === decoder.frameCount;

  return {
    frames,
    sourceWidth,
    sourceHeight,
    sourceFrameCount: decoder.frameCount,
    sampledIndices: indices,
    animated: decoder.frameCount > 1,
    sourceDurationSeconds: decodedAll && durationComplete && durationTotal > 0 ? durationTotal : null,
    elapsedMs: performance.now() - started,
  };
}

/**
 * Hand control back to the browser between frames.
 *
 * Deliberately `setTimeout` rather than `requestAnimationFrame`: rAF is paused
 * entirely in a background tab, which would stall a long conversion if the user
 * switched away mid-export.
 */
function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
