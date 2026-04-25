import { browser } from 'wxt/browser';

export default defineBackground(() => {
  // 1. Create Context Menu on Installation
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'inspect-element-optate',
      title: 'Inspect with Optate',
      contexts: ['all'],
    });
  });

  // 2. Handle Context Menu Click
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'inspect-element-optate' && tab?.id) {
      togglePanel(tab.id, true);
    }
  });

  // 3. Handle Extension Icon Click
  browser.action.onClicked.addListener((tab) => {
    if (tab?.id) {
      togglePanel(tab.id);
    }
  });

  // 4. Listen for internal messages
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'PANEL_CLOSED_INTERNALLY' && sender.tab?.id) {
      await deactivateInSession(sender.tab.id);
      updateIcon(sender.tab.id, false);
    }
    
    if (message.type === 'TOGGLE_PANEL_FROM_POPUP' && message.tabId) {
      togglePanel(message.tabId);
    }

    if (message.type === 'resizeWindow' && sender.tab?.windowId) {
      let width = 1200; // default for desktop
      if (message.view === 'tablet') width = 768;
      if (message.view === 'mobile') width = 375;
      
      browser.windows.update(sender.tab.windowId, {
        state: 'normal',
        width: width,
      }).catch(err => console.error("Could not resize window:", err));
    }
  });

  // Helper Function: Toggle Panel State
  async function togglePanel(tabId: number, forceOpen = false) {
    const session = await browser.storage.session.get<{ activeTabs?: number[] }>('activeTabs');
    const activeTabs = session.activeTabs || [];
    const isActive = activeTabs.includes(tabId);

    if (isActive && !forceOpen) {
      // Deactivate
      await deactivateInSession(tabId);
      browser.tabs.sendMessage(tabId, { type: 'DEACTIVATE_PANEL' }).catch(() => {});
      updateIcon(tabId, false);
    } else {
      // Activate
      if (!isActive) {
        const updatedTabs = [...activeTabs, tabId];
        await browser.storage.session.set({ activeTabs: updatedTabs });
      }
      browser.tabs.sendMessage(tabId, { type: 'ACTIVATE_PANEL', viaContextMenu: forceOpen }).catch(() => {});
      updateIcon(tabId, true);
    }
  }

  async function deactivateInSession(tabId: number) {
    const session = await browser.storage.session.get<{ activeTabs?: number[] }>('activeTabs');
    const activeTabs = session.activeTabs || [];
    const updatedTabs = activeTabs.filter((id) => id !== tabId);
    await browser.storage.session.set({ activeTabs: updatedTabs });
  }

  // Helper Function: Update Extension Icon
  function updateIcon(tabId: number, active: boolean) {
    browser.action.setTitle({
      tabId,
      title: active ? 'Optate (Active)' : 'Optate',
    });
    // icon change logic can go here
  }

  // Cleanup on tab close
  browser.tabs.onRemoved.addListener(async (tabId) => {
    await deactivateInSession(tabId);
  });
});
