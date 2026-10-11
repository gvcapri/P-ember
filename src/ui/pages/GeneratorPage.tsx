import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_OPTIONS,
  estimateEntropyBits,
  generatePassword,
  MAX_LENGTH,
  MIN_LENGTH,
  type GeneratorOptions,
} from '../../password-generator/generator';
import { scorePassword } from '../../password-audit/audit';
import { copyText } from '../clipboard';
import { useApp } from '../AppContext';
import { Icon } from '../components/Icon';
import { StrengthMeter } from '../components/StrengthMeter';

export function GeneratorPage() {
  const { settings, updateSettings, saveHistory, clearHistory, loadHistory, toast } = useApp();
  const [options, setOptions] = useState<GeneratorOptions>(() => settings.generator ?? DEFAULT_OPTIONS);
  const [password, setPassword] = useState(() => generatePassword(options));
  const [history, setHistory] = useState<string[]>([]);
  const [reveal, setReveal] = useState(true);

  const generate = useCallback((opts: GeneratorOptions) => {
    try {
      const pw = generatePassword(opts);
      setPassword(pw);
      return pw;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao gerar.', 'error');
      return null;
    }
  }, [toast]);

  useEffect(() => {
    if (!settings.generatorHistoryEnabled) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    void loadHistory().then((h) => {
      if (!cancelled) setHistory(h);
    });
    return () => {
      cancelled = true;
    };
  }, [settings.generatorHistoryEnabled, loadHistory]);

  const set = <K extends keyof GeneratorOptions>(k: K, v: GeneratorOptions[K]) => {
    const next = { ...options, [k]: v };
    setOptions(next);
    void updateSettings({ generator: next });
  };

  const score = scorePassword(password).score;
  const entropy = estimateEntropyBits(password);

  const copy = async () => {
    const ok = await copyText(password, 60_000);
    toast(ok ? 'Senha copiada (limpa em 60s).' : 'Falha ao copiar.', ok ? 'success' : 'error');
  };

  const checkbox = (label: string, key: keyof Pick<GeneratorOptions, 'uppercase' | 'lowercase' | 'numbers' | 'symbols' | 'excludeAmbiguous'>) => (
    <label className="flex items-center gap-2.5 text-sm text-muted">
      <input
        type="checkbox"
        checked={options[key] as boolean}
        onChange={(e) => set(key, e.target.value as never)}
        className="accent-[var(--p-accent)]"
      />
      {label}
    </label>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gerador de senhas</h1>
        <p className="text-sm text-muted">Aleatoriedade criptográfica (Web Crypto), gerada apenas no seu dispositivo.</p>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-medium text-muted">Modo</span>
          <div className="flex rounded-lg border border-line p-0.5 text-xs">
            {(['random', 'passphrase'] as const).map((m) => (
              <button
                key={m}
                onClick={() => set('mode', m)}
                aria-pressed={options.mode === m}
                className={`p-focus rounded-md px-3 py-1.5 font-medium transition ${
                  options.mode === m ? 'bg-accent text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {m === 'random' ? 'Aleatória' : 'Frase-senha'}
              </button>
            ))}
          </div>
        </div>

        <div
          className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-panel2 p-4"
          onDoubleClick={() => setReveal((v) => !v)}
        >
          <code className={`flex-1 overflow-x-auto font-mono text-base break-all select-all ${reveal ? '' : 'blur-sm select-none'}`}>
            {password}
          </code>
          <button onClick={() => setReveal((v) => !v)} aria-label={reveal ? 'Ocultar' : 'Revelar'} className="p-focus rounded-lg p-2 text-muted hover:text-ink">
            <Icon name={reveal ? 'eye-off' : 'eye'} size={17} />
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-2">
          <StrengthMeter score={score} />
          <span className="text-xs text-muted">Entropia estimada: ~{entropy} bits · comprimento {password.length}</span>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => {
              const pw = generate(options);
              if (pw && settings.generatorHistoryEnabled) {
                const next = [pw, ...history].slice(0, 25);
                setHistory(next);
                void saveHistory(next).catch(() => toast('Não foi possível salvar o histórico.', 'error'));
              }
            }}
            className="p-focus flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent2 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <Icon name="refresh" size={16} />
            Gerar nova senha
          </button>
          <button onClick={() => void copy()} className="p-focus flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted hover:text-ink">
            <Icon name="copy" size={16} />
            Copiar
          </button>
        </div>

        {options.mode === 'random' ? (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium">
              <span className="flex items-center justify-between">
                Comprimento
                <span className="rounded-md bg-panel2 px-2 py-0.5 font-mono text-xs">{options.length}</span>
              </span>
              <input
                type="range"
                min={MIN_LENGTH}
                max={MAX_LENGTH}
                value={options.length}
                onChange={(e) => set('length', Number(e.target.value))}
                aria-label="Comprimento da senha"
                className="p-focus"
              />
              <span className="flex justify-between text-[10px] text-muted">
                <span>{MIN_LENGTH}</span>
                <span>{MAX_LENGTH}</span>
              </span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {checkbox('Incluir letras maiúsculas (A-Z)', 'uppercase')}
              {checkbox('Incluir letras minúsculas (a-z)', 'lowercase')}
              {checkbox('Incluir números (0-9)', 'numbers')}
              {checkbox('Incluir símbolos (!@#$…)', 'symbols')}
              {checkbox('Excluir caracteres ambíguos (0 O l I)', 'excludeAmbiguous')}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium">
              <span className="flex items-center justify-between">
                Palavras
                <span className="rounded-md bg-panel2 px-2 py-0.5 font-mono text-xs">{options.wordCount}</span>
              </span>
              <input type="range" min={3} max={10} value={options.wordCount} onChange={(e) => set('wordCount', Number(e.target.value))} aria-label="Número de palavras" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Separador
              <input
                value={options.separator}
                onChange={(e) => set('separator', e.target.value)}
                maxLength={3}
                className="p-focus w-24 rounded-xl border border-line bg-panel2 px-3.5 py-2 text-sm"
              />
            </label>
          </div>
        )}
      </div>

      {settings.generatorHistoryEnabled && (
        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Histórico local (criptografado)</h2>
            <button
              onClick={async () => {
                await clearHistory();
                setHistory([]);
                toast('Histórico limpo.', 'info');
              }}
              className="p-focus text-xs text-muted hover:text-danger"
            >
              Limpar histórico
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma senha gerada registrada. O histórico fica criptografado no cofre.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-panel2 px-3 py-2 font-mono text-xs">
                  <span className="truncate">{h}</span>
                  <button onClick={() => void copyText(h).then((ok) => toast(ok ? 'Copiada.' : 'Falha.', ok ? 'success' : 'error'))} aria-label="Copiar" className="p-focus text-muted hover:text-ink">
                    <Icon name="copy" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
