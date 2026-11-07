import type { JSX, ReactNode } from 'react';

type BlocoProps = { titulo: string; children: ReactNode };

/** Subdivisão de uma seção da referência. */
export function Bloco({ titulo, children }: BlocoProps): JSX.Element {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{titulo}</h3>
      {children}
    </div>
  );
}
