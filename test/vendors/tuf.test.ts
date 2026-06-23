import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Tuf, TufProduct } from '../../src/vendors/tuf.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Tuf', () => {
	const tuf = new Tuf();

	const makeProduct = (overrides: Partial<TufProduct>): TufProduct => ({
		'PARENT CODE': 'TW123-BLACK',
		Name: 'Tuf Wear Test Gloves',
		SIZE: 'Medium',
		CARRIAGE: '4.99',
		SKU: '5063253012345',
		STOCK: '10',
		DESCRIPTION: 'Test description',
		Image1: 'https://example.com/img1.jpg',
		Image2: 'https://example.com/img2.jpg',
		Image3: 'https://example.com/img3.jpg',
		Image4: 'https://example.com/img4.jpg',
		RRP: '59.99',
		Sell: '49.99',
		Trade: '30',
		Discount: 'N',
		...overrides,
	});

	it('validates the vendor features', () => {
		expect(tuf.name).toBe('tuf');
		expect(tuf.importLabel).toBe('Tuf Products CSV');
		expect(tuf.canAddProducts()).toBe(true);
		expect(tuf.canUpdateInventory()).toBe(true);
	});

	it('getSKU returns expected PARENT CODE + SIZE', () => {
		expect(tuf.getSKU(makeProduct({}))).toBe('TW123-BLACKMedium');
	});

	it('getTitle returns Name', () => {
		expect(tuf.getTitle(makeProduct({}))).toBe('Tuf Wear Test Gloves');
	});

	it('getDescription returns DESCRIPTION', () => {
		expect(tuf.getDescription(makeProduct({}))).toBe('Test description');
	});

	it('getVendor returns Tuf Wear', () => {
		expect(tuf.getVendor(makeProduct({}))).toBe('Tuf Wear');
	});

	it('getShipping returns numeric CARRIAGE', () => {
		expect(tuf.getShipping(makeProduct({}))).toBe(4.99);
	});

	it('getVAT returns 1.2', () => {
		expect(tuf.getVAT(makeProduct({}))).toBe(1.2);
	});

	it('getMainImageURL returns Image1', () => {
		expect(tuf.getMainImageURL(makeProduct({}))).toBe('https://example.com/img1.jpg');
	});

	it('getVariantImageURL returns Image1', () => {
		expect(tuf.getVariantImageURL(makeProduct({}))).toBe('https://example.com/img1.jpg');
	});

	it('getVariants returns Size variant from SIZE field', () => {
		expect(tuf.getVariants(makeProduct({}))).toEqual([{ name: 'Size', value: 'Medium' }]);
	});

	it('getVariantCorrelationId returns PARENT CODE', () => {
		expect(tuf.getVariantCorrelationId(makeProduct({}))).toBe('TW123-BLACK');
	});

	it('getRRP rounds the RRP value', () => {
		expect(tuf.getRRP(makeProduct({ RRP: '59.99' }))).toBe(59.99);
		expect(tuf.getRRP(makeProduct({ RRP: '134.99' }))).toBe(134.99);
	});

	describe('getBarcode()', () => {
		it('returns a valid EAN-13 barcode', () => {
			expect(tuf.getBarcode(makeProduct({ SKU: '5063253012345' }))).toBe('5063253012345');
		});

		it('returns "does not apply" for a non-numeric barcode (SKU)', () => {
			expect(tuf.getBarcode(makeProduct({ 'PARENT CODE': 'TW123-BLACK-INVALID', SKU: 'INVALID' }))).toBe('does not apply');
		});
	});

	describe('getQuantity()', () => {
		it('returns the numeric stock value', () => {
			expect(tuf.getQuantity(makeProduct({ STOCK: '10' }))).toBe(10);
			expect(tuf.getQuantity(makeProduct({ STOCK: '0' }))).toBe(0);
		});

		it('returns 5 when stock is "5+"', () => {
			expect(tuf.getQuantity(makeProduct({ STOCK: '5+' }))).toBe(5);
		});
	});

	describe('getDiscount()', () => {
		it('returns 0.85 when Discount is Y', () => {
			expect(tuf.getDiscount(makeProduct({ Discount: 'Y' }))).toBe(0.85);
		});

		it('returns 1 when Discount is N', () => {
			expect(tuf.getDiscount(makeProduct({ Discount: 'N' }))).toBe(1);
		});
	});

	describe('getPrice()', () => {
		it('calculates price with no discount: (Trade * 1) * 1.45 * 1.2 + shipping', () => {
			// (49.4 * 1) * 1.45 * 1.2 + 4.99 = 85.956 + 4.99 = 90.946 → roundPrice → 90.99
			expect(tuf.getPrice(makeProduct({ Trade: '49.4', CARRIAGE: '4.99', Discount: 'N' }))).toBe(90.99);
		});

		it('applies a 15% discount to Trade before markup', () => {
			// (49.4 * 0.85) * 1.45 * 1.2 + 4.99 = 73.0626 + 4.99 = 78.0526 → roundPrice → 78.99
			expect(tuf.getPrice(makeProduct({ Trade: '49.4', CARRIAGE: '4.99', Discount: 'Y' }))).toBe(78.99);
		});
	});

	describe('getAdditionalImages()', () => {
		it('returns Image2, Image3, and Image4 when all are set', () => {
			expect(tuf.getAdditionalImages(makeProduct({}))).toEqual([
				'https://example.com/img2.jpg',
				'https://example.com/img3.jpg',
				'https://example.com/img4.jpg',
			]);
		});

		it('skips empty image slots', () => {
			expect(tuf.getAdditionalImages(makeProduct({ Image2: '', Image3: '', Image4: '' }))).toEqual([]);
		});

		it('includes only non-empty slots', () => {
			expect(tuf.getAdditionalImages(makeProduct({ Image2: 'https://example.com/img2.jpg', Image3: '', Image4: '' }))).toEqual([
				'https://example.com/img2.jpg',
			]);
		});
	});

	describe('shouldNotIgnore()', () => {
		it('returns false when LONGCODE is one of the skipped values', () => {
			expect(tuf.shouldNotIgnore(makeProduct({ 'PARENT CODE': 'TW38031-Black_Gold' }))).toBe(false);
			expect(tuf.shouldNotIgnore(makeProduct({ 'PARENT CODE': 'TW38031-LightGreen_Black_White' }))).toBe(false);
		});

			it('returns true when STATUS is LIVE', () => {
			expect(tuf.shouldNotIgnore(makeProduct({ 'PARENT CODE': 'BANANAS' }))).toBe(true);
		});
	});

	describe('parsing example product CSV', () => {
		it('accepts Tuf product headers and parses the example file', async () => {
			const csv = loadExampleFixture(['vendors', 'tuf', 'product.csv']);
			const products = await parseProductsCSV(csv, tuf);

			expect(products.length).toBeGreaterThan(0);
			const product = products[0]!;

			expect(tuf.getSKU(product)).toEqual('TW26650-BLUE/WHITEOne Size');
			expect(tuf.getTitle(product)).toEqual('Tuf Wear Balboa Floor to Ceiling Top to Bottom Ball');
			expect(tuf.getVendor(product)).toEqual('Tuf Wear');
			expect(tuf.getQuantity(product)).toEqual(0);
			expect(tuf.getRRP(product)).toEqual(59.99);
			expect(tuf.getShipping(product)).toEqual(4.99);
			expect(tuf.getBarcode(product)).toEqual('5063253032766');
			expect(tuf.getPrice(product)).toEqual(49.99);
			expect(tuf.getMainImageURL(product)).toEqual('https://admin.tufweardirect.com/shopimages/products/extras/TW26650-BLUEWHITE-F1.jpg');
			expect(tuf.getVariantImageURL(product)).toEqual('https://admin.tufweardirect.com/shopimages/products/extras/TW26650-BLUEWHITE-F1.jpg');
			expect(tuf.getAdditionalImages(product)).toEqual([
				'https://admin.tufweardirect.com/shopimages/products/extras/TW26650-BLUEWHITE-F2.jpg',
				'https://admin.tufweardirect.com/shopimages/products/extras/TW26650-BLUEWHITE-F3.jpg',
				'https://admin.tufweardirect.com/shopimages/products/extras/TW26650-BLUEWHITE-F4.jpg',
			]);
			expect(tuf.getVariants(product)).toEqual([{ name: 'Size', value: 'One Size' }]);
			expect(tuf.getVariantCorrelationId(product)).toEqual('TW26650-BLUE/WHITE');
		});
	});
});
