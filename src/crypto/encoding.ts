/** Base64 <-> bytes helpers that work in browser and Node (vitest). */

const enc = new TextEncoder();
const dec = new TextDecoder();

export function utf8Encode(text: string): Uint8Array {
  return enc.encode(text);
}

export function utf8Decode(bytes: Uint8Array): string {
  return dec.decode(bytes);
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Best-effort cleanup of sensitive buffers. JS cannot guarantee memory erasure. */
export function zeroize(...buffers: (Uint8Array | null | undefined)[]): void {
  for (const b of buffers) {
    if (b) b.fill(0);
  }
}
