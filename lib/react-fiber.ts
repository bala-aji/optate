const SKIP = new Set([
  'Fragment', 'Suspense', 'StrictMode', 'ContextProvider', 'ContextConsumer',
  'ForwardRef', 'Memo', 'Router', 'Routes', 'Route', 'Provider', 'QueryClientProvider',
  'HelmetProvider', 'ThemeProvider', 'ErrorBoundary', 'BrowserRouter', 'MemoryRouter',
]);

function getFiberKey(el: HTMLElement): string | undefined {
  return Object.keys(el).find(k =>
    k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
  );
}

function isUserComponent(name: string | undefined): name is string {
  return !!name && /^[A-Z]/.test(name) && !SKIP.has(name);
}

/**
 * Returns the nearest single React component name — used for the panel chip label.
 */
export function getReactComponentName(el: HTMLElement): string | null {
  try {
    const fiberKey = getFiberKey(el);
    if (!fiberKey) return null;
    let fiber = (el as any)[fiberKey];
    while (fiber) {
      const name: string | undefined = fiber.type?.displayName || fiber.type?.name;
      if (isUserComponent(name)) return name;
      fiber = fiber.return;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Walks the fiber tree upward and collects up to `maxDepth` named user-land
 * components, closest-first.
 *
 * e.g. ['FieldLabel', 'Field', 'LoginPage']
 * → exported as "FieldLabel › Field › LoginPage"
 */
export function getReactComponentChain(el: HTMLElement, maxDepth = 4): string[] {
  try {
    const fiberKey = getFiberKey(el);
    if (!fiberKey) return [];

    const chain: string[] = [];
    const seen = new Set<string>();
    let fiber = (el as any)[fiberKey];

    while (fiber && chain.length < maxDepth) {
      const name: string | undefined = fiber.type?.displayName || fiber.type?.name;
      if (isUserComponent(name) && !seen.has(name)) {
        chain.push(name);
        seen.add(name);
      }
      fiber = fiber.return;
    }

    return chain; // [nearest, ..., furthest]
  } catch {
    return [];
  }
}
