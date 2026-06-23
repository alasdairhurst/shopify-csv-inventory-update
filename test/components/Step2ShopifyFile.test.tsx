import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import Step2ShopifyFile from '../../src/components/wizard/Step2ShopifyFile.tsx';

vi.mock('../../src/files/read.ts', () => ({
  readCSVFileList: vi.fn(),
}));
vi.mock('../../src/functions/parseProductsCSV.ts', () => ({
  parseProductsCSVs: vi.fn(),
}));

import { readCSVFileList } from '../../src/files/read.ts';
import { parseProductsCSVs } from '../../src/functions/parseProductsCSV.ts';
const mockReadCSVFileList = vi.mocked(readCSVFileList);
const mockParseCSVs = vi.mocked(parseProductsCSVs);

const parsedRows = [{ Handle: 'h1', SKU: 'S1' }];

describe('Step2ShopifyFile', () => {
  const defaultProps = {
    action: 'inventory' as const,
    onNext: vi.fn(),
    onBack: vi.fn(),
  };

  beforeEach(() => {
    mockReadCSVFileList.mockResolvedValue(['csv-content']);
    mockParseCSVs.mockResolvedValue(parsedRows as any);
  });

  it('Next button is disabled when no file is selected', () => {
    render(<Step2ShopifyFile {...defaultProps} />);
    expect(screen.getByText('Next →')).toBeDisabled();
  });

  it('shows file name and enables Next after a file is selected', async () => {
    const user = userEvent.setup();
    render(<Step2ShopifyFile {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['a,b\n1,2'], 'shopify.csv', { type: 'text/csv' });
    await user.upload(input, file);
    await waitFor(() => expect(screen.getByText('shopify.csv')).toBeInTheDocument());
    expect(mockParseCSVs).toHaveBeenCalled();
    expect(screen.getByText('Next →')).not.toBeDisabled();
  });

  it('shows all file names when multiple files are selected', async () => {
    const user = userEvent.setup();
    mockReadCSVFileList.mockResolvedValue(['csv1', 'csv2']);
    render(<Step2ShopifyFile {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File(['a,b'], 'file1.csv', { type: 'text/csv' }),
      new File(['c,d'], 'file2.csv', { type: 'text/csv' }),
    ];
    await user.upload(input, files);
    await waitFor(() => expect(screen.getByText('file1.csv')).toBeInTheDocument());
    expect(screen.getByText('file2.csv')).toBeInTheDocument();
  });

  it('calls onNext with parsed products and display label', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Step2ShopifyFile {...defaultProps} onNext={onNext} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['a,b'], 'export.csv', { type: 'text/csv' });
    await user.upload(input, file);
    await waitFor(() => expect(screen.getByText('Next →')).not.toBeDisabled());
    await user.click(screen.getByText('Next →'));
    expect(onNext).toHaveBeenCalledWith(parsedRows, 'export.csv');
  });

  it('uses shopifyInventoryVendor for inventory action', async () => {
    const user = userEvent.setup();
    const { shopifyInventoryVendor } = await import('../../src/vendors/index.ts');
    render(<Step2ShopifyFile {...defaultProps} action="inventory" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['a,b'], 'inv.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockParseCSVs).toHaveBeenCalled());
    expect(mockParseCSVs).toHaveBeenCalledWith(['csv-content'], shopifyInventoryVendor);
  });

  it('uses shopifyVendor for addProducts action', async () => {
    const user = userEvent.setup();
    const { shopifyVendor } = await import('../../src/vendors/index.ts');
    render(<Step2ShopifyFile {...defaultProps} action="addProducts" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['a,b'], 'prod.csv', { type: 'text/csv' }));
    await waitFor(() => expect(mockParseCSVs).toHaveBeenCalled());
    expect(mockParseCSVs).toHaveBeenCalledWith(['csv-content'], shopifyVendor);
  });

  it('shows an error message when parsing throws', async () => {
    const user = userEvent.setup();
    mockParseCSVs.mockRejectedValue(new Error("CSV headers don't look right."));
    render(<Step2ShopifyFile {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['data'], 'data.csv', { type: 'text/csv' }));
    await waitFor(() => expect(screen.getByText("CSV headers don't look right.")).toBeInTheDocument());
    expect(screen.getByText('Next →')).toBeDisabled();
  });
});
