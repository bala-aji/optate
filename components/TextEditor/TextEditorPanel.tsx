import React, { useState, useEffect } from 'react';
import { useSelection } from '@/lib/selection-context';
import { changeTracker } from '@/lib/change-tracker';
import { Label } from '@/components/ui/Label';

export const TextEditorPanel: React.FC = () => {
  const { selectedElement } = useSelection();
  const [text, setText] = useState(selectedElement?.textContent || '');

  useEffect(() => {
    if (selectedElement) {
      setText(selectedElement.textContent || '');
    }
  }, [selectedElement]);

  if (!selectedElement) return null;

  const handleTextChange = (newText: string) => {
    const oldText = selectedElement.textContent || '';
    selectedElement.textContent = newText;
    setText(newText);
    changeTracker.recordChange(selectedElement, 'text', 'textContent', oldText, newText);
  };

  return (
    <div className="optate-space-y-4">
      <div className="optate-space-y-2">
        <Label>Content Text</Label>
        <textarea 
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          className="optate-w-full optate-h-32 optate-bg-earth-loam/50 optate-border optate-border-earth-loam optate-rounded-lg optate-p-3 optate-text-xs optate-text-earth-cream optate-outline-none optate-focus:border-earth-terracotta/50 optate-transition-all optate-resize-none"
          placeholder="Enter text content..."
        />
      </div>
      <div className="optate-flex optate-justify-end">
        <span className="optate-text-[10px] optate-text-earth-clay">{text.length} characters</span>
      </div>
    </div>
  );
};
