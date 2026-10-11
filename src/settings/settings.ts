/**
 * settings — preferências não sensíveis persistidas localmente.
 * Nada aqui permite descriptografar o cofre.
 */
import type { GeneratorOptions } from '../password-generator/generator';
import { DEFAULT_OPTIONS } from '../password-generator/generator';
import type { KeyValueStore } from '../storage/db';

export type ThemeSetting = 'dark' | 'light';

export interface AppSettings {
  theme: ThemeSetting;
  /** minutos; 0 = desativado */
  autoLockMinutes: number;
  /** histórico local de senhas geradas (criptografado); desativado por padrão */
  generatorHistoryEnabled: boolean;
  generator: GeneratorOptions;
  reducedMotion: boolean;
  /** KDF usado na criação de novos cofres */
  kdfAlgorithm: 'argon2id' | 'pbkdf2-sha256';
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  autoLockMinutes: 5,
  generatorHistoryEnabled: false,
  generator: DEFAULT_OPTIONS,
  reducedMotion: false,
  kdfAlgorithm: 'argon2id',
};

const SETTINGS_KEY = 'app-settings';

export async function loadSettings(store: KeyValueStore): Promise<AppSettings> {
  const stored = await store.get<Partial<AppSettings>>('settings', SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    generator: { ...DEFAULT_OPTIONS, ...(stored?.generator ?? {}) },
  };
}

export async function saveSettings(store: KeyValueStore, settings: AppSettings): Promise<void> {
  await store.set('settings', SETTINGS_KEY, settings);
}

export function applyTheme(settings: AppSettings): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  document.documentElement.style.colorScheme = settings.theme;
}
