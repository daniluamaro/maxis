import { describe, expect, it } from 'vitest';

import { ESCALA_TIPOGRAFICA, GRUPOS_DE_CORES } from '@/app/referencia/catalogo';
import tokensCss from '@/theme/tokens.css?raw';

function declarados(padrao: RegExp): string[] {
  return [...tokensCss.matchAll(padrao)].map(([, nome]) => nome ?? '');
}

const cores = GRUPOS_DE_CORES.flatMap((grupo) => grupo.cores);

// Token novo no tokens.css sem amostra na referência faz este teste falhar
describe('catálogo da referência do tema', () => {
  it('tem toda cor do tokens.css, uma vez cada', () => {
    const doTokensCss = declarados(/^\s*(--[\w-]+):\s*#[0-9a-f]{6};/gim);

    expect(doTokensCss).toHaveLength(24);
    expect(cores.map((cor) => cor.token).toSorted()).toEqual(doTokensCss.toSorted());
  });

  it('pinta cada amostra com o utilitário do próprio token', () => {
    for (const cor of cores) {
      expect(cor.classe).toBe(`bg-${cor.token.slice(2)}`);
    }
  });

  it('tem os passos da escala do tokens.css, na ordem, com o utilitário de cada um', () => {
    // O 16px do campo em tela pequena é restrição técnica, fora da escala
    const passos = declarados(/^\s*--font-size-([\w-]+):/gm).filter(
      (passo) => passo !== 'touch-input',
    );

    expect(ESCALA_TIPOGRAFICA.map((passo) => passo.passo)).toEqual(passos);
    for (const passo of ESCALA_TIPOGRAFICA) {
      expect(passo.classe).toContain(`text-${passo.passo}`);
    }
  });
});
