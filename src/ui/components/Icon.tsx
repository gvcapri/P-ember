/** Conjunto de ícones SVG inline (stroke), visual consistente e leve. */
import type { SVGProps } from 'react';

export type IconName =
  | 'shield'
  | 'key'
  | 'search'
  | 'plus'
  | 'star'
  | 'copy'
  | 'eye'
  | 'eye-off'
  | 'trash'
  | 'edit'
  | 'lock'
  | 'unlock'
  | 'settings'
  | 'sparkles'
  | 'audit'
  | 'download'
  | 'upload'
  | 'check'
  | 'x'
  | 'menu'
  | 'external'
  | 'grid'
  | 'list'
  | 'chevron-down'
  | 'alert'
  | 'home'
  | 'refresh'
  | 'moon'
  | 'sun';

const PATHS: Record<IconName, string> = {
  shield: 'M12 3l7 3v6c0 4.4-3 8.3-7 9-4-0.7-7-4.6-7-9V6l7-3z',
  key: 'M14.5 10.5a4.5 4.5 0 1 1-4.36-4.5M21 3l-8.5 8.5M16 6l2 2M18.5 3.5l2 2',
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zM21 21l-4.35-4.35',
  plus: 'M12 5v14M5 12h14',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9L12 3.5z',
  copy: 'M9 9h10v12H9zM5 15H4V3h10v1',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'eye-off': 'M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M6.1 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.8-.4 4-1M9.9 5.8A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14 5l4 4',
  lock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4',
  unlock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 5.7-1.3',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  sparkles: 'M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15zM5 15l.7 1.6L7.3 17l-1.6.7L5 19.3l-.7-1.6L2.7 17l1.6-.7L5 15z',
  audit: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  download: 'M12 4v11M7 10l5 5 5-5M4 20h16',
  upload: 'M12 20V9M7 14l5-5 5 5M4 4h16',
  check: 'M4 12.5l5 5L20 6.5',
  x: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M4 6h16M4 12h16M4 18h16',
  'chevron-down': 'M6 9l6 6 6-6',
  alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
  home: 'M4 11l8-7 8 7v9H4v-9zM10 20v-6h4v6',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
};

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name].split('M').filter(Boolean).map((d, i) => (
        <path key={i} d={'M' + d} />
      ))}
    </svg>
  );
}
