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


type ActionHandler = (element: HTMLElement, value?: string, selector?: string) => Promise<boolean> | boolean;

const actionHandlers: Record<string, ActionHandler> = {
  click: (element) => {
    element.click();
    return true;
  },
  type: (element, value) => {
    element.focus();
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.value = value || '';
    } else {
      element.innerText = value || '';
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
  nativeClick: async (element, value, selector) => {
    return performNativeClick(selector!);
  },
  nativeType: async (element, value, selector) => {
    return performNativeType(selector!, value || '');
  }
};

async function executeAction(id: number, action: any, primaryColor?: string) {
  try {
    const { type, selector, value } = action;
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      return { id, success: false, error: `Element not found for selector: "${selector}"` };
    }

    // Scroll element into view smoothly
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Premium visual micro-animation: Flash neon glow overlay on the target element
    await flashElement(element, primaryColor);

    const handler = actionHandlers[type];
    if (handler) {
      const success = await handler(element, value, selector);
      return { id, success };
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

