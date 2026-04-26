/**
 * Returns a short, clean segment for one element — no class lists.
 * Priority: id → data-testid/name/aria-label → tag:nth-child
 */
function segmentFor(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();

  // 1. ID — globally unique, perfect
  if (el.id) return `#${el.id}`;

  // 2. Stable data / semantic attributes
  const stable = ['data-testid', 'data-id', 'data-slot', 'name', 'aria-label', 'role', 'type', 'href'];
  for (const attr of stable) {
    const val = el.getAttribute(attr);
    if (val && val.length < 60 && !/\s{2,}/.test(val)) {
      return `${tag}[${attr}="${CSS.escape(val)}"]`;
    }
  }

  // 3. tag + nth-child among same-tag siblings
  const parent = el.parentElement;
  if (parent) {
    const sameTags = Array.from(parent.children).filter(c => c.tagName === el.tagName);
    if (sameTags.length === 1) return tag; // unique tag in parent — no index needed
    const idx = Array.from(parent.children).indexOf(el) + 1;
    return `${tag}:nth-child(${idx})`;
  }

  return tag;
}

/**
 * Generates a short, readable unique CSS selector for a given element.
 * Walks up the DOM and stops as soon as the selector is unique in the document.
 * Never includes Tailwind / utility class lists.
 */
export function getUniqueSelector(el: HTMLElement): string {
  // Walk up collecting segments, stopping at the first id anchor
  const parts: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const tag = current.tagName.toLowerCase();
    if (['html', 'body'].includes(tag)) { parts.unshift(tag); break; }

    // ID → stop climbing, we have a unique anchor
    if (current.id) { parts.unshift(`#${current.id}`); break; }

    parts.unshift(segmentFor(current));

    // Check if path so far already uniquely identifies el
    const candidate = parts.join(' > ');
    try {
      if (document.querySelectorAll(candidate).length === 1) break;
    } catch { /* invalid interim selector, keep climbing */ }

    current = current.parentElement;
  }

  return parts.join(' > ');
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
 * Builds a human-readable DOM path like section.hero>div.container>h1>span.accent
 * Walks from the element up to <body>, building tag+id/class segments.
 */
export function getReadablePath(el: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const tag = current.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body') break;

    let segment = tag;
    if (current.id) {
      segment = `${tag}#${current.id}`;
    } else if (current.classList.length > 0) {
      // Use up to 2 meaningful classes (skip very long/generated ones)
      const classes = Array.from(current.classList)
        .filter(c => c.length < 40 && !c.match(/^[A-Z0-9]{6,}$/))
        .slice(0, 2);
      if (classes.length > 0) segment = `${tag}.${classes.join('.')}`;
    }

    parts.unshift(segment);
    current = current.parentElement;
  }

  return parts.join('>');
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
