import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { AttemptThrottle } from '../../auth/session';
import { useApp } from '../AppContext';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';

export function UnlockPage() {
  const { unlockVault, busy, lockVault } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [waitMs, setWaitMs] = useState(0);
  const throttle = useMemo(() => new AttemptThrottle({ baseDelayMs: 1_000, maxDelayMs: 60_000 }), []);

  useEffect(() => {
    if (waitMs <= 0) return;
    const t = window.setInterval(() => setWaitMs(throttle.retryAfterMs()), 250);
    return () => window.clearInterval(t);
  }, [waitMs, throttle]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!throttle.canAttempt()) {
      setWaitMs(throttle.retryAfterMs());
      return;
    }
    try {
      await unlockVault(password);
      throttle.recordSuccess();
      setPassword('');
    } catch {
      const delay = throttle.recordFailure();
      setWaitMs(delay);
      setError('Senha mestra incorreta.');
      setPassword('');
    }
  };

  const locked = waitMs > 0;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="animate-fade w-full max-w-sm rounded-2xl border border-line bg-panel p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <h1 className="text-xl font-semibold tracking-tight">Cofre bloqueado</h1>
          <p className="text-sm text-muted">Digite sua senha mestra para desbloquear o Pember.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Senha mestra
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={locked || busy}
              className="p-focus rounded-xl border border-line bg-panel2 px-3.5 py-2.5 text-sm text-ink"
            />
          </label>

          {error && (
            <p className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              <Icon name="alert" size={16} />
              {error}
            </p>
          )}
          {locked && (
            <p className="flex items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2 text-xs text-muted" role="alert">
              <Icon name="lock" size={14} />
              Muitas tentativas. Aguarde {Math.ceil(waitMs / 1000)}s.
            </p>
          )}

          <button
            type="submit"
            disabled={busy || locked || !password}
            className="p-focus rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Verificando…' : 'Desbloquear'}
          </button>
        </form>

        <div className="mt-6 border-t border-line pt-4 text-center">
          <button
            onClick={() => {
              if (window.confirm('Isso excluirá TODO o cofre e os dados locais deste dispositivo. Continuar?')) {
                void lockVault();
                // força a exclusão via página de configurações exigiria desbloqueio;
                // aqui oferecemos apenas o caminho documentado: desbloqueie e exclua nos Ajustes.
                window.alert('Desbloqueie o cofre e use Configurações → Excluir cofre para removê-lo com segurança.');
              }
            }}
            className="p-focus text-xs text-muted underline-offset-2 hover:text-danger hover:underline"
          >
            Esqueci minha senha mestra
          </button>
        </div>
      </div>
    </div>
  );
}
