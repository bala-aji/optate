import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelection } from '@/lib/selection-context';
import { applyStyle, getComputedStyleValue, rgbToHex } from '@/lib/css-utils';
import { changeTracker } from '@/lib/change-tracker';
import { loadGoogleFont } from '@/lib/dom-utils';
import { animate, spring, remove, cubicBezier, eases } from 'animejs';

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

// ─── Align icons ──────────────────────────────────────────────────────────────
const AlignLeftIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
  </svg>
);
const AlignCenterIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
  </svg>
);
const AlignRightIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/>
  </svg>
);
const AlignJustifyIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
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

interface SegOption { label: React.ReactNode; value: string }

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
          display: 'flex', alignItems: 'center', justifyContent: 'center',
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

// ─── Animate types & constants ────────────────────────────────────────────────

interface AnimConfig {
  opacity: number; scale: number; blur: number;
  rotate: number; rotateMode: '2d' | '3d'; rotateX: number; rotateY: number;
  skewX: number; skewY: number; offsetX: number; offsetY: number;
  duration: number; delay: number; loop: number; infinite: boolean; alternate: boolean;
  easingType: 'ease' | 'spring' | 'bezier'; easingName: string;
  springConfig: { mass: number; stiffness: number; damping: number; velocity: number; bounce: number; duration: number };
  customBezier: string;
}

const DEFAULT_ANIM_CONFIG: AnimConfig = {
  opacity: 1, scale: 1, blur: 0, rotate: 0, rotateMode: '2d',
  rotateX: 0, rotateY: 0, skewX: 0, skewY: 0, offsetX: 0, offsetY: 0,
  duration: 800, delay: 0, loop: 1, infinite: false, alternate: false,
  easingType: 'ease', easingName: 'outExpo',
  springConfig: { mass: 1, stiffness: 100, damping: 10, velocity: 0, bounce: 0, duration: 0 },
  customBezier: '0.42, 0, 1, 1',
};

const ANIM_PRESETS_MAP: Record<string, Partial<AnimConfig>> = {
  'Fade In':     { opacity: 0, duration: 600, easingName: 'outQuad' },
  'Slide Up':    { offsetY: 30, opacity: 0, duration: 500, easingName: 'outCubic' },
  'Slide Down':  { offsetY: -30, opacity: 0, duration: 500, easingName: 'outCubic' },
  'Slide Left':  { offsetX: 40, opacity: 0, duration: 500, easingName: 'outCubic' },
  'Slide Right': { offsetX: -40, opacity: 0, duration: 500, easingName: 'outCubic' },
  'Zoom In':     { scale: 0.8, opacity: 0, duration: 500, easingName: 'outBack' },
  'Zoom Out':    { scale: 1.2, opacity: 0, duration: 500, easingName: 'outCubic' },
  'Bounce In':   { scale: 0, easingType: 'spring', springConfig: { mass: 1, stiffness: 100, damping: 10, velocity: 0, bounce: 0.65, duration: 628 } } as Partial<AnimConfig>,
  'Flip X':      { rotateMode: '3d', rotateX: 90, duration: 700, easingName: 'outExpo' },
  'Flip Y':      { rotateMode: '3d', rotateY: 90, duration: 700, easingName: 'outExpo' },
  'Blur Reveal': { blur: 12, opacity: 0, duration: 800, easingName: 'outExpo' },
  'Rotate In':   { rotate: -180, opacity: 0, scale: 0.5, duration: 600, easingName: 'outBack' },
};

const EASING_CATEGORIES: Record<string, string[]> = {
  'Standard': ['linear', 'in', 'out', 'inOut'],
  'Quad': ['inQuad', 'outQuad', 'inOutQuad'],
  'Cubic': ['inCubic', 'outCubic', 'inOutCubic'],
  'Quart': ['inQuart', 'outQuart', 'inOutQuart'],
  'Expo': ['inExpo', 'outExpo', 'inOutExpo'],
  'Sine': ['inSine', 'outSine', 'inOutSine'],
  'Back': ['inBack', 'outBack', 'inOutBack'],
  'Elastic': ['inElastic', 'outElastic', 'inOutElastic'],
  'Bounce': ['inBounce', 'outBounce', 'inOutBounce'],
};

// ─── Animate sub-components ───────────────────────────────────────────────────

const AnimSlider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }> = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, system-ui, sans-serif' }}>{label}</span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
      style={{ width: '100%', accentColor: '#34d399' }} />
  </div>
);

const AnimDualAxis: React.FC<{ label: string; x: number; y: number; onX: (v: number) => void; onY: (v: number) => void }> = ({ label, x, y, onX, onY }) => (
  <div style={{ marginBottom: 8 }}>
    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, system-ui, sans-serif', display: 'block', marginBottom: 4 }}>{label}</span>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
      <div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>X: {x}</span>
        <input type="range" min={-200} max={200} value={x} onChange={e => onX(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
      </div>
      <div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>Y: {y}</span>
        <input type="range" min={-200} max={200} value={y} onChange={e => onY(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
      </div>
    </div>
  </div>
);

const MiniPreview: React.FC<{ el: HTMLElement; config: AnimConfig; buildParams: (el: HTMLElement, cfg: AnimConfig) => Record<string, any> }> = ({ el, config, buildParams }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isText = ['h1','h2','h3','h4','h5','h6','p','span','a','button','label','li'].includes(el.tagName.toLowerCase());
  const onEnter = () => {
    const node = ref.current;
    if (!node) return;
    try { remove(node); } catch {}
    node.style.transform = ''; node.style.opacity = '1'; node.style.filter = '';
    try { animate(node, { ...buildParams(node, config), loop: false }); } catch {}
  };
  const onLeave = () => {
    const node = ref.current;
    if (!node) return;
    try { remove(node); } catch {}
    node.style.transform = ''; node.style.opacity = '1'; node.style.filter = '';
  };
  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave} style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 90, cursor: 'pointer', position: 'relative', marginBottom: 10 }}>
      <div style={{ position: 'absolute', top: 7, right: 8, fontSize: 8, color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hover to preview</div>
      <div ref={ref} style={{ willChange: 'transform, opacity, filter' }}>
        {isText
          ? <div style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'inherit' }}>Hello</div>
          : <div style={{ width: 72, height: 52, borderRadius: 8, background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))', border: '0.5px solid rgba(255,255,255,0.1)' }} />
        }
      </div>
    </div>
  );
};

const EasingCurvePreview: React.FC<{ config: AnimConfig; onBezierChange: (b: string) => void }> = ({ config, onBezierChange }) => {
  const ballRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);
  const W = 220, H = 140, PAD = 20;
  const graphW = W - PAD * 2, graphH = H - PAD * 2;
  const startX = PAD, startY = H - PAD, endX = PAD + graphW, endY = PAD;
  const parseBezier = (): [number,number,number,number] => {
    try {
      const v = config.customBezier.split(',').map(n => parseFloat(n.trim()));
      if (v.length === 4 && v.every(n => !isNaN(n))) return v as [number,number,number,number];
    } catch {}
    return [0.42, 0, 0.58, 1];
  };
  const [x1, y1, x2, y2] = parseBezier();
  const toSvgX = (v: number) => PAD + v * graphW;
  const toSvgY = (v: number) => (H - PAD) - v * graphH;
  const fromSvgX = (sx: number) => Math.max(0, Math.min(1, (sx - PAD) / graphW));
  const fromSvgY = (sy: number) => (H - PAD - sy) / graphH;
  const cp1x = toSvgX(x1), cp1y = toSvgY(y1), cp2x = toSvgX(x2), cp2y = toSvgY(y2);
  const isBezier = config.easingType === 'bezier';
  const getEaseFn = () => { try { if (config.easingType === 'ease') { const fn = (eases as any)[config.easingName]; if (typeof fn === 'function') { try { const r = fn(); return typeof r === 'function' ? r : fn; } catch { return fn; } } } } catch {} return null; };
  const curvePath = isBezier
    ? `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`
    : (() => { const fn = getEaseFn(); const pts: string[] = []; for (let i = 0; i <= 60; i++) { const t = i/60; let v = t; try { if (fn) v = fn(t); } catch {} const cv = Math.max(-0.3, Math.min(1.3, v)); pts.push(`${(PAD + t*graphW).toFixed(1)},${((H-PAD) - cv*graphH).toFixed(1)}`); } return `M ${pts[0]} L ${pts.slice(1).join(' L ')}`; })();
  const getSvgPt = (e: MouseEvent) => { const svg = svgRef.current; if (!svg) return {x:0,y:0}; const r = svg.getBoundingClientRect(); return { x: (e.clientX-r.left)*(W/r.width), y: (e.clientY-r.top)*(H/r.height) }; };
  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => { const pt = getSvgPt(e); const bx = Math.round(Math.max(0,Math.min(1,fromSvgX(pt.x)))*100)/100; const by = Math.round(Math.max(-0.5,Math.min(1.5,fromSvgY(pt.y)))*100)/100; if (dragging==='p1') onBezierChange(`${bx},${by},${x2},${y2}`); else onBezierChange(`${x1},${y1},${bx},${by}`); };
    const up = () => setDragging(null);
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [dragging, x1, y1, x2, y2]);
  const onHover = () => { const ball = ballRef.current; if (!ball || dragging) return; try { remove(ball); } catch {} ball.style.transform = 'translateX(0)'; const p: Record<string,any> = { translateX: [0, graphW], duration: Math.min(config.duration, 2000) }; if (config.easingType === 'spring') { p.ease = spring(config.springConfig); } else if (config.easingType === 'bezier') { try { const v = config.customBezier.split(',').map(Number); if (v.length===4) p.ease = cubicBezier(v[0],v[1],v[2],v[3]); } catch {} } else { p.ease = config.easingName; } p.onComplete = () => { setTimeout(() => { if (ball) ball.style.transform = 'translateX(0)'; }, 300); }; try { animate(ball, p); } catch {}; };
  const onLeave = () => { const ball = ballRef.current; if (!ball) return; try { remove(ball); } catch {} ball.style.transform = 'translateX(0)'; };
  return (
    <div onMouseEnter={onHover} onMouseLeave={onLeave} style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 0 0', position: 'relative', marginBottom: 8 }}>
      <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 7, color: 'rgba(255,255,255,0.12)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{isBezier ? 'Drag handles' : 'Hover to play'}</div>
      <svg ref={svgRef} width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', userSelect: 'none' }}>
        <line x1={PAD} y1={H-PAD} x2={PAD+graphW} y2={H-PAD} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <line x1={PAD} y1={H-PAD} x2={PAD} y2={PAD} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <line x1={PAD} y1={H-PAD} x2={PAD+graphW} y2={PAD} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4,4" />
        <path d={curvePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        {isBezier ? (<>
          <line x1={startX} y1={startY} x2={cp1x} y2={cp1y} stroke="#3b82f6" strokeWidth="1.5" />
          <line x1={endX} y1={endY} x2={cp2x} y2={cp2y} stroke="#3b82f6" strokeWidth="1.5" />
          <circle cx={startX} cy={startY} r="4" fill="rgba(255,255,255,0.2)" />
          <circle cx={endX} cy={endY} r="4" fill="rgba(255,255,255,0.2)" />
          <circle cx={cp1x} cy={cp1y} r="7" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" style={{ cursor: 'grab' }} onMouseDown={e => { e.preventDefault(); setDragging('p1'); }} />
          <circle cx={cp2x} cy={cp2y} r="7" fill="#3b82f6" stroke="#fff" strokeWidth="1.5" style={{ cursor: 'grab' }} onMouseDown={e => { e.preventDefault(); setDragging('p2'); }} />
        </>) : (<>
          <circle cx={PAD} cy={H-PAD} r="3.5" fill="#3b82f6" opacity="0.8" />
          <circle cx={PAD+graphW} cy={PAD} r="3.5" fill="rgba(255,255,255,0.3)" />
        </>)}
      </svg>
      <div style={{ padding: '4px 14px 8px', position: 'relative' }}>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, position: 'relative' }}>
          <div ref={ballRef} style={{ position: 'absolute', top: -4, left: -5, width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', willChange: 'transform' }} />
        </div>
      </div>
    </div>
  );
};

const AnimTabBar: React.FC<{ animTab: 'transition' | 'keyframe'; setAnimTab: (t: 'transition' | 'keyframe') => void }> = ({ animTab, setAnimTab }) => (
  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, gap: 2 }}>
    {(['transition', 'keyframe'] as const).map(tab => (
      <button
        key={tab}
        onClick={() => setAnimTab(tab)}
        style={{
          flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
          fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 500,
          transition: 'all 0.15s',
          background: animTab === tab ? 'rgba(255,255,255,0.10)' : 'transparent',
          color: animTab === tab ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
        }}
      >
        {tab === 'transition' ? '⚡ Transition' : '🎬 Keyframe'}
      </button>
    ))}
  </div>
);

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

  // Animate – tab
  const [animTab, setAnimTab] = useState<'transition' | 'keyframe'>('keyframe');

  // Animate – transition (CSS)
  const [transProp, setTransProp] = useState('all');
  const [transDuration, setTransDuration] = useState('300');
  const [transEasing, setTransEasing] = useState('ease');
  const [transDelay, setTransDelay] = useState('0');

  // Animate – animejs config
  const [animConfig, setAnimConfig] = useState<AnimConfig>({
    opacity: 1, scale: 1, blur: 0, rotate: 0, rotateMode: '2d',
    rotateX: 0, rotateY: 0, skewX: 0, skewY: 0, offsetX: 0, offsetY: 0,
    duration: 800, delay: 0, loop: 1, infinite: false, alternate: false,
    easingType: 'ease', easingName: 'outExpo',
    springConfig: { mass: 1, stiffness: 100, damping: 10, velocity: 0, bounce: 0, duration: 0 },
    customBezier: '0.42, 0, 1, 1',
  });
  const [animSelectedPreset, setAnimSelectedPreset] = useState('');
  const [animIsPreviewing, setAnimIsPreviewing] = useState(false);
  const animPreviewRef = useRef<any>(null);
  const animOriginalStyles = useRef<Record<string, string>>({});
  const miniPreviewRef = useRef<HTMLDivElement>(null);

  // ── Inject keyframes once ────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('optate-anim-styles')) return;
    const style = document.createElement('style');
    style.id = 'optate-anim-styles';
    document.head.appendChild(style);
  }, []);

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

    // Animate – transition
    const tr = el.style.transition || cs.transition || '';
    if (tr && tr !== 'all 0s ease 0s') {
      const trMatch = tr.match(/(\S+)\s+([\d.]+)s\s+(\S+)(?:\s+([\d.]+)s)?/);
      if (trMatch) {
        setTransProp(trMatch[1] || 'all');
        setTransDuration(Math.round((parseFloat(trMatch[2]) || 0.3) * 1000).toString());
        setTransEasing(trMatch[3] || 'ease');
        setTransDelay(Math.round((parseFloat(trMatch[4] || '0')) * 1000).toString());
      }
    } else {
      setTransProp('all'); setTransDuration('300'); setTransEasing('ease'); setTransDelay('0');
    }
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

  // ── Animate – CSS transition handlers ─────────────────────────────────────
  const applyTransition = (prop = transProp, dur = transDuration, eas = transEasing, del = transDelay) => {
    if (!el) return;
    const val = `${prop} ${parseFloat(dur) / 1000}s ${eas} ${parseFloat(del) / 1000}s`;
    const old = el.style.transition || '';
    el.style.transition = val;
    changeTracker.recordChange(el, 'style', 'transition', old, val);
  };
  const handleTransProp = (v: string) => { setTransProp(v); applyTransition(v); };
  const handleTransDuration = (v: string) => { const n = v.replace('ms',''); setTransDuration(n); applyTransition(transProp, n); };
  const handleTransEasing = (v: string) => { setTransEasing(v); applyTransition(transProp, transDuration, v); };
  const handleTransDelay = (v: string) => { const n = v.replace('ms',''); setTransDelay(n); applyTransition(transProp, transDuration, transEasing, n); };

  // ── Animate – animejs helpers ─────────────────────────────────────────────
  const updateAnimConfig = (updates: Partial<AnimConfig>) => {
    setAnimConfig(prev => ({ ...prev, ...updates }));
    setAnimSelectedPreset('');
  };

  const applyPreset = (name: string) => {
    const preset = ANIM_PRESETS_MAP[name];
    if (preset) {
      setAnimConfig(prev => ({ ...DEFAULT_ANIM_CONFIG, ...preset }));
      setAnimSelectedPreset(name);
    }
  };

  const buildAnimeParams = useCallback((targetEl: HTMLElement, cfg: AnimConfig): Record<string, any> => {
    const params: Record<string, any> = {};
    if (cfg.opacity !== 1) params.opacity = [cfg.opacity, 1];
    if (cfg.scale !== 1) params.scale = [cfg.scale, 1];
    if (cfg.blur !== 0) params.filter = [`blur(${cfg.blur}px)`, 'blur(0px)'];
    if (cfg.offsetX !== 0) params.translateX = [cfg.offsetX, 0];
    if (cfg.offsetY !== 0) params.translateY = [cfg.offsetY, 0];
    if (cfg.rotate !== 0) params.rotate = [`${cfg.rotate}deg`, '0deg'];
    if (cfg.rotateMode === '3d') {
      if (cfg.rotateX !== 0) params.rotateX = [`${cfg.rotateX}deg`, '0deg'];
      if (cfg.rotateY !== 0) params.rotateY = [`${cfg.rotateY}deg`, '0deg'];
    }
    if (cfg.skewX !== 0) params.skewX = [`${cfg.skewX}deg`, '0deg'];
    if (cfg.skewY !== 0) params.skewY = [`${cfg.skewY}deg`, '0deg'];
    if (Object.keys(params).length === 0) params.opacity = [0, 1];
    params.duration = cfg.duration;
    params.delay = cfg.delay;
    params.loop = cfg.infinite ? true : cfg.loop;
    params.alternate = cfg.alternate;
    if (cfg.easingType === 'spring') {
      params.ease = spring(cfg.springConfig);
    } else if (cfg.easingType === 'bezier') {
      try {
        const vals = cfg.customBezier.split(',').map(n => parseFloat(n.trim()));
        if (vals.length === 4 && vals.every(v => !isNaN(v))) params.ease = cubicBezier(vals[0], vals[1], vals[2], vals[3]);
        else params.ease = 'outExpo';
      } catch { params.ease = 'outExpo'; }
    } else {
      params.ease = cfg.easingName;
    }
    return params;
  }, []);

  const runAnimPreview = () => {
    if (!el) return;
    if (animIsPreviewing) {
      try { if (animPreviewRef.current) { remove(el); animPreviewRef.current = null; } } catch {}
      Object.entries(animOriginalStyles.current).forEach(([p, v]) => { (el.style as any)[p] = v; });
      setAnimIsPreviewing(false);
      return;
    }
    animOriginalStyles.current = { transform: el.style.transform, opacity: el.style.opacity, filter: el.style.filter };
    setAnimIsPreviewing(true);
    const params = buildAnimeParams(el, animConfig);
    params.onComplete = () => {
      if (!animConfig.infinite && animConfig.loop <= 1) setAnimIsPreviewing(false);
    };
    try { animPreviewRef.current = animate(el, params); } catch { setAnimIsPreviewing(false); }
  };

  const handleApplyAnimation = () => {
    if (!el) return;
    if (animIsPreviewing) { try { remove(el); } catch {} setAnimIsPreviewing(false); }
    const cfg = animConfig;
    const fromProps: string[] = []; const toProps: string[] = []; const tfFrom: string[] = [];
    if (cfg.opacity !== 1) { fromProps.push(`opacity: ${cfg.opacity}`); toProps.push('opacity: 1'); }
    if (cfg.blur !== 0) { fromProps.push(`filter: blur(${cfg.blur}px)`); toProps.push('filter: blur(0px)'); }
    if (cfg.scale !== 1) tfFrom.push(`scale(${cfg.scale})`);
    if (cfg.offsetX !== 0) tfFrom.push(`translateX(${cfg.offsetX}px)`);
    if (cfg.offsetY !== 0) tfFrom.push(`translateY(${cfg.offsetY}px)`);
    if (cfg.rotate !== 0) tfFrom.push(`rotate(${cfg.rotate}deg)`);
    if (cfg.rotateMode === '3d') {
      if (cfg.rotateX !== 0) tfFrom.push(`rotateX(${cfg.rotateX}deg)`);
      if (cfg.rotateY !== 0) tfFrom.push(`rotateY(${cfg.rotateY}deg)`);
    }
    if (cfg.skewX !== 0) tfFrom.push(`skewX(${cfg.skewX}deg)`);
    if (cfg.skewY !== 0) tfFrom.push(`skewY(${cfg.skewY}deg)`);
    if (tfFrom.length > 0) { fromProps.push(`transform: ${tfFrom.join(' ')}`); toProps.push('transform: none'); }
    if (fromProps.length === 0) { fromProps.push('opacity: 0'); toProps.push('opacity: 1'); }

    const animId = `optate-anim-${Date.now()}`;
    const kf = `@keyframes ${animId} { from { ${fromProps.join('; ')}; } to { ${toProps.join('; ')}; } }`;
    let styleEl = document.getElementById('optate-anim-styles') as HTMLStyleElement;
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'optate-anim-styles'; document.head.appendChild(styleEl); }
    styleEl.textContent += '\n' + kf;

    let cssEasing = 'ease';
    if (cfg.easingType === 'bezier') cssEasing = `cubic-bezier(${cfg.customBezier})`;
    else if (cfg.easingName.includes('In') && !cfg.easingName.includes('Out')) cssEasing = 'ease-in';
    else if (cfg.easingName.includes('Out') && !cfg.easingName.includes('In')) cssEasing = 'ease-out';
    else cssEasing = 'ease-in-out';

    const iterationCount = cfg.infinite ? 'infinite' : String(cfg.loop);
    const direction = cfg.alternate ? 'alternate' : 'normal';
    const animValue = `${animId} ${cfg.duration}ms ${cssEasing} ${cfg.delay}ms ${iterationCount} ${direction} both`;
    const oldAnim = el.style.animation;
    el.style.animation = animValue;
    changeTracker.recordChange(el, 'style', 'animation', oldAnim || 'none', animValue);
  };

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
                { label: <AlignLeftIcon />, value: 'left' },
                { label: <AlignCenterIcon />, value: 'center' },
                { label: <AlignRightIcon />, value: 'right' },
                { label: <AlignJustifyIcon />, value: 'justify' },
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

        {/* ─ Section 9: Animate ─ */}
        <Section title="Animate" defaultOpen={false}>

          {/* ── Tab switcher: Transition vs Keyframe ── */}
          <AnimTabBar animTab={animTab} setAnimTab={setAnimTab} />

          {animTab === 'transition' ? (
            /* ════════════ TRANSITION TAB ════════════ */
            <div style={{ marginTop: 10 }}>
              <div style={{ marginBottom: 8 }}>
                <FieldLabel>Property</FieldLabel>
                <SmallSelect
                  value={transProp}
                  onChange={handleTransProp}
                  options={['all', 'opacity', 'transform', 'background-color', 'color', 'border-color', 'width', 'height', 'box-shadow', 'filter']}
                />
              </div>
              <Row2
                a={{ label: 'Duration', value: transDuration, unit: 'ms', onChange: handleTransDuration }}
                b={{ label: 'Delay', value: transDelay, unit: 'ms', onChange: handleTransDelay }}
              />
              <Segmented
                value={transEasing}
                onChange={handleTransEasing}
                options={[{ label: 'ease', value: 'ease' }, { label: 'linear', value: 'linear' }, { label: 'ease-in', value: 'ease-in' }, { label: 'ease-out', value: 'ease-out' }]}
              />
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(52,211,153,0.06)', borderRadius: 7, border: '0.5px solid rgba(52,211,153,0.15)' }}>
                <div style={{ fontSize: 9, color: 'rgba(52,211,153,0.6)', fontFamily: T.font, lineHeight: 1.5 }}>
                  Applied live — hover or interact with the element to see it.
                </div>
              </div>
            </div>
          ) : (
            /* ════════════ KEYFRAME TAB ════════════ */
            <div style={{ marginTop: 10 }}>

              {/* Mini preview — compact */}
              <MiniPreview el={el} config={animConfig} buildParams={buildAnimeParams} />

              {/* Preset */}
              <div style={{ marginBottom: 12 }}>
                <FieldLabel>Preset</FieldLabel>
                <select
                  value={animSelectedPreset}
                  onChange={e => { const v = e.target.value; setAnimSelectedPreset(v); if (v) applyPreset(v); }}
                  style={{
                    width: '100%', background: T.inputBg, border: T.inputBorder, borderRadius: 6,
                    padding: '6px 8px', fontSize: 11, color: T.valueColor, outline: 'none',
                    cursor: 'pointer', fontFamily: T.font, marginTop: 4,
                  }}
                >
                  <option value="" style={{ background: '#1a1a1a', color: 'rgba(255,255,255,0.4)' }}>Custom</option>
                  {Object.keys(ANIM_PRESETS_MAP).map(name => (
                    <option key={name} value={name} style={{ background: '#1a1a1a', color: '#fff' }}>{name}</option>
                  ))}
                </select>
              </div>

              {/* From State */}
              <div style={{ fontSize: 10, color: T.labelColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                From state <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, textTransform: 'none', letterSpacing: 0 }}>(animates to current)</span>
              </div>
              <AnimSlider label="Opacity" value={animConfig.opacity} min={0} max={1} step={0.01} onChange={v => updateAnimConfig({ opacity: v })} />
              <AnimSlider label="Scale" value={animConfig.scale} min={0} max={3} step={0.05} onChange={v => updateAnimConfig({ scale: v })} />
              <AnimSlider label="Blur" value={animConfig.blur} min={0} max={20} unit="px" onChange={v => updateAnimConfig({ blur: v })} />
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font }}>Rotate</span>
                  <Segmented
                    value={animConfig.rotateMode === '2d' ? '2d' : '3d'}
                    onChange={v => updateAnimConfig({ rotateMode: v as '2d' | '3d' })}
                    options={[{ label: '2D', value: '2d' }, { label: '3D', value: '3d' }]}
                  />
                </div>
                {animConfig.rotateMode === '2d' ? (
                  <AnimSlider label="Rotation" value={animConfig.rotate} min={-360} max={360} unit="°" onChange={v => updateAnimConfig({ rotate: v })} />
                ) : (
                  <div style={{ paddingLeft: 8, borderLeft: '2px solid rgba(59,130,246,0.15)' }}>
                    <AnimSlider label="X" value={animConfig.rotateX} min={-360} max={360} unit="°" onChange={v => updateAnimConfig({ rotateX: v })} />
                    <AnimSlider label="Y" value={animConfig.rotateY} min={-360} max={360} unit="°" onChange={v => updateAnimConfig({ rotateY: v })} />
                    <AnimSlider label="Z" value={animConfig.rotate} min={-360} max={360} unit="°" onChange={v => updateAnimConfig({ rotate: v })} />
                  </div>
                )}
              </div>
              <AnimDualAxis label="Offset" x={animConfig.offsetX} y={animConfig.offsetY} onX={v => updateAnimConfig({ offsetX: v })} onY={v => updateAnimConfig({ offsetY: v })} />
              <AnimDualAxis label="Skew" x={animConfig.skewX} y={animConfig.skewY} onX={v => updateAnimConfig({ skewX: v })} onY={v => updateAnimConfig({ skewY: v })} />

              {/* Easing */}
              <div style={{ fontSize: 10, color: T.labelColor, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '12px 0 8px' }}>Easing</div>
              <div style={{ marginBottom: 8 }}>
                <Segmented
                  value={animConfig.easingType}
                  onChange={v => updateAnimConfig({ easingType: v as 'ease' | 'spring' | 'bezier' })}
                  options={[{ label: 'Ease', value: 'ease' }, { label: 'Spring', value: 'spring' }, { label: 'Bezier', value: 'bezier' }]}
                />
              </div>
              {animConfig.easingType === 'ease' && (
                <select
                  value={animConfig.easingName}
                  onChange={e => updateAnimConfig({ easingName: e.target.value })}
                  style={{ width: '100%', background: T.inputBg, border: T.inputBorder, borderRadius: 6, padding: '6px 8px', fontSize: 11, color: T.valueColor, outline: 'none', cursor: 'pointer', fontFamily: T.font, marginBottom: 6 }}
                >
                  {Object.entries(EASING_CATEGORIES).map(([cat, easings]) => (
                    <optgroup key={cat} label={cat} style={{ background: '#1a1a1a' }}>
                      {easings.map(e => <option key={e} value={e} style={{ background: '#1a1a1a', color: '#fff' }}>{e}</option>)}
                    </optgroup>
                  ))}
                </select>
              )}
              {animConfig.easingType === 'spring' && (
                <div style={{ marginBottom: 6 }}>
                  <AnimSlider label="Mass" value={animConfig.springConfig.mass} min={0.1} max={10} step={0.1} onChange={v => updateAnimConfig({ springConfig: { ...animConfig.springConfig, mass: v } })} />
                  <AnimSlider label="Stiffness" value={animConfig.springConfig.stiffness} min={1} max={1000} step={10} onChange={v => updateAnimConfig({ springConfig: { ...animConfig.springConfig, stiffness: v } })} />
                  <AnimSlider label="Damping" value={animConfig.springConfig.damping} min={1} max={100} onChange={v => updateAnimConfig({ springConfig: { ...animConfig.springConfig, damping: v } })} />
                  <AnimSlider label="Bounce" value={animConfig.springConfig.bounce} min={0} max={1} step={0.01} onChange={v => updateAnimConfig({ springConfig: { ...animConfig.springConfig, bounce: v } })} />
                </div>
              )}
              {/* Curve always visible for bezier, optional for others */}
              {animConfig.easingType === 'bezier' && (
                <>
                  <EasingCurvePreview config={animConfig} onBezierChange={b => updateAnimConfig({ customBezier: b })} />
                  <input
                    value={animConfig.customBezier}
                    onChange={e => updateAnimConfig({ customBezier: e.target.value })}
                    placeholder="0.42, 0, 1, 1"
                    style={{ width: '100%', boxSizing: 'border-box', background: T.inputBg, border: T.inputBorder, borderRadius: 6, padding: '6px 8px', fontSize: 11, color: T.valueColor, outline: 'none', fontFamily: 'monospace', marginTop: 6 }}
                  />
                </>
              )}
              {animConfig.easingType !== 'bezier' && (
                <EasingCurvePreview config={animConfig} onBezierChange={b => updateAnimConfig({ customBezier: b })} />
              )}

              {/* Duration + Delay */}
              <div style={{ fontSize: 10, color: T.labelColor, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '12px 0 8px' }}>Timing</div>
              <AnimSlider label="Duration" value={animConfig.duration} min={100} max={5000} step={50} unit="ms" onChange={v => updateAnimConfig({ duration: v })} />
              <AnimSlider label="Delay" value={animConfig.delay} min={0} max={5000} step={50} unit="ms" onChange={v => updateAnimConfig({ delay: v })} />

              {/* Loop + Alternate inline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, flex: 1 }}>Loop</span>
                <button
                  onClick={() => updateAnimConfig({ infinite: !animConfig.infinite })}
                  style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, border: 'none', cursor: 'pointer', fontFamily: T.font, background: animConfig.infinite ? 'rgba(59,130,246,0.18)' : T.inputBg, color: animConfig.infinite ? '#60a5fa' : T.labelColor }}
                >∞</button>
                {!animConfig.infinite && (
                  <div style={{ display: 'flex', alignItems: 'center', background: T.inputBg, borderRadius: 5, border: T.inputBorder, overflow: 'hidden' }}>
                    <button onClick={() => updateAnimConfig({ loop: Math.max(1, animConfig.loop - 1) })} style={{ padding: '3px 7px', border: 'none', background: 'transparent', color: T.labelColor, cursor: 'pointer', fontSize: 12 }}>−</button>
                    <span style={{ padding: '0 4px', fontSize: 10, color: T.valueColor, fontFamily: 'monospace', minWidth: 16, textAlign: 'center' }}>{animConfig.loop}</span>
                    <button onClick={() => updateAnimConfig({ loop: animConfig.loop + 1 })} style={{ padding: '3px 7px', border: 'none', background: 'transparent', color: T.labelColor, cursor: 'pointer', fontSize: 12 }}>+</button>
                  </div>
                )}
                <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, marginLeft: 4 }}>Alt</span>
                <button
                  onClick={() => updateAnimConfig({ alternate: !animConfig.alternate })}
                  style={{ width: 34, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', background: animConfig.alternate ? '#3b82f6' : 'rgba(255,255,255,0.1)', flexShrink: 0 }}
                >
                  <div style={{ position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: animConfig.alternate ? 18 : 2 }} />
                </button>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button
                  onClick={runAnimPreview}
                  style={{
                    padding: '9px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: animIsPreviewing ? '0.5px solid rgba(239,68,68,0.3)' : 'none',
                    cursor: 'pointer', fontFamily: T.font, transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    background: animIsPreviewing ? 'rgba(239,68,68,0.15)' : '#3b82f6',
                    color: animIsPreviewing ? '#f87171' : '#fff',
                  }}
                >
                  {animIsPreviewing ? '■ Stop' : '▶ Preview'}
                </button>
                <button
                  onClick={handleApplyAnimation}
                  style={{
                    padding: '9px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: T.inputBorder, cursor: 'pointer', fontFamily: T.font,
                    background: 'rgba(255,255,255,0.05)', color: T.valueColor, transition: 'all 0.15s',
                  }}
                >
                  Apply CSS
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* bottom padding */}
        <div style={{ height: 12 }} />
      </div>
    </div>
  );
};

export default EditorPanel;
