import { describe, expect, it } from 'vitest';

import { auditCredentials, scorePassword } from './audit';
import type { Credential } from '../types';

const cred = (over: Partial<Credential> & { password: string }): Credential => ({
  id: over.id ?? crypto.randomUUID(),
  service: over.service ?? 'servico',
  username: over.username ?? 'user@mail.com',
  password: over.password,
  url: over.url ?? '',
  category: over.category ?? 'pessoal',
  notes: over.notes ?? '',
  favorite: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('scorePassword', () => {
  it('classifica senhas muito curtas como fracas', () => {
    expect(scorePassword('abc').score).toBeLessThanOrEqual(1);
    expect(scorePassword('abc').issues.length).toBeGreaterThan(0);
  });

  it('detecta senhas comuns', () => {
    const r = scorePassword('password');
    expect(r.issues.some((i) => i.toLowerCase().includes('senhas comuns'))).toBe(true);
    expect(r.score).toBe(0);
  });

  it('detecta sequências e padrões de teclado', () => {
    expect(scorePassword('abcdefghij123!').issues.some((i) => i.includes('sequência'))).toBe(true);
    expect(scorePassword('qwertyuiop123!').issues.some((i) => i.includes('teclado'))).toBe(true);
  });

  it('detecta repetições', () => {
    expect(scorePassword('aaaBBB111!!!xyz').issues.some((i) => i.includes('repetidos'))).toBe(true);
  });

  it('detecta padrões de data', () => {
    expect(scorePassword('Feriado2024!ab').issues.some((i) => i.includes('data'))).toBe(true);
  });

  it('pontua senhas longas e diversificadas como fortes', () => {
    const r = scorePassword('9$kQv2mZ!pLx7Rw#Tn');
    expect(r.score).toBeGreaterThanOrEqual(3);
    expect(r.issues).toHaveLength(0);
  });

  it('não olha apenas comprimento: senha longa previsível continua fraca', () => {
    const r = scorePassword('aaaaaaaaaaaaaaaaaaaaaa');
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it('fornece recomendações para senhas fracas', () => {
    const r = scorePassword('abc');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

describe('auditCredentials', () => {
  it('detecta reutilização entre serviços', () => {
    const report = auditCredentials([
      cred({ id: '1', service: 'github', password: 'mesmaSenha!2024x' }),
      cred({ id: '2', service: 'google', password: 'mesmaSenha!2024x' }),
      cred({ id: '3', service: 'amazon', password: 'outra#Fraca9' }),
    ]);
    expect(report.reusedGroups).toHaveLength(1);
    expect(report.reusedCount).toBe(2);
    const finding = report.findings.find((f) => f.credential.id === '1')!;
    expect(finding.reused).toBe(true);
    expect(finding.reusedWith).toContain('google');
    expect(report.recommendations.some((r) => r.toLowerCase().includes('reutilização'))).toBe(true);
  });

  it('conta senhas fracas', () => {
    const report = auditCredentials([
      cred({ id: '1', service: 'a', password: '123456' }),
      cred({ id: '2', service: 'b', password: '9$kQv2mZ!pLx7Rw#Tn' }),
    ]);
    expect(report.weakCount).toBe(1);
    expect(report.overallScore).toBeLessThan(4);
  });

  it('cofre vazio tem pontuação zero e recomendação padrão', () => {
    const report = auditCredentials([]);
    expect(report.overallScore).toBe(0);
    expect(report.recommendations).toHaveLength(1);
  });

  it('cofre saudável tem pontuação alta', () => {
    const report = auditCredentials([
      cred({ id: '1', service: 'a', password: '9$kQv2mZ!pLx7Rw#Tn' }),
      cred({ id: '2', service: 'b', password: 'Hw7&mXq2Vb!Zn4Pk' }),
    ]);
    expect(report.weakCount).toBe(0);
    expect(report.reusedCount).toBe(0);
    expect(report.overallScore).toBe(4);
  });
});
