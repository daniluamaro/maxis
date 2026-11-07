import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

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

  // O navegador entrega o caminho codificado; a pessoa digitou acentos
  it('mostra o endereço pedido legível, com acentos', () => {
    abrir('/opera%C3%A7%C3%B5es/gest%C3%A3o');

    expect(screen.getByText('/operações/gestão')).toBeInTheDocument();
  });

  it('mostra como veio o endereço que não decodifica', () => {
    abrir('/relatorio%E0%A4%A');

    expect(screen.getByText('/relatorio%E0%A4%A')).toBeInTheDocument();
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
    // Roteador e App do mesmo carregamento: o contexto do roteador é o mesmo dos dois lados
    const [{ App: AppDeProducao }, { MemoryRouter: RoteadorDeProducao }] = await Promise.all([
      import('@/app/App'),
      import('react-router'),
    ]);

    render(
      <RoteadorDeProducao initialEntries={['/dev/tema']}>
        <AppDeProducao />
      </RoteadorDeProducao>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Página não encontrada' }),
    ).toBeInTheDocument();
  });
});
