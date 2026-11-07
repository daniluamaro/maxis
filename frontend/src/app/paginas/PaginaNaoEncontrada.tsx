import type { JSX } from 'react';
import { Link, useLocation } from 'react-router';

import { MolduraDaMarca } from '@/components/shell/MolduraDaMarca';
import { buttonVariants } from '@/components/ui/button';

/** 404 fora do shell; a versão dentro do shell, com a navegação, vem na Fase 3. */
export function PaginaNaoEncontrada(): JSX.Element {
  const { pathname } = useLocation();

  return (
    <MolduraDaMarca>
      <title>Página não encontrada | Maxis</title>
      <h1 className="font-display text-xl font-extrabold text-text-primary">
        Página não encontrada
      </h1>
      <p className="mt-2 text-base text-text-secondary">
        O endereço <span className="font-medium wrap-anywhere text-text-primary">{pathname}</span>{' '}
        não existe no Maxis. Confira o link ou volte para o início.
      </p>
      <Link to="/" className={buttonVariants({ className: 'mt-6' })}>
        Voltar para o início
      </Link>
    </MolduraDaMarca>
  );
}
