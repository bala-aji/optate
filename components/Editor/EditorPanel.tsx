import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelection } from '@/lib/selection-context';
import { applyStyle, getComputedStyleValue, rgbToHex } from '@/lib/css-utils';
import { changeTracker } from '@/lib/change-tracker';
import { loadGoogleFont } from '@/lib/dom-utils';
import { animate, spring, remove, cubicBezier, eases } from 'animejs';
import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ChevronDown, X, Trash2, ArrowLeftRight, RotateCcw,
  Link, Eye, EyeOff, Upload, Image, Crosshair,
  MoveHorizontal, MoveVertical, Repeat2, Paperclip,
  LayoutGrid, Minus, Droplet, Network, Plus,
} from 'lucide-react';

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

const ChevronIcon = ({ rotated }: { rotated: boolean }) => (
  <ChevronDown
    size={12} strokeWidth={1.5}
    style={{ color: 'rgba(255,255,255,0.35)', transform: rotated ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease', flexShrink: 0 }}
  />
);

const DeleteIcon = () => <Trash2 size={13} strokeWidth={1.5} style={{ color: 'rgba(255,100,100,0.8)' }} />;
const FlipIcon = () => <ArrowLeftRight size={13} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.6)' }} />;
const CloseIcon = () => <X size={13} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.6)' }} />;

// ─── Align icons ──────────────────────────────────────────────────────────────
const AlignLeftIcon = () => <AlignLeft size={14} strokeWidth={1.5} />;
const AlignCenterIcon = () => <AlignCenter size={14} strokeWidth={1.5} />;
const AlignRightIcon = () => <AlignRight size={14} strokeWidth={1.5} />;
const AlignJustifyIcon = () => <AlignJustify size={14} strokeWidth={1.5} />;
const LinkIcon = ({ linked }: { linked: boolean }) => (
  <Link size={13} strokeWidth={1.5} style={{ color: linked ? T.accent : 'rgba(255,255,255,0.35)' }} />
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

// Horizontal padding icon — vertical bars flanking a box  |□|
const HPadIcon = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="8" height="10" rx="1.5"/>
    <line x1="1.5" y1="3" x2="1.5" y2="13"/>
    <line x1="14.5" y1="3" x2="14.5" y2="13"/>
  </svg>
);

// Vertical padding icon — horizontal bars above/below a box
const VPadIcon = () => (
  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="10" height="8" rx="1.5"/>
    <line x1="3" y1="1.5" x2="13" y2="1.5"/>
    <line x1="3" y1="14.5" x2="13" y2="14.5"/>
  </svg>
);

// Individual sides toggle icon — dashed corner marks
const IndividualSidesIcon = () => (
  <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 5V3a1 1 0 0 1 1-1h2"/>
    <path d="M11 2h2a1 1 0 0 1 1 1v2"/>
    <path d="M14 11v2a1 1 0 0 1-1 1h-2"/>
    <path d="M5 14H3a1 1 0 0 1-1-1v-2"/>
    <line x1="6.5" y1="2" x2="9.5" y2="2" strokeDasharray="1.5 1.5"/>
    <line x1="14" y1="6.5" x2="14" y2="9.5" strokeDasharray="1.5 1.5"/>
    <line x1="6.5" y1="14" x2="9.5" y2="14" strokeDasharray="1.5 1.5"/>
    <line x1="2" y1="6.5" x2="2" y2="9.5" strokeDasharray="1.5 1.5"/>
  </svg>
);

// px → number
const px2n = (v: string) => parseFloat(v) || 0;
const n2px = (n: number) => `${n}px`;
// Returns display value if L===R, else '–'
const axisVal = (a: string, b: string) => a === b ? a.replace('px', '') : '–';

// An inline icon+input pill
const AxisInput: React.FC<{
  icon: React.ReactNode;
  value: string;           // display value (number string or '–')
  onCommit: (v: string) => void;
}> = ({ icon, value, onCommit }) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (!focused) setDraft(value); }, [value, focused]);

  const commit = () => {
    setFocused(false);
    const n = parseFloat(draft);
    if (!isNaN(n)) onCommit(n2px(n));
    else setDraft(value); // revert if invalid
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      flex: 1, minWidth: 0,
      background: focused ? T.inputBgFocus : T.inputBg,
      border: focused ? T.inputBorderFocus : T.inputBorder,
      borderRadius: 7, padding: '4px 8px',
      color: T.labelColor,
    }}>
      {icon}
      <input
        value={draft}
        onFocus={() => setFocused(true)}
        onBlur={commit}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        style={{
          flex: 1, minWidth: 0, background: 'transparent', border: 'none',
          outline: 'none', color: T.valueColor, fontSize: 11,
          fontFamily: T.font, padding: 0,
        }}
      />
    </div>
  );
};

// Individual side input with label below
const SideInput: React.FC<{
  label: string;
  value: string;
  onCommit: (v: string) => void;
}> = ({ label, value, onCommit }) => {
  const [f, setF] = useState(false);
  const [d, setD] = useState(value.replace('px', ''));
  useEffect(() => { if (!f) setD(value.replace('px', '')); }, [value, f]);
  const commit = () => { setF(false); onCommit(n2px(px2n(d))); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <input
        value={d}
        onFocus={() => setF(true)}
        onBlur={commit}
        onChange={e => setD(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        style={{
          width: '100%', textAlign: 'center',
          background: f ? T.inputBgFocus : T.inputBg,
          border: f ? T.inputBorderFocus : T.inputBorder,
          borderRadius: 6, color: T.valueColor, fontSize: 11,
          fontFamily: T.font, outline: 'none', padding: '4px 2px',
        }}
      />
      <span style={{ fontSize: 9, color: T.labelColor, fontFamily: T.font, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
    </div>
  );
};

// One spacing property row: [H-icon val] [V-icon val] [individual toggle]
// Expands to T R B L grid when individual mode is active
const SpacingRow: React.FC<{
  label: string;
  values: SpacingValues;
  onChange: (side: keyof SpacingValues, v: string) => void;
}> = ({ label, values, onChange }) => {
  const [individual, setIndividual] = useState(false);

  const hVal = axisVal(values.left, values.right);   // horizontal: L = R
  const vVal = axisVal(values.top, values.bottom);   // vertical: T = B

  const setH = (v: string) => { onChange('left', v); onChange('right', v); };
  const setV = (v: string) => { onChange('top', v); onChange('bottom', v); };

  return (
    <div style={{ fontFamily: T.font }}>
      {/* Label row */}
      <span style={{ fontSize: 10, color: T.labelColor, display: 'block', marginBottom: 5, letterSpacing: '0.04em' }}>
        {label}
      </span>
      {/* Compact H/V row */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <AxisInput icon={<HPadIcon />} value={hVal} onCommit={setH} />
        <AxisInput icon={<VPadIcon />} value={vVal} onCommit={setV} />
        {/* Individual toggle */}
        <button
          title="Individual sides"
          onClick={() => setIndividual(i => !i)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, flexShrink: 0, borderRadius: 7, border: 'none',
            cursor: 'pointer',
            background: individual ? 'rgba(255,255,255,0.12)' : T.inputBg,
            color: individual ? T.valueColor : T.labelColor,
          }}
        >
          <IndividualSidesIcon />
        </button>
      </div>
      {/* Individual T R B L */}
      {individual && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 6 }}>
          <SideInput label="T" value={values.top}    onCommit={v => onChange('top', v)} />
          <SideInput label="R" value={values.right}  onCommit={v => onChange('right', v)} />
          <SideInput label="B" value={values.bottom} onCommit={v => onChange('bottom', v)} />
          <SideInput label="L" value={values.left}   onCommit={v => onChange('left', v)} />
        </div>
      )}
    </div>
  );
};

const BoxModelWidget: React.FC<{
  padding: SpacingValues;
  margin: SpacingValues;
  onPaddingChange: (side: keyof SpacingValues, v: string) => void;
  onMarginChange: (side: keyof SpacingValues, v: string) => void;
}> = ({ padding, margin, onPaddingChange, onMarginChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <SpacingRow label="Padding" values={padding} onChange={onPaddingChange} />
    <SpacingRow label="Margin"  values={margin}  onChange={onMarginChange} />
  </div>
);

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

// ─── Effect Item ─────────────────────────────────────────────────────────────

export type EffectType = 'drop-shadow' | 'inner-shadow' | 'layer-blur' | 'background-blur';
export interface EffectItem {
  id: string;
  type: EffectType;
  visible: boolean;
  x: number; y: number; blur: number; spread: number;
  color: string; colorOpacity: number;
}

// ─── Gradient Editor ──────────────────────────────────────────────────────────

interface GradientStop { id: string; position: number; color: string; opacity: number; }

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  return { r: parseInt(clean.slice(0,2),16), g: parseInt(clean.slice(2,4),16), b: parseInt(clean.slice(4,6),16) };
}
function buildGradientCss(type: string, angle: number, stops: GradientStop[]) {
  const sorted = [...stops].sort((a,b) => a.position - b.position);
  const cs = sorted.map(s => {
    const {r,g,b} = hexToRgb(s.color);
    return `rgba(${r},${g},${b},${(s.opacity/100).toFixed(2)}) ${s.position}%`;
  }).join(', ');
  if (type === 'radial') return `radial-gradient(circle, ${cs})`;
  if (type === 'conic')  return `conic-gradient(from ${angle}deg, ${cs})`;
  return `linear-gradient(${angle}deg, ${cs})`;
}
function parseGradientCss(css: string): { type: string; angle: number; stops: GradientStop[] } | null {
  try {
    let type = 'linear', angle = 135, stopsStr = '';
    const lin = css.match(/linear-gradient\((\d+)deg,\s*(.+)\)$/);
    const rad = css.match(/radial-gradient\((?:circle,\s*)?(.+)\)$/);
    const con = css.match(/conic-gradient\((?:from\s+(\d+)deg,\s*)?(.+)\)$/);
    if (lin)      { type='linear'; angle=parseInt(lin[1]); stopsStr=lin[2]; }
    else if (rad) { type='radial'; stopsStr=rad[1]; }
    else if (con) { type='conic'; angle=parseInt(con[1]||'0'); stopsStr=con[2]; }
    else return null;
    const stops: GradientStop[] = [];
    for (const m of stopsStr.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)\s+([\d.]+)%/g)) {
      const [,r,g,b,a,pos] = m;
      stops.push({ id: Math.random().toString(36).slice(2), position: parseFloat(pos), color: rgbToHex(+r,+g,+b), opacity: Math.round((parseFloat(a??'1'))*100) });
    }
    if (stops.length < 2) return null;
    return { type, angle, stops };
  } catch { return null; }
}

const GradientEditor: React.FC<{ value: string; onChange: (css: string) => void }> = ({ value, onChange }) => {
  const [type, setType] = useState('linear');
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<GradientStop[]>([
    { id: 'a', position: 0,   color: '#ffffff', opacity: 100 },
    { id: 'b', position: 100, color: '#999999', opacity: 100 },
  ]);
  const [activeId, setActiveId] = useState('a');
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<string | null>(null);

  useEffect(() => {
    const parsed = parseGradientCss(value);
    if (parsed) {
      setType(parsed.type); setAngle(parsed.angle); setStops(parsed.stops);
      setActiveId(parsed.stops[0]?.id ?? '');
    } else {
      const def = [{ id:'a', position:0, color:'#ffffff', opacity:100 }, { id:'b', position:100, color:'#999999', opacity:100 }];
      onChange(buildGradientCss('linear', 135, def));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = (t=type, a=angle, s=stops) => onChange(buildGradientCss(t, a, s));

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const pos = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width)*100)));
      setStops(prev => { const next = prev.map(s => s.id===dragging.current ? {...s,position:pos} : s); onChange(buildGradientCss(type,angle,next)); return next; });
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [type, angle, onChange]);

  const addStop = () => {
    const ns: GradientStop = { id: Date.now().toString(36), position: 50, color: '#888888', opacity: 100 };
    const next = [...stops, ns]; setStops(next); setActiveId(ns.id); emit(type, angle, next);
  };
  const removeStop = (id: string) => { const next = stops.filter(s=>s.id!==id); setStops(next); emit(type, angle, next); };
  const updateStop = (id: string, patch: Partial<GradientStop>) => {
    const next = stops.map(s => s.id===id ? {...s,...patch} : s); setStops(next); emit(type, angle, next);
  };
  const reverse = () => { const next = stops.map(s=>({...s,position:100-s.position})); setStops(next); emit(type,angle,next); };
  const cssGradient = buildGradientCss(type, angle, stops);

  return (
    <div style={{ fontFamily: T.font }}>
      {/* Type + controls */}
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
        <div style={{ position:'relative', flex:1 }}>
          <select value={type} onChange={e=>{ setType(e.target.value); emit(e.target.value,angle,stops); }} style={{
            width:'100%', appearance:'none', WebkitAppearance:'none',
            background:T.inputBg, border:T.inputBorder, borderRadius:7,
            color:T.valueColor, fontFamily:T.font, fontSize:12,
            padding:'6px 28px 6px 10px', cursor:'pointer', outline:'none',
          }}>
            <option value="linear">Linear</option>
            <option value="radial">Radial</option>
            <option value="conic">Conic</option>
          </select>
          <ChevronDown size={10} strokeWidth={1.8} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:T.labelColor }} />
        </div>
        {/* Reverse */}
        <button onClick={reverse} title="Reverse" style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', background:T.inputBg, border:T.inputBorder, borderRadius:7, cursor:'pointer', color:T.labelColor }}>
          <ArrowLeftRight size={14} strokeWidth={1.5} />
        </button>
        {/* Angle (linear/conic) */}
        {type !== 'radial' && (
          <button onClick={()=>{ const a=(angle+45)%360; setAngle(a); emit(type,a,stops); }} title={`${angle}°`} style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', background:T.inputBg, border:T.inputBorder, borderRadius:7, cursor:'pointer', color:T.labelColor }}>
            <RotateCcw size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Preview bar + handles */}
      <div style={{ position:'relative', marginBottom:16, userSelect:'none' }}>
        {/* Handles */}
        <div style={{ position:'relative', height:22, marginBottom:4 }}>
          {stops.map(stop => (
            <div key={stop.id}
              onMouseDown={e=>{ e.preventDefault(); setActiveId(stop.id); dragging.current=stop.id; }}
              style={{
                position:'absolute', left:`calc(${stop.position}% - 11px)`, top:1,
                width:20, height:20, borderRadius:5, background:stop.color, boxSizing:'border-box',
                border: stop.id===activeId ? '2.5px solid #3b82f6' : '2px solid rgba(255,255,255,0.65)',
                boxShadow: stop.id===activeId ? '0 0 0 2px rgba(59,130,246,0.35)' : '0 1px 4px rgba(0,0,0,0.45)',
                cursor:'grab', transition:'border 0.1s, box-shadow 0.1s',
              }} />
          ))}
        </div>
        {/* Bar */}
        <div ref={barRef} onClick={e=>{
          if (!barRef.current || dragging.current) return;
          const rect = barRef.current.getBoundingClientRect();
          const pos = Math.round(((e.clientX-rect.left)/rect.width)*100);
          const src = stops.find(s=>s.id===activeId) ?? stops[0];
          const ns: GradientStop = {...src, id:Date.now().toString(36), position:pos};
          const next = [...stops,ns]; setStops(next); setActiveId(ns.id); emit(type,angle,next);
        }} style={{ height:28, borderRadius:8, background:cssGradient, cursor:'crosshair', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>

      {/* Stops header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:11, fontWeight:600, color:T.valueColor }}>Stops</span>
        <button onClick={addStop} style={{ width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', background:T.inputBg, border:T.inputBorder, borderRadius:6, cursor:'pointer', color:T.labelColor, fontSize:16, lineHeight:1 }}>+</button>
      </div>

      {/* Stops list */}
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {[...stops].sort((a,b)=>a.position-b.position).map(stop => (
          <div key={stop.id} onClick={()=>setActiveId(stop.id)} style={{
            display:'flex', alignItems:'center', gap:5, padding:'5px 8px', borderRadius:8, cursor:'pointer',
            background: stop.id===activeId ? 'rgba(59,130,246,0.12)' : T.inputBg,
            border: stop.id===activeId ? '1px solid rgba(59,130,246,0.35)' : T.inputBorder,
            transition:'all 0.12s',
          }}>
            {/* Position */}
            <input type="number" min={0} max={100} value={stop.position}
              onClick={e=>e.stopPropagation()}
              onChange={e=>updateStop(stop.id,{position:Math.max(0,Math.min(100,+e.target.value))})}
              style={{ width:32, background:'transparent', border:'none', outline:'none', color:T.valueColor, fontSize:11, fontFamily:T.font }}
            />
            <span style={{ fontSize:10, color:T.labelColor }}>%</span>
            {/* Color swatch */}
            <div style={{ position:'relative', width:20, height:20, borderRadius:4, background:stop.color, border:'1px solid rgba(255,255,255,0.2)', flexShrink:0 }}>
              <input type="color" value={stop.color} onChange={e=>updateStop(stop.id,{color:e.target.value})}
                style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }} />
            </div>
            {/* Hex */}
            <input value={stop.color.replace('#','').toUpperCase()} onClick={e=>e.stopPropagation()}
              onChange={e=>{ const raw=e.target.value.replace(/[^0-9a-fA-F]/g,'').slice(0,6); if(raw.length===6) updateStop(stop.id,{color:'#'+raw}); }}
              style={{ flex:1, background:'transparent', border:'none', outline:'none', color:T.valueColor, fontSize:11, fontFamily:`'SF Mono',ui-monospace,Menlo,monospace` }}
            />
            {/* Opacity */}
            <input type="number" min={0} max={100} value={stop.opacity}
              onClick={e=>e.stopPropagation()}
              onChange={e=>updateStop(stop.id,{opacity:Math.max(0,Math.min(100,+e.target.value))})}
              style={{ width:30, background:'transparent', border:'none', outline:'none', color:T.valueColor, fontSize:11, fontFamily:T.font, textAlign:'right' }}
            />
            <span style={{ fontSize:10, color:T.labelColor }}>%</span>
            {/* Delete */}
            {stops.length > 2 && (
              <button onClick={e=>{e.stopPropagation(); removeStop(stop.id);}} style={{ background:'none', border:'none', cursor:'pointer', color:T.labelColor, fontSize:14, padding:'0 2px', lineHeight:1, display:'flex', alignItems:'center' }}>—</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Effect Popover ───────────────────────────────────────────────────────────

const EffectPopover: React.FC<{
  eff: EffectItem;
  anchorRect: DOMRect;
  panelRect: DOMRect;
  onUpdate: (patch: Partial<EffectItem>) => void;
  onClose: () => void;
}> = ({ eff, anchorRect, panelRect, onUpdate, onClose }) => {
  const isShadow = eff.type === 'drop-shadow' || eff.type === 'inner-shadow';
  const isBlur   = eff.type === 'layer-blur'  || eff.type === 'background-blur';

  const popoverWidth = 280;
  const gap = 12;

  // Decide: place to LEFT or RIGHT of panel based on available space
  const spaceLeft  = panelRect.left - gap;
  const spaceRight = window.innerWidth - panelRect.right - gap;
  const placeRight = spaceLeft < popoverWidth && spaceRight >= popoverWidth;

  const left = placeRight
    ? panelRect.right + gap
    : Math.max(8, panelRect.left - popoverWidth - gap);

  const top = Math.min(
    window.innerHeight - 420,
    Math.max(8, anchorRect.top - 10),
  );

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', zIndex: 2147483646,
        left, top, width: popoverWidth,
        background: 'rgba(28,28,30,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        padding: '14px 16px 16px',
        fontFamily: T.font,
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ position:'relative', flex:1 }}>
          <select value={eff.type} onChange={e => onUpdate({ type: e.target.value as EffectType })} style={{
            appearance:'none', WebkitAppearance:'none', background:'transparent', border:'none', outline:'none',
            color: T.valueColor, fontFamily: T.font, fontSize:13, fontWeight:700, cursor:'pointer', padding:'0 20px 0 0',
          }}>
            <option value="drop-shadow">Drop shadow</option>
            <option value="inner-shadow">Inner shadow</option>
            <option value="layer-blur">Layer blur</option>
            <option value="background-blur">Background blur</option>
          </select>
          <ChevronDown size={10} strokeWidth={2} style={{ position:'absolute', right:2, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color: T.labelColor }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {isShadow && <Droplet size={14} strokeWidth={1.5} style={{ color: T.labelColor }} />}
          {isBlur && (
            <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: T.labelColor }}>
              <circle cx="8" cy="8" r="5" strokeDasharray="2 2"/><circle cx="8" cy="8" r="2"/>
            </svg>
          )}
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color: T.labelColor, padding:2, display:'flex', alignItems:'center' }}>
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Shadow fields */}
      {isShadow && (
        <>
          {/* Position X / Y — horizontal */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:11, color: T.labelColor, width:52, flexShrink:0 }}>Position</span>
            <div style={{ flex:1, display:'flex', gap:6 }}>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:6, background: T.inputBg, border: T.inputBorder, borderRadius:7, padding:'5px 8px' }}>
                <span style={{ fontSize:10, color: T.labelColor, flexShrink:0 }}>X</span>
                <input type="number" value={eff.x} onChange={e => onUpdate({ x: +e.target.value })}
                  style={{ width:0, flex:1, background:'transparent', border:'none', outline:'none', color: T.valueColor, fontSize:12, fontFamily: T.font }} />
              </div>
              <div style={{ flex:1, display:'flex', alignItems:'center', gap:6, background: T.inputBg, border: T.inputBorder, borderRadius:7, padding:'5px 8px' }}>
                <span style={{ fontSize:10, color: T.labelColor, flexShrink:0 }}>Y</span>
                <input type="number" value={eff.y} onChange={e => onUpdate({ y: +e.target.value })}
                  style={{ width:0, flex:1, background:'transparent', border:'none', outline:'none', color: T.valueColor, fontSize:12, fontFamily: T.font }} />
              </div>
            </div>
          </div>

          {/* Blur */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:11, color: T.labelColor, width:52, flexShrink:0 }}>Blur</span>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background: T.inputBg, border: T.inputBorder, borderRadius:7, padding:'5px 10px' }}>
              <svg width={13} height={13} viewBox="0 0 16 16" fill="none" style={{ color: T.labelColor, flexShrink:0 }}>
                <circle cx="8" cy="8" r="2" fill="currentColor"/>
                <circle cx="4" cy="8" r="1.2" fill="currentColor" opacity=".5"/>
                <circle cx="12" cy="8" r="1.2" fill="currentColor" opacity=".5"/>
                <circle cx="8" cy="4" r="1.2" fill="currentColor" opacity=".5"/>
                <circle cx="8" cy="12" r="1.2" fill="currentColor" opacity=".5"/>
              </svg>
              <input type="number" min={0} value={eff.blur} onChange={e => onUpdate({ blur: +e.target.value })}
                style={{ flex:1, background:'transparent', border:'none', outline:'none', color: T.valueColor, fontSize:12, fontFamily: T.font }} />
            </div>
          </div>

          {/* Spread */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <span style={{ fontSize:11, color: T.labelColor, width:52, flexShrink:0 }}>Spread</span>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background: T.inputBg, border: T.inputBorder, borderRadius:7, padding:'5px 10px' }}>
              <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ color: T.labelColor, flexShrink:0 }}>
                <circle cx="8" cy="8" r="3" strokeDasharray="1.5 1.5"/>
                <circle cx="8" cy="8" r="6" strokeDasharray="1.5 1.5" opacity=".4"/>
              </svg>
              <input type="number" value={eff.spread} onChange={e => onUpdate({ spread: +e.target.value })}
                style={{ flex:1, background:'transparent', border:'none', outline:'none', color: T.valueColor, fontSize:12, fontFamily: T.font }} />
            </div>
          </div>

          {/* Color */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:11, color: T.labelColor, width:52, flexShrink:0 }}>Color</span>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {/* swatch + hex */}
              <div style={{ display:'flex', alignItems:'center', gap:6, background: T.inputBg, border: T.inputBorder, borderRadius:7, padding:'5px 8px' }}>
                <div style={{ position:'relative', width:18, height:18, borderRadius:3, background: eff.color, border:'1px solid rgba(255,255,255,0.2)', flexShrink:0 }}>
                  <input type="color" value={eff.color} onChange={e => onUpdate({ color: e.target.value })}
                    style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }} />
                </div>
                <input value={eff.color.replace('#','').toUpperCase()}
                  onChange={e => { const raw = e.target.value.replace(/[^0-9a-fA-F]/g,'').slice(0,6); if (raw.length===6) onUpdate({ color:'#'+raw }); }}
                  style={{ width:56, background:'transparent', border:'none', outline:'none', color: T.valueColor, fontSize:12, fontFamily:`'SF Mono',ui-monospace,Menlo,monospace` }} />
              </div>
              {/* opacity */}
              <div style={{ display:'flex', alignItems:'center', gap:4, background: T.inputBg, border: T.inputBorder, borderRadius:7, padding:'5px 8px', width:58 }}>
                <input type="number" min={0} max={100} value={eff.colorOpacity} onChange={e => onUpdate({ colorOpacity: Math.max(0,Math.min(100,+e.target.value)) })}
                  style={{ width:0, flex:1, background:'transparent', border:'none', outline:'none', color: T.valueColor, fontSize:12, fontFamily: T.font, textAlign:'right' }} />
                <span style={{ fontSize:10, color: T.labelColor, flexShrink:0 }}>%</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Blur-only field */}
      {isBlur && (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:11, color: T.labelColor, width:52, flexShrink:0 }}>Blur</span>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background: T.inputBg, border: T.inputBorder, borderRadius:7, padding:'5px 10px' }}>
            <input type="number" min={0} value={eff.blur} onChange={e => onUpdate({ blur: +e.target.value })}
              style={{ flex:1, background:'transparent', border:'none', outline:'none', color: T.valueColor, fontSize:12, fontFamily: T.font }} />
          </div>
        </div>
      )}
    </div>
  );

};

// ─── Image Upload ─────────────────────────────────────────────────────────────

const UploadModal: React.FC<{
  preview: string;
  filename: string;
  onBase64: () => void;
  onPublic: () => void;
  onCancel: () => void;
  uploading: boolean;
}> = ({ preview, filename, onBase64, onPublic, onCancel, uploading }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 2147483647,
    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }} onClick={onCancel}>
    <div style={{
      background: 'rgba(22,22,24,0.98)', border: '0.5px solid rgba(255,255,255,0.12)',
      borderRadius: 16, padding: 20, width: 240, boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
    }} onClick={e => e.stopPropagation()}>
      {/* Preview */}
      <img src={preview} alt="preview" style={{
        width: '100%', height: 120, objectFit: 'contain', borderRadius: 8,
        background: 'rgba(255,255,255,0.04)', marginBottom: 12, display: 'block',
      }} />
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {filename}
      </div>
      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onBase64} style={{
          padding: '9px 14px', borderRadius: 9, border: '0.5px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)',
          fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}>
          ⚡ Use as Base64 <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>— instant, no server</span>
        </button>
        <button onClick={onPublic} disabled={uploading} style={{
          padding: '9px 14px', borderRadius: 9, border: '0.5px solid rgba(168,85,247,0.3)',
          background: uploading ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.15)',
          color: uploading ? 'rgba(168,85,247,0.5)' : '#c084fc',
          fontSize: 12, fontWeight: 500, cursor: uploading ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}>
          {uploading ? '⏳ Uploading…' : '📁 Save to public/uploads/'} {!uploading && <span style={{ color: 'rgba(168,85,247,0.5)', fontSize: 10 }}>— clean URL</span>}
        </button>
        <button onClick={onCancel} style={{
          padding: '6px', borderRadius: 8, border: 'none',
          background: 'transparent', color: 'rgba(255,255,255,0.3)',
          fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
        }}>Cancel</button>
      </div>
    </div>
  </div>
);

const UploadButton: React.FC<{ label: string; onFile: (file: File) => void }> = ({ label, onFile }) => {
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) { onFile(f); e.target.value = ''; } }} />
      <button onClick={() => ref.current?.click()} style={{
        width: '100%', padding: '7px 10px', borderRadius: 8, marginTop: 8,
        border: '0.5px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)',
        color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        transition: 'background 0.15s, border-color 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
      >
        <Upload size={12} strokeWidth={1.5} />
        {label}
      </button>
    </>
  );
};

// ─── DOM Tree Popover ─────────────────────────────────────────────────────────

function getNodeLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if ((el as HTMLElement).id) return `${tag}#${(el as HTMLElement).id}`;
  const first = el.classList[0];
  return first ? `${tag}.${first}` : tag;
}

const DomTreeNode: React.FC<{
  label: string;
  selected?: boolean;
  muted?: boolean;
  accent?: boolean;
  indent?: number;
  showLine?: boolean;
}> = ({ label, selected, muted, accent, indent = 0, showLine }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: indent * 14 }}>
    {showLine && (
      <div style={{
        width: 10, height: 16, borderLeft: '1.5px solid rgba(255,255,255,0.12)',
        borderBottom: '1.5px solid rgba(255,255,255,0.12)', borderRadius: '0 0 0 4px',
        flexShrink: 0, marginTop: -8,
      }} />
    )}
    <div style={{
      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500,
      fontFamily: `'SF Mono', ui-monospace, Menlo, monospace`,
      border: selected
        ? '1.5px solid rgba(52,211,153,0.7)'
        : '1px solid rgba(255,255,255,0.08)',
      background: selected
        ? 'rgba(52,211,153,0.08)'
        : 'rgba(255,255,255,0.05)',
      color: selected
        ? 'rgba(52,211,153,0.95)'
        : accent
          ? 'rgba(251,191,36,0.85)'
          : muted
            ? 'rgba(255,255,255,0.35)'
            : 'rgba(255,255,255,0.7)',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </div>
  </div>
);

const CollapsedNode: React.FC<{ count: number; indent?: number }> = ({ count, indent = 0 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: indent * 14 }}>
    <div style={{
      width: 10, height: 16,
      borderLeft: '1.5px solid rgba(255,255,255,0.12)',
      borderBottom: '1.5px solid rgba(255,255,255,0.12)',
      borderRadius: '0 0 0 4px', flexShrink: 0, marginTop: -8,
    }} />
    <div style={{
      padding: '3px 8px', borderRadius: 6, fontSize: 10,
      background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      ···
    </div>
    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>({count} more)</span>
  </div>
);

const DomTreePopover: React.FC<{ el: HTMLElement; onClose: () => void }> = ({ el, onClose }) => {
  // Collect ancestors (body → ... → immediate parent)
  const ancestors: Element[] = [];
  let cur: Element | null = el.parentElement;
  while (cur && cur.tagName !== 'HTML') {
    ancestors.unshift(cur);
    cur = cur.parentElement;
  }

  const bodyEl = ancestors[0];
  const immediateParent = ancestors[ancestors.length - 1];
  const hiddenAncestors = ancestors.length > 2 ? ancestors.length - 2 : 0;

  const children = Array.from(el.children);
  const firstChild = children[0] as HTMLElement | undefined;
  const moreChildren = children.length - 1;

  return (
    <div
      style={{
        position: 'absolute', top: 50, left: 8, right: 8,
        background: 'rgba(18,18,20,0.97)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '12px 12px 10px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        zIndex: 10, backdropFilter: 'blur(20px)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 8, right: 8,
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
        cursor: 'pointer', fontSize: 12, padding: '2px 6px',
      }}>✕</button>

      {/* body */}
      {bodyEl && <DomTreeNode label={getNodeLabel(bodyEl)} muted />}

      {/* collapsed middle ancestors */}
      {hiddenAncestors > 0 && <CollapsedNode count={hiddenAncestors} indent={1} />}

      {/* immediate parent (if different from body) */}
      {immediateParent && immediateParent !== bodyEl && (
        <DomTreeNode label={getNodeLabel(immediateParent)} indent={hiddenAncestors > 0 ? 1 : 1} showLine />
      )}

      {/* selected element */}
      <DomTreeNode
        label={getNodeLabel(el)}
        selected
        indent={ancestors.length > 1 ? 2 : 1}
        showLine
      />

      {/* first child */}
      {firstChild && (
        <DomTreeNode label={getNodeLabel(firstChild)} accent indent={3} showLine />
      )}

      {/* more children */}
      {moreChildren > 0 && <CollapsedNode count={moreChildren} indent={3} />}
    </div>
  );
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
  const [showDomTree, setShowDomTree] = useState(false);
  const [uploadPending, setUploadPending] = useState<{ file: File; base64: string; target: 'img-src' | 'bg-image' } | null>(null);
  const [uploading, setUploading] = useState(false);

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
  // Alignment (flex/grid parent controls)
  const [alignItems, setAlignItems] = useState('flex-start');
  const [justifyContent, setJustifyContent] = useState('flex-start');
  const [gap, setGap] = useState('0');
  const [transformOrigin, setTransformOrigin] = useState('center center');
  const [flexDirection, setFlexDirection] = useState('row');
  const [flexWrap, setFlexWrap] = useState('nowrap');
  const [display, setDisplay] = useState('block');
  const [visibility, setVisibility] = useState('visible');
  const [overflow, setOverflow] = useState('visible');
  const [cssFloat, setCssFloat] = useState('none');
  const [cssClear, setCssClear] = useState('none');

  // Spacing
  const [padding, setPadding] = useState<SpacingValues>({ top: '0px', right: '0px', bottom: '0px', left: '0px' });
  const [margin, setMargin] = useState<SpacingValues>({ top: '0px', right: '0px', bottom: '0px', left: '0px' });

  // Fill
  const [bgColor, setBgColor] = useState('transparent');
  const [bgImage, setBgImage] = useState('none');
  const [bgSize, setBgSize] = useState('cover');
  const [bgCustomSize, setBgCustomSize] = useState('');
  const [bgPosition, setBgPosition] = useState('center');
  const [bgPosX, setBgPosX] = useState('50%');
  const [bgPosY, setBgPosY] = useState('50%');
  const [bgRepeat, setBgRepeat] = useState('no-repeat');
  const [bgAttachment, setBgAttachment] = useState('scroll');
  const [bgImageMode, setBgImageMode] = useState<'none' | 'gradient' | 'custom'>('none');

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
  const [blendMode, setBlendMode] = useState('normal');
  const [effects, setEffects] = useState<EffectItem[]>([]);
  const [expandedEffectId, setExpandedEffectId] = useState<string | null>(null);
  const [effectAnchorRect, setEffectAnchorRect] = useState<DOMRect | null>(null);
  const [effectPanelRect, setEffectPanelRect] = useState<DOMRect | null>(null);

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

  // ── Panel DOM refs (must be before conditional returns) ───────────────────
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  // ── Click-away: close effect popover when clicking outside the panel ──────
  useEffect(() => {
    if (!expandedEffectId) return;
    function onMouseDown(e: MouseEvent) {
      const path = e.composedPath ? e.composedPath() : [];
      if (wrapperRef.current && path.includes(wrapperRef.current as EventTarget)) return;
      setExpandedEffectId(null);
      setEffectAnchorRect(null);
      setEffectPanelRect(null);
    }
    document.addEventListener('mousedown', onMouseDown, true);
    return () => document.removeEventListener('mousedown', onMouseDown, true);
  }, [expandedEffectId]);

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
    const normAlign = (v: string) => (v === 'normal' || !v) ? 'flex-start' : v;
    setAlignItems(normAlign(cs.alignItems));
    setJustifyContent(normAlign(cs.justifyContent));
    setGap((parseFloat(cs.gap) || 0).toString());
    setTransformOrigin('center center'); // computed returns px values; always reset to keyword default
    setFlexDirection(cs.flexDirection || 'row');
    setFlexWrap(cs.flexWrap || 'nowrap');
    setDisplay(cs.display || 'block');
    setVisibility(cs.visibility || 'visible');
    setOverflow(cs.overflow || 'visible');
    setCssFloat(cs.float || 'none');
    setCssClear(cs.clear || 'none');

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
    const rawBgSize = cs.backgroundSize || 'cover';
    if (rawBgSize === 'cover' || rawBgSize === 'contain') {
      setBgSize(rawBgSize); setBgCustomSize('');
    } else {
      setBgSize('custom'); setBgCustomSize(rawBgSize);
    }
    setBgPosition(cs.backgroundPosition || 'center');
    const posParts = (cs.backgroundPosition || '50% 50%').split(' ');
    setBgPosX(posParts[0] || '50%');
    setBgPosY(posParts[1] || posParts[0] || '50%');
    setBgRepeat(cs.backgroundRepeat || 'no-repeat');
    setBgAttachment(cs.backgroundAttachment || 'scroll');
    const rawImg = cs.backgroundImage || 'none';
    setBgImage(rawImg);
    if (rawImg === 'none') setBgImageMode('none');
    else if (rawImg.startsWith('linear-gradient') || rawImg.startsWith('radial-gradient') || rawImg.startsWith('conic-gradient')) setBgImageMode('gradient');
    else setBgImageMode('custom');

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
    setBlendMode(cs.mixBlendMode || 'normal');
    const parsedEffects: EffectItem[] = [];
    // Parse box-shadow (drop + inner shadow)
    const rawShadow = cs.boxShadow;
    if (rawShadow && rawShadow !== 'none') {
      const shadowParts = rawShadow.split(/,(?![^(]*\))/);
      for (const part of shadowParts) {
        const isInner = /\binset\b/.test(part);
        const nums = part.match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px/);
        const rgba = part.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        parsedEffects.push({
          id: Math.random().toString(36).slice(2), type: isInner ? 'inner-shadow' : 'drop-shadow',
          visible: true, x: nums ? +nums[1] : 0, y: nums ? +nums[2] : 4,
          blur: nums ? +nums[3] : 4, spread: nums ? +nums[4] : 0,
          color: rgba ? rgbToHex(+rgba[1],+rgba[2],+rgba[3]) : '#000000',
          colorOpacity: rgba ? Math.round((parseFloat(rgba[4]??'1'))*100) : 25,
        });
      }
    }
    // Parse filter blur (layer blur)
    const filt = cs.filter || '';
    const fBlurM = filt.match(/blur\(([\d.]+)px\)/);
    if (fBlurM && +fBlurM[1] > 0) parsedEffects.push({ id: Math.random().toString(36).slice(2), type:'layer-blur', visible:true, x:0,y:0,blur:+fBlurM[1],spread:0, color:'#000000',colorOpacity:100 });
    // Parse backdrop-filter blur (background blur)
    const bdFilt = cs.backdropFilter || '';
    const bBlurM = bdFilt.match(/blur\(([\d.]+)px\)/);
    if (bBlurM && +bBlurM[1] > 0) parsedEffects.push({ id: Math.random().toString(36).slice(2), type:'background-blur', visible:true, x:0,y:0,blur:+bBlurM[1],spread:0, color:'#000000',colorOpacity:100 });
    setEffects(parsedEffects);
    setExpandedEffectId(null);

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
  const handleDisplay = (v: string) => { setDisplay(v); applyProp('display', v); };
  const handleVisibility = (v: string) => { setVisibility(v); applyProp('visibility', v); };
  const handleOverflow = (v: string) => { setOverflow(v); applyProp('overflow', v); };
  const handleFloat = (v: string) => { setCssFloat(v); applyProp('float', v); };
  const handleClear = (v: string) => { setCssClear(v); applyProp('clear', v); };
  const handleAlignItems = (v: string) => {
    setAlignItems(v);
    // Ensure flex so align-items is visible
    const cs = el ? window.getComputedStyle(el) : null;
    if (cs && cs.display !== 'flex' && cs.display !== 'grid') applyProp('display', 'flex');
    applyProp('align-items', v);
  };
  const handleJustifyContent = (v: string) => {
    setJustifyContent(v);
    const cs = el ? window.getComputedStyle(el) : null;
    if (cs && cs.display !== 'flex' && cs.display !== 'grid') applyProp('display', 'flex');
    applyProp('justify-content', v);
  };
  const handleFlexDirection = (dir: string, wrap: string) => {
    setFlexDirection(dir); setFlexWrap(wrap);
    const cs = el ? window.getComputedStyle(el) : null;
    if (cs && cs.display !== 'flex' && cs.display !== 'grid') applyProp('display', 'flex');
    applyProp('flex-direction', dir);
    applyProp('flex-wrap', wrap);
  };
  const handleGap = (v: string) => { setGap(v); applyProp('gap', `${v}px`); };
  const handleTransformOrigin = (v: string) => { setTransformOrigin(v); applyProp('transform-origin', v); };

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
  const handleBgSize = (v: string) => { setBgSize(v); if (v !== 'custom') applyProp('background-size', v); };
  const handleBgCustomSize = (v: string) => { setBgCustomSize(v); applyProp('background-size', v); };
  const handleBgPosition = (v: string) => { setBgPosition(v); applyProp('background-position', v); };
  const handleBgPosX = (v: string) => { setBgPosX(v); const pos = `${v} ${bgPosY}`; setBgPosition(pos); applyProp('background-position', pos); };
  const handleBgPosY = (v: string) => { setBgPosY(v); const pos = `${bgPosX} ${v}`; setBgPosition(pos); applyProp('background-position', pos); };
  const handleBgRepeat = (v: string) => { setBgRepeat(v); applyProp('background-repeat', v); };
  const handleBgAttachment = (v: string) => { setBgAttachment(v); applyProp('background-attachment', v); };

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
  const handleBlendMode = (v: string) => { setBlendMode(v); applyProp('mix-blend-mode', v); };

  const applyEffects = (effs: EffectItem[]) => {
    // box-shadow
    const shadows = effs.filter(e => e.visible && (e.type==='drop-shadow'||e.type==='inner-shadow'));
    if (shadows.length > 0) {
      const css = shadows.map(e => {
        const {r,g,b} = hexToRgb(e.color);
        const a = (e.colorOpacity/100).toFixed(2);
        return `${e.type==='inner-shadow'?'inset ':''}${e.x}px ${e.y}px ${e.blur}px ${e.spread}px rgba(${r},${g},${b},${a})`;
      }).join(', ');
      applyProp('box-shadow', css);
    } else { applyProp('box-shadow', 'none'); }
    // filter blur
    const layerBlur = effs.find(e => e.visible && e.type==='layer-blur');
    applyProp('filter', layerBlur ? `blur(${layerBlur.blur}px)` : 'none');
    // backdrop-filter
    const bgBlur = effs.find(e => e.visible && e.type==='background-blur');
    applyProp('backdrop-filter', bgBlur ? `blur(${bgBlur.blur}px)` : 'none');
  };

  const addEffect = () => {
    const ne: EffectItem = { id: Date.now().toString(36), type:'drop-shadow', visible:true, x:0, y:4, blur:4, spread:0, color:'#000000', colorOpacity:25 };
    const next = [...effects, ne]; setEffects(next); setExpandedEffectId(ne.id); applyEffects(next);
  };
  const removeEffect = (id: string) => { const next = effects.filter(e=>e.id!==id); setEffects(next); applyEffects(next); };
  const toggleEffect = (id: string) => {
    const next = effects.map(e => e.id===id ? {...e,visible:!e.visible} : e); setEffects(next); applyEffects(next);
  };
  const updateEffect = (id: string, patch: Partial<EffectItem>) => {
    const next = effects.map(e => e.id===id ? {...e,...patch} : e); setEffects(next); applyEffects(next);
  };

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

  // ── Image upload ──────────────────────────────────────────────────────────

  const handleFileSelect = (file: File, target: 'img-src' | 'bg-image') => {
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPending({ file, base64: reader.result as string, target });
    };
    reader.readAsDataURL(file);
  };

  const applyImage = (url: string, target: 'img-src' | 'bg-image') => {
    if (!el) return;
    if (target === 'img-src') {
      const old = (el as HTMLImageElement).src;
      (el as HTMLImageElement).src = url;
      changeTracker.recordChange(el, 'image', 'src', old, url);
    } else {
      const val = `url("${url}")`;
      applyProp('background-image', val);
    }
    setUploadPending(null);
  };

  const handleUseBase64 = () => {
    if (!uploadPending) return;
    applyImage(uploadPending.base64, uploadPending.target);
  };

  const handleSaveToPublic = async () => {
    if (!uploadPending) return;
    setUploading(true);
    try {
      const rawBase64 = uploadPending.base64.split(',')[1];
      const res = await fetch('/__optate/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadPending.file.name,
          data: rawBase64,
          mimeType: uploadPending.file.type,
        }),
      });
      const data = await res.json();
      if (data.url) applyImage(data.url, uploadPending.target);
      else alert('Upload failed: ' + (data.error ?? 'unknown error'));
    } catch (err) {
      alert('Upload failed — is the Optate dev server running?');
    } finally {
      setUploading(false);
    }
  };

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
  const elId = el.id ? `#${el.id}` : '';
  const elClass = el.classList.length > 0 ? `.${el.classList[0]}` : '';
  const elIdentifier = elId || elClass || '';

  // Outer wrapper: fixed position + z-index only — NO overflow, NO transform
  const wrapperStyle: React.CSSProperties = {
    position: 'fixed',
    top: 12,
    bottom: 12,
    [panelSide]: 12,
    width: 260,
    zIndex: 2147483646,
    overflow: 'visible',
    pointerEvents: 'none',
  };

  // Inner panel: has overflow:hidden + slide-in animation
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: T.panelBg,
    backdropFilter: 'blur(40px) saturate(180%)',
    border: T.border,
    borderRadius: 18,
    boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: T.font,
    overflow: 'hidden',
    transform: mounted ? 'none' : `translateX(${panelSide === 'right' ? '120%' : '-120%'})`,
    transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
    pointerEvents: 'auto',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
    <div ref={panelRef} style={panelStyle} onClick={() => showDomTree && setShowDomTree(false)}>
      {/* ── Upload Modal ── */}
      {uploadPending && (
        <UploadModal
          preview={uploadPending.base64}
          filename={uploadPending.file.name}
          onBase64={handleUseBase64}
          onPublic={handleSaveToPublic}
          onCancel={() => setUploadPending(null)}
          uploading={uploading}
        />
      )}

      {/* ── DOM Tree Popover ── */}
      {showDomTree && <DomTreePopover el={el} onClose={() => setShowDomTree(false)} />}

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: T.border, flexShrink: 0,
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div
          onClick={e => { e.stopPropagation(); setShowDomTree(v => !v); }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, overflow: 'hidden', cursor: 'pointer' }}
        >
          {/* Tree icon */}
          <Network size={13} strokeWidth={1.5} style={{ color: showDomTree ? T.accent : 'rgba(255,255,255,0.35)' }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px',
            borderRadius: 7,
            border: showDomTree ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.08)',
            background: showDomTree ? 'rgba(52,211,153,0.07)' : 'transparent',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 12, color: T.valueColor, fontWeight: 600, fontFamily: T.font, whiteSpace: 'nowrap' }}>
              {tag}{elIdentifier}
            </span>
          </div>
          {componentName && (
            <span style={{ fontSize: 10, color: T.labelColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {componentName}
            </span>
          )}
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
          {/* Position type — dropdown */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ position: 'relative' }}>
              <select
                value={position}
                onChange={e => handlePosition(e.target.value)}
                style={{
                  width: '100%', appearance: 'none', WebkitAppearance: 'none',
                  background: T.inputBg, border: T.inputBorder, borderRadius: 7,
                  color: T.valueColor, fontSize: 11, fontFamily: T.font,
                  padding: '6px 28px 6px 10px', outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="static">Static</option>
                <option value="relative">Relative</option>
                <option value="absolute">Absolute</option>
                <option value="fixed">Fixed</option>
                <option value="sticky">Sticky</option>
              </select>
              {/* Chevron */}
              <ChevronDown size={10} strokeWidth={1.8} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.labelColor }} />
            </div>
          </div>

          {/* Display */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, display: 'block', marginBottom: 5, letterSpacing: '0.04em' }}>Display</span>
            <div style={{ position: 'relative' }}>
              <select
                value={display}
                onChange={e => handleDisplay(e.target.value)}
                style={{
                  width: '100%', appearance: 'none', WebkitAppearance: 'none',
                  background: T.inputBg, border: T.inputBorder, borderRadius: 7,
                  color: T.valueColor, fontFamily: T.font, fontSize: 12,
                  padding: '6px 28px 6px 10px', cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="block">Block</option>
                <option value="inline">Inline</option>
                <option value="inline-block">Inline-block</option>
                <option value="flex">Flex</option>
                <option value="inline-flex">Inline-flex</option>
                <option value="grid">Grid</option>
                <option value="inline-grid">Inline-grid</option>
                <option value="none">None</option>
              </select>
              <ChevronDown size={10} strokeWidth={1.8} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.labelColor }} />
            </div>
          </div>

          {/* Flow — between dropdown and alignment */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, display: 'block', marginBottom: 5, letterSpacing: '0.04em' }}>Flow direction</span>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 3 }}>
            {([
              { dir: 'row',    title: 'Horizontal', icon: <MoveHorizontal size={16} strokeWidth={1.5} /> },
              { dir: 'column', title: 'Vertical',   icon: <MoveVertical size={16} strokeWidth={1.5} /> },
            ] as Array<{ dir: string; title: string; icon: React.ReactNode }>).map(({ dir, title, icon }) => {
              const active = flexDirection === dir;
              return (
                <button key={dir} title={title} onClick={() => handleFlexDirection(dir, flexWrap)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 26, borderRadius: 6, border: 'none', outline: 'none', cursor: 'pointer',
                  background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                  transition: 'all 0.12s',
                }}>{icon}</button>
              );
            })}
          </div>
          </div>

          {/* X / Y when positioned */}
          {position !== 'static' && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {/* X input */}
              {[
                { label: 'X', val: posLeft, onChange: handlePosLeft },
                { label: 'Y', val: posTop,  onChange: handlePosTop },
              ].map(({ label, val, onChange }) => {
                const num = val.replace('px', '');
                return (
                  <div key={label} style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                    background: T.inputBg, border: T.inputBorder, borderRadius: 7,
                    padding: '5px 8px',
                  }}>
                    <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, flexShrink: 0 }}>{label}</span>
                    <input
                      defaultValue={num}
                      key={num}
                      onBlur={e => onChange(`${parseFloat(e.target.value) || 0}px`)}
                      onKeyDown={e => { if (e.key === 'Enter') onChange(`${parseFloat((e.target as HTMLInputElement).value) || 0}px`); }}
                      style={{
                        flex: 1, background: 'transparent', border: 'none', outline: 'none',
                        color: T.valueColor, fontSize: 11, fontFamily: T.font, minWidth: 0,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}


          {/* Alignment — 6 buttons (3 justify + 3 align) */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, display: 'block', marginBottom: 5, letterSpacing: '0.04em' }}>Alignment</span>
            <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 3 }}>
              {/* justify-content buttons */}
              {([
                { t: 'Justify start',  jc: 'flex-start' },
                { t: 'Justify center', jc: 'center'     },
                { t: 'Justify end',    jc: 'flex-end'   },
              ]).map(({ t, jc }) => {
                const active = justifyContent === jc;
                return (
                  <button key={jc} title={t} onClick={() => handleJustifyContent(jc)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 26, borderRadius: 6, border: 'none', outline: 'none', cursor: 'pointer',
                    background: active ? 'rgba(99,102,241,0.85)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                    boxShadow: active ? '0 1px 4px rgba(99,102,241,0.5)' : 'none',
                    transition: 'all 0.12s',
                  }}>
                    {jc === 'flex-start' && (
                      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="2" y1="2" x2="2" y2="14"/><rect x="4" y="4" width="5" height="3" rx="1"/><rect x="4" y="9" width="8" height="3" rx="1"/>
                      </svg>
                    )}
                    {jc === 'center' && (
                      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="2" x2="8" y2="14"/><rect x="4.5" y="4" width="7" height="3" rx="1"/><rect x="2.5" y="9" width="11" height="3" rx="1"/>
                      </svg>
                    )}
                    {jc === 'flex-end' && (
                      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="14" y1="2" x2="14" y2="14"/><rect x="7" y="4" width="5" height="3" rx="1"/><rect x="4" y="9" width="8" height="3" rx="1"/>
                      </svg>
                    )}
                  </button>
                );
              })}
              {/* Divider */}
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', alignSelf: 'stretch', margin: '2px 1px' }} />
              {/* align-items buttons */}
              {([
                { t: 'Align start',  ai: 'flex-start' },
                { t: 'Align center', ai: 'center'     },
                { t: 'Align end',    ai: 'flex-end'   },
              ]).map(({ t, ai }) => {
                const active = alignItems === ai;
                return (
                  <button key={ai} title={t} onClick={() => handleAlignItems(ai)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: 26, borderRadius: 6, border: 'none', outline: 'none', cursor: 'pointer',
                    background: active ? 'rgba(99,102,241,0.85)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                    boxShadow: active ? '0 1px 4px rgba(99,102,241,0.5)' : 'none',
                    transition: 'all 0.12s',
                  }}>
                    {ai === 'flex-start' && (
                      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="2" y1="2" x2="14" y2="2"/><rect x="4" y="4" width="3" height="5" rx="1"/><rect x="9" y="4" width="3" height="8" rx="1"/>
                      </svg>
                    )}
                    {ai === 'center' && (
                      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="2" y1="8" x2="14" y2="8"/><rect x="4" y="5" width="3" height="6" rx="1"/><rect x="9" y="3" width="3" height="10" rx="1"/>
                      </svg>
                    )}
                    {ai === 'flex-end' && (
                      <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="2" y1="14" x2="14" y2="14"/><rect x="4" y="7" width="3" height="5" rx="1"/><rect x="9" y="4" width="3" height="8" rx="1"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 9-point transform-origin grid */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, display: 'block', marginBottom: 5, letterSpacing: '0.04em' }}>Origin</span>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 4, background: T.inputBg, border: T.inputBorder,
              borderRadius: 8, padding: 6,
            }}>
              {([
                ['top left','top center','top right'],
                ['center left','center center','center right'],
                ['bottom left','bottom center','bottom right'],
              ] as const).flat().map(origin => {
                const active = transformOrigin === origin || (origin === 'center center' && transformOrigin === 'center');
                return (
                  <button key={origin} title={origin} onClick={() => handleTransformOrigin(origin)} style={{
                    height: 20, borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: active ? T.accent : 'rgba(255,255,255,0.25)',
                      transition: 'background 0.15s',
                    }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gap */}
          <div>
            <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, display: 'block', marginBottom: 5, letterSpacing: '0.04em' }}>Gap</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                background: T.inputBg, border: T.inputBorder, borderRadius: 7, padding: '5px 8px',
              }}>
                {/* Gap icon — two bars with arrow between */}
                <MoveHorizontal size={14} strokeWidth={1.5} style={{ color: T.labelColor, flexShrink: 0 }} />
                <input
                  defaultValue={gap}
                  key={gap}
                  onBlur={e => handleGap(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleGap((e.target as HTMLInputElement).value); }}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: T.valueColor, fontSize: 11, fontFamily: T.font, minWidth: 0,
                  }}
                />
              </div>
              {/* Unit dropdown */}
              <div style={{ position: 'relative' }}>
                <select style={{
                  appearance: 'none', WebkitAppearance: 'none',
                  background: T.inputBg, border: T.inputBorder, borderRadius: 7,
                  color: T.valueColor, fontSize: 11, fontFamily: T.font,
                  padding: '5px 20px 5px 8px', outline: 'none', cursor: 'pointer',
                }}>
                  <option>px</option>
                  <option>%</option>
                  <option>rem</option>
                </select>
                <ChevronDown size={8} strokeWidth={1.8} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.labelColor }} />
              </div>
            </div>
          </div>
          {/* Visibility */}
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, display: 'block', marginBottom: 5, letterSpacing: '0.04em' }}>Visibility</span>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 3 }}>
              {[
                { v: 'visible', label: 'Visible', icon: <Eye size={14} strokeWidth={1.5} /> },
                { v: 'hidden',  label: 'Hidden',  icon: <EyeOff size={14} strokeWidth={1.5} /> },
              ].map(({ v, label, icon }) => {
                const active = visibility === v;
                return (
                  <button key={v} onClick={() => handleVisibility(v)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    height: 28, borderRadius: 6, border: 'none', outline: 'none', cursor: 'pointer',
                    background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontFamily: T.font, fontSize: 11, fontWeight: active ? 600 : 400,
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all 0.12s',
                  }}>
                    {icon}{label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overflow */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, display: 'block', marginBottom: 5, letterSpacing: '0.04em' }}>Overflow</span>
            <div style={{ position: 'relative' }}>
              <select value={overflow} onChange={e => handleOverflow(e.target.value)} style={{
                width: '100%', appearance: 'none', WebkitAppearance: 'none',
                background: T.inputBg, border: T.inputBorder, borderRadius: 7,
                color: T.valueColor, fontFamily: T.font, fontSize: 12,
                padding: '6px 28px 6px 10px', cursor: 'pointer', outline: 'none',
              }}>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
                <option value="scroll">Scroll</option>
                <option value="auto">Auto</option>
                <option value="clip">Clip</option>
              </select>
              <ChevronDown size={10} strokeWidth={1.8} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.labelColor }} />
            </div>
          </div>

          {/* Z-Index — always visible */}
          <div style={{ marginBottom: 8 }}>
            <ScrubInput label="Z-Index" value={zIndex} unit="" onChange={handleZIndex} step={1} />
          </div>

          {/* Float + Clear — side by side */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {/* Float */}
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, display: 'block', marginBottom: 5, letterSpacing: '0.04em' }}>Float</span>
              <div style={{ position: 'relative' }}>
                <select value={cssFloat} onChange={e => handleFloat(e.target.value)} style={{
                  width: '100%', appearance: 'none', WebkitAppearance: 'none',
                  background: T.inputBg, border: T.inputBorder, borderRadius: 7,
                  color: T.valueColor, fontFamily: T.font, fontSize: 12,
                  padding: '6px 24px 6px 8px', cursor: 'pointer', outline: 'none',
                }}>
                  <option value="none">None</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="inline-start">Inline-start</option>
                  <option value="inline-end">Inline-end</option>
                </select>
                <ChevronDown size={10} strokeWidth={1.8} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.labelColor }} />
              </div>
            </div>
            {/* Clear */}
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 10, color: T.labelColor, fontFamily: T.font, display: 'block', marginBottom: 5, letterSpacing: '0.04em' }}>Clear</span>
              <div style={{ position: 'relative' }}>
                <select value={cssClear} onChange={e => handleClear(e.target.value)} style={{
                  width: '100%', appearance: 'none', WebkitAppearance: 'none',
                  background: T.inputBg, border: T.inputBorder, borderRadius: 7,
                  color: T.valueColor, fontFamily: T.font, fontSize: 12,
                  padding: '6px 24px 6px 8px', cursor: 'pointer', outline: 'none',
                }}>
                  <option value="none">None</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="both">Both</option>
                  <option value="inline-start">Inline-start</option>
                  <option value="inline-end">Inline-end</option>
                </select>
                <ChevronDown size={10} strokeWidth={1.8} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: T.labelColor }} />
              </div>
            </div>
          </div>

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
          {/* Background Color */}
          <div style={{ marginBottom: 10 }}>
            <FieldLabel>Background Color</FieldLabel>
            <ColorSwatch value={bgColor} onChange={handleBgColor} />
          </div>

          {/* Background Image */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.valueColor, fontFamily: T.font }}>Background image</span>
            </div>
            {/* None / Gradient / Custom tabs */}
            <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 9, padding: 3, marginBottom: 8 }}>
              {(['none', 'gradient', 'custom'] as const).map(mode => {
                const active = bgImageMode === mode;
                return (
                  <button key={mode} onClick={() => {
                    setBgImageMode(mode);
                    if (mode === 'none') { setBgImage('none'); applyProp('background-image', 'none'); }
                  }} style={{
                    flex: 1, height: 26, borderRadius: 6, border: 'none', outline: 'none', cursor: 'pointer',
                    background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontFamily: T.font, fontSize: 11, fontWeight: active ? 600 : 400,
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                    transition: 'all 0.12s', textTransform: 'capitalize',
                  }}>{mode}</button>
                );
              })}
            </div>
            {/* Gradient editor */}
            {bgImageMode === 'gradient' && (
              <GradientEditor
                value={bgImage}
                onChange={css => { setBgImage(css); applyProp('background-image', css); }}
              />
            )}
            {/* Custom — URL display + upload */}
            {bgImageMode === 'custom' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: T.inputBg, border: T.inputBorder, borderRadius: 7, padding: '5px 8px', overflow: 'hidden' }}>
                  <Image size={13} strokeWidth={1.5} style={{ color: T.labelColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: T.valueColor, fontFamily: T.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bgImage !== 'none' ? bgImage : '—'}
                  </span>
                </div>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button title="Upload" onClick={() => (document.getElementById('optate-bg-upload') as HTMLInputElement)?.click()}
                    style={{ width:30, height:30, borderRadius:7, border:T.inputBorder, background:T.inputBg, color:T.labelColor, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Upload size={14} strokeWidth={1.5} />
                  </button>
                  <input id="optate-bg-upload" type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, 'bg-image'); e.target.value = ''; }} />
                </div>
              </div>
            )}
            {/* None — upload button */}
            {bgImageMode === 'none' && (
              <UploadButton label="Upload Background Image" onFile={f => handleFileSelect(f, 'bg-image')} />
            )}
          </div>

          {/* Background Position */}
          {bgImageMode === 'custom' && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.valueColor, fontFamily: T.font }}>Background position</span>
                {/* Fit icon */}
                <button title="Reset to center" onClick={() => { handleBgPosX('50%'); handleBgPosY('50%'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: T.labelColor }}>
                  <Crosshair size={14} strokeWidth={1.5} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {/* X */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: T.inputBg, border: T.inputBorder, borderRadius: 7, padding: '5px 8px' }}>
                  <MoveHorizontal size={13} strokeWidth={1.5} style={{ color: T.labelColor, flexShrink: 0 }} />
                  <input defaultValue={bgPosX} key={`posx-${bgPosX}`}
                    onBlur={e => handleBgPosX(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleBgPosX((e.target as HTMLInputElement).value); }}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: T.valueColor, fontSize: 11, fontFamily: T.font, minWidth: 0 }} />
                </div>
                {/* Y */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: T.inputBg, border: T.inputBorder, borderRadius: 7, padding: '5px 8px' }}>
                  <MoveVertical size={13} strokeWidth={1.5} style={{ color: T.labelColor, flexShrink: 0 }} />
                  <input defaultValue={bgPosY} key={`posy-${bgPosY}`}
                    onBlur={e => handleBgPosY(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleBgPosY((e.target as HTMLInputElement).value); }}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: T.valueColor, fontSize: 11, fontFamily: T.font, minWidth: 0 }} />
                </div>
              </div>
            </div>
          )}

          {/* Background Size */}
          {bgImageMode === 'custom' && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.valueColor, fontFamily: T.font, display: 'block', marginBottom: 6 }}>Background size</span>
              <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 9, padding: 3, marginBottom: bgSize === 'custom' ? 6 : 0 }}>
                {['Cover', 'Contain', 'Custom'].map(label => {
                  const val = label.toLowerCase();
                  const active = bgSize === val;
                  return (
                    <button key={val} onClick={() => handleBgSize(val)} style={{
                      flex: 1, height: 26, borderRadius: 6, border: 'none', outline: 'none', cursor: 'pointer',
                      background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                      color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                      fontFamily: T.font, fontSize: 11, fontWeight: active ? 600 : 400,
                      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.3)' : 'none', transition: 'all 0.12s',
                    }}>{label}</button>
                  );
                })}
              </div>
              {bgSize === 'custom' && (
                <input defaultValue={bgCustomSize} key={`bgsz-${bgCustomSize}`}
                  placeholder="e.g. 200px 100px"
                  onBlur={e => handleBgCustomSize(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleBgCustomSize((e.target as HTMLInputElement).value); }}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: T.inputBg, border: T.inputBorder, borderRadius: 7,
                    color: T.valueColor, fontSize: 11, fontFamily: T.font, padding: '5px 8px', outline: 'none',
                  }} />
              )}
            </div>
          )}

          {/* Background Repeat */}
          {bgImageMode === 'custom' && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.valueColor, fontFamily: T.font, display: 'block', marginBottom: 6 }}>Background repeat</span>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.inputBg, border: T.inputBorder, borderRadius: 7, padding: '5px 8px' }}>
                  <Repeat2 size={13} strokeWidth={1.5} style={{ color: T.labelColor, flexShrink: 0 }} />
                  <select value={bgRepeat} onChange={e => handleBgRepeat(e.target.value)} style={{
                    flex: 1, appearance: 'none', WebkitAppearance: 'none',
                    background: 'transparent', border: 'none', outline: 'none',
                    color: T.valueColor, fontFamily: T.font, fontSize: 11, cursor: 'pointer',
                  }}>
                    <option value="no-repeat">No-repeat</option>
                    <option value="repeat">Repeat</option>
                    <option value="repeat-x">Repeat-x</option>
                    <option value="repeat-y">Repeat-y</option>
                    <option value="round">Round</option>
                    <option value="space">Space</option>
                  </select>
                  <ChevronDown size={10} strokeWidth={1.8} style={{ color: T.labelColor, flexShrink: 0 }} />
                </div>
              </div>
            </div>
          )}

          {/* Background Attachment */}
          {bgImageMode === 'custom' && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.valueColor, fontFamily: T.font, display: 'block', marginBottom: 6 }}>Background attachment</span>
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.inputBg, border: T.inputBorder, borderRadius: 7, padding: '5px 8px' }}>
                  <Paperclip size={13} strokeWidth={1.5} style={{ color: T.labelColor, flexShrink: 0 }} />
                  <select value={bgAttachment} onChange={e => handleBgAttachment(e.target.value)} style={{
                    flex: 1, appearance: 'none', WebkitAppearance: 'none',
                    background: 'transparent', border: 'none', outline: 'none',
                    color: T.valueColor, fontFamily: T.font, fontSize: 11, cursor: 'pointer',
                  }}>
                    <option value="scroll">Scroll</option>
                    <option value="fixed">Fixed</option>
                    <option value="local">Local</option>
                  </select>
                  <ChevronDown size={10} strokeWidth={1.8} style={{ color: T.labelColor, flexShrink: 0 }} />
                </div>
              </div>
            </div>
          )}

          {/* Upload <img> src */}
          {tag === 'img' && (
            <div style={{ marginTop: 6 }}>
              <FieldLabel>Image Source</FieldLabel>
              <div style={{
                fontSize: 10, color: T.labelColor, marginBottom: 4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: `'SF Mono', ui-monospace, Menlo, monospace`,
              }}>
                {(el as HTMLImageElement).src ? new URL((el as HTMLImageElement).src).pathname : '—'}
              </div>
              <UploadButton label="Upload Image" onFile={f => handleFileSelect(f, 'img-src')} />
            </div>
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
          <div style={{ marginBottom: 12 }}>
            <FieldLabel>Opacity</FieldLabel>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="range" min={0} max={100} value={opacity} onChange={e => handleOpacity(e.target.value)} style={{ flex: 1, accentColor: T.accent }} />
              <input type="text" value={opacity} onChange={e => handleOpacity(e.target.value)} style={{ width: 44, background: T.inputBg, border: T.inputBorder, borderRadius: 6, color: T.valueColor, fontSize: 12, fontFamily: T.font, padding: '3px 6px', outline: 'none', textAlign: 'center' }} />
              <span style={{ fontSize: 10, color: T.labelColor }}>%</span>
            </div>
          </div>

          {/* Blend mode */}
          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Blend Mode</FieldLabel>
            <SmallSelect value={blendMode} onChange={handleBlendMode} options={['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion']} />
          </div>

          {/* ── Effects list (Figma-style) ── */}
          <div>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:600, color:T.valueColor, fontFamily:T.font }}>Effects</span>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                {/* Grid view icon */}
                <LayoutGrid size={14} strokeWidth={1.5} style={{ color: T.labelColor }} />
                {/* Add button */}
                <button onClick={addEffect} style={{ width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', background:T.inputBg, border:T.inputBorder, borderRadius:6, cursor:'pointer', color:T.labelColor, fontSize:16, lineHeight:1 }}>+</button>
              </div>
            </div>

            {/* Effect rows */}
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {effects.length === 0 && (
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', fontFamily:T.font, textAlign:'center', padding:'12px 0' }}>
                  No effects. Click + to add one.
                </div>
              )}
              {effects.map(eff => {
                const isExpanded = expandedEffectId === eff.id;
                const isShadow = eff.type==='drop-shadow'||eff.type==='inner-shadow';
                const previewBg = isShadow ? eff.color : T.accent;
                return (
                  <div key={eff.id} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {/* Preview square — click opens floating popover */}
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        if (isExpanded) { setExpandedEffectId(null); setEffectAnchorRect(null); setEffectPanelRect(null); }
                        else {
                          setExpandedEffectId(eff.id);
                          setEffectAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
                          setEffectPanelRect(panelRef.current?.getBoundingClientRect() ?? null);
                        }
                      }}
                      style={{
                        width:28, height:28, borderRadius:6, flexShrink:0, cursor:'pointer',
                        background: isExpanded ? 'rgba(59,130,246,0.25)' : (isShadow ? 'rgba(59,130,246,0.12)' : 'rgba(99,102,241,0.12)'),
                        border: isExpanded ? '1.5px solid rgba(59,130,246,0.8)' : '1.5px solid rgba(59,130,246,0.4)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ width:14, height:14, borderRadius:3, background:previewBg, border:'1.5px solid rgba(255,255,255,0.25)', boxShadow: isShadow ? `1px 2px 4px ${eff.color}` : 'none' }} />
                    </div>
                    {/* Type dropdown */}
                    <div style={{ position:'relative', flex:1 }}>
                      <select value={eff.type} onChange={e => updateEffect(eff.id,{type:e.target.value as EffectType})} style={{
                        width:'100%', appearance:'none', WebkitAppearance:'none',
                        background:T.inputBg, border:T.inputBorder, borderRadius:7,
                        color:T.valueColor, fontFamily:T.font, fontSize:11,
                        padding:'5px 24px 5px 8px', cursor:'pointer', outline:'none',
                      }}>
                        <option value="drop-shadow">Drop shadow</option>
                        <option value="inner-shadow">Inner shadow</option>
                        <option value="layer-blur">Layer blur</option>
                        <option value="background-blur">Background blur</option>
                      </select>
                      <ChevronDown size={9} strokeWidth={1.8} style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:T.labelColor }} />
                    </div>
                    {/* Visibility */}
                    <button onClick={()=>toggleEffect(eff.id)} title={eff.visible?'Hide':'Show'} style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', color: eff.visible ? T.valueColor : 'rgba(255,255,255,0.2)', padding:0 }}>
                      {eff.visible ? <Eye size={14} strokeWidth={1.5}/> : <EyeOff size={14} strokeWidth={1.5}/>}
                    </button>
                    {/* Delete */}
                    <button onClick={()=>{ removeEffect(eff.id); if(isExpanded){setExpandedEffectId(null);setEffectAnchorRect(null);setEffectPanelRect(null);} }} title="Remove" style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.35)', padding:0 }}>
                      <Minus size={12} strokeWidth={1.8}/>
                    </button>
                  </div>
                );
              })}
            </div>
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
    </div>{/* end inner panel */}

    {/* ── Effect floating popover — sibling to inner panel, outside overflow:hidden ── */}
    {expandedEffectId && effectAnchorRect && (() => {
      const eff = effects.find(e => e.id === expandedEffectId);
      if (!eff) return null;
      const panelRect = panelRef.current?.getBoundingClientRect() ?? null;
      if (!panelRect) return null;
      const closePopover = () => { setExpandedEffectId(null); setEffectAnchorRect(null); setEffectPanelRect(null); };
      return (
        <EffectPopover
          eff={eff}
          anchorRect={effectAnchorRect}
          panelRect={panelRect}
          onUpdate={patch => updateEffect(eff.id, patch)}
          onClose={closePopover}
        />
      );
    })()}

    </div>
  );
};

export default EditorPanel;
