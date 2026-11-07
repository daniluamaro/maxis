import type { JSX, ReactNode } from 'react';

import { Marca } from '@/components/shell/Marca';

type MolduraDaMarcaProps = {
  children: ReactNode;
  /** Na abertura a marca é o título da página; nas demais, o título vem no conteúdo. */
  marcaComoTitulo?: boolean;
};

/**
 * Moldura das telas fora do shell: a marca na navy da sidebar, o conteúdo no claro do workspace
 * (o dual-tone do §7). Lado a lado a partir de 900px; abaixo, a navy vira uma faixa no topo.
 */
export function MolduraDaMarca({
  children,
  marcaComoTitulo = false,
}: MolduraDaMarcaProps): JSX.Element {
  const marca = <Marca tamanho="destaque" />;

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] sidebar:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sidebar:grid-rows-1">
      <header className="flex items-center bg-sidebar-bg px-6 py-8 sidebar:justify-center sidebar:px-12">
        {marcaComoTitulo ? <h1>{marca}</h1> : marca}
      </header>
      {/* No celular o conteúdo segue a faixa navy; lado a lado, centraliza com a marca */}
      <main className="flex items-start bg-workspace px-6 py-10 sidebar:items-center sidebar:px-16 sidebar:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
