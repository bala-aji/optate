import { createRoot } from 'react-dom/client';
import { PanelShell } from '@/components/Panel/PanelShell';
import { SelectionProvider } from '@/lib/selection-context';
import '@/styles/content.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    // ONLY run in the top window
    if (window.self !== window.top) return;

    let ui: any = null;

    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'ACTIVATE_PANEL') {
        if (!ui) {
          mountUi();
        }
      } else if (message.type === 'DEACTIVATE_PANEL') {
        if (ui) {
          ui.remove();
          ui = null;
        }
      }
    });

    async function mountUi() {
      ui = await createShadowRootUi(ctx, {
        name: 'optate-overlay',
        position: 'inline',
        anchor: 'html',
        append: 'last',
        onMount: (container) => {
          if (!document.querySelector('#optate-font-inter')) {
            const link = document.createElement('link');
            link.id = 'optate-font-inter';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
            document.head.appendChild(link);
          }

          const root = createRoot(container);
          root.render(
            <SelectionProvider>
              <PanelShell
                onClose={() => {
                  ui?.remove();
                  ui = null;
                  browser.runtime.sendMessage({ type: 'PANEL_CLOSED_INTERNALLY' });
                }}
                initiallyOpen={true}
              />
            </SelectionProvider>
          );
          return root;
        },
        onRemove: (root) => {
          root?.unmount();
        },
      });
      ui.mount();
    }
  },
});
