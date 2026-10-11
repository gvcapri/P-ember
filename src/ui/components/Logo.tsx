import { useState } from 'react';

/**
 * Marca do Pember. Usa o icone.png (imagem fornecida pelo usuário) e,
 * caso o arquivo não carregue, cai para o "P" original em SVG.
 */
export function Logo({ size = 40 }: { size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src="/icon-192.png"
        width={size}
        height={size}
        alt="Pember"
        role="img"
        onError={() => setFailed(true)}
        style={{ borderRadius: Math.round(size * 0.25), objectFit: 'cover', display: 'block' }}
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Pember" role="img">
      <defs>
        <linearGradient id="pember-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--p-accent)" />
          <stop offset="1" stopColor="var(--p-accent2)" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#pember-grad)" />
      <path
        d="M23 46V18h12.5c6.4 0 10.5 3.9 10.5 9.6S41.9 37 35.5 37H29v9h-6zm6-15h6c3 0 4.8-1.6 4.8-4.2S38 22.5 35 22.5h-6V31z"
        fill="#fff"
      />
    </svg>
  );
}
