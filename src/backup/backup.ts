/**
 * backup — exportação e importação do cofre em arquivo criptografado.
 *
 * Formato: JSON envelope com parâmetros KDF (Argon2id, salt aleatório),
 * IV aleatório e ciphertext AES-256-GCM. A integridade é garantida pela
 * tag de autenticação GCM e por validação estrutural dos dados importados.
 *
 * NÃO existe exportação em texto puro.
 */
import { decryptJson, encryptJson, type EncPayload } from '../crypto/cipher';
import { defaultKdfParams, deriveAesKey, generateSalt, type KdfParams } from '../crypto/kdf';
import { CATEGORIES, BACKUP_FORMAT, VAULT_FORMAT_VERSION, type Credential } from '../types';

export const BACKUP_VERSION = 1;
export const MIN_BACKUP_PASSPHRASE_LENGTH = 8;

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: number;
  vaultVersion: number;
  createdAt: string;
  kdf: KdfParams;
  payload: EncPayload;
}

export interface BackupPayload {
  credentials: Credential[];
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

function validateCredentialShape(raw: unknown): Credential {
  const c = raw as Partial<Credential>;
  if (
    !c ||
    typeof c !== 'object' ||
    typeof c.id !== 'string' ||
    typeof c.service !== 'string' ||
    typeof c.username !== 'string' ||
    typeof c.password !== 'string' ||
    typeof c.category !== 'string' ||
    !CATEGORIES.includes(c.category as (typeof CATEGORIES)[number])
  ) {
    throw new BackupError('Backup contém registros inválidos.');
  }
  return {
    id: c.id,
    service: c.service,
    username: c.username ?? '',
    password: c.password,
    url: c.url ?? '',
    category: c.category as Credential['category'],
    notes: c.notes ?? '',
    favorite: Boolean(c.favorite),
    createdAt: c.createdAt ?? new Date().toISOString(),
    updatedAt: c.updatedAt ?? new Date().toISOString(),
  };
}

/** Exporta o cofre para um arquivo criptografado (string JSON pronta para download). */
export async function exportBackup(credentials: Credential[], passphrase: string): Promise<string> {
  if (passphrase.length < MIN_BACKUP_PASSPHRASE_LENGTH) {
    throw new BackupError(`A senha de backup deve ter pelo menos ${MIN_BACKUP_PASSPHRASE_LENGTH} caracteres.`);
  }
  const kdf: KdfParams = { ...defaultKdfParams('argon2id'), salt: generateSalt() };
  const key = await deriveAesKey(passphrase, kdf);
  const payload: BackupPayload = { credentials };
  const encPayload = await encryptJson(key, payload, 'pember:backup:v1');
  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    vaultVersion: VAULT_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    kdf,
    payload: encPayload,
  };
  return JSON.stringify(envelope, null, 2);
}

/** Valida estrutura do arquivo antes de tentar descriptografar. */
export function parseEnvelope(text: string): BackupEnvelope {
  let envelope: BackupEnvelope;
  try {
    envelope = JSON.parse(text) as BackupEnvelope;
  } catch {
    throw new BackupError('Arquivo inválido: não é um backup Pember.');
  }
  if (envelope?.format !== BACKUP_FORMAT) throw new BackupError('Arquivo inválido: formato não reconhecido.');
  if (typeof envelope.version !== 'number' || envelope.version > BACKUP_VERSION) {
    throw new BackupError('Backup criado por uma versão mais nova do Pember.');
  }
  if (!envelope.kdf?.salt || !envelope.payload?.iv || !envelope.payload?.ct) {
    throw new BackupError('Backup corrompido: campos criptográficos ausentes.');
  }
  return envelope;
}

/** Importa e valida um backup; lança BackupError para arquivos inválidos ou senha errada. */
export async function importBackup(text: string, passphrase: string): Promise<Credential[]> {
  const envelope = parseEnvelope(text);
  const key = await deriveAesKey(passphrase, envelope.kdf);
  let payload: BackupPayload;
  try {
    payload = await decryptJson<BackupPayload>(key, envelope.payload, 'pember:backup:v1');
  } catch {
    // Não vaza distinção entre senha errada e arquivo adulterado (GCM autentica tudo).
    throw new BackupError('Não foi possível abrir o backup: senha incorreta ou arquivo adulterado.');
  }
  if (!payload || !Array.isArray(payload.credentials)) {
    throw new BackupError('Backup corrompido: lista de credenciais ausente.');
  }
  return payload.credentials.map(validateCredentialShape);
}

export type MergeStrategy = 'merge' | 'replace';

/**
 * Combina credenciais importadas com as existentes.
 * - merge: mantém existentes; importadas com id duplicado são puladas; duplicatas
 *   lógicas (mesmo serviço + usuário) são puladas com aviso.
 * - replace: substitui tudo pelas importadas.
 */
export function combineCredentials(
  existing: Credential[],
  imported: Credential[],
  strategy: MergeStrategy,
): { result: Credential[]; skipped: number } {
  if (strategy === 'replace') return { result: imported, skipped: 0 };

  const ids = new Set(existing.map((c) => c.id));
  const logical = new Set(existing.map((c) => `${c.service.trim().toLowerCase()}|${c.username.trim().toLowerCase()}`));
  const result = [...existing];
  let skipped = 0;
  for (const c of imported) {
    const key = `${c.service.trim().toLowerCase()}|${c.username.trim().toLowerCase()}`;
    if (ids.has(c.id) || logical.has(key)) {
      skipped += 1;
      continue;
    }
    ids.add(c.id);
    logical.add(key);
    result.push(c);
  }
  return { result, skipped };
}

/** Nome de arquivo sugerido para o backup. */
export function backupFilename(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `pember-backup-${stamp}.pemberbak`;
}
