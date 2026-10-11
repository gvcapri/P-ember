/**
 * password-audit — análise local de força, reutilização e padrões.
 *
 * Tudo é calculado no dispositivo; nenhuma senha é enviada a serviços externos.
 * A avaliação não olha apenas comprimento/charset: penaliza padrões previsíveis
 * (sequências, repetições, teclados, datas, senhas comuns).
 */
import type { Credential } from '../types';

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export interface ScoreResult {
  score: StrengthScore;
  /** força em bits estimada (heurística local) */
  entropyBits: number;
  issues: string[];
  suggestions: string[];
}

const COMMON = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'abc123', 'iloveyou', 'admin', 'letmein', 'welcome', 'monkey',
  'dragon', 'football', 'master', 'sunshine', 'princess', 'qwertyuiop', 'senha123', 'senha',
  'p@ssw0rd', 'passw0rd', 'abc123456', '000000', '111111', 'abcd1234', 'trustno1',
]);

const SEQUENCES = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];

function poolSize(pw: string): number {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  return pool;
}

function hasLongRun(pw: string): boolean {
  const lower = pw.toLowerCase();
  for (const seq of SEQUENCES) {
    for (let i = 0; i + 4 <= seq.length; i++) {
      const chunk = seq.slice(i, i + 4);
      if (lower.includes(chunk)) return true;
      if (lower.includes([...chunk].reverse().join(''))) return true;
    }
  }
  return false;
}

function hasKeyboardWalk(pw: string): boolean {
  const lower = pw.toLowerCase();
  for (const row of KEYBOARD_ROWS) {
    for (let i = 0; i + 4 <= row.length; i++) {
      const chunk = row.slice(i, i + 4);
      if (lower.includes(chunk) || lower.includes([...chunk].reverse().join(''))) return true;
    }
  }
  return false;
}

function hasRepeatRun(pw: string): boolean {
  return /(.)\1{2,}/.test(pw) || /^(.{1,3})\1{2,}/.test(pw);
}

function hasDateLike(pw: string): boolean {
  return /(^|\D)(19|20)\d{2}(-|\/)?\d{0,2}(-|\/)?\d{0,2}($|\D)/.test(pw) || /\b\d{2}[/.-]\d{2}[/.-]\d{2,4}\b/.test(pw);
}

/** Avalia a força de uma senha individual. */
export function scorePassword(password: string): ScoreResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  if (!password) {
    return { score: 0, entropyBits: 0, issues: ['Senha vazia.'], suggestions: ['Gere uma senha forte.'] };
  }

  const pw = password;
  const lower = pw.toLowerCase();
  const length = pw.length;
  let pool = poolSize(pw);
  let entropyBits = Math.round(length * Math.log2(Math.max(pool, 2)));

  if (length < 8) issues.push('Muito curta (menos de 8 caracteres).');
  else if (length < 12) issues.push('Curta demais para uso prolongado.');

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(pw)).length;
  if (classes <= 1) issues.push('Usa um único tipo de caractere.');

  if (COMMON.has(lower)) {
    issues.push('Esta senha consta em listas de senhas comuns.');
    entropyBits = Math.min(entropyBits, 4);
  }
  if (hasLongRun(pw)) {
    issues.push('Contém sequências previsíveis (ex.: abc, 1234).');
    entropyBits = Math.round(entropyBits * 0.6);
  }
  if (hasKeyboardWalk(pw)) {
    issues.push('Contém padrões de teclado (ex.: qwerty, asdf).');
    entropyBits = Math.round(entropyBits * 0.6);
  }
  if (hasRepeatRun(pw)) {
    issues.push('Contém caracteres repetidos em sequência.');
    entropyBits = Math.round(entropyBits * 0.75);
  }
  if (hasDateLike(pw)) {
    issues.push('Contém padrões de data.');
    entropyBits = Math.round(entropyBits * 0.8);
  }
  if (/^\d+$/.test(pw)) issues.push('Somente números.');

  if (issues.length === 0 && length < 16) suggestions.push('Considere aumentar o comprimento para 16+ caracteres.');
  if (classes < 3) suggestions.push('Misture maiúsculas, minúsculas, números e símbolos.');
  if (issues.some((i) => i.includes('sequência') || i.includes('teclado'))) {
    suggestions.push('Evite sequências e padrões de teclado; use palavras aleatórias.');
  }
  if (COMMON.has(lower)) suggestions.push('Substitua por uma senha gerada aleatoriamente.');

  let score: StrengthScore;
  if (entropyBits < 28 || COMMON.has(lower)) score = 0;
  else if (entropyBits < 40) score = 1;
  else if (entropyBits < 60) score = 2;
  else if (entropyBits < 80) score = 3;
  else score = 4;

  if (issues.length > 0 && score > 1) score = 1;
  if (issues.length > 2) score = 0;

  return { score, entropyBits, issues, suggestions };
}

export interface ReuseGroup {
  password: string;
  credentials: Credential[];
}

export interface CredentialFinding {
  credential: Credential;
  score: ScoreResult;
  reused: boolean;
  reusedWith: string[];
  weak: boolean;
}

export interface AuditReport {
  findings: CredentialFinding[];
  reusedGroups: ReuseGroup[];
  weakCount: number;
  reusedCount: number;
  overallScore: StrengthScore;
  recommendations: string[];
}

/** Audita o conjunto completo do cofre: força, repetição e reutilização. */
export function auditCredentials(credentials: Credential[]): AuditReport {
  const byPassword = new Map<string, Credential[]>();
  for (const c of credentials) {
    if (!c.password) continue;
    const group = byPassword.get(c.password) ?? [];
    group.push(c);
    byPassword.set(c.password, group);
  }

  const reusedGroups: ReuseGroup[] = [];
  for (const [password, group] of byPassword) {
    if (group.length > 1) reusedGroups.push({ password, credentials: group });
  }

  const findings: CredentialFinding[] = credentials.map((credential) => {
    const score = scorePassword(credential.password);
    const group = byPassword.get(credential.password);
    const reusedWith = (group ?? []).filter((c) => c.id !== credential.id).map((c) => c.service);
    return {
      credential,
      score,
      reused: reusedWith.length > 0,
      reusedWith,
      weak: score.score <= 1,
    };
  });

  const weakCount = findings.filter((f) => f.weak).length;
  const reusedCount = findings.filter((f) => f.reused).length;

  const recommendations: string[] = [];
  if (weakCount > 0) recommendations.push(`Substitua ${weakCount} senha(s) fracas por senhas geradas no Pember.`);
  if (reusedCount > 0) recommendations.push('Use uma senha diferente para cada serviço (reutilização é o principal risco).');
  if (credentials.some((c) => c.password.length < 12)) recommendations.push('Priorize senhas com 16 caracteres ou mais.');
  if (recommendations.length === 0) recommendations.push('Nenhuma ação urgente: mantenha o hábito de revisar periodicamente.');

  let overall: StrengthScore = 4;
  if (credentials.length === 0) overall = 0;
  else if (weakCount > 0 || reusedCount > 0) {
    const problemRatio = (weakCount + reusedCount) / (credentials.length * 2);
    overall = problemRatio > 0.5 ? 1 : problemRatio > 0.2 ? 2 : 3;
  }

  return { findings, reusedGroups, weakCount, reusedCount, overallScore: overall, recommendations };
}

export const SCORE_LABELS: Record<StrengthScore, string> = {
  0: 'Muito fraca',
  1: 'Fraca',
  2: 'Razoável',
  3: 'Forte',
  4: 'Excelente',
};
