import { useEffect, useState } from 'react';

import { scorePassword } from '../../password-audit/audit';
import { CATEGORY_LABELS, type Credential } from '../../types';
import { copyText } from '../clipboard';
import { useApp } from '../AppContext';
import { Icon } from './Icon';
import { StrengthMeter } from './StrengthMeter';

const initial = (service: string) => service.trim().charAt(0).toUpperCase() || '?';

export function CredentialRow({
  credential,
  onEdit,
  onRemove,
}: {
  credential: Credential;
  onEdit: (c: Credential) => void;
  onRemove: (c: Credential) => void;
}) {
  const { toggleFavorite, toast } = useApp();
  const [reveal, setReveal] = useState(false);
  const [expireAt, setExpireAt] = useState<number | null>(null);
  const score = scorePassword(credential.password).score;

  useEffect(() => {
    if (expireAt === null) return;
    const t = window.setTimeout(() => {
      setReveal(false);
      setExpireAt(null);
    }, Math.max(0, expireAt - Date.now()));
    return () => window.clearTimeout(t);
  }, [expireAt]);

  const copy = async (value: string, label: string) => {
    const ok = await copyText(value, label === 'senha' ? 60_000 : undefined);
    toast(ok ? `${label} copiado${label === 'senha' ? ' (limpa em 60s)' : ''}.` : 'Falha ao copiar.', ok ? 'success' : 'error');
  };

  return (
    <div className="animate-fade flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 transition hover:border-accent/40 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-accent2/25 font-semibold text-accent">
          {initial(credential.service)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{credential.service}</span>
            <button
              onClick={() => void toggleFavorite(credential.id)}
              aria-label={credential.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              aria-pressed={credential.favorite}
              className={`p-focus rounded-md p-0.5 transition ${credential.favorite ? 'text-yellow-400' : 'text-muted hover:text-ink'}`}
            >
              <Icon name="star" size={16} fill={credential.favorite ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className="truncate text-xs text-muted">
            {credential.username || '—'} · {CATEGORY_LABELS[credential.category]}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:w-40">
        <StrengthMeter score={score} label={false} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => void copy(credential.username || '', 'Usuário')}
          disabled={!credential.username}
          aria-label="Copiar usuário"
          className="p-focus rounded-lg border border-line p-2 text-muted transition hover:text-ink disabled:opacity-30"
        >
          <Icon name="copy" size={16} />
        </button>
        <button
          onClick={() => {
            setReveal((v) => !v);
            if (!reveal) setExpireAt(Date.now() + 30_000);
            else setExpireAt(null);
          }}
          aria-label={reveal ? 'Ocultar senha' : 'Revelar senha'}
          aria-pressed={reveal}
          className="p-focus rounded-lg border border-line p-2 text-muted transition hover:text-ink"
        >
          <Icon name={reveal ? 'eye-off' : 'eye'} size={16} />
        </button>
        <button
          onClick={() => void copy(credential.password, 'senha')}
          aria-label="Copiar senha"
          className="p-focus rounded-lg border border-line p-2 text-muted transition hover:text-ink"
        >
          <Icon name="key" size={16} />
        </button>
        {credential.url && (
          <a
            href={credential.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Abrir site"
            className="p-focus rounded-lg border border-line p-2 text-muted transition hover:text-ink"
          >
            <Icon name="external" size={16} />
          </a>
        )}
        <button onClick={() => onEdit(credential)} aria-label="Editar" className="p-focus rounded-lg border border-line p-2 text-muted transition hover:text-ink">
          <Icon name="edit" size={16} />
        </button>
        <button onClick={() => onRemove(credential)} aria-label="Excluir" className="p-focus rounded-lg border border-line p-2 text-muted transition hover:text-danger">
          <Icon name="trash" size={16} />
        </button>
      </div>

      {reveal && (
        <div className="rounded-lg bg-panel2 px-3 py-2 font-mono text-sm tracking-wide select-all">
          {credential.password}
          <span className="ml-2 text-[10px] text-muted">oculta novamente em {Math.max(0, Math.ceil(((expireAt ?? 0) - Date.now()) / 1000))}s</span>
        </div>
      )}
    </div>
  );
}
