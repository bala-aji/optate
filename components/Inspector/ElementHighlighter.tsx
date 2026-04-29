import React, { useState, useEffect, useCallback } from 'react';
import { useSelection } from '@/lib/selection-context';

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
  const { hoveredElement, selectedElement, isInspecting } = useSelection();

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


  return (
    <>
      {/* Hover Highlight — pink dashed border + label */}
      {isInspecting && hoverRect && hoverInfo && hoveredElement !== selectedElement && (
        <div
          style={{
            position: 'fixed',
            top: `${hoverRect.top}px`,
            left: `${hoverRect.left}px`,
            width: `${hoverRect.width}px`,
            height: `${hoverRect.height}px`,
            border: '1.5px dashed rgba(236,72,153,0.85)',
            background: 'rgba(236,72,153,0.04)',
            pointerEvents: 'none',
            zIndex: 2147483645,
            boxSizing: 'border-box',
          }}
        >
          {/* Hover label chip — bottom-left */}
          <LabelChip
            text={hoverInfo.tagClass}
            dim={`${hoverInfo.width}×${hoverInfo.height}`}
            color="#ec4899"
            bg="linear-gradient(135deg,rgba(236,72,153,0.95),rgba(168,85,247,0.95))"
            rectHeight={hoverRect.height}
            rectBottom={hoverRect.top + hoverRect.height}
          />
        </div>
      )}

      {/* Selected Highlight — blue solid border + label */}
      {selectRect && selectInfo && (
        <>
          <div
            style={{
              position: 'fixed',
              top: `${selectRect.top}px`,
              left: `${selectRect.left}px`,
              width: `${selectRect.width}px`,
              height: `${selectRect.height}px`,
              border: '1.5px solid rgba(59,130,246,0.9)',
              background: 'rgba(59,130,246,0.05)',
              pointerEvents: 'none',
              zIndex: 2147483645,
              boxSizing: 'border-box',
            }}
          >
            {/* Corner handles */}
            {[
              { top: -3, left: -3 },
              { top: -3, right: -3 },
              { bottom: -3, left: -3 },
              { bottom: -3, right: -3 },
            ].map((pos, i) => (
              <div key={i} style={{
                position: 'absolute', ...pos,
                width: 6, height: 6,
                background: '#3b82f6',
                border: '1px solid rgba(255,255,255,0.6)',
                borderRadius: 1.5,
                pointerEvents: 'none',
              } as React.CSSProperties} />
            ))}

            {/* Selected label chip — bottom-left */}
            <LabelChip
              text={selectInfo.tagClass}
              dim={`${selectInfo.width}×${selectInfo.height}`}
              color="#60a5fa"
              bg="linear-gradient(135deg,rgba(37,99,235,0.97),rgba(59,130,246,0.97))"
              rectHeight={selectRect.height}
              rectBottom={selectRect.top + selectRect.height}
            />
          </div>

          {/* Distance Lines */}
          {hoverRect && hoveredElement !== selectedElement && (
            <DistanceLines selectRect={selectRect} hoverRect={hoverRect} />
          )}

          {/* Layout Debugger */}
          {selectedElement && <LayoutDebugger element={selectedElement} rect={selectRect} />}
        </>
      )}
    </>
  );
};

// ── Label chip — sits at bottom-left of selection/hover border ────────────────
const LabelChip: React.FC<{
  text: string;
  dim: string;
  color: string;
  bg: string;
  rectHeight: number;
  rectBottom: number;
}> = ({ text, dim, bg, rectBottom }) => {
  // Flip above the border when too close to bottom of viewport
  const CHIP_HEIGHT = 20;
  const BOTTOM_MARGIN = 80; // toolbar height
  const flipped = rectBottom + CHIP_HEIGHT + 4 > window.innerHeight - BOTTOM_MARGIN;

  return (
    <div
      style={{
        position: 'absolute',
        left: -1,
        ...(flipped
          ? { bottom: '100%', marginBottom: '3px' }
          : { top: '100%', marginTop: '3px' }),
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: bg,
        borderRadius: '4px',
        padding: '2px 7px 2px 6px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
        maxWidth: '260px',
        overflow: 'hidden',
      }}
    >
      {/* tag.class */}
      <span style={{
        fontFamily: `'SF Mono','Cascadia Code','Fira Code',ui-monospace,monospace`,
        fontSize: '11px',
        fontWeight: 600,
        color: '#fff',
        letterSpacing: '-0.01em',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
      }}>
        {text}
      </span>
      {/* dimension */}
      <span style={{
        fontFamily: `'SF Mono','Cascadia Code','Fira Code',ui-monospace,monospace`,
        fontSize: '10px',
        fontWeight: 500,
        color: 'rgba(255,255,255,0.6)',
        flexShrink: 0,
      }}>
        {dim}
      </span>
    </div>
  );
};

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
