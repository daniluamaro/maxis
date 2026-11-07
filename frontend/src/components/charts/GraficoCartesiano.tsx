import { lazy, Suspense } from 'react';
import type { JSX } from 'react';

import { formatadorDaCategoria, formatadorDoValor } from '@/components/charts/opcoesCartesiano';
import type { DadosCartesianos } from '@/components/charts/opcoesCartesiano';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CORES_DAS_SERIES } from '@/theme/echarts';

export type GraficoCartesianoProps = DadosCartesianos & {
  /** Nome do gráfico para o leitor de tela (legenda da tabela equivalente). */
  titulo: string;
  /** O que cada categoria é ("Dia", "Unidade"): cabeçalho da coluna na tabela equivalente. */
  rotuloDaCategoria: string;
  /** Altura em px do desenho, com os rótulos dos eixos (a legenda fica acima, fora dela). */
  altura?: number;
};

// O ECharts vem num pedaço à parte do bundle, só quando há gráfico na tela
const DesenhoCartesiano = lazy(async () => {
  const modulo = await import('@/components/charts/DesenhoCartesiano');
  return { default: modulo.DesenhoCartesiano };
});

/**
 * Barras e linhas sobre categorias, num eixo de valor só, no tema do produto. Recebe dados, não
 * opções do ECharts: cor, fonte e formato não são escolhas de quem usa.
 */
export function GraficoCartesiano({
  titulo,
  rotuloDaCategoria,
  altura = 280,
  ...dados
}: GraficoCartesianoProps): JSX.Element {
  const formatarCategoria = formatadorDaCategoria(dados);
  const formatarValor = formatadorDoValor(dados.formato, dados.casas);

  return (
    <div>
      {/* Uma série só dispensa legenda: o título da seção já diz o que é */}
      {dados.series.length >= 2 && (
        <ul aria-label="Legenda" className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5">
          {dados.series.map((serie, indice) => (
            <li key={serie.nome} className="flex items-center gap-2 text-xs text-text-secondary">
              {/* Chave no formato da marca: bloco para barra, traço para linha */}
              <span
                aria-hidden="true"
                className={cn(
                  'shrink-0',
                  serie.tipo === 'barra' ? 'h-2 w-3.5 rounded-sm' : 'h-0.5 w-3.5 rounded-full',
                  CORES_DAS_SERIES[indice]?.classe,
                )}
              />
              <span>{serie.nome}</span>
            </li>
          ))}
        </ul>
      )}
      <Suspense fallback={<Skeleton style={{ height: altura }} />}>
        <DesenhoCartesiano altura={altura} {...dados} />
      </Suspense>
      {/* Equivalente do desenho para o leitor de tela: os mesmos valores, exatos */}
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">{rotuloDaCategoria}</th>
            {dados.series.map((serie) => (
              <th key={serie.nome} scope="col">
                {serie.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.categorias.map((categoria, indice) => (
            <tr key={categoria}>
              <th scope="row">{formatarCategoria(categoria)}</th>
              {dados.series.map((serie) => (
                <td key={serie.nome}>{formatarValor(serie.valores[indice] ?? null)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
