/*
 * O desenho do gráfico cartesiano: a única parte que precisa do ECharts. Carregado sob demanda
 * pelo GraficoCartesiano, para o ECharts (~195 kB gzip) ficar fora do bundle das telas sem gráfico.
 */
import EChartsReactCore from 'echarts-for-react/esm/core';
import { useMemo } from 'react';
import type { JSX } from 'react';

import { echarts, NOME_DO_TEMA, prepararTema } from '@/components/charts/echarts';
import type { OpcoesDoGrafico } from '@/components/charts/echarts';
import { montarOpcoesCartesiano } from '@/components/charts/opcoesCartesiano';
import type { DadosCartesianos } from '@/components/charts/opcoesCartesiano';

export type DesenhoCartesianoProps = DadosCartesianos & { altura: number };

// Só o renderizador SVG é registrado (components/charts/echarts.ts)
const OPCOES_DE_INICIO = { renderer: 'svg' } as const;

function prefereMenosMovimento(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function DesenhoCartesiano({
  altura,
  categorias,
  tipoCategoria,
  series,
  formato,
  casas,
}: DesenhoCartesianoProps): JSX.Element {
  const opcoes = useMemo((): OpcoesDoGrafico => {
    const dados = { categorias, tipoCategoria, series, formato, casas };
    return {
      ...montarOpcoesCartesiano(dados, prepararTema()),
      // Atualização animada só para quem não pediu menos movimento ao sistema
      animation: !prefereMenosMovimento(),
    };
  }, [categorias, tipoCategoria, series, formato, casas]);

  return (
    <EChartsReactCore
      echarts={echarts}
      option={opcoes}
      theme={NOME_DO_TEMA}
      opts={OPCOES_DE_INICIO}
      notMerge
      style={{ height: altura, width: '100%' }}
      // A tabela equivalente do GraficoCartesiano é quem fala com o leitor de tela
      aria-hidden="true"
    />
  );
}
