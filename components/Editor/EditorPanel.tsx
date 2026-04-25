import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelection } from '@/lib/selection-context';
import { applyStyle, getComputedStyleValue, rgbToHex } from '@/lib/css-utils';
import { changeTracker } from '@/lib/change-tracker';
import { loadGoogleFont } from '@/lib/dom-utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
  'Poppins', 'Playfair Display', 'Oswald', 'Merriweather',
  'Nunito', 'Raleway', 'Work Sans',
];

const TEXT_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'label', 'li', 'td', 'th'];

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  panelBg: 'rgba(20, 20, 20, 0.92)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderFaint: '0.5px solid rgba(255,255,255,0.05)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBgFocus: 'rgba(255,255,255,0.10)',
  inputBorder: '0.5px solid rgba(255,255,255,0.10)',
  inputBorderFocus: '0.5px solid rgba(255,255,255,0.25)',
  labelColor: 'rgba(255,255,255,0.4)',
  valueColor: 'rgba(255,255,255,0.9)',
  accent: '#34d399',
  accentOrange: '#f97316',
  sectionHeaderColor: 'rgba(255,255,255,0.3)',
  radius: '8px',
  font: 'Inter, system-ui, -apple-system, sans-serif',
};

// ─── Tiny SVG icons ────────────────────────────────────────────────────────────

const Icon = ({ d, size = 14, color = 'rgba(255,255,255,0.6)' }: { d: string; size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ChevronIcon = ({ rotated }: { rotated: boolean }) => (
  <svg
    width={12} height={12} viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round"
    style={{ transform: rotated ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease', flexShrink: 0 }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const DeleteIcon = () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={13} color="rgba(255,100,100,0.8)" />;
const FlipIcon = () => <Icon d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" size={13} />;
const CloseIcon = () => <Icon d="M18 6L6 18M6 6l12 12" size={13} />;
const LinkIcon = ({ linked }: { linked: boolean }) => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={linked ? T.accent : 'rgba(255,255,255,0.35)'} strokeWidth="2" strokeLinecap="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
);

// ─── Section ──────────────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title, children, defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: T.borderFaint }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 10, fontFamily: T.font, color: T.sectionHeaderColor,
          textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
        }}
      >
        <span>{title}</span>
        <ChevronIcon rotated={!open} />
      </button>
      {open && <div style={{ padding: '4px 14px 14px' }}>{children}</div>}
    </div>
  );
};

// ─── ScrubInput ───────────────────────────────────────────────────────────────

interface ScrubInputProps {
  label: string;
  value: string;
  unit?: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: number;
  width?: number;
}

const ScrubInput: React.FC<ScrubInputProps> = ({
  label, value, unit = '', onChange, min, max, step = 1, width,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const dragRef = useRef<{ startX: number; startVal: number; active: boolean }>({ startX: 0, startVal: 0, active: false });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const numericVal = () => parseFloat(value) || 0;

  const clamp = (v: number) => {
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  const handleLabelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startVal: numericVal(), active: false };

    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 2) dragRef.current.active = true;
      if (dragRef.current.active) {
        const delta = Math.round(dx / 2) * step;
        const newVal = clamp(dragRef.current.startVal + delta);
        onChange(`${newVal}${unit}`);
      }
    };

    const onUp = () => {
      if (!dragRef.current.active) setEditing(true);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const commit = (v: string) => {
    const n = parseFloat(v);
    if (!isNaN(n)) onChange(`${clamp(n)}${unit}`);
    setEditing(false);
  };

  const displayVal = value.replace(unit, '').trim() || '0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: width ? width : '100%' }}>
      <span
        onMouseDown={handleLabelMouseDown}
        style={{
          fontSize: 10, color: T.labelColor, cursor: 'ew-resize',
          userSelect: 'none', fontFamily: T.font, lineHeight: 1,
        }}
      >
        {label}
      </span>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={editing ? draft : displayVal}
          onChange={e => setDraft(e.target.value)}
          onFocus={() => { setFocused(true); setEditing(true); setDraft(displayVal); setTimeout(() => inputRef.current?.select(), 0); }}
          onBlur={() => { setFocused(false); commit(draft); }}
          onKeyDown={e => { if (e.key === 'Enter') commit(draft); if (e.key === 'Escape') { setEditing(false); setFocused(false); } }}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: focused ? T.inputBgFocus : T.inputBg,
            border: focused ? T.inputBorderFocus : T.inputBorder,
            borderRadius: 6, padding: '4px 22px 4px 7px',
            color: T.valueColor, fontSize: 12, fontFamily: T.font,
            outline: 'none', transition: 'background 0.15s, border 0.15s',
          }}
        />
        {unit && (
          <span style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: T.labelColor, pointerEvents: 'none', fontFamily: T.font,
          }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── ColorSwatch ──────────────────────────────────────────────────────────────

interface ColorSwatchProps {
  value: string;
  onChange: (hex: string) => void;
}

const toHex = (v: string): string => {
  if (!v || v === 'transparent' || v === 'none') return '#000000';
  if (v.startsWith('#')) return v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v;
  if (v.startsWith('rgb')) {
    const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return `#${[m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('')}`;
  }
  return '#000000';
};

const ColorSwatch: React.FC<ColorSwatchProps> = ({ value, onChange }) => {
  const hex = toHex(value);
  const [draft, setDraft] = useState(hex);
  const [focused, setFocused] = useState(false);

  useEffect(() => { if (!focused) setDraft(hex); }, [hex, focused]);

  const commitHex = (v: string) => {
    const clean = v.startsWith('#') ? v : `#${v}`;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) onChange(clean);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ position: 'relative', width: 22, height: 22, flexShrink: 0 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: hex, border: T.inputBorder,
          boxSizing: 'border-box', cursor: 'pointer',
        }} />
        <input
          type="color"
          value={hex}
          onChange={e => { setDraft(e.target.value); onChange(e.target.value); }}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
        />
      </div>
      <input
        type="text"
        value={draft}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commitHex(draft); }}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commitHex(draft); }}
        style={{
          flex: 1, minWidth: 0, background: focused ? T.inputBgFocus : T.inputBg,
          border: focused ? T.inputBorderFocus : T.inputBorder,
          borderRadius: 6, padding: '4px 7px', color: T.valueColor,
          fontSize: 12, fontFamily: T.font, outline: 'none',
        }}
      />
    </div>
  );
};

// ─── Row2 ─────────────────────────────────────────────────────────────────────

interface FieldDef { label: string; value: string; unit?: string; onChange: (v: string) => void; }

const Row2: React.FC<{ a: FieldDef; b: FieldDef }> = ({ a, b }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
    <ScrubInput {...a} />
    <ScrubInput {...b} />
  </div>
);

// ─── SegmentedControl ─────────────────────────────────────────────────────────

interface SegOption { label: string; value: string }

const Segmented: React.FC<{ options: SegOption[]; value: string; onChange: (v: string) => void }> = ({
  options, value, onChange,
}) => (
  <div style={{
    display: 'flex', background: T.inputBg, border: T.inputBorder,
    borderRadius: 7, padding: 2, gap: 1,
  }}>
    {options.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        style={{
          flex: 1, padding: '4px 4px', fontSize: 11, fontFamily: T.font,
          borderRadius: 5, border: 'none', cursor: 'pointer',
          background: value === opt.value ? 'rgba(255,255,255,0.12)' : 'none',
          color: value === opt.value ? T.valueColor : T.labelColor,
          transition: 'background 0.15s, color 0.15s', fontWeight: value === opt.value ? 600 : 400,
        }}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// ─── SmallSelect ──────────────────────────────────────────────────────────────

const SmallSelect: React.FC<{ value: string; onChange: (v: string) => void; options: string[] | { label: string; value: string }[] }> = ({
  value, onChange, options,
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      background: T.inputBg, border: T.inputBorder, borderRadius: 6,
      color: T.valueColor, fontSize: 12, fontFamily: T.font,
      padding: '4px 6px', outline: 'none', width: '100%', cursor: 'pointer',
    }}
  >
    {options.map(o => {
      const v = typeof o === 'string' ? o : o.value;
      const l = typeof o === 'string' ? o : o.label;
      return <option key={v} value={v}>{l}</option>;
    })}
  </select>
);

// ─── Label ────────────────────────────────────────────────────────────────────

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, display: 'block', marginBottom: 3 }}>{children}</span>
);

// ─── IconButton ───────────────────────────────────────────────────────────────

const IconBtn: React.FC<{ onClick: () => void; title?: string; children: React.ReactNode; danger?: boolean }> = ({
  onClick, title, children, danger,
}) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.05)', border: T.border, borderRadius: 8, cursor: 'pointer',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = danger ? 'rgba(255,80,80,0.12)' : 'rgba(255,255,255,0.10)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
  >
    {children}
  </button>
);

// ─── getFiberComponentName ────────────────────────────────────────────────────

function getFiberComponentName(el: HTMLElement): string | null {
  try {
    const key = Object.keys(el).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
    if (!key) return null;
    let fiber = (el as any)[key];
    while (fiber) {
      const name = fiber.type?.displayName || fiber.type?.name;
      if (name && name !== 'div' && name !== 'span' && !/^[a-z]/.test(name)) return name;
      fiber = fiber.return;
    }
  } catch { /* ignore */ }
  return null;
}

// ─── Spacing BoxModel ────────────────────────────────────────────────────────

interface SpacingValues { top: string; right: string; bottom: string; left: string }

const BoxModelWidget: React.FC<{
  padding: SpacingValues;
  margin: SpacingValues;
  onPaddingChange: (side: keyof SpacingValues, v: string) => void;
  onMarginChange: (side: keyof SpacingValues, v: string) => void;
}> = ({ padding, margin, onPaddingChange, onMarginChange }) => {
  const [paddingLinked, setPaddingLinked] = useState(false);
  const [marginLinked, setMarginLinked] = useState(false);

  const sideStyle = (active?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
    fontSize: 10, color: T.valueColor, fontFamily: T.font,
    cursor: 'default', padding: '2px 4px', borderRadius: 3, minWidth: 28,
  });

  const SideVal: React.FC<{ val: string; onChange: (v: string) => void }> = ({ val, onChange }) => {
    const [focused, setFocused] = useState(false);
    const [draft, setDraft] = useState(val.replace('px', ''));
    useEffect(() => { if (!focused) setDraft(val.replace('px', '')); }, [val, focused]);
    return (
      <input
        value={draft}
        onFocus={() => { setFocused(true); }}
        onBlur={() => { setFocused(false); onChange(`${parseFloat(draft) || 0}px`); }}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onChange(`${parseFloat(draft) || 0}px`); }}
        style={{
          width: 36, textAlign: 'center', background: focused ? T.inputBgFocus : T.inputBg,
          border: focused ? T.inputBorderFocus : T.inputBorder, borderRadius: 4,
          color: T.valueColor, fontSize: 10, fontFamily: T.font, outline: 'none', padding: '2px 2px',
        }}
      />
    );
  };

  const numVal = (v: string) => parseFloat(v) || 0;

  const handlePadding = (side: keyof SpacingValues, v: string) => {
    if (paddingLinked) {
      (['top', 'right', 'bottom', 'left'] as (keyof SpacingValues)[]).forEach(s => onPaddingChange(s, v));
    } else {
      onPaddingChange(side, v);
    }
  };

  const handleMargin = (side: keyof SpacingValues, v: string) => {
    if (marginLinked) {
      (['top', 'right', 'bottom', 'left'] as (keyof SpacingValues)[]).forEach(s => onMarginChange(s, v));
    } else {
      onMarginChange(side, v);
    }
  };

  return (
    <div style={{ fontFamily: T.font }}>
      {/* Visual box */}
      <div style={{
        position: 'relative', border: '1.5px dashed rgba(249,115,22,0.4)', borderRadius: 6,
        padding: 8, marginBottom: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <SideVal val={margin.top} onChange={v => handleMargin('top', v)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <SideVal val={margin.left} onChange={v => handleMargin('left', v)} />
          {/* Inner padding box */}
          <div style={{
            flex: 1, border: '1.5px dashed rgba(52,211,153,0.4)', borderRadius: 4, padding: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
              <SideVal val={padding.top} onChange={v => handlePadding('top', v)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SideVal val={padding.left} onChange={v => handlePadding('left', v)} />
              <div style={{ fontSize: 9, color: T.labelColor, textAlign: 'center', lineHeight: 1 }}>content</div>
              <SideVal val={padding.right} onChange={v => handlePadding('right', v)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
              <SideVal val={padding.bottom} onChange={v => handlePadding('bottom', v)} />
            </div>
          </div>
          <SideVal val={margin.right} onChange={v => handleMargin('right', v)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <SideVal val={margin.bottom} onChange={v => handleMargin('bottom', v)} />
        </div>
        {/* Labels */}
        <div style={{ position: 'absolute', top: 2, left: 4, fontSize: 9, color: 'rgba(249,115,22,0.6)' }}>margin</div>
        <div style={{ position: 'absolute', top: 32, left: 20, fontSize: 9, color: 'rgba(52,211,153,0.6)' }}>padding</div>
      </div>
      {/* Link toggles */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        <button onClick={() => setPaddingLinked(!paddingLinked)} style={{
          display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 10, color: paddingLinked ? T.accent : T.labelColor, fontFamily: T.font,
        }}>
          <LinkIcon linked={paddingLinked} /> Link padding
        </button>
        <button onClick={() => setMarginLinked(!marginLinked)} style={{
          display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 10, color: marginLinked ? T.accentOrange : T.labelColor, fontFamily: T.font,
        }}>
          <LinkIcon linked={marginLinked} /> Link margin
        </button>
      </div>
    </div>
  );
};

// ─── Main EditorPanel ────────────────────────────────────────────────────────

export const EditorPanel: React.FC = () => {
  const { selectedElement: el, isEditing, setIsEditing, viewportMode } = useSelection();
  const [panelSide, setPanelSide] = useState<'left' | 'right'>('right');
  const [mounted, setMounted] = useState(false);

  // Slide-in on mount
  useEffect(() => {
    if (isEditing) requestAnimationFrame(() => setMounted(true));
    else setMounted(false);
  }, [isEditing]);

  // ── per-section state ──────────────────────────────────────────────────────

  // Dimensions
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [minW, setMinW] = useState('');
  const [minH, setMinH] = useState('');
  const [maxW, setMaxW] = useState('');
  const [maxH, setMaxH] = useState('');
  const [aspectLocked, setAspectLocked] = useState(false);
  const aspectRef = useRef(1);

  // Position
  const [position, setPosition] = useState('static');
  const [posLeft, setPosLeft] = useState('');
  const [posTop, setPosTop] = useState('');
  const [zIndex, setZIndex] = useState('');

  // Spacing
  const [padding, setPadding] = useState<SpacingValues>({ top: '0px', right: '0px', bottom: '0px', left: '0px' });
  const [margin, setMargin] = useState<SpacingValues>({ top: '0px', right: '0px', bottom: '0px', left: '0px' });

  // Fill
  const [bgColor, setBgColor] = useState('transparent');
  const [bgImage, setBgImage] = useState('none');
  const [bgSize, setBgSize] = useState('cover');
  const [bgPosition, setBgPosition] = useState('center');

  // Border
  const [borderWidth, setBorderWidth] = useState('0');
  const [borderStyle, setBorderStyle] = useState('solid');
  const [borderColor, setBorderColor] = useState('#000000');
  const [radiusLinked, setRadiusLinked] = useState(true);
  const [radius, setRadius] = useState({ tl: '0', tr: '0', br: '0', bl: '0' });

  // Typography
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState('16');
  const [fontWeight, setFontWeight] = useState('400');
  const [lineHeight, setLineHeight] = useState('1.5');
  const [letterSpacing, setLetterSpacing] = useState('0');
  const [textColor, setTextColor] = useState('#000000');
  const [textAlign, setTextAlign] = useState('left');
  const [textTransform, setTextTransform] = useState('none');
  const [textDecoration, setTextDecoration] = useState('none');

  // Effects
  const [opacity, setOpacity] = useState('100');
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [shadowX, setShadowX] = useState('0');
  const [shadowY, setShadowY] = useState('4');
  const [shadowBlur, setShadowBlur] = useState('8');
  const [shadowSpread, setShadowSpread] = useState('0');
  const [shadowColor, setShadowColor] = useState('#000000');
  const [backdropBlur, setBackdropBlur] = useState('0');
  const [filterBlur, setFilterBlur] = useState('0');
  const [blendMode, setBlendMode] = useState('normal');

  // Transform
  const [rotate, setRotate] = useState('0');
  const [scaleX, setScaleX] = useState('1');
  const [translateX, setTranslateX] = useState('0');
  const [translateY, setTranslateY] = useState('0');

  // ── Read computed styles on element change ────────────────────────────────

  useEffect(() => {
    if (!el) return;
    const cs = window.getComputedStyle(el);

    // Dimensions
    setWidth(cs.width || '');
    setHeight(cs.height || '');
    setMinW(cs.minWidth || '');
    setMinH(cs.minHeight || '');
    setMaxW(cs.maxWidth || '');
    setMaxH(cs.maxHeight || '');

    const w = parseFloat(cs.width) || 1;
    const h = parseFloat(cs.height) || 1;
    aspectRef.current = w / h;

    // Position
    setPosition(cs.position || 'static');
    setPosLeft(cs.left || '0px');
    setPosTop(cs.top || '0px');
    setZIndex(cs.zIndex === 'auto' ? '' : cs.zIndex || '');

    // Spacing
    setPadding({
      top: cs.paddingTop || '0px', right: cs.paddingRight || '0px',
      bottom: cs.paddingBottom || '0px', left: cs.paddingLeft || '0px',
    });
    setMargin({
      top: cs.marginTop || '0px', right: cs.marginRight || '0px',
      bottom: cs.marginBottom || '0px', left: cs.marginLeft || '0px',
    });

    // Fill
    setBgColor(cs.backgroundColor || 'transparent');
    setBgImage(cs.backgroundImage || 'none');
    setBgSize(cs.backgroundSize || 'cover');
    setBgPosition(cs.backgroundPosition || 'center');

    // Border
    setBorderWidth((parseFloat(cs.borderTopWidth) || 0).toString());
    setBorderStyle(cs.borderTopStyle || 'solid');
    setBorderColor(toHex(cs.borderTopColor || '#000000'));
    const br = cs.borderRadius || '0px';
    const bAll = parseFloat(br) || 0;
    setRadius({ tl: bAll.toString(), tr: bAll.toString(), br: bAll.toString(), bl: bAll.toString() });

    // Typography
    setFontFamily(cs.fontFamily?.split(',')[0]?.replace(/['"]/g, '').trim() || 'Inter');
    setFontSize((parseFloat(cs.fontSize) || 16).toString());
    setFontWeight(cs.fontWeight || '400');
    setLineHeight(cs.lineHeight || '1.5');
    setLetterSpacing((parseFloat(cs.letterSpacing) || 0).toString());
    setTextColor(toHex(cs.color || '#000000'));
    setTextAlign(cs.textAlign || 'left');
    setTextTransform(cs.textTransform || 'none');
    setTextDecoration(cs.textDecorationLine || 'none');

    // Effects
    setOpacity(Math.round((parseFloat(cs.opacity) || 1) * 100).toString());
    const shadow = cs.boxShadow;
    if (shadow && shadow !== 'none') {
      setShadowEnabled(true);
      const m = shadow.match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px/);
      if (m) { setShadowX(m[1]); setShadowY(m[2]); setShadowBlur(m[3]); setShadowSpread(m[4]); }
    } else {
      setShadowEnabled(false);
    }
    const bdFilter = cs.backdropFilter || '';
    const bBlurM = bdFilter.match(/blur\(([\d.]+)px\)/);
    setBackdropBlur(bBlurM ? bBlurM[1] : '0');
    const filt = cs.filter || '';
    const fBlurM = filt.match(/blur\(([\d.]+)px\)/);
    setFilterBlur(fBlurM ? fBlurM[1] : '0');
    setBlendMode(cs.mixBlendMode || 'normal');

    // Transform
    const transform = cs.transform || 'none';
    if (transform !== 'none') {
      const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
      if (matrixMatch) {
        const [a, b, c, d, e, f] = matrixMatch[1].split(',').map(Number);
        setScaleX((Math.sqrt(a * a + b * b)).toFixed(2));
        setRotate((Math.atan2(b, a) * (180 / Math.PI)).toFixed(1));
        setTranslateX(e.toFixed(0));
        setTranslateY(f.toFixed(0));
      }
    } else {
      setRotate('0'); setScaleX('1'); setTranslateX('0'); setTranslateY('0');
    }
  }, [el]);

  // ── applyProp helper ──────────────────────────────────────────────────────

  const applyProp = useCallback((prop: string, val: string) => {
    if (!el) return;
    const old = window.getComputedStyle(el).getPropertyValue(prop);
    applyStyle(el, prop, val);
    changeTracker.recordChange(el, 'style', prop, old, val);
  }, [el]);

  // ── Section handlers ──────────────────────────────────────────────────────

  // Dimensions
  const handleWidth = (v: string) => {
    setWidth(v);
    applyProp('width', v);
    if (aspectLocked) {
      const h = `${parseFloat(v) / aspectRef.current}px`;
      setHeight(h); applyProp('height', h);
    }
  };
  const handleHeight = (v: string) => {
    setHeight(v);
    applyProp('height', v);
    if (aspectLocked) {
      const w = `${parseFloat(v) * aspectRef.current}px`;
      setWidth(w); applyProp('width', w);
    }
  };

  // Position
  const handlePosition = (v: string) => { setPosition(v); applyProp('position', v); };
  const handlePosLeft = (v: string) => { setPosLeft(v); applyProp('left', v); };
  const handlePosTop = (v: string) => { setPosTop(v); applyProp('top', v); };
  const handleZIndex = (v: string) => { setZIndex(v); applyProp('z-index', v); };

  // Spacing
  const handlePaddingChange = (side: keyof SpacingValues, v: string) => {
    setPadding(p => ({ ...p, [side]: v }));
    applyProp(`padding-${side}`, v);
  };
  const handleMarginChange = (side: keyof SpacingValues, v: string) => {
    setMargin(m => ({ ...m, [side]: v }));
    applyProp(`margin-${side}`, v);
  };

  // Fill
  const handleBgColor = (v: string) => { setBgColor(v); applyProp('background-color', v); };
  const handleBgSize = (v: string) => { setBgSize(v); applyProp('background-size', v); };
  const handleBgPosition = (v: string) => { setBgPosition(v); applyProp('background-position', v); };

  // Border
  const handleBorderWidth = (v: string) => { setBorderWidth(v.replace('px', '')); applyProp('border-width', `${v.replace('px', '')}px`); };
  const handleBorderStyle = (v: string) => { setBorderStyle(v); applyProp('border-style', v); };
  const handleBorderColor = (v: string) => { setBorderColor(v); applyProp('border-color', v); };
  const handleRadius = (corner: keyof typeof radius, v: string) => {
    if (radiusLinked) {
      const newR = { tl: v, tr: v, br: v, bl: v };
      setRadius(newR);
      applyProp('border-radius', `${v}px`);
    } else {
      const newR = { ...radius, [corner]: v };
      setRadius(newR);
      applyProp('border-radius', `${newR.tl}px ${newR.tr}px ${newR.br}px ${newR.bl}px`);
    }
  };

  // Typography
  const handleFontFamily = (v: string) => {
    setFontFamily(v); loadGoogleFont(v); applyProp('font-family', `'${v}', sans-serif`);
  };
  const handleFontSize = (v: string) => { setFontSize(v.replace('px', '')); applyProp('font-size', `${v.replace('px', '')}px`); };
  const handleFontWeight = (v: string) => { setFontWeight(v); applyProp('font-weight', v); };
  const handleLineHeight = (v: string) => { setLineHeight(v); applyProp('line-height', v); };
  const handleLetterSpacing = (v: string) => { setLetterSpacing(v.replace('em', '')); applyProp('letter-spacing', `${v.replace('em', '')}em`); };
  const handleTextColor = (v: string) => { setTextColor(v); applyProp('color', v); };
  const handleTextAlign = (v: string) => { setTextAlign(v); applyProp('text-align', v); };
  const handleTextTransform = (v: string) => { setTextTransform(v); applyProp('text-transform', v); };
  const handleTextDecoration = (v: string) => { setTextDecoration(v); applyProp('text-decoration', v); };

  // Effects
  const handleOpacity = (v: string) => { setOpacity(v); applyProp('opacity', (parseFloat(v) / 100).toString()); };
  const buildShadow = (x = shadowX, y = shadowY, b = shadowBlur, s = shadowSpread, c = shadowColor) =>
    `${x}px ${y}px ${b}px ${s}px ${c}`;
  const handleShadowToggle = (checked: boolean) => {
    setShadowEnabled(checked);
    applyProp('box-shadow', checked ? buildShadow() : 'none');
  };
  const handleShadowX = (v: string) => { setShadowX(v.replace('px', '')); applyProp('box-shadow', buildShadow(v.replace('px', ''))); };
  const handleShadowY = (v: string) => { setShadowY(v.replace('px', '')); applyProp('box-shadow', buildShadow(undefined, v.replace('px', ''))); };
  const handleShadowBlur = (v: string) => { setShadowBlur(v.replace('px', '')); applyProp('box-shadow', buildShadow(undefined, undefined, v.replace('px', ''))); };
  const handleShadowSpread = (v: string) => { setShadowSpread(v.replace('px', '')); applyProp('box-shadow', buildShadow(undefined, undefined, undefined, v.replace('px', ''))); };
  const handleShadowColor = (v: string) => { setShadowColor(v); applyProp('box-shadow', buildShadow(undefined, undefined, undefined, undefined, v)); };
  const handleBackdropBlur = (v: string) => { setBackdropBlur(v.replace('px', '')); applyProp('backdrop-filter', `blur(${v.replace('px', '')}px)`); };
  const handleFilterBlur = (v: string) => { setFilterBlur(v.replace('px', '')); applyProp('filter', `blur(${v.replace('px', '')}px)`); };
  const handleBlendMode = (v: string) => { setBlendMode(v); applyProp('mix-blend-mode', v); };

  // Transform
  const buildTransform = (r = rotate, sx = scaleX, tx = translateX, ty = translateY) =>
    `rotate(${r}deg) scaleX(${sx}) translate(${tx}px, ${ty}px)`;
  const handleRotate = (v: string) => { setRotate(v.replace('deg', '')); applyProp('transform', buildTransform(v.replace('deg', ''))); };
  const handleScaleX = (v: string) => { setScaleX(v); applyProp('transform', buildTransform(undefined, v)); };
  const handleTranslateX = (v: string) => { setTranslateX(v.replace('px', '')); applyProp('transform', buildTransform(undefined, undefined, v.replace('px', ''))); };
  const handleTranslateY = (v: string) => { setTranslateY(v.replace('px', '')); applyProp('transform', buildTransform(undefined, undefined, undefined, v.replace('px', ''))); };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleClose = () => {
    setMounted(false);
    setTimeout(() => setIsEditing(false), 220);
  };

  const handleDelete = () => {
    if (!el?.parentElement) return;
    const parent = el.parentElement;
    const oldHtml = parent.innerHTML;
    el.remove();
    changeTracker.recordChange(parent, 'html', 'removeNode', oldHtml, parent.innerHTML);
    setIsEditing(false);
  };

  const handleFlip = () => setPanelSide(s => s === 'right' ? 'left' : 'right');

  // ── Derived ───────────────────────────────────────────────────────────────

  if (!isEditing || !el) return null;

  const tag = el.tagName.toLowerCase();
  const componentName = getFiberComponentName(el);
  const isTextTag = TEXT_TAGS.includes(tag);

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: 12,
    bottom: 12,
    [panelSide]: 12,
    width: 260,
    zIndex: 2147483642,
    background: T.panelBg,
    backdropFilter: 'blur(40px) saturate(180%)',
    border: T.border,
    borderRadius: 18,
    boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: T.font,
    overflow: 'hidden',
    transform: mounted ? 'translateX(0)' : `translateX(${panelSide === 'right' ? '120%' : '-120%'})`,
    transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={panelStyle}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: T.border, flexShrink: 0,
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, flexShrink: 0, boxShadow: `0 0 6px ${T.accent}` }} />
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: 12, color: T.valueColor, fontWeight: 600, fontFamily: T.font }}>
              {'<'}{tag}{'>'}
            </span>
            {componentName && (
              <span style={{ fontSize: 10, color: T.labelColor, display: 'block', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {componentName}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <IconBtn onClick={handleDelete} title="Delete element" danger>
            <DeleteIcon />
          </IconBtn>
          <IconBtn onClick={handleFlip} title="Move panel to other side">
            <FlipIcon />
          </IconBtn>
          <IconBtn onClick={handleClose} title="Close panel">
            <CloseIcon />
          </IconBtn>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* ─ Section 1: Dimensions ─ */}
        <Section title="Dimensions">
          {/* W / H with aspect lock */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 8 }}>
            <ScrubInput label="W" value={width.replace('px', '')} unit="px" onChange={handleWidth} min={0} />
            <button
              onClick={() => setAspectLocked(!aspectLocked)}
              title="Lock aspect ratio"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                marginBottom: 2, color: aspectLocked ? T.accent : T.labelColor,
              }}
            >
              <LinkIcon linked={aspectLocked} />
            </button>
            <ScrubInput label="H" value={height.replace('px', '')} unit="px" onChange={handleHeight} min={0} />
          </div>
          <Row2
            a={{ label: 'Min W', value: minW.replace('px', ''), unit: 'px', onChange: v => { setMinW(v); applyProp('min-width', v); } }}
            b={{ label: 'Min H', value: minH.replace('px', ''), unit: 'px', onChange: v => { setMinH(v); applyProp('min-height', v); } }}
          />
          <Row2
            a={{ label: 'Max W', value: maxW === 'none' ? '' : maxW.replace('px', ''), unit: 'px', onChange: v => { setMaxW(v); applyProp('max-width', v || 'none'); } }}
            b={{ label: 'Max H', value: maxH === 'none' ? '' : maxH.replace('px', ''), unit: 'px', onChange: v => { setMaxH(v); applyProp('max-height', v || 'none'); } }}
          />
        </Section>

        {/* ─ Section 2: Position ─ */}
        <Section title="Position">
          <div style={{ marginBottom: 8 }}>
            <Segmented
              value={position}
              onChange={handlePosition}
              options={[
                { label: 'Static', value: 'static' },
                { label: 'Rel', value: 'relative' },
                { label: 'Abs', value: 'absolute' },
                { label: 'Fixed', value: 'fixed' },
                { label: 'Sticky', value: 'sticky' },
              ]}
            />
          </div>
          {position !== 'static' && (
            <>
              <Row2
                a={{ label: 'X (left)', value: posLeft.replace('px', ''), unit: 'px', onChange: handlePosLeft }}
                b={{ label: 'Y (top)', value: posTop.replace('px', ''), unit: 'px', onChange: handlePosTop }}
              />
              <div style={{ marginTop: 4 }}>
                <ScrubInput label="Z-Index" value={zIndex} unit="" onChange={handleZIndex} step={1} />
              </div>
            </>
          )}
        </Section>

        {/* ─ Section 3: Spacing ─ */}
        <Section title="Spacing">
          <BoxModelWidget
            padding={padding}
            margin={margin}
            onPaddingChange={handlePaddingChange}
            onMarginChange={handleMarginChange}
          />
        </Section>

        {/* ─ Section 4: Fill & Background ─ */}
        <Section title="Fill & Background">
          <div style={{ marginBottom: 8 }}>
            <FieldLabel>Background Color</FieldLabel>
            <ColorSwatch value={bgColor} onChange={handleBgColor} />
          </div>
          {bgImage !== 'none' && (
            <>
              <div style={{ marginBottom: 8 }}>
                <FieldLabel>Background Size</FieldLabel>
                <Segmented
                  value={bgSize}
                  onChange={handleBgSize}
                  options={[{ label: 'Cover', value: 'cover' }, { label: 'Contain', value: 'contain' }, { label: 'Auto', value: 'auto' }]}
                />
              </div>
              <div>
                <FieldLabel>Position</FieldLabel>
                <input
                  value={bgPosition}
                  onChange={e => { setBgPosition(e.target.value); applyProp('background-position', e.target.value); }}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: T.inputBg, border: T.inputBorder, borderRadius: 6,
                    color: T.valueColor, fontSize: 12, fontFamily: T.font,
                    padding: '5px 8px', outline: 'none',
                  }}
                />
              </div>
            </>
          )}
        </Section>

        {/* ─ Section 5: Border ─ */}
        <Section title="Border">
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 8 }}>
            <ScrubInput label="Width" value={borderWidth} unit="px" onChange={handleBorderWidth} min={0} />
            <div style={{ flex: 1 }}>
              <FieldLabel>Style</FieldLabel>
              <SmallSelect
                value={borderStyle}
                onChange={handleBorderStyle}
                options={['none', 'solid', 'dashed', 'dotted', 'double']}
              />
            </div>
            <div style={{ flexShrink: 0 }}>
              <FieldLabel>Color</FieldLabel>
              <div style={{ position: 'relative', width: 28, height: 28 }}>
                <div style={{ width: 28, height: 28, borderRadius: 5, background: borderColor, border: T.inputBorder }} />
                <input type="color" value={borderColor} onChange={e => handleBorderColor(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
              </div>
            </div>
          </div>
          {/* Border radius */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {radiusLinked ? (
              <ScrubInput label="Radius" value={radius.tl} unit="px" onChange={v => handleRadius('tl', v.replace('px', ''))} min={0} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, flex: 1 }}>
                {([['tl', 'TL'], ['tr', 'TR'], ['bl', 'BL'], ['br', 'BR']] as [keyof typeof radius, string][]).map(([k, l]) => (
                  <ScrubInput key={k} label={l} value={radius[k]} unit="px" onChange={v => handleRadius(k, v.replace('px', ''))} min={0} />
                ))}
              </div>
            )}
            <button
              onClick={() => setRadiusLinked(!radiusLinked)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, marginTop: 16 }}
            >
              <LinkIcon linked={radiusLinked} />
            </button>
          </div>
        </Section>

        {/* ─ Section 6: Typography ─ */}
        <Section title="Typography" defaultOpen={isTextTag}>
          <div style={{ marginBottom: 8 }}>
            <FieldLabel>Font Family</FieldLabel>
            <SmallSelect value={fontFamily} onChange={handleFontFamily} options={GOOGLE_FONTS} />
          </div>
          <Row2
            a={{
              label: 'Size', value: fontSize, unit: 'px',
              onChange: v => { setFontSize(v.replace('px', '')); handleFontSize(v); },
            }}
            b={{
              label: 'Weight', value: fontWeight, unit: '',
              onChange: v => handleFontWeight(v),
            }}
          />
          <div style={{ marginBottom: 8 }}>
            <SmallSelect
              value={fontWeight}
              onChange={handleFontWeight}
              options={['100', '200', '300', '400', '500', '600', '700', '800', '900'].map(w => ({ label: `${w}`, value: w }))}
            />
          </div>
          <Row2
            a={{ label: 'Line H', value: lineHeight, unit: '', onChange: handleLineHeight }}
            b={{ label: 'Letter S', value: letterSpacing, unit: 'em', onChange: handleLetterSpacing }}
          />
          <div style={{ marginBottom: 8 }}>
            <FieldLabel>Color</FieldLabel>
            <ColorSwatch value={textColor} onChange={handleTextColor} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <FieldLabel>Align</FieldLabel>
            <Segmented
              value={textAlign}
              onChange={handleTextAlign}
              options={[
                { label: '⬛ L', value: 'left' },
                { label: '— C', value: 'center' },
                { label: 'R ⬛', value: 'right' },
                { label: '= J', value: 'justify' },
              ]}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <FieldLabel>Transform</FieldLabel>
            <Segmented
              value={textTransform}
              onChange={handleTextTransform}
              options={[
                { label: 'none', value: 'none' },
                { label: 'AA', value: 'uppercase' },
                { label: 'aa', value: 'lowercase' },
                { label: 'Aa', value: 'capitalize' },
              ]}
            />
          </div>
          <div>
            <FieldLabel>Decoration</FieldLabel>
            <Segmented
              value={textDecoration}
              onChange={handleTextDecoration}
              options={[
                { label: 'none', value: 'none' },
                { label: 'U̲', value: 'underline' },
                { label: 'S̶', value: 'line-through' },
              ]}
            />
          </div>
        </Section>

        {/* ─ Section 7: Effects ─ */}
        <Section title="Effects">
          {/* Opacity */}
          <div style={{ marginBottom: 10 }}>
            <FieldLabel>Opacity</FieldLabel>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="range" min={0} max={100} value={opacity}
                onChange={e => handleOpacity(e.target.value)}
                style={{ flex: 1, accentColor: T.accent }}
              />
              <input
                type="text" value={opacity}
                onChange={e => handleOpacity(e.target.value)}
                style={{
                  width: 44, background: T.inputBg, border: T.inputBorder, borderRadius: 6,
                  color: T.valueColor, fontSize: 12, fontFamily: T.font, padding: '3px 6px', outline: 'none', textAlign: 'center',
                }}
              />
              <span style={{ fontSize: 10, color: T.labelColor }}>%</span>
            </div>
          </div>
          {/* Box shadow */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <FieldLabel>Box Shadow</FieldLabel>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                <input type="checkbox" checked={shadowEnabled} onChange={e => handleShadowToggle(e.target.checked)}
                  style={{ accentColor: T.accent }} />
                <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font }}>Enable</span>
              </label>
            </div>
            {shadowEnabled && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                  <ScrubInput label="X" value={shadowX} unit="px" onChange={handleShadowX} />
                  <ScrubInput label="Y" value={shadowY} unit="px" onChange={handleShadowY} />
                  <ScrubInput label="Blur" value={shadowBlur} unit="px" onChange={handleShadowBlur} min={0} />
                  <ScrubInput label="Spread" value={shadowSpread} unit="px" onChange={handleShadowSpread} />
                </div>
                <ColorSwatch value={shadowColor} onChange={handleShadowColor} />
              </>
            )}
          </div>
          {/* Backdrop blur */}
          <div style={{ marginBottom: 8 }}>
            <ScrubInput label="Backdrop Blur" value={backdropBlur} unit="px" onChange={handleBackdropBlur} min={0} />
          </div>
          {/* Filter blur */}
          <div style={{ marginBottom: 8 }}>
            <ScrubInput label="Filter Blur" value={filterBlur} unit="px" onChange={handleFilterBlur} min={0} />
          </div>
          {/* Blend mode */}
          <div>
            <FieldLabel>Blend Mode</FieldLabel>
            <SmallSelect
              value={blendMode}
              onChange={handleBlendMode}
              options={['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
                'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion']}
            />
          </div>
        </Section>

        {/* ─ Section 8: Transform ─ */}
        <Section title="Transform">
          <Row2
            a={{ label: 'Rotate', value: rotate, unit: '°', onChange: handleRotate }}
            b={{ label: 'Scale X', value: scaleX, unit: '', onChange: handleScaleX }}
          />
          <Row2
            a={{ label: 'Trans X', value: translateX, unit: 'px', onChange: handleTranslateX }}
            b={{ label: 'Trans Y', value: translateY, unit: 'px', onChange: handleTranslateY }}
          />
        </Section>

        {/* bottom padding */}
        <div style={{ height: 12 }} />
      </div>
    </div>
  );
};

export default EditorPanel;
