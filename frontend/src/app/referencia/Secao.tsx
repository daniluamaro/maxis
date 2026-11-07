import { useId } from 'react';
import type { JSX, ReactNode } from 'react';

type SecaoProps = { titulo: string; descricao: string; children: ReactNode };

/** Painel de seção do mockup (`.section`): título em Manrope, descrição curta e o conteúdo. */
export function Secao({ titulo, descricao, children }: SecaoProps): JSX.Element {
  const idDoTitulo = useId();

  return (
    <section
      aria-labelledby={idDoTitulo}
      className="mb-5.5 rounded-xl border border-border-soft bg-bg-panel px-4 pt-5.5 pb-6.5 shadow-sm sm:px-6"
    >
      <h2 id={idDoTitulo} className="font-display text-lg font-extrabold">
        {titulo}
      </h2>
      <p className="mt-1.5 max-w-160 text-sm text-text-secondary">{descricao}</p>
      <div className="mt-5 flex flex-col gap-7">{children}</div>
    </section>
  );
}
