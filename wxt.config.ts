import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Optate',
    description: 'Detailed design inspection and change tracking for the modern web.',
    permissions: [
      'storage',
      'contextMenus',
      'tabs',
      'activeTab',
      'scripting',
      'clipboardWrite',
      'windows'
    ],
    action: {
      default_title: 'Optate'
      // No default_popup — clicking the icon triggers action.onClicked in background.ts
    }
  }
});
