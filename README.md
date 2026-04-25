# Optate

Real-time design inspection and editing for your local dev server. Inspect elements, tweak styles, export clean CSS — then paste into your AI chat to apply changes instantly.

## Install

```bash
npm install @optate/plugin
```

## Usage

Replace your `vite` dev command with `optate`:

```bash
npx @optate/plugin dev
```

Or add it to your `package.json` scripts permanently:

```json
{
  "scripts": {
    "dev": "optate dev"
  }
}
```

No changes to `vite.config.ts` required. Optate auto-detects your existing config and injects itself.

## Features

- 🎯 **Element Inspector** — click any element to see computed styles, size, font, and color
- ✏️ **Live Editor** — tweak typography, spacing, colors, borders, shadows in a floating panel
- 💬 **Inline Text Edit** — double-click any text to edit it directly on the page
- 📐 **Gap Measurement** — hover a second element to measure pixel distance
- 📱 **Responsive Modes** — desktop / tablet / mobile with proper `@media` query export
- ⎌ **Undo / Redo** — full history with `⌘Z` / `⌘⇧Z`
- ⚛️ **React Component Names** — auto-detected via React fiber for AI context
- 📤 **CSS Export** — one-click export of all changes as valid CSS
- 🧠 **AI Context Log** — structured change log ready to paste into Claude, Cursor, Copilot

## How it works

1. Install and run `npx @optate/plugin dev`
2. Inspect and edit your UI visually
3. Click **Changes** → **Copy** to get a structured CSS + context block
4. Paste into your AI tool: *"Apply these changes to my codebase"*

## Dev only

Optate never loads in production. The toolbar is completely absent from your deployed app.

## License

MIT
