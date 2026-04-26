import type { Plugin, ViteDevServer } from 'vite';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { applyChanges, generateCursorPrompt, type EditorName } from './apply-changes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export interface OptateOptions {
  /** Force a specific editor for file deep-links. Default: auto-detect from .cursor/.vscode/.zed/.idea */
  editor?: EditorName;
}

export function optate(options: OptateOptions = {}): Plugin {
  let projectRoot = process.cwd();

  return {
    name: 'optate',
    apply: 'serve',

    configResolved(config) {
      projectRoot = config.root;
    },

    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {

        // ── Serve client bundle ───────────────────────────────────────────
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

        // ── Apply changes to source files ─────────────────────────────────
        if (req.url === '/__optate/apply' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');

          let payload: { changes: any[] };
          try {
            const body = await readBody(req);
            payload = JSON.parse(body);
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            return;
          }

          if (!Array.isArray(payload?.changes)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Expected { changes: [...] }' }));
            return;
          }

          try {
            const { results, jsonPath, editorScheme } = applyChanges(payload.changes, projectRoot, options.editor);
            const cursorPrompt = generateCursorPrompt(payload.changes, results);
            res.statusCode = 200;
            res.end(JSON.stringify({ results, jsonPath, cursorPrompt, editorScheme }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err?.message ?? err) }));
          }
          return;
        }

        // ── Upload image to public/uploads/ ───────────────────────────────
        if (req.url === '/__optate/upload' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          let payload: { filename: string; data: string; mimeType: string };
          try {
            const body = await readBody(req);
            payload = JSON.parse(body);
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON body' }));
            return;
          }
          try {
            // Sanitise filename
            const safeName = payload.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uploadDir = resolve(projectRoot, 'public', 'uploads');
            mkdirSync(uploadDir, { recursive: true });
            const filePath = resolve(uploadDir, safeName);
            const buffer = Buffer.from(payload.data, 'base64');
            writeFileSync(filePath, buffer);
            const url = `/uploads/${safeName}`;
            res.statusCode = 200;
            res.end(JSON.stringify({ url }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err?.message ?? err) }));
          }
          return;
        }

        // ── CORS preflight ────────────────────────────────────────────────
        if (req.url === '/__optate/apply' && req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 204;
          res.end();
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
