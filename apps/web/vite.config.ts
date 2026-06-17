import { defineConfig } from 'vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    // 3001 so it doesn't clash with the API on 3000.
    port: 3001,
  },
  plugins: [
    tailwindcss(),
    // The router plugin must come before React's plugin.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
});
