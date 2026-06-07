import { MESSAGE_TYPES } from '@flowscript/shared';
import { performNativeClick, performNativeType } from '@/utils/debugger-actions';
import { getSavedTriggers, watchTriggers } from '@/utils/storage';
import { TriggerManager } from '@/utils/trigger-manager';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('FlowScript content script initialized.');

    // Initialize triggers
    initTriggers();

    // Listen for execution commands from the sidepanel
    browser.runtime.onMessage.addListener((message, sender) => {
      if (message && message.source === 'dashboard' && message.type === MESSAGE_TYPES.EXECUTE_ACTION) {
        const { id, action, primaryColor } = message.payload;
        return executeAction(id, action, primaryColor);
      }
    });
  },
});


function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, obj);
}

function setNestedProperty(obj: any, path: string, value: any): boolean {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part];
  }
  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
  return true;
}

function isElementVisible(el: HTMLElement): boolean {
  if (!el.ownerDocument.defaultView) return false;
  const style = el.ownerDocument.defaultView.getComputedStyle(el);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    el.offsetWidth > 0 &&
    el.offsetHeight > 0
  );
}

type ActionHandler = (element: HTMLElement, action: any) => Promise<any> | any;

const actionHandlers: Record<string, ActionHandler> = {
  click: (element) => {
    element.click();
    return true;
  },
  type: (element, action) => {
    const value = action.value || '';
    element.focus();
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value;
    } else {
      element.innerText = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  },
  scroll: () => {
    // Already scrolled into view by the outer execution flow
    return true;
  },
  hover: (element) => {
    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    return true;
  },
  nativeClick: async (element, action) => {
    return performNativeClick(action.selector);
  },
  nativeType: async (element, action) => {
    return performNativeType(action.selector, action.value || '');
  },
  readDom: (element, action) => {
    const path = (action.property || 'textContent').trim();
    const resolvedPath = path === 'text' ? 'textContent' : path === 'html' ? 'innerHTML' : path;

    if (resolvedPath === '__exists') {
      return { success: true, value: true };
    }
    if (resolvedPath === '__isVisible') {
      return { success: true, value: isElementVisible(element) };
    }

    const value = getNestedProperty(element, resolvedPath);
    if (value === undefined && !path.includes('.')) {
      return { success: true, value: element.getAttribute(path) || '' };
    }
    return { success: true, value: value !== undefined ? value : '' };
  },
  updateDom: (element, action) => {
    const path = (action.property || '').trim();
    if (!path) {
      throw new Error('Property path is required for updateDom action');
    }
    const resolvedPath = path === 'text' ? 'textContent' : path === 'html' ? 'innerHTML' : path;
    const value = action.value;

    setNestedProperty(element, resolvedPath, value);

    if (resolvedPath === 'value') {
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return true;
  }
};

async function executeAction(id: number, action: any, primaryColor?: string) {
  try {
    const { type, selector } = action;
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      if (type === 'readDom') {
        const path = (action.property || 'textContent').trim();
        const resolvedPath = path === 'text' ? 'textContent' : path === 'html' ? 'innerHTML' : path;
        if (resolvedPath === '__exists' || resolvedPath === '__isVisible') {
          return { id, success: true, value: false };
        }
        return { id, success: true, value: null };
      }
      return { id, success: false, error: `Element not found for selector: "${selector}"` };
    }

    // Only scroll and flash for interactive/mutating actions (not readDom/scraping actions)
    if (type !== 'readDom') {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await flashElement(element, primaryColor);
    }

    const handler = actionHandlers[type];
    if (handler) {
      const result = await handler(element, action);
      if (typeof result === 'object' && result !== null && 'success' in result) {
        return { id, ...result };
      }
      return { id, success: !!result };
    }

    return { id, success: false, error: `Unsupported action type: "${type}"` };
  } catch (error: any) {
    return { id, success: false, error: error?.message || String(error) };
  }
}

async function flashElement(element: HTMLElement, primaryColor: string = 'hsl(0 0% 98%)') {
  const originalOutline = element.style.outline;
  const originalOutlineOffset = element.style.outlineOffset;
  const originalTransition = element.style.transition;
  const originalBoxShadow = element.style.boxShadow;

  element.style.transition = 'outline 0.2s ease, box-shadow 0.2s ease';
  
  // Clean outline matching the extension theme's primary style variable
  element.style.outline = `3px solid ${primaryColor}`;
  element.style.outlineOffset = '2px';
  element.style.boxShadow = `0 0 15px ${primaryColor}`;

  await new Promise((resolve) => setTimeout(resolve, 600));

  element.style.outline = originalOutline;
  element.style.outlineOffset = originalOutlineOffset;
  element.style.boxShadow = originalBoxShadow;
  
  await new Promise((resolve) => setTimeout(resolve, 150));
  element.style.transition = originalTransition;
}

let triggerManager: TriggerManager | null = null;

async function initTriggers() {
  triggerManager = new TriggerManager(executeTriggerFunction);
  triggerManager.setup();

  try {
    const triggers = await getSavedTriggers();
    if (triggers) {
      triggerManager.update(triggers);
    }
  } catch (error) {
    console.error('FlowScript: Failed to initialize triggers:', error);
  }

  watchTriggers((newTriggers) => {
    triggerManager?.update(newTriggers || []);
  });
}

async function executeTriggerFunction(functionName: string) {
  console.log(`FlowScript: Firing trigger for function: ${functionName}()`);
  browser.runtime.sendMessage({
    source: 'content',
    type: 'RUN_TRIGGER_FUNCTION',
    payload: { functionName }
  }).catch((err) => {
    console.warn('FlowScript: Could not invoke trigger function. Is the sidepanel open?', err);
  });
}

