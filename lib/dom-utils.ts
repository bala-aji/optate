/**
 * Generates a unique CSS selector for a given element.
 */
export function getUniqueSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  
  const path: string[] = [];
  let current: HTMLElement | null = el;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();
    
    if (current.className) {
      const classes = current.className.split(/\s+/).filter(Boolean).join('.');
      if (classes) selector += `.${classes}`;
    }
    
    if (current.id) {
      path.unshift(`#${current.id}`);
      break;
    }
    
    // Nth-child calculation if not unique
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.nodeName === current!.nodeName);
      if (siblings.length > 1) {
        const index = Array.from(parent.children).indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
    
    // Stop at body
    if (current?.nodeName.toLowerCase() === 'html') break;
  }
  
  return path.join(' > ');
}

/**
 * Gets the bounding rect adjusted for scroll.
 */
export function getAbsoluteBoundingRect(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom + window.scrollY,
    right: rect.right + window.scrollX
  };
}

/**
 * Filters out elements that belong to Optate shadow DOM.
 */
export function isOptateElement(el: Element): boolean {
  return !!el.closest('#optate-root') || el.id === 'optate-root' || el.tagName.toLowerCase().startsWith('optate-');
}

/**
 * Gets a friendly display name for an element in the layers tree.
 */
export function getDisplayName(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  
  // Use ID if available
  if (el.id) return `${tag}#${el.id}`;
  
  // Use first 1-2 classes
  if (el.className && typeof el.className === 'string') {
    const classes = el.className.split(/\s+/).filter(Boolean).slice(0, 2);
    if (classes.length > 0) return `${tag}.${classes.join('.')}`;
  }
  
  return tag;
}

/**
 * Returns a type string used for choosing an icon in the tree.
 */
export function getElementIconType(el: HTMLElement): 'container' | 'text' | 'image' | 'button' | 'input' | 'nav' | 'footer' | 'section' | 'other' {
  const tag = el.tagName.toLowerCase();
  
  if (['div', 'section', 'article', 'main', 'aside'].includes(tag)) return 'container';
  if (['nav', 'header'].includes(tag)) return 'nav';
  if (['footer'].includes(tag)) return 'footer';
  if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'a', 'b', 'strong', 'i', 'em'].includes(tag)) return 'text';
  if (['img', 'svg', 'canvas', 'video'].includes(tag)) return 'image';
  if (['button'].includes(tag)) return 'button';
  if (['input', 'select', 'textarea'].includes(tag)) return 'input';
  
  return 'other';
}

/**
 * Determines if an element should be displayed in the DOM tree.
 */
export function shouldShowInTree(el: HTMLElement): boolean {
  // Filter out scripts, styles, etc.
  const tag = el.tagName.toLowerCase();
  if (['script', 'style', 'link', 'meta', 'noscript', 'template', 'iframe'].includes(tag)) return false;
  
  // Filter out hidden elements if necessary, but layers usually show them
  // For now just optate elements
  if (isOptateElement(el)) return false;
  
  return true;
}

/**
 * Dynamically loads a Google Font into the head of the document and all iframes.
 */
export function loadGoogleFont(fontName: string) {
  const fontId = `optate-font-${fontName.toLowerCase().replace(/\s+/g, '-')}`;
  const href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;500;600;700&display=swap`;

  const injectTo = (doc: Document) => {
    if (doc.getElementById(fontId)) return;
    const link = doc.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = href;
    doc.head.appendChild(link);
  };

  // Inject into main document
  injectTo(document);

  // Inject into all iframes (for Canvas mode)
  document.querySelectorAll('iframe').forEach(iframe => {
    try {
      if (iframe.contentDocument) injectTo(iframe.contentDocument);
    } catch (e) {
      console.warn("Could not inject font into cross-origin iframe");
    }
  });
}
