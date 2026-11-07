import { lazy, Suspense } from 'react';
import type { JSX } from 'react';
import { Route, Routes } from 'react-router';

import { Abertura } from '@/app/paginas/Abertura';
import { PaginaNaoEncontrada } from '@/app/paginas/PaginaNaoEncontrada';

// Só em desenvolvimento: no build, `import.meta.env.DEV` vira `false` e o import some junto,
// sem deixar um pedaço da página publicado
const ReferenciaDoTema = import.meta.env.DEV
  ? lazy(async () => {
      const modulo = await import('@/app/referencia/ReferenciaDoTema');
      return { default: modulo.ReferenciaDoTema };
    })
  : null;

/** Rotas da Fase 0. As dos módulos virão do objeto de menu (Fase 3). */
export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Abertura />} />
      {ReferenciaDoTema !== null && (
        <Route
          path="/dev/tema"
          element={
            // Enquanto a página carrega, o fundo dela (sem clarão branco)
            <Suspense fallback={<div className="min-h-dvh bg-workspace" />}>
              <ReferenciaDoTema />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<PaginaNaoEncontrada />} />
    </Routes>
  );
}
