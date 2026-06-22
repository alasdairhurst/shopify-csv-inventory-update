import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Cartas, CartasProduct } from '../../src/vendors/cartas.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Cartas', () => {
	const cartas = new Cartas();

	const makeProduct = (overrides: Partial<CartasProduct>): CartasProduct => ({
		STATUS: 'LIVE',
		CODE: 'TEST-001',
		WEIGHT: '100',
		STOCK: '5',
		CATEGORY: 'CLOTHING',
		BRAND: 'Mizuno',
		EAN: '5054698692271',
		VAT: '20%',
		TRADE_PRICE: '10.00',
		DESCRIPTION: 'Test description',
		MAIN_IMAGE: 'https://example.com/img.jpg',
		PRODUCT_NAME: 'Test Product',
		IMAGE_1: '',
		IMAGE_2: '',
		IMAGE_3: '',
		IMAGE_4: '',
		SIZE: 'Small',
		COLOUR: 'Black',
		PERANT_ID: 'PARENT-001',
		LENGTH: '0',
		WIDTH: '0',
		HEIGHT: '0',
		...overrides,
	});

	it('validates the vendor features', () => {
		expect(cartas.name).toBe('cartas');
		expect(cartas.importLabel).toBe('Cartas Products CSV');
		expect(cartas.useBarcodeForExclusiveMatching).toBe(undefined);
		expect(cartas.useTitleForMatching).toBe(true);
		expect(cartas.canAddProducts()).toBe(true);
		expect(cartas.canUpdateInventory()).toBe(true);
	});

	it('getTitle returns PRODUCT_NAME', () => {
		expect(cartas.getTitle(makeProduct({}))).toBe('Test Product');
	});

	it('getVendor returns BRAND', () => {
		expect(cartas.getVendor(makeProduct({}))).toBe('Mizuno');
	});

	it('getMainImageURL returns MAIN_IMAGE', () => {
		expect(cartas.getMainImageURL(makeProduct({}))).toBe('https://example.com/img.jpg');
	});

	it('getVariantImageURL returns MAIN_IMAGE', () => {
		expect(cartas.getVariantImageURL(makeProduct({}))).toBe('https://example.com/img.jpg');
	});

	it('getWeightGrams returns numeric WEIGHT', () => {
		expect(cartas.getWeightGrams(makeProduct({ WEIGHT: '250' }))).toBe(250);
	});

	it('getShipping returns 5', () => {
		expect(cartas.getShipping(makeProduct({}))).toBe(5);
	});

	it('getVariantCorrelationId returns PERANT_ID', () => {
		expect(cartas.getVariantCorrelationId(makeProduct({}))).toBe('PARENT-001');
	});

	describe('getSKU()', () => {
		it('returns CODE when STATUS is LIVE', () => {
			expect(cartas.getSKU(makeProduct({ STATUS: 'LIVE', CODE: 'MIZU00001' }))).toBe('MIZU00001');
		});

		it('returns undefined when STATUS is not LIVE', () => {
			expect(cartas.getSKU(makeProduct({ STATUS: 'DELETED' }))).toBeUndefined();
		});
	});

	describe('getQuantity()', () => {
		it('returns numeric STOCK', () => {
			expect(cartas.getQuantity(makeProduct({ STOCK: '4' }))).toBe(4);
			expect(cartas.getQuantity(makeProduct({ STOCK: '0' }))).toBe(0);
		});

		it('caps quantity at 50', () => {
			expect(cartas.getQuantity(makeProduct({ STOCK: '100' }))).toBe(50);
		});
	});

	describe('getVAT()', () => {
		it('parses a percentage string into a multiplier', () => {
			expect(cartas.getVAT(makeProduct({ VAT: '20%' }))).toBe(1.2);
			expect(cartas.getVAT(makeProduct({ VAT: '0%' }))).toBe(1);
		});
	});

	describe('getTaxable()', () => {
		it('returns true when VAT is above 0%', () => {
			expect(cartas.getTaxable(makeProduct({ VAT: '20%' }))).toBe(true);
		});

		it('returns false when VAT is 0%', () => {
			expect(cartas.getTaxable(makeProduct({ VAT: '0%' }))).toBe(false);
		});
	});

	describe('getBarcode()', () => {
		it('returns a valid EAN-13 barcode', () => {
			expect(cartas.getBarcode(makeProduct({ CODE: 'UNIQUE-EAN', EAN: '5054698692271' }))).toBe('5054698692271');
		});

		it('returns "does not apply" for a non-numeric EAN', () => {
			expect(cartas.getBarcode(makeProduct({ CODE: 'UNIQUE-INVALID', EAN: 'N/A' }))).toBe('does not apply');
		});
	});

	describe('getDescription()', () => {
		it('returns DESCRIPTION as-is', () => {
			expect(cartas.getDescription(makeProduct({ DESCRIPTION: 'Test description' }))).toBe('Test description');
		});

		it('strips a leading single-quote', () => {
			expect(cartas.getDescription(makeProduct({ DESCRIPTION: "'Test description'" }))).toBe('Test description');
		});
	});

	describe('getPrice()', () => {
		it('calculates price as (TRADE_PRICE * 1.45 * VAT * 0.9) + shipping', () => {
			// base = 10 * 1.45 * 1.2 = 17.4; price = roundPrice(17.4 * 0.9 + 5) = roundPrice(20.66) → 20.99
			expect(cartas.getPrice(makeProduct({ TRADE_PRICE: '10.00', VAT: '20%' }))).toBe(20.99);
		});
	});

	describe('getRRP()', () => {
		it('calculates RRP as (TRADE_PRICE * 1.45 * VAT + shipping) * 1.2', () => {
			// base = 17.4; RRP = roundPrice((17.4 + 5) * 1.2) = roundPrice(26.88) → 26.99
			expect(cartas.getRRP(makeProduct({ TRADE_PRICE: '10.00', VAT: '20%' }))).toBe(26.99);
		});
	});

	describe('getAdditionalImages()', () => {
		it('returns an empty array when no additional images are set', () => {
			expect(cartas.getAdditionalImages(makeProduct({}))).toEqual([]);
		});

		it('returns only non-empty image slots', () => {
			expect(cartas.getAdditionalImages(makeProduct({ IMAGE_1: 'https://example.com/1.jpg', IMAGE_2: '', IMAGE_3: 'https://example.com/3.jpg', IMAGE_4: '' }))).toEqual([
				'https://example.com/1.jpg',
				'https://example.com/3.jpg',
			]);
		});
	});

	describe('getVariants()', () => {
		it('returns Colour and Size variants when both are set', () => {
			expect(cartas.getVariants(makeProduct({ COLOUR: 'Black', SIZE: 'Small' }))).toEqual([
				{ name: 'Colour', value: 'Black' },
				{ name: 'Size', value: 'Small' },
			]);
		});

		it('returns only Colour when Size is empty', () => {
			expect(cartas.getVariants(makeProduct({ COLOUR: 'Black', SIZE: '' }))).toEqual([{ name: 'Colour', value: 'Black' }]);
		});

		it('returns only Size when Colour is empty', () => {
			expect(cartas.getVariants(makeProduct({ COLOUR: '', SIZE: 'Small' }))).toEqual([{ name: 'Size', value: 'Small' }]);
		});
	});

	describe('parsing example product CSV', () => {
		it('accepts Cartas headers and parses the example file', async () => {
			const csv = loadExampleFixture(['vendors', 'cartas', 'product.csv']);
			const products = await parseProductsCSV(csv, cartas);

			expect(products.length).toBeGreaterThan(0);
			const product = products[0]!;

			expect(cartas.getTitle(product)).toEqual('Mizuno Core Short Sleeve T Shirt');
			expect(cartas.getDescription(product)).toEqual(`The Mizuno Core Shirt has everything you need to perform!
Features and benefits
Designed for all sports
Extreme soft fabric for even more comfort
Active fit and athletic silhouette
Sharp lines for the best air displacement
Made of 100% polyester`);
			expect(cartas.getVendor(product)).toEqual('Mizuno');
			expect(cartas.getSKU(product)).toEqual('MIZU00001');
			expect(cartas.getMainImageURL(product)).toEqual('https://cartasport.net/main_images/MIZU00001.jpg');
			expect(cartas.getVariantImageURL(product)).toEqual('https://cartasport.net/main_images/MIZU00001.jpg');
			expect(cartas.getQuantity(product)).toEqual(4);
			expect(cartas.getType(product)).toEqual('CLOTHING');
			expect(cartas.getVAT(product)).toEqual(1.2);
			expect(cartas.getTaxable(product)).toEqual(true);
			expect(cartas.getRRP(product)).toEqual(28.99);
			expect(cartas.getShipping(product)).toEqual(5);
			expect(cartas.getPrice(product)).toEqual(22.99);
			expect(cartas.getWeightGrams(product)).toEqual(0);
			expect(cartas.getAdditionalImages(product)).toEqual([]);
			expect(cartas.getVariants(product)).toEqual([
				{ name: 'Colour', value: 'Black' },
				{ name: 'Size', value: 'Small' },
			]);
			expect(cartas.getBarcode(product)).toEqual('5054698692271');
			expect(cartas.getVariantCorrelationId(product)).toEqual('10032007');
		});
	});
});
