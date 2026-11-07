/*
 * Leitura dos tokens (tokens.css) já aplicados ao documento, para o que não é CSS: o tema do
 * ECharts e a referência do tema. Quem lê vários tokens de uma vez passa o mesmo `estilo`.
 */

function estiloDaRaiz(): CSSStyleDeclaration {
  return getComputedStyle(document.documentElement);
}

/** Valor do token. Falha se ele não existir: sem o tokens.css, nada estaria no tema. */
export function lerToken(nome: string, estilo: CSSStyleDeclaration = estiloDaRaiz()): string {
  const valor = estilo.getPropertyValue(nome).trim();
  if (valor === '') {
    throw new Error(`Token ${nome} ausente: o tokens.css não foi carregado.`);
  }
  return valor;
}

/** Token de tamanho em px; o que está em rem é convertido pelo tamanho de fonte da raiz. */
export function lerTokenEmPx(nome: string, estilo: CSSStyleDeclaration = estiloDaRaiz()): number {
  const valor = lerToken(nome, estilo);
  const numero = Number.parseFloat(valor);
  return valor.endsWith('rem') ? numero * Number.parseFloat(estilo.fontSize) : numero;
}
