const SKIP = new Set(['Fragment', 'Suspense', 'StrictMode', 'ContextProvider', 'ContextConsumer', 'ForwardRef', 'Memo']);

/**
 * Walks the React fiber tree from a DOM element upward to find the nearest
 * named user-land component (PascalCase, not an internal React type).
 */
export function getReactComponentName(el: HTMLElement): string | null {
  try {
    const fiberKey = Object.keys(el).find(k =>
      k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
    );
    if (!fiberKey) return null;

    let fiber = (el as any)[fiberKey];
    while (fiber) {
      const name: string | undefined = fiber.type?.displayName || fiber.type?.name;
      if (name && /^[A-Z]/.test(name) && !SKIP.has(name)) return name;
      fiber = fiber.return;
    }
    return null;
  } catch {
    return null;
  }
}
