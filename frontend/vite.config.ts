import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
// O defineConfig do Vitest é o do Vite com a tipagem da chave `test`
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
  build: {
    // Fonte nunca vira base64 no CSS: os subconjuntos pequenos (grego, vietnamita…) iriam para
    // todo usuário. Como arquivo, o `unicode-range` faz o navegador baixar só o que o texto usa.
    assetsInlineLimit: (filePath) => (/\.woff2?$/.test(filePath) ? false : undefined),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // Isolamento entre testes: spies, `vi.stubEnv` e `vi.stubGlobal` não vazam para o próximo
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    // Data com hora sai no fuso local: fixo aqui (UTC−3, o da maioria dos usuários) para o
    // resultado não depender da máquina nem do CI
    env: { TZ: 'America/Sao_Paulo' },
    // Nos testes, CSS vira string vazia — inclusive com `?raw`. O tokens.css é a exceção: o setup
    // o aplica ao documento, como o index.css faz no app, e o tema do ECharts lê os tokens dele.
    css: { include: [/\/src\/theme\/tokens\.css\?raw$/] },
  },
});
