/**
 * auth — sessão, bloqueio automático e proteção contra tentativas excessivas.
 */

/** Bloqueio automático por inatividade. `minutes = 0` desativa. */
export class AutoLockTimer {
  private handle: ReturnType<typeof setTimeout> | null = null;
  private minutes: number;

  constructor(
    private readonly onLock: () => void,
    minutes = 5,
  ) {
    this.minutes = Math.max(0, minutes);
    if (this.minutes > 0) this.touch();
  }

  setMinutes(minutes: number): void {
    this.minutes = Math.max(0, minutes);
    this.touch();
  }

  getTimeoutMs(): number | null {
    return this.minutes > 0 ? this.minutes * 60_000 : null;
  }

  /** Reinicia o cronômetro (chamar em qualquer atividade do usuário). */
  touch(): void {
    if (this.handle) clearTimeout(this.handle);
    const ms = this.getTimeoutMs();
    if (ms === null) return;
    this.handle = setTimeout(() => {
      this.handle = null;
      this.onLock();
    }, ms);
  }

  stop(): void {
    if (this.handle) clearTimeout(this.handle);
    this.handle = null;
  }
}

export interface ThrottleOptions {
  /** falhas antes de começar a impor espera (padrão 5) */
  softLimit?: number;
  /** espera inicial após exceder o limite (padrão 1s) */
  baseDelayMs?: number;
  /** espera máxima (padrão 60s) */
  maxDelayMs?: number;
  now?: () => number;
}

/** Proteção contra força bruta: espera exponencial após falhas repetidas. */
export class AttemptThrottle {
  private failures = 0;
  private lockedUntil = 0;
  private readonly softLimit: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly now: () => number;

  constructor(options: ThrottleOptions = {}) {
    this.softLimit = options.softLimit ?? 5;
    this.baseDelayMs = options.baseDelayMs ?? 1_000;
    this.maxDelayMs = options.maxDelayMs ?? 60_000;
    this.now = options.now ?? Date.now;
  }

  get failureCount(): number {
    return this.failures;
  }

  /** Quanto tempo ainda falta para tentar de novo (0 = pode tentar). */
  retryAfterMs(): number {
    return Math.max(0, this.lockedUntil - this.now());
  }

  canAttempt(): boolean {
    return this.retryAfterMs() === 0;
  }

  /** Registra uma falha e retorna a espera imposta (0 = nenhuma). */
  recordFailure(): number {
    this.failures += 1;
    if (this.failures >= this.softLimit) {
      const exponent = this.failures - this.softLimit;
      const delay = Math.min(this.baseDelayMs * 2 ** exponent, this.maxDelayMs);
      this.lockedUntil = this.now() + delay;
      return delay;
    }
    return 0;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.lockedUntil = 0;
  }
}
