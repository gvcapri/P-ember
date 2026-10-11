/**
 * KDF — derivação de chave a partir da senha mestra.
 *
 * Padrão: Argon2id (hash-wasm, implementação WASM consolidada).
 * Fallback documentado: PBKDF2-SHA-256 via Web Crypto com 600.000 iterações
 * (parâmetro recomendado OWASP) para plataformas sem WebAssembly.
 */
import { argon2id } from 'hash-wasm';

import { fromBase64, toBase64, zeroize } from './encoding';

export type KdfAlgorithm = 'argon2id' | 'pbkdf2-sha256';

export interface KdfParams {
  algorithm: KdfAlgorithm;
  /** base64 */
  salt: string;
  hashLength: number;
  /** Argon2id: custo de tempo (iterações). */
  iterations?: number;
  /** Argon2id: memória em KiB. */
  memorySize?: number;
  /** Argon2id: paralelismo. */
  parallelism?: number;
  /** PBKDF2: número de iterações. */
  pbkdf2Iterations?: number;
}

export const ARGON2_DEFAULTS = {
  iterations: 3,
  memorySize: 64 * 1024, // 64 MiB
  parallelism: 4,
  hashLength: 32,
} as const;

export const PBKDF2_DEFAULTS = {
  pbkdf2Iterations: 600_000,
  hashLength: 32,
} as const;

export function defaultKdfParams(algorithm: KdfAlgorithm = 'argon2id'): KdfParams {
  if (algorithm === 'argon2id') {
    return { algorithm, salt: '', ...ARGON2_DEFAULTS };
  }
  return { algorithm, salt: '', ...PBKDF2_DEFAULTS };
}

export function generateSalt(bytes = 16): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(bytes)));
}

/**
 * Deriva uma chave AES-GCM de 256 bits a partir da senha.
 * A senha e o material derivado são zerados quando possível.
 */
export async function deriveAesKey(masterPassword: string, params: KdfParams): Promise<CryptoKey> {
  const raw = await deriveRawKey(masterPassword, params);
  const key = await crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
  zeroize(raw);
  return key;
}

export async function deriveRawKey(masterPassword: string, params: KdfParams): Promise<Uint8Array> {
  const salt = fromBase64(params.salt);
  if (salt.length < 8) throw new Error('Salt inválido: muito curto.');

  if (params.algorithm === 'argon2id') {
    const hashHex = await argon2id({
      password: masterPassword,
      salt,
      parallelism: params.parallelism ?? ARGON2_DEFAULTS.parallelism,
      iterations: params.iterations ?? ARGON2_DEFAULTS.iterations,
      memorySize: params.memorySize ?? ARGON2_DEFAULTS.memorySize,
      hashLength: params.hashLength ?? ARGON2_DEFAULTS.hashLength,
      outputType: 'hex',
    });
    return hexToBytes(hashHex);
  }

  if (params.algorithm === 'pbkdf2-sha256') {
    const iterations = params.pbkdf2Iterations ?? PBKDF2_DEFAULTS.pbkdf2Iterations;
    const bits = (params.hashLength ?? PBKDF2_DEFAULTS.hashLength) * 8;
    const baseKey = await crypto.subtle.importKey('raw', utf8(masterPassword) as BufferSource, 'PBKDF2', false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
      baseKey,
      bits,
    );
    return new Uint8Array(derived);
  }

  throw new Error(`Algoritmo de KDF desconhecido: ${String(params)}`);
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
