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
 * Content script helper to trigger a native text input in the active focus via the debugger API.
 */
export async function performNativeTypeActive(text: string): Promise<boolean> {
  const response = await browser.runtime.sendMessage({
    type: 'DEBUGGER_TYPE_ACTIVE',
    text,
  });

  return !!response?.success;
}

/**
 * Content script helper to trigger a native key combo press via the debugger API.
 */
export async function performNativePress(keyCombo: string): Promise<boolean> {
  const response = await browser.runtime.sendMessage({
    type: 'DEBUGGER_PRESS',
    keyCombo,
  });

  return !!response?.success;
}

interface ModifierDef {
  bit: number;
  key: string;
  code: string;
  keyCode: number;
}

const MODIFIERS_MAP: Record<string, ModifierDef> = {
  'ctrl': { bit: 2, key: 'Control', code: 'ControlLeft', keyCode: 17 },
  'control': { bit: 2, key: 'Control', code: 'ControlLeft', keyCode: 17 },
  'alt': { bit: 1, key: 'Alt', code: 'AltLeft', keyCode: 18 },
  'option': { bit: 1, key: 'Alt', code: 'AltLeft', keyCode: 18 },
  'shift': { bit: 8, key: 'Shift', code: 'ShiftLeft', keyCode: 16 },
  'meta': { bit: 4, key: 'Meta', code: 'MetaLeft', keyCode: 91 },
  'cmd': { bit: 4, key: 'Meta', code: 'MetaLeft', keyCode: 91 },
  'command': { bit: 4, key: 'Meta', code: 'MetaLeft', keyCode: 91 },
  'win': { bit: 4, key: 'Meta', code: 'MetaLeft', keyCode: 91 },
  'windows': { bit: 4, key: 'Meta', code: 'MetaLeft', keyCode: 91 },
};

interface KeyDefinition {
  key: string;
  code: string;
  keyCode?: number;
}

const KEY_MAP: Record<string, KeyDefinition> = {
  'enter': { key: 'Enter', code: 'Enter', keyCode: 13 },
  'tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
  'backspace': { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  'escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
  'space': { key: ' ', code: 'Space', keyCode: 32 },
  'arrowup': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  'arrowdown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  'arrowleft': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  'arrowright': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  'pageup': { key: 'PageUp', code: 'PageUp', keyCode: 33 },
  'pagedown': { key: 'PageDown', code: 'PageDown', keyCode: 34 },
  'end': { key: 'End', code: 'End', keyCode: 35 },
  'home': { key: 'Home', code: 'Home', keyCode: 36 },
  'insert': { key: 'Insert', code: 'Insert', keyCode: 45 },
  'delete': { key: 'Delete', code: 'Delete', keyCode: 46 },
  'f1': { key: 'F1', code: 'F1', keyCode: 112 },
  'f2': { key: 'F2', code: 'F2', keyCode: 113 },
  'f3': { key: 'F3', code: 'F3', keyCode: 114 },
  'f4': { key: 'F4', code: 'F4', keyCode: 115 },
  'f5': { key: 'F5', code: 'F5', keyCode: 116 },
  'f6': { key: 'F6', code: 'F6', keyCode: 117 },
  'f7': { key: 'F7', code: 'F7', keyCode: 118 },
  'f8': { key: 'F8', code: 'F8', keyCode: 119 },
  'f9': { key: 'F9', code: 'F9', keyCode: 120 },
  'f10': { key: 'F10', code: 'F10', keyCode: 121 },
  'f11': { key: 'F11', code: 'F11', keyCode: 122 },
  'f12': { key: 'F12', code: 'F12', keyCode: 123 },
  '+': { key: '+', code: 'Equal', keyCode: 187 },
  '-': { key: '-', code: 'Minus', keyCode: 189 },
  '=': { key: '=', code: 'Equal', keyCode: 187 },
  '[': { key: '[', code: 'BracketLeft', keyCode: 219 },
  ']': { key: ']', code: 'BracketRight', keyCode: 221 },
  ';': { key: ';', code: 'Semicolon', keyCode: 186 },
  "'": { key: "'", code: 'Quote', keyCode: 222 },
  '\\': { key: '\\', code: 'Backslash', keyCode: 220 },
  ',': { key: ',', code: 'Comma', keyCode: 188 },
  '.': { key: '.', code: 'Period', keyCode: 190 },
  '/': { key: '/', code: 'Slash', keyCode: 191 },
  ' ': { key: ' ', code: 'Space', keyCode: 32 },
};

async function handleDebuggerPress(tabId: number, keyCombo: string): Promise<void> {
  let parts: string[] = [];
  if (keyCombo === '+') {
    parts = ['+'];
  } else if (keyCombo.endsWith('++')) {
    const base = keyCombo.slice(0, -2);
    parts = base.split('+').map(p => p.trim()).filter(Boolean);
    parts.push('+');
  } else {
    parts = keyCombo.split('+').map(p => p.trim());
  }

  const activeModifiers: ModifierDef[] = [];
  const nonModifiers: string[] = [];

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (MODIFIERS_MAP[lower]) {
      if (!activeModifiers.some(m => m.key === MODIFIERS_MAP[lower].key)) {
        activeModifiers.push(MODIFIERS_MAP[lower]);
      }
    } else {
      nonModifiers.push(part);
    }
  }

  let primaryKeyDef: KeyDefinition | null = null;
  if (nonModifiers.length > 0) {
    const primaryPart = nonModifiers[0];
    const lower = primaryPart.toLowerCase();

    if (KEY_MAP[lower]) {
      primaryKeyDef = { ...KEY_MAP[lower] };
    } else if (primaryPart.length === 1) {
      const char = primaryPart;
      if (/[a-zA-Z]/.test(char)) {
        primaryKeyDef = {
          key: char,
          code: `Key${char.toUpperCase()}`,
          keyCode: char.toUpperCase().charCodeAt(0)
        };
      } else if (/[0-9]/.test(char)) {
        primaryKeyDef = {
          key: char,
          code: `Digit${char}`,
          keyCode: char.charCodeAt(0)
        };
      } else {
        primaryKeyDef = {
          key: char,
          code: char,
          keyCode: char.charCodeAt(0)
        };
      }
    } else {
      primaryKeyDef = {
        key: primaryPart,
        code: primaryPart,
        keyCode: 0
      };
    }
  }

  if (primaryKeyDef && primaryKeyDef.key.length === 1 && /[a-zA-Z]/.test(primaryKeyDef.key)) {
    const hasShift = activeModifiers.some(m => m.key === 'Shift');
    primaryKeyDef.key = hasShift ? primaryKeyDef.key.toUpperCase() : primaryKeyDef.key.toLowerCase();
  }

  const bitmask = activeModifiers.reduce((acc, m) => acc + m.bit, 0);

  // 1. Down modifiers sequentially
  let currentModifiers = 0;
  for (const mod of activeModifiers) {
    currentModifiers += mod.bit;
    await browser.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      modifiers: currentModifiers,
      key: mod.key,
      code: mod.code,
      windowsVirtualKeyCode: mod.keyCode,
    });
  }

  // 2. Down active key
  if (primaryKeyDef) {
    await browser.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      modifiers: bitmask,
      key: primaryKeyDef.key,
      code: primaryKeyDef.code,
      windowsVirtualKeyCode: primaryKeyDef.keyCode,
    });

    // 3. Up active key
    await browser.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers: bitmask,
      key: primaryKeyDef.key,
      code: primaryKeyDef.code,
      windowsVirtualKeyCode: primaryKeyDef.keyCode,
    });
  }

  // 4. Up modifiers in reverse order
  for (let i = activeModifiers.length - 1; i >= 0; i--) {
    const mod = activeModifiers[i];
    currentModifiers -= mod.bit;
    await browser.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers: currentModifiers,
      key: mod.key,
      code: mod.code,
      windowsVirtualKeyCode: mod.keyCode,
    });
  }
}

interface DebuggerSession {
  attachPromise: Promise<void>;
  detachTimeoutId: any;
}

const activeSessions = new Map<number, DebuggerSession>();

async function acquireDebugger(tabId: number): Promise<void> {
  let session = activeSessions.get(tabId);
  if (!session) {
    const attachPromise = (async () => {
      try {
        await browser.debugger.attach({ tabId }, '1.3');
      } catch (error: any) {
        const msg = error?.message || '';
        if (!msg.includes('already attached') && !msg.includes('Already attached')) {
          activeSessions.delete(tabId);
          throw error;
        }
      }
    })();
    session = {
      attachPromise,
      detachTimeoutId: null,
    };
    activeSessions.set(tabId, session);
  }

  if (session.detachTimeoutId) {
    clearTimeout(session.detachTimeoutId);
    session.detachTimeoutId = null;
  }

  await session.attachPromise;
}

function releaseDebugger(tabId: number) {
  const session = activeSessions.get(tabId);
  if (!session) return;

  if (session.detachTimeoutId) {
    clearTimeout(session.detachTimeoutId);
  }

  const performDetach = async () => {
    activeSessions.delete(tabId);
    try {
      await browser.debugger.detach({ tabId });
    } catch {
      // Ignore if already detached
    }
  };

  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    performDetach();
  } else {
    session.detachTimeoutId = setTimeout(performDetach, 1500);
  }
}

/**
 * Background script listener to attach debugger and send CDP native input commands.
 */
export function setupDebuggerListener(): () => void {
  const onDetachListener = (source: any) => {
    if (source.tabId) {
      const session = activeSessions.get(source.tabId);
      if (session) {
        if (session.detachTimeoutId) {
          clearTimeout(session.detachTimeoutId);
        }
        activeSessions.delete(source.tabId);
      }
    }
  };

  if (browser.debugger?.onDetach) {
    browser.debugger.onDetach.addListener(onDetachListener);
  }

  const listener = async (message: any, sender: any) => {
    if (
      message.type === 'DEBUGGER_CLICK' ||
      message.type === 'DEBUGGER_TYPE' ||
      message.type === 'DEBUGGER_TYPE_ACTIVE' ||
      message.type === 'DEBUGGER_PRESS'
    ) {
      const tabId = sender.tab?.id;
      if (!tabId) {
        return { success: false, error: 'No tab ID found' };
      }

      try {
        await acquireDebugger(tabId);

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
        } else if (message.type === 'DEBUGGER_TYPE_ACTIVE') {
          const { text } = message;
          await browser.debugger.sendCommand({ tabId }, 'Input.insertText', {
            text,
          });
        } else if (message.type === 'DEBUGGER_PRESS') {
          const { keyCombo } = message;
          await handleDebuggerPress(tabId, keyCombo);
        }

        return { success: true };
      } catch (error: any) {
        console.error('Debugger action failed:', error);
        return { success: false, error: error.message };
      } finally {
        releaseDebugger(tabId);
      }
    }
  };

  browser.runtime.onMessage.addListener(listener);
  
  // Return cleanup function to remove listener
  return () => {
    browser.runtime.onMessage.removeListener(listener);
    if (browser.debugger?.onDetach) {
      browser.debugger.onDetach.removeListener(onDetachListener);
    }
  };
}
