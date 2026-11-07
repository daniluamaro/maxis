import type { JSX, ReactNode } from 'react';

type ValorDoTokenProps = { children: ReactNode | null };

/** O valor lido do token ou, se ele não existe no tokens.css, o aviso em vermelho. */
export function ValorDoToken({ children }: ValorDoTokenProps): JSX.Element {
  if (children === null) {
    return <span className="font-sans font-semibold text-red-text">Token ausente</span>;
  }
  return <>{children}</>;
}
