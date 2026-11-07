import { lerToken, lerTokenEmPx } from '@/theme/lerToken';

export type LeitorDeTokens = {
  valor: (nome: string) => string | null;
  px: (nome: string) => number | null;
};

function ouNulo<T>(ler: () => T): T | null {
  try {
    return ler();
  } catch {
    return null;
  }
}

/**
 * Lê os tokens sem derrubar a página: a referência existe para mostrar o que falta no tokens.css,
 * então o token ausente vira `null` (e a página o aponta) em vez de erro.
 */
export function criarLeitorDeTokens(): LeitorDeTokens {
  const estilo = getComputedStyle(document.documentElement);
  return {
    valor: (nome) => ouNulo(() => lerToken(nome, estilo)),
    px: (nome) => ouNulo(() => lerTokenEmPx(nome, estilo)),
  };
}
