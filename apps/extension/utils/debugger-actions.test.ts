import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { performNativeClick, performNativeType, setupDebuggerListener } from './debugger-actions.js';

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
    // Then it types
    expect(fb.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'Input.insertText',
      { text: 'Hello World!' }
    );
    expect(fb.debugger.detach).toHaveBeenCalledWith({ tabId });

    cleanup();
  });

  it('should throw an error if the element is not found', async () => {
    await expect(performNativeClick('#non-existent')).rejects.toThrow(
      'Element not found for selector: #non-existent'
    );
  });
});
