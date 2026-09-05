import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { browser } from 'wxt/browser';
import SidepanelApp from '../SidepanelApp';
import { useAutomationStore } from '../store/useAutomationStore';

// Isolate SidepanelApp's own logic; children are covered by their own tests
vi.mock('../components/Header', () => ({ Header: () => null }));
vi.mock('../components/Toolbar', () => ({ Toolbar: () => null }));
vi.mock('../components/EditorTab', () => ({ EditorTab: () => null }));
vi.mock('../components/ConsoleTab', () => ({ ConsoleTab: () => null }));
vi.mock('../components/HelpersTab', () => ({ HelpersTab: () => null }));
vi.mock('../components/TriggersTab', () => ({ TriggersTab: () => null }));
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children?: React.ReactNode }) => children,
  TabsList: ({ children }: { children?: React.ReactNode }) => children,
  TabsTrigger: ({ children }: { children?: React.ReactNode }) => children,
  TabsContent: ({ children }: { children?: React.ReactNode }) => children,
}));

const messageListeners: Array<(message: any, sender: any) => any> = [];

describe('SidepanelApp trigger plumbing', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    messageListeners.length = 0;

    if (typeof (browser.runtime as any).getURL !== 'function') {
      (browser.runtime as any).getURL = (path: string) => `chrome-extension://unit-test${path}`;
    }

    vi.spyOn(browser.runtime, 'connect').mockImplementation((() => ({
      name: 'sidepanel',
      disconnect: vi.fn(),
      onDisconnect: { addListener: vi.fn() },
    })) as any);

    vi.spyOn(browser.runtime.onMessage, 'addListener').mockImplementation((fn: any) => {
      messageListeners.push(fn);
    });

    useAutomationStore.setState({
      runTriggerFunction: vi.fn(async () => {}),
      isInitialized: true,
      activeFileId: 'file-b',
      code: '// flow-b code',
    } as any);
  });

  it('passes functionName and fileId from RUN_TRIGGER_FUNCTION to runTriggerFunction', () => {
    render(<SidepanelApp />);

    const runSpy = useAutomationStore.getState().runTriggerFunction as unknown as ReturnType<typeof vi.fn>;
    expect(messageListeners.length).toBeGreaterThan(0);

    messageListeners[messageListeners.length - 1](
      { source: 'content', type: 'RUN_TRIGGER_FUNCTION', payload: { functionName: 'flowA', fileId: 'file-a' } },
      { tab: { id: 7 } }
    );

    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(runSpy).toHaveBeenCalledWith('flowA', 7, expect.anything(), 'file-a');
  });

  it('ignores messages that are not from the content script', () => {
    render(<SidepanelApp />);

    const runSpy = useAutomationStore.getState().runTriggerFunction as unknown as ReturnType<typeof vi.fn>;

    messageListeners[messageListeners.length - 1](
      { source: 'background', type: 'RUN_TRIGGER_FUNCTION', payload: { functionName: 'flowA', fileId: 'file-a' } },
      { tab: { id: 7 } }
    );

    expect(runSpy).not.toHaveBeenCalled();
  });
});
