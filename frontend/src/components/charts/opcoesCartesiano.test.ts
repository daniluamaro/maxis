import { within } from '@testing-library/react';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { echarts } from '@/components/charts/echarts';
import { montarOpcoesCartesiano } from '@/components/charts/opcoesCartesiano';
import type { DadosCartesianos } from '@/components/charts/opcoesCartesiano';
import { criarTemaECharts, lerTokensDoGrafico } from '@/theme/echarts';

const NBSP = ' ';

// Exemplo do STEP 0.8 (fictício): barras e linha na mesma unidade, num eixo só
const FRETES: DadosCartesianos = {
  categorias: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'],
  tipoCategoria: 'data',
  formato: 'moeda',
  series: [
    { nome: 'Realizado', tipo: 'barra', valores: [41250.5, 48320, null, 39870.25, 52110] },
    { nome: 'Meta', tipo: 'linha', valores: [45000, 45000, 45000, 45000, 45000] },
  ],
};

beforeEach(() => {
  // O jsdom não tem canvas: sem contexto 2D, o zrender estima a largura do texto
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

type Renderizado = { grafico: ReturnType<typeof echarts.init>; elemento: HTMLDivElement };

function renderizar(dados: DadosCartesianos): Renderizado {
  const elemento = document.createElement('div');
  document.body.append(elemento);
  const tokens = lerTokensDoGrafico();
  const grafico = echarts.init(elemento, criarTemaECharts(tokens), {
    renderer: 'svg',
    width: 640,
    height: 320,
  });
  grafico.setOption(montarOpcoesCartesiano(dados, tokens));
  onTestFinished(() => {
    grafico.dispose();
    elemento.remove();
  });
  return { grafico, elemento };
}

function textosDoSvg(elemento: HTMLElement): string[] {
  return [...elemento.querySelectorAll('svg text')].map((texto) => texto.textContent);
}

// A dica é o HTML que o ECharts põe ao lado do desenho (o SVG, onde também estão as legendas).
// Sobre um ponto sem dado o ECharts não abre dica: aponta-se uma série que tenha valor ali.
function mostrarDica(
  { grafico, elemento }: Renderizado,
  dataIndex: number,
  seriesIndex = 0,
): HTMLElement {
  grafico.dispatchAction({ type: 'showTip', seriesIndex, dataIndex });
  const dica = [...elemento.children].find((filho) => filho.querySelector('svg') === null);
  if (!(dica instanceof HTMLElement)) {
    throw new Error('Dica não exibida.');
  }
  return dica;
}

describe('eixo de categoria', () => {
  it('data do banco sai em dd/mm/aaaa', () => {
    const { elemento } = renderizar(FRETES);

    expect(textosDoSvg(elemento)).toEqual(expect.arrayContaining(['02/11/2026', '06/11/2026']));
  });

  it('texto sai como veio', () => {
    const { elemento } = renderizar({
      categorias: ['Salvador', 'Feira de Santana'],
      formato: 'numero',
      series: [{ nome: 'Entregas', tipo: 'barra', valores: [120, 80] }],
    });

    expect(textosDoSvg(elemento)).toEqual(expect.arrayContaining(['Salvador', 'Feira de Santana']));
  });
});

describe('eixo de valor', () => {
  it('moeda em valor compacto, sem centavos', () => {
    const textos = textosDoSvg(renderizar(FRETES).elemento);

    expect(textos).toContain(`R$${NBSP}40${NBSP}mil`);
    expect(textos.filter((texto) => texto.includes(',00'))).toEqual([]);
  });

  it('número em valor compacto', () => {
    const { elemento } = renderizar({
      categorias: ['Jan', 'Fev'],
      formato: 'numero',
      series: [{ nome: 'Entregas', tipo: 'barra', valores: [42000, 51000] }],
    });

    expect(textosDoSvg(elemento)).toContain(`40${NBSP}mil`);
  });

  it('percentual com as casas que o passo do eixo pede', () => {
    const { elemento } = renderizar({
      categorias: ['Jan', 'Fev'],
      formato: 'percentual',
      series: [{ nome: 'Avarias', tipo: 'linha', valores: [0.012, 0.025] }],
    });
    const textos = textosDoSvg(elemento);

    expect(textos).toEqual(expect.arrayContaining(['0%', '0,5%', '1%']));
    expect(textos).not.toContain('1,0%');
  });
});

// A legenda é HTML, no GraficoCartesiano: quebra linha em tela estreita, sem invadir a grade
it('o desenho não tem legenda', () => {
  const { elemento } = renderizar(FRETES);

  expect(textosDoSvg(elemento)).not.toContain('Realizado');
});

// Uma sétima série repetiria a cor da primeira: agrupar em "Outros" ou dividir o gráfico
it('recusa mais séries do que cores do contrato', () => {
  const serie = { nome: 'Unidade', tipo: 'barra', valores: [1] } as const;

  expect(() =>
    montarOpcoesCartesiano(
      { categorias: ['Jan'], formato: 'numero', series: Array.from({ length: 7 }, () => serie) },
      lerTokensDoGrafico(),
    ),
  ).toThrow('no máximo 6 séries');
});

// O Testing Library normaliza o texto do elemento (o espaço inseparável do Intl vira espaço comum),
// mas não o esperado: nas consultas da dica, "R$ 48.320,00" vai com espaço comum
describe('dica (tooltip)', () => {
  it('mostra a categoria e o valor exato de cada série, formatados', () => {
    const dica = within(mostrarDica(renderizar(FRETES), 1));

    expect(dica.getByText('03/11/2026')).toBeInTheDocument();
    expect(dica.getByText('Realizado')).toBeInTheDocument();
    expect(dica.getByText('R$ 48.320,00')).toBeInTheDocument();
    expect(dica.getByText('Meta')).toBeInTheDocument();
    expect(dica.getByText('R$ 45.000,00')).toBeInTheDocument();
  });

  it('valor ausente sai como —', () => {
    const dica = within(mostrarDica(renderizar(FRETES), 2, 1));

    expect(dica.getByText('—')).toBeInTheDocument();
  });

  // Nome de série vem do banco: entra como texto, nunca como HTML
  it('nome de série com marcação aparece como texto', () => {
    const nome = '<img src=x onerror=alert(1)>';
    const renderizado = renderizar({
      ...FRETES,
      series: [{ nome, tipo: 'barra', valores: [1, 2, 3, 4, 5] }],
    });

    expect(within(mostrarDica(renderizado, 0)).getByText(nome)).toBeInTheDocument();
    expect(renderizado.elemento.querySelector('img')).toBeNull();
  });

  // Classe do token, não cor em style: a mesma da legenda
  it('marca cada série com a cor do token dela', () => {
    const dica = within(mostrarDica(renderizar(FRETES), 1));

    expect(dica.getByText('Realizado').previousElementSibling).toHaveClass('bg-navy');
    expect(dica.getByText('Meta').previousElementSibling).toHaveClass('bg-gold');
  });
});
