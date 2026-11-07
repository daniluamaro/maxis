import type { JSX } from 'react';
import { Route, Routes } from 'react-router';

import { Abertura } from '@/app/paginas/Abertura';
import { PaginaNaoEncontrada } from '@/app/paginas/PaginaNaoEncontrada';

/** Rotas da Fase 0. As dos módulos virão do objeto de menu (Fase 3). */
export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Abertura />} />
      <Route path="*" element={<PaginaNaoEncontrada />} />
    </Routes>
  );
}
