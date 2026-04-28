import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, ExternalLink, Copy, Check } from 'lucide-react';
import { DOMTreeNode } from './DOMTreeNode';
import { useSelection } from '@/lib/selection-context';

// ── React fiber helpers ───────────────────────────────────────────────────────

function getReactFiber(el: Element): any {
  const key = Object.keys(el).find(
    k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
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

function getComponentChain(fiber: any): string[] {
  const chain: string[] = [];
  let f = fiber;
  while (f && chain.length < 5) {
    if (typeof f.type === 'function') {
      const n = f.type.displayName || f.type.name || '';
      if (n && !chain.includes(n)) chain.push(n);
    }
    f = f.return;
  }
  return chain;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SourceInfo {
  file: string;
  line: number;
  classes: string[];
  editorUrl: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isTailwind(cls: string) {
  return /^(flex|grid|block|inline|hidden|text-|bg-|p-|px-|py-|m-|mx-|my-|w-|h-|border|rounded|shadow|font-|items-|justify-|gap-|space-|overflow|z-|fixed|absolute|relative|sticky|top-|bottom-|left-|right-|col-|row-|min-|max-|aspect-|opacity-|transition|duration-|ease-|animate-|scale-|rotate-|translate-|skew-|cursor-|select-|pointer-|tracking-|leading-|whitespace-|truncate|sr-|not-|group|peer|ring|outline|decoration|divide|place-|content-|self-|order-|grow|shrink|basis|float|clear|object-|fill-|stroke-)/.test(cls);
}

// ── Main component ────────────────────────────────────────────────────────────

export const LayersPanel: React.FC = () => {
  const { isLeftPanelOpen, searchQuery, setSearchQuery } = useSelection();

  // Never show inside the DevTools preview iframe
  if (typeof window !== 'undefined' && window.name === '__optate_devtools') return null;
  if (!isLeftPanelOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '12px',
        left: '12px',
        bottom: '12px',
        width: '272px',
        background: 'rgba(11, 11, 13, 0.94)',
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
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 10px 8px',
        borderBottom: '0.5px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '2px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'rgba(148,163,184,0.55)',
          }}>
            Inspector
          </span>
          <NodeCountBadge />
        </div>

        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.07)',
          borderRadius: '7px',
          padding: '6px 9px',
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
            <div onClick={() => setSearchQuery('')} style={{ cursor: 'pointer', display: 'flex' }}>
              <X size={11} style={{ color: 'rgba(100,116,139,0.5)' }} />
            </div>
          )}
        </div>
      </div>

      {/* ── DOM Tree ───────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '4px 0 4px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.06) transparent',
        minHeight: 0,
      }}>
        {typeof document !== 'undefined' && (
          <DOMTreeNode element={document.body} depth={0} />
        )}
      </div>

      {/* ── Inspector section ──────────────────────────────────────── */}
      <InspectorSection />
    </div>
  );
};

// ── Inspector section (bottom pane) ──────────────────────────────────────────

const InspectorSection: React.FC = () => {
  const { selectedElement } = useSelection();
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch source info when element changes
  useEffect(() => {
    if (!selectedElement) { setSourceInfo(null); return; }

    const fiber = getReactFiber(selectedElement);
    const debug = getDebugSource(fiber);
    const componentChain = getComponentChain(fiber);

    const params = new URLSearchParams();
    if (debug?.fileName) {
      params.set('file', debug.fileName);
      params.set('line', String(debug.lineNumber ?? 1));
    } else if (componentChain[0]) {
      params.set('component', componentChain[0]);
    }

    if (!params.toString()) { setSourceInfo(null); return; }

    setLoadingSource(true);
    fetch(`/__optate/source?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (data && !data.error) {
          setSourceInfo({
            file: data.file,
            line: data.line,
            classes: data.classes || [],
            editorUrl: data.editorUrl,
          });
        } else {
          setSourceInfo(null);
        }
      })
      .catch(() => setSourceInfo(null))
      .finally(() => setLoadingSource(false));
  }, [selectedElement]);

  if (!selectedElement) return (
    <div style={{
      padding: '10px 12px',
      borderTop: '0.5px solid rgba(255,255,255,0.05)',
      fontSize: '11px',
      color: 'rgba(100,116,139,0.4)',
      textAlign: 'center',
      fontStyle: 'italic',
    }}>
      Click any element to inspect
    </div>
  );

  const tag = selectedElement.tagName.toLowerCase();
  const id = selectedElement.id ? `#${selectedElement.id}` : '';
  const rect = selectedElement.getBoundingClientRect();
  const allClasses = Array.from(selectedElement.classList);
  const fiber = getReactFiber(selectedElement);
  const componentChain = getComponentChain(fiber);

  const copyClasses = () => {
    navigator.clipboard.writeText(allClasses.join(' ')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div style={{
      borderTop: '0.5px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      maxHeight: '52%',
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(255,255,255,0.06) transparent',
    }}>

      {/* Header row: element selector + copy/editor buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px 6px',
        gap: '6px',
      }}>
        {/* Element selector breadcrumb */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '6px',
          padding: '4px 8px',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}>
          <span style={{ color: '#67e8f9', fontFamily: 'ui-monospace, monospace', fontSize: '11.5px', fontWeight: 500, flexShrink: 0 }}>
            &lt;{tag}
          </span>
          {id && (
            <span style={{ color: 'rgba(148,163,184,0.6)', fontFamily: 'ui-monospace, monospace', fontSize: '11px', flexShrink: 0 }}>
              {id}
            </span>
          )}
          <span style={{ color: 'rgba(100,116,139,0.5)', fontSize: '10px', flexShrink: 0 }}>·</span>
          <span style={{ color: 'rgba(100,116,139,0.5)', fontFamily: 'ui-monospace, monospace', fontSize: '11px', flexShrink: 0 }}>&gt;</span>
          <span style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: '10px',
            color: 'rgba(100,116,139,0.45)',
            fontVariantNumeric: 'tabular-nums',
            marginLeft: 'auto',
            flexShrink: 0,
          }}>
            {Math.round(rect.width)}×{Math.round(rect.height)}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {allClasses.length > 0 && (
            <ActionButton onClick={copyClasses} title="Copy classes">
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </ActionButton>
          )}
          {sourceInfo?.editorUrl && (
            <ActionButton onClick={() => window.open(sourceInfo.editorUrl, '_blank')} title="Open in editor">
              <ExternalLink size={11} />
            </ActionButton>
          )}
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: '8px' }}>

        {/* COMPONENT */}
        <Section label="Component">
          {componentChain.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {componentChain.map((name, i) => (
                <Chip key={i} color="purple">{name}</Chip>
              ))}
            </div>
          ) : (
            <EmptyText>Unknown component</EmptyText>
          )}
        </Section>

        {/* FILE */}
        <Section label="File">
          {loadingSource ? (
            <EmptyText>Loading…</EmptyText>
          ) : sourceInfo ? (
            <div
              onClick={() => window.open(sourceInfo.editorUrl, '_blank')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: '6px',
                padding: '5px 8px',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            >
              <ExternalLink size={11} style={{ color: 'rgba(100,116,139,0.6)', flexShrink: 0 }} />
              <span style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: '11px',
                color: 'rgba(148,163,184,0.75)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                flex: 1,
              }}>
                {sourceInfo.file}
              </span>
              <span style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: '10px',
                color: 'rgba(100,116,139,0.5)',
                flexShrink: 0,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {sourceInfo.line}
              </span>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.02)',
              border: '0.5px solid rgba(255,255,255,0.05)',
              borderRadius: '6px',
              padding: '5px 8px',
            }}>
              <ExternalLink size={11} style={{ color: 'rgba(100,116,139,0.3)', flexShrink: 0 }} />
              <span style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: '11px',
                color: 'rgba(100,116,139,0.35)',
                fontStyle: 'italic',
              }}>
                Source not found
              </span>
            </div>
          )}
        </Section>

        {/* CLASSES */}
        {allClasses.length > 0 && (
          <Section label={`Classes (${allClasses.length})`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {allClasses.map((cls, i) => (
                <Chip key={i} color={isTailwind(cls) ? 'cyan' : 'gray'}>{cls}</Chip>
              ))}
            </div>
          </Section>
        )}

      </div>
    </div>
  );
};

// ── Tiny shared sub-components ────────────────────────────────────────────────

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ padding: '6px 10px 4px' }}>
    <div style={{
      fontSize: '9.5px',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'rgba(100,116,139,0.5)',
      marginBottom: '5px',
    }}>
      {label}
    </div>
    {children}
  </div>
);

const Chip: React.FC<{ children: string; color: 'cyan' | 'purple' | 'gray' }> = ({ children, color }) => {
  const styles = {
    cyan:   { bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.2)',   text: 'rgba(103,232,249,0.85)' },
    purple: { bg: 'rgba(139,92,246,0.1)',   border: 'rgba(139,92,246,0.25)', text: 'rgba(196,181,253,0.85)' },
    gray:   { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', text: 'rgba(148,163,184,0.65)' },
  };
  const s = styles[color];
  return (
    <span style={{
      fontSize: '10px',
      fontFamily: 'ui-monospace, monospace',
      padding: '2px 6px',
      borderRadius: '4px',
      background: s.bg,
      border: `0.5px solid ${s.border}`,
      color: s.text,
      whiteSpace: 'nowrap',
      maxWidth: '200px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'inline-block',
    }}>
      {children}
    </span>
  );
};

const EmptyText: React.FC<{ children: string }> = ({ children }) => (
  <span style={{ fontSize: '11px', color: 'rgba(100,116,139,0.45)', fontStyle: 'italic' }}>
    {children}
  </span>
);

const ActionButton: React.FC<{ onClick: () => void; title: string; children: React.ReactNode }> = ({ onClick, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '26px',
      height: '26px',
      background: 'rgba(255,255,255,0.05)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: '6px',
      cursor: 'pointer',
      color: 'rgba(148,163,184,0.7)',
      padding: 0,
      transition: 'background 0.1s, color 0.1s',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
      (e.currentTarget as HTMLButtonElement).style.color = '#fff';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(148,163,184,0.7)';
    }}
  >
    {children}
  </button>
);

const NodeCountBadge: React.FC = () => {
  const [count, setCount] = useState(0);
  useEffect(() => { setCount(document.querySelectorAll('*').length); }, []);
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
