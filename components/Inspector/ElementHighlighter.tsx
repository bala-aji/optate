import React, { useState, useEffect, useCallback } from 'react';
import { useSelection } from '@/lib/selection-context';
import { rgbToHex } from '@/lib/css-utils';

interface BoxRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ElementInfo {
  tagClass: string;
  width: number;
  height: number;
  fontSize: string;
  fontFamily: string;
  color: string;
}

function getAbsoluteBoundingRect(el: HTMLElement): BoxRect {
  const rect = el.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function getElementInfo(el: HTMLElement): ElementInfo {
  const computed = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  let tagClass = el.tagName.toLowerCase();
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    if (classes) tagClass += `.${classes}`;
  }

  return {
    tagClass,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    fontSize: computed.fontSize,
    fontFamily: computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
    color: computed.color,
  };
}

export const ElementHighlighter: React.FC = () => {
  const { hoveredElement, selectedElement, isInspecting, isEditing, setIsEditing } = useSelection();

  const [hoverRect, setHoverRect] = useState<BoxRect | null>(null);
  const [selectRect, setSelectRect] = useState<BoxRect | null>(null);
  const [hoverInfo, setHoverInfo] = useState<ElementInfo | null>(null);
  const [selectInfo, setSelectInfo] = useState<ElementInfo | null>(null);

  // Update rects on scroll/resize
  const updateRects = useCallback(() => {
    if (hoveredElement) {
      setHoverRect(getAbsoluteBoundingRect(hoveredElement));
    }
    if (selectedElement) {
      setSelectRect(getAbsoluteBoundingRect(selectedElement));
    }
  }, [hoveredElement, selectedElement]);

  useEffect(() => {
    window.addEventListener('scroll', updateRects, true);
    window.addEventListener('resize', updateRects);
    
    // Also listen to iframe scrolls for Canvas Mode
    const iframes = Array.from(document.querySelectorAll('iframe'));
    iframes.forEach(iframe => {
      try {
        iframe.contentWindow?.addEventListener('scroll', updateRects, true);
      } catch (e) {}
    });

    return () => {
      window.removeEventListener('scroll', updateRects, true);
      window.removeEventListener('resize', updateRects);
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow?.removeEventListener('scroll', updateRects, true);
        } catch (e) {}
      });
    };
  }, [updateRects]);

  useEffect(() => {
    if (hoveredElement) {
      setHoverRect(getAbsoluteBoundingRect(hoveredElement));
      setHoverInfo(getElementInfo(hoveredElement));
    } else {
      setHoverRect(null);
      setHoverInfo(null);
    }
  }, [hoveredElement]);

  useEffect(() => {
    if (selectedElement) {
      setSelectRect(getAbsoluteBoundingRect(selectedElement));
      setSelectInfo(getElementInfo(selectedElement));
    } else {
      setSelectRect(null);
      setSelectInfo(null);
    }
  }, [selectedElement]);

  // Tooltip position calculation
  const getTooltipStyle = (rect: BoxRect): React.CSSProperties => {
    const tooltipWidth = 220;
    const tooltipHeight = 140;
    let top = rect.top + rect.height + 8;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    if (top + tooltipHeight > window.innerHeight - 80) {
      top = rect.top - tooltipHeight - 8;
    }
    if (left < 8) left = 8;
    if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8;

    return { top: `${top}px`, left: `${left}px`, width: `${tooltipWidth}px` };
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  return (
    <>
      {/* Hover Highlight — green dashed border */}
      {isInspecting && hoverRect && hoveredElement !== selectedElement && (
        <div
          style={{
            position: 'fixed',
            top: `${hoverRect.top}px`,
            left: `${hoverRect.left}px`,
            width: `${hoverRect.width}px`,
            height: `${hoverRect.height}px`,
            border: '2px dashed #22c55e',
            background: 'rgba(34, 197, 94, 0.04)',
            pointerEvents: 'none',
            zIndex: 2147483645,
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Selected Highlight — solid green border */}
      {selectRect && selectInfo && (
        <>
          <div
            style={{
              position: 'fixed',
              top: `${selectRect.top}px`,
              left: `${selectRect.left}px`,
              width: `${selectRect.width}px`,
              height: `${selectRect.height}px`,
              border: '2px solid #22c55e',
              background: 'rgba(34, 197, 94, 0.06)',
              pointerEvents: 'none',
              zIndex: 2147483645,
              boxSizing: 'border-box',
            }}
          >
            {/* Corner handles */}
            {[
              { top: -4, left: -4 },
              { top: -4, right: -4 },
              { bottom: -4, left: -4 },
              { bottom: -4, right: -4 },
            ].map((pos, i) => (
              <div key={i} style={{
                position: 'absolute', ...pos,
                width: 8, height: 8,
                background: '#22c55e', borderRadius: 1, pointerEvents: 'none',
              } as React.CSSProperties} />
            ))}

            {/* Dimension badge */}
            <div style={{
              position: 'absolute', top: -4, left: '50%',
              transform: 'translateX(-50%) translateY(-100%)',
              background: '#f97316', color: '#fff', padding: '1px 6px',
              fontSize: '10px', fontFamily: `-apple-system, BlinkMacSystemFont, system-ui, sans-serif`,
              borderRadius: 3, whiteSpace: 'nowrap', pointerEvents: 'none',
              fontWeight: 600, letterSpacing: '0.02em',
            }}>
              {selectInfo.width} × {selectInfo.height}
            </div>
          </div>

          {/* Distance Lines (Feature 4) */}
          {hoverRect && hoveredElement !== selectedElement && (
            <DistanceLines selectRect={selectRect} hoverRect={hoverRect} />
          )}

          {/* Layout Debugger (Feature 11) */}
          {selectedElement && <LayoutDebugger element={selectedElement} rect={selectRect} />}

          {/* Floating info tooltip — hidden when editor panel is open */}
          {!isEditing && <div
            style={{
              position: 'fixed',
              ...getTooltipStyle(selectRect),
              background: 'rgba(28, 28, 30, 0.94)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              borderRadius: '13px',
              padding: '11px 14px',
              zIndex: 2147483646,
              pointerEvents: 'auto',
              boxShadow: '0 0 0 0.5px rgba(255,255,255,0.1), 0 12px 36px rgba(0,0,0,0.5)',
              fontFamily: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`,
            }}
          >
            {/* Tag.class */}
            <div style={{
              fontSize: '12px', fontWeight: 600, color: '#34d399',
              marginBottom: '9px', letterSpacing: '-0.01em',
            }}>
              {selectInfo.tagClass}
            </div>

            {/* Info rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <InfoRow icon="📐" label={`${selectInfo.width} × ${selectInfo.height}`} />
              <InfoRow icon="🔤" label={`${selectInfo.fontSize} ${selectInfo.fontFamily}`} />
              <InfoRow icon="color" color={selectInfo.color} label={rgbToHex(selectInfo.color)} />
            </div>

            {/* Click to edit — now functional */}
            <div
              onClick={handleEditClick}
              style={{
                marginTop: '8px', paddingTop: '8px',
                borderTop: '0.5px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '11px', color: '#34d399',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <span style={{ fontSize: '12px' }}>✏️</span> Click to edit
            </div>
          </div>}
        </>
      )}
    </>
  );
};

const InfoRow: React.FC<{
  icon: string;
  label: string;
  color?: string;
}> = ({ icon, label, color }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '11px', color: 'rgba(255,255,255,0.75)',
  }}>
    {icon === 'color' ? (
      <div style={{
        width: 12, height: 12, borderRadius: 2,
        backgroundColor: color || '#000',
        border: '1px solid rgba(255,255,255,0.2)',
        flexShrink: 0,
      }} />
    ) : (
      <span style={{ fontSize: '12px', width: 14, textAlign: 'center' }}>{icon}</span>
    )}
    <span>{label}</span>
  </div>
);

const DistanceLines: React.FC<{ selectRect: BoxRect, hoverRect: BoxRect }> = ({ selectRect, hoverRect }) => {
  const getGaps = () => {
    const gaps = [];
    
    // Vertical Gap (Selected is above Hovered)
    if (selectRect.top + selectRect.height < hoverRect.top) {
      gaps.push({
        top: selectRect.top + selectRect.height,
        left: selectRect.left + selectRect.width / 2,
        height: hoverRect.top - (selectRect.top + selectRect.height),
        width: 1,
        label: Math.round(hoverRect.top - (selectRect.top + selectRect.height))
      });
    }
    // Vertical Gap (Hovered is above Selected)
    else if (hoverRect.top + hoverRect.height < selectRect.top) {
      gaps.push({
        top: hoverRect.top + hoverRect.height,
        left: selectRect.left + selectRect.width / 2,
        height: selectRect.top - (hoverRect.top + hoverRect.height),
        width: 1,
        label: Math.round(selectRect.top - (hoverRect.top + hoverRect.height))
      });
    }

    // Horizontal Gap (Selected is left of Hovered)
    if (selectRect.left + selectRect.width < hoverRect.left) {
      gaps.push({
        top: selectRect.top + selectRect.height / 2,
        left: selectRect.left + selectRect.width,
        width: hoverRect.left - (selectRect.left + selectRect.width),
        height: 1,
        label: Math.round(hoverRect.left - (selectRect.left + selectRect.width))
      });
    }
    // Horizontal Gap (Hovered is left of Selected)
    else if (hoverRect.left + hoverRect.width < selectRect.left) {
      gaps.push({
        top: selectRect.top + selectRect.height / 2,
        left: hoverRect.left + hoverRect.width,
        width: selectRect.left - (hoverRect.left + hoverRect.width),
        height: 1,
        label: Math.round(selectRect.left - (hoverRect.left + hoverRect.width))
      });
    }

    return gaps;
  };

  const isVertical = (gap: ReturnType<typeof getGaps>[0]) => gap.width <= 2;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2147483647 }}>
      {getGaps().map((gap, i) => {
        const vertical = isVertical(gap);
        return (
          <div key={i} style={{
            position: 'absolute',
            top: gap.top,
            left: vertical ? gap.left - 1 : gap.left,
            width: vertical ? 2 : gap.width,
            height: vertical ? gap.height : 2,
            background: 'rgba(255, 59, 48, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* End caps */}
            <div style={{
              position: 'absolute',
              [vertical ? 'top' : 'left']: 0,
              width: vertical ? 6 : 1,
              height: vertical ? 1 : 6,
              background: 'rgba(255,59,48,0.9)',
              [vertical ? 'left' : 'top']: vertical ? -2 : -2,
            }} />
            <div style={{
              position: 'absolute',
              [vertical ? 'bottom' : 'right']: 0,
              width: vertical ? 6 : 1,
              height: vertical ? 1 : 6,
              background: 'rgba(255,59,48,0.9)',
              [vertical ? 'left' : 'top']: vertical ? -2 : -2,
            }} />
            {/* Label */}
            <div style={{
              background: 'rgba(255,59,48,0.95)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 600,
              padding: '1px 5px',
              borderRadius: '5px',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
              fontFamily: `-apple-system, BlinkMacSystemFont, system-ui, sans-serif`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              transform: vertical ? 'translateX(10px)' : 'translateY(-12px)',
            }}>
              {gap.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LayoutDebugger: React.FC<{ element: HTMLElement, rect: BoxRect }> = ({ element, rect }) => {
  const computed = window.getComputedStyle(element);
  const display = computed.display;
  
  if (!display.includes('flex') && !display.includes('grid')) return null;

  const children = Array.from(element.children) as HTMLElement[];
  if (children.length < 2) return null;

  return (
    <div style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height, pointerEvents: 'none', zIndex: 2147483644 }}>
      {/* Gap Overlays */}
      {children.map((child, i) => {
        if (i === children.length - 1) return null;
        const next = children[i+1];
        const r1 = child.getBoundingClientRect();
        const r2 = next.getBoundingClientRect();
        
        // Show gap if they are on same row/column
        const isHorizontal = Math.abs(r1.top - r2.top) < 10;
        const isVertical = Math.abs(r1.left - r2.left) < 10;

        if (isHorizontal && r2.left > r1.right) {
          return (
            <div key={i} style={{
              position: 'absolute',
              top: r1.top - rect.top,
              left: r1.right - rect.left,
              width: r2.left - r1.right,
              height: r1.height,
              background: 'repeating-linear-gradient(45deg, rgba(96, 165, 250, 0.1), rgba(96, 165, 250, 0.1) 5px, rgba(96, 165, 250, 0.2) 5px, rgba(96, 165, 250, 0.2) 10px)',
              borderLeft: '1px solid rgba(96, 165, 250, 0.3)',
              borderRight: '1px solid rgba(96, 165, 250, 0.3)',
            }} />
          );
        }

        if (isVertical && r2.top > r1.bottom) {
          return (
            <div key={i} style={{
              position: 'absolute',
              top: r1.bottom - rect.top,
              left: r1.left - rect.left,
              width: r1.width,
              height: r2.top - r1.bottom,
              background: 'repeating-linear-gradient(45deg, rgba(96, 165, 250, 0.1), rgba(96, 165, 250, 0.1) 5px, rgba(96, 165, 250, 0.2) 5px, rgba(96, 165, 250, 0.2) 10px)',
              borderTop: '1px solid rgba(96, 165, 250, 0.3)',
              borderBottom: '1px solid rgba(96, 165, 250, 0.3)',
            }} />
          );
        }
        return null;
      })}
    </div>
  );
};
