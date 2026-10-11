import { SCORE_LABELS, type StrengthScore } from '../../password-audit/audit';

const COLORS: Record<StrengthScore, string> = {
  0: 'bg-danger',
  1: 'bg-orange-500',
  2: 'bg-yellow-500',
  3: 'bg-accent2',
  4: 'bg-ok',
};

const TEXT: Record<StrengthScore, string> = {
  0: 'text-danger',
  1: 'text-orange-500',
  2: 'text-yellow-500',
  3: 'text-accent2',
  4: 'text-ok',
};

export function StrengthMeter({ score, label = true }: { score: StrengthScore; label?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={4} aria-label="Força da senha">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? COLORS[score] : 'bg-line'}`} />
        ))}
      </div>
      {label && <span className={`text-xs font-medium ${TEXT[score]}`}>{SCORE_LABELS[score]}</span>}
    </div>
  );
}
