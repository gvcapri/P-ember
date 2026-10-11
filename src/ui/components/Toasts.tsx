import { useApp } from '../AppContext';
import { Icon } from './Icon';

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={`animate-fade pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-lg backdrop-blur ${
            t.kind === 'error'
              ? 'border-danger/40 bg-panel text-danger'
              : t.kind === 'success'
                ? 'border-ok/40 bg-panel text-ok'
                : 'border-line bg-panel text-ink'
          }`}
        >
          <Icon name={t.kind === 'error' ? 'alert' : t.kind === 'success' ? 'check' : 'shield'} size={16} />
          {t.message}
        </button>
      ))}
    </div>
  );
}
