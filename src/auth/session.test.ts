import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { validateMasterPassword, MIN_MASTER_PASSWORD_LENGTH } from './passwordPolicy';
import { AttemptThrottle, AutoLockTimer } from './session';

describe('AutoLockTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('bloqueia após o período de inatividade', () => {
    const onLock = vi.fn();
    const timer = new AutoLockTimer(onLock, 1);
    timer.touch();
    vi.advanceTimersByTime(59_000);
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2_000);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('atividade reinicia o cronômetro', () => {
    const onLock = vi.fn();
    const timer = new AutoLockTimer(onLock, 1);
    timer.touch();
    vi.advanceTimersByTime(50_000);
    timer.touch(); // atividade do usuário
    vi.advanceTimersByTime(50_000);
    expect(onLock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(11_000);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('minutos = 0 desativa o bloqueio automático', () => {
    const onLock = vi.fn();
    const timer = new AutoLockTimer(onLock, 0);
    expect(timer.getTimeoutMs()).toBeNull();
    timer.touch();
    vi.advanceTimersByTime(10 * 60_000);
    expect(onLock).not.toHaveBeenCalled();
    timer.stop();
  });

  it('setMinutes reconfigura em runtime', () => {
    const onLock = vi.fn();
    const timer = new AutoLockTimer(onLock, 0);
    timer.setMinutes(2);
    vi.advanceTimersByTime(120_001);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it('stop cancela o bloqueio pendente', () => {
    const onLock = vi.fn();
    const timer = new AutoLockTimer(onLock, 1);
    timer.stop();
    vi.advanceTimersByTime(5 * 60_000);
    expect(onLock).not.toHaveBeenCalled();
  });
});

describe('AttemptThrottle', () => {
  it('permite tentativas livres até o limite', () => {
    let now = 1_000;
    const t = new AttemptThrottle({ now: () => now, baseDelayMs: 100, maxDelayMs: 800 });
    expect(t.canAttempt()).toBe(true);
    for (let i = 0; i < 4; i++) {
      expect(t.recordFailure()).toBe(0);
      expect(t.canAttempt()).toBe(true);
    }
  });

  it('impõe espera exponencial após falhas repetidas', () => {
    let now = 1_000;
    const t = new AttemptThrottle({ now: () => now, baseDelayMs: 100, maxDelayMs: 800 });
    expect(t.recordFailure()).toBe(0); // 1
    expect(t.recordFailure()).toBe(0); // 2
    expect(t.recordFailure()).toBe(0); // 3
    expect(t.recordFailure()).toBe(0); // 4
    expect(t.recordFailure()).toBe(100); // 5 → 100ms
    expect(t.canAttempt()).toBe(false);
    expect(t.retryAfterMs()).toBe(100);
    now += 50;
    expect(t.retryAfterMs()).toBe(50);
    now += 60;
    expect(t.canAttempt()).toBe(true);
    expect(t.recordFailure()).toBe(200); // 6 → 200ms
    expect(t.recordFailure()).toBe(400); // 7 → 400ms
    expect(t.recordFailure()).toBe(800); // 8 → 800ms (cap)
    expect(t.recordFailure()).toBe(800); // 9 → cap
  });

  it('sucesso zera o contador', () => {
    let now = 0;
    const t = new AttemptThrottle({ now: () => now });
    t.recordFailure();
    t.recordFailure();
    t.recordSuccess();
    expect(t.failureCount).toBe(0);
    expect(t.canAttempt()).toBe(true);
  });
});

describe('validateMasterPassword', () => {
  it('exige comprimento mínimo', () => {
    const r = validateMasterPassword('curta');
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes(String(MIN_MASTER_PASSWORD_LENGTH)))).toBe(true);
  });

  it('rejeita senhas comuns e repetitivas', () => {
    expect(validateMasterPassword('senha123').ok).toBe(false);
    expect(validateMasterPassword('aaaaaaaaaaaa').ok).toBe(false);
  });

  it('aceita senha forte', () => {
    expect(validateMasterPassword('C0fRe!Pember#2026').ok).toBe(true);
  });
});
