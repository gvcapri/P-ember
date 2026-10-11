// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { webcrypto } from 'node:crypto';

// jsdom pode não expor Web Crypto; garante getRandomValues/subtle nos testes de UI.
const g = globalThis as unknown as { crypto?: Crypto };
if (!g.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
