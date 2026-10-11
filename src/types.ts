/** Tipos de domínio compartilhados por todos os módulos. */

export const CATEGORIES = [
  'trabalho',
  'pessoal',
  'financas',
  'redes-sociais',
  'compras',
  'desenvolvimento',
  'outros',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  trabalho: 'Trabalho',
  pessoal: 'Pessoal',
  financas: 'Finanças',
  'redes-sociais': 'Redes sociais',
  compras: 'Compras',
  desenvolvimento: 'Desenvolvimento',
  outros: 'Outros',
};

export interface Credential {
  id: string;
  service: string;
  username: string;
  /** Senha em texto puro apenas em memória, nunca persistida assim. */
  password: string;
  url: string;
  category: Category;
  notes: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CredentialInput = Omit<Credential, 'id' | 'createdAt' | 'updatedAt' | 'favorite'> & {
  favorite?: boolean;
};

export const VAULT_FORMAT_VERSION = 1;
export const BACKUP_FORMAT = 'pember-backup';

/** Registro meta do cofre (persistido; não contém segredos em texto puro). */
export interface VaultMeta {
  version: number;
  kdf: import('./crypto/kdf').KdfParams;
  /** Chave de verificação criptografada (distingue senha errada de dado corrompido). */
  verifier: import('./crypto/cipher').EncPayload;
  /** DEK (chave de dados) embrulhada pela chave derivada da senha mestra. */
  wrappedDek: import('./crypto/cipher').EncPayload;
  createdAt: string;
  /** Histórico do gerador: somente criptografado, desativado por padrão. */
  generatorHistory?: import('./crypto/cipher').EncPayload;
}
