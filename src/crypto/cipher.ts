/**
 * cipher — AES-256-GCM autenticado via Web Crypto API.
 *
 * Regras:
 *  - IV (nonce) aleatório e único por operação (nunca reutilizado).
 *  - AAD vincula o ciphertext a um contexto (ex.: id do registro), impedindo
 *    troca de blobs entre registros.
 *  - Nada é persistido em texto puro.
 */
import { fromBase64, toBase64, utf8Decode, utf8Encode, zeroize } from './encoding';

export const CIPHER_VERSION = 1;

export interface EncPayload {
  /** versão do formato */
  v: number;
  /** IV base64 (12 bytes) */
  iv: string;
  /** ciphertext base64 (inclui tag GCM de 16 bytes) */
  ct: string;
}

export class DecryptionError extends Error {
  constructor(message = 'Falha ao descriptografar: chave ou dados inválidos.') {
    super(message);
    this.name = 'DecryptionError';
  }
}

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export async function generateAesKey(extractable = false): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt']);
}

/** Gera uma chave simétrica a partir de bytes aleatórios (ex.: DEK do cofre). */
export async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function exportAesKeyRaw(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey('raw', key));
}

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API indisponível. Use um contexto seguro (HTTPS/localhost).');
  }
  return globalThis.crypto.subtle;
}

export async function encryptJson(key: CryptoKey, data: unknown, aad?: string): Promise<EncPayload> {
  const iv = randomBytes(12);
  const plaintext = utf8Encode(JSON.stringify(data));
  const params: AesGcmParams = { name: 'AES-GCM', iv: iv as BufferSource };
  if (aad !== undefined) params.additionalData = utf8Encode(aad) as BufferSource;
  const ct = new Uint8Array(await subtle().encrypt(params, key, plaintext as BufferSource));
  zeroize(plaintext);
  return { v: CIPHER_VERSION, iv: toBase64(iv), ct: toBase64(ct) };
}

export async function decryptJson<T>(key: CryptoKey, payload: EncPayload, aad?: string): Promise<T> {
  if (!payload || typeof payload.iv !== 'string' || typeof payload.ct !== 'string') {
    throw new DecryptionError('Payload criptografado malformado.');
  }
  let plaintext: Uint8Array;
  try {
    const params: AesGcmParams = { name: 'AES-GCM', iv: fromBase64(payload.iv) as BufferSource };
    if (aad !== undefined) params.additionalData = utf8Encode(aad) as BufferSource;
    plaintext = new Uint8Array(await subtle().decrypt(params, key, fromBase64(payload.ct) as BufferSource));
  } catch {
    throw new DecryptionError();
  }
  try {
    return JSON.parse(utf8Decode(plaintext)) as T;
  } finally {
    zeroize(plaintext);
  }
}
