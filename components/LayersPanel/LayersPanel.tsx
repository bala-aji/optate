import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { DOMTreeNode } from './DOMTreeNode';
import { useSelection } from '@/lib/selection-context';

export const LayersPanel: React.FC = () => {
  const { isLeftPanelOpen, searchQuery, setSearchQuery } = useSelection();

  if (!isLeftPanelOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '12px',
        left: '12px',
        bottom: '12px',
        width: '272px',
        background: 'rgba(11, 11, 13, 0.93)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2147483640,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#e2e8f0',
        boxShadow: '0 12px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 10px 8px',
        borderBottom: '0.5px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {/* Title row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '2px',
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'rgba(148,163,184,0.55)',
          }}>
            Inspector
          </span>
          <ElementCountBadge />
        </div>

        {/* Search bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.07)',
          borderRadius: '7px',
          padding: '6px 9px',
          transition: 'border-color 0.15s',
        }}>
          <Search size={11} style={{ color: 'rgba(100,116,139,0.6)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '12px',
              color: '#e2e8f0',
              width: '100%',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          />
          {searchQuery && (
            <div
              onClick={() => setSearchQuery('')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={11} style={{ color: 'rgba(100,116,139,0.5)' }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Tree ───────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '4px 0 8px',
        // Custom scrollbar
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.06) transparent',
      }}>
        {typeof document !== 'undefined' && (
          <DOMTreeNode element={document.body} depth={0} />
        )}
      </div>

      {/* ── Selected element footer ─────────────────────────────────────── */}
      <SelectedFooter />
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const ElementCountBadge: React.FC = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(document.querySelectorAll('*').length);
  }, []);
  if (!count) return null;
  return (
    <span style={{
      fontSize: '10px',
      color: 'rgba(100,116,139,0.5)',
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.06)',
      borderRadius: '5px',
      padding: '1px 6px',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {count.toLocaleString()} nodes
    </span>
  );
};

const SelectedFooter: React.FC = () => {
  const { selectedElement } = useSelection();

  if (!selectedElement) return (
    <div style={{
      padding: '8px 12px',
      borderTop: '0.5px solid rgba(255,255,255,0.05)',
      fontSize: '10.5px',
      color: 'rgba(100,116,139,0.4)',
      textAlign: 'center',
      fontStyle: 'italic',
    }}>
      Click any element to inspect
    </div>
  );

  const tag = selectedElement.tagName.toLowerCase();
  const id = selectedElement.id ? `#${selectedElement.id}` : '';
  const cls = selectedElement.classList.length
    ? `.${Array.from(selectedElement.classList).slice(0, 2).join('.')}`
    : '';
  const rect = selectedElement.getBoundingClientRect();

  return (
    <div style={{
      padding: '8px 10px',
      borderTop: '0.5px solid rgba(255,255,255,0.05)',
      background: 'rgba(255,255,255,0.02)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '6px',
    }}>
      <span style={{
        fontFamily: '"SF Mono", "Cascadia Code", ui-monospace, monospace',
        fontSize: '10.5px',
        color: 'rgba(147,197,253,0.7)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        flex: 1,
      }}>
        {tag}{id || cls}
      </span>
      <span style={{
        fontFamily: '"SF Mono", "Cascadia Code", ui-monospace, monospace',
        fontSize: '10px',
        color: 'rgba(100,116,139,0.55)',
        flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {Math.round(rect.width)}×{Math.round(rect.height)}
      </span>
    </div>
  );
};
