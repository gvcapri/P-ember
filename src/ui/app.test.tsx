// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../App';

vi.setConfig({ testTimeout: 120_000 });

const MASTER = 'CofreForte!Pember2026';

afterEach(() => cleanup());

const type = async (label: RegExp | string, value: string) => {
  const el = await screen.findByLabelText(label);
  await userEvent.type(el, value);
};

describe('Pember — fluxo completo pela interface', () => {
  it('cria cofre, adiciona credencial, pesquisa, bloqueia e desbloqueia', async () => {
    const user = userEvent.setup();
    render(<App />);

    // --- Etapa 1: criação do cofre ---
    expect(await screen.findByText(/Crie seu cofre Pember/i)).toBeInTheDocument();
    await type('Senha mestra', MASTER);
    await type('Confirmar senha mestra', MASTER);
    const ack = screen.getByRole('checkbox');
    await user.click(ack);
    await user.click(screen.getByRole('button', { name: /Criar cofre e entrar/i }));

    // --- Dashboard ---
    expect(await screen.findByText(/Segurança do cofre/i, {}, { timeout: 30_000 })).toBeInTheDocument();
    expect(screen.getByText('Credenciais')).toBeInTheDocument();

    // --- Etapa 2: adicionar credencial ---
    await user.click(screen.getByRole('button', { name: /Adicionar senha/i }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Serviço/i), 'Minha Rede Social');
    await user.type(within(dialog).getByLabelText(/Usuário/i), 'joao@exemplo.com');
    await user.type(within(dialog).getByLabelText(/^Senha/i), 'Sup3r$enha#Lista9');
    await user.click(within(dialog).getByRole('button', { name: /Adicionar ao cofre/i }));

    // --- Tela do cofre ---
    const nav = screen.getByRole('navigation', { name: /Navegação principal/i });
    await user.click(within(nav).getByRole('button', { name: 'Cofre' }));
    expect(await screen.findByText('Minha Rede Social')).toBeInTheDocument();

    // --- Pesquisa ---
    const search = await screen.findByLabelText(/Pesquisar credenciais/i);
    await user.type(search, 'minha rede');
    expect(await screen.findByText('Minha Rede Social')).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'nao-existe-xyz');
    expect(await screen.findByText(/Nenhuma credencial corresponde/i)).toBeInTheDocument();

    // --- Bloqueio manual ---
    await user.click(screen.getByRole('button', { name: /Bloquear agora/i }));
    expect(await screen.findByText(/Cofre bloqueado/i)).toBeInTheDocument();

    // --- Tentativa errada é rejeitada ---
    await type('Senha mestra', 'senha-absolutamente-errada');
    await user.click(screen.getByRole('button', { name: /Desbloquear/i }));
    expect(await screen.findByText(/Senha mestra incorreta/i)).toBeInTheDocument();

    // --- Desbloqueio correto restaura os dados (volta para a última tela) ---
    await type('Senha mestra', MASTER);
    await user.click(screen.getByRole('button', { name: /Desbloquear/i }));
    expect(await screen.findByText('Minha Rede Social', {}, { timeout: 30_000 })).toBeInTheDocument();
  });

  it('mostra o gerador com senha e força', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText(/Crie seu cofre Pember/i)).toBeInTheDocument();
    await type('Senha mestra', MASTER);
    await type('Confirmar senha mestra', MASTER);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /Criar cofre e entrar/i }));
    expect(await screen.findByText(/Segurança do cofre/i, {}, { timeout: 30_000 })).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: /Navegação principal/i });
    await user.click(within(nav).getByRole('button', { name: 'Gerador' }));
    expect(await screen.findByText(/Gerador de senhas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Comprimento/i)).toBeInTheDocument();

    const before = document.querySelector('code')?.textContent ?? '';
    await user.click(screen.getByRole('button', { name: /Gerar nova senha/i }));
    const after = document.querySelector('code')?.textContent ?? '';
    expect(after).not.toBe(before);
    expect(after.length).toBeGreaterThanOrEqual(8);
  });
});
