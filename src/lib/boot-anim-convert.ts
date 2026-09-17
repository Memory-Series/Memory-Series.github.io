/**
 * Turn an uploaded GIF / still image into a device-ready **boot animation**
 * (a single `.eaf` file).
 *
 * The boot slot has no fallback: it reads `boot.eaf` and nothing else, and if
 * the container is wrong the animation is skipped silently — the device goes
 * straight to the main screen with no error anywhere. That makes the offline
 * self-check in `eaf-encoder.ts` load-bearing rather than decorative, and it is
 * why the result is verified before a download is ever offered.
 *
 * Decoding is shared with the main-screen exporter through
 * `decodeAnimationFrames`, so both tools accept the same inputs, sample frames
 * the same way and report the same source facts. Only the encoder differs.
 *
 * Everything runs in the browser — nothing is uploaded.
 */

import {
  BOOT_ANIM_SIZE,
  buildEaf,
  encodeEafFrame,
  type BootEncoding,
} from "./eaf-encoder";
import {
  decodeAnimationFrames,
  type DecodeSummary,
} from "./main-anim-convert";

/**
 * Frame ceiling for the export.
 *
 * The firmware imposes no explicit frame limit at this slot the way it does for
 * main-screen frames — the binding constraint is the 8 MB read ceiling. 512 is
 * kept as a sanity bound simply because it matches the other exporter and is
 * far beyond any sensible boot animation (512 frames is 21 seconds).
 */
export const BOOT_ANIM_MAX_FRAMES = 512;

/**
 * Presets offered in the UI, expressed as playback seconds at 24 FPS.
 *
 * The top end (7.5 s) is already generous for something that plays once on the
 * way to the main screen, and it keeps every preset inside the 8 MB ceiling on
 * both encodings.
 */
export const BOOT_FRAME_CHOICES = [24, 48, 96, 180] as const;

export interface BootConvertOptions {
  /** Square edge of the output. Defaults to {@link BOOT_ANIM_SIZE}. */
  size?: number;
  encoding?: BootEncoding;
  /** Export at most this many frames; sampled evenly across the clip. */
  maxFrames?: number;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

export interface BootConvertResult extends DecodeSummary {
  /** The complete EAF file. */
  bytes: Uint8Array;
  frameCount: number;
  encoding: BootEncoding;
  /**
   * Mean per-channel quantisation error, `null` for the JPEG route. Surfaced so
   * the UI can suggest the other encoding when colour is being lost.
   */
  quantizationError: number | null;
  elapsedMs: number;
}

export async function convertToBootAnimation(
  file: File,
  options: BootConvertOptions = {},
): Promise<BootConvertResult> {
  const started = performance.now();
  const size = options.size ?? BOOT_ANIM_SIZE;
  const encoding = options.encoding ?? "rle";
  const maxFrames = Math.max(
    1,
    Math.min(options.maxFrames ?? BOOT_ANIM_MAX_FRAMES, BOOT_ANIM_MAX_FRAMES),
  );

  const frames: Uint8Array[] = [];
  let errorSum = 0;
  let errorFrames = 0;

  const summary = await decodeAnimationFrames(
    file,
    { maxFrames, onProgress: options.onProgress, signal: options.signal },
    async (read) => {
      // Encoded immediately and the decoded RGBA is dropped, so the peak is
      // one source frame plus the accumulated output bytes — not every frame's
      // pixels at once.
      const encoded = await encodeEafFrame(read.rgba, read.width, read.height, {
        size,
        encoding,
      });
      frames.push(encoded.bytes);
      if (encoded.quantizationError !== null) {
        errorSum += encoded.quantizationError;
        errorFrames++;
      }
    },
  );

  return {
    ...summary,
    bytes: buildEaf(frames),
    frameCount: frames.length,
    encoding,
    quantizationError: errorFrames > 0 ? errorSum / errorFrames : null,
    elapsedMs: performance.now() - started,
  };
}
