import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import '@/index.css';
import { App } from '@/app/App';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Elemento #root ausente no index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    {/* Rota por segmento com a History API (CLAUDE.md §2); o fallback da hospedagem é do deploy */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
