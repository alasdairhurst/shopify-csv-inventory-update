import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import LogPanel from '../../src/components/LogPanel.tsx';
import logger from '../../src/utils/logger.ts';

function pushEntry(level: 'debug' | 'info' | 'warn' | 'error', message: string) {
  logger.entries.push({ level, message, timestamp: new Date() });
  logger._notify();
}

describe('LogPanel', () => {
  beforeEach(() => {
    logger.clear();
  });

  it('is closed by default (log area not visible)', () => {
    render(<LogPanel />);
    expect(screen.queryByText('No log entries.')).not.toBeInTheDocument();
  });

  it('expands when the toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<LogPanel />);
    await user.click(screen.getByText('↑ logs'));
    expect(screen.getByText('No log entries.')).toBeInTheDocument();
  });

  it('shows log entries after they are pushed', async () => {
    const user = userEvent.setup();
    render(<LogPanel />);
    await user.click(screen.getByText('↑ logs'));
    await act(async () => { pushEntry('info', 'Test message'); });
    expect(await screen.findByText('Test message')).toBeInTheDocument();
  });

  it('hides warn entries when warn filter is toggled off', async () => {
    const user = userEvent.setup();
    render(<LogPanel />);
    await act(async () => {
      pushEntry('info', 'Info message');
      pushEntry('warn', 'Warn message');
    });
    await user.click(screen.getByText('↑ logs'));
    expect(screen.getByText('Warn message')).toBeInTheDocument();
    await user.click(screen.getByText('warn'));
    expect(screen.queryByText('Warn message')).not.toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('shows warning indicator (⚠) when collapsed and entries contain warnings', async () => {
    render(<LogPanel />);
    await act(async () => { pushEntry('warn', 'Something bad'); });
    expect(screen.getByText('⚠')).toBeInTheDocument();
  });

  it('hides warning indicator when panel is open', async () => {
    const user = userEvent.setup();
    render(<LogPanel />);
    await act(async () => { pushEntry('warn', 'Something bad'); });
    await user.click(screen.getByText('↑ logs'));
    expect(screen.queryByText('⚠')).not.toBeInTheDocument();
  });

  it('shows "X earlier entries not shown" when more than 500 filtered entries exist', async () => {
    const user = userEvent.setup();
    render(<LogPanel />);
    await act(async () => {
      for (let i = 0; i < 502; i++) {
        logger.entries.push({ level: 'info', message: `msg ${i}`, timestamp: new Date() });
      }
      logger._notify();
    });
    await user.click(screen.getByText('↑ logs'));
    expect(screen.getByText('2 earlier entries not shown')).toBeInTheDocument();
  });

  it('shows the version string when provided', () => {
    render(<LogPanel version="Built 1 Jan 2025" />);
    expect(screen.getByText('Built 1 Jan 2025')).toBeInTheDocument();
  });
});
