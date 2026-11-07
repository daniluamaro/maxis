import { render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { App } from '@/app/App';

function abrir(caminho: string, Aplicacao: () => JSX.Element = App): void {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Aplicacao />
    </MemoryRouter>,
  );
}

describe('rotas', () => {
  it('abre a página de abertura na raiz, com a marca como título', () => {
    abrir('/');

    expect(screen.getByRole('heading', { level: 1, name: 'Maxis' })).toBeInTheDocument();
    expect(document.title).toBe('Maxis');
  });

  it('mostra a 404 com a marca, o endereço pedido e o caminho de volta', () => {
    abrir('/operacoes/gestao/inexistente');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página não encontrada' }),
    ).toBeInTheDocument();
    expect(screen.getByText('/operacoes/gestao/inexistente')).toBeInTheDocument();
    expect(screen.getByText('Maxis')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para o início' })).toHaveAttribute('href', '/');
    expect(document.title).toBe('Página não encontrada | Maxis');
  });

  // A página vem sob demanda; a primeira transformação dela no Vitest passa de 1 s
  it('abre a referência do tema em desenvolvimento', async () => {
    abrir('/dev/tema');

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Referência do tema' },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(document.title).toBe('Referência do tema | Maxis');
  });

  // O build troca `import.meta.env.DEV` por `false`: a rota e o import da página somem do bundle
  it('não tem a referência do tema fora do desenvolvimento', async () => {
    vi.stubEnv('DEV', false);
    vi.resetModules();
    const { App: AppDeProducao } = await import('@/app/App');

    abrir('/dev/tema', AppDeProducao);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página não encontrada' }),
    ).toBeInTheDocument();
  });
});
