/*
 * Único ponto de entrada do ECharts no app (frontend/CLAUDE.md §10). Importação modular: só os
 * tipos de gráfico e componentes registrados aqui entram no bundle. Gráfico novo = registrar aqui
 * e estender o tema em `theme/echarts.ts` (o tema só cobre o que está registrado). O tema é
 * criado por gráfico, a partir dos tokens lidos ao montar (DesenhoCartesiano).
 */
import { BarChart, LineChart } from 'echarts/charts';
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';
import * as echarts from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

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
