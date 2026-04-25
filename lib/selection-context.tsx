import React, { createContext, useContext, useState } from 'react';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

interface SelectionContextType {
  selectedElement: HTMLElement | null;
  setSelectedElement: (el: HTMLElement | null) => void;
  hoveredElement: HTMLElement | null;
  setHoveredElement: (el: HTMLElement | null) => void;
  isInspecting: boolean;
  setIsInspecting: (val: boolean) => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  isLeftPanelOpen: boolean;
  setIsLeftPanelOpen: (val: boolean) => void;
  viewportMode: ViewportMode;
  setViewportMode: (mode: ViewportMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [isInspecting, setIsInspecting] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SelectionContext.Provider value={{
      selectedElement, setSelectedElement,
      hoveredElement, setHoveredElement,
      isInspecting, setIsInspecting,
      isEditing, setIsEditing,
      isLeftPanelOpen, setIsLeftPanelOpen,
      viewportMode, setViewportMode,
      searchQuery, setSearchQuery
    }}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) throw new Error('useSelection must be used within SelectionProvider');
  return context;
};
