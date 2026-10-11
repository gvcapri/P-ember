import { useMemo, useState } from 'react';

import { auditCredentials, SCORE_LABELS } from '../../password-audit/audit';
import { CATEGORIES, CATEGORY_LABELS } from '../../types';
import { useApp } from '../AppContext';
import { CredentialModal } from '../components/CredentialModal';
import { CredentialRow } from '../components/CredentialRow';
import { Icon } from '../components/Icon';
import type { Page } from '../../App';

export function DashboardPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { credentials, settings } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');

  const audit = useMemo(() => auditCredentials(credentials), [credentials]);
  const favorites = credentials.filter((c) => c.favorite);
  const recent = credentials.slice(0, 5);
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return credentials.filter((c) => [c.service, c.username, c.url].some((v) => v.toLowerCase().includes(q)));
  }, [credentials, query]);

  const stats = [
    { label: 'Credenciais', value: credentials.length, icon: 'shield' as const },
    { label: 'Favoritas', value: favorites.length, icon: 'star' as const },
    { label: 'Senhas fracas', value: audit.weakCount, icon: 'alert' as const },
    { label: 'Reutilizadas', value: audit.reusedCount, icon: 'refresh' as const },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}.</h1>
          <p className="text-sm text-muted">Seu cofre está {audit.overallScore >= 3 ? 'em boa forma' : 'precisando de atenção'}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onNavigate('generator')} className="p-focus flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:text-ink">
            <Icon name="sparkles" size={17} />
            Gerador
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="p-focus flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <Icon name="plus" size={17} />
            Adicionar senha
          </button>
        </div>
      </div>

      {/* Segurança do cofre */}
      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Segurança do cofre</h2>
          <span className="text-xs text-muted">avaliação local</span>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" role="meter" aria-valuenow={audit.overallScore} aria-valuemin={0} aria-valuemax={4} aria-label="Pontuação de segurança do cofre">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < audit.overallScore ? (audit.overallScore >= 3 ? 'bg-ok' : audit.overallScore === 2 ? 'bg-yellow-500' : 'bg-danger') : 'bg-line'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium">{SCORE_LABELS[audit.overallScore]}</span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {audit.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted">
              <Icon name="check" size={15} className="mt-0.5 shrink-0 text-accent2" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-panel p-4">
            <div className="mb-2 text-muted">
              <Icon name={s.icon} size={18} />
            </div>
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Busca global */}
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
          <Icon name="search" size={17} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar no cofre…"
          aria-label="Pesquisar no cofre"
          className="p-focus w-full rounded-xl border border-line bg-panel py-2.5 pr-4 pl-10 text-sm text-ink placeholder:text-muted"
        />
        {query.trim() && (
          <div className="mt-2 flex flex-col gap-2">
            {searchResults.length === 0 ? (
              <p className="rounded-xl border border-line bg-panel px-4 py-3 text-sm text-muted">Nenhum resultado para “{query}”.</p>
            ) : (
              searchResults.slice(0, 6).map((c) => <CredentialRow key={c.id} credential={c} onEdit={() => onNavigate('vault')} onRemove={() => onNavigate('vault')} />)
            )}
          </div>
        )}
      </div>

      {/* Recentes */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Credenciais recentes</h2>
          <button onClick={() => onNavigate('vault')} className="p-focus flex items-center gap-1 text-xs text-accent hover:underline">
            Ver cofre completo
            <Icon name="chevron-down" size={13} className="-rotate-90" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
              Nada por aqui ainda — adicione sua primeira credencial.
            </p>
          ) : (
            recent.map((c) => <CredentialRow key={c.id} credential={c} onEdit={() => onNavigate('vault')} onRemove={() => onNavigate('vault')} />)
          )}
        </div>
      </section>

      {/* Categorias e favoritos */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 text-sm font-semibold">Categorias</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const count = credentials.filter((c) => c.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => onNavigate('vault')}
                  className="p-focus flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted transition hover:border-accent/50 hover:text-ink"
                >
                  {CATEGORY_LABELS[cat]}
                  <span className="rounded-full bg-panel2 px-1.5 text-[10px]">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 text-sm font-semibold">Favoritos</h2>
          {favorites.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma credencial favoritada ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {favorites.slice(0, 6).map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{f.service}</span>
                  <span className="truncate text-xs text-muted">{f.username}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-xs text-muted">
        Bloqueio automático: {settings.autoLockMinutes === 0 ? 'desativado' : `${settings.autoLockMinutes} min`} · Dados 100% locais e
        criptografados.
      </p>

      <CredentialModal open={modalOpen} editing={null} onClose={() => setModalOpen(false)} />
    </div>
  );
}
