import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { App } from '@/app/App';

function abrir(caminho: string): void {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <App />
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
});
