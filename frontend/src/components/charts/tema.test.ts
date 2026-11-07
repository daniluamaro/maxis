import { describe, expect, it } from 'vitest';

import {
  EXEMPLO_FRETES as FRETES,
  EXEMPLO_CINCO_SERIES as CINCO_SERIES,
} from '@/components/charts/exemplos';
import { desenharGrafico, mostrarDica } from '@/components/charts/graficoDeTeste';
import type { DadosCartesianos } from '@/components/charts/opcoesCartesiano';
import { lerTokensDoGrafico } from '@/theme/echarts';
import tokensCss from '@/theme/tokens.css?raw';

// Verificação do STEP 0.8: nenhuma cor padrão do ECharts aparece. Desenha de verdade (SVG no
// jsdom) e confere cada cor e fonte usada contra o tokens.css.

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

function desenhar(dados: DadosCartesianos, comTema: boolean): HTMLElement {
  const desenhado = desenharGrafico(dados, comTema);
  // Dica aberta: entram também a faixa do eixo (axisPointer) e a caixa da dica
  mostrarDica(desenhado, 1);
  return desenhado.elemento;
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
    ['as cinco séries', CINCO_SERIES],
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

  // A ordem é provada na leitura dos tokens e no `color` do tema (theme/echarts.test.ts)
  it('todas as cores do contrato aparecem no desenho', () => {
    const cores = coresDesenhadas(desenhar(CINCO_SERIES, true));

    expect([...cores]).toEqual(expect.arrayContaining([...lerTokensDoGrafico().series]));
  });

  // CINCO_SERIES tem categorias de texto ("Jan") e valores numéricos no eixo
  it('categoria de texto em Inter, valores do eixo em JetBrains Mono', () => {
    const fontes = fontesDesenhadas(desenhar(CINCO_SERIES, true));

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

  // --text-tertiary daria 3,05:1 sobre o painel, abaixo do AA de texto (pendência #16)
  it('todo texto do eixo usa --text-secondary', () => {
    const elemento = desenhar(FRETES, true);
    const cores = new Set(
      [...elemento.querySelectorAll('svg text')].map((texto) => texto.getAttribute('fill')),
    );

    expect([...cores]).toEqual([lerTokensDoGrafico().textoSecundario]);
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
