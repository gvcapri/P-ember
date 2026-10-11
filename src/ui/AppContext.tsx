import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { AutoLockTimer } from '../auth/session';
import { openStore, type KeyValueStore } from '../storage/db';
import { applyTheme, loadSettings, saveSettings, type AppSettings } from '../settings/settings';
import { VaultService } from '../vault/vaultService';
import type { Credential, CredentialInput } from '../types';

type ToastKind = 'info' | 'success' | 'error';
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface AppContextValue {
  ready: boolean;
  initialized: boolean;
  unlocked: boolean;
  credentials: Credential[];
  settings: AppSettings;
  busy: boolean;
  toasts: Toast[];
  toast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
  createVault: (password: string) => Promise<void>;
  unlockVault: (password: string) => Promise<void>;
  lockVault: () => void;
  addCredential: (input: CredentialInput) => Promise<void>;
  updateCredential: (id: string, patch: Partial<CredentialInput>) => Promise<void>;
  removeCredential: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  replaceAllCredentials: (list: CredentialInput[]) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  destroyVault: () => Promise<void>;
  reauthenticate: (password: string) => Promise<boolean>;
  saveHistory: (passwords: string[]) => Promise<void>;
  clearHistory: () => Promise<void>;
  loadHistory: () => Promise<string[]>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>.');
  return ctx;
}

let toastSeq = 0;

export function AppProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<KeyValueStore | null>(null);
  const vaultRef = useRef<VaultService | null>(null);
  const timerRef = useRef<AutoLockTimer | null>(null);

  const [ready, setReady] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [settings, setSettings] = useState<AppSettings>(settingsDefaults());
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // bootstrap
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const store = await openStore();
      const loaded = await loadSettings(store);
      if (cancelled) return;
      storeRef.current = store;
      vaultRef.current = new VaultService(store);
      setSettings(loaded);
      applyTheme(loaded);
      setInitialized(await vaultRef.current.isInitialized());
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lockVault = useCallback(() => {
    vaultRef.current?.lock();
    setCredentials([]);
    setUnlocked(false);
    timerRef.current?.stop();
  }, []);

  // auto-lock por inatividade
  useEffect(() => {
    if (!unlocked) return;
    const timer = new AutoLockTimer(() => {
      lockVault();
      toast('Cofre bloqueado por inatividade.', 'info');
    }, settings.autoLockMinutes);
    timerRef.current = timer;
    const activities = ['pointerdown', 'keydown', 'wheel'] as const;
    const onTouch = () => timer.touch();
    for (const ev of activities) window.addEventListener(ev, onTouch, { passive: true });
    return () => {
      for (const ev of activities) window.removeEventListener(ev, onTouch);
      timer.stop();
      timerRef.current = null;
    };
  }, [unlocked, settings.autoLockMinutes, lockVault, toast]);

  const wrap = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }, []);

  const createVault = useCallback(
    (password: string) =>
      wrap(async () => {
        const vault = vaultRef.current;
        if (!vault) throw new Error('Armazenamento não inicializado.');
        await vault.createVault(password, settings.kdfAlgorithm);
        setInitialized(true);
        setUnlocked(true);
        setCredentials(vault.list());
        toast('Cofre criado com sucesso.', 'success');
      }),
    [wrap, settings.kdfAlgorithm, toast],
  );

  const unlockVault = useCallback(
    (password: string) =>
      wrap(async () => {
        const vault = vaultRef.current;
        if (!vault) throw new Error('Armazenamento não inicializado.');
        await vault.unlock(password);
        setUnlocked(true);
        setCredentials(vault.list());
      }),
    [wrap],
  );

  const addCredential = useCallback(
    (input: CredentialInput) =>
      wrap(async () => {
        const c = await vaultRef.current!.add(input);
        setCredentials(vaultRef.current!.list());
        toast(`"${c.service}" adicionado ao cofre.`, 'success');
      }),
    [wrap, toast],
  );

  const updateCredential = useCallback(
    (id: string, patch: Partial<CredentialInput>) =>
      wrap(async () => {
        await vaultRef.current!.update(id, patch);
        setCredentials(vaultRef.current!.list());
      }),
    [wrap],
  );

  const removeCredential = useCallback(
    (id: string) =>
      wrap(async () => {
        await vaultRef.current!.remove(id);
        setCredentials(vaultRef.current!.list());
        toast('Credencial excluída.', 'info');
      }),
    [wrap, toast],
  );

  const toggleFavorite = useCallback(
    (id: string) =>
      wrap(async () => {
        const c = vaultRef.current!.list().find((x) => x.id === id);
        if (!c) return;
        await vaultRef.current!.update(id, { favorite: !c.favorite });
        setCredentials(vaultRef.current!.list());
      }),
    [wrap],
  );

  const replaceAllCredentials = useCallback(
    (list: CredentialInput[]) =>
      wrap(async () => {
        await vaultRef.current!.replaceAll(list);
        setCredentials(vaultRef.current!.list());
      }),
    [wrap],
  );

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) =>
      wrap(async () => {
        const next = { ...settings, ...patch };
        setSettings(next);
        applyTheme(next);
        if (storeRef.current) await saveSettings(storeRef.current, next);
      }),
    [wrap, settings],
  );

  const destroyVault = useCallback(
    () =>
      wrap(async () => {
        await vaultRef.current!.destroy();
        setCredentials([]);
        setUnlocked(false);
        setInitialized(false);
        timerRef.current?.stop();
        toast('Cofre excluído. Todos os dados locais foram removidos.', 'info');
      }),
    [wrap, toast],
  );

  const reauthenticate = useCallback(
    (password: string) => wrap(() => vaultRef.current!.verifyMasterPassword(password)),
    [wrap],
  );

  const saveHistory = useCallback(
    (passwords: string[]) => wrap(() => vaultRef.current!.saveGeneratorHistory(passwords)),
    [wrap],
  );

  const clearHistory = useCallback(
    () => wrap(() => vaultRef.current!.clearGeneratorHistory()),
    [wrap],
  );

  const loadHistory = useCallback(
    () => wrap(() => vaultRef.current!.getGeneratorHistory()),
    [wrap],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      initialized,
      unlocked,
      credentials,
      settings,
      busy,
      toasts,
      toast,
      dismissToast,
      createVault,
      unlockVault,
      lockVault,
      addCredential,
      updateCredential,
      removeCredential,
      toggleFavorite,
      replaceAllCredentials,
      updateSettings,
      destroyVault,
      reauthenticate,
      saveHistory,
      clearHistory,
      loadHistory,
    }),
    [
      ready, initialized, unlocked, credentials, settings, busy, toasts, toast, dismissToast,
      createVault, unlockVault, lockVault, addCredential, updateCredential, removeCredential,
      toggleFavorite, replaceAllCredentials, updateSettings, destroyVault, reauthenticate, saveHistory, clearHistory, loadHistory,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function settingsDefaults(): AppSettings {
  return {
    theme: 'dark',
    autoLockMinutes: 5,
    generatorHistoryEnabled: false,
    generator: {
      length: 20,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: false,
      mode: 'random',
      wordCount: 4,
      separator: '-',
    },
    reducedMotion: false,
    kdfAlgorithm: 'argon2id',
  };
}
