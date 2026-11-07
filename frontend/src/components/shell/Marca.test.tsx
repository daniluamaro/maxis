import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Marca } from '@/components/shell/Marca';

describe('Marca', () => {
  // O monograma é desenho: o nome que o leitor de tela lê é o da palavra, uma vez só
  it('se apresenta como "Maxis", com o monograma escondido do leitor de tela', () => {
    const { container } = render(<Marca />);

    expect(screen.getByText('Maxis')).toBeInTheDocument();
    expect(container).toHaveTextContent(/^MMaxis$/);
    expect(screen.getByText('M')).toHaveAttribute('aria-hidden', 'true');
  });
});
