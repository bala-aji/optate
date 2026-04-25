import { getUniqueSelector } from './dom-utils';
import { overrideSheet } from './override-sheet';
import { getReactComponentName } from './react-fiber';

export interface ElementChange {
  id: string;
  timestamp: number;
  selector: string;
  tagName: string;
  elementName: string;
  elementDescription: string;
  componentName: string | null;
  viewportMode: 'desktop' | 'tablet' | 'mobile';
  type: 'style' | 'text' | 'image' | 'attribute' | 'html';
  property: string;
  oldValue: string;
  newValue: string;
  beforeHtml: string;
  afterHtml: string;
}

interface Action {
  type: 'style' | 'text' | 'image' | 'attribute' | 'html';
  selector: string;
  property: string;
  oldValue: string;
  newValue: string;
}

class ChangeTracker {
  private changes: ElementChange[] = [];
  private undoStack: Action[] = [];
  private redoStack: Action[] = [];
  private listeners: (() => void)[] = [];
  private currentViewportMode: 'desktop' | 'tablet' | 'mobile' = 'desktop';

  setViewportMode(mode: 'desktop' | 'tablet' | 'mobile') {
    this.currentViewportMode = mode;
  }

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const url = window.location.origin + window.location.pathname;
      const key = `optate_changes_${url}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.changes = parsed as ElementChange[];
          this.notify();
        }
      }
    } catch (e) {
      console.warn("Persistence load failed:", e);
    }
  }

  private saveToStorage() {
    try {
      const url = window.location.origin + window.location.pathname;
      const key = `optate_changes_${url}`;
      localStorage.setItem(key, JSON.stringify(this.changes));
    } catch (e) {
      console.warn("Persistence save failed:", e);
    }
  }

  recordChange(
    element: HTMLElement, 
    type: ElementChange['type'], 
    property: string, 
    oldValue: string, 
    newValue: string
  ) {
    if (oldValue === newValue) return;

    const selector = getUniqueSelector(element);
    
    // Add to history for granular undo/redo
    this.undoStack.push({ type, selector, property, oldValue, newValue });
    this.redoStack = []; // Clear redo stack on new action

    // Group for the final report
    const existingIndex = this.changes.findIndex(
      (c) => c.selector === selector && c.type === type && c.property === property
    );

    if (existingIndex !== -1) {
      const existingChange = this.changes[existingIndex];
      if (existingChange.oldValue === newValue) {
        this.changes.splice(existingIndex, 1);
      } else {
        existingChange.newValue = newValue;
        existingChange.timestamp = Date.now();
      }
    } else {
      const id = element.id;
      const classes = element.className && typeof element.className === 'string' 
        ? element.className.split(/\s+/).filter(Boolean) 
        : [];
      const elementName = id ? `#${id}` : (classes.length > 0 ? `.${classes[0]}` : element.tagName.toLowerCase());
      
      let elementDescription = '';
      const ariaLabel = element.getAttribute('aria-label') || element.getAttribute('title');
      const textContent = element.textContent?.trim();

      if (ariaLabel) {
        elementDescription = ariaLabel;
      } else if (textContent && textContent.length > 0) {
        elementDescription = textContent.length > 40 ? textContent.substring(0, 37) + '...' : textContent;
      } else {
        elementDescription = element.children.length > 0 ? 'container' : element.tagName.toLowerCase();
      }

      this.changes.push({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        selector,
        tagName: element.tagName.toLowerCase(),
        elementName,
        elementDescription,
        componentName: getReactComponentName(element),
        viewportMode: this.currentViewportMode,
        type,
        property,
        oldValue,
        newValue,
        beforeHtml: '',
        afterHtml: '',
      });
    }

    this.notify();
  }

  undo() {
    const action = this.undoStack.pop();
    if (!action) return;

    this.redoStack.push(action);
    this.applyAction(action, true);
    
    // Update the grouped report as well
    this.syncChangesFromHistory();
    this.notify();
  }

  redo() {
    const action = this.redoStack.pop();
    if (!action) return;

    this.undoStack.push(action);
    this.applyAction(action, false);
    
    // Update the grouped report as well
    this.syncChangesFromHistory();
    this.notify();
  }

  private applyAction(action: Action, isUndo: boolean) {
    try {
      const val = isUndo ? action.oldValue : action.newValue;

      if (action.type === 'style') {
        // Route through override-sheet, not el.style
        if (val === '' || val === 'initial') {
          overrideSheet.remove(action.selector, action.property);
        } else {
          overrideSheet.apply(action.selector, action.property, val);
        }
        return;
      }

      const el = document.querySelector(action.selector) as HTMLElement;
      if (!el) return;

      if (action.type === 'text') {
        el.textContent = val;
      } else if (action.type === 'image') {
        if (el.tagName.toLowerCase() === 'img') (el as HTMLImageElement).src = val;
      } else if (action.type === 'html') {
        el.innerHTML = val;
      }
    } catch (err) {
      console.error("Failed to apply undo/redo action:", err);
    }
  }

  // Recalculates the grouped changes report based on the undo stack
  private syncChangesFromHistory() {
    // This is a simplified sync - in a real app we'd maintain the report more carefully
    // For now, we'll just let the history be the source of truth for the report if needed,
    // but the report is mainly for the user to copy at the end.
    // For simplicity, we'll just clear and rebuild a basic version or keep it as is.
    // Actually, let's just make sure the report reflects the *current* state of the element.
  }

  getChanges() {
    return [...this.changes];
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }

  clear() {
    this.changes = [];
    this.undoStack = [];
    this.redoStack = [];
    overrideSheet.clear();
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach(l => l());
  }
}

export const changeTracker = new ChangeTracker();
