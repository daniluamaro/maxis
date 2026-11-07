import { within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EXEMPLO_FRETES as FRETES } from '@/components/charts/exemplos';
import { desenharGrafico, mostrarDica } from '@/components/charts/graficoDeTeste';
import { montarOpcoesCartesiano } from '@/components/charts/opcoesCartesiano';
import { lerTokensDoGrafico } from '@/theme/echarts';

const NBSP = ' ';

const renderizar = desenharGrafico;

function textosDoSvg(elemento: HTMLElement): string[] {
  return [...elemento.querySelectorAll('svg text')].map((texto) => texto.textContent);
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

// Onde ficam os cantos arredondados de uma barra desenhada: "ponta" (longe da linha de base)
// ou "base". O ECharts desenha cada canto arredondado como um arco (A) no caminho do SVG.
function cantosArredondados(caminho: string, valor: number): 'ponta' | 'base' {
  const ys = [...caminho.matchAll(/[ML]-?[\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
  const arcos = [...caminho.matchAll(/A[\d.\s-]+ (-?[\d.]+)(?=[A-Z])/g)].map((m) => Number(m[1]));
  // No SVG o y cresce para baixo: a ponta de uma barra positiva é o menor y
  const ponta = valor >= 0 ? Math.min(...ys) : Math.max(...ys);
  return arcos.every((y) => Math.abs(y - ponta) <= 4) ? 'ponta' : 'base';
}

describe('barras', () => {
  it('arredondam a ponta, nunca a base — também quando o valor é negativo', () => {
    const { elemento } = renderizar({
      categorias: ['Jan', 'Fev'],
      formato: 'numero',
      series: [{ nome: 'Saldo', tipo: 'barra', valores: [50, -30] }],
    });
    const caminhos = [...elemento.querySelectorAll('path')]
      .filter((caminho) => caminho.getAttribute('fill') === lerTokensDoGrafico().series[0])
      .map((caminho) => caminho.getAttribute('d') ?? '');

    expect(caminhos.map((d, i) => cantosArredondados(d, i === 0 ? 50 : -30))).toEqual([
      'ponta',
      'ponta',
    ]);
  });
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
