#!/usr/bin/env node
import { createServer, loadConfigFromFile, mergeConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const [,, command = 'dev', ...args] = process.argv;

if (command === 'dev') {
  await startDev();
} else {
  console.error(`optate: unknown command "${command}". Available: dev`);
  process.exit(1);
}

async function startDev() {
  const cwd = process.cwd();

  // Load user's vite config if it exists
  const configResult = await loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    undefined, // auto-discover vite.config.*
    cwd
  );

  const userConfig = configResult?.config ?? {};

  // Load the optate plugin from our dist
  const pluginPath = resolve(__dirname, '../dist/plugin.js');
  if (!existsSync(pluginPath)) {
    console.error('[optate] Plugin not built. Run: npm run build inside the optate package.');
    process.exit(1);
  }

  const { optate } = await import(pluginPath);

  // Merge optate into user's config
  const mergedConfig = mergeConfig(userConfig, {
    plugins: [optate()],
    configFile: false, // we already loaded it
  });

  const server = await createServer(mergedConfig);
  await server.listen();
  server.printUrls();

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
