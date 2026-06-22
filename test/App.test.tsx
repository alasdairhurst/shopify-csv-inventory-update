import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from '../src/App.tsx';
import updateInventory from '../src/functions/updateInventory.ts';

const { mockDownloadTextFile } = vi.hoisted(() => ({
	mockDownloadTextFile: vi.fn(),
}));

vi.mock('../src/files/download.ts', () => ({
	downloadTextFile: mockDownloadTextFile,
}));

vi.mock('../src/functions/parseProductsCSV.ts', () => ({
	parseProductsCSVs: vi.fn().mockResolvedValue([]),
	parseProductsCSV: vi.fn().mockResolvedValue([]),
}));

vi.mock('../src/functions/updateInventory.ts', () => ({
	default: vi.fn().mockReturnValue([
		{ Handle: 'test', SKU: 'TEST123', 'On hand (new)': '5' },
	]),
}));

describe('App', () => {
	beforeAll(() => {
		process.env.BUILD_TIME = '1700000000000';
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
		vi.unstubAllGlobals();
	});

	const stubFileReader = () => {
		class MockFileReader {
			result = 'csv content';
			onload: ((e: Event) => void) | null = null;
			readAsText(_file: File) {
				Promise.resolve().then(() => this.onload?.(new Event('load')));
			}
		}
		vi.stubGlobal('FileReader', MockFileReader);
	};

	const attachFile = (inputId: string) => {
		const input = document.getElementById(inputId) as HTMLInputElement;
		const file = new File(['csv content'], `${inputId}.csv`, { type: 'text/csv' });
		Object.defineProperty(input, 'files', {
			value: Object.assign([file], { item: () => file }),
			configurable: true,
		});
	};

	it('renders the form with file inputs and action buttons', () => {
		render(<App />);
		expect(screen.getByLabelText(/shopify inventory csv/i)).not.toBeNull();
		expect(screen.getByLabelText(/shopify products csv/i)).not.toBeNull();
		expect(screen.getByRole('button', { name: /download inventory csv/i })).not.toBeNull();
		expect(screen.getByRole('button', { name: /add missing products/i })).not.toBeNull();
		expect(screen.getByRole('button', { name: /edit products/i })).not.toBeNull();
	});

	it('updates the max quantity setting when changed', () => {
		render(<App />);
		const input = screen.getByLabelText(/maximum stock level/i);
		fireEvent.change(input, { target: { value: '20' } });
		expect((input as HTMLInputElement).value).toBe('20');
	});

	it('downloads an inventory CSV when a shopify inventory file is provided', async () => {
		stubFileReader();
		render(<App />);
		attachFile('shopify-inventory');

		fireEvent.click(screen.getByRole('button', { name: /download inventory csv/i }));

		await waitFor(() => {
			expect(mockDownloadTextFile).toHaveBeenCalledWith(
				expect.any(String),
				'completed_inventory_update_for_shopify.csv',
				'text/csv'
			);
		});
	});

	it('shows an info alert when there is nothing to download', async () => {
		vi.mocked(updateInventory).mockReturnValueOnce([]);
		stubFileReader();
		render(<App />);
		attachFile('shopify-inventory');

		fireEvent.click(screen.getByRole('button', { name: /download inventory csv/i }));

		await waitFor(() => {
			expect(screen.queryByText('Info')).not.toBeNull();
			expect(screen.queryByText('Nothing to download')).not.toBeNull();
		});
	});
});
