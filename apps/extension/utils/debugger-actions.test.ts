import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { performNativeClick, performNativeType, performNativeTypeActive, performNativePress, setupDebuggerListener } from './debugger-actions.js';

const fb = fakeBrowser as any;

describe('Debugger Native Actions', () => {
  beforeEach(() => {
    fakeBrowser.reset();

    // Mock the chrome.debugger API on fakeBrowser since it is not implemented by default
    fb.debugger = {
      attach: vi.fn().mockResolvedValue(undefined),
      detach: vi.fn().mockResolvedValue(undefined),
      sendCommand: vi.fn().mockResolvedValue(undefined),
    };

    // Clear document body
    document.body.innerHTML = '';
  });

  it('should find element, calculate coordinates, send message, and trigger debugger commands for click', async () => {
    const tabId = 123;
    
    // Create button element in DOM
    const button = document.createElement('button');
    button.id = 'target-btn';
    document.body.appendChild(button);

    // Mock getBoundingClientRect
    button.getBoundingClientRect = () => ({
      left: 50,
      top: 100,
      width: 100,
      height: 40,
      right: 150,
      bottom: 140,
      x: 50,
      y: 100,
      toJSON: () => {},
    } as any);

    // Intercept listeners
    const listeners: any[] = [];
    vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener').mockImplementation((listener) => {
      listeners.push(listener);
    });

    // Start background listener (which will register its listener via our mocked addListener)
    const cleanup = setupDebuggerListener();

    // Mock sendMessage to invoke captured listeners with a mock sender
    vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockImplementation(async (message: any) => {
      for (const listener of listeners) {
        const result = await listener(message, { tab: { id: tabId } });
        if (result !== undefined) {
          return result;
        }
      }
      return { success: false };
    });

    const result = await performNativeClick('#target-btn');

    expect(result).toBe(true);
    expect(fb.debugger.attach).toHaveBeenCalledWith({ tabId }, '1.3');
    expect(fb.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'Input.dispatchMouseEvent',
      expect.objectContaining({ type: 'mousePressed', x: 100, y: 120 })
    );
    expect(fb.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'Input.dispatchMouseEvent',
      expect.objectContaining({ type: 'mouseReleased', x: 100, y: 120 })
    );
    expect(fb.debugger.detach).toHaveBeenCalledWith({ tabId });

    cleanup();
  });

  it('should find element, calculate coordinates, send message, and trigger debugger commands for type', async () => {
    const tabId = 456;
    const input = document.createElement('input');
    input.id = 'target-input';
    document.body.appendChild(input);

    input.getBoundingClientRect = () => ({
      left: 200,
      top: 300,
      width: 150,
      height: 30,
      right: 350,
      bottom: 330,
      x: 200,
      y: 300,
      toJSON: () => {},
    } as any);

    // Intercept listeners
    const listeners: any[] = [];
    vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener').mockImplementation((listener) => {
      listeners.push(listener);
    });

    const cleanup = setupDebuggerListener();

    vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockImplementation(async (message: any) => {
      for (const listener of listeners) {
        const result = await listener(message, { tab: { id: tabId } });
        if (result !== undefined) {
          return result;
        }
      }
      return { success: false };
    });

    const result = await performNativeType('#target-input', 'Hello World!');

    expect(result).toBe(true);
    expect(fb.debugger.attach).toHaveBeenCalledWith({ tabId }, '1.3');
    // First it clicks
    expect(fb.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'Input.dispatchMouseEvent',
      expect.objectContaining({ type: 'mousePressed', x: 275, y: 315 })
    );
    expect(fb.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'Input.dispatchMouseEvent',
      expect.objectContaining({ type: 'mouseReleased', x: 275, y: 315 })
    );
    // Then it types character by character
    expect(fb.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'Input.dispatchKeyEvent',
      expect.objectContaining({ type: 'keyDown', key: 'H', code: 'KeyH', windowsVirtualKeyCode: 72 })
    );
    expect(fb.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'Input.dispatchKeyEvent',
      expect.objectContaining({ type: 'char', text: 'H', key: 'H', code: 'KeyH', windowsVirtualKeyCode: 72 })
    );
    expect(fb.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'Input.dispatchKeyEvent',
      expect.objectContaining({ type: 'keyUp', key: 'H', code: 'KeyH', windowsVirtualKeyCode: 72 })
    );
    expect(fb.debugger.detach).toHaveBeenCalledWith({ tabId });

    cleanup();
  });

  it('should throw an error if the element is not found', async () => {
    await expect(performNativeClick('#non-existent')).rejects.toThrow(
      'Element not found for selector: #non-existent'
    );
  });

  it('should type actively without selector coordinates', async () => {
    const tabId = 789;
    
    // Intercept listeners
    const listeners: any[] = [];
    vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener').mockImplementation((listener) => {
      listeners.push(listener);
    });

    const cleanup = setupDebuggerListener();

    vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockImplementation(async (message: any) => {
      for (const listener of listeners) {
        const result = await listener(message, { tab: { id: tabId } });
        if (result !== undefined) {
          return result;
        }
      }
      return { success: false };
    });

    const result = await performNativeTypeActive('Hello Focus');

    expect(result).toBe(true);
    expect(fb.debugger.attach).toHaveBeenCalledWith({ tabId }, '1.3');
    // No mouse events should be dispatched
    expect(fb.debugger.sendCommand).not.toHaveBeenCalledWith(
      { tabId },
      'Input.dispatchMouseEvent',
      expect.any(Object)
    );
    // Directly types the text character by character
    expect(fb.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'Input.dispatchKeyEvent',
      expect.objectContaining({ type: 'keyDown', key: 'H', code: 'KeyH', windowsVirtualKeyCode: 72 })
    );
    expect(fb.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'Input.dispatchKeyEvent',
      expect.objectContaining({ type: 'char', text: 'H', key: 'H', code: 'KeyH', windowsVirtualKeyCode: 72 })
    );
    expect(fb.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'Input.dispatchKeyEvent',
      expect.objectContaining({ type: 'keyUp', key: 'H', code: 'KeyH', windowsVirtualKeyCode: 72 })
    );
    expect(fb.debugger.detach).toHaveBeenCalledWith({ tabId });

    cleanup();
  });

  it('should press hotkey combinations in the correct sequence with modifiers', async () => {
    const tabId = 999;
    
    const listeners: any[] = [];
    vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener').mockImplementation((listener) => {
      listeners.push(listener);
    });

    const cleanup = setupDebuggerListener();

    vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockImplementation(async (message: any) => {
      for (const listener of listeners) {
        const result = await listener(message, { tab: { id: tabId } });
        if (result !== undefined) {
          return result;
        }
      }
      return { success: false };
    });

    // Test 'Ctrl+Shift+I'
    const result = await performNativePress('Ctrl+Shift+I');

    expect(result).toBe(true);
    expect(fb.debugger.attach).toHaveBeenCalledWith({ tabId }, '1.3');

    // Let's verify the sequential sendCommand calls
    const calls = fb.debugger.sendCommand.mock.calls;
    
    // Down modifiers: ControlLeft (2), ShiftLeft (2 + 8 = 10)
    expect(calls[0]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      modifiers: 2,
      key: 'Control',
      code: 'ControlLeft',
      windowsVirtualKeyCode: 17
    }]);

    expect(calls[1]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      modifiers: 10,
      key: 'Shift',
      code: 'ShiftLeft',
      windowsVirtualKeyCode: 16
    }]);

    // Down active key: 'I' (capitalized since Shift is active)
    expect(calls[2]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      modifiers: 10,
      key: 'I',
      code: 'KeyI',
      windowsVirtualKeyCode: 73
    }]);

    // Up active key: 'I'
    expect(calls[3]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers: 10,
      key: 'I',
      code: 'KeyI',
      windowsVirtualKeyCode: 73
    }]);

    // Up modifiers: ShiftLeft (10 - 8 = 2), ControlLeft (2 - 2 = 0)
    expect(calls[4]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers: 2,
      key: 'Shift',
      code: 'ShiftLeft',
      windowsVirtualKeyCode: 16
    }]);

    expect(calls[5]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers: 0,
      key: 'Control',
      code: 'ControlLeft',
      windowsVirtualKeyCode: 17
    }]);

    expect(fb.debugger.detach).toHaveBeenCalledWith({ tabId });

    cleanup();
  });

  it('should parse standalone "+" key correctly', async () => {
    const tabId = 101;
    const listeners: any[] = [];
    vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener').mockImplementation((listener) => {
      listeners.push(listener);
    });

    const cleanup = setupDebuggerListener();

    vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockImplementation(async (message: any) => {
      for (const listener of listeners) {
        const result = await listener(message, { tab: { id: tabId } });
        if (result !== undefined) return result;
      }
      return { success: false };
    });

    const result = await performNativePress('+');
    expect(result).toBe(true);

    const calls = fb.debugger.sendCommand.mock.calls;
    // For standalone '+', no modifiers should be sent. Only rawKeyDown and keyUp.
    expect(calls.length).toBe(2);
    expect(calls[0]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      modifiers: 0,
      key: '+',
      code: 'Equal',
      windowsVirtualKeyCode: 187
    }]);
    expect(calls[1]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers: 0,
      key: '+',
      code: 'Equal',
      windowsVirtualKeyCode: 187
    }]);

    cleanup();
  });

  it('should parse "Ctrl++" key combo correctly', async () => {
    const tabId = 102;
    const listeners: any[] = [];
    vi.spyOn(fakeBrowser.runtime.onMessage, 'addListener').mockImplementation((listener) => {
      listeners.push(listener);
    });

    const cleanup = setupDebuggerListener();

    vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockImplementation(async (message: any) => {
      for (const listener of listeners) {
        const result = await listener(message, { tab: { id: tabId } });
        if (result !== undefined) return result;
      }
      return { success: false };
    });

    const result = await performNativePress('Ctrl++');
    expect(result).toBe(true);

    const calls = fb.debugger.sendCommand.mock.calls;
    // Ctrl++ contains Ctrl modifier and '+' key.
    // Order: Control rawKeyDown, + rawKeyDown, + keyUp, Control keyUp.
    expect(calls.length).toBe(4);
    expect(calls[0]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      modifiers: 2,
      key: 'Control',
      code: 'ControlLeft',
      windowsVirtualKeyCode: 17
    }]);
    expect(calls[1]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      modifiers: 2,
      key: '+',
      code: 'Equal',
      windowsVirtualKeyCode: 187
    }]);
    expect(calls[2]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers: 2,
      key: '+',
      code: 'Equal',
      windowsVirtualKeyCode: 187
    }]);
    expect(calls[3]).toEqual([{ tabId }, 'Input.dispatchKeyEvent', {
      type: 'keyUp',
      modifiers: 0,
      key: 'Control',
      code: 'ControlLeft',
      windowsVirtualKeyCode: 17
    }]);

    cleanup();
  });
});
