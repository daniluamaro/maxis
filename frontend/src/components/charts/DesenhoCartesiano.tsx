/*
 * O desenho do gráfico cartesiano: a única parte que precisa do ECharts. Carregado sob demanda
 * pelo GraficoCartesiano, para o ECharts (~190 kB gzip) ficar fora do bundle das telas sem gráfico.
 */
import EChartsReactCore from 'echarts-for-react/esm/core';
import { useMemo, useSyncExternalStore } from 'react';
import type { JSX } from 'react';

import { echarts } from '@/components/charts/echarts';
import type { OpcoesDoGrafico } from '@/components/charts/echarts';
import { montarOpcoesCartesiano } from '@/components/charts/opcoesCartesiano';
import type { DadosCartesianos } from '@/components/charts/opcoesCartesiano';
import { criarTemaECharts, lerTokensDoGrafico } from '@/theme/echarts';

export type DesenhoCartesianoProps = DadosCartesianos & { altura: number };

// Só o renderizador SVG é registrado (components/charts/echarts.ts)
const OPCOES_DE_INICIO = { renderer: 'svg' } as const;

const MENOS_MOVIMENTO = '(prefers-reduced-motion: reduce)';

function assinarMenosMovimento(avisar: () => void): () => void {
  if (typeof window.matchMedia !== 'function') {
    return () => undefined;
  }
  const consulta = window.matchMedia(MENOS_MOVIMENTO);
  consulta.addEventListener('change', avisar);
  return () => {
    consulta.removeEventListener('change', avisar);
  };
}

function prefereMenosMovimento(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(MENOS_MOVIMENTO).matches;
}

export function DesenhoCartesiano({
  altura,
  categorias,
  tipoCategoria,
  series,
  formato,
  casas,
}: DesenhoCartesianoProps): JSX.Element {
  // Tokens lidos ao montar: o gráfico segue o CSS e o tamanho de fonte da página daquele momento
  const tokens = useMemo(() => lerTokensDoGrafico(), []);
  const tema = useMemo(() => criarTemaECharts(tokens), [tokens]);
  // Atualização animada só para quem não pediu menos movimento ao sistema (acompanha a mudança)
  const menosMovimento = useSyncExternalStore(assinarMenosMovimento, prefereMenosMovimento);

  // Pelo conteúdo, não pela referência: o pai recria os arrays a cada render (um .map sobre os
  // dados), e opções novas refariam o gráfico inteiro — dica fechada, animação repetida
  const assinatura = JSON.stringify({ categorias, tipoCategoria, series, formato, casas });
  const opcoes = useMemo((): OpcoesDoGrafico => {
    const dados = JSON.parse(assinatura) as DadosCartesianos;
    return { ...montarOpcoesCartesiano(dados, tokens), animation: !menosMovimento };
  }, [assinatura, tokens, menosMovimento]);

  return (
    <EChartsReactCore
      echarts={echarts}
      option={opcoes}
      theme={tema}
      opts={OPCOES_DE_INICIO}
      notMerge
      style={{ height: altura, width: '100%' }}
      // A tabela equivalente do GraficoCartesiano é quem fala com o leitor de tela
      aria-hidden="true"
    />
  );
}
