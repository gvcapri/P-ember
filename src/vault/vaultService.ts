/**
 * vault — operações com o cofre.
 *
 * Camada orquestradora: deriva a chave a partir da senha mestra, embrulha/desembrulha
 * a chave de dados (DEK) e persiste cada credencial criptografada individualmente
 * com AES-256-GCM (IV único por registro, AAD vinculado ao id).
 *
 * O texto puro das credenciais só existe em memória enquanto o cofre está desbloqueado.
 */
import { decryptJson, encryptJson, importAesKey, randomBytes, type EncPayload } from '../crypto/cipher';
import { fromBase64, toBase64, zeroize } from '../crypto/encoding';
import { defaultKdfParams, deriveAesKey, generateSalt, type KdfAlgorithm, type KdfParams } from '../crypto/kdf';
import type { KeyValueStore } from '../storage/db';
import { VAULT_FORMAT_VERSION, type Credential, type CredentialInput, type VaultMeta } from '../types';

const META_KEY = 'vault';
const HISTORY_KEY = 'generator-history';

const VERIFIER_PLAINTEXT = 'pember-verifier-v1';
const AAD_DEK = 'pember:v1:dek';
const AAD_VERIFIER = 'pember:v1:verifier';
const aadEntry = (id: string) => `pember:v1:entry:${id}`;

export class VaultLockedError extends Error {
  constructor(message = 'Cofre bloqueado.') {
    super(message);
    this.name = 'VaultLockedError';
  }
}
export class VaultAuthError extends Error {
  constructor(message = 'Senha mestra incorreta.') {
    super(message);
    this.name = 'VaultAuthError';
  }
}
export class VaultCorruptedError extends Error {
  constructor(message = 'Dados do cofre corrompidos ou incompatíveis.') {
    super(message);
    this.name = 'VaultCorruptedError';
  }
}

const idGen = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : toBase64(randomBytes(16)).replace(/[+/=]/g, '').slice(0, 22);

export class VaultService {
  private dek: CryptoKey | null = null;
  private cache: Credential[] | null = null;

  constructor(private readonly store: KeyValueStore) {}

  get isUnlocked(): boolean {
    return this.dek !== null;
  }

  async isInitialized(): Promise<boolean> {
    return (await this.store.get<VaultMeta>('meta', META_KEY)) !== undefined;
  }

  async getMeta(): Promise<VaultMeta | undefined> {
    return this.store.get<VaultMeta>('meta', META_KEY);
  }

  /** Cria um novo cofre. Lança se já existir um. */
  async createVault(masterPassword: string, algorithm: KdfAlgorithm = 'argon2id'): Promise<void> {
    if (await this.isInitialized()) throw new Error('Já existe um cofre neste dispositivo.');
    const kdf: KdfParams = { ...defaultKdfParams(algorithm), salt: generateSalt() };
    const kek = await deriveAesKey(masterPassword, kdf);

    const verifier = await encryptJson(kek, VERIFIER_PLAINTEXT, AAD_VERIFIER);

    const rawDek = randomBytes(32);
    const wrappedDek = await encryptJson(kek, toBase64(rawDek), AAD_DEK);
    const dek = await importAesKey(rawDek);
    zeroize(rawDek);

    const meta: VaultMeta = {
      version: VAULT_FORMAT_VERSION,
      kdf,
      verifier,
      wrappedDek,
      createdAt: new Date().toISOString(),
    };
    await this.store.set('meta', META_KEY, meta);
    this.dek = dek;
    this.cache = [];
  }

  /** Desbloqueia o cofre e carrega as credenciais para a memória. */
  async unlock(masterPassword: string): Promise<void> {
    const meta = await this.getMeta();
    if (!meta) throw new VaultCorruptedError('Nenhum cofre encontrado.');
    const kek = await deriveAesKey(masterPassword, meta.kdf);

    try {
      await decryptJson<string>(kek, meta.verifier, AAD_VERIFIER);
    } catch {
      throw new VaultAuthError();
    }

    let rawDek: Uint8Array;
    try {
      const b64 = await decryptJson<string>(kek, meta.wrappedDek, AAD_DEK);
      rawDek = fromBase64(b64);
    } catch {
      throw new VaultCorruptedError('A chave de dados do cofre não pôde ser desembrulhada.');
    }
    if (rawDek.length !== 32) throw new VaultCorruptedError('Tamanho de chave inválido.');

    this.dek = await importAesKey(rawDek);
    zeroize(rawDek);
    this.cache = await this.loadAll();
  }

  /** Verifica a senha mestra sem alterar o estado (reautenticação). */
  async verifyMasterPassword(password: string): Promise<boolean> {
    const meta = await this.getMeta();
    if (!meta) return false;
    try {
      const kek = await deriveAesKey(password, meta.kdf);
      await decryptJson<string>(kek, meta.verifier, AAD_VERIFIER);
      return true;
    } catch {
      return false;
    }
  }

  /** Bloqueio manual: descarta chaves e cache em memória. */
  lock(): void {
    this.dek = null;
    this.cache = null;
  }

  /** Exclusão segura de todos os dados locais (limitação: cópias no storage do navegador). */
  async destroy(): Promise<void> {
    this.lock();
    await this.store.clearAll();
  }

  private requireKey(): CryptoKey {
    if (!this.dek) throw new VaultLockedError();
    return this.dek;
  }

  private async loadAll(): Promise<Credential[]> {
    const key = this.requireKey();
    const ids = await this.store.keys('entries');
    const list: Credential[] = [];
    for (const id of ids) {
      const payload = await this.store.get<EncPayload>('entries', id);
      if (!payload) continue;
      list.push(await decryptJson<Credential>(key, payload, aadEntry(id)));
    }
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }

  list(): Credential[] {
    if (!this.cache) throw new VaultLockedError();
    return [...this.cache];
  }

  async add(input: CredentialInput): Promise<Credential> {
    const key = this.requireKey();
    if (!this.cache) throw new VaultLockedError();
    const now = new Date().toISOString();
    const credential: Credential = {
      ...input,
      id: idGen(),
      favorite: input.favorite ?? false,
      createdAt: now,
      updatedAt: now,
    };
    await this.store.set('entries', credential.id, await encryptJson(key, credential, aadEntry(credential.id)));
    this.cache = [credential, ...this.cache];
    return credential;
  }

  async update(id: string, patch: Partial<CredentialInput>): Promise<Credential> {
    const key = this.requireKey();
    if (!this.cache) throw new VaultLockedError();
    const current = this.cache.find((c) => c.id === id);
    if (!current) throw new Error('Credencial não encontrada.');
    const updated: Credential = {
      ...current,
      ...patch,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await this.store.set('entries', id, await encryptJson(key, updated, aadEntry(id)));
    this.cache = this.cache.map((c) => (c.id === id ? updated : c));
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.requireKey();
    if (!this.cache) throw new VaultLockedError();
    await this.store.delete('entries', id);
    this.cache = this.cache.filter((c) => c.id !== id);
  }

  /** Substitui todas as credenciais pelas fornecidas (usado na restauração de backup). */
  async replaceAll(inputs: CredentialInput[]): Promise<Credential[]> {
    const key = this.requireKey();
    if (!this.cache) throw new VaultLockedError();
    for (const c of this.cache) await this.store.delete('entries', c.id);
    const now = new Date().toISOString();
    const created: Credential[] = [];
    for (const input of inputs) {
      const credential: Credential = {
        ...input,
        id: idGen(),
        favorite: input.favorite ?? false,
        createdAt: now,
        updatedAt: now,
      };
      await this.store.set('entries', credential.id, await encryptJson(key, credential, aadEntry(credential.id)));
      created.push(credential);
    }
    this.cache = created;
    return created;
  }

  /** Histórico de senhas geradas — criptografado, opcional. */
  async saveGeneratorHistory(passwords: string[]): Promise<void> {
    const key = this.requireKey();
    await this.store.set('meta', HISTORY_KEY, await encryptJson(key, { passwords }, 'pember:v1:history'));
  }

  async getGeneratorHistory(): Promise<string[]> {
    const key = this.requireKey();
    const payload = await this.store.get<EncPayload>('meta', HISTORY_KEY);
    if (!payload) return [];
    const { passwords } = await decryptJson<{ passwords: string[] }>(key, payload, 'pember:v1:history');
    return passwords;
  }

  async clearGeneratorHistory(): Promise<void> {
    this.requireKey();
    await this.store.delete('meta', HISTORY_KEY);
  }
}
