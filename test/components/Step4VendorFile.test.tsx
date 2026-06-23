import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import Step4VendorFile from '../../src/components/wizard/Step4VendorFile.tsx';
import type { Brand } from '../../src/vendors/brand.ts';

vi.mock('../../src/files/read.ts', () => ({
  readCSVFileList: vi.fn(),
  fetchCSVFromURL: vi.fn(),
}));
vi.mock('../../src/functions/parseProductsCSV.ts', () => ({
  parseProductsCSVs: vi.fn(),
}));

import { readCSVFileList, fetchCSVFromURL } from '../../src/files/read.ts';
import { parseProductsCSVs } from '../../src/functions/parseProductsCSV.ts';
const mockReadCSVFileList = vi.mocked(readCSVFileList);
const mockFetchCSVFromURL = vi.mocked(fetchCSVFromURL);
const mockParseCSVs = vi.mocked(parseProductsCSVs);

const parsedRows = [{ Code: 'V1', Stock: '5' }];

const makeVendor = (overrides: Partial<{ expectedHeaders: string[]; urlConfig: any }> = {}) => ({
  name: 'TestVendor',
  importLabel: 'Test label',
  expectedHeaders: ['Code', 'Name', 'Price', 'Stock', 'EAN', 'Weight', 'Extra1', 'Extra2'],
  getSKU: () => '',
  urlConfig: { supportsFile: true, supportsURL: true },
  ...overrides,
});

const makeBrand = (vendorOverrides = {}): Brand => ({
  id: 'test-brand',
  name: 'Test Brand',
  icon: '🧪',
  fileInfo: {
    inventory: { label: 'Vendor inventory feed', description: 'Upload the vendor inventory file.' },
  },
  vendorFor: {
    inventory: () => makeVendor(vendorOverrides) as any,
  },
});

describe('Step4VendorFile', () => {
  beforeEach(() => {
    mockReadCSVFileList.mockResolvedValue(['vendor-csv']);
    mockFetchCSVFromURL.mockResolvedValue('fetched-csv');
    mockParseCSVs.mockResolvedValue(parsedRows as any);
    localStorage.clear();
  });

  it('Next button is disabled when no file is selected', () => {
    render(<Step4VendorFile action="inventory" brand={makeBrand()} onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Next →')).toBeDisabled();
  });

  it('reads and parses file, enables Next after upload', async () => {
    const user = userEvent.setup();
    render(<Step4VendorFile action="inventory" brand={makeBrand()} onNext={vi.fn()} onBack={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['a,b'], 'vendor.csv', { type: 'text/csv' });
    await user.upload(input, file);
    await waitFor(() => expect(screen.getByText('vendor.csv')).toBeInTheDocument());
    expect(mockParseCSVs).toHaveBeenCalled();
    expect(screen.getByText('Next →')).not.toBeDisabled();
  });

  it('calls onNext with parsed products on Next click', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Step4VendorFile action="inventory" brand={makeBrand()} onNext={onNext} onBack={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['a,b'], 'vendor.csv', { type: 'text/csv' }));
    await waitFor(() => expect(screen.getByText('Next →')).not.toBeDisabled());
    await user.click(screen.getByText('Next →'));
    expect(onNext).toHaveBeenCalledWith(parsedRows, 'vendor.csv');
  });

  it.skip('fetches, parses from URL and enables Next', async () => {
    const user = userEvent.setup();
    render(<Step4VendorFile action="inventory" brand={makeBrand()} onNext={vi.fn()} onBack={vi.fn()} />);
    await user.click(screen.getByText('URL'));
    const urlInput = screen.getByPlaceholderText(/https:\/\//);
    await user.type(urlInput, 'https://example.com/feed.csv');
    await user.click(screen.getByText('Fetch'));
    await waitFor(() => expect(mockFetchCSVFromURL).toHaveBeenCalledWith('https://example.com/feed.csv'));
    await waitFor(() => expect(mockParseCSVs).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Next →')).not.toBeDisabled());
  });

  it.skip('persists URL to localStorage on successful fetch', async () => {
    const user = userEvent.setup();
    render(<Step4VendorFile action="inventory" brand={makeBrand()} onNext={vi.fn()} onBack={vi.fn()} />);
    await user.click(screen.getByText('URL'));
    const urlInput = screen.getByPlaceholderText(/https:\/\//);
    await user.type(urlInput, 'https://example.com/feed.csv');
    await user.click(screen.getByText('Fetch'));
    await waitFor(() => expect(mockParseCSVs).toHaveBeenCalled());
    expect(localStorage.getItem('lastUrl:test-brand')).toBe('https://example.com/feed.csv');
  });

  it('shows inline error on parse failure', async () => {
    const user = userEvent.setup();
    mockParseCSVs.mockRejectedValue(new Error("CSV headers don't look right."));
    render(<Step4VendorFile action="inventory" brand={makeBrand()} onNext={vi.fn()} onBack={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File(['a,b'], 'bad.csv', { type: 'text/csv' }));
    await waitFor(() => expect(screen.getByText("CSV headers don't look right.")).toBeInTheDocument());
    expect(screen.getByText('Next →')).toBeDisabled();
  });

  it('shows expected header chips (up to 6)', () => {
    render(<Step4VendorFile action="inventory" brand={makeBrand()} onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('hides URL tab when supportsURL is false', () => {
    const brand = makeBrand({ urlConfig: { supportsFile: true, supportsURL: false } });
    render(<Step4VendorFile action="inventory" brand={brand} onNext={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryByText('URL')).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument();
  });
});
