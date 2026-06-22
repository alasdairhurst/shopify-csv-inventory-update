import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Reydon, ReydonProduct } from '../../src/vendors/reydon.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor Reydon', () => {
	const reydon = new Reydon();

	const makeProduct = (overrides: Partial<ReydonProduct>): ReydonProduct => ({
		Sku_Code: 'TEST-SKU',
		Product_Name: 'Test Product',
		Description: 'Test description',
		Image_File: 'https://example.com/img-file.jpg',
		Image_FTP: 'https://images.reydonsports.com/website/TEST.png',
		Size: '',
		Colour: 'Black',
		Brand: '47',
		VAT: '20',
		Barcode: '198589463146',
		Trade: '8.50',
		SRP: '20.99',
		Weight_KG: '0.5',
		Length_CM: '20',
		Width_CM: '15',
		Height_CM: '10',
		Commodity_Code: '',
		Easy_Store_Quantity: '10',
		COFO: '',
		COFO_Code: '',
		Product_Parent: 'Parent Product',
		Date_First_Available: '',
		Free_Stock: '5',
		Approx_Restock_Date_MMyy: '',
		Can_Sell_In: '',
		Cannot_Sell_In: '',
		Product_Material: '',
		Your_Price: '10.00',
		Currency: 'GBP',
		Price_Updated: '',
		...overrides,
	});

	it('validates the vendor features', () => {
		expect(reydon.name).toBe('reydon');
		expect(reydon.importLabel).toBe('Reydon CSV');
		expect(reydon.useBarcodeForExclusiveMatching).toBe(true);
		expect(reydon.useTitleForMatching).toBe(true);
		expect(reydon.canAddProducts()).toBe(true);
		expect(reydon.canUpdateInventory()).toBe(true);
	});

	it('getSKU returns Sku_Code', () => {
		expect(reydon.getSKU(makeProduct({}))).toBe('TEST-SKU');
	});

	it('getTitle returns Product_Name', () => {
		expect(reydon.getTitle(makeProduct({}))).toBe('Test Product');
	});

	it('getVendor returns Brand', () => {
		expect(reydon.getVendor(makeProduct({}))).toBe('47');
	});

	it('getMainImageURL returns Image_FTP', () => {
		expect(reydon.getMainImageURL(makeProduct({}))).toBe('https://images.reydonsports.com/website/TEST.png');
	});

	it('getVariantImageURL returns Image_FTP', () => {
		expect(reydon.getVariantImageURL(makeProduct({}))).toBe('https://images.reydonsports.com/website/TEST.png');
	});

	it('getQuantity returns numeric Free_Stock', () => {
		expect(reydon.getQuantity(makeProduct({ Free_Stock: '79' }))).toBe(79);
		expect(reydon.getQuantity(makeProduct({ Free_Stock: '0' }))).toBe(0);
	});

	it('getWeightGrams converts Weight_KG to grams', () => {
		expect(reydon.getWeightGrams(makeProduct({ Weight_KG: '0.087' }))).toBe(87);
		expect(reydon.getWeightGrams(makeProduct({ Weight_KG: '1.5' }))).toBe(1500);
	});

	it('getVariantCorrelationId returns Product_Name', () => {
		expect(reydon.getVariantCorrelationId(makeProduct({}))).toBe('Test Product');
	});

	it('orderBy returns Product_Name', () => {
		expect(reydon.orderBy(makeProduct({}))).toBe('Test Product');
	});

	describe('getDescription()', () => {
		it('normalises all whitespace to single spaces', () => {
			expect(reydon.getDescription(makeProduct({ Description: 'Word1\tWord2\nWord3' }))).toBe('Word1 Word2 Word3');
		});
	});

	describe('getVAT()', () => {
		it('converts VAT percentage to a multiplier', () => {
			expect(reydon.getVAT(makeProduct({ VAT: '20' }))).toBe(1.2);
			expect(reydon.getVAT(makeProduct({ VAT: '0' }))).toBe(1);
		});
	});

	describe('getTaxable()', () => {
		it('returns true when VAT is greater than 0%', () => {
			expect(reydon.getTaxable(makeProduct({ VAT: '20' }))).toBe(true);
		});

		it('returns false when VAT is 0%', () => {
			expect(reydon.getTaxable(makeProduct({ VAT: '0' }))).toBe(false);
		});
	});

	describe('getBarcode()', () => {
		it('returns a valid UPC-12 barcode', () => {
			expect(reydon.getBarcode(makeProduct({ Sku_Code: 'UNIQUE-UPC', Barcode: '198589463146' }))).toBe('198589463146');
		});

		it('returns "does not apply" for a non-numeric barcode', () => {
			expect(reydon.getBarcode(makeProduct({ Sku_Code: 'UNIQUE-INVALID', Barcode: 'N/A' }))).toBe('does not apply');
		});
	});

	describe('getShipping()', () => {
		it('returns small shipping for compact, light products', () => {
			expect(reydon.getShipping(makeProduct({}))).toBe(5);
		});

		it('returns large shipping when any dimension exceeds 120cm', () => {
			expect(reydon.getShipping(makeProduct({ Length_CM: '121' }))).toBe(10);
			expect(reydon.getShipping(makeProduct({ Width_CM: '150' }))).toBe(10);
			expect(reydon.getShipping(makeProduct({ Height_CM: '200' }))).toBe(10);
		});

		it('returns large shipping when weight exceeds 1500g', () => {
			expect(reydon.getShipping(makeProduct({ Weight_KG: '2.0' }))).toBe(10);
		});
	});

	describe('getPrice()', () => {
		it('calculates price as Your_Price * 1.45 * VAT + shipping', () => {
			// 10.00 * 1.45 * 1.2 + 5 = 22.4 → roundPrice → 22.99
			expect(reydon.getPrice(makeProduct({ Your_Price: '10.00', VAT: '20' }))).toBe(22.99);
		});
	});

	describe('getRRP()', () => {
		it('calculates RRP as getPrice * 1.2', () => {
			// getPrice = 22.99, getRRP = roundPrice(22.99 * 1.2) = roundPrice(27.588) → 27.99
			expect(reydon.getRRP(makeProduct({ Your_Price: '10.00', VAT: '20' }))).toBe(27.99);
		});
	});

	describe('getVariants()', () => {
		it('returns a Colour variant when Colour is set', () => {
			expect(reydon.getVariants(makeProduct({ Colour: 'Black', Size: '' }))).toEqual([{ name: 'Colour', value: 'Black' }]);
		});

		it('returns a Size variant when Size is set', () => {
			expect(reydon.getVariants(makeProduct({ Colour: '', Size: 'M' }))).toEqual([{ name: 'Size', value: 'M' }]);
		});

		it('returns both variants when both are set', () => {
			expect(reydon.getVariants(makeProduct({ Colour: 'Black', Size: 'M' }))).toEqual([
				{ name: 'Colour', value: 'Black' },
				{ name: 'Size', value: 'M' },
			]);
		});

		it('returns an empty array when neither is set', () => {
			expect(reydon.getVariants(makeProduct({ Colour: '', Size: '' }))).toEqual([]);
		});
	});

	describe('parsing example product CSV', () => {
		it('accepts Reydon headers and parses the example file', async () => {
			const csv = loadExampleFixture(['vendors', 'reydon', 'product.csv']);
			const products = await parseProductsCSV(csv, reydon);

			expect(products.length).toBeGreaterThan(0);
			const product = products[0]!;

			expect(reydon.getTitle(product)).toEqual('\'47 Arsenal Basic Cap');
			expect(reydon.getDescription(product)).toEqual('<p>• Flat Embroidered Logos </p><p>• Brushed Cotton Material </p><p>• Adjustable Velcro Closure</p><p>    <br></p>');
			expect(reydon.getVendor(product)).toEqual('47');
			expect(reydon.getSKU(product)).toEqual('EPL-MAC01BCV-BKA');
			expect(reydon.getMainImageURL(product)).toEqual('https://images.reydonsports.com/website/EPL-MAC01BCV-BKA.png');
			expect(reydon.getVariantImageURL(product)).toEqual('https://images.reydonsports.com/website/EPL-MAC01BCV-BKA.png');
			expect(reydon.getQuantity(product)).toEqual(79);
			expect(reydon.getVAT(product)).toEqual(1.2);
			expect(reydon.getTaxable(product)).toEqual(true);
			expect(reydon.getRRP(product)).toEqual(20.99);
			expect(reydon.getShipping(product)).toEqual(5);
			expect(reydon.getPrice(product)).toEqual(16.99);
			expect(reydon.getWeightGrams(product)).toEqual(87);
			expect(reydon.getVariants(product)).toEqual([{ name: 'Colour', value: 'Black' }]);
			expect(reydon.getBarcode(product)).toEqual('198589463146');
			expect(reydon.getVariantCorrelationId(product)).toEqual('\'47 Arsenal Basic Cap');
			expect(reydon.orderBy(product)).toEqual('\'47 Arsenal Basic Cap');
		});
	});
});
