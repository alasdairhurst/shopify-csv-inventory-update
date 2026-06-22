import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Unicorn, UnicornProduct } from '../../src/vendors/unicorn.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Unicorn', () => {
	const unicorn = new Unicorn();

	const makeProduct = (overrides: Partial<UnicornProduct>): UnicornProduct => ({
		SKU: '52087',
		Description: 'Prism Snooker Cue 2 Piece Split 9.5mm Tip',
		QTY: '5',
		'Unit Of Measure': 'Each',
		'Barcode EAN/UPC': '054722912738',
		'Material Group': 'Darts',
		Brand: 'Unicorn',
		URL: 'https://example.com',
		...overrides,
	});

	it('validates the vendor features', () => {
		expect(unicorn.name).toBe('unicorn');
		expect(unicorn.importLabel).toBe('Unicorn CSV');
		expect(unicorn.useBarcodeForExclusiveMatching).toBe(true);
		expect(unicorn.useTitleForMatching).toBe(true);
		expect(unicorn.canAddProducts()).toBe(false);
		expect(unicorn.canUpdateInventory()).toBe(true);
	});

	it('getTitle returns Description', () => {
		expect(unicorn.getTitle(makeProduct({}))).toBe('Prism Snooker Cue 2 Piece Split 9.5mm Tip');
	});

	it('getQuantity returns numeric QTY', () => {
		expect(unicorn.getQuantity(makeProduct({ QTY: '161' }))).toBe(161);
		expect(unicorn.getQuantity(makeProduct({ QTY: '0' }))).toBe(0);
	});

	describe('getSKU()', () => {
		it('returns the SKU field', () => {
			expect(unicorn.getSKU(makeProduct({}))).toBe('52087');
		});

		it('strips embedded double-quotes', () => {
			expect(unicorn.getSKU(makeProduct({ SKU: '"52087"' }))).toBe('52087');
		});

		it('strips embedded newlines', () => {
			expect(unicorn.getSKU(makeProduct({ SKU: '52087\n' }))).toBe('52087');
		});
	});

	describe('getBarcode()', () => {
		it('returns a valid UPC-12 barcode', () => {
			expect(unicorn.getBarcode(makeProduct({ SKU: 'UNIQUE-UPC', 'Barcode EAN/UPC': '054722912738' }))).toBe('054722912738');
		});

		it('returns "does not apply" for a non-numeric barcode', () => {
			expect(unicorn.getBarcode(makeProduct({ SKU: 'UNIQUE-INVALID', 'Barcode EAN/UPC': 'N/A' }))).toBe('does not apply');
		});
	});

	describe('parsing example CSV', () => {
		it('accepts Unicorn headers and parses the example file', async () => {
			const csv = loadExampleFixture(['vendors', 'unicorn', 'unicorn.csv']);
			const products = await parseProductsCSV(csv, unicorn);

			expect(products.length).toBeGreaterThan(0);
			const product = products[0]!;

			expect(unicorn.getSKU(product)).toEqual('52087');
			expect(unicorn.getQuantity(product)).toEqual(161);
			expect(unicorn.getBarcode(product)).toEqual('054722912738');
			expect(unicorn.getTitle(product)).toEqual('Prism Snooker Cue 2 Piece Split 9.5mm Tip');
		});
	});
});
