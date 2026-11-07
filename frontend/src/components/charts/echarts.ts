/*
 * Único ponto de entrada do ECharts no app (frontend/CLAUDE.md §10). Importação modular: só os
 * tipos de gráfico e componentes registrados aqui entram no bundle. Gráfico novo = registrar aqui
 * e estender o tema em `theme/echarts.ts` (o tema só cobre o que está registrado).
 */
import { BarChart, LineChart } from 'echarts/charts';
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';
import * as echarts from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

import { criarTemaECharts, lerTokensDoGrafico } from '@/theme/echarts';
import type { TokensDoGrafico } from '@/theme/echarts';

// SVG em vez de canvas: o texto do SVG é redesenhado pelo navegador quando a fonte self-hosted
// termina de carregar (no canvas ficaria a fonte reserva até o próximo redesenho), sai nítido em
// qualquer zoom e na impressão. Os volumes do produto (dezenas de pontos) não pedem canvas.
// A legenda não é do ECharts: é HTML no GraficoCartesiano (quebra linha sem invadir a grade)
echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, SVGRenderer]);

export { echarts };

/** Opções aceitas: só as dos gráficos e componentes registrados acima. */
export type OpcoesDoGrafico = ComposeOption<
  BarSeriesOption | LineSeriesOption | GridComponentOption | TooltipComponentOption
>;

export const NOME_DO_TEMA = 'maxis';

let tokensDoTema: TokensDoGrafico | undefined;

/**
 * Registra o tema no primeiro gráfico desenhado — não na importação: os tokens são lidos do CSS
 * já aplicado à página. Devolve os tokens usados, para as opções saírem dos mesmos valores.
 */
export function prepararTema(): TokensDoGrafico {
  if (tokensDoTema === undefined) {
    tokensDoTema = lerTokensDoGrafico();
    echarts.registerTheme(NOME_DO_TEMA, criarTemaECharts(tokensDoTema));
  }
  return tokensDoTema;
}
