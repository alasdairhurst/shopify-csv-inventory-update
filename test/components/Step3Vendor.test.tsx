import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import Step3Vendor from '../../src/components/wizard/Step3Vendor.tsx';
import type { Brand } from '../../src/vendors/brand.ts';

vi.mock('../../src/vendors/brands.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/vendors/brands.ts')>();
  return {
    ...actual,
    brandsForAction: (action: string) => mockBrands.filter(b => b.vendorFor[action as keyof typeof b.vendorFor]),
  };
});

const mockVendor = { name: 'test', importLabel: '', expectedHeaders: [], getSKU: () => '', urlConfig: { supportsFile: true, supportsURL: true } };

const mockBrands: Brand[] = [
  {
    id: 'alpha',
    name: 'Alpha Co',
    icon: '🅰️',
    fileInfo: { inventory: { label: 'Alpha file', description: 'Alpha desc' } },
    vendorFor: { inventory: () => mockVendor as any },
  },
  {
    id: 'beta',
    name: 'Beta Inc',
    icon: { url: 'https://example.com/logo.png', size: 'large' },
    fileInfo: { addProducts: { label: 'Beta file', description: 'Beta desc' } },
    vendorFor: { addProducts: () => mockVendor as any },
  },
  {
    id: 'gamma',
    name: 'Gamma Ltd',
    icon: '🔷',
    fileInfo: {
      inventory: { label: 'Gamma file', description: 'Gamma desc' },
      addProducts: { label: 'Gamma file', description: 'Gamma desc' },
    },
    vendorFor: {
      inventory: () => mockVendor as any,
      addProducts: () => mockVendor as any,
    },
  },
];

describe('Step3Vendor', () => {
  it('shows only brands applicable to the selected action (inventory)', () => {
    render(<Step3Vendor action="inventory" onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Alpha Co')).toBeInTheDocument();
    expect(screen.queryByText('Beta Inc')).not.toBeInTheDocument();
    expect(screen.getByText('Gamma Ltd')).toBeInTheDocument();
  });

  it('shows only brands applicable to addProducts action', () => {
    render(<Step3Vendor action="addProducts" onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByText('Alpha Co')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Inc')).toBeInTheDocument();
    expect(screen.getByText('Gamma Ltd')).toBeInTheDocument();
  });

  it('Continue is disabled until at least one vendor is selected', async () => {
    const user = userEvent.setup();
    render(<Step3Vendor action="inventory" onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Continue →')).toBeDisabled();
    await user.click(screen.getByText('Alpha Co'));
    expect(screen.getByText('Continue →')).not.toBeDisabled();
  });

  it('calls onContinue with the selected brand', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<Step3Vendor action="inventory" onContinue={onContinue} onBack={vi.fn()} />);
    await user.click(screen.getByText('Alpha Co'));
    await user.click(screen.getByText('Continue →'));
    expect(onContinue).toHaveBeenCalledWith([mockBrands[0]]);
  });

  it('selects multiple vendors and passes them in selection order', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<Step3Vendor action="inventory" onContinue={onContinue} onBack={vi.fn()} />);
    await user.click(screen.getByText('Gamma Ltd'));
    await user.click(screen.getByText('Alpha Co'));
    await user.click(screen.getByText('Continue (2) →'));
    expect(onContinue).toHaveBeenCalledWith([mockBrands[2], mockBrands[0]]);
  });

  it('toggles a vendor off when clicked twice', async () => {
    const user = userEvent.setup();
    render(<Step3Vendor action="inventory" onContinue={vi.fn()} onBack={vi.fn()} />);
    await user.click(screen.getByText('Alpha Co'));
    expect(screen.getByText('Continue →')).not.toBeDisabled();
    await user.click(screen.getByText('Alpha Co'));
    expect(screen.getByText('Continue →')).toBeDisabled();
  });

  it('pre-selects vendors passed via initialSelected', () => {
    render(<Step3Vendor action="inventory" initialSelected={[mockBrands[0]!]} onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Continue →')).not.toBeDisabled();
  });

  it('renders large-icon layout for brands with size=large icon', () => {
    render(<Step3Vendor action="addProducts" onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByAltText('Beta Inc')).toBeInTheDocument();
  });

  it('renders emoji icon for brands with string icon', () => {
    render(<Step3Vendor action="inventory" onContinue={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('🅰️')).toBeInTheDocument();
  });
});
