import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },

  build: {
    lib: {
      entry: resolve(__dirname, 'src/client.tsx'),
      name: 'Optate',
      formats: ['iife'],
      fileName: () => 'client.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
        pure_funcs: ['console.log', 'console.warn', 'console.info'],
      },
      mangle: {
        toplevel: true,
        safari10: false,
      },
      format: {
        comments: false,
      },
    },
    sourcemap: false,
    rollupOptions: {
      external: [],
    },
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },

  css: {
    postcss: './postcss.config.js',
  },
});
