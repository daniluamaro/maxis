import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GraficoCartesiano } from '@/components/charts/GraficoCartesiano';
import type { GraficoCartesianoProps } from '@/components/charts/GraficoCartesiano';

const FRETES: GraficoCartesianoProps = {
  titulo: 'Faturamento de frete por dia',
  rotuloDaCategoria: 'Dia',
  categorias: ['2026-11-02', '2026-11-03', '2026-11-04'],
  tipoCategoria: 'data',
  formato: 'moeda',
  series: [
    { nome: 'Realizado', tipo: 'barra', valores: [41250.5, 48320, null] },
    { nome: 'Meta', tipo: 'linha', valores: [45000, 45000, 45000] },
  ],
};

// O desenho não chega ao leitor de tela; quem chega é a tabela com os mesmos valores
describe('GraficoCartesiano', () => {
  it('tem uma tabela equivalente, nomeada pelo título', () => {
    render(<GraficoCartesiano {...FRETES} />);

    expect(screen.getByRole('table', { name: 'Faturamento de frete por dia' })).toBeInTheDocument();
  });

  it('a tabela tem uma coluna para a categoria e uma por série', () => {
    render(<GraficoCartesiano {...FRETES} />);
    const tabela = within(screen.getByRole('table'));

    expect(tabela.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Dia',
      'Realizado',
      'Meta',
    ]);
  });

  // O Testing Library normaliza o espaço inseparável do texto para espaço comum
  it('a tabela mostra categoria e valores pelos formatadores, com — no valor ausente', () => {
    render(<GraficoCartesiano {...FRETES} />);
    const linhas = within(screen.getByRole('table')).getAllByRole('row').slice(1);

    expect(
      linhas.map((linha) =>
        [...linha.querySelectorAll('th, td')].map((celula) =>
          celula.textContent.replace(/\s/g, ' '),
        ),
      ),
    ).toEqual([
      ['02/11/2026', 'R$ 41.250,50', 'R$ 45.000,00'],
      ['03/11/2026', 'R$ 48.320,00', 'R$ 45.000,00'],
      ['04/11/2026', '—', 'R$ 45.000,00'],
    ]);
  });

  // Nome vem do banco e pode repetir (duas unidades homônimas): a posição é a identidade
  it('categorias e séries de nome repetido saem todas, sem chave duplicada', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <GraficoCartesiano
        {...FRETES}
        categorias={['2026-11-02', '2026-11-02']}
        series={[
          { nome: 'Meta', tipo: 'barra', valores: [1, 2] },
          { nome: 'Meta', tipo: 'linha', valores: [3, 4] },
        ]}
      />,
    );

    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    expect(
      within(screen.getByRole('list', { name: 'Legenda' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(erro).not.toHaveBeenCalled();
  });

  it('mostra a legenda com duas séries ou mais', () => {
    render(<GraficoCartesiano {...FRETES} />);
    const legenda = within(screen.getByRole('list', { name: 'Legenda' }));

    expect(legenda.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Realizado',
      'Meta',
    ]);
  });

  // Uma série só: o título já diz o que é; a legenda repetiria
  it('não mostra legenda com uma série só', () => {
    render(<GraficoCartesiano {...FRETES} series={FRETES.series.slice(0, 1)} />);

    expect(screen.queryByRole('list', { name: 'Legenda' })).toBeNull();
  });

  it('a legenda marca cada série com a cor do token dela', () => {
    render(<GraficoCartesiano {...FRETES} />);
    const legenda = within(screen.getByRole('list', { name: 'Legenda' }));

    expect(legenda.getByText('Realizado').previousElementSibling).toHaveClass('bg-navy');
    expect(legenda.getByText('Meta').previousElementSibling).toHaveClass('bg-gold');
  });

  // O ECharts vem num pedaço à parte do bundle: até chegar, um skeleton guarda o lugar
  it('mostra um skeleton da altura do gráfico enquanto o desenho carrega', () => {
    const { container } = render(<GraficoCartesiano {...FRETES} altura={240} />);

    expect(container.querySelector('[data-slot="skeleton"]')).toHaveStyle({ height: '240px' });
  });

  it('o desenho entra no lugar do skeleton, fora da árvore de acessibilidade', async () => {
    const { container } = render(<GraficoCartesiano {...FRETES} />);

    // Na primeira carga o Vitest transforma o ECharts inteiro (passa de 1 s, o limite padrão,
    // quando os outros arquivos rodam em paralelo)
    await waitFor(
      () => {
        expect(container.querySelector('.echarts-for-react')).toHaveAttribute(
          'aria-hidden',
          'true',
        );
      },
      { timeout: 5000 },
    );
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  });
});
