import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { browser } from 'wxt/browser';
import { getPendingTrigger } from '@/utils/storage';

const messageListeners: Array<(message: any, sender: any) => any> = [];
const connectListeners: Array<(port: any) => void> = [];

const dispatchMessage = (message: any, sender: any = {}) =>
  Promise.all(messageListeners.map((fn) => fn(message, sender)));

describe('background trigger plumbing', () => {
  beforeAll(async () => {
    // fakeBrowser does not implement the sidePanel namespace; stub it deterministically
    (browser as any).sidePanel = {
      setPanelBehavior: vi.fn().mockResolvedValue(undefined),
      open: vi.fn().mockResolvedValue(undefined),
    };

    // Capture listeners instead of registering them so tests can dispatch manually
    vi.spyOn(browser.runtime.onMessage, 'addListener').mockImplementation((fn: any) => {
      messageListeners.push(fn);
    });
    vi.spyOn(browser.runtime.onConnect, 'addListener').mockImplementation((fn: any) => {
      connectListeners.push(fn);
    });

    // Importing the entrypoint returns the WXT background definition ({ main });
    // invoking main() registers its listeners (WXT's build wrapper does this in production)
    const definition = await import('../background');
    definition.default.main();
  });

  beforeEach(() => {
    fakeBrowser.reset();
    vi.clearAllMocks();
  });

  it('queues the pending trigger with fileId and opens the sidepanel when it is closed', async () => {
    const openSpy = (browser as any).sidePanel.open;

    await dispatchMessage(
      { source: 'content', type: 'RUN_TRIGGER_FUNCTION', payload: { functionName: 'flowA', fileId: 'file-a' } },
      { tab: { id: 42 } }
    );

    await expect(getPendingTrigger()).resolves.toEqual({
      functionName: 'flowA',
      tabId: 42,
      fileId: 'file-a',
    });
    expect(openSpy).toHaveBeenCalledWith({ tabId: 42 });
  });

  it('does not queue or open the sidepanel when it is already open', async () => {
    const openSpy = (browser as any).sidePanel.open;
    connectListeners.forEach((fn) =>
      fn({ name: 'sidepanel', onDisconnect: { addListener: vi.fn() } })
    );

    await dispatchMessage(
      { source: 'content', type: 'RUN_TRIGGER_FUNCTION', payload: { functionName: 'flowB', fileId: 'file-b' } },
      { tab: { id: 43 } }
    );

    await expect(getPendingTrigger()).resolves.toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });
});
