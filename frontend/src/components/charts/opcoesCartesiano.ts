/*
 * Opções do gráfico cartesiano (barras e linhas sobre categorias). Quem desenha a tela passa
 * dados, não opções do ECharts: cor, fonte e marcas vêm do tema, e todo texto passa por lib/format.
 */
import type { TooltipComponentFormatterCallbackParams as ParametrosDaDica } from 'echarts';

import type { OpcoesDoGrafico } from '@/components/charts/echarts';
import {
  formatarData,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarNumero,
  formatarNumeroCompacto,
  formatarPercentual,
} from '@/lib/format';
import { CORES_DAS_SERIES } from '@/theme/echarts';
import type { TokensDoGrafico } from '@/theme/echarts';

/** Unidade do eixo de valor. Uma só por gráfico: duas unidades pedem dois gráficos, não dois eixos. */
export type FormatoDoValor = 'moeda' | 'numero' | 'percentual';

export type SerieCartesiana = {
  nome: string;
  tipo: 'barra' | 'linha';
  /** Um valor por categoria, na mesma ordem; `null` = sem dado (vira lacuna e "—"). */
  valores: readonly (number | null)[];
};

export type DadosCartesianos = {
  categorias: readonly string[];
  /** `data`: categorias são datas do banco ("YYYY-MM-DD"), exibidas em dd/mm/aaaa. */
  tipoCategoria?: 'texto' | 'data';
  series: readonly SerieCartesiana[];
  formato: FormatoDoValor;
  /** Casas decimais do valor exato (dica e tabela). Padrão: as do formatador. */
  casas?: number;
};

type Formatador = (valor: number | null) => string;

export function formatadorDoValor(formato: FormatoDoValor, casas?: number): Formatador {
  switch (formato) {
    case 'moeda':
      return (valor) => formatarMoeda(valor);
    case 'numero':
      return (valor) => formatarNumero(valor, casas);
    case 'percentual':
      return (valor) => formatarPercentual(valor, casas);
  }
}

// Passo do eixo em percentual com as casas que ele pede, até 2: "0,5%" e "1%", não "1,0%"
function casasDoPercentual(fracao: number): number {
  const pontos = fracao * 100;
  const casas = [0, 1].find(
    (n) => Math.abs(Math.round(pontos * 10 ** n) - pontos * 10 ** n) < 1e-6,
  );
  return casas ?? 2;
}

// O eixo mostra valor compacto ("R$ 40 mil"); o exato fica na dica e na tabela
function formatadorDoEixo(formato: FormatoDoValor): (valor: number) => string {
  switch (formato) {
    case 'moeda':
      return formatarMoedaCompacta;
    case 'numero':
      return formatarNumeroCompacto;
    case 'percentual':
      return (valor) => formatarPercentual(valor, casasDoPercentual(valor));
  }
}

export function formatadorDaCategoria(dados: DadosCartesianos): (categoria: string) => string {
  return dados.tipoCategoria === 'data' ? formatarData : (categoria) => categoria;
}

function elemento(classe: string, texto?: string): HTMLElement {
  const el = document.createElement(texto === undefined ? 'div' : 'span');
  el.className = classe;
  // Nome de série e categoria vêm do banco: sempre como texto, nunca como HTML
  if (texto !== undefined) {
    el.textContent = texto;
  }
  return el;
}

// Valor em destaque, nome em segundo plano: na dica, quem lê já sabe a série e quer o número
function montarDica(params: ParametrosDaDica, dados: DadosCartesianos): HTMLElement {
  const lista = Array.isArray(params) ? params : [params];
  const formatar = formatadorDoValor(dados.formato, dados.casas);
  const dica = elemento('flex min-w-44 flex-col gap-1.5');

  const indice = lista[0]?.dataIndex ?? 0;
  const categoria = formatadorDaCategoria(dados)(dados.categorias[indice] ?? '');
  const fonteDaCategoria = dados.tipoCategoria === 'data' ? 'font-mono' : 'font-sans';
  dica.append(elemento(`mb-0.5 text-xs text-text-secondary ${fonteDaCategoria}`, categoria));

  for (const param of lista) {
    const indiceDaSerie = param.seriesIndex ?? -1;
    const serie = dados.series[indiceDaSerie];
    if (serie === undefined) {
      continue;
    }
    const linha = elemento('flex items-center gap-2');
    // Chave de traço curto na cor da série, por classe do token (o texto nunca usa a cor da série)
    const cor = CORES_DAS_SERIES[indiceDaSerie]?.classe ?? '';
    const chave = elemento(`h-0.5 w-3 shrink-0 rounded-full ${cor}`);
    linha.append(
      chave,
      elemento('text-sm text-text-secondary', serie.nome),
      elemento(
        'ml-auto pl-4 font-mono text-sm font-medium text-text-primary',
        formatar(serie.valores[param.dataIndex] ?? null),
      ),
    );
    dica.append(linha);
  }
  return dica;
}

export function montarOpcoesCartesiano(
  dados: DadosCartesianos,
  tokens: TokensDoGrafico,
): OpcoesDoGrafico {
  // Uma série além das cores do contrato repetiria a primeira (o ECharts recomeça a paleta)
  if (dados.series.length > tokens.series.length) {
    throw new Error(
      `Gráfico com no máximo ${String(tokens.series.length)} séries: agrupe o restante em "Outros" ou divida em mais gráficos.`,
    );
  }
  const temBarra = dados.series.some((serie) => serie.tipo === 'barra');
  const formatarCategoria = formatadorDaCategoria(dados);

  return {
    // A legenda fica fora do desenho (HTML, no GraficoCartesiano): a grade ocupa a altura toda
    grid: { left: 0, right: 8, top: 8, bottom: 0, containLabel: true },
    tooltip: {
      trigger: 'axis',
      // Barra: a faixa da categoria inteira; só linhas: a linha vertical que acha o ponto
      axisPointer: { type: temBarra ? 'shadow' : 'line' },
      formatter: (params) => montarDica(params, dados),
    },
    xAxis: {
      type: 'category',
      data: [...dados.categorias],
      axisLabel: {
        formatter: (categoria: string) => formatarCategoria(categoria),
        ...(dados.tipoCategoria === 'data' ? { fontFamily: tokens.fonteMono } : {}),
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: formatadorDoEixo(dados.formato) },
    },
    series: dados.series.map((serie) =>
      serie.tipo === 'barra'
        ? { type: 'bar', name: serie.nome, data: [...serie.valores] }
        : { type: 'line', name: serie.nome, data: [...serie.valores] },
    ),
  };
}
