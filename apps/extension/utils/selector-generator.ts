/**
 * Helper to escape CSS strings. Falls back if CSS.escape is not defined (e.g. in minimal test environments).
 */
export function escapeCssSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  // Basic fallback escaping for selectors (non-alphanumeric chars)
  return value.replace(/([!"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~])/g, '\\$1');
}

/**
 * Generates a specific and optimized primary CSS selector for an element.
 * Prioritizes:
 * 1. Unique ID
 * 2. Custom test attributes (e.g., data-testid, data-qa)
 * 3. Specific attribute inputs (e.g. name, placeholder)
 * 4. Tag names combined with classes and nth-of-type siblings.
 */
export function generatePrimarySelector(el: HTMLElement): string {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const document = el.ownerDocument || window.document;

  // 1. Check for unique ID
  if (el.id && typeof el.id === 'string') {
    const trimmedId = el.id.trim();
    if (trimmedId && !/^[0-9]/.test(trimmedId) && trimmedId.length < 50) {
      try {
        const escaped = escapeCssSelector(trimmedId);
        if (document.querySelectorAll(`#${escaped}`).length === 1) {
          return `#${escaped}`;
        }
      } catch (_) {}
    }
  }

  // 2. Check for unique test/QA attributes
  const testAttrs = ['data-testid', 'data-test-id', 'data-qa', 'data-cy', 'data-test'];
  for (const attr of testAttrs) {
    const val = el.getAttribute(attr);
    if (val) {
      const selector = `[${attr}="${escapeCssSelector(val)}"]`;
      try {
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      } catch (_) {}
    }
  }

  // 3. Check for specific form elements with unique attributes
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
    const name = el.getAttribute('name');
    if (name) {
      const selector = `${el.tagName.toLowerCase()}[name="${escapeCssSelector(name)}"]`;
      try {
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      } catch (_) {}
    }
  }

  // 4. Build a path climbing up the DOM tree
  const path: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const tagName = current.tagName.toLowerCase();
    if (tagName === 'body' || tagName === 'html') {
      path.unshift(tagName);
      break;
    }

    // Check if parent-level elements have a unique ID/test attribute we can hook into
    if (current !== el) {
      if (current.id && typeof current.id === 'string') {
        const trimmedId = current.id.trim();
        if (trimmedId && !/^[0-9]/.test(trimmedId) && trimmedId.length < 50) {
          path.unshift(`#${escapeCssSelector(trimmedId)}`);
          break;
        }
      }
      
      let foundTestAttr = false;
      for (const attr of testAttrs) {
        const val = current.getAttribute(attr);
        if (val) {
          path.unshift(`[${attr}="${escapeCssSelector(val)}"]`);
          foundTestAttr = true;
          break;
        }
      }
      if (foundTestAttr) {
        break;
      }
    }

    let selector = tagName;

    // Append valid non-utility classes
    if (current.classList && current.classList.length > 0) {
      const validClasses = Array.from(current.classList).filter(c => {
        // Skip Tailwind colon-utilities like md:flex or purely numeric classes
        return (
          typeof c === 'string' &&
          c.trim().length > 0 &&
          !c.includes(':') &&
          !/^[0-9]/.test(c) &&
          c.length < 35
        );
      });
      if (validClasses.length > 0) {
        selector += '.' + validClasses.map(c => escapeCssSelector(c)).join('.');
      }
    }

    // Handle siblings index if not unique by tag name
    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child): child is HTMLElement => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);

    // If the path generated so far uniquely identifies the element and is grounded in a stable ancestor, we can stop
    try {
      const fullSelector = path.join(' > ');
      const isGrounded =
        current.id && typeof current.id === 'string' && current.id.trim().length > 0 ||
        testAttrs.some(attr => current!.getAttribute(attr)) ||
        tagName === 'body' ||
        tagName === 'html';
        
      if (isGrounded && document.querySelectorAll(fullSelector).length === 1) {
        return fullSelector;
      }
    } catch (_) {}

    current = parent;
  }

  return path.join(' > ');
}

/**
 * Generates a strictly structural fallback CSS selector using :nth-child indices.
 * Guaranteed to find the element based on its exact DOM structure hierarchy.
 */
export function generateFallbackSelector(el: HTMLElement): string {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const path: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const tagName = current.tagName.toLowerCase();
    if (tagName === 'body' || tagName === 'html') {
      path.unshift(tagName);
      break;
    }

    const parent: HTMLElement | null = current.parentElement;
    let selector = tagName;
    if (parent) {
      const index = Array.from(parent.children).indexOf(current) + 1;
      selector += `:nth-child(${index})`;
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(' > ');
}
