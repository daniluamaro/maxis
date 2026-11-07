import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { EXEMPLO_FRETES } from '@/components/charts/exemplos';
import { GraficoCartesiano } from '@/components/charts/GraficoCartesiano';

// O pedaço do bundle com o ECharts não carrega — p. ex. um deploy trocou os arquivos com a aba
// aberta. O mock vale para o arquivo inteiro, por isso este teste fica à parte.
vi.mock('@/components/charts/DesenhoCartesiano', () => {
  throw new Error('Falha ao carregar o pedaço do gráfico.');
});

it('sem o desenho, mostra o que houve e como resolver, sem derrubar a tela', async () => {
  // O React registra no console o erro que o limite capturou
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  render(<GraficoCartesiano titulo="Faturamento" rotuloDaCategoria="Dia" {...EXEMPLO_FRETES} />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível exibir o gráfico');
  expect(screen.getByRole('button', { name: 'Recarregar a página' })).toBeInTheDocument();
  // A tabela equivalente segue disponível
  expect(screen.getByRole('table', { name: 'Faturamento' })).toBeInTheDocument();
});
