import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TriggersTab } from '../TriggersTab';
import { useAutomationStore } from '../../store/useAutomationStore';

describe('TriggersTab Component', () => {
  let iframeRef: { current: HTMLIFrameElement | null };

  beforeEach(() => {
    iframeRef = { current: null };

    // Reset Zustand store state before each test
    useAutomationStore.setState({
      triggers: [],
      code: '',
      validationError: null,
    });
  });

  it('should render empty state with examples when triggers list is empty', () => {
    render(<TriggersTab iframeRef={iframeRef as any} />);
    expect(screen.getByText('No Triggers Active')).toBeInTheDocument();
    expect(screen.getByText('Hotkey Trigger Example')).toBeInTheDocument();
    expect(screen.getByText('Text Expander Example')).toBeInTheDocument();
  });

  it('should call setCode when inserting hotkey or expander examples', () => {
    const setCodeSpy = vi.spyOn(useAutomationStore.getState(), 'setCode').mockImplementation(() => {});

    render(<TriggersTab iframeRef={iframeRef as any} />);

    const addHotkeyBtn = screen.getByRole('button', { name: /Add Hotkey Trigger/ });
    fireEvent.click(addHotkeyBtn);
    expect(setCodeSpy).toHaveBeenCalled();

    const addExpanderBtn = screen.getByRole('button', { name: /Add Expander Trigger/ });
    fireEvent.click(addExpanderBtn);
    expect(setCodeSpy).toHaveBeenCalled();
  });

  it('should render list of active triggers', () => {
    useAutomationStore.setState({
      triggers: [
        { type: 'hotkey', triggerVal: 'ctrl+shift+k', displayLabel: 'Ctrl + Shift + K', functionName: 'openMenu' },
        { type: 'expander', triggerVal: ';;tq', expansionText: 'thank you', functionName: 'autoGreet' },
      ],
    });

    render(<TriggersTab iframeRef={iframeRef as any} />);

    expect(screen.getByText('Hotkey')).toBeInTheDocument();
    expect(screen.getByText('Ctrl + Shift + K')).toBeInTheDocument();
    expect(screen.getByText('openMenu()')).toBeInTheDocument();

    expect(screen.getByText('Text Expander')).toBeInTheDocument();
    expect(screen.getByText(';;tq')).toBeInTheDocument();
    expect(screen.getByText('autoGreet()')).toBeInTheDocument();
    expect(screen.getByText(/"thank you"/)).toBeInTheDocument();
  });

  it('should call runTriggerFunction when clicking play button on a trigger', () => {
    const runTriggerSpy = vi.spyOn(useAutomationStore.getState(), 'runTriggerFunction').mockImplementation(async () => {});
    useAutomationStore.setState({
      triggers: [
        { type: 'hotkey', triggerVal: 'ctrl+shift+k', displayLabel: 'Ctrl + Shift + K', functionName: 'openMenu' },
      ],
    });

    render(<TriggersTab iframeRef={iframeRef as any} />);

    const playBtn = screen.getByTitle('Test Trigger Function');
    fireEvent.click(playBtn);

    expect(runTriggerSpy).toHaveBeenCalledWith('openMenu', undefined, null);
  });

  it('should render trigger validation error when present', () => {
    // Need triggers list to be non-empty so that it doesn't just show empty view without errors
    useAutomationStore.setState({
      triggers: [
        { type: 'hotkey', triggerVal: 'ctrl+shift+k', displayLabel: 'Ctrl + Shift + K', functionName: 'openMenu' },
      ],
      validationError: 'Hotkey collision: ctrl+shift+k is used multiple times',
    });

    render(<TriggersTab iframeRef={iframeRef as any} />);

    expect(screen.getByText('Trigger Validation Error')).toBeInTheDocument();
    expect(screen.getByText('Hotkey collision: ctrl+shift+k is used multiple times')).toBeInTheDocument();
  });
});
