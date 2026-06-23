import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import Step1Home from '../../src/components/wizard/Step1Home.tsx';

describe('Step1Home', () => {
  it('renders three action cards', () => {
    render(<Step1Home onSelect={vi.fn()} />);
    expect(screen.getByText('Update Inventory')).toBeInTheDocument();
    expect(screen.getByText('Add Products')).toBeInTheDocument();
    expect(screen.getByText('Edit Products')).toBeInTheDocument();
  });

  it('calls onSelect with inventory when Update Inventory is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Step1Home onSelect={onSelect} />);
    await user.click(screen.getByText('Update Inventory'));
    expect(onSelect).toHaveBeenCalledWith('inventory');
  });

  it('calls onSelect with addProducts when Add Products is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Step1Home onSelect={onSelect} />);
    await user.click(screen.getByText('Add Products'));
    expect(onSelect).toHaveBeenCalledWith('addProducts');
  });

  it('calls onSelect with editProducts when Edit Products is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Step1Home onSelect={onSelect} />);
    await user.click(screen.getByText('Edit Products'));
    expect(onSelect).toHaveBeenCalledWith('editProducts');
  });
});
