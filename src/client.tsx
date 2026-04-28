import { createRoot } from 'react-dom/client';
import { PanelShell } from '../components/Panel/PanelShell';
import { SelectionProvider } from '../lib/selection-context';
import styles from '../styles/content.css?inline';

const HOST_ID = 'optate-host';

// ── DevTools bridge mode detection ───────────────────────────────────────────
// Activated when:
//   1. window.name === '__optate_devtools'  (iframe name set by devtools page, survives navigation)
//   2. URL has ?__optate_devtools=1         (fallback / initial load)
//   3. parent sends { type: 'optate:devtools-mode', enabled: true } postMessage
let bridgeModeActive =
  window.name === '__optate_devtools' ||
  new URLSearchParams(location.search).has('__optate_devtools');

// ── React fiber helpers ───────────────────────────────────────────────────────
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
    if (typeof f.type === 'function') return f.type.displayName || f.type.name || '';
    f = f.return;
  }
  return '';
}

function getComponentChain(fiber: any): string[] {
  const chain: string[] = [];
  let f = fiber;
  while (f && chain.length < 6) {
    if (typeof f.type === 'function') {
      const n = f.type.displayName || f.type.name || '';
      if (n && !chain.includes(n)) chain.push(n);
    }
    f = f.return;
  }
  return chain;
}

function sendElementInfo(event: 'hover' | 'select', el: Element) {
  const fiber = getReactFiber(el);
  window.parent.postMessage({
    type: 'optate:element',
    event,
    tagName:        el.tagName.toLowerCase(),
    id:             el.id || '',
    classList:      Array.from(el.classList),
    inlineStyle:    (el as HTMLElement).style?.cssText || '',
    componentName:  getComponentName(fiber),
    componentChain: getComponentChain(fiber),
    debugSource:    getDebugSource(fiber),
    rect:           el.getBoundingClientRect().toJSON(),
    label:          getComponentName(fiber) || el.tagName.toLowerCase(),
  }, '*');
}

// ── Bridge listeners (set up once, checked via bridgeModeActive flag) ─────────
let bridgeListenersAttached = false;

function attachBridgeListeners() {
  if (bridgeListenersAttached) return;
  bridgeListenersAttached = true;

  let lastHovered: Element | null = null;

  document.addEventListener('mouseover', (e) => {
    if (!bridgeModeActive) return;
    const el = e.target as Element;
    if (el === lastHovered) return;
    lastHovered = el;
    sendElementInfo('hover', el);
  }, true);

  document.addEventListener('mouseout', (e) => {
    if (!bridgeModeActive) return;
    if (e.target === lastHovered) {
      lastHovered = null;
      window.parent.postMessage({ type: 'optate:element', event: 'hover', rect: null, label: '' }, '*');
    }
  }, true);

  document.addEventListener('click', (e) => {
    if (!bridgeModeActive) return;
    e.preventDefault();
    e.stopPropagation();
    sendElementInfo('select', e.target as Element);
  }, true);
}

// ── postMessage listener — devtools parent activates/deactivates bridge ────────
window.addEventListener('message', (e) => {
  if (e.data?.type === 'optate:devtools-mode') {
    const enable = !!e.data.enabled;

    if (enable && !bridgeModeActive) {
      bridgeModeActive = true;
      // Unmount the panel if it was already mounted
      unmount();
      attachBridgeListeners();
      // Confirm back to devtools
      window.parent.postMessage({ type: 'optate:bridge-ready' }, '*');
    } else if (!enable && bridgeModeActive) {
      bridgeModeActive = false;
      // Re-mount the panel
      mount();
    }
  }
  if (e.data?.type === 'optate:inspect-mode') {
    // Handled by bridge listener gate (bridgeModeActive already set)
  }
});

// ── Normal panel mount/unmount ────────────────────────────────────────────────
function mount() {
  if (bridgeModeActive) return;          // never mount in bridge mode
  if (window.self !== window.top) return; // never mount inside iframes
  if (document.getElementById(HOST_ID)) return;

  if (!document.querySelector('#optate-font-inter')) {
    const link = document.createElement('link');
    link.id   = 'optate-font-inter';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
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
        onClose={() => { root.unmount(); host.remove(); }}
        initiallyOpen={true}
      />
    </SelectionProvider>
  );
}

function unmount() {
  const host = document.getElementById(HOST_ID);
  if (host) host.remove();
}

// Expose globally
(window as any).optateMount   = mount;
(window as any).optateUnmount = unmount;

// ── Boot ──────────────────────────────────────────────────────────────────────
if (bridgeModeActive) {
  // Start in bridge mode immediately
  attachBridgeListeners();
  // Tell the devtools parent we're ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.parent.postMessage({ type: 'optate:bridge-ready' }, '*');
    });
  } else {
    window.parent.postMessage({ type: 'optate:bridge-ready' }, '*');
  }
} else {
  // Normal mode — keyboard shortcut Alt+Shift+O
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
