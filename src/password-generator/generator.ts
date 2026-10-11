/**
 * password-generator — geração de senhas e frases-senha.
 *
 * Fonte de aleatoriedade: crypto.getRandomValues() (Web Crypto API).
 * Math.random() NUNCA é utilizado. Amostragem por rejeição, sem viés de módulo.
 */

import { WORDLIST } from './wordlist';

export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  mode: 'random' | 'passphrase';
  /** número de palavras no modo frase-senha (3..10) */
  wordCount: number;
  /** separador entre palavras */
  separator: string;
}

export const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/|~`',
} as const;

/** Caracteres ambíguos removidos quando a opção está ativa. */
export const AMBIGUOUS_CHARS = '0OoIl1|`\'"{}[]();:,.';

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;

export const DEFAULT_OPTIONS: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
  mode: 'random',
  wordCount: 4,
  separator: '-',
};

function stripAmbiguous(set: string): string {
  return [...set].filter((c) => !AMBIGUOUS_CHARS.includes(c)).join('');
}

/** Conjuntos de caracteres efetivamente usados, respeitando as opções. */
export function activeCharsets(options: GeneratorOptions): string[] {
  const sets: string[] = [];
  const maybe = (enabled: boolean, set: string) => {
    if (!enabled) return;
    const effective = options.excludeAmbiguous ? stripAmbiguous(set) : set;
    if (effective.length > 0) sets.push(effective);
  };
  maybe(options.uppercase, CHARSETS.uppercase);
  maybe(options.lowercase, CHARSETS.lowercase);
  maybe(options.numbers, CHARSETS.numbers);
  maybe(options.symbols, CHARSETS.symbols);
  return sets;
}

function getSecureRandom(): Crypto {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Gerador criptograficamente seguro indisponível neste ambiente.');
  }
  return globalThis.crypto;
}

/** Inteiro uniforme em [0, maxExclusive) via amostragem por rejeição (sem viés). */
export function randomInt(maxExclusive: number, rng: Crypto = getSecureRandom()): number {
  if (maxExclusive <= 0 || !Number.isInteger(maxExclusive)) {
    throw new RangeError('maxExclusive deve ser um inteiro positivo.');
  }
  const limit = Math.floor(0x1_0000_0000 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    rng.getRandomValues(buf);
    value = buf[0]!;
  } while (value >= limit);
  return value % maxExclusive;
}

export function pick<T>(items: readonly T[], rng: Crypto = getSecureRandom()): T {
  return items[randomInt(items.length, rng)]!;
}

export function shuffle<T>(items: T[], rng: Crypto = getSecureRandom()): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, rng);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function clampLength(length: number): number {
  if (!Number.isFinite(length)) return DEFAULT_OPTIONS.length;
  return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.floor(length)));
}

/**
 * Gera uma senha aleatória garantindo:
 *  - comprimento exatamente `options.length` (random mode);
 *  - pelo menos um caractere de cada conjunto habilitado;
 *  - respeito a exclusão de ambíguos.
 */
export function generatePassword(options: GeneratorOptions, rng: Crypto = getSecureRandom()): string {
  if (options.mode === 'passphrase') return generatePassphrase(options, rng);

  const sets = activeCharsets(options);
  if (sets.length === 0) {
    throw new Error('Selecione pelo menos um tipo de caractere.');
  }
  const length = clampLength(options.length);
  if (length < sets.length) {
    throw new Error(`Comprimento mínimo para os conjuntos selecionados: ${sets.length}.`);
  }

  const all = sets.join('');
  const chars: string[] = [];
  // garante representação de cada conjunto habilitado
  for (const set of sets) chars.push(pick([...set], rng));
  while (chars.length < length) chars.push(pick([...all], rng));
  return shuffle(chars, rng).join('');
}

export function generatePassphrase(options: GeneratorOptions, rng: Crypto = getSecureRandom()): string {
  const count = Math.min(10, Math.max(3, Math.floor(options.wordCount || 4)));
  const words = Array.from({ length: count }, () => pick(WORDLIST, rng));
  const sep = options.separator === '' ? '-' : options.separator;
  return words.join(sep);
}

/** Estimativa de entropia em bits (heurística local, para exibição). */
export function estimateEntropyBits(password: string): number {
  if (!password) return 0;
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 32;
  return Math.round(password.length * Math.log2(Math.max(pool, 2)));
}
