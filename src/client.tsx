import { createRoot } from 'react-dom/client';
import { PanelShell } from '../components/Panel/PanelShell';
import { SelectionProvider } from '../lib/selection-context';
import styles from '../styles/content.css?inline';

const HOST_ID = 'optate-host';

// ── Detect DevTools preview mode ──────────────────────────────────────────────
// When loaded inside /__optate/devtools iframe the URL has ?__optate_devtools=1
const IS_DEVTOOLS_PREVIEW = new URLSearchParams(location.search).has('__optate_devtools');

// ── DevTools bridge ───────────────────────────────────────────────────────────
// Runs instead of the normal panel when inside the devtools iframe.
// Bridges hover/click events to the parent devtools page via postMessage.

function getReactFiber(el: Element): any {
  const key = Object.keys(el).find(k =>
    k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  );
  return key ? (el as any)[key] : null;
}

function getDebugSource(fiber: any): { fileName: string; lineNumber: number } | null {
  let f = fiber;
  while (f) {
    if (f._debugSource) return f._debugSource;
    f = f.return;
  }
  return null;
}

function getComponentName(fiber: any): string {
  let f = fiber;
  while (f) {
    if (typeof f.type === 'function') {
      return f.type.displayName || f.type.name || '';
    }
    f = f.return;
  }
  return '';
}

function getComponentChain(fiber: any): string[] {
  const chain: string[] = [];
  let f = fiber;
  while (f && chain.length < 6) {
    if (typeof f.type === 'function') {
      const name = f.type.displayName || f.type.name || '';
      if (name && !chain.includes(name)) chain.push(name);
    }
    f = f.return;
  }
  return chain;
}

function sendElementInfo(event: 'hover' | 'select', el: Element) {
  const fiber        = getReactFiber(el);
  const debugSource  = getDebugSource(fiber);
  const componentName = getComponentName(fiber);
  const componentChain = getComponentChain(fiber);
  const rect = el.getBoundingClientRect().toJSON();
  const label = componentName || el.tagName.toLowerCase();

  window.parent.postMessage({
    type: 'optate:element',
    event,
    tagName:       el.tagName.toLowerCase(),
    id:            el.id || '',
    classList:     Array.from(el.classList),
    inlineStyle:   (el as HTMLElement).style?.cssText || '',
    componentName,
    componentChain,
    debugSource,
    rect,
    label,
  }, '*');
}

function setupDevtoolsBridge() {
  let inspectEnabled = true;
  let lastHovered: Element | null = null;

  // Listen for inspect-mode toggle from devtools parent
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'optate:inspect-mode') {
      inspectEnabled = e.data.enabled;
      if (!inspectEnabled) {
        // Clear hover
        window.parent.postMessage({ type: 'optate:element', event: 'hover', rect: null }, '*');
      }
    }
  });

  document.addEventListener('mouseover', (e) => {
    if (!inspectEnabled) return;
    const el = e.target as Element;
    if (el === lastHovered) return;
    lastHovered = el;
    sendElementInfo('hover', el);
  }, true);

  document.addEventListener('mouseout', (e) => {
    if (!inspectEnabled) return;
    const el = e.target as Element;
    if (el === lastHovered) {
      lastHovered = null;
      window.parent.postMessage({ type: 'optate:element', event: 'hover', rect: null, label: '' }, '*');
    }
  }, true);

  document.addEventListener('click', (e) => {
    if (!inspectEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    sendElementInfo('select', e.target as Element);
  }, true);
}

// ── Normal panel mount/unmount ────────────────────────────────────────────────
function mount() {
  // Don't mount panel when running inside devtools iframe
  if (IS_DEVTOOLS_PREVIEW) return;
  if (window.self !== window.top) return;
  if (document.getElementById(HOST_ID)) return;

  if (!document.querySelector('#optate-font-inter')) {
    const link = document.createElement('link');
    link.id    = 'optate-font-inter';
    link.rel   = 'stylesheet';
    link.href  = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  const container = document.createElement('div');
  shadow.appendChild(container);

  const root = createRoot(container);
  root.render(
    <SelectionProvider>
      <PanelShell
        onClose={() => {
          root.unmount();
          host.remove();
        }}
        initiallyOpen={true}
      />
    </SelectionProvider>
  );
}

function unmount() {
  const host = document.getElementById(HOST_ID);
  if (host) host.remove();
}

// Expose mount/unmount globally
(window as any).optateMount   = mount;
(window as any).optateUnmount = unmount;

// ── Boot ──────────────────────────────────────────────────────────────────────
if (IS_DEVTOOLS_PREVIEW) {
  // DevTools bridge mode — run as soon as DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDevtoolsBridge);
  } else {
    setupDevtoolsBridge();
  }
} else {
  // Normal mode — toggle via keyboard: Alt+Shift+O
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'o') {
      document.getElementById(HOST_ID) ? unmount() : mount();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}
