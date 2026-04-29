import type { Plugin, ViteDevServer } from 'vite';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { applyChanges, generateCursorPrompt, type EditorName } from './apply-changes.js';
import { buildDevtoolsHtml } from './devtools-html.js';

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
  /** Force a specific editor for file deep-links. Default: auto-detect from .antigravity/.cursor/.vscode/.zed/.idea */
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
      // Print DevTools URL once the server is ready
      server.httpServer?.once('listening', () => {
        const addr = server.httpServer?.address();
        const port = typeof addr === 'object' && addr ? addr.port : 5173;
        console.log(
          `\n  \x1b[35m[optate]\x1b[0m DevTools → \x1b[36mhttp://localhost:${port}/__optate/devtools?_pop=1\x1b[0m\n`
        );
      });

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {

        // ── DevTools standalone page ──────────────────────────────────────
        if (req.url === '/__optate' || req.url === '/__optate/') {
          res.statusCode = 302;
          res.setHeader('Location', '/__optate/devtools');
          res.end();
          return;
        }

        if (req.url?.startsWith('/__optate/devtools')) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(buildDevtoolsHtml());
          return;
        }

        // ── PWA manifest ─────────────────────────────────────────────────
        if (req.url === '/__optate/manifest.json') {
          res.setHeader('Content-Type', 'application/manifest+json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({
            name: 'Optate DevTools',
            short_name: 'Optate',
            description: 'Real-time design inspection for your local dev server',
            start_url: '/__optate/devtools',
            scope: '/__optate/',
            display: 'standalone',
            background_color: '#0a0a0b',
            theme_color: '#0a0a0b',
            icons: [
              { src: '/__optate/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
            ],
          }, null, 2));
          return;
        }

        // ── PWA icon (SVG, accepted by Chrome 93+) ────────────────────────
        if (req.url === '/__optate/icon.svg') {
          res.setHeader('Content-Type', 'image/svg+xml');
          res.setHeader('Cache-Control', 'public,max-age=86400');
          res.end(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
            <rect width="192" height="192" rx="42" fill="#0a0a0b"/>
            <rect width="192" height="192" rx="42" fill="rgba(168,85,247,0.15)"/>
            <rect x="8" y="8" width="176" height="176" rx="36" stroke="rgba(168,85,247,0.4)" stroke-width="2" fill="none"/>
            <path d="M60 96h72M96 60v72" stroke="rgba(168,85,247,0.9)" stroke-width="12" stroke-linecap="round"/>
          </svg>`);
          return;
        }

        // ── PWA service worker (required for beforeinstallprompt to fire) ─
        if (req.url === '/__optate/sw.js') {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Service-Worker-Allowed', '/__optate/');
          res.end(`
// Optate DevTools service worker — minimal, no caching
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
self.addEventListener('fetch',    (e) => e.respondWith(fetch(e.request)));
          `.trim());
          return;
        }

        // ── Source file reader ────────────────────────────────────────────
        if (req.url?.startsWith('/__optate/source') && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');

          const urlObj = new URL(req.url, 'http://localhost');
          const rawFile   = urlObj.searchParams.get('file')      || '';
          const lineParam = parseInt(urlObj.searchParams.get('line') || '1', 10);
          const component = urlObj.searchParams.get('component') || '';

          const editorScheme = (() => {
            if (options.editor && options.editor !== 'auto') return options.editor;
            if (existsSync(resolve(projectRoot, '.antigravity'))) return 'antigravity';
            if (existsSync(resolve(projectRoot, '.cursor')))      return 'cursor';
            if (existsSync(resolve(projectRoot, '.zed')))         return 'zed';
            if (existsSync(resolve(projectRoot, '.idea')))        return 'webstorm';
            if (existsSync(resolve(projectRoot, '.vscode')))      return 'vscode';
            return 'vscode';
          })();

          function buildEditorUrl(absPath: string, line: number) {
            const schemes: Record<string, string> = {
              antigravity: `antigravity://open?file=${encodeURIComponent(absPath)}&line=${line}`,
              cursor:      `cursor://file/${absPath}:${line}`,
              zed:         `zed://file/${absPath}:${line}`,
              webstorm:    `webstorm://open?file=${encodeURIComponent(absPath)}&line=${line}`,
              sublime:     `subl://open?url=file://${encodeURIComponent(absPath)}&line=${line}`,
              textmate:    `txmt://open?url=file://${encodeURIComponent(absPath)}&line=${line}`,
              vscode:      `vscode://file/${absPath}:${line}`,
            };
            return schemes[editorScheme] ?? schemes.vscode;
          }

          function sourceResponse(absPath: string, line: number) {
            const content = readFileSync(absPath, 'utf-8');
            const lines = content.split('\n');
            const ctx = 10;
            const startIdx = Math.max(0, line - ctx - 1);
            const endIdx   = Math.min(lines.length, line + ctx);
            const targetLine = lines[line - 1] || '';
            // Extract className value
            const classMatch =
              targetLine.match(/className=["'`]([^"'`]+)["'`]/) ||
              targetLine.match(/class=["'`]([^"'`]+)["'`]/);
            const classes = classMatch ? classMatch[1].split(/\s+/).filter(Boolean) : [];

            return JSON.stringify({
              file: relative(projectRoot, absPath),
              line,
              context: lines.slice(startIdx, endIdx).join('\n'),
              contextStart: startIdx + 1,
              totalLines: lines.length,
              classes,
              editorUrl: buildEditorUrl(absPath, line),
            });
          }

          const SKIP = new Set(['node_modules','dist','.git','.next','build','out','.cache']);
          function scanSrc(dir: string): string[] {
            const out: string[] = [];
            let entries: ReturnType<typeof readdirSync>;
            try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
            for (const e of entries) {
              if (SKIP.has(e.name) || e.name.startsWith('.')) continue;
              const full = join(dir, e.name);
              if (e.isDirectory()) out.push(...scanSrc(full));
              else if (['.tsx','.jsx','.ts','.js'].includes(extname(e.name).toLowerCase())) out.push(full);
            }
            return out;
          }

          // Try absolute path first
          if (rawFile) {
            // Accept absolute paths (from _debugSource) or project-relative
            let absPath = rawFile;
            if (!existsSync(absPath)) absPath = resolve(projectRoot, rawFile.replace(/^\//, ''));
            // Security: must be within project root
            if (absPath.startsWith(projectRoot) && existsSync(absPath)) {
              try {
                res.end(sourceResponse(absPath, Math.max(1, lineParam)));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
              return;
            }
          }

          // Fallback: scan for component name
          if (component) {
            const srcDir = resolve(projectRoot, 'src');
            const searchDir = existsSync(srcDir) ? srcDir : projectRoot;
            const files = scanSrc(searchDir);
            for (const f of files) {
              try {
                const content = readFileSync(f, 'utf-8');
                if (
                  content.includes(`function ${component}`) ||
                  content.includes(`const ${component} `) ||
                  content.includes(`class ${component}`)
                ) {
                  // Find the line number of the component definition
                  const lines = content.split('\n');
                  const ln = lines.findIndex(l =>
                    l.includes(`function ${component}`) ||
                    l.includes(`const ${component} `) ||
                    l.includes(`class ${component}`)
                  );
                  res.end(sourceResponse(f, ln >= 0 ? ln + 1 : 1));
                  return;
                }
              } catch {}
            }
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Source not found' }));
          return;
        }

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
