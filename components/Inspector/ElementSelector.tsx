import React, { useEffect } from 'react';
import { useSelection } from '@/lib/selection-context';
import { isOptateElement } from '@/lib/dom-utils';
import { changeTracker } from '@/lib/change-tracker';

const TEXT_TAGS = new Set(['h1','h2','h3','h4','h5','h6','p','span','a','button','label','li','td','th']);
const isTextElement = (el: HTMLElement) => {
  const tag = el.tagName.toLowerCase();
  if (TEXT_TAGS.has(tag)) return true;
  return el.children.length === 0 && !!el.textContent?.trim();
};

export const ElementSelector: React.FC = () => {
  const { isInspecting, setHoveredElement, setSelectedElement, setIsEditing } = useSelection();

  useEffect(() => {
    if (!isInspecting) {
      setHoveredElement(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const path = e.composedPath();
      if (path.some((n) => (n as Element).id === 'optate-host')) {
        setHoveredElement(null);
        return;
      }
      const target = e.target as HTMLElement;
      if (target && !isOptateElement(target)) {
        setHoveredElement(target);
      } else {
        setHoveredElement(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Block clicks that originated inside our shadow DOM
      const path = e.composedPath();
      const fromShadow = path.some((n) => (n as Element).id === 'optate-host');
      if (fromShadow) return;

      const target = e.target as HTMLElement;
      if (target && isOptateElement(target)) return;

      e.preventDefault();
      e.stopPropagation();

      if (target) {
        setSelectedElement(target);
        setIsEditing(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedElement(null);
        setHoveredElement(null);
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      const path = e.composedPath();
      if (path.some((n) => (n as Element).id === 'optate-host')) return;
      const target = e.target as HTMLElement;
      if (!target || isOptateElement(target) || !isTextElement(target)) return;

      e.preventDefault();
      e.stopPropagation();

      const originalText = target.textContent || '';

      // Enable inline editing
      target.contentEditable = 'true';
      target.focus();

      // Select all text
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      // Visual indicator
      const prevOutline = target.style.outline;
      const prevOutlineOffset = target.style.outlineOffset;
      target.style.outline = '2px solid #34d399';
      target.style.outlineOffset = '3px';

      const finish = (cancelled: boolean) => {
        const newText = target.textContent || '';
        target.contentEditable = 'false';
        target.style.outline = prevOutline;
        target.style.outlineOffset = prevOutlineOffset;
        if (!cancelled && newText !== originalText) {
          changeTracker.recordChange(target, 'text', 'textContent', originalText, newText);
        } else if (cancelled) {
          target.textContent = originalText;
        }
        target.removeEventListener('keydown', onKeyDown);
      };

      const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') { ev.preventDefault(); finish(true); }
        // Enter confirms on single-line elements
        const singleLine = ['h1','h2','h3','h4','h5','h6','button','label','a'];
        if (ev.key === 'Enter' && !ev.shiftKey && singleLine.includes(target.tagName.toLowerCase())) {
          ev.preventDefault();
          finish(false);
        }
      };

      target.addEventListener('blur', () => finish(false), { once: true });
      target.addEventListener('keydown', onKeyDown);
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('dblclick', handleDblClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    // Change cursor to crosshair while inspecting
    document.documentElement.style.cursor = 'crosshair';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('dblclick', handleDblClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.documentElement.style.cursor = '';
    };
  }, [isInspecting, setHoveredElement, setSelectedElement, setIsEditing]);

  return null;
};
