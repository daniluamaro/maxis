import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GRUPOS_DE_CORES } from '@/app/referencia/catalogo';
import { ReferenciaDoTema } from '@/app/referencia/ReferenciaDoTema';
import tokensCss from '@/theme/tokens.css?raw';

function secao(nome: string): HTMLElement {
  return screen.getByRole('region', { name: nome });
}

describe('ReferenciaDoTema', () => {
  // O valor esperado vem do texto do tokens.css, não do mesmo leitor que a página usa
  it('mostra cada cor com o nome do token e o valor do tokens.css', () => {
    render(<ReferenciaDoTema />);
    const cores = secao('Cores');

    for (const { token } of GRUPOS_DE_CORES.flatMap((grupo) => grupo.cores)) {
      const valor = new RegExp(`^\\s*${token}:\\s*(#[0-9a-f]{6});`, 'm').exec(tokensCss)?.[1];
      const amostra = within(cores).getByText(token).closest('li');

      expect(valor).toBeDefined();
      expect(amostra).toHaveTextContent(valor ?? '');
    }
  });

  // A página existe para conferir os tokens: o que falta aparece marcado, sem derrubar a tela
  it('aponta o token ausente em vez de quebrar', () => {
    document.getElementById('tokens-css')?.remove();

    render(<ReferenciaDoTema />);

    const ausentes = within(secao('Cores')).getAllByText('Token ausente');
    expect(ausentes.length).toBeGreaterThan(0);
    expect(within(secao('Tipografia')).getAllByText('Token ausente').length).toBeGreaterThan(0);
  });

  it('mostra a escala tipográfica com o tamanho de cada passo em px', () => {
    render(<ReferenciaDoTema />);
    const tipografia = secao('Tipografia');

    for (const tamanho of ['10,5 px', '11,5 px', '12,5 px', '13,5 px', '17 px', '22 px', '25 px']) {
      expect(within(tipografia).getByText(tamanho)).toBeInTheDocument();
    }
  });

  // Espaço comum na busca: o Testing Library normaliza o espaço inseparável do texto da página
  it('mostra números, moeda, percentual e datas pelos formatadores pt-BR', () => {
    render(<ReferenciaDoTema />);
    const numeros = secao('Números');

    for (const saida of ['R$ 1.284.530,90', '1.248', '94,3%', '07/11/2026', '07/11 14:30', '—']) {
      expect(within(numeros).getAllByText(saida).length).toBeGreaterThan(0);
    }
  });

  it('mostra o gráfico de exemplo com a tabela equivalente', () => {
    render(<ReferenciaDoTema />);

    expect(
      within(secao('Gráfico')).getByRole('table', { name: 'Fretes da semana' }),
    ).toBeInTheDocument();
  });

  it('abre o diálogo de exemplo', async () => {
    render(<ReferenciaDoTema />);

    fireEvent.click(screen.getByRole('button', { name: 'Descartar alterações' }));

    expect(
      await screen.findByRole('dialog', { name: 'Descartar as alterações?' }),
    ).toBeInTheDocument();
  });

  it('confirma com o mesmo verbo do botão', async () => {
    render(<ReferenciaDoTema />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Alterações salvas')).toBeInTheDocument();
  });

  it('liga a mensagem de erro ao campo inválido', () => {
    render(<ReferenciaDoTema />);

    const campo = screen.getByLabelText('E-mail');

    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription(
      'Informe um e-mail válido, como nome@empresa.com.br.',
    );
  });
});
