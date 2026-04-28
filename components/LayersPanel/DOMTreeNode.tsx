import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useSelection } from '@/lib/selection-context';
import { shouldShowInTree } from '@/lib/dom-utils';

interface DOMTreeNodeProps {
  element: HTMLElement;
  depth: number;
}

// ── Icon helpers ──────────────────────────────────────────────────────────────

type IconKind = 'box' | 'section' | 'nav' | 'text' | 'image' | 'input' | 'iframe' | 'body';

function getIconKind(el: HTMLElement): IconKind {
  const tag = el.tagName.toLowerCase();
  if (tag === 'body') return 'body';
  if (['img', 'svg', 'canvas', 'video', 'picture'].includes(tag)) return 'image';
  if (['input', 'select', 'textarea'].includes(tag)) return 'input';
  if (['section', 'article', 'main', 'aside', 'footer'].includes(tag)) return 'section';
  if (['nav', 'header'].includes(tag)) return 'nav';
  if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'a', 'li'].includes(tag)) return 'text';
  if (tag === 'iframe') return 'iframe';
  return 'box';
}

const NodeIcon: React.FC<{ kind: IconKind; sel: boolean }> = ({ kind, sel }) => {
  const s = 12;
  const stroke = sel ? 'rgba(255,255,255,0.85)' : 'rgba(100,116,139,0.75)';
  const fill = sel ? 'rgba(255,255,255,0.08)' : 'none';

  if (kind === 'image') return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x=".7" y=".7" width="10.6" height="10.6" rx="1.5" stroke={stroke} strokeWidth="1.1"/>
      <circle cx="3.5" cy="3.7" r="1" fill={stroke}/>
      <path d="M.7 8.5 3.5 6 6 7.8 8.5 5.5 11.3 8.5" stroke={stroke} strokeWidth="1" strokeLinejoin="round"/>
    </svg>
  );

  if (kind === 'input') return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x=".7" y="3.2" width="10.6" height="5.6" rx="1.4" stroke={stroke} strokeWidth="1.1"/>
      <line x1="2.8" y1="6" x2="6.5" y2="6" stroke={stroke} strokeWidth="1" strokeLinecap="round"/>
      <line x1="8" y1="5.1" x2="8" y2="6.9" stroke={stroke} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );

  if (kind === 'section') return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x=".7" y=".7" width="10.6" height="10.6" rx="1.5" stroke={stroke} strokeWidth="1.1"/>
      <line x1=".7" y1="4" x2="11.3" y2="4" stroke={stroke} strokeWidth="1"/>
    </svg>
  );

  if (kind === 'nav') return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x=".7" y=".7" width="10.6" height="10.6" rx="1.5" stroke={stroke} strokeWidth="1.1"/>
      <line x1=".7" y1="4.5" x2="11.3" y2="4.5" stroke={stroke} strokeWidth="1"/>
      <line x1="2.5" y1="2.5" x2="5" y2="2.5" stroke={stroke} strokeWidth="1" strokeLinecap="round"/>
      <line x1="7" y1="2.5" x2="9.5" y2="2.5" stroke={stroke} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );

  if (kind === 'text') return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <line x1="2" y1="3" x2="10" y2="3" stroke={stroke} strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="6" y1="3" x2="6" y2="10" stroke={stroke} strokeWidth="1.1" strokeLinecap="round"/>
      <line x1="3.5" y1="10" x2="8.5" y2="10" stroke={stroke} strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );

  if (kind === 'iframe') return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x=".7" y=".7" width="10.6" height="10.6" rx="1.5" stroke={stroke} strokeWidth="1.1" strokeDasharray="2.5 1.5"/>
    </svg>
  );

  if (kind === 'body') return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x=".7" y=".7" width="10.6" height="10.6" rx="1.5"
        stroke={sel ? 'rgba(255,255,255,0.85)' : 'rgba(59,130,246,0.7)'}
        fill={sel ? 'rgba(255,255,255,0.08)' : 'rgba(59,130,246,0.08)'}
        strokeWidth="1.1"/>
    </svg>
  );

  // Default box (div, generic)
  return (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <rect x=".7" y=".7" width="10.6" height="10.6" rx="1.8" stroke={stroke} fill={fill} strokeWidth="1.1"/>
    </svg>
  );
};

// ── Attribute extraction ──────────────────────────────────────────────────────

function getPrimaryAttr(el: HTMLElement): { name: string; value: string } | null {
  const PRIORITY = ['id', 'class', 'src', 'href', 'type', 'name', 'placeholder'];
  for (const name of PRIORITY) {
    const val = el.getAttribute(name);
    if (val) return { name, value: val };
  }
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith('data-') && attr.value) {
      return { name: attr.name, value: attr.value };
    }
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const DOMTreeNode: React.FC<DOMTreeNodeProps> = ({ element, depth }) => {
  const {
    selectedElement, setSelectedElement,
    setHoveredElement, setIsEditing,
    searchQuery,
  } = useSelection();

  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const [children, setChildren] = useState<HTMLElement[]>([]);

  useEffect(() => {
    let filtered = Array.from(element.children)
      .filter((c): c is HTMLElement => c instanceof HTMLElement && shouldShowInTree(c));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.tagName.toLowerCase().includes(q) ||
        (c.className?.toString() || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q) ||
        (c.textContent || '').toLowerCase().includes(q)
      );
    }
    setChildren(filtered);
  }, [element, searchQuery]);

  const isSelected = selectedElement === element;
  const hasChildren = children.length > 0;
  const tag = element.tagName.toLowerCase();
  const attr = getPrimaryAttr(element);
  const iconKind = getIconKind(element);
  const indentPx = depth * 14;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: `3px 8px 3px ${indentPx + 4}px`,
          margin: '0 3px',
          borderRadius: '5px',
          cursor: 'pointer',
          background: isSelected
            ? 'rgba(59,130,246,0.16)'
            : 'transparent',
          outline: isSelected ? '0.5px solid rgba(59,130,246,0.25)' : 'none',
          transition: 'background 0.1s',
          userSelect: 'none',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedElement(element);
          setIsEditing(true);
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }}
        onMouseEnter={() => setHoveredElement(element)}
        onMouseLeave={() => setHoveredElement(null)}
      >
        {/* Expand chevron */}
        <div
          style={{
            width: '15px',
            height: '15px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '3px',
          }}
          onClick={(e) => { e.stopPropagation(); setIsExpanded(p => !p); }}
        >
          {hasChildren ? (
            <ChevronRight
              size={11}
              style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s',
                color: isSelected ? 'rgba(255,255,255,0.6)' : 'rgba(100,116,139,0.5)',
              }}
            />
          ) : (
            <div style={{
              width: '3px', height: '3px', borderRadius: '50%',
              background: 'rgba(100,116,139,0.2)',
            }} />
          )}
        </div>

        {/* Icon */}
        <div style={{ marginRight: '5px', display: 'flex', alignItems: 'center', marginTop: '1px' }}>
          <NodeIcon kind={iconKind} sel={isSelected} />
        </div>

        {/* Tag + attribute */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          minWidth: 0,
          overflow: 'hidden',
          gap: '4px',
          flex: 1,
        }}>
          {/* tag name */}
          <span style={{
            fontFamily: '"SF Mono", "Cascadia Code", "Fira Code", ui-monospace, monospace',
            fontSize: '11.5px',
            fontWeight: 500,
            color: isSelected ? '#fff' : 'rgba(226,232,240,0.9)',
            flexShrink: 0,
          }}>
            {tag}
          </span>

          {/* attr="value" */}
          {attr && (
            <span style={{
              fontFamily: '"SF Mono", "Cascadia Code", "Fira Code", ui-monospace, monospace',
              fontSize: '11px',
              color: isSelected ? 'rgba(255,255,255,0.45)' : 'rgba(100,116,139,0.7)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}>
              <span style={{ color: isSelected ? 'rgba(147,197,253,0.8)' : 'rgba(94,134,181,0.8)' }}>
                {attr.name}
              </span>
              <span style={{ color: isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(71,85,105,0.8)' }}>
                =
              </span>
              <span style={{ color: isSelected ? 'rgba(255,255,255,0.65)' : 'rgba(148,163,184,0.65)' }}>
                "{attr.value.length > 24 ? attr.value.slice(0, 24) + '…' : attr.value}"
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Vertical tree line */}
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '1px',
            left: `${indentPx + 4 + 7}px`,
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }} />
          {children.map((child, i) => (
            <DOMTreeNode key={i} element={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
