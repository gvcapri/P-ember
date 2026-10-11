import { useRef, useState, type FormEvent } from 'react';

import { exportBackup, importBackup, combineCredentials, backupFilename, MIN_BACKUP_PASSPHRASE_LENGTH, type MergeStrategy } from '../../backup/backup';
import { useApp } from '../AppContext';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';

const APP_VERSION = '0.1.0';

export function SettingsPage() {
  const { settings, updateSettings, credentials, addCredential, replaceAllCredentials, destroyVault, reauthenticate, toast } = useApp();
  const [confirmText, setConfirmText] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthFor, setReauthFor] = useState<'export' | 'destroy' | 'import' | null>(null);
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [exportPass, setExportPass] = useState('');
  const [importPass, setImportPass] = useState('');
  const [importPreview, setImportPreview] = useState<{ creds: Awaited<ReturnType<typeof importBackup>>; name: string } | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('merge');
  const fileRef = useRef<HTMLInputElement>(null);

  // ---------- export ----------
  const doExport = async (passphrase: string) => {
    try {
      const text = await exportBackup(credentials, passphrase);
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFilename();
      a.click();
      URL.revokeObjectURL(url);
      toast('Backup exportado (criptografado).', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao exportar.', 'error');
    }
  };

  // ---------- import ----------
  const onFile = async (file: File, passphrase: string) => {
    try {
      const text = await file.text();
      const creds = await importBackup(text, passphrase);
      setImportPreview({ creds, name: file.name });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Arquivo inválido.', 'error');
    }
  };

  const applyImport = async () => {
    if (!importPreview) return;
    const toInput = (c: (typeof importPreview.creds)[number]) => ({
      service: c.service,
      username: c.username,
      password: c.password,
      url: c.url,
      category: c.category,
      notes: c.notes,
      favorite: c.favorite,
    });
    if (mergeStrategy === 'replace') {
      await replaceAllCredentials(importPreview.creds.map(toInput));
      toast(`Backup restaurado: ${importPreview.creds.length} credencial(is).`, 'success');
    } else {
      const { skipped } = combineCredentials(credentials, importPreview.creds, 'merge');
      for (const c of importPreview.creds) {
        if (!credentials.find((e) => e.id === c.id)) await addCredential(toInput(c));
      }
      const added = importPreview.creds.length - skipped;
      toast(`Importação concluída: ${added} nova(s), ${skipped} ignorada(s) por duplicidade.`, 'success');
    }
    setImportPreview(null);
  };

  const handleReauth = async (e: FormEvent) => {
    e.preventDefault();
    setReauthError(null);
    const ok = await reauthenticate(reauthPassword);
    if (!ok) {
      setReauthError('Senha mestra incorreta.');
      return;
    }
    const action = reauthFor;
    setReauthPassword('');
    setReauthFor(null);
    if (action === 'destroy') {
      if (confirmText !== 'EXCLUIR') {
        toast('Digite EXCLUIR para confirmar.', 'error');
        return;
      }
      await destroyVault();
    } else if (action === 'export') {
      await doExport(exportPass);
    } else if (action === 'import') {
      await applyImport();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted">Preferências locais do Pember. Nada é enviado para servidores.</p>
      </div>

      {/* Aparência */}
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-sm font-semibold">Aparência</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2.5 text-sm text-muted">
            <input type="radio" checked={settings.theme === 'dark'} onChange={() => void updateSettings({ theme: 'dark' })} className="accent-[var(--p-accent)]" />
            <Icon name="moon" size={16} /> Tema escuro
          </label>
          <label className="flex items-center gap-2.5 text-sm text-muted">
            <input type="radio" checked={settings.theme === 'light'} onChange={() => void updateSettings({ theme: 'light' })} className="accent-[var(--p-accent)]" />
            <Icon name="sun" size={16} /> Tema claro
          </label>
          <label className="flex items-center gap-2.5 text-sm text-muted">
            <input type="checkbox" checked={settings.reducedMotion} onChange={(e) => void updateSettings({ reducedMotion: e.target.checked })} className="accent-[var(--p-accent)]" />
            Reduzir animações
          </label>
        </div>
      </section>

      {/* Segurança */}
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-sm font-semibold">Segurança</h2>
        <label className="mb-3 flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Bloqueio automático após inatividade</span>
          <select
            value={settings.autoLockMinutes}
            onChange={(e) => void updateSettings({ autoLockMinutes: Number(e.target.value) })}
            className="p-focus w-48 rounded-xl border border-line bg-panel2 px-3.5 py-2 text-sm"
          >
            <option value={0}>Desativado</option>
            <option value={1}>1 minuto</option>
            <option value={5}>5 minutos</option>
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Histórico de senhas geradas (criptografado, local)</span>
          <label className="flex items-center gap-2.5 text-sm text-muted">
            <input type="checkbox" checked={settings.generatorHistoryEnabled} onChange={(e) => void updateSettings({ generatorHistoryEnabled: e.target.checked })} className="accent-[var(--p-accent)]" />
            Ativar histórico do gerador
          </label>
        </label>
      </section>

      {/* Backup */}
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-1 text-sm font-semibold">Backup e restauração</h2>
        <p className="mb-4 text-xs text-muted">
          O backup é um arquivo <strong>.pemberbak</strong> criptografado com AES-256-GCM e uma senha de backup que você
          escolhe (min. {MIN_BACKUP_PASSPHRASE_LENGTH} caracteres). Guarde essa senha: sem ela o backup é inútil.
        </p>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="text-muted">Senha de backup</span>
            <input
              type="password"
              value={exportPass}
              onChange={(e) => setExportPass(e.target.value)}
              className="p-focus rounded-xl border border-line bg-panel2 px-3.5 py-2 text-sm"
            />
          </label>
          <button
            disabled={exportPass.length < MIN_BACKUP_PASSPHRASE_LENGTH || credentials.length === 0}
            onClick={() => setReauthFor('export')}
            className="p-focus flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            <Icon name="download" size={16} />
            Exportar backup
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="text-muted">Senha do backup a importar</span>
            <input
              type="password"
              value={importPass}
              onChange={(e) => setImportPass(e.target.value)}
              className="p-focus rounded-xl border border-line bg-panel2 px-3.5 py-2 text-sm"
            />
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".pemberbak,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && importPass.length >= MIN_BACKUP_PASSPHRASE_LENGTH) void onFile(f, importPass);
              else if (f) toast('Informe a senha de backup antes de escolher o arquivo.', 'error');
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="p-focus flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted hover:text-ink"
          >
            <Icon name="upload" size={16} />
            Importar backup
          </button>
        </div>
      </section>

      {/* Sobre */}
      <section className="rounded-2xl border border-line bg-panel p-5 text-sm text-muted">
        <h2 className="mb-2 text-sm font-semibold text-ink">Sobre</h2>
        <p>Pember v{APP_VERSION} — gerenciador de senhas local e criptografado.</p>
        <p className="mt-1">Criptografia: Argon2id (64 MiB) + AES-256-GCM (Web Crypto API). Sem telemetria, sem nuvem.</p>
      </section>

      {/* Zona de perigo */}
      <section className="rounded-2xl border border-danger/40 bg-danger/5 p-5">
        <h2 className="mb-1 text-sm font-semibold text-danger">Zona de perigo</h2>
        <p className="mb-3 text-xs text-muted">
          Excluir o cofre remove TODOS os dados locais deste dispositivo. Sem backup, as credenciais são perdidas
          para sempre.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Digite EXCLUIR"
            aria-label="Confirmação textual"
            className="p-focus w-48 rounded-xl border border-danger/40 bg-panel px-3.5 py-2 text-sm"
          />
          <button
            disabled={confirmText !== 'EXCLUIR'}
            onClick={() => setReauthFor('destroy')}
            className="p-focus flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Icon name="trash" size={16} />
            Excluir cofre e dados locais
          </button>
        </div>
      </section>

      {/* Reautenticação */}
      <Modal open={reauthFor !== null} title="Confirme sua senha mestra" onClose={() => setReauthFor(null)}>
        <form onSubmit={handleReauth} className="flex flex-col gap-4">
          <p className="text-sm text-muted">Operação sensível requer reautenticação.</p>
          <input
            type="password"
            value={reauthPassword}
            autoComplete="current-password"
            onChange={(e) => setReauthPassword(e.target.value)}
            placeholder="Senha mestra"
            className="p-focus rounded-xl border border-line bg-panel2 px-3.5 py-2.5 text-sm"
          />
          {reauthError && <p className="text-sm text-danger">{reauthError}</p>}
          <button type="submit" className="p-focus rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            Confirmar
          </button>
        </form>
      </Modal>

      {/* Preview de importação */}
      <Modal open={importPreview !== null} title="Importar backup" onClose={() => setImportPreview(null)}>
        {importPreview && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Arquivo <strong className="text-ink">{importPreview.name}</strong> com {importPreview.creds.length} credencial(is)
              válida(s). Como deseja proceder?
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2.5">
                <input type="radio" checked={mergeStrategy === 'merge'} onChange={() => setMergeStrategy('merge')} className="accent-[var(--p-accent)]" />
                Mesclar (manter atuais, adicionar novas)
              </label>
              <label className="flex items-center gap-2.5">
                <input type="radio" checked={mergeStrategy === 'replace'} onChange={() => setMergeStrategy('replace')} className="accent-[var(--p-accent)]" />
                Substituir todas as atuais pelas do backup
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setImportPreview(null)} className="p-focus rounded-xl border border-line px-4 py-2 text-sm text-muted hover:text-ink">
                Cancelar
              </button>
              <button
                onClick={() => (mergeStrategy === 'replace' ? setReauthFor('import') : void applyImport())}
                className="p-focus rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Confirmar importação
              </button>
            </div>
            {mergeStrategy === 'replace' && (
              <p className="text-xs text-muted">A substituição exige reautenticação com a senha mestra.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
