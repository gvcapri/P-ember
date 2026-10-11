import { useMemo, useState } from 'react';

import { auditCredentials, SCORE_LABELS, type CredentialFinding } from '../../password-audit/audit';
import { useApp } from '../AppContext';
import { Icon } from '../components/Icon';
import { StrengthMeter } from '../components/StrengthMeter';

export function AuditPage() {
  const { credentials } = useApp();
  const [revealPasswords, setRevealPasswords] = useState(false);
  const report = useMemo(() => auditCredentials(credentials), [credentials]);

  const problems = report.findings.filter((f) => f.weak || f.reused);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoria de senhas</h1>
          <p className="text-sm text-muted">
            Análise 100% local — nenhuma senha sai deste dispositivo.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={revealPasswords} onChange={(e) => setRevealPasswords(e.target.checked)} className="accent-[var(--p-accent)]" />
          Mostrar senhas (atenção)
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="text-2xl font-semibold">{credentials.length}</div>
          <div className="text-xs text-muted">credenciais analisadas</div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className={`text-2xl font-semibold ${report.weakCount > 0 ? 'text-danger' : 'text-ok'}`}>{report.weakCount}</div>
          <div className="text-xs text-muted">senhas fracas</div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className={`text-2xl font-semibold ${report.reusedCount > 0 ? 'text-danger' : 'text-ok'}`}>{report.reusedCount}</div>
          <div className="text-xs text-muted">senhas reutilizadas</div>
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-sm font-semibold">Recomendações</h2>
        <ul className="flex flex-col gap-2">
          {report.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted">
              <Icon name="alert" size={15} className="mt-0.5 shrink-0 text-accent2" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      {report.reusedGroups.length > 0 && (
        <section className="rounded-2xl border border-danger/40 bg-danger/5 p-5">
          <h2 className="mb-3 text-sm font-semibold text-danger">Senhas reutilizadas entre serviços</h2>
          <ul className="flex flex-col gap-3">
            {report.reusedGroups.map((g, i) => (
              <li key={i} className="rounded-xl border border-line bg-panel p-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <code className="font-mono text-sm select-all">
                    {revealPasswords ? g.password : '•'.repeat(Math.min(16, g.password.length))}
                  </code>
                  <span className="text-xs text-muted">{g.credentials.length} serviços</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.credentials.map((c) => (
                    <span key={c.id} className="rounded-full bg-panel2 px-2.5 py-1 text-xs text-muted">
                      {c.service}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-danger">
                  Recomendação: crie uma senha única para cada serviço (use o Gerador).
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold">Detalhamento por credencial</h2>
        {problems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line p-10 text-center text-muted">
            <Icon name="check" size={30} className="text-ok" />
            <p>Nenhuma credencial precisa de atenção no momento.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {problems.map((f) => (
              <FindingRow key={f.credential.id} finding={f} reveal={revealPasswords} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FindingRow({ finding, reveal }: { finding: CredentialFinding; reveal: boolean }) {
  const { credential, score, reused, reusedWith } = finding;
  return (
    <li className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">{credential.service}</div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{credential.username || '—'}</span>
          <span className={`rounded-full px-2 py-0.5 ${score.score <= 1 ? 'bg-danger/15 text-danger' : 'bg-panel2'}`}>
            {SCORE_LABELS[score.score]}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <StrengthMeter score={score.score} />
      </div>

      <code className="mb-3 block rounded-lg bg-panel2 px-3 py-1.5 font-mono text-xs select-all">
        {reveal ? credential.password : '•'.repeat(Math.min(16, credential.password.length))}
      </code>

      <ul className="flex flex-col gap-1">
        {score.issues.map((issue, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-danger">
            <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
            {issue}
          </li>
        ))}
        {reused && (
          <li className="flex items-start gap-2 text-xs text-orange-400">
            <Icon name="refresh" size={13} className="mt-0.5 shrink-0" />
            Mesma senha usada em: {reusedWith.join(', ')}
          </li>
        )}
        {score.suggestions.map((s, i) => (
          <li key={`s${i}`} className="flex items-start gap-2 text-xs text-muted">
            <Icon name="check" size={13} className="mt-0.5 shrink-0 text-accent2" />
            {s}
          </li>
        ))}
      </ul>
    </li>
  );
}
