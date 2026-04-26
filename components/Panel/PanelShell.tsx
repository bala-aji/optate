import React, { useState, useEffect, useRef } from 'react';
import { useSelection, ViewportMode } from '@/lib/selection-context';
import { ElementSelector } from '@/components/Inspector/ElementSelector';
import { ElementHighlighter } from '@/components/Inspector/ElementHighlighter';
import { EditorPanel } from '@/components/Editor/EditorPanel';
import { LayersPanel } from '@/components/LayersPanel/LayersPanel';
import { changeTracker } from '@/lib/change-tracker';
import { overrideSheet } from '@/lib/override-sheet';
import { getUniqueSelector } from '@/lib/dom-utils';

interface PanelShellProps {
  onClose: () => void;
  initiallyOpen?: boolean;
}

export const PanelShell: React.FC<PanelShellProps> = ({ 
  onClose, 
  initiallyOpen = false,
}) => {
  const {
    isInspecting, setIsInspecting,
    selectedElement, setSelectedElement,
    hoveredElement, setHoveredElement,
    viewportMode, setViewportMode,
    isLeftPanelOpen,
    isEditing, setIsEditing,
  } = useSelection();

  const [isVisible, setIsVisible] = useState(false);
  const [changeCount, setChangeCount] = useState(0);
  const [showChanges, setShowChanges] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(375);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [triggerPos, setTriggerPos] = useState({ x: window.innerWidth - 72, y: window.innerHeight / 2 - 22 });
  const dragRef = useRef({ isDragging: false, offsetX: 0, offsetY: 0, startX: 0, startY: 0, hasDragged: false });
  const changesRef = useRef<HTMLDivElement>(null);

  // Viewport simulation — constrain body width directly (no iframe)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (viewportMode === 'desktop') {
      html.style.removeProperty('background');
      html.style.removeProperty('background-image');
      body.style.removeProperty('max-width');
      body.style.removeProperty('margin-left');
      body.style.removeProperty('margin-right');
      body.style.removeProperty('box-shadow');
      body.style.removeProperty('border-radius');
      body.style.removeProperty('min-height');
      return;
    }

    html.style.background = '#0c0c0c';
    html.style.backgroundImage = 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #0c0c0c 100%)';
    body.style.marginLeft = 'auto';
    body.style.marginRight = 'auto';
    body.style.boxShadow = '0 30px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)';
    body.style.borderRadius = viewportMode === 'mobile' ? '32px' : '12px';
    body.style.minHeight = '100vh';

    return () => {
      html.style.removeProperty('background');
      html.style.removeProperty('background-image');
      body.style.removeProperty('max-width');
      body.style.removeProperty('margin-left');
      body.style.removeProperty('margin-right');
      body.style.removeProperty('box-shadow');
      body.style.removeProperty('border-radius');
      body.style.removeProperty('min-height');
    };
  }, [viewportMode]);

  // Sync canvas width to body max-width
  useEffect(() => {
    if (viewportMode === 'desktop') return;
    document.body.style.maxWidth = `${canvasWidth}px`;
  }, [viewportMode, canvasWidth]);

   // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      
      // Undo: Cmd+Z
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        changeTracker.undo();
      }
      
      // Redo: Cmd+Shift+Z or Cmd+Y
      if ((isCmdOrCtrl && e.key.toLowerCase() === 'z' && e.shiftKey) || (isCmdOrCtrl && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        changeTracker.redo();
      }

      // Deselect / Close: Escape
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false);
          setSelectedElement(null);
        }
      }

      // Delete: Delete or Backspace (if not typing)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        // Check if user is typing in an input/textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        
        e.preventDefault();
        const parent = selectedElement.parentElement;
        if (parent) {
          const oldHtml = parent.innerHTML;
          selectedElement.remove();
          changeTracker.recordChange(parent, 'html', 'removeNode', oldHtml, parent.innerHTML);
          setSelectedElement(null);
          setIsEditing(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleViewportChange = (mode: ViewportMode) => {
    setSelectedElement(null);
    setViewportMode(mode);
    changeTracker.setViewportMode(mode);
    if (mode === 'tablet') setCanvasWidth(768);
    if (mode === 'mobile') setCanvasWidth(375);
    if (mode === 'desktop') setCanvasWidth(375);
  };

  const handleResizeStart = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = canvasWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      // Both sides resize symmetrically since content is centered
      const change = side === 'right' ? delta : -delta;
      setCanvasWidth(Math.max(320, Math.min(window.innerWidth - 40, startWidth + change)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.documentElement.style.cursor = '';
    };
    document.documentElement.style.cursor = 'ew-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Sync change count
  useEffect(() => {
    setChangeCount(changeTracker.getChanges().length);
    return changeTracker.subscribe(() => {
      setChangeCount(changeTracker.getChanges().length);
    });
  }, []);

  // Slide in animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Draggable trigger bubble
  useEffect(() => {
    if (!isCollapsed) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;
      if (Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY) > 4)
        dragRef.current.hasDragged = true;
      setTriggerPos({
        x: Math.max(0, Math.min(window.innerWidth - 48, e.clientX - dragRef.current.offsetX)),
        y: Math.max(0, Math.min(window.innerHeight - 48, e.clientY - dragRef.current.offsetY)),
      });
    };
    const onMouseUp = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;
      dragRef.current.isDragging = false;
      if (!dragRef.current.hasDragged) return;
      // Snap to nearest vertical edge
      const snapX = e.clientX < window.innerWidth / 2 ? 12 : window.innerWidth - 60;
      setTriggerPos(prev => ({ ...prev, x: snapX }));
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isCollapsed]);

  const handleClose = () => {
    setIsVisible(false);
    setSelectedElement(null);
    setShowChanges(false);
    // Reset viewport back to desktop when panel closes
    setViewportMode('desktop');
    changeTracker.setViewportMode('desktop');
    setTimeout(() => setIsCollapsed(true), 300);
  };

  const handleOpen = () => {
    setIsCollapsed(false);
    setTimeout(() => setIsVisible(true), 50);
  };

  const handleUndo = () => {
    changeTracker.undo();
  };

  const handleRedo = () => {
    changeTracker.redo();
  };

  // Close changes panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const path = e.composedPath();
      // Use composedPath() to pierce the shadow DOM boundary, since e.target is retargeted
      if (changesRef.current && !path.includes(changesRef.current)) {
        // Only close if we didn't click inside the toolbar itself (to avoid double-toggle issues)
        const isToolbarClick = path.some((node: any) => 
          node && node.id === 'optate-toolbar'
        );
        if (!isToolbarClick) {
          setShowChanges(false);
        }
      }
    };
    if (showChanges) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showChanges]);

  // Main render
  if (isCollapsed) {
    return (
      <div
        style={{
          position: 'fixed',
          left: `${triggerPos.x}px`,
          top: `${triggerPos.y}px`,
          zIndex: 2147483647,
          userSelect: 'none',
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          dragRef.current = {
            isDragging: true,
            offsetX: e.clientX - triggerPos.x,
            offsetY: e.clientY - triggerPos.y,
            startX: e.clientX,
            startY: e.clientY,
            hasDragged: false,
          };
        }}
        onClick={() => {
          if (!dragRef.current.hasDragged) handleOpen();
        }}
      >
        <TriggerBubble />
      </div>
    );
  }

  return (
    <>
      {/* Viewport resize handles — shown in tablet/mobile mode */}
      {viewportMode !== 'desktop' && (
        <>
          {/* Width label */}
          <div style={{
            position: 'fixed',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2147483646,
            pointerEvents: 'none',
            fontFamily: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`,
            fontSize: '11px',
            fontWeight: 500,
            color: 'rgba(235, 235, 245, 0.32)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {canvasWidth} px
          </div>

          {/* Left resize handle */}
          <ResizeHandle side="left" onMouseDown={(e) => handleResizeStart(e, 'left')} />

          {/* Right resize handle */}
          <ResizeHandle side="right" onMouseDown={(e) => handleResizeStart(e, 'right')} />
        </>
      )}

      <ElementSelector />
      <ElementHighlighter />
      <EditorPanel />

      {/* Bottom Toolbar */}
      <div
        id="optate-toolbar"
        style={{
          position: 'fixed',
          bottom: isVisible ? '20px' : '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2147483647,
          transition: 'bottom 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          fontFamily: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1px',
            background: 'rgba(28, 28, 30, 0.92)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: '20px',
            padding: '4px',
            boxShadow: '0 0 0 0.5px rgba(255,255,255,0.1), 0 16px 48px rgba(0,0,0,0.6)',
            pointerEvents: 'auto',
          }}
        >
          {/* Close button */}
          <ToolbarButton
            onClick={handleClose}
            tooltip="Close Optate"
            style={{ color: '#fff' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          {/* Viewport segmented control */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(118, 118, 128, 0.18)',
            borderRadius: '12px',
            padding: '2px',
            gap: '1px',
          }}>
            <ToolbarButton onClick={() => handleViewportChange('desktop')} active={viewportMode === 'desktop'} tooltip="Desktop">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 14H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8 12V14" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '-0.01em' }}>Desktop</span>
              </span>
            </ToolbarButton>
            <ToolbarButton onClick={() => handleViewportChange('tablet')} active={viewportMode === 'tablet'} tooltip="Tablet">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="13" height="15" viewBox="0 0 14 16" fill="none">
                  <rect x="1" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="7" cy="13" r="0.6" fill="currentColor"/>
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '-0.01em' }}>Tablet</span>
              </span>
            </ToolbarButton>
            <ToolbarButton onClick={() => handleViewportChange('mobile')} active={viewportMode === 'mobile'} tooltip="Mobile">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="11" height="15" viewBox="0 0 12 16" fill="none">
                  <rect x="1" y="1" width="10" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="6" cy="13" r="0.6" fill="currentColor"/>
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '-0.01em' }}>Mobile</span>
              </span>
            </ToolbarButton>
          </div>

          <ToolbarDivider />

          {/* Changes button */}
          <ToolbarButton
            onClick={() => setShowChanges(!showChanges)}
            active={showChanges}
            tooltip="View Changes"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 5H13M3 8H10M3 11H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '-0.01em' }}>Changes</span>
              {changeCount > 0 && (
                <span style={{
                  background: '#f97316',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  padding: '0 5px',
                  minWidth: '16px',
                  height: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  letterSpacing: '-0.02em',
                }}>
                  {changeCount}
                </span>
              )}
            </span>
          </ToolbarButton>

          <ToolbarDivider />

          {/* Undo */}
          <ToolbarButton onClick={handleUndo} tooltip="Undo (Ctrl+Z)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L2 8L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 8H10C12.2091 8 14 9.79086 14 12V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </ToolbarButton>

          {/* Redo */}
          <ToolbarButton onClick={handleRedo} tooltip="Redo (Ctrl+Shift+Z)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 6L14 8L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 8H6C3.79086 8 2 9.79086 2 12V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </ToolbarButton>

          {/* Help */}
          <ToolbarButton onClick={() => { setShowHelp(!showHelp); setShowChanges(false); }} active={showHelp} tooltip="Keyboard Shortcuts">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6.5 6.5C6.5 5.67 7.17 5 8 5C8.83 5 9.5 5.67 9.5 6.5C9.5 7.17 9 7.5 8.5 7.75C8.17 7.92 8 8.17 8 8.5V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="8" cy="11" r="0.5" fill="currentColor"/>
            </svg>
          </ToolbarButton>

          {/* Premium */}
          <ToolbarButton onClick={() => {}} tooltip="Optate Pro" style={{ color: '#f59e0b' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1L10.2 5.4L15 6.1L11.5 9.5L12.3 14.3L8 12L3.7 14.3L4.5 9.5L1 6.1L5.8 5.4L8 1Z"/>
            </svg>
          </ToolbarButton>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div
            style={{
              position: 'absolute',
              bottom: '62px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              background: 'rgba(28, 28, 30, 0.97)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              borderRadius: '18px',
              boxShadow: '0 0 0 0.5px rgba(255,255,255,0.1), 0 24px 64px rgba(0,0,0,0.7)',
              overflow: 'hidden',
              fontFamily: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`,
              pointerEvents: 'auto',
            }}
          >
            <HelpContent />
          </div>
        )}

        {/* Changes Panel (slides up from toolbar) */}
        {showChanges && (
          <div
            ref={changesRef}
            style={{
              position: 'absolute',
              bottom: '62px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '400px',
              maxHeight: '440px',
              background: 'rgba(28, 28, 30, 0.97)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              borderRadius: '18px',
              boxShadow: '0 0 0 0.5px rgba(255,255,255,0.1), 0 24px 64px rgba(0,0,0,0.7)',
              overflow: 'hidden',
              fontFamily: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`,
              pointerEvents: 'auto',
            }}
          >
            <ChangesContent />
          </div>
        )}
      </div>
    </>
  );
};

/* ─── Changes Content ─── */
/* ── Type → chip color ── */
const TYPE_COLOR: Record<string, string> = {
  style: 'rgba(96,165,250,0.18)',
  text:  'rgba(52,211,153,0.18)',
  image: 'rgba(249,115,22,0.18)',
  html:  'rgba(168,85,247,0.18)',
};
const TYPE_TEXT: Record<string, string> = {
  style: '#60a5fa',
  text:  '#34d399',
  image: '#f97316',
  html:  '#a855f7',
};
const VP_LABEL: Record<string, string> = { desktop: '🖥', tablet: '📱', mobile: '📲' };

const Chip: React.FC<{ label: string; bg: string; color: string }> = ({ label, bg, color }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 7px', borderRadius: '5px',
    fontSize: '10px', fontWeight: 600,
    background: bg, color, letterSpacing: '0.03em',
    flexShrink: 0,
  }}>{label}</span>
);

const ChangesContent: React.FC = () => {
  const [changes, setChanges] = useState(changeTracker.getChanges());
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'css' | 'json'>('css');
  const [applying, setApplying] = useState(false);
  const [applyResults, setApplyResults] = useState<Record<string, { status: string; file?: string; method?: string; error?: string }>>({});
  const [cursorPrompt, setCursorPrompt] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    setChanges(changeTracker.getChanges());
    return changeTracker.subscribe(() => setChanges(changeTracker.getChanges()));
  }, []);

  const getExportText = () => {
    const other = changes.filter(c => c.type !== 'style');
    if (format === 'json') return buildJSONExport(changes);
    return buildCSSExport() + (other.length ? '\n\n' + buildLogExport(other) : '');
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await fetch('/__optate/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const resultMap: Record<string, any> = {};
      (data.results ?? []).forEach((r: any) => { resultMap[r.id] = r; });
      setCursorPrompt(data.cursorPrompt ?? '');
      // Auto-copy cursor prompt to clipboard
      if (data.cursorPrompt) {
        try { await navigator.clipboard.writeText(data.cursorPrompt); } catch {}
      }
      // Auto-open each unique patched file in the editor
      const seen = new Set<string>();
      for (const r of (data.results ?? [])) {
        if (r.editorUrl && !seen.has(r.editorUrl)) {
          seen.add(r.editorUrl);
          window.open(r.editorUrl, '_self');
        }
      }
      // Clear the change tracker — applied changes are now in source files
      changeTracker.clear();
      setApplyResults(resultMap);
    } catch (err) {
      console.error('[Optate] Apply failed:', err);
    } finally {
      setApplying(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!cursorPrompt) return;
    await navigator.clipboard.writeText(cursorPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleCopy = () => {
    const text = getExportText();
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(fallback);
    } else {
      fallback();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = getExportText();
    const ext = format === 'json' ? 'json' : 'css';
    const blob = new Blob([text], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `optate-changes.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (changes.length === 0) {
    return (
      <div style={{ padding: '40px 32px', textAlign: 'center', color: 'rgba(235,235,245,0.22)', fontSize: '13px', letterSpacing: '-0.01em', lineHeight: 1.6 }}>
        No changes yet.<br/>Select and edit elements to track changes.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '10px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
      }}>
        {/* Format toggle */}
        <div style={{
          display: 'flex', background: 'rgba(118,118,128,0.18)', borderRadius: '8px',
          padding: '2px', gap: '1px', flexShrink: 0,
        }}>
          {(['css', 'json'] as const).map(f => (
            <button key={f} onClick={() => setFormat(f)} style={{
              padding: '3px 10px', fontSize: '11px', fontWeight: format === f ? 600 : 400,
              color: format === f ? 'rgba(235,235,245,0.92)' : 'rgba(235,235,245,0.4)',
              background: format === f ? 'rgba(255,255,255,0.12)' : 'transparent',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
              letterSpacing: '0.02em', textTransform: 'uppercase', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}>{f}</button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button onClick={() => changeTracker.clear()} style={{
            padding: '4px 10px', fontSize: '12px', color: 'rgba(235,235,245,0.38)',
            background: 'transparent', border: 'none', borderRadius: '7px', cursor: 'pointer',
            letterSpacing: '-0.01em', fontFamily: 'inherit',
          }}>Clear</button>
          <button onClick={handleDownload} style={{
            padding: '4px 10px', fontSize: '12px', fontWeight: 590, color: '#f97316',
            background: 'rgba(249,115,22,0.1)', border: '0.5px solid rgba(249,115,22,0.25)',
            borderRadius: '8px', cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: 'inherit',
          }}>↓ Export</button>
          <button onClick={handleCopy} style={{
            padding: '4px 13px', fontSize: '12px', fontWeight: 590, color: '#fff',
            background: copied ? 'rgba(52,199,89,0.9)' : '#f97316',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            letterSpacing: '-0.01em', transition: 'background 0.2s ease', fontFamily: 'inherit',
          }}>
            {copied ? '✓' : 'Copy'}
          </button>
          <button onClick={handleApply} disabled={applying} style={{
            padding: '4px 13px', fontSize: '12px', fontWeight: 590,
            color: '#fff',
            background: applying ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.85)',
            border: 'none', borderRadius: '8px', cursor: applying ? 'default' : 'pointer',
            letterSpacing: '-0.01em', transition: 'background 0.2s ease', fontFamily: 'inherit',
            opacity: applying ? 0.7 : 1,
          }}>
            {applying ? '…' : '⬆ Apply'}
          </button>
        </div>
      </div>

      {/* Chip cards — always shown regardless of format */}
      <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '6px' }}>
        {changes.slice().reverse().map(c => (
          <div key={c.id} style={{
            padding: '9px 11px 10px', borderRadius: '11px', marginBottom: '5px',
            background: 'rgba(255,255,255,0.035)',
            border: '0.5px solid rgba(255,255,255,0.07)',
          }}>
            {/* Chips row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <Chip
                label={c.type.toUpperCase()}
                bg={TYPE_COLOR[c.type] ?? 'rgba(255,255,255,0.1)'}
                color={TYPE_TEXT[c.type] ?? '#fff'}
              />
              {/* Component breadcrumb chain */}
              {(c.componentChain?.length ? c.componentChain : c.componentName ? [c.componentName] : []).map((name: string, i: number, arr: string[]) => (
                <React.Fragment key={name}>
                  <Chip label={name} bg="rgba(168,85,247,0.15)" color="#c084fc" />
                  {i < arr.length - 1 && (
                    <span style={{ fontSize: '9px', color: 'rgba(235,235,245,0.2)', userSelect: 'none' }}>›</span>
                  )}
                </React.Fragment>
              ))}
              <Chip label={`<${c.tagName}>`} bg="rgba(255,255,255,0.07)" color="rgba(235,235,245,0.5)" />
              <Chip
                label={VP_LABEL[c.viewportMode] ?? c.viewportMode}
                bg="rgba(255,255,255,0.05)" color="rgba(235,235,245,0.4)"
              />
              <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(235,235,245,0.22)', flexShrink: 0 }}>
                {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Property diff */}
            {c.type === 'html' ? (
              /* html — show compact text diffs, never raw HTML */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {htmlTextDiff(c.oldValue, c.newValue).slice(0, 3).map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(235,235,245,0.38)', textDecoration: 'line-through' }}>
                      {truncate(d.was, 22)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(235,235,245,0.3)' }}>→</span>
                    <span style={{ fontSize: '12px', color: 'rgba(52,211,153,0.9)', fontWeight: 500 }}>
                      {truncate(d.now, 22)}
                    </span>
                  </div>
                ))}
                {htmlTextDiff(c.oldValue, c.newValue).length === 0 && (
                  <span style={{ fontSize: '11px', color: 'rgba(235,235,245,0.3)', fontStyle: 'italic' }}>
                    HTML structure modified
                  </span>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {c.type === 'style' && (
                  <code style={{ fontSize: '11px', color: 'rgba(235,235,245,0.45)', fontFamily: `'SF Mono', ui-monospace, Menlo, monospace`, flexShrink: 0 }}>
                    {c.property}
                  </code>
                )}
                <span style={{ fontSize: '12px', color: 'rgba(235,235,245,0.38)', textDecoration: 'line-through' }}>
                  {truncate(c.oldValue, 22)}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(235,235,245,0.3)' }}>→</span>
                <span style={{ fontSize: '12px', color: 'rgba(52,211,153,0.9)', fontWeight: 500 }}>
                  {truncate(c.newValue, 22)}
                </span>
              </div>
            )}

            {/* Short path — Page > Component > element */}
            {(c.shortPath || c.readablePath || c.selector) && (
              <div style={{ marginTop: '6px' }}>
                <span style={{
                  fontSize: '10px', color: 'rgba(235,235,245,0.28)',
                  fontFamily: `'SF Mono', ui-monospace, Menlo, monospace`,
                  letterSpacing: '-0.01em',
                }}>
                  {c.shortPath || truncate(c.readablePath || c.selector, 55)}
                </span>
              </div>
            )}
            {applyResults[c.id] && (
              <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                {applyResults[c.id].status === 'patched' ? (
                  <>
                    <span style={{ fontSize: 10, color: '#34d399' }}>✓</span>
                    <code style={{ fontSize: 9.5, color: 'rgba(52,211,153,0.7)', fontFamily: `'SF Mono', ui-monospace, Menlo, monospace` }}>
                      {applyResults[c.id].file}
                    </code>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>
                      {applyResults[c.id].method}
                    </span>
                  </>
                ) : applyResults[c.id].status === 'failed' ? (
                  <span style={{ fontSize: 10, color: '#f87171' }}>✗ {applyResults[c.id].error}</span>
                ) : (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>→ change-list.json</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer hint */}
      {cursorPrompt ? (
        <div style={{ padding: '8px 10px 12px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '10px', color: 'rgba(52,211,153,0.8)', marginBottom: 4 }}>
            ✓ Cursor prompt copied to clipboard
          </div>
          <button onClick={handleCopyPrompt} style={{
            width: '100%', padding: '6px', fontSize: '11px', fontWeight: 500,
            color: promptCopied ? '#34d399' : 'rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit',
            letterSpacing: '-0.01em',
          }}>
            {promptCopied ? '✓ Copied!' : '⌘ Copy Cursor Prompt'}
          </button>
        </div>
      ) : (
        <div style={{ padding: '8px 16px 12px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(235,235,245,0.25)', lineHeight: 1.5, letterSpacing: '-0.01em' }}>
            Click ⬆ Apply to patch source files & copy Cursor prompt.
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Help Content ─── */
const HelpContent: React.FC = () => {
  const shortcuts = [
    { keys: ['Alt', 'Shift', 'O'], label: 'Toggle Optate' },
    { keys: ['⌘Z'], label: 'Undo' },
    { keys: ['⌘⇧Z'], label: 'Redo' },
    { keys: ['Esc'], label: 'Deselect / Close editor' },
    { keys: ['Delete'], label: 'Remove selected element' },
  ];

  const tips = [
    { icon: '🖱', text: 'Click any element to inspect' },
    { icon: '✏️', text: 'Click to edit → opens editor panel' },
    { icon: '📋', text: 'Copy changes to paste into AI chat' },
    { icon: '↕', text: 'Hover another element to see distance' },
  ];

  const S: React.CSSProperties = {
    fontFamily: `'SF Mono', ui-monospace, Menlo, monospace`,
    fontSize: '10px',
    fontWeight: 600,
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(235,235,245,0.7)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: '5px',
    padding: '2px 6px',
    letterSpacing: '0.01em',
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '13px 16px 10px',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        fontSize: '12px', fontWeight: 600,
        color: 'rgba(235,235,245,0.9)',
        letterSpacing: '-0.01em',
      }}>
        Keyboard Shortcuts
      </div>

      {/* Shortcuts */}
      <div style={{ padding: '8px 8px 4px' }}>
        {shortcuts.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 8px', borderRadius: '9px',
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(235,235,245,0.55)', letterSpacing: '-0.01em' }}>
              {s.label}
            </span>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              {s.keys.map((k, j) => <span key={j} style={S}>{k}</span>)}
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div style={{
        margin: '4px 8px 8px',
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
        paddingTop: '8px',
      }}>
        <div style={{
          fontSize: '10px', fontWeight: 600, color: 'rgba(235,235,245,0.3)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          padding: '0 8px 6px',
        }}>
          Tips
        </div>
        {tips.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '5px 8px', borderRadius: '9px',
          }}>
            <span style={{ fontSize: '13px', width: 18, textAlign: 'center', flexShrink: 0 }}>{t.icon}</span>
            <span style={{ fontSize: '12px', color: 'rgba(235,235,245,0.5)', letterSpacing: '-0.01em' }}>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

/** Extract text-node differences between two HTML strings. */
function htmlTextDiff(before: string, after: string): Array<{ was: string; now: string }> {
  const extractTexts = (html: string) => {
    const d = document.createElement('div');
    d.innerHTML = html;
    const texts: string[] = [];
    const walker = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const t = node.textContent?.trim();
      if (t) texts.push(t);
    }
    return texts;
  };
  const bTexts = extractTexts(before);
  const aTexts = extractTexts(after);
  const diffs: Array<{ was: string; now: string }> = [];
  const len = Math.max(bTexts.length, aTexts.length);
  for (let i = 0; i < len; i++) {
    const b = bTexts[i] ?? '';
    const a = aTexts[i] ?? '';
    if (b !== a) diffs.push({ was: b, now: a });
  }
  return diffs;
}

/** Human-readable summary of an html-type change. */
function htmlChangeSummary(c: ReturnType<typeof changeTracker.getChanges>[number]): string {
  const diffs = htmlTextDiff(c.oldValue, c.newValue);
  if (diffs.length === 0) return 'HTML structure modified (no text changes detected)';
  return diffs.map(d => `"${d.was}" → "${d.now}"`).join(', ');
}

const BREAKPOINTS = {
  desktop: null,
  tablet: '@media (min-width: 481px) and (max-width: 1024px)',
  mobile: '@media (max-width: 480px)',
} as const;

function buildSelectorBlocks(styleChanges: ReturnType<typeof changeTracker.getChanges>): string[] {
  const bySelector = new Map<string, typeof styleChanges>();
  for (const c of styleChanges) {
    if (!bySelector.has(c.selector)) bySelector.set(c.selector, []);
    bySelector.get(c.selector)!.push(c);
  }

  const blocks: string[] = [];
  for (const [selector, changes] of bySelector) {
    const { tagName, elementName, elementDescription, componentName } = changes[0];
    const elementLabel = elementDescription && elementDescription !== tagName
      ? `<${tagName}> "${elementDescription}"`
      : `<${tagName}> ${elementName}`;
    const label = componentName ? `${componentName}  ›  ${elementLabel}` : elementLabel;
    const diffs = changes.map(c => `   ${c.property}: ${c.oldValue} → ${c.newValue}`).join('\n');
    const props = changes.map(c => `  ${c.property}: ${c.newValue} !important;`).join('\n');
    blocks.push(`/* ${label}\n${diffs} */\n${selector} {\n${props}\n}`);
  }
  return blocks;
}

function buildCSSExport(): string {
  const styleChanges = changeTracker.getChanges().filter(c => c.type === 'style');
  if (!styleChanges.length) return '/* No style changes yet */';

  const url = window.location.href;
  const date = new Date().toLocaleString();

  const sections: string[] = [
    `/* Optate — ${url}`,
    `   Generated: ${date} */`,
    '',
  ];

  for (const mode of ['desktop', 'tablet', 'mobile'] as const) {
    const modeChanges = styleChanges.filter(c => c.viewportMode === mode);
    if (!modeChanges.length) continue;

    const blocks = buildSelectorBlocks(modeChanges);
    const query = BREAKPOINTS[mode];

    if (!query) {
      sections.push(...blocks);
    } else {
      sections.push(`${query} {`);
      blocks.forEach(b => sections.push(b.split('\n').map(l => `  ${l}`).join('\n')));
      sections.push('}');
    }
    sections.push('');
  }

  return sections.join('\n').trimEnd();
}

function buildLogExport(changes: any[]): string {
  if (!changes.length) return '/* No content changes */';
  return changes.map(c => {
    const path = c.readablePath || c.selector;
    const header = `/* ${c.type.toUpperCase()} — ${path} */`;
    if (c.type === 'html') {
      const summary = htmlChangeSummary(c);
      return `${header}\n/* Changes: ${summary} */`;
    }
    return `${header}\n/* Before: ${c.oldValue} */\n/* After:  ${c.newValue} */`;
  }).join('\n\n');
}

function buildJSONExport(changes: ReturnType<typeof changeTracker.getChanges>): string {
  // Group by selector — all changes to the same element collapse into one entry
  const grouped = new Map<string, {
    component: string; in: string; el: string; sel: string; vp: string;
    props: Record<string, [string, string]>;
  }>();

  for (const c of changes) {
    if (!grouped.has(c.selector)) {
      const chain: string[] = c.componentChain?.length ? c.componentChain : (c.componentName ? [c.componentName] : []);
      grouped.set(c.selector, {
        component: chain[0] ?? c.tagName,
        in: chain.slice(1).join(' › '),
        el: c.tagName,
        sel: c.selector,
        vp: c.viewportMode,
        props: {},
      });
    }
    const entry = grouped.get(c.selector)!;
    const key = c.type === 'style' ? c.property : c.type;
    if (c.type === 'html') {
      // Never store raw HTML blobs — store the text diffs instead
      const diffs = htmlTextDiff(c.oldValue, c.newValue);
      (entry.props as any)[key] = diffs.length
        ? diffs.map(d => `"${d.was}" → "${d.now}"`)
        : ['HTML structure modified'];
    } else {
      entry.props[key] = [c.oldValue, c.newValue];
    }
  }

  const payload = {
    url: window.location.href,
    changes: Array.from(grouped.values()).map(e => ({
      component: e.component,
      ...(e.in ? { in: e.in } : {}),
      el: e.el,
      sel: e.sel,
      vp: e.vp,
      props: e.props,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/* ─── Toolbar Sub-components ─── */

const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  tooltip?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ onClick, active, tooltip, style, children }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={tooltip}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '7px 10px',
        borderRadius: '11px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        background: active
          ? 'rgba(255,255,255,0.13)'
          : hovered
            ? 'rgba(255,255,255,0.07)'
            : 'transparent',
        color: active ? 'rgba(255,255,255,0.95)' : hovered ? 'rgba(255,255,255,0.7)' : 'rgba(235,235,245,0.48)',
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const ToolbarDivider: React.FC = () => (
  <div style={{
    width: '0.5px',
    height: '18px',
    background: 'rgba(255,255,255,0.09)',
    margin: '0 3px',
    flexShrink: 0,
  }} />
);

const ResizeHandle: React.FC<{
  side: 'left' | 'right';
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ side, onMouseDown }) => {
  const [hovered, setHovered] = useState(false);
  const [leftPx, setLeftPx] = useState(0);

  useEffect(() => {
    const update = () => {
      const rect = document.body.getBoundingClientRect();
      setLeftPx(side === 'left' ? rect.left - 14 : rect.right);
    };
    update();
    window.addEventListener('resize', update);
    const id = setInterval(update, 100); // keep in sync while dragging
    return () => { window.removeEventListener('resize', update); clearInterval(id); };
  }, [side]);

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        top: 0,
        bottom: '80px',
        left: `${leftPx}px`,
        width: 14,
        zIndex: 2147483646,
        cursor: 'ew-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{
        width: 4,
        height: 48,
        borderRadius: 2,
        background: hovered ? 'rgba(249,115,22,0.8)' : 'rgba(255,255,255,0.25)',
        transition: 'background 0.15s ease',
        boxShadow: hovered ? '0 0 10px rgba(249,115,22,0.5)' : 'none',
      }} />
    </div>
  );
};

const TriggerBubble: React.FC = () => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Open Optate"
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: hovered ? 'rgba(38, 38, 40, 0.98)' : 'rgba(28, 28, 30, 0.94)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        boxShadow: hovered
          ? '0 0 0 0.5px rgba(249,115,22,0.55), 0 8px 28px rgba(0,0,0,0.65), 0 0 20px rgba(249,115,22,0.12)'
          : '0 0 0 0.5px rgba(255,255,255,0.11), 0 4px 20px rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        fontFamily: `-apple-system, BlinkMacSystemFont, system-ui, sans-serif`,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="#f97316" strokeWidth="1.8"/>
        <circle cx="10" cy="10" r="3.5" fill="#f97316"/>
        <line x1="10" y1="2" x2="10" y2="0" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="10" y1="20" x2="10" y2="18" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="2" y1="10" x2="0" y2="10" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="20" y1="10" x2="18" y2="10" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </div>
  );
};
