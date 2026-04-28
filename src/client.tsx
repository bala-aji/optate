import { createRoot } from 'react-dom/client';
import { PanelShell } from '../components/Panel/PanelShell';
import { SelectionProvider } from '../lib/selection-context';
import styles from '../styles/content.css?inline';

const HOST_ID = 'optate-host';

// ── DevTools augmented mode detection ────────────────────────────────────────
// When running inside the /__optate/devtools iframe:
//   - The Optate editor panel mounts NORMALLY (editing still works)
//   - Additionally: hover/click events are bridged to the devtools right pane
//     via postMessage so the source inspector can update in real time
//
// Detection: window.name === '__optate_devtools' (set on the iframe element,
// persists across all in-app navigations) or postMessage activation.
let devtoolsAugmented =
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
  if (window.parent === window) return; // not in an iframe
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

// ── Augmented bridge listeners ────────────────────────────────────────────────
// These run alongside the normal panel — they only add postMessage side-effects.
let bridgeListenersAttached = false;

function attachBridgeListeners() {
  if (bridgeListenersAttached) return;
  bridgeListenersAttached = true;

  let lastHovered: Element | null = null;

  // Hover → update devtools overlay + right pane preview
  document.addEventListener('mouseover', (e) => {
    if (!devtoolsAugmented) return;
    const el = e.target as Element;
    if (el === lastHovered) return;
    lastHovered = el;
    sendElementInfo('hover', el);
  }, true);

  document.addEventListener('mouseout', (e) => {
    if (!devtoolsAugmented) return;
    if (e.target === lastHovered) {
      lastHovered = null;
      window.parent.postMessage({ type: 'optate:element', event: 'hover', rect: null, label: '' }, '*');
    }
  }, true);

  // Click → update devtools source panel (but DON'T preventDefault — panel works normally)
  document.addEventListener('click', (e) => {
    if (!devtoolsAugmented) return;
    sendElementInfo('select', e.target as Element);
  }, true);
}

// ── postMessage listener — devtools parent activates augmented mode ───────────
window.addEventListener('message', (e) => {
  if (e.data?.type === 'optate:devtools-mode') {
    if (e.data.enabled && !devtoolsAugmented) {
      devtoolsAugmented = true;
      attachBridgeListeners();
    } else if (!e.data.enabled) {
      devtoolsAugmented = false;
    }
    // Confirm ready
    if (e.data.enabled) {
      window.parent.postMessage({ type: 'optate:bridge-ready' }, '*');
    }
  }
});

// ── Normal panel mount/unmount ────────────────────────────────────────────────
function mount() {
  // Allow mounting in the devtools iframe; block all other iframes
  if (!devtoolsAugmented && window.self !== window.top) return;
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

(window as any).optateMount   = mount;
(window as any).optateUnmount = unmount;

// ── Boot ──────────────────────────────────────────────────────────────────────
if (devtoolsAugmented) {
  // Inside devtools iframe: mount the panel normally AND attach bridge listeners
  // so the right pane inspector updates as you interact with elements
  attachBridgeListeners();
  const boot = () => {
    mount();
    window.parent.postMessage({ type: 'optate:bridge-ready' }, '*');
  };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
} else {
  // Normal top-level mode
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'o') {
      document.getElementById(HOST_ID) ? unmount() : mount();
    }
  });
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', mount)
    : mount();
}
