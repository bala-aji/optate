// plugins/apply-changes.ts
// Node.js only — runs in the Vite server process

import {
  readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync,
} from 'node:fs';
import { resolve, join, extname, relative, dirname } from 'node:path';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChangeRecord {
  id: string;
  selector: string;
  readablePath: string;
  shortPath: string;
  tagName: string;
  elementName: string;
  componentName: string | null;
  componentChain: string[];
  type: 'style' | 'text' | 'image' | 'attribute' | 'html';
  property: string;
  oldValue: string;
  newValue: string;
  viewportMode: string;
}

export interface ApplyResult {
  id: string;
  status: 'patched' | 'json-only' | 'failed';
  file?: string;
  absolutePath?: string;
  line?: number;
  editorUrl?: string;
  method?: 'tsx-inline' | 'css' | 'css-override';
  error?: string;
}

// ── Utilities ────────────────────────────────────────────────────────────────

export type EditorName = 'vscode' | 'cursor' | 'zed' | 'webstorm' | 'sublime' | 'textmate' | 'antigravity' | 'auto';

/** URL builder per editor */
const EDITOR_URL: Record<Exclude<EditorName, 'auto'>, (path: string, line: number) => string> = {
  vscode:      (p, l) => `vscode://file/${p}:${l}`,
  cursor:      (p, l) => `cursor://file/${p}:${l}`,
  zed:         (p, l) => `zed://file/${p}:${l}`,
  webstorm:    (p, l) => `webstorm://open?file=${encodeURIComponent(p)}&line=${l}`,
  sublime:     (p, l) => `subl://open?url=file://${encodeURIComponent(p)}&line=${l}`,
  textmate:    (p, l) => `txmt://open?url=file://${encodeURIComponent(p)}&line=${l}`,
  antigravity: (p, l) => `antigravity://open?file=${encodeURIComponent(p)}&line=${l}`,
};

/** Auto-detect editor from config folders present in the project root */
function autoDetectEditor(projectRoot: string): Exclude<EditorName, 'auto'> {
  if (existsSync(resolve(projectRoot, '.antigravity'))) return 'antigravity';
  if (existsSync(resolve(projectRoot, '.cursor')))      return 'cursor';
  if (existsSync(resolve(projectRoot, '.zed')))         return 'zed';
  if (existsSync(resolve(projectRoot, '.idea')))        return 'webstorm';
  if (existsSync(resolve(projectRoot, '.vscode')))      return 'vscode';
  return 'vscode'; // safe default
}

/** Resolve editor name (respects manual override, otherwise auto-detects) */
function resolveEditor(projectRoot: string, override?: EditorName): Exclude<EditorName, 'auto'> {
  if (override && override !== 'auto') return override;
  return autoDetectEditor(projectRoot);
}

/** Find the 1-based line number where searchStr first appears in a file */
function findLineNumber(filePath: string, searchStr: string): number {
  try {
    const lines = readFileSync(filePath, 'utf-8').split('\n');
    const idx = lines.findIndex(l => l.includes(searchStr));
    return idx >= 0 ? idx + 1 : 1;
  } catch {
    return 1;
  }
}

/** Build the editor deep-link URL for a file + line */
function buildEditorUrl(editor: Exclude<EditorName, 'auto'>, absolutePath: string, line: number): string {
  return EDITOR_URL[editor]?.(absolutePath, line) ?? EDITOR_URL.vscode(absolutePath, line);
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toCamelCase(prop: string) {
  return prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.next', 'build', 'out', '.cache', '__pycache__']);

function scanFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  let entries: ReturnType<typeof readdirSync>;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanFiles(full, exts));
    } else if (exts.includes(extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

// ── TSX inline style patcher ─────────────────────────────────────────────────
// NOTE: oldValue is a computed browser value (e.g. "rgb(59,130,246)") and will
// NOT match the authored source value (e.g. "#3b82f6"). We match on the
// property name only and replace the value in the component's body.

/** Extract the source text of the first component body that declares one of the names */
function extractComponentBody(content: string, names: string[]): { body: string; start: number; end: number } | null {
  for (const name of names) {
    // Find `function Name` or `const Name` or `class Name`
    const declRe = new RegExp(`(?:function\\s+${escapeRegex(name)}|const\\s+${escapeRegex(name)}\\s*=|class\\s+${escapeRegex(name)})`, 'g');
    let m: RegExpExecArray | null;
    while ((m = declRe.exec(content)) !== null) {
      // Walk forward to find the opening brace
      let i = m.index + m[0].length;
      while (i < content.length && content[i] !== '{') i++;
      if (i >= content.length) continue;

      // Balance braces to find the component body end
      let depth = 0;
      const start = i;
      while (i < content.length) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') { depth--; if (depth === 0) break; }
        i++;
      }
      if (depth !== 0) continue;
      return { body: content.slice(start, i + 1), start, end: i + 1 };
    }
  }
  return null;
}

function patchTsx(
  projectRoot: string,
  componentChain: string[],
  property: string,
  _oldValue: string,
  newValue: string
): { patched: boolean; file?: string } {
  const camel = toCamelCase(property);
  const srcDir = resolve(projectRoot, 'src');
  const searchDir = existsSync(srcDir) ? srcDir : projectRoot;
  const files = scanFiles(searchDir, ['.tsx', '.jsx', '.ts', '.js']);

  const names = componentChain.filter(Boolean);

  for (const filePath of files) {
    let content: string;
    try { content = readFileSync(filePath, 'utf-8'); } catch { continue; }

    const mentionsComponent = names.some(name =>
      content.includes(`function ${name}`) ||
      content.includes(`const ${name}`) ||
      content.includes(`class ${name}`)
    );
    if (!mentionsComponent) continue;

    // Scope the replacement to just the component body to avoid corrupting
    // other components in the same file.
    const bodyInfo = extractComponentBody(content, names);
    if (!bodyInfo) continue;

    const { body, start, end } = bodyInfo;

    // Replace camelProp: 'anyValue' → camelProp: 'newValue' (first match only)
    const quotedRe = new RegExp(
      `(${escapeRegex(camel)}\\s*:\\s*)(['"])[^'"]*\\2`
    );
    // Bare values: number, keyword, CSS unit (no quotes)
    const bareRe = new RegExp(
      `(${escapeRegex(camel)}\\s*:\\s*)(?!['"])[^,}\\n\\r]+`
    );

    let newBody = body;
    if (quotedRe.test(body)) {
      newBody = body.replace(quotedRe, (_m, pre, q) => `${pre}${q}${newValue}${q}`);
    } else if (bareRe.test(body)) {
      newBody = body.replace(bareRe, `$1${newValue}`);
    }

    if (newBody !== body) {
      const newContent = content.slice(0, start) + newBody + content.slice(end);
      writeFileSync(filePath, newContent, 'utf-8');
      return { patched: true, file: relative(projectRoot, filePath) };
    }
  }

  return { patched: false };
}

// ── CSS / SCSS patcher ───────────────────────────────────────────────────────
// Finds the CSS file that contains the selector and patches the property value.

function patchCss(
  projectRoot: string,
  selector: string,
  property: string,
  _oldValue: string,
  newValue: string
): { patched: boolean; file?: string } {
  const files = scanFiles(projectRoot, ['.css', '.scss', '.sass', '.less']);

  // Use simple class/id/tag segments from the selector to identify candidate files
  const selectorParts = selector.match(/[.#]?[a-zA-Z0-9_-]+/g) ?? [];

  for (const filePath of files) {
    let content: string;
    try { content = readFileSync(filePath, 'utf-8'); } catch { continue; }

    // Skip Tailwind output / non-authored CSS (usually in dist/build directories)
    // and files that don't contain any part of the selector
    const hasRelevantSelector = selectorParts.some(part => content.includes(part));
    if (!hasRelevantSelector) continue;

    // Pattern: property: <value up to ; or }> — first match in this file
    const pattern = new RegExp(
      `(${escapeRegex(property)}\\s*:\\s*)[^;{}\\n]+(\\s*;)`,
      'm'
    );

    if (!pattern.test(content)) continue;

    const newContent = content.replace(pattern, `$1${newValue}$2`);
    if (newContent === content) continue;

    writeFileSync(filePath, newContent, 'utf-8');
    return { patched: true, file: relative(projectRoot, filePath) };
  }

  return { patched: false };
}

// ── CSS override fallback (Tailwind / undetected sources) ────────────────────

/** Known CSS entry-point filenames searched in order */
const CSS_ENTRY_CANDIDATES = [
  'src/index.css', 'src/global.css', 'src/globals.css', 'src/app.css',
  'src/main.css', 'src/styles.css', 'src/style.css',
  'styles/globals.css', 'styles/global.css', 'styles/index.css',
  'app/globals.css', 'app/global.css',
  'index.css', 'global.css', 'globals.css',
];

/** Find the CSS entry file and return its absolute path, or null */
function findCssEntry(projectRoot: string): string | null {
  for (const candidate of CSS_ENTRY_CANDIDATES) {
    const p = resolve(projectRoot, candidate);
    if (existsSync(p)) return p;
  }
  return null;
}

function writeOverrideCss(
  projectRoot: string,
  selector: string,
  property: string,
  newValue: string
): string {
  // Write the override file into the same directory as the CSS entry so
  // the relative import path is always correct (./optate-overrides.css).
  const entryFile = findCssEntry(projectRoot);
  const overrideDir = entryFile ? dirname(entryFile) : projectRoot;
  const overridePath = resolve(overrideDir, 'optate-overrides.css');

  // Group selector+property in a comment-tagged block so we can find + update it
  const blockTag = `/* optate:${selector}|${property} */`;
  const rule = `${blockTag}\n${selector} {\n  ${property}: ${newValue} !important;\n}\n`;

  let existing = '';
  try { existing = readFileSync(overridePath, 'utf-8'); } catch {}

  let newContent: string;
  if (existing.includes(blockTag)) {
    // Replace existing block for same selector+property
    const blockRe = new RegExp(
      `\\/\\* optate:${escapeRegex(selector)}\\|${escapeRegex(property)} \\*\\/\\n${escapeRegex(selector)} \\{[^}]*\\}\\n`,
      'g'
    );
    newContent = existing.replace(blockRe, rule);
  } else {
    newContent = existing ? existing + '\n' + rule : rule;
  }

  mkdirSync(overrideDir, { recursive: true });
  writeFileSync(overridePath, newContent.trim() + '\n', 'utf-8');

  // Auto-import into the CSS entry file if not already there
  if (entryFile) {
    try {
      let entryCss = readFileSync(entryFile, 'utf-8');
      if (!entryCss.includes('optate-overrides.css')) {
        // Append at the end so it wins specificity over base/tailwind rules
        entryCss = entryCss.trimEnd() + "\n@import './optate-overrides.css';\n";
        writeFileSync(entryFile, entryCss, 'utf-8');
      }
    } catch { /* silently skip */ }
  }

  return relative(projectRoot, overridePath);
}

// ── Main entry point ─────────────────────────────────────────────────────────

export function applyChanges(
  changes: ChangeRecord[],
  projectRoot: string,
  editorOverride?: EditorName
): { results: ApplyResult[]; jsonPath: string; editorScheme: string } {
  const results: ApplyResult[] = [];
  const editorScheme = resolveEditor(projectRoot, editorOverride);

  for (const change of changes) {
    if (change.type !== 'style') {
      results.push({ id: change.id, status: 'json-only' });
      continue;
    }

    const chain = change.componentChain?.length
      ? change.componentChain
      : change.componentName ? [change.componentName] : [];

    const makeResult = (file: string, method: ApplyResult['method']): ApplyResult => {
      const absPath = resolve(projectRoot, file);
      const line = findLineNumber(absPath, change.newValue);
      return {
        id: change.id,
        status: 'patched',
        file,
        absolutePath: absPath,
        line,
        editorUrl: buildEditorUrl(editorScheme, absPath, line),
        method,
      };
    };

    // 1. Try TSX inline style
    if (chain.length > 0) {
      const tsx = patchTsx(projectRoot, chain, change.property, change.oldValue, change.newValue);
      if (tsx.patched && tsx.file) {
        results.push(makeResult(tsx.file, 'tsx-inline'));
        continue;
      }
    }

    // 2. Try CSS / SCSS
    const css = patchCss(projectRoot, change.selector, change.property, change.oldValue, change.newValue);
    if (css.patched && css.file) {
      results.push(makeResult(css.file, 'css'));
      continue;
    }

    // 3. Fall back: write optate-overrides.css
    try {
      const file = writeOverrideCss(projectRoot, change.selector, change.property, change.newValue);
      results.push(makeResult(file, 'css-override'));
    } catch (err: any) {
      results.push({ id: change.id, status: 'failed', error: String(err?.message ?? err) });
    }
  }

  // Always write change-list.json
  const jsonPayload = {
    generated: new Date().toISOString(),
    count: changes.length,
    changes: changes.map(c => ({
      path: c.shortPath || c.readablePath || c.selector,
      component: c.componentChain?.[0] ?? c.componentName ?? c.tagName,
      componentChain: c.componentChain,
      selector: c.selector,
      type: c.type,
      property: c.property,
      oldValue: c.oldValue,
      newValue: c.newValue,
      viewport: c.viewportMode,
    })),
  };
  const jsonPath = resolve(projectRoot, 'change-list.json');
  writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2) + '\n', 'utf-8');

  return { results, jsonPath: 'change-list.json', editorScheme };
}

// ── Cursor prompt ─────────────────────────────────────────────────────────────

export function generateCursorPrompt(
  changes: ChangeRecord[],
  results: ApplyResult[]
): string {
  const count = changes.length;

  const paths = changes
    .map((c, i) => `${i + 1}. ${c.shortPath || c.readablePath || c.selector}`)
    .join('\n');

  return [
    `Check \`change-list.json\` at the project root and complete those ${count} design change${count !== 1 ? 's' : ''} in the source files.`,
    ``,
    paths,
  ].join('\n');
}
