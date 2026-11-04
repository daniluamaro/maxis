import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem os globals do Vitest, o Testing Library não registra a limpeza do DOM sozinho
afterEach(() => {
  cleanup();
});
