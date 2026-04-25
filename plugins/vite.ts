import type { Plugin } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');

export function optate(): Plugin {
  return {
    name: 'optate',
    apply: 'serve',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/__optate/client.js') {
          const clientPath = resolve(distDir, 'client.js');
          if (!existsSync(clientPath)) {
            res.statusCode = 404;
            res.end('Optate client not built. Run: npm run build:client inside the optate package.');
            return;
          }
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.end(readFileSync(clientPath, 'utf-8'));
          return;
        }
        next();
      });
    },

    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { src: '/__optate/client.js', defer: true },
          injectTo: 'body' as const,
        },
      ];
    },
  };
}
