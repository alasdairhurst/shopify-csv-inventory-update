import { describe, expect, it, vi } from 'vitest';
import { readZip } from '../../src/files/zip.ts';

const { mockGetEntries } = vi.hoisted(() => ({ mockGetEntries: vi.fn() }));

vi.mock('@zip.js/zip.js', () => ({
	ZipReader: vi.fn(function () {
		return { getEntries: mockGetEntries };
	}),
	BlobReader: vi.fn(function () {}),
	BlobWriter: vi.fn(function () {}),
}));

describe('readZip()', () => {
	it('extracts the CSV entry from a zip file', async () => {
		const csvBlob = new Blob(['Handle,Title\ntest-product,Test Product'], { type: 'text/csv' });
		mockGetEntries.mockResolvedValue([{ filename: 'products.csv', directory: false, getData: vi.fn().mockResolvedValue(csvBlob) }]);

		const result = await readZip(new File([], 'archive.zip'));

		expect(result).toBeInstanceOf(File);
		expect(result.name).toBe('products.csv');
	});

	it('picks the CSV entry when the zip contains other file types', async () => {
		const csvBlob = new Blob(['SKU,Qty\nABC,10'], { type: 'text/csv' });
		mockGetEntries.mockResolvedValue([
			{ filename: 'readme.txt', directory: false, getData: vi.fn().mockResolvedValue(new Blob(['ignore'])) },
			{ filename: 'data.csv', directory: false, getData: vi.fn().mockResolvedValue(csvBlob) },
		]);

		const result = await readZip(new File([], 'archive.zip'));

		expect(result.name).toBe('data.csv');
	});

	it('throws when no CSV file is found in the zip', async () => {
		mockGetEntries.mockResolvedValue([{ filename: 'readme.txt', directory: false, getData: vi.fn() }]);

		await expect(readZip(new File([], 'archive.zip'))).rejects.toThrow('Cannot find .csv in zip file: archive.zip');
	});

	it('throws when the only .csv entry is a directory', async () => {
		mockGetEntries.mockResolvedValue([{ filename: 'data.csv', directory: true, getData: vi.fn() }]);

		await expect(readZip(new File([], 'archive.zip'))).rejects.toThrow('Cannot find .csv in zip file: archive.zip');
	});
});
