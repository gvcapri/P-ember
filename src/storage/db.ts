/**
 * storage — persistência local.
 *
 * Apenas blobs criptografados (EncPayload) e preferências não sensíveis
 * são persistidos. Nenhuma credencial em texto puro chega ao disco.
 */

import type { EncPayload } from '../crypto/cipher';

export const STORE_NAMES = ['meta', 'entries', 'settings'] as const;
export type StoreName = (typeof STORE_NAMES)[number];

export interface KeyValueStore {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  set<T>(store: StoreName, key: string, value: T): Promise<void>;
  delete(store: StoreName, key: string): Promise<void>;
  keys(store: StoreName): Promise<string[]>;
  clear(store: StoreName): Promise<void>;
  clearAll(): Promise<void>;
}

const DB_NAME = 'pember';
const DB_VERSION = 1;

export class IndexedDbStore implements KeyValueStore {
  private constructor(private readonly db: IDBDatabase) {}

  static async open(name = DB_NAME): Promise<IndexedDbStore> {
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeName of STORE_NAMES) {
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
      }
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Falha ao abrir IndexedDB.'));
    });
    return new IndexedDbStore(db);
  }

  private tx(store: StoreName, mode: IDBTransactionMode): IDBObjectStore {
    return this.db.transaction(store, mode).objectStore(store);
  }

  private wrap<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Falha de persistência.'));
    });
  }

  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    return this.wrap<T | undefined>(this.tx(store, 'readonly').get(key) as IDBRequest<T | undefined>);
  }

  async set<T>(store: StoreName, key: string, value: T): Promise<void> {
    await this.wrap(this.tx(store, 'readwrite').put(value, key));
  }

  async delete(store: StoreName, key: string): Promise<void> {
    await this.wrap(this.tx(store, 'readwrite').delete(key));
  }

  async keys(store: StoreName): Promise<string[]> {
    const ks = await this.wrap<IDBValidKey[]>(this.tx(store, 'readonly').getAllKeys());
    return ks.map(String);
  }

  async clear(store: StoreName): Promise<void> {
    await this.wrap(this.tx(store, 'readwrite').clear());
  }

  async clearAll(): Promise<void> {
    for (const store of STORE_NAMES) await this.clear(store);
    this.db.close();
  }
}

/** Store em memória — usado em testes e como fallback de sessão. */
export class MemoryStore implements KeyValueStore {
  private data = new Map<StoreName, Map<string, unknown>>();

  private bucket(store: StoreName): Map<string, unknown> {
    let b = this.data.get(store);
    if (!b) {
      b = new Map();
      this.data.set(store, b);
    }
    return b;
  }

  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    return this.bucket(store).get(key) as T | undefined;
  }

  async set<T>(store: StoreName, key: string, value: T): Promise<void> {
    this.bucket(store).set(key, value);
  }

  async delete(store: StoreName, key: string): Promise<void> {
    this.bucket(store).delete(key);
  }

  async keys(store: StoreName): Promise<string[]> {
    return [...this.bucket(store).keys()];
  }

  async clear(store: StoreName): Promise<void> {
    this.bucket(store).clear();
  }

  async clearAll(): Promise<void> {
    this.data.clear();
  }

  /** Utilitário de teste: serializa tudo (ignora buckets vazios), permitindo verificar ausência de texto puro. */
  dumpRaw(): string {
    const out: Record<string, Record<string, unknown>> = {};
    for (const [store, bucket] of this.data) {
      if (bucket.size === 0) continue;
      out[store] = Object.fromEntries(bucket);
    }
    return JSON.stringify(out);
  }
}

/** Abre o melhor store disponível; IndexedDB no app, memória como fallback. */
export async function openStore(): Promise<KeyValueStore> {
  if (typeof indexedDB !== 'undefined') {
    try {
      return await IndexedDbStore.open();
    } catch {
      // fallback para memória (dados apenas em sessão)
    }
  }
  return new MemoryStore();
}

export type { EncPayload };
