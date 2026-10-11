import { beforeEach, describe, expect, it } from 'vitest';

import { MemoryStore } from '../storage/db';
import type { CredentialInput } from '../types';
import { VaultAuthError, VaultLockedError, VaultService } from './vaultService';

const MASTER = 'senha-mestra-forte-2024';

const input = (over: Partial<CredentialInput> = {}): CredentialInput => ({
  service: over.service ?? 'GitHub',
  username: over.username ?? 'dev@mail.com',
  password: over.password ?? 'Sup3r$enha#Segura99',
  url: over.url ?? 'https://github.com',
  category: over.category ?? 'trabalho',
  notes: over.notes ?? '',
  favorite: over.favorite ?? false,
});

const setup = async () => {
  const store = new MemoryStore();
  const vault = new VaultService(store);
  await vault.createVault(MASTER);
  return { store, vault };
};

describe('VaultService', () => {
  let store: MemoryStore;
  let vault: VaultService;

  beforeEach(async () => {
    ({ store, vault } = await setup());
  });

  it('cria o cofre já desbloqueado', () => {
    expect(vault.isUnlocked).toBe(true);
    expect(vault.list()).toEqual([]);
  });

  it('não permite criar dois cofres', async () => {
    await expect(vault.createVault(MASTER)).rejects.toThrow(/já existe/i);
  });

  it('persiste nada em texto puro no banco', async () => {
    const secret = 'MinhaSenhaUltraSecreta#123';
    const secretUser = 'usuario-secreto@mail.com';
    await vault.add(input({ password: secret, username: secretUser, service: 'BancoDoBrasil' }));
    const raw = store.dumpRaw();
    expect(raw).not.toContain(secret);
    expect(raw).not.toContain(secretUser);
    expect(raw).not.toContain('BancoDoBrasil');
    expect(raw).not.toContain(MASTER);
  });

  it('bloqueia e desbloqueia mantendo dados', async () => {
    const added = await vault.add(input());
    vault.lock();
    expect(vault.isUnlocked).toBe(false);
    expect(() => vault.list()).toThrow(VaultLockedError);

    await vault.unlock(MASTER);
    expect(vault.isUnlocked).toBe(true);
    const found = vault.list().find((c) => c.id === added.id);
    expect(found?.service).toBe('GitHub');
    expect(found?.password).toBe('Sup3r$enha#Segura99');
  });

  it('rejeita senha mestra errada com VaultAuthError', async () => {
    vault.lock();
    await expect(vault.unlock('senha-absolutamente-errada')).rejects.toBeInstanceOf(VaultAuthError);
    expect(vault.isUnlocked).toBe(false);
  });

  it('verifyMasterPassword confirma sem desbloquear estado', async () => {
    vault.lock();
    expect(await vault.verifyMasterPassword(MASTER)).toBe(true);
    expect(await vault.verifyMasterPassword('errada-errada-errada')).toBe(false);
  });

  it('CRUD completo: add, get via list, update, remove', async () => {
    const a = await vault.add(input({ service: 'Google' }));
    const b = await vault.add(input({ service: 'AWS', favorite: true }));
    expect(vault.list()).toHaveLength(2);

    await vault.update(a.id, { service: 'Google Workspace', notes: 'mfa ativo' });
    const updated = vault.list().find((c) => c.id === a.id)!;
    expect(updated.service).toBe('Google Workspace');
    expect(updated.notes).toBe('mfa ativo');
    expect(updated.createdAt).toBe(a.createdAt);
    expect(updated.updatedAt >= a.updatedAt).toBe(true);

    await vault.remove(b.id);
    expect(vault.list().map((c) => c.id)).toEqual([a.id]);

    await expect(vault.update('inexistente', { notes: 'x' })).rejects.toThrow(/não encontrada/i);
  });

  it('operações exigem cofre desbloqueado', async () => {
    vault.lock();
    await expect(vault.add(input())).rejects.toBeInstanceOf(VaultLockedError);
    await expect(vault.remove('x')).rejects.toBeInstanceOf(VaultLockedError);
    await expect(vault.getGeneratorHistory()).rejects.toBeInstanceOf(VaultLockedError);
  });

  it('cada credencial usa IV distinto no banco', async () => {
    for (let i = 0; i < 8; i++) await vault.add(input({ service: `svc-${i}` }));
    const dump = JSON.parse(store.dumpRaw()) as { entries: Record<string, { iv: string }> };
    const ivList = Object.values(dump.entries).map((p) => p.iv);
    expect(ivList).toHaveLength(8);
    expect(new Set(ivList).size).toBe(8);
  });

  it('histórico do gerador é criptografado', async () => {
    const passwords = ['Gerada#Senha1234!', 'outra!Senha5678@'];
    await vault.saveGeneratorHistory(passwords);
    expect(store.dumpRaw()).not.toContain('Gerada#Senha1234!');
    expect(await vault.getGeneratorHistory()).toEqual(passwords);
    await vault.clearGeneratorHistory();
    expect(await vault.getGeneratorHistory()).toEqual([]);
  });

  it('destroy remove todos os dados locais', async () => {
    await vault.add(input());
    await vault.destroy();
    expect(vault.isUnlocked).toBe(false);
    expect(await vault.isInitialized()).toBe(false);
    expect(store.dumpRaw()).toBe('{}');
  });

  it('não vaza a senha mestra em mensagens de erro', async () => {
    vault.lock();
    try {
      await vault.unlock('senha-mestra errada #$$%%');
      throw new Error('não deveria ter desbloqueado');
    } catch (e) {
      expect(String(e)).not.toContain('senha-mestra errada');
    }
  });
});
