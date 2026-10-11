import { useMemo, useState, type FormEvent } from 'react';

import { DEFAULT_OPTIONS, generatePassword } from '../../password-generator/generator';
import { CATEGORIES, CATEGORY_LABELS, type Category, type Credential } from '../../types';
import { copyText } from '../clipboard';
import { useApp } from '../AppContext';
import { Icon } from './Icon';

const emptyForm = {
  service: '',
  username: '',
  password: '',
  url: '',
  category: 'pessoal' as Category,
  notes: '',
  favorite: false,
};

export function CredentialModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Credential | null;
  onClose: () => void;
}) {
  const { addCredential, updateCredential, busy, toast } = useApp();
  const [form, setForm] = useState(() =>
    editing
      ? {
          service: editing.service,
          username: editing.username,
          password: editing.password,
          url: editing.url,
          category: editing.category,
          notes: editing.notes,
          favorite: editing.favorite,
        }
      : emptyForm,
  );
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => (editing ? editing.id : 'new') + String(open), [editing, open]);
  if (!open) return null;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.service.trim()) return setError('Informe o nome do serviço.');
    if (!form.password) return setError('Informe ou gere uma senha.');
    const payload = {
      ...form,
      service: form.service.trim(),
      username: form.username.trim(),
      url: form.url.trim(),
    };
    try {
      if (editing) await updateCredential(editing.id, payload);
      else await addCredential(payload);
      setForm(emptyForm);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    }
  };

  const inputCls =
    'p-focus rounded-xl border border-line bg-panel2 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div key={key} role="dialog" aria-modal="true" aria-label={editing ? 'Editar credencial' : 'Nova credencial'} className="animate-fade max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editing ? 'Editar credencial' : 'Nova credencial'}</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-focus rounded-lg p-1.5 text-muted hover:text-ink">
            <Icon name="x" size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Serviço *
            <input value={form.service} onChange={(e) => set('service', e.target.value)} placeholder="GitHub, Banco X, Netflix…" className={inputCls} />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Usuário / e-mail
            <input value={form.username} autoComplete="off" onChange={(e) => set('username', e.target.value)} placeholder="voce@email.com" className={inputCls} />
          </label>

          <div className="flex flex-col gap-1.5 text-sm font-medium">
            <label htmlFor="cred-password">Senha *</label>
            <div className="flex gap-2">
              <input
                id="cred-password"
                type={reveal ? 'text' : 'password'}
                value={form.password}
                autoComplete="new-password"
                onChange={(e) => set('password', e.target.value)}
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? 'Ocultar senha' : 'Revelar senha'}
                className="p-focus rounded-xl border border-line bg-panel2 px-3 text-muted hover:text-ink"
              >
                <Icon name={reveal ? 'eye-off' : 'eye'} size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const pw = generatePassword({ ...DEFAULT_OPTIONS, length: 20 });
                  set('password', pw);
                  setReveal(true);
                }}
                aria-label="Gerar senha"
                className="p-focus rounded-xl border border-line bg-panel2 px-3 text-accent hover:opacity-80"
              >
                <Icon name="sparkles" size={18} />
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyText(form.password, 60_000);
                  toast(ok ? 'Senha copiada (limpa em 60s).' : 'Não foi possível copiar.', ok ? 'success' : 'error');
                }}
                aria-label="Copiar senha"
                className="p-focus rounded-xl border border-line bg-panel2 px-3 text-muted hover:text-ink"
              >
                <Icon name="copy" size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              URL
              <input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Categoria
              <select value={form.category} onChange={(e) => set('category', e.target.value as Category)} className={inputCls}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Observações
            <textarea value={form.notes} rows={3} onChange={(e) => set('notes', e.target.value)} placeholder="Código 2FA, local do token…" className={`${inputCls} resize-y`} />
          </label>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={form.favorite} onChange={(e) => set('favorite', e.target.checked)} className="accent-[var(--p-accent)]" />
            Favoritar esta credencial
          </label>

          {error && (
            <p className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              <Icon name="alert" size={16} />
              {error}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="p-focus rounded-xl border border-line px-4 py-2.5 text-sm text-muted hover:text-ink">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="p-focus rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {editing ? 'Salvar alterações' : 'Adicionar ao cofre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
