/**
 * auth — validação da senha mestra.
 *
 * A senha mestra protege toda a derivação de chave; exige-se um comprimento
 * razoável e rejeitam-se senhas comuns/ triviais. A análise é local.
 */

const COMMON_PASSWORDS = new Set([
  'password', 'senha123', 'senha', '123456', '12345678', '123456789', 'qwerty',
  'abc123', 'password1', 'letmein', 'admin', 'welcome', 'monkey', 'iloveyou',
  'dragon', 'football', 'master', 'sunshine', 'princess', 'p@ssw0rd', 'senha1234',
]);

export const MIN_MASTER_PASSWORD_LENGTH = 10;

export interface PasswordPolicyResult {
  ok: boolean;
  errors: string[];
}

export function validateMasterPassword(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  if (password.length < MIN_MASTER_PASSWORD_LENGTH) {
    errors.push(`Use pelo menos ${MIN_MASTER_PASSWORD_LENGTH} caracteres.`);
  }
  if (/^(.)\1*$/.test(password)) {
    errors.push('Evite um único caractere repetido.');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Esta senha é muito comum. Escolha outra.');
  }
  if (/^\s|\s$/.test(password)) {
    errors.push('Evite espaços no início ou no fim.');
  }
  return { ok: errors.length === 0, errors };
}
