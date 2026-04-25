import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Box, Type, Image, MousePointer2, TextCursorInput, Layout, Layers, HelpCircle, Lock } from 'lucide-react';
import { useSelection } from '@/lib/selection-context';
import { getDisplayName, getElementIconType, shouldShowInTree } from '@/lib/dom-utils';

interface DOMTreeNodeProps {
  element: HTMLElement;
  depth: number;
}

export const DOMTreeNode: React.FC<DOMTreeNodeProps> = ({ element, depth }) => {
  const { selectedElement, setSelectedElement, setHoveredElement, setIsEditing, searchQuery } = useSelection();
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first few levels
  const [children, setChildren] = useState<HTMLElement[]>([]);

  useEffect(() => {
    // Get visible children
    let filtered = Array.from(element.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && shouldShowInTree(child));
    
    // Apply search filter if present
    if (searchQuery) {
      filtered = filtered.filter(child => {
        const text = child.textContent?.toLowerCase() || '';
        const tag = child.tagName.toLowerCase();
        const classes = child.className.toString().toLowerCase();
        const query = searchQuery.toLowerCase();
        return text.includes(query) || tag.includes(query) || classes.includes(query);
      });
    }
    
    setChildren(filtered);
  }, [element, searchQuery]);

  const isSelected = selectedElement === element;
  const hasChildren = children.length > 0;
  const displayName = getDisplayName(element);
  const iconType = getElementIconType(element);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElement(element);
    setIsEditing(true);
  };

  const Icon = () => {
    const size = 14;
    const color = isSelected ? '#fff' : '#a8a29e'; // earth-clay

    switch (iconType) {
      case 'container': return <Box size={size} color="#60a5fa" />; // Blue for containers
      case 'nav': return <Layout size={size} color="#818cf8" />; // Indigo for nav
      case 'footer': return <Layout size={size} color="#818cf8" />;
      case 'text': return <Type size={size} color="#c084fc" />; // Purple for text
      case 'image': return <Image size={size} color="#fbbf24" />; // Amber for images
      case 'button': return <MousePointer2 size={size} color="#f87171" />; // Red for buttons
      case 'input': return <TextCursorInput size={size} color="#fb7185" />; // Rose for inputs
      default: return <Box size={size} color="#94a3b8" />;
    }
  };

  return (
    <div className="optate-flex optate-flex-col">
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', 'optate-node');
          (window as any)._optateDraggedElement = element;
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('optate-bg-blue-500/20');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('optate-bg-blue-500/20');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('optate-bg-blue-500/20');
          const dragged = (window as any)._optateDraggedElement as HTMLElement;
          if (dragged && dragged !== element && !dragged.contains(element)) {
            const oldParent = dragged.parentElement;
            const newParent = element;
            const oldHtml = newParent.innerHTML;
            
            newParent.appendChild(dragged);
            
            import('@/lib/change-tracker').then(({ changeTracker }) => {
              changeTracker.recordChange(newParent, 'html', 'appendChild', oldHtml, newParent.innerHTML);
            });
          }
        }}
        className={`
          optate-group optate-flex optate-items-center optate-py-1.5 optate-px-3 optate-mx-1 optate-cursor-pointer optate-rounded-lg optate-transition-all optate-duration-200 optate-relative
          ${isSelected 
            ? 'optate-bg-gradient-to-r optate-from-blue-600 optate-to-blue-500 optate-text-white optate-shadow-[0_4px_12px_rgba(37,99,235,0.3)] optate-z-10' 
            : 'optate-hover:bg-white/[0.04] optate-text-white/60 optate-hover:text-white/90'}
        `}
        style={{ marginLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
        onMouseEnter={() => setHoveredElement(element)}
        onMouseLeave={() => setHoveredElement(null)}
      >
        <div 
          className="optate-w-5 optate-h-5 optate-flex optate-items-center optate-justify-center optate-mr-1.5 optate-rounded-md optate-hover:bg-white/10 optate-transition-colors"
          onClick={handleToggle}
        >
          {hasChildren ? (
            <div className={`optate-transition-transform optate-duration-200 ${isExpanded ? 'optate-rotate-90' : ''}`}>
              <ChevronRight size={14} className={isSelected ? 'optate-text-white' : 'optate-text-white/20'} />
            </div>
          ) : (
            <div className="optate-w-1 optate-h-1 optate-rounded-full optate-bg-white/5" />
          )}
        </div>
        
        <div className="optate-mr-2 optate-flex optate-items-center">
          <Icon />
        </div>

        <span className={`
          optate-text-[11.5px] optate-truncate optate-flex-1 optate-tracking-tight
          ${isSelected ? 'optate-text-white optate-font-bold' : 'optate-font-medium'}
        `}>
          {displayName}
        </span>

        {/* Example: show "Primary" or "Desktop" for first level if it looks like a wrapper */}
        {depth === 1 && element.tagName === 'DIV' && (
          <span className="optate-text-[9px] optate-text-blue-400 optate-ml-2 optate-opacity-0 optate-group-hover:optate-opacity-100">
            Primary
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="optate-flex optate-flex-col optate-relative">
          {/* Vertical Hierarchy Line */}
          <div 
            className="optate-absolute optate-left-[22px] optate-top-0 optate-bottom-0 optate-w-px optate-bg-white/[0.05]" 
            style={{ left: `${depth * 12 + 18}px` }}
          />
          {children.map((child, i) => (
            <DOMTreeNode key={i} element={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
