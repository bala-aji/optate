import { useState, useEffect } from 'react';
import { MousePointer2, Settings, ExternalLink } from 'lucide-react';
import { browser } from 'wxt/browser';
import '@/styles/content.css';

function App() {
  const [isActive, setIsActive] = useState(false);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);

  useEffect(() => {
    async function checkStatus() {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab?.id) {
        setCurrentTabId(tab.id);
        const session = await browser.storage.session.get<{ activeTabs?: number[] }>('activeTabs');
        const activeTabs = session.activeTabs || [];
        setIsActive(activeTabs.includes(tab.id));
      }
    }
    checkStatus();
  }, []);

  const handleToggle = async () => {
    if (currentTabId) {
      // Send message to background to toggle
      await browser.runtime.sendMessage({ type: 'TOGGLE_PANEL_FROM_POPUP', tabId: currentTabId });
      setIsActive(!isActive);
      window.close(); // Close popup after action
    }
  };

  return (
    <div className="optate-root optate-w-[300px] optate-bg-earth-bark optate-text-earth-cream optate-overflow-hidden">
      <header className="optate-p-4 optate-border-b optate-border-earth-loam optate-flex optate-items-center optate-justify-between">
        <div className="optate-flex optate-items-center optate-gap-2">
          <div className="optate-w-8 optate-h-8 optate-bg-earth-terracotta optate-rounded-lg optate-flex optate-items-center optate-justify-center">
            <span className="optate-text-white optate-font-bold">O</span>
          </div>
          <h1 className="optate-text-lg optate-font-bold optate-tracking-tight">Optate</h1>
        </div>
        <button className="optate-p-1 optate-text-earth-clay optate-hover:text-earth-cream">
          <Settings size={18} />
        </button>
      </header>

      <main className="optate-p-6 optate-space-y-6">
        <div className="optate-text-center optate-space-y-2">
          <p className="optate-text-xs optate-text-earth-clay">
            Inspect, edit, and track changes on the current page.
          </p>
        </div>

        <button 
          onClick={handleToggle}
          className={`optate-w-full optate-py-4 optate-rounded-xl optate-flex optate-items-center optate-justify-center optate-gap-3 optate-font-bold optate-transition-all optate-shadow-lg ${
            isActive 
              ? 'optate-bg-earth-loam optate-text-earth-clay' 
              : 'optate-bg-earth-terracotta optate-text-white optate-shadow-earth-terracotta/20'
          }`}
        >
          <MousePointer2 size={20} />
          {isActive ? 'Deactivate Panel' : 'Activate Optate'}
        </button>

        <div className="optate-pt-2 optate-grid optate-grid-cols-2 optate-gap-4">
          <div className="optate-p-3 optate-bg-earth-loam/20 optate-rounded-lg optate-border optate-border-earth-loam/50 optate-text-center">
            <div className="optate-text-xl optate-font-bold optate-text-earth-terracotta">0</div>
            <div className="optate-text-[9px] optate-text-earth-clay optate-uppercase optate-font-bold optate-tracking-widest">Changes</div>
          </div>
          <div className="optate-p-3 optate-bg-earth-loam/20 optate-rounded-lg optate-border optate-border-earth-loam/50 optate-text-center">
            <div className="optate-text-xl optate-font-bold optate-text-earth-olive-light">Free</div>
            <div className="optate-text-[9px] optate-text-earth-clay optate-uppercase optate-font-bold optate-tracking-widest">Status</div>
          </div>
        </div>
      </main>

      <footer className="optate-p-3 optate-bg-earth-loam/30 optate-border-t optate-border-earth-loam optate-flex optate-justify-center">
        <a href="#" className="optate-flex optate-items-center optate-gap-1 optate-text-[10px] optate-text-earth-clay optate-hover:text-earth-terracotta optate-transition-colors">
          View Documentation <ExternalLink size={10} />
        </a>
      </footer>
    </div>
  );
}

export default App;
