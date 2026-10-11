import { describe, expect, it } from 'vitest';

import {
  BackupError,
  backupFilename,
  combineCredentials,
  exportBackup,
  importBackup,
  MIN_BACKUP_PASSPHRASE_LENGTH,
  parseEnvelope,
} from './backup';
import type { Credential } from '../types';

const cred = (over: Partial<Credential> & { id: string; service: string }): Credential => ({
  username: over.username ?? 'user@mail.com',
  password: over.password ?? 'Sup3r$enha#123',
  url: over.url ?? '',
  category: over.category ?? 'pessoal',
  notes: over.notes ?? '',
  favorite: over.favorite ?? false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  id: over.id,
  service: over.service,
});

const PASS = 'frase-de-backup-forte';

describe('backup', () => {
  it('exporta e importa preservando credenciais', async () => {
    const data = [cred({ id: '1', service: 'GitHub' }), cred({ id: '2', service: 'AWS', favorite: true })];
    const file = await exportBackup(data, PASS);
    const restored = await importBackup(file, PASS);
    expect(restored).toEqual(data);
  });

  it('arquivo exportado não contém credenciais em texto puro', async () => {
    const secret = 'MinhaSenhaDoBanco#999';
    const file = await exportBackup([cred({ id: '1', service: 'Banco', password: secret })], PASS);
    expect(file).not.toContain(secret);
    expect(file).not.toContain('Banco');
  });

  it('exige senha de backup forte', async () => {
    await expect(exportBackup([], 'curta')).rejects.toBeInstanceOf(BackupError);
    expect(MIN_BACKUP_PASSPHRASE_LENGTH).toBeGreaterThanOrEqual(8);
  });

  it('rejeita senha de backup errada', async () => {
    const file = await exportBackup([cred({ id: '1', service: 'X' })], PASS);
    await expect(importBackup(file, 'senha-errada-123')).rejects.toBeInstanceOf(BackupError);
  });

  it('rejeita arquivo inválido ou não-pember', async () => {
    await expect(importBackup('não é json', PASS)).rejects.toBeInstanceOf(BackupError);
    await expect(importBackup('{"format":"outro"}', PASS)).rejects.toBeInstanceOf(BackupError);
  });

  it('rejeita backup corrompido (GCM autentica integridade)', async () => {
    const file = await exportBackup([cred({ id: '1', service: 'X' })], PASS);
    const envelope = JSON.parse(file);
    const ct = Uint8Array.from(atob(envelope.payload.ct), (c) => c.charCodeAt(0));
    ct[ct.length - 1] = ct[ct.length - 1]! ^ 0x01;
    envelope.payload.ct = btoa(String.fromCharCode(...ct));
    await expect(importBackup(JSON.stringify(envelope), PASS)).rejects.toBeInstanceOf(BackupError);
  });

  it('rejeita envelope com campos criptográficos ausentes', () => {
    expect(() => parseEnvelope(JSON.stringify({ format: 'pember-backup', version: 1, payload: {} }))).toThrow(
      BackupError,
    );
  });

  it('rejeita backup de versão futura', () => {
    const envelope = { format: 'pember-backup', version: 999, kdf: { salt: 'x' }, payload: { iv: 'y', ct: 'z' } };
    expect(() => parseEnvelope(JSON.stringify(envelope))).toThrow(/versão mais nova/);
  });

  it('rejeita registros inválidos dentro do backup', async () => {
    const file = await exportBackup([cred({ id: '1', service: 'Ok' })], PASS);
    const envelope = JSON.parse(file);
    // Adiciona registro inválido diretamente no payload re-criptografado
    const { deriveAesKey } = await import('../crypto/kdf');
    const { encryptJson } = await import('../crypto/cipher');
    const key = await deriveAesKey(PASS, envelope.kdf);
    envelope.payload = await encryptJson(
      key,
      { credentials: [{ id: 'x', service: '??', password: 123 }] },
      'pember:backup:v1',
    );
    await expect(importBackup(JSON.stringify(envelope), PASS)).rejects.toBeInstanceOf(BackupError);
  });

  it('merge mantém existentes e pula duplicatas', () => {
    const existing = [cred({ id: '1', service: 'GitHub', username: 'a@mail.com' })];
    const imported = [
      cred({ id: '1', service: 'GitHub', username: 'a@mail.com' }),
      cred({ id: '2', service: 'Novo', username: 'b@mail.com' }),
    ];
    const { result, skipped } = combineCredentials(existing, imported, 'merge');
    expect(result).toHaveLength(2);
    expect(skipped).toBe(1);
    expect(result.find((c) => c.id === '2')?.service).toBe('Novo');
  });

  it('merge pula duplicata lógica com id diferente', () => {
    const existing = [cred({ id: '1', service: 'GitHub', username: 'a@mail.com' })];
    const imported = [cred({ id: '999', service: 'github', username: 'A@Mail.com' })];
    const { result, skipped } = combineCredentials(existing, imported, 'merge');
    expect(result).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it('replace substitui tudo', () => {
    const existing = [cred({ id: '1', service: 'Antigo' })];
    const imported = [cred({ id: '2', service: 'Novo' })];
    const { result, skipped } = combineCredentials(existing, imported, 'replace');
    expect(result).toEqual(imported);
    expect(skipped).toBe(0);
  });

  it('gera nome de arquivo datado', () => {
    expect(backupFilename(new Date('2026-10-11T12:00:00Z'))).toMatch(/^pember-backup-.*\.pemberbak$/);
  });
});
