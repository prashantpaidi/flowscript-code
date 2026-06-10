import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Toolbar } from '../Toolbar';
import { useAutomationStore } from '../../store/useAutomationStore';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('Toolbar Component', () => {
  let iframeRef: { current: HTMLIFrameElement | null };

  beforeEach(() => {
    iframeRef = { current: null };

    // Reset Zustand store state before each test
    act(() => {
      useAutomationStore.setState({
        isRunning: false,
        isSelectingElement: false,
        isRecording: false,
      });
    });
  });

  it('should render all action buttons', () => {
    render(
      <TooltipProvider>
        <Toolbar iframeRef={iframeRef as any} />
      </TooltipProvider>
    );
    expect(screen.getByRole('button', { name: 'Inspect' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Script' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  it('should toggle element inspection on click', () => {
    const startSpy = vi.spyOn(useAutomationStore.getState(), 'startSelectingElement').mockImplementation(async () => {});
    const stopSpy = vi.spyOn(useAutomationStore.getState(), 'stopSelectingElement').mockImplementation(async () => {});

    // Initial state: not selecting
    const { rerender } = render(
      <TooltipProvider>
        <Toolbar iframeRef={iframeRef as any} />
      </TooltipProvider>
    );
    const inspectBtn = screen.getByRole('button', { name: 'Inspect' });
    fireEvent.click(inspectBtn);
    expect(startSpy).toHaveBeenCalledTimes(1);

    // Update state to selecting element
    act(() => {
      useAutomationStore.setState({ isSelectingElement: true });
    });
    rerender(
      <TooltipProvider>
        <Toolbar iframeRef={iframeRef as any} />
      </TooltipProvider>
    );
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelBtn).toHaveClass('animate-pulse');
    fireEvent.click(cancelBtn);
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('should toggle recording on click', () => {
    const startSpy = vi.spyOn(useAutomationStore.getState(), 'startRecording').mockImplementation(async () => {});
    const stopSpy = vi.spyOn(useAutomationStore.getState(), 'stopRecording').mockImplementation(async () => {});

    const { rerender } = render(
      <TooltipProvider>
        <Toolbar iframeRef={iframeRef as any} />
      </TooltipProvider>
    );
    const recordBtn = screen.getByRole('button', { name: 'Record' });
    fireEvent.click(recordBtn);
    expect(startSpy).toHaveBeenCalledTimes(1);

    // Update state to recording
    act(() => {
      useAutomationStore.setState({ isRecording: true });
    });
    rerender(
      <TooltipProvider>
        <Toolbar iframeRef={iframeRef as any} />
      </TooltipProvider>
    );
    const stopRecBtn = screen.getByRole('button', { name: 'Stop Rec' });
    expect(stopRecBtn).toHaveClass('animate-pulse');
    fireEvent.click(stopRecBtn);
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('should trigger runScript on run click', () => {
    const runSpy = vi.spyOn(useAutomationStore.getState(), 'runScript').mockImplementation(async () => {});

    render(
      <TooltipProvider>
        <Toolbar iframeRef={iframeRef as any} />
      </TooltipProvider>
    );
    const runBtn = screen.getByRole('button', { name: 'Run Script' });
    fireEvent.click(runBtn);
    expect(runSpy).toHaveBeenCalledTimes(1);
  });

  it('should trigger stopScript on stop click', () => {
    const stopSpy = vi.spyOn(useAutomationStore.getState(), 'stopScript').mockImplementation(() => {});
    
    act(() => {
      useAutomationStore.setState({ isRunning: true });
    });
    render(
      <TooltipProvider>
        <Toolbar iframeRef={iframeRef as any} />
      </TooltipProvider>
    );
    const stopBtn = screen.getByRole('button', { name: 'Stop' });
    fireEvent.click(stopBtn);
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('should disable appropriate buttons when isRunning is true', () => {
    act(() => {
      useAutomationStore.setState({ isRunning: true });
    });
    render(
      <TooltipProvider>
        <Toolbar iframeRef={iframeRef as any} />
      </TooltipProvider>
    );

    expect(screen.getByRole('button', { name: 'Inspect' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Record' })).toBeDisabled();
    
    const runBtn = screen.getByRole('button', { name: 'Running...' });
    expect(runBtn).toBeDisabled();
    
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  });
});
