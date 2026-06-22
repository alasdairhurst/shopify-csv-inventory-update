import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { TufInventory, TufInventoryProduct } from '../../src/vendors/tuf.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor TufInventory', () => {
	const tufInventory = new TufInventory();

	const makeProduct = (overrides: Partial<TufInventoryProduct>): TufInventoryProduct => ({
		LONGCODE: 'TW123-BLACKMedium',
		'PARENT CODE': 'TW123-BLACK',
		Name: 'Tuf Wear Test Gloves',
		SIZE: 'Medium',
		SKU: '5063253012345',
		STOCK: '10',
		DESCRIPTION: 'Test description',
		Image1: 'https://example.com/img1.jpg',
		Image2: '',
		Image3: '',
		Image4: '',
		RRP: '59.99',
		Sell: '49.99',
		Trade: '30',
		Discount: 'N',
		...overrides,
	});

	it('validates the vendor features', () => {
		expect(tufInventory.name).toBe('tuf-inventory');
		expect(tufInventory.importLabel).toBe('Tuf Inventory CSV');
		expect(tufInventory.canAddProducts()).toBe(false);
		expect(tufInventory.canUpdateInventory()).toBe(true);
	});

	it('getSKU returns LONGCODE', () => {
		expect(tufInventory.getSKU(makeProduct({}))).toBe('TW123-BLACKMedium');
	});

	it('getTitle returns Name', () => {
		expect(tufInventory.getTitle(makeProduct({}))).toBe('Tuf Wear Test Gloves');
	});

	describe('getQuantity()', () => {
		it('returns the numeric stock value', () => {
			expect(tufInventory.getQuantity(makeProduct({ STOCK: '3' }))).toBe(3);
			expect(tufInventory.getQuantity(makeProduct({ STOCK: '0' }))).toBe(0);
		});

		it('returns 5 when stock is "5+"', () => {
			expect(tufInventory.getQuantity(makeProduct({ STOCK: '5+' }))).toBe(5);
		});
	});

	describe('parsing example inventory CSV', () => {
		it('accepts Tuf inventory headers and parses the example file', async () => {
			const csv = loadExampleFixture(['vendors', 'tuf', 'inventory.csv']);
			const products = await parseProductsCSV(csv, tufInventory);

			expect(products.length).toBeGreaterThan(0);
			const product = products[0]!;

			expect(tufInventory.getSKU(product)).toEqual('TW28513-WHITE/METALLIC PINK8oz');
			expect(tufInventory.getTitle(product)).toEqual('Tuf Wear Falcon Contest Glove BBBofC Approved');
			expect(tufInventory.getQuantity(product)).toBe(0);
		});
	});
});
