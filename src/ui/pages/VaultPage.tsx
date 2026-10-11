import { useMemo, useState } from 'react';

import { auditCredentials } from '../../password-audit/audit';
import { CATEGORIES, CATEGORY_LABELS, type Category, type Credential } from '../../types';
import { useApp } from '../AppContext';
import { CredentialModal } from '../components/CredentialModal';
import { CredentialRow } from '../components/CredentialRow';
import { Icon } from '../components/Icon';

type SecurityFilter = 'todos' | 'fortes' | 'fracas';

export function VaultPage() {
  const { credentials, removeCredential, busy } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'todas'>('todas');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [security, setSecurity] = useState<SecurityFilter>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [toDelete, setToDelete] = useState<Credential | null>(null);

  const audit = useMemo(() => auditCredentials(credentials), [credentials]);
  const scoreOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of audit.findings) map.set(f.credential.id, f.score.score);
    return map;
  }, [audit]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return credentials.filter((c) => {
      if (q && ![c.service, c.username, c.url].some((v) => v.toLowerCase().includes(q))) return false;
      if (category !== 'todas' && c.category !== category) return false;
      if (favoritesOnly && !c.favorite) return false;
      if (security === 'fortes' && (scoreOf.get(c.id) ?? 0) < 2) return false;
      if (security === 'fracas' && (scoreOf.get(c.id) ?? 4) > 1) return false;
      return true;
    });
  }, [credentials, query, category, favoritesOnly, security, scoreOf]);

  const inputCls = 'p-focus rounded-xl border border-line bg-panel2 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cofre</h1>
          <p className="text-sm text-muted">
            {credentials.length} credencial{credentials.length === 1 ? '' : 'is'} · {audit.weakCount} fraca(s) · {audit.reusedCount} reutilizada(s)
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="p-focus flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Icon name="plus" size={17} />
          Nova credencial
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            <Icon name="search" size={17} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome, usuário ou site…"
            aria-label="Pesquisar credenciais"
            className={`${inputCls} w-full pl-10`}
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value as Category | 'todas')} aria-label="Filtrar por categoria" className={inputCls}>
          <option value="todas">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select value={security} onChange={(e) => setSecurity(e.target.value as SecurityFilter)} aria-label="Filtrar por segurança" className={inputCls}>
          <option value="todos">Toda segurança</option>
          <option value="fortes">Senhas fortes</option>
          <option value="fracas">Senhas fracas</option>
        </select>
        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          aria-pressed={favoritesOnly}
          className={`p-focus flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm transition ${
            favoritesOnly ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-400' : 'border-line text-muted hover:text-ink'
          }`}
        >
          <Icon name="star" size={16} fill={favoritesOnly ? 'currentColor' : 'none'} />
          Favoritos
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-10 text-center text-muted">
            <Icon name="shield" size={34} />
            <p>{credentials.length === 0 ? 'Seu cofre está vazio. Adicione a primeira credencial.' : 'Nenhuma credencial corresponde aos filtros.'}</p>
          </div>
        ) : (
          filtered.map((c) => (
            <CredentialRow
              key={c.id}
              credential={c}
              onEdit={(cred) => {
                setEditing(cred);
                setModalOpen(true);
              }}
              onRemove={setToDelete}
            />
          ))
        )}
      </div>

      <CredentialModal open={modalOpen} editing={editing} onClose={() => setModalOpen(false)} />

      {toDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setToDelete(null)}>
          <div role="alertdialog" aria-modal="true" aria-label="Confirmar exclusão" className="animate-fade w-full max-w-sm rounded-2xl border border-line bg-panel p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold">Excluir credencial?</h2>
            <p className="mb-5 text-sm text-muted">
              <strong className="text-ink">{toDelete.service}</strong> será removido permanentemente do cofre. Esta ação
              não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setToDelete(null)} className="p-focus rounded-xl border border-line px-4 py-2.5 text-sm text-muted hover:text-ink">
                Cancelar
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  await removeCredential(toDelete.id);
                  setToDelete(null);
                }}
                className="p-focus rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
