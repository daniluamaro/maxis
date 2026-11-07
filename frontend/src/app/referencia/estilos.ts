/*
 * Tabela no padrão do mockup (`table`, `th`, `td`). O cabeçalho é a exceção da caixa alta
 * (frontend/CLAUDE.md §6), em --text-secondary: o --text-tertiary do mockup dá 3,05:1, abaixo do AA.
 */
export const ESTILO_DA_TABELA = 'w-full border-collapse text-sm';
export const ESTILO_DO_CORPO_DA_TABELA = '[&>tr:last-child>td]:border-b-0';
export const ESTILO_DO_CABECALHO =
  'border-b border-border px-3 pb-2.5 text-left text-2xs font-semibold tracking-wider text-text-secondary uppercase';
export const ESTILO_DA_CELULA = 'border-b border-border-soft px-3 py-2.75 align-middle';
