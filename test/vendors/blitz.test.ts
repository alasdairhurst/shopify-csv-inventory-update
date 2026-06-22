import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Blitz, BlitzProduct } from '../../src/vendors/blitz.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Blitz', () => {
	const blitz = new Blitz();

	const makeProduct = (overrides: Partial<BlitzProduct>): BlitzProduct => ({
		Title: 'Test Product',
		Link: 'https://example.com/link',
		LinkComponent: 'test-product',
		Description: 'Test description',
		Sku: 'TEST-123',
		ParentSku: 'TEST-PARENT',
		Ean: '5055915138374',
		CatCode: '',
		Type: 'Standard',
		Taxable: 'True',
		Brand: 'Blitz',
		Category: 'Clothing > Footwear',
		ImageUrl: 'https://example.com/img.jpg',
		InStock: 'True',
		Weight: '1',
		RetailPrice: '50.00',
		TradePrice: '25.00',
		Feature1: 'Feature one',
		Feature2: '',
		Feature3: '',
		Feature4: '',
		Feature5: '',
		DueDate: '',
		Size: 'M',
		Colour: 'Black',
		Design: '',
		AltImage1: 'https://example.com/alt1.jpg',
		AltImage2: 'https://example.com/alt2.jpg',
		AltImage3: '',
		AltImage4: '',
		AltImage5: '',
		AltImage6: '',
		AltImage7: '',
		AltImage8: '',
		AltImage9: '',
		AltImage10: '',
		AltImage11: '',
		AltImage12: '',
		...overrides,
	});

	it('validates the vendor features', () => {
		expect(blitz.name).toBe('blitz');
		expect(blitz.importLabel).toBe('Blitz CSV');
		expect(blitz.useBarcodeForExclusiveMatching).toBe(true);
		expect(blitz.useTitleForMatching).toBe(true);
		expect(blitz.canAddProducts()).toBe(true);
		expect(blitz.canUpdateInventory()).toBe(true);
	});

	it('getSKU returns Sku', () => {
		expect(blitz.getSKU(makeProduct({}))).toBe('TEST-123');
	});

	it('getTitle returns Title', () => {
		expect(blitz.getTitle(makeProduct({}))).toBe('Test Product');
	});

	it('getVendor returns Brand', () => {
		expect(blitz.getVendor(makeProduct({}))).toBe('Blitz');
	});

	it('getDescription returns Description', () => {
		expect(blitz.getDescription(makeProduct({}))).toBe('Test description');
	});

	it('getType returns Category', () => {
		expect(blitz.getType(makeProduct({}))).toBe('Clothing > Footwear');
	});

	it('getMainImageURL returns ImageUrl', () => {
		expect(blitz.getMainImageURL(makeProduct({}))).toBe('https://example.com/img.jpg');
	});

	it('getVariantImageURL returns ImageUrl', () => {
		expect(blitz.getVariantImageURL(makeProduct({}))).toBe('https://example.com/img.jpg');
	});

	it('getVariantCorrelationId returns ParentSku', () => {
		expect(blitz.getVariantCorrelationId(makeProduct({}))).toBe('TEST-PARENT');
	});

	it('getWeightGrams converts Weight to grams', () => {
		expect(blitz.getWeightGrams(makeProduct({ Weight: '1.48' }))).toBe(1480);
	});

	describe('getQuantity()', () => {
		it('returns 25 when InStock is True', () => {
			expect(blitz.getQuantity(makeProduct({ InStock: 'True' }))).toBe(25);
		});

		it('returns 0 when InStock is False', () => {
			expect(blitz.getQuantity(makeProduct({ InStock: 'False' }))).toBe(0);
		});
	});

	describe('getVAT()', () => {
		it('returns 1.2 when Taxable is True', () => {
			expect(blitz.getVAT(makeProduct({ Taxable: 'True' }))).toBe(1.2);
		});

		it('returns 1 when Taxable is False', () => {
			expect(blitz.getVAT(makeProduct({ Taxable: 'False' }))).toBe(1);
		});
	});

	describe('getTaxable()', () => {
		it('returns true when Taxable is True', () => {
			expect(blitz.getTaxable(makeProduct({ Taxable: 'True' }))).toBe(true);
		});

		it('returns false when Taxable is False', () => {
			expect(blitz.getTaxable(makeProduct({ Taxable: 'False' }))).toBe(false);
		});
	});

	describe('getBarcode()', () => {
		it('returns a valid EAN-13 barcode', () => {
			expect(blitz.getBarcode(makeProduct({ Sku: 'UNIQUE-EAN', Ean: '5055915138374' }))).toBe('5055915138374');
		});

		it('returns "does not apply" for a non-numeric EAN', () => {
			expect(blitz.getBarcode(makeProduct({ Sku: 'UNIQUE-INVALID', Ean: 'N/A' }))).toBe('does not apply');
		});
	});

	describe('getShipping()', () => {
		it('returns the default small shipping rate', () => {
			expect(blitz.getShipping(makeProduct({}))).toBe(5);
		});

		it('returns a fixed rate for SKUs with special shipping', () => {
			expect(blitz.getShipping(makeProduct({ Sku: '16098' }))).toBe(42);
			expect(blitz.getShipping(makeProduct({ Sku: '16829' }))).toBe(15.84);
		});
	});

	describe('getPrice()', () => {
		it('calculates price as TradePrice * 1.45 * VAT + shipping', () => {
			// 25 * 1.45 * 1.2 + 5 = 48.5 → roundPrice → 48.99
			expect(blitz.getPrice(makeProduct({ TradePrice: '25.00', Taxable: 'True', Sku: 'TEST-123' }))).toBe(48.99);
		});

		it('skips VAT for non-taxable products', () => {
			// 25 * 1.45 * 1 + 5 = 41.25 → roundPrice → 41.99
			expect(blitz.getPrice(makeProduct({ TradePrice: '25.00', Taxable: 'False', Sku: 'TEST-123' }))).toBe(41.99);
		});

		it('uses the fixed shipping rate for special SKUs', () => {
			// 25 * 1.45 * 1.2 + 42 = 85.5 → roundPrice → 85.99
			expect(blitz.getPrice(makeProduct({ TradePrice: '25.00', Taxable: 'True', Sku: '16098' }))).toBe(85.99);
		});
	});

	describe('getRRP()', () => {
		it('rounds the RetailPrice', () => {
			expect(blitz.getRRP(makeProduct({ RetailPrice: '50.00' }))).toBe(49.99);
			expect(blitz.getRRP(makeProduct({ RetailPrice: '39.99' }))).toBe(39.99);
		});
	});

	describe('getFeatures()', () => {
		it('returns non-empty feature slots', () => {
			expect(blitz.getFeatures(makeProduct({ Feature1: 'Feature one', Feature2: 'Feature two', Feature3: '' }))).toEqual(['Feature one', 'Feature two']);
		});

		it('returns an empty array when all features are empty', () => {
			expect(blitz.getFeatures(makeProduct({ Feature1: '', Feature2: '', Feature3: '', Feature4: '', Feature5: '' }))).toEqual([]);
		});
	});

	describe('getAdditionalImages()', () => {
		it('returns non-empty AltImage slots', () => {
			expect(blitz.getAdditionalImages(makeProduct({}))).toEqual([
				'https://example.com/alt1.jpg',
				'https://example.com/alt2.jpg',
			]);
		});

		it('returns an empty array when all alt images are empty', () => {
			expect(blitz.getAdditionalImages(makeProduct({ AltImage1: '', AltImage2: '' }))).toEqual([]);
		});

		it('returns an empty array for a variant product (PARENT_SYMBOL set)', () => {
			const product = makeProduct({});
			(product as any)[Symbol.for('parent')] = makeProduct({});
			expect(blitz.getAdditionalImages(product)).toEqual([]);
		});
	});

	describe('getVariants()', () => {
		it('returns Colour and Size when both are set', () => {
			expect(blitz.getVariants(makeProduct({ Colour: 'Black', Size: 'M', Design: '' }))).toEqual([
				{ name: 'Colour', value: 'Black' },
				{ name: 'Size', value: 'M' },
			]);
		});

		it('returns only Design when Colour and Size are empty', () => {
			expect(blitz.getVariants(makeProduct({ Colour: '', Size: '', Design: 'Floral' }))).toEqual([{ name: 'Design', value: 'Floral' }]);
		});

		it('returns an empty array when no variant fields are set', () => {
			expect(blitz.getVariants(makeProduct({ Colour: '', Size: '', Design: '' }))).toEqual([]);
		});
	});

	describe('parseImport()', () => {
		it('excludes Parent rows from the output', () => {
			const parent = makeProduct({ Sku: 'P1', Type: 'Parent' });
			const result = blitz.parseImport([parent]);
			expect(result).toHaveLength(0);
		});

		it('includes Standard rows directly', () => {
			const product = makeProduct({ Sku: 'S1', Type: 'Standard' });
			const result = blitz.parseImport([product]);
			expect(result).toHaveLength(1);
			expect(result[0]!.Sku).toBe('S1');
		});

		it('merges Child rows with their Parent, keeping the parent Title', () => {
			const parent = makeProduct({ Sku: 'P1', Type: 'Parent', Title: 'Parent Title', Colour: '' });
			const child = makeProduct({ Sku: 'C1', ParentSku: 'P1', Type: 'Child', Title: 'Child Title', Colour: 'Red' });
			const result = blitz.parseImport([parent, child]);
			expect(result).toHaveLength(1);
			expect(result[0]!.Title).toBe('Parent Title');
			expect(result[0]!.Colour).toBe('Red');
		});

		it('adds an orphaned Child (no matching Parent) directly to the output', () => {
			const child = makeProduct({ Sku: 'C1', ParentSku: 'MISSING', Type: 'Child' });
			const result = blitz.parseImport([child]);
			expect(result).toHaveLength(1);
		});
	});

	describe('parsing example CSV', () => {
		it('parses the example file and validates the first product', async () => {
			const csv = loadExampleFixture(['vendors', 'blitz', 'blitz.csv']);
			const products = await parseProductsCSV(csv, blitz);

			expect(products.length).toBeGreaterThan(0);
			const product = products[0]!;

			expect(blitz.getSKU(product)).toEqual('16491');
			expect(blitz.getTitle(product)).toEqual('Blitz Aero Training Shoes');
			expect(blitz.getVendor(product)).toEqual('Blitz');
			expect(blitz.getDescription(product)).toEqual(
				'These multi-functional Blitz Aero Training Shoes are ideal for all Martial Arts and leisure activities. Whether worn when training, to or from the club or for general use, this convenient slip-on shoe combines a thin wedged shaped, rubber non-slip, sole for a comfortable fit and a circular pivot spot on the ball of the foot to allow for kicking and spinning techniques. High quality stitching is featured throughout the shoe with attention to stress points, ensuring resilience and durability. White shoe with black tongue, heel, sole and padded inside. Easy to wipe clean before and after use. Soft Nama Hide ™ Leather.'
			);
			expect(blitz.getQuantity(product)).toEqual(0);
			expect(blitz.getPrice(product)).toEqual(39.99);
			expect(blitz.getVAT(product)).toEqual(1.2);
			expect(blitz.getTaxable(product)).toEqual(true);
			expect(blitz.getShipping(product)).toEqual(5);
			expect(blitz.getRRP(product)).toEqual(39.99);
			expect(blitz.getMainImageURL(product)).toEqual('https://images.blitzsport.com/item/blitz-aero-training-shoes.jpg');
			expect(blitz.getVariantImageURL(product)).toEqual('https://images.blitzsport.com/item/blitz-aero-training-shoes.jpg');
			expect(blitz.getAdditionalImages(product)).toEqual([
				'https://images.blitzsport.com/item/blitz-aero-training-shoes-1.jpg',
				'https://images.blitzsport.com/item/blitz-aero-training-shoes-2.jpg',
				'https://images.blitzsport.com/item/blitz-aero-training-shoes-3.jpg',
			]);
			expect(blitz.getBarcode(product)).toEqual('5055915138374');
			expect(blitz.getTaxable(product)).toEqual(true);
			expect(blitz.getVariantCorrelationId(product)).toEqual('16486');
			expect(blitz.getFeatures(product)).toEqual([
				'Multi-functional shoe for Martial Arts or leisure',
				'Convenient slip-on shoe with non-slip rubber sole',
				'Pivot spot on sole for kicking and spinning skills',
				'Quality stitching with attention to stress points',
				'Soft Nama Hide™ leather shoe',
			]);
			expect(blitz.getWeightGrams(product)).toEqual(1480);
			expect(blitz.getType(product)).toEqual('Clothing > Footwear');
			expect(blitz.getVariants(product)).toEqual([{ name: 'Size', value: 'UK 10' }]);
		});
	});
});
