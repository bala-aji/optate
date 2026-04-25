/**
 * Manages a single <style id="optate-overrides"> element in the page <head>.
 * All style changes go through here so the export is a real, usable CSS file.
 */
class OptateOverrideSheet {
  private el: HTMLStyleElement | null = null;

  private getSheet(): CSSStyleSheet {
    if (this.el?.sheet) return this.el.sheet;

    const style = document.createElement('style');
    style.id = 'optate-overrides';
    document.head.appendChild(style);
    this.el = style;
    return style.sheet!;
  }

  apply(selector: string, property: string, value: string) {
    const sheet = this.getSheet();
    const rules = Array.from(sheet.cssRules) as CSSStyleRule[];
    const idx = rules.findIndex(r => r.selectorText === selector);

    if (idx >= 0) {
      rules[idx].style.setProperty(property, value, 'important');
    } else {
      sheet.insertRule(`${selector} { ${property}: ${value} !important; }`, sheet.cssRules.length);
    }
  }

  remove(selector: string, property: string) {
    const sheet = this.getSheet();
    const rules = Array.from(sheet.cssRules) as CSSStyleRule[];
    const idx = rules.findIndex(r => r.selectorText === selector);
    if (idx < 0) return;

    rules[idx].style.removeProperty(property);
    if (rules[idx].style.length === 0) sheet.deleteRule(idx);
  }

  getCSS(): string {
    const sheet = this.getSheet();
    return Array.from(sheet.cssRules)
      .map(r => r.cssText)
      .join('\n');
  }

  getRuleCount(): number {
    return this.getSheet().cssRules.length;
  }

  clear() {
    const sheet = this.getSheet();
    while (sheet.cssRules.length) sheet.deleteRule(0);
  }
}

export const overrideSheet = new OptateOverrideSheet();
