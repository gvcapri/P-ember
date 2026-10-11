import { describe, expect, it } from 'vitest';

import {
  AMBIGUOUS_CHARS,
  CHARSETS,
  DEFAULT_OPTIONS,
  MIN_LENGTH,
  MAX_LENGTH,
  activeCharsets,
  clampLength,
  estimateEntropyBits,
  generatePassphrase,
  generatePassword,
  randomInt,
  type GeneratorOptions,
} from './generator';
import { WORDLIST } from './wordlist';

const opts = (over: Partial<GeneratorOptions> = {}): GeneratorOptions => ({ ...DEFAULT_OPTIONS, ...over });

describe('generatePassword', () => {
  it('respeita o comprimento configurado', () => {
    for (const length of [8, 12, 20, 64, 128]) {
      expect(generatePassword(opts({ length }))).toHaveLength(length);
    }
  });

  it('limita o comprimento ao intervalo 8..128', () => {
    expect(clampLength(3)).toBe(MIN_LENGTH);
    expect(clampLength(999)).toBe(MAX_LENGTH);
    expect(generatePassword(opts({ length: 5 }))).toHaveLength(MIN_LENGTH);
  });

  it('inclui pelo menos um caractere de cada conjunto habilitado', () => {
    const pw = generatePassword(opts({ length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true }));
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).toMatch(/[a-z]/);
    expect(pw).toMatch(/[0-9]/);
    expect(pw).toMatch(/[^a-zA-Z0-9]/);
  });

  it('não inclui conjuntos desabilitados', () => {
    const pw = generatePassword(opts({ length: 30, uppercase: false, numbers: false, symbols: false }));
    expect(pw).toMatch(/^[a-z]+$/);
  });

  it('exclui caracteres ambíguos quando solicitado', () => {
    for (let i = 0; i < 30; i++) {
      const pw = generatePassword(opts({ length: 64, excludeAmbiguous: true }));
      for (const ch of pw) expect(AMBIGUOUS_CHARS).not.toContain(ch);
    }
  });

  it('cada conjunto habilitado tem representação mesmo com ambíguos excluídos', () => {
    const options = opts({ length: 24, excludeAmbiguous: true, uppercase: true, numbers: true, symbols: false });
    const pw = generatePassword(options);
    expect(pw).toMatch(/[A-Z]/);
    expect(pw).toMatch(/[a-z]/);
    expect(pw).toMatch(/[0-9]/);
    expect(activeCharsets(options)).toHaveLength(3);
  });

  it('rejeita nenhum conjunto de caracteres', () => {
    expect(() => generatePassword(opts({ uppercase: false, lowercase: false, numbers: false, symbols: false }))).toThrow();
  });

  it('gera resultados variados (CSPRNG)', () => {
    const set = new Set(Array.from({ length: 50 }, () => generatePassword(opts({ length: 16 }))));
    expect(set.size).toBeGreaterThan(45);
  });

  it('randomInt é uniforme dentro do limite e nunca retorna valor fora do intervalo', () => {
    const counts = new Map<number, number>();
    for (let i = 0; i < 3000; i++) {
      const v = randomInt(6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const c of counts.values()) expect(c).toBeGreaterThan(300);
  });
});

describe('generatePassphrase', () => {
  it('gera a quantidade de palavras configurada', () => {
    const words = generatePassphrase(opts({ mode: 'passphrase', wordCount: 5 })).split('-');
    expect(words).toHaveLength(5);
    for (const w of words) expect(WORDLIST).toContain(w);
  });

  it('respeita o separador e limita 3..10 palavras', () => {
    expect(generatePassphrase(opts({ mode: 'passphrase', wordCount: 4, separator: ' ' })).split(' ')).toHaveLength(4);
    expect(generatePassphrase(opts({ mode: 'passphrase', wordCount: 2 })).split('-')).toHaveLength(3);
    expect(generatePassphrase(opts({ mode: 'passphrase', wordCount: 99 })).split('-')).toHaveLength(10);
  });
});

describe('estimateEntropyBits', () => {
  it('cresce com comprimento e diversidade', () => {
    const short = estimateEntropyBits('abc123');
    const long = estimateEntropyBits('abcDEF123!@#xyz');
    expect(long).toBeGreaterThan(short);
    expect(estimateEntropyBits('')).toBe(0);
  });
});

describe('CHARSETS', () => {
  it('não contém caracteres ambíguos duplicados', () => {
    for (const set of Object.values(CHARSETS)) {
      expect(new Set([...set]).size).toBe(set.length);
    }
  });
});
