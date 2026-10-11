import { useState } from 'react';

import { AppProvider, useApp } from './ui/AppContext';
import { Icon, type IconName } from './ui/components/Icon';
import { Logo } from './ui/components/Logo';
import { Toasts } from './ui/components/Toasts';
import { AuditPage } from './ui/pages/AuditPage';
import { DashboardPage } from './ui/pages/DashboardPage';
import { GeneratorPage } from './ui/pages/GeneratorPage';
import { SettingsPage } from './ui/pages/SettingsPage';
import { SetupPage } from './ui/pages/SetupPage';
import { UnlockPage } from './ui/pages/UnlockPage';
import { VaultPage } from './ui/pages/VaultPage';

export type Page = 'dashboard' | 'vault' | 'generator' | 'audit' | 'settings';

const NAV: { id: Page; label: string; icon: IconName }[] = [
  { id: 'dashboard', label: 'Início', icon: 'home' },
  { id: 'vault', label: 'Cofre', icon: 'shield' },
  { id: 'generator', label: 'Gerador', icon: 'sparkles' },
  { id: 'audit', label: 'Auditoria', icon: 'audit' },
  { id: 'settings', label: 'Configurações', icon: 'settings' },
];

export function App() {
  return (
    <AppProvider>
      <Shell />
      <Toasts />
    </AppProvider>
  );
}

function Shell() {
  const { ready, initialized, unlocked, lockVault, settings } = useApp();
  const [page, setPage] = useState<Page>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-muted">
        <Logo size={32} />
        <span>Carregando Pember…</span>
      </div>
    );
  }
  if (!initialized) return <SetupPage />;
  if (!unlocked) return <UnlockPage />;

  const go = (p: Page) => {
    setPage(p);
    setMenuOpen(false);
  };

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {NAV.map((item) => (
        <button
          key={item.id}
          onClick={() => go(item.id)}
          aria-current={page === item.id ? 'page' : undefined}
          className={`p-focus flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
            page === item.id
              ? 'bg-accent/15 text-accent'
              : 'text-muted hover:bg-panel2 hover:text-ink'
          }`}
        >
          <Icon name={item.icon} size={19} />
          {item.label}
        </button>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-3 px-2">
      <Logo size={34} />
      <div>
        <div className="text-base font-semibold tracking-tight">Pember</div>
        <div className="text-[11px] text-muted">Cofre local e criptografado</div>
      </div>
    </div>
  );

  return (
    <div className={`flex min-h-screen ${settings.reducedMotion ? '' : 'transition-[padding] duration-200'}`}>
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-line bg-panel p-4 lg:flex">
        <div className="flex flex-col gap-8">
          {brand}
          {nav}
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <button
            onClick={lockVault}
            className="p-focus flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted transition hover:bg-panel2 hover:text-ink"
          >
            <Icon name="lock" size={19} />
            Bloquear agora
          </button>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-line bg-panel/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-semibold">Pember</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={lockVault} aria-label="Bloquear cofre" className="p-focus rounded-lg p-2 text-muted hover:text-ink">
            <Icon name="lock" size={18} />
          </button>
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Abrir menu" aria-expanded={menuOpen} className="p-focus rounded-lg p-2 text-muted hover:text-ink">
            <Icon name="menu" size={20} />
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-x-0 top-[57px] z-30 border-b border-line bg-panel p-3 lg:hidden">
          {nav}
        </div>
      )}

      <main className="min-h-screen flex-1 px-4 pb-16 pt-20 lg:ml-64 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-5xl">
          {page === 'dashboard' && <DashboardPage onNavigate={go} />}
          {page === 'vault' && <VaultPage />}
          {page === 'generator' && <GeneratorPage />}
          {page === 'audit' && <AuditPage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}
