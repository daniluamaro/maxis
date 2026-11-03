import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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
});
