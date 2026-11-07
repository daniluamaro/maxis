import type { JSX } from 'react';

import { MolduraDaMarca } from '@/components/shell/MolduraDaMarca';

/** O que a produção mostra até existir o login (Fase 2): só a marca e o que o Maxis é. */
export function Abertura(): JSX.Element {
  return (
    <MolduraDaMarca marcaComoTitulo>
      <title>Maxis</title>
      <p className="font-display text-xl font-extrabold text-balance text-text-primary">
        Gestão de transporte, armazém e logística em uma só plataforma.
      </p>
    </MolduraDaMarca>
  );
}
