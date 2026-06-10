import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConsoleTab } from '../ConsoleTab';
import { useAutomationStore } from '../../store/useAutomationStore';

describe('ConsoleTab Component', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    // Reset Zustand store state
    useAutomationStore.setState({
      logs: [],
      errorMessage: '',
    });
  });

  it('should render empty state when there are no logs', () => {
    render(<ConsoleTab />);
    expect(screen.getByText('Console is empty')).toBeInTheDocument();
    expect(screen.getByText(/Logs and execution steps will appear here/)).toBeInTheDocument();
  });

  it('should render logs when available', () => {
    const timestamp = new Date('2026-06-10T12:00:00Z').getTime();
    useAutomationStore.setState({
      logs: [
        { type: 'log', message: 'Hello general log', timestamp },
        { type: 'step', message: 'Executed step 1', timestamp },
        { type: 'error', message: 'Something went wrong', timestamp },
      ],
    });

    render(<ConsoleTab />);

    expect(screen.getByText('Hello general log')).toBeInTheDocument();
    expect(screen.getByText('Executed step 1')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should trigger clearConsole on Clear button click', () => {
    const clearSpy = vi.spyOn(useAutomationStore.getState(), 'clearConsole').mockImplementation(() => {});
    useAutomationStore.setState({
      logs: [{ type: 'log', message: 'Some log', timestamp: Date.now() }],
    });

    render(<ConsoleTab />);
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearBtn);

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('should render error details when errorMessage is present', () => {
    useAutomationStore.setState({
      errorMessage: 'Fatal compile error on line 5',
    });

    render(<ConsoleTab />);
    expect(screen.getByText('Error Details')).toBeInTheDocument();
    expect(screen.getByText('Fatal compile error on line 5')).toBeInTheDocument();
  });
});
