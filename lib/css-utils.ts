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
export function rgbToHex(rgb: string): string {
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (!match) return rgb;
  return "#" + ((1 << 24) + (parseInt(match[1]) << 16) + (parseInt(match[2]) << 8) + parseInt(match[3])).toString(16).slice(1).toUpperCase();
}
