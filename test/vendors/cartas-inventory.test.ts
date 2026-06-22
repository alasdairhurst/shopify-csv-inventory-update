import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { CartasInventory, CartasInventoryProduct } from '../../src/vendors/cartas.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Cartas Inventory', () => {
	const cartasInventory = new CartasInventory();

	const makeProduct = (overrides: Partial<CartasInventoryProduct>): CartasInventoryProduct => ({
		PRODUCT_ID: '1',
		PARENT_CODE: 'PARENT-001',
		PRODUCT_NAME: 'Test Product',
		OPTION_NAME: 'Size',
		SIZE: 'Small',
		CHILD_CODE: 'TEST-001',
		QUANTITY: '5',
		LIST_PRICE: '28.99',
		...overrides,
	});

	it('validates the vendor features', () => {
		expect(cartasInventory.name).toBe('cartas-inventory');
		expect(cartasInventory.importLabel).toBe('Cartas Inventory CSV');
		expect(cartasInventory.useBarcodeForExclusiveMatching).toBe(undefined);
		expect(cartasInventory.useTitleForMatching).toBe(true);
		expect(cartasInventory.canAddProducts()).toBe(false);
		expect(cartasInventory.canUpdateInventory()).toBe(true);
	});

	it('getSKU returns CHILD_CODE', () => {
		expect(cartasInventory.getSKU(makeProduct({}))).toBe('TEST-001');
	});

	it('getTitle returns PRODUCT_NAME', () => {
		expect(cartasInventory.getTitle(makeProduct({}))).toBe('Test Product');
	});

	describe('getQuantity()', () => {
		it('returns the numeric quantity', () => {
			expect(cartasInventory.getQuantity(makeProduct({ QUANTITY: '5' }))).toBe(5);
			expect(cartasInventory.getQuantity(makeProduct({ QUANTITY: '0' }))).toBe(0);
		});

		it('caps quantity at 50', () => {
			expect(cartasInventory.getQuantity(makeProduct({ QUANTITY: '100' }))).toBe(50);
		});
	});

	describe('parsing example inventory CSV', () => {
		it('accepts Cartas inventory headers and parses the example file', async () => {
			const csv = loadExampleFixture(['vendors', 'cartas', 'inventory.csv']);
			const products = await parseProductsCSV(csv, cartasInventory);

			expect(products.length).toBeGreaterThan(0);
			const product = products[0]!;

			expect(cartasInventory.getSKU(product)).toEqual('1FTB');
			expect(cartasInventory.getTitle(product)).toEqual('FLOOR TAPE 1 1/2\'\' BLACK');
			expect(cartasInventory.getQuantity(product)).toEqual(1);
		});
	});
});
