import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const isDev = process.env.BUILD_MODE === 'development';

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

    // Dev mode: no minification → React component names stay readable
    minify: isDev ? false : 'terser',
    terserOptions: isDev ? undefined : {
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
    sourcemap: isDev ? 'inline' : false,
    rollupOptions: {
      external: [],
      output: {
        // Preserve function names in dev so React fiber shows real component names
        generatedCode: isDev ? { arrowFunctions: false } : undefined,
      },
    },
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
  },

  css: {
    postcss: './postcss.config.js',
  },
});
