import { useState, useEffect } from 'react';
import { Settings, Layout, Clipboard, Info, Globe, Shield } from 'lucide-react';
import { browser } from 'wxt/browser';
import '@/styles/content.css';

function App() {
  const [panelPosition, setPanelPosition] = useState('right');
  const [reportFormat, setReportFormat] = useState('detailed');

  return (
    <div className="optate-root optate-min-h-screen optate-bg-earth-bark optate-text-earth-cream optate-p-8">
      <div className="optate-max-w-2xl optate-mx-auto optate-space-y-8">
        
        {/* Header */}
        <header className="optate-flex optate-items-center optate-gap-4">
          <div className="optate-w-12 optate-h-12 optate-bg-earth-terracotta optate-rounded-xl optate-flex optate-items-center optate-justify-center shadow-lg shadow-earth-terracotta/20">
            <span className="optate-text-white optate-font-bold optate-text-2xl">O</span>
          </div>
          <div>
            <h1 className="optate-text-2xl optate-font-bold optate-tracking-tight">Optate Settings</h1>
            <p className="optate-text-earth-clay optate-text-sm">Personalize your design inspection workflow.</p>
          </div>
        </header>

        {/* Sections */}
        <div className="optate-grid optate-gap-6">
          
          <OptionSection icon={<Layout size={20} />} title="Interface">
            <div className="optate-space-y-4">
              <div className="optate-flex optate-items-center optate-justify-between">
                <div>
                  <h3 className="optate-text-sm optate-font-medium">Panel Position</h3>
                  <p className="optate-text-[10px] optate-text-earth-clay">Where the inspection panel appears on the page.</p>
                </div>
                <select 
                  value={panelPosition}
                  onChange={(e) => setPanelPosition(e.target.value)}
                  className="optate-bg-earth-loam/50 optate-border optate-border-earth-loam optate-rounded-md optate-px-3 optate-py-1.5 optate-text-xs optate-text-earth-cream optate-outline-none"
                >
                  <option value="right">Right Side</option>
                  <option value="left">Left Side</option>
                </select>
              </div>
            </div>
          </OptionSection>

          <OptionSection icon={<Clipboard size={20} />} title="Reports">
            <div className="optate-space-y-4">
              <div className="optate-flex optate-items-center optate-justify-between">
                <div>
                  <h3 className="optate-text-sm optate-font-medium">Copy Format</h3>
                  <p className="optate-text-[10px] optate-text-earth-clay">The style of the generated change report.</p>
                </div>
                <select 
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                  className="optate-bg-earth-loam/50 optate-border optate-border-earth-loam optate-rounded-md optate-px-3 optate-py-1.5 optate-text-xs optate-text-earth-cream optate-outline-none"
                >
                  <option value="detailed">Detailed (CSS + HTML)</option>
                  <option value="minimal">Minimal (CSS only)</option>
                  <option value="json">JSON Export</option>
                </select>
              </div>
            </div>
          </OptionSection>

          <OptionSection icon={<Shield size={20} />} title="Privacy & Data">
            <div className="optate-space-y-2">
              <p className="optate-text-xs optate-text-earth-clay">
                Optate runs entirely in your browser. No data is sent to external servers.
              </p>
              <button className="optate-text-xs optate-text-earth-terracotta optate-font-bold optate-hover:underline">Export local preferences</button>
            </div>
          </OptionSection>

        </div>

        {/* Footer */}
        <footer className="optate-pt-8 optate-border-t optate-border-earth-loam optate-flex optate-items-center optate-justify-between">
          <div className="optate-flex optate-items-center optate-gap-2">
            <Globe size={14} className="optate-text-earth-clay" />
            <span className="optate-text-[10px] optate-text-earth-clay optate-uppercase optate-tracking-widest">Build 1.0.0-alpha</span>
          </div>
          <p className="optate-text-[10px] optate-text-earth-clay">Designed with love for creators.</p>
        </footer>
      </div>
    </div>
  );
}

const OptionSection: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="optate-p-6 optate-bg-earth-loam/10 optate-border optate-border-earth-loam optate-rounded-2xl optate-space-y-4">
    <div className="optate-flex optate-items-center optate-gap-3 optate-text-earth-terracotta">
      {icon}
      <h2 className="optate-text-md optate-font-bold optate-uppercase optate-tracking-wider">{title}</h2>
    </div>
    <div className="optate-pl-8">
      {children}
    </div>
  </div>
);

export default App;
