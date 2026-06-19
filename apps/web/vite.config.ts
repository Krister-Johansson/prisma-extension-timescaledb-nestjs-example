import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 3001 so it doesn't clash with the API on 3000.
    port: 3001,
    // Proxy GraphQL to the API in dev so the browser stays same-origin
    // (no CORS needed). Override the target with VITE_API_PROXY if needed.
    proxy: {
      '/graphql': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:3000',
        changeOrigin: true,
        // Proxy the WebSocket upgrade too, for graphql-ws subscriptions.
        ws: true,
      },
      // The AI chat agent's SSE endpoint.
      '/agent': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tailwindcss(),
    // The router plugin must come before React's plugin.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
});
