import { describe, expect, it } from 'vitest';

import {
  DecryptionError,
  decryptJson,
  encryptJson,
  exportAesKeyRaw,
  generateAesKey,
  importAesKey,
  randomBytes,
} from './cipher';
import { toBase64 } from './encoding';
import { deriveAesKey, deriveRawKey, defaultKdfParams, generateSalt, type KdfParams } from './kdf';

const fastKdf = (): KdfParams => ({
  ...defaultKdfParams('argon2id'),
  salt: generateSalt(),
  iterations: 1,
  memorySize: 8 * 1024,
  parallelism: 1,
});

describe('cipher (AES-256-GCM)', () => {
  it('faz roundtrip de dados', async () => {
    const key = await generateAesKey();
    const data = { service: 'github', password: 's3nh4-forte!', nested: { list: [1, 2, 3] } };
    const payload = await encryptJson(key, data);
    const out = await decryptJson<typeof data>(key, payload);
    expect(out).toEqual(data);
  });

  it('gera IV único para cada operação com a mesma chave', async () => {
    const key = await generateAesKey();
    const ivs = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const p = await encryptJson(key, { i });
      ivs.add(p.iv);
    }
    expect(ivs.size).toBe(50);
  });

  it('falha ao descriptografar com chave errada', async () => {
    const keyA = await generateAesKey();
    const keyB = await generateAesKey();
    const payload = await encryptJson(keyA, { segredo: 'x' });
    await expect(decryptJson(keyB, payload)).rejects.toBeInstanceOf(DecryptionError);
  });

  it('falha com dados adulterados', async () => {
    const key = await generateAesKey();
    const payload = await encryptJson(key, { segredo: 'x' });
    const ct = Uint8Array.from(atob(payload.ct), (c) => c.charCodeAt(0));
    ct[0] = ct[0]! ^ 0xff;
    payload.ct = toBase64(ct);
    await expect(decryptJson(key, payload)).rejects.toBeInstanceOf(DecryptionError);
  });

  it('vincula ciphertext ao contexto (AAD)', async () => {
    const key = await generateAesKey();
    const payload = await encryptJson(key, { segredo: 'x' }, 'ctx-a');
    await expect(decryptJson(key, payload, 'ctx-b')).rejects.toBeInstanceOf(DecryptionError);
    await expect(decryptJson(key, payload, 'ctx-a')).resolves.toEqual({ segredo: 'x' });
  });

  it('falha com payload malformado', async () => {
    const key = await generateAesKey();
    await expect(decryptJson(key, {} as never)).rejects.toBeInstanceOf(DecryptionError);
  });

  it('export/import de chave preserva material', async () => {
    const key = await generateAesKey(true);
    const raw = await exportAesKeyRaw(key);
    expect(raw.length).toBe(32);
    const clone = await importAesKey(raw);
    const payload = await encryptJson(key, { a: 1 });
    await expect(decryptJson(clone, payload)).resolves.toEqual({ a: 1 });
  });
});

describe('kdf', () => {
  it('é determinístico para mesma senha e salt', async () => {
    const params = fastKdf();
    const a = await deriveRawKey('minha-senha-mestra', params);
    const b = await deriveRawKey('minha-senha-mestra', params);
    expect(toBase64(a)).toBe(toBase64(b));
    expect(a.length).toBe(32);
  });

  it('gera chaves diferentes para salt diferente', async () => {
    const p1 = fastKdf();
    const p2 = { ...p1, salt: generateSalt() };
    const a = await deriveRawKey('minha-senha-mestra', p1);
    const b = await deriveRawKey('minha-senha-mestra', p2);
    expect(toBase64(a)).not.toBe(toBase64(b));
  });

  it('gera chaves diferentes para senhas diferentes', async () => {
    const params = fastKdf();
    const a = await deriveRawKey('senha-um', params);
    const b = await deriveRawKey('senha-dois', params);
    expect(toBase64(a)).not.toBe(toBase64(b));
  });

  it('fallback PBKDF2-SHA256 deriva chave AES utilizável', async () => {
    const params: KdfParams = { ...defaultKdfParams('pbkdf2-sha256'), salt: generateSalt(), pbkdf2Iterations: 1000 };
    const key = await deriveAesKey('senha-mestra', params);
    const payload = await encryptJson(key, { ok: true });
    await expect(decryptJson(key, payload)).resolves.toEqual({ ok: true });
  });

  it('rejeita salt curto', async () => {
    const params: KdfParams = { ...defaultKdfParams('argon2id'), salt: toBase64(randomBytes(4)) };
    await expect(deriveRawKey('x', params)).rejects.toThrow(/salt/i);
  });
});
