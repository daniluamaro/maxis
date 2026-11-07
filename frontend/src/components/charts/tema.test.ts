import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { echarts } from '@/components/charts/echarts';
import { montarOpcoesCartesiano } from '@/components/charts/opcoesCartesiano';
import type { DadosCartesianos } from '@/components/charts/opcoesCartesiano';
import { criarTemaECharts, lerTokensDoGrafico } from '@/theme/echarts';
import tokensCss from '@/theme/tokens.css?raw';

// Verificação do STEP 0.8: nenhuma cor padrão do ECharts aparece. Desenha de verdade (SVG no
// jsdom) e confere cada cor e fonte usada contra o tokens.css.

const FRETES: DadosCartesianos = {
  categorias: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'],
  tipoCategoria: 'data',
  formato: 'moeda',
  series: [
    { nome: 'Realizado', tipo: 'barra', valores: [41250.5, 48320, null, 39870.25, 52110] },
    { nome: 'Meta', tipo: 'linha', valores: [45000, 45000, 45000, 45000, 45000] },
  ],
};

// As seis cores do contrato, em barras e em linhas
const SEIS_SERIES: DadosCartesianos = {
  categorias: ['Jan', 'Fev', 'Mar'],
  formato: 'numero',
  series: ['A', 'B', 'C', 'D', 'E', 'F'].map((nome, i) => ({
    nome,
    tipo: i % 2 === 0 ? 'barra' : 'linha',
    valores: [10 + i, 20 + i, 15 + i],
  })),
};

const HEX_DOS_TOKENS = new Set(tokensCss.toLowerCase().match(/#[0-9a-f]{6}\b/g));

function paraHex(cor: string): string {
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(cor);
  if (rgb === null) {
    return cor.toLowerCase();
  }
  return `#${rgb
    .slice(1, 4)
    .map((canal) => Number(canal).toString(16).padStart(2, '0'))
    .join('')}`;
}

beforeEach(() => {
  // O jsdom não tem canvas: sem contexto 2D, o zrender estima a largura do texto
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

function desenhar(dados: DadosCartesianos, comTema: boolean): HTMLElement {
  const elemento = document.createElement('div');
  document.body.append(elemento);
  const tokens = lerTokensDoGrafico();
  const grafico = echarts.init(elemento, comTema ? criarTemaECharts(tokens) : undefined, {
    renderer: 'svg',
    width: 640,
    height: 320,
  });
  grafico.setOption(montarOpcoesCartesiano(dados, tokens));
  // Dica aberta: entram também a faixa do eixo (axisPointer) e a caixa da dica
  grafico.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: 1 });
  onTestFinished(() => {
    grafico.dispose();
    elemento.remove();
  });
  return elemento;
}

// A geometria de recorte (`clipPath`) leva preenchimento, mas não pinta nada
function coresDesenhadas(elemento: HTMLElement): Set<string> {
  const cores = new Set<string>();
  for (const el of elemento.querySelectorAll('svg *')) {
    for (const atributo of ['fill', 'stroke']) {
      const cor = el.getAttribute(atributo);
      if (cor !== null && cor !== 'none' && el.closest('clipPath') === null) {
        cores.add(paraHex(cor));
      }
    }
  }
  return cores;
}

// Família de cada texto desenhado, por conteúdo
function fontesDesenhadas(elemento: HTMLElement): Map<string, string> {
  return new Map(
    [...elemento.querySelectorAll('svg text')].map((texto) => [
      texto.textContent,
      texto.getAttribute('style') ?? '',
    ]),
  );
}

describe('tema do ECharts', () => {
  it.each([
    ['barras e linha', FRETES],
    ['as seis séries', SEIS_SERIES],
  ])('%s: toda cor desenhada é de um token', (_, dados) => {
    const cores = coresDesenhadas(desenhar(dados, true));

    expect(cores.size).toBeGreaterThan(0);
    expect([...cores].filter((cor) => !HEX_DOS_TOKENS.has(cor))).toEqual([]);
  });

  // Prova de que a verificação acima pega cor padrão: sem o tema, ela aparece
  it('sem o tema, as cores padrão do ECharts aparecem', () => {
    const cores = coresDesenhadas(desenhar(FRETES, false));

    expect([...cores].filter((cor) => !HEX_DOS_TOKENS.has(cor))).not.toEqual([]);
  });

  it('as séries seguem a ordem do contrato', () => {
    const cores = coresDesenhadas(desenhar(SEIS_SERIES, true));

    expect([...cores]).toEqual(expect.arrayContaining([...lerTokensDoGrafico().series]));
  });

  // SEIS_SERIES tem categorias de texto ("Jan") e valores numéricos no eixo
  it('categoria de texto em Inter, valores do eixo em JetBrains Mono', () => {
    const fontes = fontesDesenhadas(desenhar(SEIS_SERIES, true));

    expect(fontes.get('Jan')).toContain('Inter');
    expect(fontes.get('20')).toContain('JetBrains Mono');
  });

  it('categoria de data em JetBrains Mono, como todo número', () => {
    const fontes = fontesDesenhadas(desenhar(FRETES, true));

    expect(fontes.get('02/11/2026')).toContain('JetBrains Mono');
  });

  it('nenhum texto cai na fonte padrão do ECharts', () => {
    const fontes = [...fontesDesenhadas(desenhar(FRETES, true)).values()];

    expect(fontes.length).toBeGreaterThan(0);
    expect(fontes.filter((fonte) => !/Inter|JetBrains Mono/.test(fonte))).toEqual([]);
  });

  it('a dica é clara, com a sombra e o raio dos tokens', () => {
    const elemento = desenhar(FRETES, true);
    const caixa = [...elemento.children].find((filho) => filho.querySelector('svg') === null);
    const estilo = caixa?.getAttribute('style') ?? '';

    expect(estilo).toContain('var(--shadow-md)');
    expect(estilo).toMatch(/background-color:\s*(#ffffff|rgb\(255, 255, 255\))/);
    expect(estilo).toMatch(/border-radius:\s*10px/);
  });
});
