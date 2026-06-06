import { browser } from 'wxt/browser';

/**
 * Content script helper to trigger a native click on a DOM element using coordinates via the debugger API.
 */
export async function performNativeClick(selector: string): Promise<boolean> {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found for selector: ${selector}`);
  }

  const rect = element.getBoundingClientRect();
  const x = Math.round(rect.left + rect.width / 2);
  const y = Math.round(rect.top + rect.height / 2);

  const response = await browser.runtime.sendMessage({
    type: 'DEBUGGER_CLICK',
    x,
    y,
  });

  return !!response?.success;
}

/**
 * Content script helper to trigger a native text input on a DOM element using coordinates via the debugger API.
 */
export async function performNativeType(selector: string, text: string): Promise<boolean> {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Element not found for selector: ${selector}`);
  }

  const rect = element.getBoundingClientRect();
  const x = Math.round(rect.left + rect.width / 2);
  const y = Math.round(rect.top + rect.height / 2);

  const response = await browser.runtime.sendMessage({
    type: 'DEBUGGER_TYPE',
    x,
    y,
    text,
  });

  return !!response?.success;
}

/**
 * Background script listener to attach debugger and send CDP native input commands.
 */
export function setupDebuggerListener(): () => void {
  const listener = async (message: any, sender: any) => {
    if (message.type === 'DEBUGGER_CLICK' || message.type === 'DEBUGGER_TYPE') {
      const tabId = sender.tab?.id;
      if (!tabId) {
        return { success: false, error: 'No tab ID found' };
      }

      try {
        // Attach debugger using DevTools Protocol version 1.3
        await browser.debugger.attach({ tabId }, '1.3');

        if (message.type === 'DEBUGGER_CLICK') {
          const { x, y } = message;
          // Dispatch mousePressed
          await browser.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x,
            y,
            button: 'left',
            clickCount: 1,
          });
          // Dispatch mouseReleased
          await browser.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x,
            y,
            button: 'left',
            clickCount: 1,
          });
        } else if (message.type === 'DEBUGGER_TYPE') {
          const { x, y, text } = message;
          // Click element first to focus it
          await browser.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x,
            y,
            button: 'left',
            clickCount: 1,
          });
          await browser.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x,
            y,
            button: 'left',
            clickCount: 1,
          });
          // Type the text natively
          await browser.debugger.sendCommand({ tabId }, 'Input.insertText', {
            text,
          });
        }

        return { success: true };
      } catch (error: any) {
        console.error('Debugger action failed:', error);
        return { success: false, error: error.message };
      } finally {
        // Always attempt to detach the debugger
        try {
          await browser.debugger.detach({ tabId });
        } catch {
          // Ignore if already detached or not attached
        }
      }
    }
  };

  browser.runtime.onMessage.addListener(listener);
  
  // Return cleanup function to remove listener
  return () => {
    browser.runtime.onMessage.removeListener(listener);
  };
}
