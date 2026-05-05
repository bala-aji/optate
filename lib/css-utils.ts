import { getUniqueSelector } from './dom-utils';
import { overrideSheet } from './override-sheet';

export function getComputedStyleValue(el: HTMLElement, property: string): string {
  const win = el.ownerDocument?.defaultView || window;
  return win.getComputedStyle(el).getPropertyValue(property).trim();
}

/**
 * Applies a style via the override stylesheet (not inline).
 * Returns the pre-change computed value for undo.
 */
export function applyStyle(el: HTMLElement, property: string, value: string): string {
  const oldValue = getComputedStyleValue(el, property);
  const selector = getUniqueSelector(el);
  overrideSheet.apply(selector, property, value);
  return oldValue;
}

/**
 * Normalizes color values to hex for consistent reporting.
 */
export function rgbToHex(rgb: string | number, g?: number, b?: number): string {
  // Called with 3 separate numbers: rgbToHex(r, g, b)
  if (typeof rgb === 'number') {
    return '#' + ((1 << 24) + (rgb << 16) + ((g ?? 0) << 8) + (b ?? 0))
      .toString(16).slice(1).toUpperCase();
  }
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;
  return '#' + ((1 << 24) + (parseInt(match[1]) << 16) + (parseInt(match[2]) << 8) + parseInt(match[3]))
    .toString(16).slice(1).toUpperCase();
}
