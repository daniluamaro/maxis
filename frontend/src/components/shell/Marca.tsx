import type { JSX } from 'react';

type MarcaProps = {
  /** `padrao`: o da sidebar no mockup. `destaque`: o das telas fora do shell. */
  tamanho?: 'padrao' | 'destaque';
};

const TAMANHOS = {
  padrao: { conjunto: 'gap-2.5', monograma: 'size-8.5 rounded-md text-lg', nome: 'text-lg' },
  destaque: { conjunto: 'gap-4', monograma: 'size-14 rounded-xl text-2xl', nome: 'text-xl' },
} as const;

/**
 * Monograma em degradê de ouro e o nome, como no mockup. Fica sempre sobre a navy (sidebar e
 * moldura): o nome é branco, que no projeto só existe como --bg-panel.
 */
export function Marca({ tamanho = 'padrao' }: MarcaProps): JSX.Element {
  const medidas = TAMANHOS[tamanho];

  return (
    <span className={`inline-flex items-center ${medidas.conjunto}`}>
      {/* Degradê em sRGB, como no CSS do mockup: o padrão do Tailwind (OKLab) muda o tom do meio.
          Letra em --text-primary, a mesma do favicon (o quase preto do mockup não é token). */}
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center bg-linear-135/srgb from-gold-bright to-gold-dim font-display leading-none font-extrabold text-text-primary ${medidas.monograma}`}
      >
        M
      </span>
      <span
        className={`font-display leading-none font-extrabold tracking-wide text-bg-panel uppercase ${medidas.nome}`}
      >
        Maxis
      </span>
    </span>
  );
}
