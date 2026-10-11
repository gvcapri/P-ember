/** Cópia para a área de transferência com limpeza opcional e fallback. */
let lastCopyToken: number | null = null;

export async function copyText(text: string, clearAfterMs?: number): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    const token = Date.now() + Math.random();
    lastCopyToken = token;
    if (clearAfterMs && clearAfterMs > 0) {
      window.setTimeout(() => {
        if (lastCopyToken === token) {
          lastCopyToken = null;
          void navigator.clipboard?.writeText('').catch(() => undefined);
        }
      }, clearAfterMs);
    }
    return true;
  } catch {
    return false;
  }
}
