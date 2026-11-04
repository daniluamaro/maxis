import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
// O defineConfig do Vitest é o do Vite com a tipagem da chave `test`
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mesmo alias de `paths` no tsconfig.app.json
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Portas fixas: o localhost de desenvolvimento entra no CORS das Edge Functions e nos
  // redirects do Auth do dev; trocar de porta em silêncio viraria erro de CORS.
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // Isolamento entre testes: spies, `vi.stubEnv` e `vi.stubGlobal` não vazam para o próximo
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
