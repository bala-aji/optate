import React, { useState } from 'react';
import { Search, ChevronDown, Home, Layers as LayersIcon, Image as ImageIcon, FileText, Monitor, Tablet, Smartphone } from 'lucide-react';
import { DOMTreeNode } from './DOMTreeNode';
import { useSelection } from '@/lib/selection-context';

type PanelTab = 'pages' | 'layers' | 'assets';

export const LayersPanel: React.FC = () => {
  const { isLeftPanelOpen } = useSelection();
  const [activeTab, setActiveTab] = useState<PanelTab>('layers');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isLeftPanelOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: '12px',
        left: '12px',
        bottom: '12px',
        width: '280px',
        background: 'rgba(18, 18, 18, 0.75)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2147483640,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#e5e7eb',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        overflow: 'hidden',
      }}
    >
      {/* Header / Tabs */}
      <div className="optate-p-3 optate-border-b optate-border-white/5">
        <div className="optate-flex optate-bg-white/5 optate-p-1 optate-rounded-xl optate-gap-1">
          <TabButton 
            active={activeTab === 'pages'} 
            onClick={() => setActiveTab('pages')}
            label="Pages"
            icon={<FileText size={12} />}
          />
          <TabButton 
            active={activeTab === 'layers'} 
            onClick={() => setActiveTab('layers')}
            label="Layers"
            icon={<LayersIcon size={12} />}
          />
          <TabButton 
            active={activeTab === 'assets'} 
            onClick={() => setActiveTab('assets')}
            label="Assets"
            icon={<ImageIcon size={12} />}
          />
        </div>
      </div>

      {/* Page Selector */}
      <div className="optate-px-3 optate-pt-3 optate-pb-2">
        <div className="optate-flex optate-items-center optate-justify-between optate-bg-white/[0.03] optate-border optate-border-white/5 optate-p-2.5 optate-rounded-xl optate-cursor-pointer optate-hover:bg-white/[0.08] optate-transition-all optate-group">
          <div className="optate-flex optate-items-center optate-gap-2.5">
            <div className="optate-w-6 optate-h-6 optate-rounded-lg optate-bg-blue-500/20 optate-flex optate-items-center optate-justify-center">
              <Home size={13} className="optate-text-blue-400" />
            </div>
            <span className="optate-text-[13px] optate-font-semibold optate-tracking-tight">Home Page</span>
          </div>
          <ChevronDown size={14} className="optate-text-white/20 optate-group-hover:optate-text-white/40 optate-transition-colors" />
        </div>
      </div>

      {/* Search */}
      <div className="optate-px-3 optate-pb-3">
        <div className="optate-flex optate-items-center optate-bg-black/20 optate-border optate-border-white/5 optate-p-2 optate-rounded-xl focus-within:optate-border-blue-500/50 focus-within:optate-ring-1 focus-within:optate-ring-blue-500/20 optate-transition-all">
          <Search size={14} className="optate-text-white/30 optate-mr-2" />
          <input 
            type="text"
            placeholder="Search layers..."
            className="optate-bg-transparent optate-border-none optate-outline-none optate-text-[12px] optate-w-full optate-text-white placeholder:optate-text-white/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="optate-flex-1 optate-overflow-y-auto optate-px-1">
        {activeTab === 'layers' && (
          <div className="optate-flex optate-flex-col">
             {/* Root body element as the start point */}
             <DOMTreeNode element={document.body} depth={0} />
          </div>
        )}
        
        {activeTab === 'pages' && <PagesTab />}

        {activeTab === 'assets' && <AssetsTab />}
      </div>

      {/* Breakpoints Footer (like in reference) */}
      <div className="optate-p-2 optate-border-t optate-border-white/5 optate-bg-stone-900/50">
        <div className="optate-flex optate-flex-col optate-gap-1">
           <BreakpointItem icon={<Monitor size={12}/>} name="Desktop" value="Primary" active />
           <BreakpointItem icon={<Tablet size={12}/>} name="Tablet" value="1199 — 810" />
           <BreakpointItem icon={<Smartphone size={12}/>} name="Phone" value="809 — 0" />
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string, icon: React.ReactNode }> = ({ active, onClick, label, icon }) => (
  <button 
    onClick={onClick}
    className={`
      optate-flex-1 optate-py-1.5 optate-flex optate-items-center optate-justify-center optate-gap-1.5 optate-text-[11px] optate-font-semibold optate-rounded-lg optate-transition-all optate-border-none optate-cursor-pointer
      ${active 
        ? 'optate-bg-white/10 optate-text-white optate-shadow-[0_2px_10px_rgba(0,0,0,0.2)]' 
        : 'optate-text-white/40 optate-hover:text-white/70 optate-hover:bg-white/[0.02]'}
    `}
  >
    {icon}
    {label}
  </button>
);

const BreakpointItem: React.FC<{ icon: React.ReactNode, name: string, value: string, active?: boolean }> = ({ icon, name, value, active }) => (
  <div className={`
    optate-flex optate-items-center optate-justify-between optate-p-2 optate-rounded-xl optate-transition-all optate-cursor-pointer
    ${active ? 'optate-bg-blue-500/10 optate-border optate-border-blue-500/20' : 'optate-hover:bg-white/5'}
  `}>
    <div className="optate-flex optate-items-center optate-gap-2.5">
      <div className={active ? 'optate-text-blue-400' : 'optate-text-white/30'}>
        {icon}
      </div>
      <span className={`optate-text-[11px] optate-font-medium ${active ? 'optate-text-blue-400' : 'optate-text-white/60'}`}>
        {name}
      </span>
    </div>
    <span className={`optate-text-[9px] optate-font-bold optate-px-1.5 optate-py-0.5 optate-rounded-md ${active ? 'optate-bg-blue-500/20 optate-text-blue-400' : 'optate-bg-white/5 optate-text-white/20'}`}>
      {value}
    </span>
  </div>
);

const PagesTab: React.FC = () => {
  const [links, setLinks] = useState<{ text: string, href: string, element: HTMLElement }[]>([]);
  const { setSelectedElement, setIsEditing } = useSelection();

  useEffect(() => {
    const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim() || 'Untitled Link',
      href: a.getAttribute('href') || '#',
      element: a as HTMLElement
    })).filter(l => l.text.length > 0);
    setLinks(allLinks);
  }, []);

  return (
    <div className="optate-flex optate-flex-col optate-gap-1 optate-py-2">
      {links.length === 0 ? (
        <div className="optate-p-8 optate-text-center optate-text-white/20 optate-text-[11px]">No links found on this page.</div>
      ) : (
        links.map((link, i) => (
          <div 
            key={i} 
            className="optate-px-3 optate-py-2 optate-mx-1 optate-rounded-lg optate-hover:bg-white/5 optate-cursor-pointer optate-group"
            onClick={() => {
              setSelectedElement(link.element);
              setIsEditing(true);
              link.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            <div className="optate-text-[12px] optate-font-medium optate-text-white/80 group-hover:optate-text-white">{link.text}</div>
            <div className="optate-text-[10px] optate-text-white/30 optate-truncate">{link.href}</div>
          </div>
        ))
      )}
    </div>
  );
};

const AssetsTab: React.FC = () => {
  const [assets, setAssets] = useState<{ type: string, src: string, element: HTMLElement }[]>([]);
  const { setSelectedElement, setIsEditing } = useSelection();

  useEffect(() => {
    const images = Array.from(document.querySelectorAll('img')).map(img => ({
      type: 'Image',
      src: img.src,
      element: img as HTMLElement
    }));
    
    const svgs = Array.from(document.querySelectorAll('svg')).map(svg => ({
      type: 'SVG',
      src: 'Vector Graphic',
      element: svg as unknown as HTMLElement
    }));

    setAssets([...images, ...svgs]);
  }, []);

  return (
    <div className="optate-grid optate-grid-cols-2 optate-gap-2 optate-p-3">
      {assets.length === 0 ? (
        <div className="optate-col-span-2 optate-p-8 optate-text-center optate-text-white/20 optate-text-[11px]">No assets found.</div>
      ) : (
        assets.map((asset, i) => (
          <div 
            key={i} 
            className="optate-bg-white/5 optate-border optate-border-white/5 optate-rounded-xl optate-p-2 optate-cursor-pointer optate-hover:bg-white/10 optate-transition-all optate-group"
            onClick={() => {
              setSelectedElement(asset.element);
              setIsEditing(true);
              asset.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            <div className="optate-aspect-square optate-bg-black/20 optate-rounded-lg optate-mb-2 optate-overflow-hidden optate-flex optate-items-center optate-justify-center">
              {asset.type === 'Image' ? (
                <img src={asset.src} className="optate-max-w-full optate-max-h-full optate-object-contain" alt="" />
              ) : (
                <div className="optate-text-white/20"><ImageIcon size={24} /></div>
              )}
            </div>
            <div className="optate-text-[10px] optate-font-bold optate-text-white/40 optate-uppercase optate-tracking-wider">{asset.type}</div>
          </div>
        ))
      )}
    </div>
  );
};
