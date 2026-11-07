/*
 * Tema do ECharts a partir dos tokens (tokens.css), lidos em tempo de execução: nenhuma cor,
 * fonte ou tamanho é repetido aqui. O registro no ECharts fica em `components/charts`, o único
 * lugar que importa o ECharts.
 */

/** Valores dos tokens já resolvidos, no formato que o ECharts aceita (cor em texto, tamanho em px). */
export type TokensDoGrafico = {
  /** Cores das séries, na ordem do CLAUDE.md §7: navy, ouro, verde, azul, cinza. */
  series: readonly string[];
  superficie: string;
  borda: string;
  bordaSuave: string;
  realce: string;
  textoPrimario: string;
  textoSecundario: string;
  fonteCorpo: string;
  fonteMono: string;
  tamanhoRotulo: number;
  tamanhoTexto: number;
  /** Multiplicador da altura da linha (--line-height-body). */
  entrelinha: number;
  raio: number;
};

/** Objeto de tema do ECharts (`registerTheme`); o formato é o dele, sem tipo publicado. */
export type TemaECharts = Readonly<Record<string, unknown>> & { color: readonly string[] };

/**
 * Cores das séries na ordem do CLAUDE.md §7: o token, que o tema do ECharts lê, e a classe do
 * mesmo token, para o que é HTML (legenda e dica). Série além destas não ganha cor nova.
 */
export const CORES_DAS_SERIES = [
  { token: '--navy', classe: 'bg-navy' },
  { token: '--gold', classe: 'bg-gold' },
  { token: '--green', classe: 'bg-green' },
  { token: '--blue', classe: 'bg-blue' },
  // "cinza" do contrato: o neutro mais claro que ainda dá 3:1 sobre o painel
  { token: '--text-tertiary', classe: 'bg-text-tertiary' },
] as const;

/** Lê os tokens do documento. Falha se faltar um: sem ele, o ECharts usaria as próprias cores. */
export function lerTokensDoGrafico(): TokensDoGrafico {
  const estilo = getComputedStyle(document.documentElement);
  const pxPorRem = Number.parseFloat(estilo.fontSize);

  const ler = (nome: string): string => {
    const valor = estilo.getPropertyValue(nome).trim();
    if (valor === '') {
      throw new Error(`Token ${nome} ausente: o tokens.css não foi carregado.`);
    }
    return valor;
  };
  // O ECharts só aceita px; a escala é em rem para respeitar o tamanho de fonte do navegador
  const lerPx = (nome: string): number => {
    const valor = ler(nome);
    const numero = Number.parseFloat(valor);
    return valor.endsWith('rem') ? numero * pxPorRem : numero;
  };

  return {
    series: CORES_DAS_SERIES.map((cor) => ler(cor.token)),
    superficie: ler('--bg-panel'),
    borda: ler('--border'),
    bordaSuave: ler('--border-soft'),
    realce: ler('--bg-hover'),
    textoPrimario: ler('--text-primary'),
    textoSecundario: ler('--text-secondary'),
    fonteCorpo: ler('--font-body'),
    fonteMono: ler('--font-mono'),
    tamanhoRotulo: lerPx('--font-size-xs'),
    tamanhoTexto: lerPx('--font-size-sm'),
    entrelinha: Number.parseFloat(ler('--line-height-body')),
    raio: lerPx('--radius'),
  };
}

/** Raio da ponta da barra, em px (a base, na linha de base, fica reta). */
export const RAIO_DA_PONTA_DA_BARRA = 4;

/**
 * Tema do produto para os gráficos registrados em `components/charts`: paleta do §7, eixos e grade
 * recessivos em --border, rótulos em --text-secondary, dica clara com a sombra dos flutuantes e as
 * marcas finas do padrão (barra ≤ 24px com ponta arredondada, linha de 2px, ponto de 8px).
 */
export function criarTemaECharts(t: TokensDoGrafico): TemaECharts {
  // Altura da linha explícita: sem ela, o ECharts estima a altura do texto pela largura de um
  // ideograma ("国"), que a JetBrains Mono não tem — a medida varia com a fonte reserva da máquina
  // e o rótulo do eixo podia sair cortado na borda do gráfico
  const texto = (cor: string, tamanho: number): Record<string, unknown> => ({
    color: cor,
    fontFamily: t.fonteCorpo,
    fontSize: tamanho,
    lineHeight: Math.ceil(tamanho * t.entrelinha),
  });
  // --text-secondary: o --text-tertiary daria 3,05:1 sobre o painel, abaixo do AA de texto
  const rotulo = texto(t.textoSecundario, t.tamanhoRotulo);
  const traco = { color: t.borda, width: 1, type: 'solid' };
  const eixo = {
    axisLine: { show: false, lineStyle: traco },
    axisTick: { show: false, lineStyle: traco },
    axisLabel: { ...rotulo, margin: 12 },
    splitLine: { show: false, lineStyle: traco },
    splitArea: { show: false },
    nameTextStyle: rotulo,
  };
  const indicador = {
    type: 'line',
    lineStyle: traco,
    // Faixa da categoria em foco, por baixo das séries (o padrão do ECharts a desenha por cima e
    // a barra em foco parecia desabilitada)
    z: 1,
    shadowStyle: { color: t.realce, opacity: 1 },
    label: { show: false },
  };

  return {
    darkMode: false,
    color: t.series,
    backgroundColor: 'transparent',
    textStyle: texto(t.textoSecundario, t.tamanhoTexto),

    // Sem animação de entrada (frontend/CLAUDE.md §6): o gráfico aparece pronto e só anima ao
    // mudar, em resposta a uma ação (um filtro)
    animationDuration: 0,
    animationDurationUpdate: 300,
    animationEasingUpdate: 'cubicOut',
    stateAnimation: { duration: 150, easing: 'cubicOut' },

    // Categoria: só a linha de base; valor: só a grade, em número mono
    categoryAxis: { ...eixo, axisLine: { show: true, lineStyle: traco } },
    valueAxis: {
      ...eixo,
      axisLabel: { ...eixo.axisLabel, fontFamily: t.fonteMono },
      splitLine: { show: true, lineStyle: traco },
    },

    tooltip: {
      backgroundColor: t.superficie,
      borderColor: t.bordaSuave,
      borderWidth: 1,
      borderRadius: t.raio,
      padding: [10, 12],
      // Dentro do gráfico: em tela estreita, a dica não sai pela borda da página
      confine: true,
      textStyle: texto(t.textoPrimario, t.tamanhoTexto),
      // A sombra do ECharts é desligada e a do token entra por CSS (fica viva no tokens.css)
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowColor: 'transparent',
      extraCssText: 'box-shadow: var(--shadow-md);',
      axisPointer: indicador,
    },
    axisPointer: indicador,

    bar: {
      barMaxWidth: 24,
      // Ponta arredondada, base reta na linha de base (barra negativa: opcoesCartesiano inverte)
      itemStyle: {
        borderRadius: [RAIO_DA_PONTA_DA_BARRA, RAIO_DA_PONTA_DA_BARRA, 0, 0],
      },
    },
    line: {
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 2, cap: 'round', join: 'round' },
      // Anel na cor da superfície: o ponto se destaca onde cruza a grade ou outra série
      itemStyle: { borderWidth: 2, borderColor: t.superficie },
    },
  };
}
