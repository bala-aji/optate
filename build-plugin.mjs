import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [resolve(__dirname, 'plugins/vite.ts')],
  outfile: resolve(__dirname, 'dist/plugin.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  external: ['vite', 'node:fs', 'node:path', 'node:url', 'fs', 'path', 'url'],
  minify: true,
  minifyIdentifiers: true,
  minifySyntax: true,
  minifyWhitespace: true,
  legalComments: 'none',
  sourcemap: false,
});

console.log('Plugin built → dist/plugin.js');
