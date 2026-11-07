import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import tokensCss from '@/theme/tokens.css?raw';

const ID_DOS_TOKENS = 'tokens-css';

// Os tokens de verdade aplicados ao documento, como o index.css faz no app: o que lê token
// (tema do ECharts) é testado contra o tokens.css, não contra uma cópia. Reaplicado antes de cada
// teste porque um teste pode removê-lo para provar a falta.
beforeEach(() => {
  if (typeof document !== 'undefined' && document.getElementById(ID_DOS_TOKENS) === null) {
    const estilo = document.createElement('style');
    estilo.id = ID_DOS_TOKENS;
    estilo.textContent = tokensCss;
    document.head.append(estilo);
  }
});

// O jsdom não tem canvas: sem contexto 2D, o zrender (ECharts) estima a largura do texto em vez
// de o jsdom acusar "not implemented" a cada medida
beforeEach(() => {
  if (typeof HTMLCanvasElement !== 'undefined') {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  }
});

// Sem os globals do Vitest, o Testing Library não registra a limpeza do DOM sozinho
afterEach(() => {
  cleanup();
});
