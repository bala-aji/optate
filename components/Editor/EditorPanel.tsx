import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelection } from '@/lib/selection-context';
import { getComputedStyleValue, applyStyle, rgbToHex } from '@/lib/css-utils';
import { animate, spring, stagger, remove, createSpring, cubicBezier, steps, eases } from 'animejs';
import { changeTracker } from '@/lib/change-tracker';
import { loadGoogleFont } from '@/lib/dom-utils';

type EditorTab = 'add' | 'box' | 'text' | 'style' | 'layout' | 'effects' | 'animation';

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
  'Poppins', 'Playfair Display', 'Oswald', 'Merriweather', 
  'Ubuntu', 'Lora', 'Nunito', 'Raleway', 'Work Sans'
];

export const EditorPanel: React.FC = () => {
  const { selectedElement, isEditing, setIsEditing, viewportMode } = useSelection();
  const [activeTab, setActiveTab] = useState<EditorTab>('box');
  const [isVisible, setIsVisible] = useState(false);
  const [panelSide, setPanelSide] = useState<'left' | 'right'>('right');

  useEffect(() => {
    if (selectedElement) {
      const tag = selectedElement.tagName.toLowerCase();
      const textElements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'button', 'label', 'li'];
      
      // Auto-switch to Text tab if it's a text-heavy element
      if (textElements.includes(tag) || (selectedElement.children.length === 0 && selectedElement.textContent?.trim())) {
        setActiveTab('text');
      } else if (tag === 'img' || tag === 'video') {
        setActiveTab('style');
      } else {
        setActiveTab('box');
      }
    }
  }, [selectedElement]);

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isEditing]);


  if (!isEditing || !selectedElement) return null;

  const elementTag = selectedElement.tagName.toLowerCase();
  const elementClass = typeof selectedElement.className === 'string'
    ? selectedElement.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
    : '';
  const displayName = elementClass ? `${elementTag}.${elementClass}` : elementTag;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setIsEditing(false), 200);
  };

  const handleDelete = () => {
    if (!selectedElement || !selectedElement.parentElement) return;
    const parent = selectedElement.parentElement;
    const oldHtml = parent.innerHTML;
    
    selectedElement.remove();
    
    changeTracker.recordChange(parent, 'html', 'removeNode', oldHtml, parent.innerHTML);
    handleClose();
  };

  const tabs: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'add', label: 'Add', icon: <AddIcon /> },
    { id: 'box', label: 'Box', icon: <BoxIcon /> },
    { id: 'text', label: 'Text', icon: <TextIcon /> },
    { id: 'style', label: 'Style', icon: <StyleIcon /> },
    { id: 'layout', label: 'Layout', icon: <LayoutIcon /> },
    { id: 'effects', label: 'Effects', icon: <EffectsIcon /> },
    { id: 'animation', label: 'Animate', icon: <AnimationIcon /> },
  ];

  const isMobile = viewportMode === 'mobile';
  const isTablet = viewportMode === 'tablet';

  return (
    <div style={{
      position: 'fixed',
      zIndex: 2147483642,
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(22, 22, 22, 0.75)',
      backdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '20px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      overflow: 'hidden',

      // Side positioning (always side-anchored now)
      top: '12px',
      bottom: '12px',
      right: panelSide === 'right' ? (isVisible ? '12px' : '-340px') : 'auto',
      left: panelSide === 'left' ? (isVisible ? '12px' : '-340px') : 'auto',
      
      // Responsive Sizing
      width: (isMobile || isTablet) ? '280px' : '320px',
      height: 'auto',
      
      opacity: isVisible ? 1 : 0,
      pointerEvents: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.3)',
          }}>≡</span>
          <span style={{
            fontSize: '12px', fontWeight: 600, color: '#22c55e',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {displayName}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <HeaderBtn onClick={handleDelete} tooltip="Delete Element">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 4H13M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M6 7V11M10 7V11M4 4L4.85714 13.4286C4.90822 13.9904 5.38096 14.4286 5.94511 14.4286H10.0549C10.619 14.4286 11.0918 13.9904 11.1429 13.4286L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </HeaderBtn>
          <HeaderBtn 
            onClick={() => setPanelSide(panelSide === 'right' ? 'left' : 'right')} 
            tooltip={`Move to ${panelSide === 'right' ? 'Left' : 'Right'}`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d={panelSide === 'right' ? "M5 6L3 8L5 10" : "M11 6L13 8L11 10"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </HeaderBtn>
          <HeaderBtn onClick={() => {}} tooltip="Show CSS">
            <span style={{ fontSize: '10px', fontWeight: 600 }}>CSS</span>
          </HeaderBtn>
          <HeaderBtn onClick={() => {}} tooltip="Settings">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 1V3M8 13V15M1 8H3M13 8H15M3.05 3.05L4.46 4.46M11.54 11.54L12.95 12.95M3.05 12.95L4.46 11.54M11.54 4.46L12.95 3.05" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </HeaderBtn>
          <HeaderBtn onClick={handleClose} tooltip="Close">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </HeaderBtn>
        </div>
      </div>

      {/* Body with tabs */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Tab sidebar */}
        <div style={{
          width: '52px',
          borderRight: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          flexDirection: 'column',
          padding: '6px 0',
          flexShrink: 0,
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '10px 4px',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '0',
                borderLeft: activeTab === tab.id ? '2px solid #22c55e' : '2px solid transparent',
                background: activeTab === tab.id ? 'rgba(34, 197, 94, 0.06)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.35)',
                transition: 'all 0.15s ease',
                fontSize: '9px',
                fontWeight: 500,
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          minHeight: 0,
        }}>
          {activeTab === 'add' && <AddTab element={selectedElement} />}
          {activeTab === 'box' && <BoxTab element={selectedElement} />}
          {activeTab === 'text' && <TextTab element={selectedElement} />}
          {activeTab === 'style' && <StyleTab element={selectedElement} />}
          {activeTab === 'layout' && <LayoutTab element={selectedElement} />}
          {activeTab === 'effects' && <EffectsTab element={selectedElement} />}
          {activeTab === 'animation' && <AnimeAnimationTab element={selectedElement} />}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   ADD TAB
   ═══════════════════════════════════════════════════ */
const AddTab: React.FC<{ element: HTMLElement }> = ({ element }) => {
  const insertElement = (type: 'div' | 'p' | 'h2' | 'button' | 'img' | 'input') => {
    const el = document.createElement(type);
    
    // Auto-populate some basic defaults so it's instantly usable and visible
    if (type === 'div') {
      el.style.minHeight = '100px';
      el.style.border = '2px dashed rgba(0,0,0,0.2)';
      el.style.backgroundColor = 'rgba(0,0,0,0.05)';
      el.style.padding = '16px';
      el.textContent = 'New Container';
    } else if (type === 'p') {
      el.textContent = 'This is a new paragraph block. Click to edit its content.';
      el.style.margin = '10px 0';
    } else if (type === 'h2') {
      el.textContent = 'New Heading';
      el.style.fontSize = '24px';
      el.style.fontWeight = '700';
      el.style.margin = '16px 0';
    } else if (type === 'button') {
      el.textContent = 'Click Me';
      el.style.padding = '10px 20px';
      el.style.backgroundColor = '#22c55e';
      el.style.color = '#fff';
      el.style.border = 'none';
      el.style.borderRadius = '6px';
      el.style.cursor = 'pointer';
      el.style.fontWeight = '600';
    } else if (type === 'img') {
      const img = el as HTMLImageElement;
      img.src = 'https://placehold.co/600x400?text=Placeholder+Image';
      img.alt = 'Placeholder';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.borderRadius = '8px';
      img.style.display = 'block';
    } else if (type === 'input') {
      const input = el as HTMLInputElement;
      input.placeholder = 'Type here...';
      input.style.padding = '10px 12px';
      input.style.border = '1px solid #ccc';
      input.style.borderRadius = '6px';
      input.style.width = '100%';
    }
    
    const oldHtml = element.innerHTML;
    element.appendChild(el);
    changeTracker.recordChange(element, 'html', 'appendChild', oldHtml, element.innerHTML);
  };

  const presetStyle = {
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.15s ease',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <SectionTitle>Insert into Selection</SectionTitle>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '-4px' }}>
        Append a new element inside <span style={{color: '#22c55e'}}>{element.tagName.toLowerCase()}</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={() => insertElement('div')} style={presetStyle}>
          <BoxIcon /> Container (Box)
        </button>
        <button onClick={() => insertElement('h2')} style={presetStyle}>
          <span style={{fontWeight:'bold', fontSize:'14px'}}>H</span> Heading
        </button>
        <button onClick={() => insertElement('p')} style={presetStyle}>
          <TextIcon /> Paragraph
        </button>
        <button onClick={() => insertElement('button')} style={presetStyle}>
          <span style={{background:'#22c55e', width:'12px', height:'10px', borderRadius:'2px'}}/> Button
        </button>
        <button onClick={() => insertElement('img')} style={presetStyle}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/><circle cx="5" cy="5" r="1" fill="currentColor"/><path d="M2 12L6.5 8L10 11L11.5 9L14 11" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg> Image
        </button>
        <button onClick={() => insertElement('input')} style={presetStyle}>
          <span style={{border:'1px solid currentColor', width:'12px', height:'8px', borderRadius:'1px'}}/> Text Input
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   BOX TAB
   ═══════════════════════════════════════════════════ */
const BoxTab: React.FC<{ element: HTMLElement }> = ({ element }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <BoxModelEditor element={element} />
      
      <Divider />
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <PropField label="Min. Width" property="min-width" element={element} icon="↔" />
        <PropField label="Min. Height" property="min-height" element={element} icon="↕" />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   TEXT TAB
   ═══════════════════════════════════════════════════ */
const TextTab: React.FC<{ element: HTMLElement }> = ({ element }) => {
  const [text, setText] = useState(element.textContent || '');
  const [initialText, setInitialText] = useState(element.textContent || '');

  useEffect(() => {
    const txt = (element.textContent || '').trim();
    setText(txt);
    setInitialText(txt);
  }, [element]);

  const handleTextChange = (newText: string) => {
    element.textContent = newText;
    setText(newText);
  };

  const handleBlur = () => {
    if (text === initialText) return;
    changeTracker.recordChange(element, 'text', 'textContent', initialText, text);
    setInitialText(text); // update baseline
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Content */}
      <div>
        <SectionTitle>Content</SectionTitle>
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          style={{
            width: '100%',
            minHeight: '80px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#fff',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxSizing: 'border-box',
            textAlign: 'left',
          }}
          placeholder="Enter text..."
        />
      </div>

      <Divider />

      {/* Font Family */}
      <FontFamilyField element={element} />

      {/* Font Size / Weight */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <PropField label="Size" property="font-size" element={element} />
        <PropField label="Weight" property="font-weight" element={element} />
      </div>

      {/* Line Height / Letter Spacing */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <PropField label="Line Height" property="line-height" element={element} />
        <PropField label="Spacing" property="letter-spacing" element={element} />
      </div>

      <Divider />

      {/* Text Align */}
      <div>
        <SectionTitle>Text Align</SectionTitle>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['left', 'center', 'right', 'justify'].map(align => (
            <AlignButton
              key={align}
              active={getComputedStyleValue(element, 'text-align') === align}
              onClick={() => {
                const old = getComputedStyleValue(element, 'text-align');
                if (old === align) return;
                applyStyle(element, 'text-align', align);
                changeTracker.recordChange(element, 'style', 'text-align', old, align);
              }}
            >
              {align === 'left' && '≡'}
              {align === 'center' && '≡'}
              {align === 'right' && '≡'}
              {align === 'justify' && '≡'}
            </AlignButton>
          ))}
        </div>
      </div>

      {/* Text Transform */}
      <div>
        <SectionTitle>Transform</SectionTitle>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['none', 'uppercase', 'lowercase', 'capitalize'].map(transform => (
            <AlignButton
              key={transform}
              active={getComputedStyleValue(element, 'text-transform') === transform}
              onClick={() => {
                const old = getComputedStyleValue(element, 'text-transform');
                if (old === transform) return;
                applyStyle(element, 'text-transform', transform);
                changeTracker.recordChange(element, 'style', 'text-transform', old, transform);
              }}
            >
              <span style={{ fontSize: '9px' }}>
                {transform === 'none' && 'Aa'}
                {transform === 'uppercase' && 'AA'}
                {transform === 'lowercase' && 'aa'}
                {transform === 'capitalize' && 'Ab'}
              </span>
            </AlignButton>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   STYLE TAB
   ═══════════════════════════════════════════════════ */
const StyleTab: React.FC<{ element: HTMLElement }> = ({ element }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Colors */}
      <SectionTitle>Colors</SectionTitle>
      <ColorField label="Text Color" property="color" element={element} />
      <ColorField label="Background" property="background-color" element={element} />

      <Divider />

      {/* Border */}
      <SectionTitle>Border</SectionTitle>
      <ColorField label="Border Color" property="border-color" element={element} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <PropField label="Width" property="border-width" element={element} />
        <SelectField label="Style" property="border-style" element={element}
          options={['none', 'solid', 'dashed', 'dotted', 'double']}
        />
      </div>

      <Divider />

      {/* Border Radius */}
      <SectionTitle>Border Radius</SectionTitle>
      <div style={{ display: 'flex', gap: '8px' }}>
        <PropField label="TL" property="border-top-left-radius" element={element} />
        <PropField label="TR" property="border-top-right-radius" element={element} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <PropField label="BL" property="border-bottom-left-radius" element={element} />
        <PropField label="BR" property="border-bottom-right-radius" element={element} />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   LAYOUT TAB
   ═══════════════════════════════════════════════════ */
const LayoutTab: React.FC<{ element: HTMLElement }> = ({ element }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <SelectField label="Display" property="display" element={element}
        options={['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid', 'none']}
      />
      <SelectField label="Position" property="position" element={element}
        options={['static', 'relative', 'absolute', 'fixed', 'sticky']}
      />

      <Divider />

      <SectionTitle>Position Offsets</SectionTitle>
      <div style={{ display: 'flex', gap: '8px' }}>
        <PropField label="Top" property="top" element={element} />
        <PropField label="Right" property="right" element={element} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <PropField label="Bottom" property="bottom" element={element} />
        <PropField label="Left" property="left" element={element} />
      </div>

      <Divider />

      <SectionTitle>Flex</SectionTitle>
      <SelectField label="Direction" property="flex-direction" element={element}
        options={['row', 'row-reverse', 'column', 'column-reverse']}
      />
      <SelectField label="Justify" property="justify-content" element={element}
        options={['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']}
      />
      <SelectField label="Align" property="align-items" element={element}
        options={['flex-start', 'center', 'flex-end', 'stretch', 'baseline']}
      />
      <PropField label="Gap" property="gap" element={element} wide />

      <Divider />

      <SelectField label="Overflow" property="overflow" element={element}
        options={['visible', 'hidden', 'scroll', 'auto']}
      />
      <PropField label="Z-Index" property="z-index" element={element} wide />
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   EFFECTS TAB
   ═══════════════════════════════════════════════════ */
const EffectsTab: React.FC<{ element: HTMLElement }> = ({ element }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <PropField label="Opacity" property="opacity" element={element} wide />

      <Divider />

      <SectionTitle>Box Shadow</SectionTitle>
      <PropField label="Shadow" property="box-shadow" element={element} wide />

      <Divider />

      <SectionTitle>Transform</SectionTitle>
      <PropField label="Transform" property="transform" element={element} wide />
      <PropField label="Transform Origin" property="transform-origin" element={element} wide />

      <Divider />

      <SectionTitle>Transition</SectionTitle>
      <PropField label="Transition" property="transition" element={element} wide />

      <Divider />

      <SelectField label="Cursor" property="cursor" element={element}
        options={['auto', 'default', 'pointer', 'move', 'text', 'wait', 'not-allowed', 'grab']}
      />
      <SelectField label="Visibility" property="visibility" element={element}
        options={['visible', 'hidden', 'collapse']}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════ */

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '6px',
  padding: '5px 8px',
  fontSize: '11px',
  color: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'rgba(255,255,255,0.4)',
  fontWeight: 500,
  minWidth: '48px',
  flexShrink: 0,
};

const SliderRow: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}> = ({ label, value, onChange, min, max, step = 1, unit = '' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', minWidth: 0, overflow: 'hidden' }}>
    <div style={labelStyle}>{label}</div>
    <input 
      type="number" value={value} step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={{ ...inputStyle, width: '44px', textAlign: 'center', flexShrink: 0, padding: '4px 2px' }}
    />
    <input 
      type="range" min={min} max={max} step={step}
      value={value} onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ flex: 1, minWidth: 0, accentColor: '#3b82f6', height: '4px', cursor: 'pointer' }}
    />
    {unit && <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{unit}</span>}
  </div>
);

const DualAxisRow: React.FC<{
  label: string;
  x: number;
  y: number;
  onChangeX: (val: number) => void;
  onChangeY: (val: number) => void;
  unit?: string;
}> = ({ label, x, y, onChangeX, onChangeY, unit = '' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <div style={labelStyle}>{label}</div>
    <div style={{ display: 'flex', gap: '6px' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <input 
          type="number" value={x}
          onChange={(e) => onChangeX(parseFloat(e.target.value) || 0)}
          style={{ ...inputStyle, paddingRight: '22px' }}
        />
        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>X</span>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <input 
          type="number" value={y}
          onChange={(e) => onChangeY(parseFloat(e.target.value) || 0)}
          style={{ ...inputStyle, paddingRight: '22px' }}
        />
        <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>Y</span>
      </div>
    </div>
  </div>
);

const SegmentedToggle: React.FC<{
  options: string[];
  value: string;
  onChange: (val: any) => void;
}> = ({ options, value, onChange }) => (
  <div style={{
    display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
    padding: '2px', border: '1px solid rgba(255,255,255,0.06)',
  }}>
    {options.map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        style={{
          flex: 1, padding: '5px 8px', borderRadius: '6px', fontSize: '10px',
          fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.15s ease',
          background: value === opt ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: value === opt ? '#fff' : 'rgba(255,255,255,0.35)',
        }}
      >
        {opt}
      </button>
    ))}
  </div>
);

const NumberStepper: React.FC<{
  value: number;
  onChange: (val: number) => void;
  step?: number;
  min?: number;
}> = ({ value, onChange, step = 1, min = 0 }) => (
  <div style={{
    display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)',
    borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
  }}>
    <button
      onClick={() => onChange(Math.max(min, value - step))}
      style={{ padding: '4px 8px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}
    >−</button>
    <span style={{ padding: '0 6px', fontSize: '10px', color: '#fff', fontFamily: 'monospace', minWidth: '20px', textAlign: 'center' }}>{value}</span>
    <button
      onClick={() => onChange(value + step)}
      style={{ padding: '4px 8px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}
    >+</button>
  </div>
);

/* ═══════════════════════════════════════════════════
   EASING CURVE PREVIEW (Interactive Bezier + Sampled)
   ═══════════════════════════════════════════════════ */
const EasingCurvePreview: React.FC<{
  config: AnimationConfig;
  onBezierChange?: (bezier: string) => void;
}> = ({ config, onBezierChange }) => {
  const ballRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);

  // Graph dimensions
  const W = 220;
  const H = 140;
  const PAD = 20;
  const graphW = W - PAD * 2;
  const graphH = H - PAD * 2;

  // Anchor points in SVG space
  const startX = PAD, startY = H - PAD;   // (0, 0)
  const endX = PAD + graphW, endY = PAD;   // (1, 1)

  // Parse bezier values
  const parseBezier = (): [number, number, number, number] => {
    try {
      const vals = config.customBezier.split(',').map(n => parseFloat(n.trim()));
      if (vals.length === 4 && vals.every(v => !isNaN(v))) {
        return vals as [number, number, number, number];
      }
    } catch {}
    return [0.42, 0, 0.58, 1];
  };

  const [x1, y1, x2, y2] = parseBezier();

  // Convert bezier values to SVG coordinates
  const toSvgX = (v: number) => PAD + v * graphW;
  const toSvgY = (v: number) => (H - PAD) - v * graphH;
  // Convert SVG coordinates back to bezier values
  const fromSvgX = (sx: number) => Math.max(0, Math.min(1, (sx - PAD) / graphW));
  const fromSvgY = (sy: number) => (H - PAD - sy) / graphH;

  // Control points in SVG space
  const cp1x = toSvgX(x1), cp1y = toSvgY(y1);
  const cp2x = toSvgX(x2), cp2y = toSvgY(y2);

  // Resolve easing function for non-bezier modes
  const getEasingFn = (): ((t: number) => number) | null => {
    try {
      if (config.easingType === 'ease') {
        const fn = (eases as any)[config.easingName];
        if (!fn) return null;
        if (typeof fn === 'function') {
          if (fn.length > 0 || ['in','out','inOut','outIn','inBack','outBack','inOutBack','outInBack','inElastic','outElastic','inOutElastic','outInElastic'].includes(config.easingName)) {
            try { const r = fn(); return typeof r === 'function' ? r : fn; } catch { return fn; }
          }
          return fn;
        }
        return null;
      }
      return null;
    } catch { return null; }
  };

  // Generate sampled curve path for ease/spring modes
  const generateSampledPath = (): string => {
    const easeFn = getEasingFn();
    if (!easeFn) {
      return `M ${startX} ${startY} C ${PAD + graphW * 0.25} ${PAD - 10}, ${PAD + graphW * 0.6} ${H - PAD + 10}, ${endX} ${endY}`;
    }
    const steps = 60;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let val: number;
      try { val = easeFn(t); } catch { val = t; }
      const cv = Math.max(-0.3, Math.min(1.3, val));
      pts.push(`${(PAD + t * graphW).toFixed(1)},${((H - PAD) - cv * graphH).toFixed(1)}`);
    }
    return `M ${pts[0]} L ${pts.slice(1).join(' L ')}`;
  };

  // The curve path & label
  const isBezierMode = config.easingType === 'bezier';
  const curvePath = isBezierMode
    ? `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`
    : generateSampledPath();
  const easingLabel = config.easingType === 'ease'
    ? config.easingName
    : config.easingType === 'spring' ? 'spring'
    : `bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;

  // ── Drag handling for bezier handles ──
  const getSvgPoint = (e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (handle: 'p1' | 'p2') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(handle);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pt = getSvgPoint(e);
      const bx = fromSvgX(pt.x);
      const by = fromSvgY(pt.y);
      // Clamp x to [0,1], allow y overshoot [-0.5, 1.5]
      const cx = Math.round(Math.max(0, Math.min(1, bx)) * 100) / 100;
      const cy = Math.round(Math.max(-0.5, Math.min(1.5, by)) * 100) / 100;

      if (dragging === 'p1') {
        onBezierChange?.(`${cx}, ${cy}, ${x2}, ${y2}`);
      } else {
        onBezierChange?.(`${x1}, ${y1}, ${cx}, ${cy}`);
      }
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, x1, y1, x2, y2]);

  // ── Hover ball animation ──
  const onEnter = () => {
    if (dragging) return;
    setIsHovering(true);
    const ball = ballRef.current;
    if (!ball) return;
    try { remove(ball); } catch {}
    ball.style.transform = 'translateX(0px)';

    const animParams: Record<string, any> = {
      translateX: [0, graphW],
      duration: Math.min(config.duration, 2000),
      loop: false,
    };
    if (config.easingType === 'spring') {
      animParams.ease = spring(config.springConfig);
    } else if (config.easingType === 'bezier') {
      try {
        const vals = config.customBezier.split(',').map(n => parseFloat(n.trim()));
        if (vals.length === 4 && vals.every(v => !isNaN(v)))
          animParams.ease = cubicBezier(vals[0], vals[1], vals[2], vals[3]);
      } catch {}
    } else {
      animParams.ease = config.easingName;
    }
    animParams.onComplete = () => {
      setTimeout(() => {
        if (ball) ball.style.transform = 'translateX(0px)';
        setIsHovering(false);
      }, 400);
    };
    try { animate(ball, animParams); } catch {}
  };

  const onLeave = () => {
    if (dragging) return;
    const ball = ballRef.current;
    if (ball) { try { remove(ball); } catch {} ball.style.transform = 'translateX(0px)'; }
    setIsHovering(false);
  };

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${dragging ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '10px',
        padding: '8px 0 0 0',
        cursor: isBezierMode ? 'default' : 'pointer',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Hint labels */}
      <div style={{ position: 'absolute', top: '6px', right: '8px', fontSize: '7px', color: 'rgba(255,255,255,0.12)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {isBezierMode ? 'Drag handles' : 'Hover to play'}
      </div>
      <div style={{ position: 'absolute', top: '6px', left: '10px', fontSize: '9px', color: 'rgba(59,130,246,0.6)', fontWeight: 500, fontFamily: 'monospace' }}>
        {easingLabel}
      </div>

      {/* SVG Curve */}
      <svg
        ref={svgRef}
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', userSelect: 'none' }}
      >
        {/* Grid */}
        <line x1={PAD} y1={H - PAD} x2={PAD + graphW} y2={H - PAD} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <line x1={PAD} y1={PAD} x2={PAD + graphW} y2={PAD} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={PAD} y1={H - PAD} x2={PAD} y2={PAD} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        {/* Linear diagonal ref */}
        <line x1={PAD} y1={H - PAD} x2={PAD + graphW} y2={PAD} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4,4" />

        {/* The curve */}
        <path d={curvePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {isBezierMode ? (
          <>
            {/* Handle lines: start→P1, end→P2 */}
            <line x1={startX} y1={startY} x2={cp1x} y2={cp1y} stroke="#3b82f6" strokeWidth="1.5" />
            <line x1={endX} y1={endY} x2={cp2x} y2={cp2y} stroke="#3b82f6" strokeWidth="1.5" />

            {/* Anchor dots (grey, fixed) */}
            <circle cx={startX} cy={startY} r="5" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <circle cx={endX} cy={endY} r="5" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

            {/* P1 handle (draggable) */}
            <circle
              cx={cp1x} cy={cp1y} r="7"
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth="1.5"
              style={{ cursor: 'grab', filter: dragging === 'p1' ? 'drop-shadow(0 0 4px rgba(59,130,246,0.8))' : 'none' }}
              onMouseDown={handleMouseDown('p1')}
            />
            {/* P2 handle (draggable) */}
            <circle
              cx={cp2x} cy={cp2y} r="7"
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth="1.5"
              style={{ cursor: 'grab', filter: dragging === 'p2' ? 'drop-shadow(0 0 4px rgba(59,130,246,0.8))' : 'none' }}
              onMouseDown={handleMouseDown('p2')}
            />
          </>
        ) : (
          <>
            {/* Non-interactive start/end dots */}
            <circle cx={PAD} cy={H - PAD} r="3.5" fill="#3b82f6" opacity="0.8" />
            <circle cx={PAD + graphW} cy={PAD} r="3.5" fill="rgba(255,255,255,0.3)" />
          </>
        )}
      </svg>

      {/* Animated ball track */}
      <div style={{ padding: '4px 14px 10px', position: 'relative' }}>
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '1px', position: 'relative' }}>
          <div
            ref={ballRef}
            style={{
              position: 'absolute', top: '-4px', left: '-5px',
              width: '10px', height: '10px', borderRadius: '50%',
              background: isHovering ? '#3b82f6' : 'rgba(255,255,255,0.2)',
              boxShadow: isHovering ? '0 0 8px rgba(59,130,246,0.4)' : 'none',
              transition: isHovering ? 'none' : 'background 0.2s ease',
              willChange: 'transform',
            }}
          />
        </div>
      </div>
    </div>
  );
};


const PropField: React.FC<{
  label: string;
  property: string;
  element: HTMLElement;
  icon?: string;
  placeholder?: string;
  wide?: boolean;
}> = ({ label, property, element, icon, placeholder, wide }) => {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    setValue(getComputedStyleValue(element, property));
  }, [element, property]);

  const handleApply = (newValue: string) => {
    const oldValue = getComputedStyleValue(element, property);
    if (oldValue === newValue || newValue === '') return;
    
    applyStyle(element, property, newValue);
    setValue(newValue);
    changeTracker.recordChange(element, 'style', property, oldValue, newValue);
  };

  return (
    <div style={{ flex: wide ? 'unset' : 1, width: wide ? '100%' : undefined }}>
      {label && (
        <div style={{
          fontSize: '10px', color: 'rgba(255,255,255,0.35)',
          marginBottom: '4px', fontWeight: 500,
        }}>
          {label}
        </div>
      )}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: focused ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '6px',
        padding: '0 8px',
        transition: 'all 0.15s ease',
      }}>
        {icon && (
          <span style={{
            fontSize: '10px', color: 'rgba(255,255,255,0.25)',
            marginRight: '4px', flexShrink: 0,
          }}>
            {icon}
          </span>
        )}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            handleApply(value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleApply(value);
          }}
          placeholder={placeholder || property}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: '11px',
            fontFamily: 'inherit',
            padding: '6px 0',
          }}
        />
      </div>
    </div>
  );
};

const ColorField: React.FC<{
  label: string;
  property: string;
  element: HTMLElement;
}> = ({ label, property, element }) => {
  const [value, setValue] = useState('');
  const [hexValue, setHexValue] = useState('');

  useEffect(() => {
    const computed = getComputedStyleValue(element, property);
    setValue(computed);
    setHexValue(rgbToHex(computed));
  }, [element, property]);

  const handleChange = (newValue: string) => {
    const oldValue = getComputedStyleValue(element, property);
    if (oldValue === newValue || rgbToHex(oldValue) === newValue) return;

    applyStyle(element, property, newValue);
    setValue(newValue);
    setHexValue(rgbToHex(newValue));
    changeTracker.recordChange(element, 'style', property, oldValue, newValue);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="color"
          value={hexValue.startsWith('#') ? hexValue : '#000000'}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)',
            borderRadius: '4px', cursor: 'pointer', background: 'transparent', padding: 0,
          }}
        />
        <input
          value={hexValue}
          onChange={(e) => {
            setHexValue(e.target.value);
          }}
          onBlur={() => handleChange(hexValue)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleChange(hexValue); }}
          style={{
            width: '72px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '6px',
            padding: '5px 8px',
            fontSize: '10px',
            color: '#fff',
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
};

const SelectField: React.FC<{
  label: string;
  property: string;
  element: HTMLElement;
  options: string[];
}> = ({ label, property, element, options }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(getComputedStyleValue(element, property));
  }, [element, property]);

  const handleChange = (newValue: string) => {
    const oldValue = getComputedStyleValue(element, property);
    if (oldValue === newValue) return;
    
    applyStyle(element, property, newValue);
    setValue(newValue);
    changeTracker.recordChange(element, 'style', property, oldValue, newValue);
  };

  return (
    <div>
      <div style={{
        fontSize: '10px', color: 'rgba(255,255,255,0.35)',
        marginBottom: '4px', fontWeight: 500,
      }}>
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '6px',
          padding: '6px 8px',
          fontSize: '11px',
          color: '#fff',
          outline: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          appearance: 'auto',
        }}
      >
        {options.map(opt => (
          <option key={opt} value={opt} style={{ background: '#222', color: '#fff' }}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

const FontFamilyField: React.FC<{ element: HTMLElement }> = ({ element }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(getComputedStyleValue(element, 'font-family').split(',')[0].replace(/['"]/g, '').trim());
  }, [element]);

  const handleChange = (newFont: string) => {
    const oldValue = getComputedStyleValue(element, 'font-family');
    if (oldValue.includes(newFont)) return;
    
    loadGoogleFont(newFont);
    applyStyle(element, 'font-family', `'${newFont}', sans-serif`);
    setValue(newFont);
    changeTracker.recordChange(element, 'style', 'font-family', oldValue, newFont);
  };

  return (
    <div>
      <div style={{
        fontSize: '10px', color: 'rgba(255,255,255,0.35)',
        marginBottom: '4px', fontWeight: 500,
      }}>
        Font Family
      </div>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '6px',
          padding: '6px 8px',
          fontSize: '11px',
          color: '#fff',
          outline: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          appearance: 'auto',
        }}
      >
        <option value="">Default Font</option>
        {GOOGLE_FONTS.map(font => (
          <option key={font} value={font} style={{ background: '#222', color: '#fff', fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
    </div>
  );
};

const AlignButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      padding: '6px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      background: active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.04)',
      color: active ? '#22c55e' : 'rgba(255,255,255,0.4)',
      fontSize: '12px',
      fontFamily: 'inherit',
      transition: 'all 0.15s ease',
    }}
  >
    {children}
  </button>
);

const HeaderBtn: React.FC<{
  onClick: () => void;
  tooltip?: string;
  children: React.ReactNode;
}> = ({ onClick, tooltip, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={tooltip}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '5px 8px', border: 'none', borderRadius: '5px',
        cursor: 'pointer', fontFamily: 'inherit',
        background: hovered ? 'rgba(255,255,255,0.08)' : 'transparent',
        color: 'rgba(255,255,255,0.5)',
        transition: 'all 0.15s ease',
      }}
    >
      {children}
    </button>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '6px',
  }}>
    {children}
  </div>
);

const Divider: React.FC = () => (
  <div style={{
    height: '1px',
    background: 'rgba(255,255,255,0.04)',
    margin: '2px 0',
  }} />
);

/* ═══════════════════════════════════════════════════
   TAB ICONS (inline SVG)
   ═══════════════════════════════════════════════════ */
const AddIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const BoxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="5" y="5" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1"/>
  </svg>
);
const TextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 3H12M8 3V13M6 13H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const StyleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const LayoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="2" y="9" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const EffectsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L9.5 5H12.5L10 7.5L11 11L8 9L5 11L6 7.5L3.5 5H6.5L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
  </svg>
);

const BoxModelEditor: React.FC<{ element: HTMLElement }> = ({ element }) => {
  return (
    <div style={{
      padding: '20px 10px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      {/* Margin Box */}
      <div style={{
        width: '100%',
        background: 'rgba(249, 115, 22, 0.1)',
        border: '1px dashed rgba(249, 115, 22, 0.3)',
        borderRadius: '4px',
        padding: '24px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <BoxLabel label="MARGIN" color="rgba(249, 115, 22, 0.6)" />
        <BoxInput property="margin-top" element={element} position="top" />
        <BoxInput property="margin-bottom" element={element} position="bottom" />
        <BoxInput property="margin-left" element={element} position="left" />
        <BoxInput property="margin-right" element={element} position="right" />

        {/* Padding Box */}
        <div style={{
          width: '100%',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '4px',
          padding: '24px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <BoxLabel label="PADDING" color="rgba(34, 197, 94, 0.6)" />
          <BoxInput property="padding-top" element={element} position="top" />
          <BoxInput property="padding-bottom" element={element} position="bottom" />
          <BoxInput property="padding-left" element={element} position="left" />
          <BoxInput property="padding-right" element={element} position="right" />

          {/* Content Size */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '11px',
            color: '#60a5fa',
            fontWeight: 700,
          }}>
            {Math.round(element.getBoundingClientRect().width)} × {Math.round(element.getBoundingClientRect().height)}
          </div>
        </div>
      </div>
    </div>
  );
};

const BoxLabel: React.FC<{ label: string, color: string }> = ({ label, color }) => (
  <div style={{
    position: 'absolute',
    top: '4px',
    left: '6px',
    fontSize: '8px',
    fontWeight: 900,
    color: color,
    letterSpacing: '0.05em',
  }}>{label}</div>
);

const BoxInput: React.FC<{ property: string, element: HTMLElement, position: 'top' | 'bottom' | 'left' | 'right' }> = ({ property, element, position }) => {
  const [value, setValue] = useState('');
  
  useEffect(() => {
    const val = getComputedStyleValue(element, property);
    setValue(val === '0px' ? '0' : val.replace('px', ''));
  }, [element, property]);

  const handleApply = (newVal: string) => {
    const oldValue = getComputedStyleValue(element, property);
    const finalVal = newVal === '0' || newVal === '' ? '0px' : (newVal.endsWith('px') || newVal.endsWith('%') ? newVal : newVal + 'px');
    applyStyle(element, property, finalVal);
    changeTracker.recordChange(element, 'style', property, oldValue, finalVal);
  };

  const styles: React.CSSProperties = {
    position: 'absolute',
    fontSize: '10px',
    color: '#fff',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    width: '24px',
    textAlign: 'center',
    fontWeight: 600,
  };

  if (position === 'top') { styles.top = '4px'; styles.left = '50%'; styles.transform = 'translateX(-50%)'; }
  if (position === 'bottom') { styles.bottom = '4px'; styles.left = '50%'; styles.transform = 'translateX(-50%)'; }
  if (position === 'left') { styles.left = '4px'; styles.top = '50%'; styles.transform = 'translateY(-50%)'; }
  if (position === 'right') { styles.right = '4px'; styles.top = '50%'; styles.transform = 'translateY(-50%)'; }

  return (
    <input 
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => handleApply(value)}
      onKeyDown={(e) => e.key === 'Enter' && handleApply(value)}
      style={styles}
    />
  );
};

const ANIMATION_PRESETS: Record<string, any> = {
  'Fade In':     { opacity: 0, duration: 600, easingName: 'outQuad' },
  'Slide Up':    { offsetY: 30, opacity: 0, duration: 500, easingName: 'outCubic' },
  'Slide Down':  { offsetY: -30, opacity: 0, duration: 500, easingName: 'outCubic' },
  'Slide Left':  { offsetX: 40, opacity: 0, duration: 500, easingName: 'outCubic' },
  'Slide Right': { offsetX: -40, opacity: 0, duration: 500, easingName: 'outCubic' },
  'Zoom In':     { scale: 0.8, opacity: 0, duration: 500, easingName: 'outBack' },
  'Zoom Out':    { scale: 1.2, opacity: 0, duration: 500, easingName: 'outCubic' },
  'Bounce In':   { scale: 0, easingType: 'spring', springConfig: { mass: 1, stiffness: 100, damping: 10, velocity: 0, bounce: 0.65, duration: 628 } },
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
  'Quint': ['inQuint', 'outQuint', 'inOutQuint'],
  'Sine': ['inSine', 'outSine', 'inOutSine'],
  'Expo': ['inExpo', 'outExpo', 'inOutExpo'],
  'Circ': ['inCirc', 'outCirc', 'inOutCirc'],
  'Back': ['inBack', 'outBack', 'inOutBack'],
  'Elastic': ['inElastic', 'outElastic', 'inOutElastic'],
  'Bounce': ['inBounce', 'outBounce', 'inOutBounce'],
};

interface AnimationConfig {
  opacity: number;
  scale: number;
  blur: number;
  rotate: number;
  rotateMode: '2d' | '3d';
  rotateX: number;
  rotateY: number;
  skewX: number;
  skewY: number;
  offsetX: number;
  offsetY: number;
  duration: number;
  delay: number;
  loop: number;
  infinite: boolean;
  alternate: boolean;
  easingType: 'ease' | 'spring' | 'bezier';
  easingName: string;
  springConfig: {
    mass: number;
    stiffness: number;
    damping: number;
    velocity: number;
    bounce: number;
    duration: number;
  };
  customBezier: string;
}

const DEFAULT_CONFIG: AnimationConfig = {
  opacity: 1, scale: 1, blur: 0, rotate: 0, rotateMode: '2d',
  rotateX: 0, rotateY: 0, skewX: 0, skewY: 0, offsetX: 0, offsetY: 0,
  duration: 800, delay: 0, loop: 1, infinite: false, alternate: false,
  easingType: 'ease', easingName: 'outExpo',
  springConfig: { mass: 1, stiffness: 100, damping: 10, velocity: 0, bounce: 0, duration: 0 },
  customBezier: '0.42, 0, 1, 1'
};

const AnimeAnimationTab: React.FC<{ element: HTMLElement }> = ({ element }) => {
  const [config, setConfig] = useState<AnimationConfig>(DEFAULT_CONFIG);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("");
  const originalStyles = useRef<Record<string, string>>({});
  const previewAnim = useRef<any>(null);
  const miniPreviewRef = useRef<HTMLDivElement>(null);
  const miniPreviewAnim = useRef<any>(null);

  // Determine if selected element is text-like
  const isTextElement = (() => {
    const tag = element.tagName.toLowerCase();
    const textTags = ['h1','h2','h3','h4','h5','h6','p','span','a','button','label','li','td','th','caption'];
    if (textTags.includes(tag)) return true;
    if (element.children.length === 0 && (element.textContent?.trim().length || 0) > 0) return true;
    return false;
  })();

  const updateConfig = (updates: Partial<AnimationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setSelectedPreset("");
  };

  const applyPreset = (name: string) => {
    const preset = ANIMATION_PRESETS[name];
    if (preset) {
      setConfig({ ...DEFAULT_CONFIG, ...preset });
      setSelectedPreset(name);
    }
  };

  const buildAnimeParams = (targetEl: HTMLElement): Record<string, any> => {
    const params: Record<string, any> = {};
    if (config.opacity !== 1) params.opacity = [config.opacity, 1];
    if (config.scale !== 1) params.scale = [config.scale, 1];
    if (config.blur !== 0) params.filter = [`blur(${config.blur}px)`, 'blur(0px)'];
    if (config.offsetX !== 0) params.translateX = [config.offsetX, 0];
    if (config.offsetY !== 0) params.translateY = [config.offsetY, 0];
    if (config.rotate !== 0) params.rotate = [`${config.rotate}deg`, '0deg'];
    if (config.rotateMode === '3d') {
      if (config.rotateX !== 0) params.rotateX = [`${config.rotateX}deg`, '0deg'];
      if (config.rotateY !== 0) params.rotateY = [`${config.rotateY}deg`, '0deg'];
    }
    if (config.skewX !== 0) params.skewX = [`${config.skewX}deg`, '0deg'];
    if (config.skewY !== 0) params.skewY = [`${config.skewY}deg`, '0deg'];
    if (Object.keys(params).length === 0) params.opacity = [0, 1];

    params.duration = config.duration;
    params.delay = config.delay;
    params.loop = config.infinite ? true : config.loop;
    params.alternate = config.alternate;

    if (config.easingType === 'spring') {
      params.ease = spring(config.springConfig);
    } else if (config.easingType === 'bezier') {
      try {
        const vals = config.customBezier.split(',').map(n => parseFloat(n.trim()));
        if (vals.length === 4 && vals.every(v => !isNaN(v))) {
          params.ease = cubicBezier(vals[0], vals[1], vals[2], vals[3]);
        } else {
          params.ease = 'outExpo';
        }
      } catch { params.ease = 'outExpo'; }
    } else {
      params.ease = config.easingName;
    }
    return params;
  };

  const runPreview = () => {
    if (isPreviewing) {
      stopPreview();
      return;
    }

    // Save original styles
    originalStyles.current = {
      transform: element.style.transform,
      opacity: element.style.opacity,
      filter: element.style.filter,
    };

    setIsPreviewing(true);

    const params = buildAnimeParams(element);
    params.onComplete = () => {
      if (!config.infinite && config.loop <= 1) {
        setIsPreviewing(false);
      }
    };

    try {
      previewAnim.current = animate(element, params);
    } catch (err) {
      console.error('[Optate] Animation preview error:', err);
      setIsPreviewing(false);
    }
  };

  const stopPreview = () => {
    try {
      if (previewAnim.current) {
        remove(element);
        previewAnim.current = null;
      }
    } catch {}
    // Restore original styles
    Object.entries(originalStyles.current).forEach(([prop, val]) => {
      element.style[prop as any] = val;
    });
    setIsPreviewing(false);
  };

  const handleApply = () => {
    stopPreview();

    // Build CSS @keyframes from the config
    const fromProps: string[] = [];
    const toProps: string[] = [];
    const transformFrom: string[] = [];

    if (config.opacity !== 1) {
      fromProps.push(`opacity: ${config.opacity}`);
      toProps.push('opacity: 1');
    }
    if (config.blur !== 0) {
      fromProps.push(`filter: blur(${config.blur}px)`);
      toProps.push('filter: blur(0px)');
    }
    if (config.scale !== 1) transformFrom.push(`scale(${config.scale})`);
    if (config.offsetX !== 0) transformFrom.push(`translateX(${config.offsetX}px)`);
    if (config.offsetY !== 0) transformFrom.push(`translateY(${config.offsetY}px)`);
    if (config.rotate !== 0) transformFrom.push(`rotate(${config.rotate}deg)`);
    if (config.rotateMode === '3d') {
      if (config.rotateX !== 0) transformFrom.push(`rotateX(${config.rotateX}deg)`);
      if (config.rotateY !== 0) transformFrom.push(`rotateY(${config.rotateY}deg)`);
    }
    if (config.skewX !== 0) transformFrom.push(`skewX(${config.skewX}deg)`);
    if (config.skewY !== 0) transformFrom.push(`skewY(${config.skewY}deg)`);

    if (transformFrom.length > 0) {
      fromProps.push(`transform: ${transformFrom.join(' ')}`);
      toProps.push('transform: none');
    }

    // If nothing was set, default to fade
    if (fromProps.length === 0) {
      fromProps.push('opacity: 0');
      toProps.push('opacity: 1');
    }

    // Generate a unique keyframe name
    const animId = `optate-anim-${Date.now()}`;
    const keyframeCSS = `@keyframes ${animId} {\n  from { ${fromProps.join('; ')}; }\n  to { ${toProps.join('; ')}; }\n}`;

    // Inject keyframes into the page
    let styleEl = document.getElementById('optate-animations') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'optate-animations';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent += '\n' + keyframeCSS;

    // Map easing to CSS timing function
    let cssEasing = 'ease';
    if (config.easingType === 'bezier') {
      cssEasing = `cubic-bezier(${config.customBezier})`;
    } else if (config.easingName.includes('ease') || config.easingName.includes('Cubic') || config.easingName.includes('Quad')) {
      cssEasing = 'ease-in-out';
    } else if (config.easingName.includes('In') && !config.easingName.includes('Out')) {
      cssEasing = 'ease-in';
    } else if (config.easingName.includes('Out') && !config.easingName.includes('In')) {
      cssEasing = 'ease-out';
    }

    const iterationCount = config.infinite ? 'infinite' : String(config.loop);
    const direction = config.alternate ? 'alternate' : 'normal';
    const animValue = `${animId} ${config.duration}ms ${cssEasing} ${config.delay}ms ${iterationCount} ${direction} both`;

    // Apply to element
    const oldAnim = element.style.animation;
    element.style.animation = animValue;
    changeTracker.recordChange(element, 'style', 'animation', oldAnim || 'none', animValue);
  };


  const onMiniPreviewEnter = () => {
    const el = miniPreviewRef.current;
    if (!el) return;
    // Reset any previous
    try { remove(el); } catch {}
    el.style.transform = '';
    el.style.opacity = '1';
    el.style.filter = '';

    const params = buildAnimeParams(el);
    params.onComplete = () => {}; // no-op for mini
    try {
      miniPreviewAnim.current = animate(el, params);
    } catch (err) {
      console.error('[Optate] Mini preview error:', err);
    }
  };

  const onMiniPreviewLeave = () => {
    const el = miniPreviewRef.current;
    if (!el) return;
    try { remove(el); } catch {}
    el.style.transform = '';
    el.style.opacity = '1';
    el.style.filter = '';
    miniPreviewAnim.current = null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px', overflow: 'hidden', minWidth: 0 }}>
      {/* Live Mini Preview */}
      <div
        onMouseEnter={onMiniPreviewEnter}
        onMouseLeave={onMiniPreviewLeave}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '24px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Hover hint */}
        <div style={{
          position: 'absolute', top: '8px', right: '10px',
          fontSize: '8px', color: 'rgba(255,255,255,0.15)',
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          Hover to preview
        </div>

        {/* Animated element */}
        <div ref={miniPreviewRef} style={{ willChange: 'transform, opacity, filter' }}>
          {isTextElement ? (
            <div style={{
              fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.5)',
              fontFamily: 'inherit', letterSpacing: '-0.3px',
            }}>
              Hello World
            </div>
          ) : (
            <div style={{
              width: '80px', height: '60px', borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))',
              border: '1px solid rgba(255,255,255,0.1)',
            }} />
          )}
        </div>
      </div>

      {/* Presets */}
      <div>
        <SectionTitle>Presets</SectionTitle>
        <select
          value={selectedPreset}
          onChange={e => {
            const val = e.target.value;
            setSelectedPreset(val);
            if (val) {
              applyPreset(val);
            }
          }}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
            padding: '7px 8px', fontSize: '11px', color: '#fff',
            outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
            marginTop: '6px'
          }}
        >
          <option value="" style={{ background: '#1a1a1a', color: 'rgba(255,255,255,0.4)' }}>Custom / None</option>
          {Object.keys(ANIMATION_PRESETS).map(name => (
            <option key={name} value={name} style={{ background: '#1a1a1a', color: '#fff' }}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <Divider />

      {/* Properties */}
      <div>
        <SectionTitle>Properties</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <SliderRow label="Opacity" value={config.opacity} min={0} max={1} step={0.01} onChange={v => updateConfig({ opacity: v })} />
          <SliderRow label="Scale" value={config.scale} min={0} max={3} step={0.05} onChange={v => updateConfig({ scale: v })} />
          <SliderRow label="Blur" value={config.blur} min={0} max={20} unit="px" onChange={v => updateConfig({ blur: v })} />
          
          {/* Rotate */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={labelStyle}>Rotate</div>
              <div style={{ width: '80px' }}>
                <SegmentedToggle options={['2D', '3D']} value={config.rotateMode === '2d' ? '2D' : '3D'} onChange={v => updateConfig({ rotateMode: v === '2D' ? '2d' : '3d' })} />
              </div>
            </div>
            {config.rotateMode === '2d' ? (
              <SliderRow label="Rotation" value={config.rotate} min={-360} max={360} unit="°" onChange={v => updateConfig({ rotate: v })} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px', borderLeft: '2px solid rgba(59,130,246,0.2)' }}>
                <SliderRow label="Rotate X" value={config.rotateX} min={-360} max={360} unit="°" onChange={v => updateConfig({ rotateX: v })} />
                <SliderRow label="Rotate Y" value={config.rotateY} min={-360} max={360} unit="°" onChange={v => updateConfig({ rotateY: v })} />
                <SliderRow label="Rotate Z" value={config.rotate} min={-360} max={360} unit="°" onChange={v => updateConfig({ rotate: v })} />
              </div>
            )}
          </div>

          <DualAxisRow label="Skew" x={config.skewX} y={config.skewY} onChangeX={v => updateConfig({ skewX: v })} onChangeY={v => updateConfig({ skewY: v })} />
          <DualAxisRow label="Offset" x={config.offsetX} y={config.offsetY} onChangeX={v => updateConfig({ offsetX: v })} onChangeY={v => updateConfig({ offsetY: v })} />
        </div>
      </div>

      <Divider />

      {/* Transition / Easing */}
      <div>
        <SectionTitle>Transition</SectionTitle>
        <div style={{ marginTop: '6px', marginBottom: '10px' }}>
          <SegmentedToggle options={['Ease', 'Spring', 'Bezier']} value={config.easingType === 'ease' ? 'Ease' : config.easingType === 'spring' ? 'Spring' : 'Bezier'} onChange={v => updateConfig({ easingType: v === 'Ease' ? 'ease' : v === 'Spring' ? 'spring' : 'bezier' })} />
        </div>

        {/* Easing Curve Preview */}
        <EasingCurvePreview config={config} onBezierChange={bezier => updateConfig({ customBezier: bezier })} />
        
        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '8px' }}>
          {config.easingType === 'ease' && (
            <select
              value={config.easingName}
              onChange={e => updateConfig({ easingName: e.target.value })}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
                padding: '7px 8px', fontSize: '11px', color: '#fff',
                outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {Object.entries(EASING_CATEGORIES).map(([cat, eases]) => (
                <optgroup key={cat} label={cat} style={{ background: '#1a1a1a' }}>
                  {eases.map(e => <option key={e} value={e} style={{ background: '#1a1a1a', color: '#fff' }}>{e}</option>)}
                </optgroup>
              ))}
            </select>
          )}

          {config.easingType === 'spring' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <SliderRow label="Mass" value={config.springConfig.mass} min={0.1} max={10} step={0.1} onChange={v => updateConfig({ springConfig: { ...config.springConfig, mass: v } })} />
              <SliderRow label="Stiffness" value={config.springConfig.stiffness} min={1} max={1000} step={10} onChange={v => updateConfig({ springConfig: { ...config.springConfig, stiffness: v } })} />
              <SliderRow label="Damping" value={config.springConfig.damping} min={1} max={100} step={1} onChange={v => updateConfig({ springConfig: { ...config.springConfig, damping: v } })} />
              <SliderRow label="Bounce" value={config.springConfig.bounce} min={0} max={1} step={0.01} onChange={v => updateConfig({ springConfig: { ...config.springConfig, bounce: v } })} />
              <SliderRow label="Duration" value={config.springConfig.duration} min={0} max={5000} step={50} unit="ms" onChange={v => updateConfig({ springConfig: { ...config.springConfig, duration: v } })} />
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic', marginTop: '2px' }}>
                Anime.js v4 Spring Physics Engine
              </div>
            </div>
          )}

          {config.easingType === 'bezier' && (
            <div>
              <div style={{ ...labelStyle, marginBottom: '6px' }}>Cubic Bezier</div>
              <input
                value={config.customBezier}
                onChange={e => updateConfig({ customBezier: e.target.value })}
                placeholder="0.42, 0, 1, 1"
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>
          )}
        </div>
      </div>

      <Divider />

      {/* Timing */}
      <div>
        <SectionTitle>Timing</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
          <SliderRow label="Duration" value={config.duration} min={100} max={5000} step={50} unit="ms" onChange={v => updateConfig({ duration: v })} />
          <SliderRow label="Delay" value={config.delay} min={0} max={5000} step={50} unit="ms" onChange={v => updateConfig({ delay: v })} />
          
          {/* Loop */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={labelStyle}>Loop</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => updateConfig({ infinite: !config.infinite })}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '10px',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  background: config.infinite ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                  color: config.infinite ? '#60a5fa' : 'rgba(255,255,255,0.4)',
                }}
              >∞</button>
              {!config.infinite && (
                <NumberStepper value={config.loop} min={1} onChange={v => updateConfig({ loop: v })} />
              )}
            </div>
          </div>

          {/* Alternate */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={labelStyle}>Alternate</div>
            <button
              onClick={() => updateConfig({ alternate: !config.alternate })}
              style={{
                width: '36px', height: '20px', borderRadius: '10px', border: 'none',
                cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease',
                background: config.alternate ? '#3b82f6' : 'rgba(255,255,255,0.1)',
              }}
            >
              <div style={{
                position: 'absolute', top: '3px', width: '14px', height: '14px',
                borderRadius: '50%', background: '#fff', transition: 'all 0.2s ease',
                left: config.alternate ? '19px' : '3px',
              }} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
        <button
          onClick={runPreview}
          style={{
            padding: '10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
            border: isPreviewing ? '1px solid rgba(239,68,68,0.3)' : 'none',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            background: isPreviewing ? 'rgba(239,68,68,0.15)' : '#3b82f6',
            color: isPreviewing ? '#f87171' : '#fff',
          }}
        >
          {isPreviewing ? (
            <>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171' }} />
              Stop
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              Preview
            </>
          )}
        </button>
        <button
          onClick={handleApply}
          style={{
            padding: '10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s ease',
            background: 'rgba(255,255,255,0.05)', color: '#fff',
          }}
        >
          Apply CSS
        </button>
      </div>
    </div>
  );
};

const AnimationIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
