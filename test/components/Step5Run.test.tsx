import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import Step5Run from '../../src/components/wizard/Step5Run.tsx';
import type { WizardState } from '../../src/components/wizard/types.ts';

vi.mock('../../src/orchestrate.ts', () => ({
  runUpdateInventory: vi.fn(),
  runAddProducts: vi.fn(),
  runUpdateProducts: vi.fn(),
}));

vi.mock('../../src/files/download.ts', () => ({
  downloadTextFile: vi.fn(),
}));

import { runUpdateInventory, runAddProducts, runUpdateProducts } from '../../src/orchestrate.ts';
const mockRunInventory = vi.mocked(runUpdateInventory);
const mockRunAdd = vi.mocked(runAddProducts);
const mockRunUpdate = vi.mocked(runUpdateProducts);

const mockVendor = { name: 'TestVendor', importLabel: '', expectedHeaders: [], getSKU: () => '', urlConfig: { supportsFile: true, supportsURL: true } };
const mockBrand = {
  id: 'test',
  name: 'Test Brand',
  icon: '🧪',
  fileInfo: {
    inventory: { label: 'l', description: 'd' },
    addProducts: { label: 'l', description: 'd' },
    editProducts: { label: 'l', description: 'd' },
  },
  vendorFor: {
    inventory: () => mockVendor as any,
    addProducts: () => mockVendor as any,
    editProducts: () => mockVendor as any,
  },
};

const makeState = (overrides: Partial<WizardState> = {}): WizardState => ({
  step: 'run',
  action: 'inventory',
  brands: [mockBrand],
  vendorIndex: 0,
  shopifyFileName: 'shopify.csv',
  shopifyProducts: [{ Handle: 'h1' }] as any[],
  vendorFiles: { test: { fileName: 'vendor.csv', products: [{ Code: 'c1' }] as any[] } },
  settings: { maxQuantity: 5, updateImages: false },
  runState: 'idle',
  ...overrides,
});

describe('Step5Run', () => {
  beforeEach(() => {
    mockRunInventory.mockResolvedValue('Handle,Title\nrow1,val1');
    mockRunAdd.mockResolvedValue('Handle,Title\nrow1,val1');
    mockRunUpdate.mockResolvedValue('Handle,Title\nrow1,val1');
  });

  it('shows settings panel for inventory action', () => {
    render(<Step5Run state={makeState({ action: 'inventory' })} dispatch={vi.fn()} />);
    expect(screen.getByText('Maximum stock level')).toBeInTheDocument();
  });

  it('shows settings panel for editProducts action', () => {
    render(<Step5Run state={makeState({ action: 'editProducts' })} dispatch={vi.fn()} />);
    expect(screen.getByText('Update variant images')).toBeInTheDocument();
  });

  it('hides settings panel for addProducts action', () => {
    render(<Step5Run state={makeState({ action: 'addProducts' })} dispatch={vi.fn()} />);
    expect(screen.queryByText('Maximum stock level')).not.toBeInTheDocument();
    expect(screen.queryByText('Update variant images')).not.toBeInTheDocument();
  });

  it('disables settings inputs when runState is running', () => {
    render(<Step5Run state={makeState({ runState: 'running' })} dispatch={vi.fn()} />);
    const input = screen.getByLabelText('Maximum stock level');
    expect(input).toBeDisabled();
  });

  it('calls runUpdateInventory with correct args on Run click', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<Step5Run state={makeState({ action: 'inventory' })} dispatch={dispatch} />);
    await user.click(screen.getByText('Run ▶'));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'RUN_DONE' })));
    expect(mockRunInventory).toHaveBeenCalledWith([{ Handle: 'h1' }], { TestVendor: [{ Code: 'c1' }] }, { maxQuantity: 5 });
  });

  it('calls runAddProducts on Run click for addProducts action', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<Step5Run state={makeState({ action: 'addProducts' })} dispatch={dispatch} />);
    await user.click(screen.getByText('Run ▶'));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'RUN_DONE' })));
    expect(mockRunAdd).toHaveBeenCalledWith([{ Handle: 'h1' }], { TestVendor: [{ Code: 'c1' }] });
  });

  it('calls runUpdateProducts on Run click for editProducts action', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<Step5Run state={makeState({ action: 'editProducts' })} dispatch={dispatch} />);
    await user.click(screen.getByText('Run ▶'));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'RUN_DONE' })));
    expect(mockRunUpdate).toHaveBeenCalledWith([{ Handle: 'h1' }], { TestVendor: [{ Code: 'c1' }] }, { updateImages: false });
  });

  it('dispatches RUN_ERROR with message when orchestrate throws', async () => {
    const user = userEvent.setup();
    mockRunInventory.mockRejectedValue(new Error('Nothing to export'));
    const dispatch = vi.fn();
    render(<Step5Run state={makeState({ action: 'inventory' })} dispatch={dispatch} />);
    await user.click(screen.getByText('Run ▶'));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'RUN_ERROR', message: 'Nothing to export' }));
  });

  it('shows error message and Try again button in error state', () => {
    const dispatch = vi.fn();
    render(<Step5Run state={makeState({ runState: 'error', errorMessage: 'Parse failed' })} dispatch={dispatch} />);
    expect(screen.getByText('Parse failed')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('dispatches RESET_RUN when Try again is clicked', async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(<Step5Run state={makeState({ runState: 'error', errorMessage: 'oops' })} dispatch={dispatch} />);
    await user.click(screen.getByText('Try again'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'RESET_RUN' });
  });

  it('shows CSV preview and download button when done', () => {
    const state = makeState({ runState: 'done', resultCSV: 'Handle\ntest-handle' });
    render(<Step5Run state={state} dispatch={vi.fn()} />);
    expect(screen.getByText('⬇ Download CSV')).toBeInTheDocument();
  });
});
