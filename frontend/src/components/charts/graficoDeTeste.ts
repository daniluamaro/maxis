/*
 * Só para testes: desenha um gráfico de verdade (SVG no jsdom) com as opções do wrapper e o
 * desfaz no fim do teste.
 */
import { onTestFinished } from 'vitest';

import { echarts } from '@/components/charts/echarts';
import { montarOpcoesCartesiano } from '@/components/charts/opcoesCartesiano';
import type { DadosCartesianos } from '@/components/charts/opcoesCartesiano';
import { criarTemaECharts, lerTokensDoGrafico } from '@/theme/echarts';

export type GraficoDesenhado = {
  grafico: ReturnType<typeof echarts.init>;
  elemento: HTMLDivElement;
};

export function desenharGrafico(dados: DadosCartesianos, comTema = true): GraficoDesenhado {
  const elemento = document.createElement('div');
  document.body.append(elemento);
  const tokens = lerTokensDoGrafico();
  const grafico = echarts.init(elemento, comTema ? criarTemaECharts(tokens) : undefined, {
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

// A dica é o HTML que o ECharts põe ao lado do desenho (o SVG). Sobre um ponto sem dado o ECharts
// não abre dica: aponta-se uma série que tenha valor ali.
export function mostrarDica(
  { grafico, elemento }: GraficoDesenhado,
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
