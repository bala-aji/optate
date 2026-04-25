import { createRoot } from 'react-dom/client';
import { PanelShell } from '../components/Panel/PanelShell';
import { SelectionProvider } from '../lib/selection-context';
import styles from '../styles/content.css?inline';

const HOST_ID = 'optate-host';

function mount() {
  if (window.self !== window.top) return;
  if (document.getElementById(HOST_ID)) return;

  if (!document.querySelector('#optate-font-inter')) {
    const link = document.createElement('link');
    link.id = 'optate-font-inter';
    link.rel = 'stylesheet';
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

// Toggle via keyboard: Alt+Shift+O
window.addEventListener('keydown', (e) => {
  if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'o') {
    if (document.getElementById(HOST_ID)) {
      unmount();
    } else {
      mount();
    }
  }
});

// Auto-mount on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
