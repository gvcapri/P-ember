import { useState, type FormEvent } from 'react';

import { MIN_MASTER_PASSWORD_LENGTH, validateMasterPassword } from '../../auth/passwordPolicy';
import { scorePassword } from '../../password-audit/audit';
import { useApp } from '../AppContext';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { StrengthMeter } from '../components/StrengthMeter';

export function SetupPage() {
  const { createVault, busy } = useApp();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const policy = validateMasterPassword(password);
  const score = scorePassword(password).score;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!policy.ok) {
      setError(policy.errors[0] ?? 'Senha mestra inválida.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    if (!ack) {
      setError('Confirme que entendeu que a senha mestra não pode ser recuperada.');
      return;
    }
    try {
      await createVault(password);
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar o cofre.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="animate-fade w-full max-w-md rounded-2xl border border-line bg-panel p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <h1 className="text-2xl font-semibold tracking-tight">Crie seu cofre Pember</h1>
          <p className="text-sm text-muted">
            Tudo é criptografado neste dispositivo com a sua senha mestra. Sem nuvem, sem contas remotas.
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Senha mestra
            <input
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`mínimo de ${MIN_MASTER_PASSWORD_LENGTH} caracteres`}
              className="p-focus rounded-xl border border-line bg-panel2 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted"
            />
          </label>
          {password && <StrengthMeter score={score} />}

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Confirmar senha mestra
            <input
              type="password"
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
              className="p-focus rounded-xl border border-line bg-panel2 px-3.5 py-2.5 text-sm text-ink"
            />
          </label>

          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 accent-[var(--p-accent)]" />
            <span>
              Entendo que <strong className="text-ink">não há como recuperar a senha mestra</strong>. Se eu esquecê-la, o
              cofre fica irrecuperável — guarde uma cópia em local seguro.
            </span>
          </label>

          {error && (
            <p className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              <Icon name="alert" size={16} />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="p-focus mt-1 rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Criando cofre…' : 'Criar cofre e entrar'}
          </button>
        </form>

        <ul className="mt-6 flex flex-col gap-1.5 text-xs text-muted">
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-ok" /> AES-256-GCM com IV único por registro</li>
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-ok" /> Chave derivada com Argon2id (64 MiB)</li>
          <li className="flex items-center gap-2"><Icon name="check" size={14} className="text-ok" /> Bloqueio automático por inatividade</li>
        </ul>
      </div>
    </div>
  );
}
