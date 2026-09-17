/**
 * TypeScript 5.7 gave typed arrays a backing-store type parameter:
 * `Uint8Array` now means `Uint8Array<ArrayBufferLike>`, while the DOM's
 * `BlobPart` only accepts views over a plain `ArrayBuffer` — a view that
 * *might* sit on a `SharedArrayBuffer` is rejected.
 *
 * Every buffer this site builds is a plain `ArrayBuffer`, so narrow it once
 * here instead of casting at each `new Blob(...)` call site. This returns the
 * same bytes; nothing is copied.
 */
export function toBlobPart(bytes: Uint8Array): BlobPart {
  return bytes as unknown as BlobPart;
}
