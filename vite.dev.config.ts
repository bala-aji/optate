/**
 * Dev config — runs a full Vite dev server with HMR.
 * - Imports src/client.tsx directly (no rebuild needed)
 * - React component names are preserved (no minification)
 * - Navigate to http://localhost:5179 to see the sandbox
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],

  root: '.',           // project root
  publicDir: 'public',

  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },

  server: {
    port: 5179,
    open: '/dev-app/index.html',
  },

  // No build step needed — dev server compiles on the fly
  optimizeDeps: {
    include: ['react', 'react-dom', 'animejs'],
  },
});
