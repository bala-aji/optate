import React, { useState, useEffect } from 'react';
import { useSelection } from '@/lib/selection-context';
import { getComputedStyleValue, applyStyle, rgbToHex } from '@/lib/css-utils';
import { changeTracker } from '@/lib/change-tracker';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Droplet, Type, Square, Move } from 'lucide-react';

export const StyleEditorPanel: React.FC = () => {
  const { selectedElement } = useSelection();

  if (!selectedElement) return null;

  return (
    <div className="optate-space-y-6">
      <Section icon={<Droplet size={14} />} title="Colors">
        <ColorControl 
          label="Text Color" 
          property="color" 
          element={selectedElement} 
        />
        <ColorControl 
          label="Background" 
          property="background-color" 
          element={selectedElement} 
        />
      </Section>

      <Section icon={<Type size={14} />} title="Typography">
        <StyleControl 
          label="Font Size" 
          property="font-size" 
          element={selectedElement} 
        />
        <StyleControl 
          label="Font Weight" 
          property="font-weight" 
          element={selectedElement} 
        />
      </Section>

      <Section icon={<Square size={14} />} title="Spacing">
        <StyleControl 
          label="Padding" 
          property="padding" 
          element={selectedElement} 
        />
        <StyleControl 
          label="Margin" 
          property="margin" 
          element={selectedElement} 
        />
      </Section>
    </div>
  );
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="optate-space-y-3">
    <div className="optate-flex optate-items-center optate-gap-2 optate-text-earth-clay">
      {icon}
      <span className="optate-text-[10px] optate-font-bold optate-uppercase optate-tracking-widest">{title}</span>
    </div>
    <div className="optate-space-y-4 optate-pl-5">
      {children}
    </div>
  </div>
);

const ColorControl: React.FC<{ label: string; property: string; element: HTMLElement }> = ({ label, property, element }) => {
  const [value, setValue] = useState(rgbToHex(getComputedStyleValue(element, property)));

  useEffect(() => {
    setValue(rgbToHex(getComputedStyleValue(element, property)));
  }, [element, property]);

  const handleChange = (newValue: string) => {
    const oldValue = getComputedStyleValue(element, property);
    applyStyle(element, property, newValue);
    setValue(newValue);
    changeTracker.recordChange(element, 'style', property, oldValue, newValue);
  };

  return (
    <div className="optate-flex optate-items-center optate-justify-between optate-gap-4">
      <Label>{label}</Label>
      <div className="optate-flex optate-items-center optate-gap-2">
        <input 
          type="color" 
          value={value.startsWith('#') ? value : '#000000'} 
          onChange={(e) => handleChange(e.target.value)}
          className="optate-w-6 optate-h-6 optate-rounded-full optate-overflow-hidden optate-border-none optate-cursor-pointer optate-bg-transparent"
        />
        <input 
          type="text" 
          value={value} 
          onChange={(e) => handleChange(e.target.value)}
          className="optate-w-20 optate-bg-earth-loam/50 optate-border optate-border-earth-loam optate-rounded optate-px-1.5 optate-py-1 optate-text-[10px] optate-text-earth-cream optate-font-mono"
        />
      </div>
    </div>
  );
};

const StyleControl: React.FC<{ label: string; property: string; element: HTMLElement }> = ({ label, property, element }) => {
  const [value, setValue] = useState(getComputedStyleValue(element, property));

  useEffect(() => {
    setValue(getComputedStyleValue(element, property));
  }, [element, property]);

  const handleChange = (newValue: string) => {
    const oldValue = getComputedStyleValue(element, property);
    applyStyle(element, property, newValue);
    setValue(newValue);
    changeTracker.recordChange(element, 'style', property, oldValue, newValue);
  };

  return (
    <div className="optate-flex optate-items-center optate-justify-between optate-gap-4">
      <Label>{label}</Label>
      <input 
        type="text" 
        value={value} 
        onChange={(e) => handleChange(e.target.value)}
        className="optate-w-24 optate-bg-earth-loam/50 optate-border optate-border-earth-loam optate-rounded optate-px-1.5 optate-py-1 optate-text-[10px] optate-text-earth-cream"
      />
    </div>
  );
};
