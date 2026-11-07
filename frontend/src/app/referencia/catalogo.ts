/*
 * O que a referência do tema mostra, na ordem do tokens.css. Os valores não ficam aqui: a página os
 * lê do tokens.css aplicado. As classes vão por extenso porque o Tailwind só gera o utilitário que
 * encontra escrito no código; um teste prova que cada uma é a do próprio token.
 */
import { formatarMoeda } from '@/lib/format';

export type CorDoCatalogo = { token: string; classe: string; uso: string };
export type GrupoDeCores = { nome: string; cores: readonly CorDoCatalogo[] };

export const GRUPOS_DE_CORES: readonly GrupoDeCores[] = [
  {
    nome: 'Superfícies',
    cores: [
      { token: '--bg-base', classe: 'bg-bg-base', uso: 'Fundo da página' },
      { token: '--bg-panel', classe: 'bg-bg-panel', uso: 'Painel; o único branco' },
      {
        token: '--bg-panel-alt',
        classe: 'bg-bg-panel-alt',
        uso: 'Painel interno e trilho de barra',
      },
      { token: '--bg-hover', classe: 'bg-bg-hover', uso: 'Hover, skeleton e faixa do gráfico' },
    ],
  },
  {
    nome: 'Bordas',
    cores: [
      { token: '--border', classe: 'bg-border', uso: 'Campo, eixo e grade do gráfico' },
      { token: '--border-soft', classe: 'bg-border-soft', uso: 'Painel e divisória discreta' },
    ],
  },
  {
    nome: 'Sidebar',
    cores: [
      { token: '--sidebar-bg', classe: 'bg-sidebar-bg', uso: 'Fundo da sidebar e da moldura' },
      { token: '--sidebar-bg-alt', classe: 'bg-sidebar-bg-alt', uso: 'Hover dentro da sidebar' },
    ],
  },
  {
    nome: 'Marca',
    cores: [
      { token: '--gold', classe: 'bg-gold', uso: 'Marca e barras; item ativo com transparência' },
      { token: '--gold-strong', classe: 'bg-gold-strong', uso: 'Ouro como texto e anel de foco' },
      { token: '--navy', classe: 'bg-navy', uso: 'Ação principal e primeira série dos gráficos' },
      { token: '--gold-bright', classe: 'bg-gold-bright', uso: 'Só dentro da sidebar escura' },
      { token: '--gold-dim', classe: 'bg-gold-dim', uso: 'Só no degradê do logo' },
    ],
  },
  {
    nome: 'Texto',
    cores: [
      { token: '--text-primary', classe: 'bg-text-primary', uso: 'Título, valor e corpo' },
      { token: '--text-secondary', classe: 'bg-text-secondary', uso: 'Texto de apoio e rótulo' },
      {
        token: '--text-tertiary',
        classe: 'bg-text-tertiary',
        uso: 'Quinta série dos gráficos; abaixo do AA como texto comum',
      },
    ],
  },
  {
    nome: 'Funcionais',
    cores: [
      { token: '--green', classe: 'bg-green', uso: 'Sucesso: preenchimento' },
      { token: '--green-text', classe: 'bg-green-text', uso: 'Sucesso: texto e ícone' },
      { token: '--red', classe: 'bg-red', uso: 'Alerta: preenchimento' },
      { token: '--red-text', classe: 'bg-red-text', uso: 'Alerta: texto e ícone' },
      { token: '--amber', classe: 'bg-amber', uso: 'Atenção: preenchimento' },
      { token: '--amber-text', classe: 'bg-amber-text', uso: 'Atenção: texto e ícone' },
      { token: '--blue', classe: 'bg-blue', uso: 'Informação: preenchimento' },
      { token: '--blue-text', classe: 'bg-blue-text', uso: 'Informação: texto e ícone' },
    ],
  },
];

export type PassoDaEscala = { passo: string; classe: string; uso: string; amostra: string };

/** Os passos de `--font-size-*`, cada um com a família e o peso do uso mais comum. */
export const ESCALA_TIPOGRAFICA: readonly PassoDaEscala[] = [
  {
    passo: '2xs',
    classe: 'text-2xs font-semibold tracking-wider text-text-secondary uppercase',
    uso: 'Cabeçalho de tabela, rótulo de KPI e grupo da sidebar',
    amostra: 'Fretes no mês',
  },
  {
    passo: 'xs',
    classe: 'text-xs text-text-secondary',
    uso: 'Legenda, selo, variação de KPI e nota',
    amostra: 'Entregue dentro do prazo',
  },
  {
    passo: 'sm',
    classe: 'text-sm',
    uso: 'Tabela, filtro, campo, botão e descrição de seção',
    amostra: 'Transportadora Rota Sul',
  },
  {
    passo: 'base',
    classe: 'text-base',
    uso: 'Corpo, item de navegação e subtítulo de página',
    amostra: 'Entregas programadas para hoje',
  },
  {
    passo: 'lg',
    classe: 'font-display text-lg font-extrabold',
    uso: 'Título de seção',
    amostra: 'Fretes da semana',
  },
  {
    passo: 'xl',
    classe: 'font-display text-xl font-extrabold',
    uso: 'Título de página',
    amostra: 'Gestão de fretes',
  },
  {
    passo: '2xl',
    classe: 'font-mono text-2xl font-bold',
    uso: 'Valor de KPI',
    amostra: formatarMoeda(48320),
  },
];

export type PesoDaFamilia = { peso: number; classe: string };
export type FamiliaDoCatalogo = {
  nome: string;
  token: string;
  classe: string;
  uso: string;
  amostra: string;
  pesos: readonly PesoDaFamilia[];
};

/** As três famílias do §7, só com os pesos que têm arquivo (index.css). */
export const FAMILIAS: readonly FamiliaDoCatalogo[] = [
  {
    nome: 'Manrope',
    token: '--font-display',
    classe: 'font-display',
    uso: 'Títulos',
    amostra: 'Gestão de fretes',
    pesos: [
      { peso: 500, classe: 'font-medium' },
      { peso: 700, classe: 'font-bold' },
      { peso: 800, classe: 'font-extrabold' },
    ],
  },
  {
    nome: 'Inter',
    token: '--font-body',
    classe: 'font-sans',
    uso: 'Corpo e interface',
    amostra: 'Pedidos em rota',
    pesos: [
      { peso: 400, classe: 'font-normal' },
      { peso: 500, classe: 'font-medium' },
      { peso: 600, classe: 'font-semibold' },
    ],
  },
  {
    nome: 'JetBrains Mono',
    token: '--font-mono',
    classe: 'font-mono',
    uso: 'Todo número, moeda e métrica',
    amostra: formatarMoeda(1284530.9),
    pesos: [
      { peso: 400, classe: 'font-normal' },
      { peso: 500, classe: 'font-medium' },
      { peso: 700, classe: 'font-bold' },
    ],
  },
];
