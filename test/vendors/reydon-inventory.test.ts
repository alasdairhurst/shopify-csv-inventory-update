import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { ReydonInventory, ReydonInventoryProduct } from '../../src/vendors/reydon.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Reydon Inventory', () => {
	const reydonInventory = new ReydonInventory();

	const makeProduct = (overrides: Partial<ReydonInventoryProduct>): ReydonInventoryProduct => ({
		'Product Name': 'Franklin Outdoor X-40 Pickleball (Yellow)',
		Code: 'TEST-123',
		Quantity: '5',
		...overrides,
	});

	it('validates the vendor features', () => {
		expect(reydonInventory.name).toBe('reydon-inventory');
		expect(reydonInventory.importLabel).toBe('Reydon Inventory CSV');
		expect(reydonInventory.useBarcodeForExclusiveMatching).toBe(undefined);
		expect(reydonInventory.useTitleForMatching).toBe(true);
		expect(reydonInventory.canAddProducts()).toBe(false);
		expect(reydonInventory.canUpdateInventory()).toBe(true);
	});

	it('getQuantity returns numeric Quantity', () => {
		expect(reydonInventory.getQuantity(makeProduct({ Quantity: '10' }))).toBe(10);
		expect(reydonInventory.getQuantity(makeProduct({ Quantity: '0' }))).toBe(0);
	});

	describe('getSKU()', () => {
		it('returns the Code field', () => {
			expect(reydonInventory.getSKU(makeProduct({}))).toBe('TEST-123');
		});

		it('strips trailing newlines from Code', () => {
			expect(reydonInventory.getSKU(makeProduct({ Code: 'TEST-123\n' }))).toBe('TEST-123');
		});
	});

	describe('getTitle()', () => {
		it('strips a parenthesised suffix and its preceding space', () => {
			expect(reydonInventory.getTitle(makeProduct({ 'Product Name': 'Franklin Pickleball (Yellow)' }))).toBe('Franklin Pickleball');
		});

		it('strips multiple parenthesised groups', () => {
			expect(reydonInventory.getTitle(makeProduct({ 'Product Name': 'Product (Size M) (Blue)' }))).toBe('Product');
		});

		it('leaves the title unchanged when there are no parentheses', () => {
			expect(reydonInventory.getTitle(makeProduct({ 'Product Name': 'Franklin Outdoor X-40 Pickleball' }))).toBe('Franklin Outdoor X-40 Pickleball');
		});
	});

	describe('parsing example inventory CSV', () => {
		it('accepts Reydon inventory headers and parses the example file', async () => {
			const csv = loadExampleFixture(['vendors', 'reydon', 'inventory.csv']);
			const products = await parseProductsCSV(csv, reydonInventory);

			expect(products.length).toBeGreaterThan(0);
			const product = products[0]!;

			expect(reydonInventory.getSKU(product)).toEqual('52824');
			expect(reydonInventory.getQuantity(product)).toEqual(0);
			expect(reydonInventory.getTitle(product)).toEqual('Franklin Outdoor X-40 Pickleball');
		});
	});
});
