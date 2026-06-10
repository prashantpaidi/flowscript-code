import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Header } from '../Header';
import { useAutomationStore } from '../../store/useAutomationStore';

describe('Header Component', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useAutomationStore.setState({
      status: 'idle',
    });
  });

  it('should render the title and description correctly', () => {
    render(<Header />);
    expect(screen.getByText('FlowScript Studio')).toBeInTheDocument();
    expect(screen.getByText('Web Automation')).toBeInTheDocument();
  });

  it('should render the correct badge color and text when status is idle', () => {
    useAutomationStore.setState({ status: 'idle' });
    render(<Header />);
    const badge = screen.getByText('idle');
    expect(badge).toBeInTheDocument();
    
    // Check for the indicator circle
    const indicator = badge.querySelector('span');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-muted-foreground/60');
  });

  it('should render the correct badge color and text when status is running', () => {
    useAutomationStore.setState({ status: 'running' });
    render(<Header />);
    const badge = screen.getByText('running');
    expect(badge).toBeInTheDocument();
    
    const indicator = badge.querySelector('span');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-amber-500');
    expect(indicator).toHaveClass('animate-pulse');
  });

  it('should render the correct badge color and text when status is success', () => {
    useAutomationStore.setState({ status: 'success' });
    render(<Header />);
    const badge = screen.getByText('success');
    expect(badge).toBeInTheDocument();
    
    const indicator = badge.querySelector('span');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-emerald-500');
  });

  it('should render the correct badge color and text when status is error', () => {
    useAutomationStore.setState({ status: 'error' });
    render(<Header />);
    const badge = screen.getByText('error');
    expect(badge).toBeInTheDocument();
    
    const indicator = badge.querySelector('span');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-rose-500');
  });
});
