import { Component, lazy, Suspense } from 'react';
import type { JSX, ReactNode } from 'react';

import { formatadorDaCategoria, formatadorDoValor } from '@/components/charts/opcoesCartesiano';
import type { DadosCartesianos } from '@/components/charts/opcoesCartesiano';
import { Button } from '@/components/ui/button';
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

type LimiteDoDesenhoProps = { altura: number; children: ReactNode };
type LimiteDoDesenhoEstado = { falhou: boolean };

// Se o desenho falha (o pedaço do ECharts não carregou — p. ex. um deploy trocou os arquivos com
// a aba aberta), a mensagem ocupa o lugar do gráfico e o resto da tela segue de pé
class LimiteDoDesenho extends Component<LimiteDoDesenhoProps, LimiteDoDesenhoEstado> {
  override state: LimiteDoDesenhoEstado = { falhou: false };

  static getDerivedStateFromError(): LimiteDoDesenhoEstado {
    return { falhou: true };
  }

  override render(): ReactNode {
    if (!this.state.falhou) {
      return this.props.children;
    }
    return (
      <div
        role="alert"
        style={{ height: this.props.altura }}
        className="flex flex-col items-center justify-center gap-3 rounded-lg bg-bg-panel-alt px-6 text-center"
      >
        <p className="text-sm text-text-secondary">
          Não foi possível exibir o gráfico. Recarregue a página para tentar de novo.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            window.location.reload();
          }}
        >
          Recarregar a página
        </Button>
      </div>
    );
  }
}

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
            // A posição é a identidade: nomes vêm do banco e podem repetir
            <li key={indice} className="flex items-center gap-2 text-xs text-text-secondary">
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
      <LimiteDoDesenho altura={altura}>
        <Suspense fallback={<Skeleton style={{ height: altura }} />}>
          <DesenhoCartesiano altura={altura} {...dados} />
        </Suspense>
      </LimiteDoDesenho>
      {/* Equivalente do desenho para o leitor de tela: os mesmos valores, exatos */}
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">{rotuloDaCategoria}</th>
            {dados.series.map((serie, indiceDaSerie) => (
              <th key={indiceDaSerie} scope="col">
                {serie.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dados.categorias.map((categoria, indice) => (
            <tr key={indice}>
              <th scope="row">{formatarCategoria(categoria)}</th>
              {dados.series.map((serie, indiceDaSerie) => (
                <td key={indiceDaSerie}>{formatarValor(serie.valores[indice] ?? null)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
