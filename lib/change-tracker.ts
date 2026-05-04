import { getUniqueSelector, getReadablePath, getShortPath } from './dom-utils';
import { overrideSheet } from './override-sheet';
import { getReactComponentName, getReactComponentChain } from './react-fiber';

export interface ElementChange {
  id: string;
  timestamp: number;
  selector: string;
  readablePath: string;              // e.g. section.hero>div.container>h1>span.accent
  shortPath: string;                 // e.g. Login > LoginForm > #email
  tagName: string;
  elementName: string;
  elementDescription: string;
  componentName: string | null;
  componentChain: string[];          // e.g. ['FieldLabel', 'Field', 'LoginPage']
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

    this.undoStack.push({ type, selector, property, oldValue, newValue });
    this.redoStack = [];

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

      const chain = getReactComponentChain(element);

      this.changes.push({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        selector,
        readablePath: getReadablePath(element),
        shortPath: getShortPath(element, chain),
        tagName: element.tagName.toLowerCase(),
        elementName,
        elementDescription,
        componentName: chain[0] ?? getReactComponentName(element),
        componentChain: chain,
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
    this.notify();
  }

  redo() {
    const action = this.redoStack.pop();
    if (!action) return;
    this.undoStack.push(action);
    this.applyAction(action, false);
    this.notify();
  }

  private applyAction(action: Action, isUndo: boolean) {
    try {
      const val = isUndo ? action.oldValue : action.newValue;

      if (action.type === 'style') {
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

  getChanges() {
    return [...this.changes];
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }

  /**
   * Full clear — wipes both the change list AND the in-browser override sheet.
   * Use when the panel is closed or the user explicitly discards all changes.
   */
  clear() {
    this.changes = [];
    this.undoStack = [];
    this.redoStack = [];
    overrideSheet.clear();
    this.notify();
  }

  /**
   * Soft clear — wipes the change list (and persisted storage) but keeps the
   * overrideSheet styles alive so the page doesn't visually snap back.
   * Use after Apply: source files have been patched, HMR will reload the page
   * shortly and the styles will be backed by real source changes.
   */
  clearAfterApply() {
    this.changes = [];
    this.undoStack = [];
    this.redoStack = [];
    // intentionally do NOT call overrideSheet.clear()
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
