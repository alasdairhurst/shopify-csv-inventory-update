import { describe, expect, it } from 'vitest';
import * as csv from '../../src/files/csv.ts';
import addProducts from '../../src/functions/addProducts.ts';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Blitz, BlitzProduct } from '../../src/vendors/blitz.ts';
import { Cartas } from '../../src/vendors/cartas.ts';
import { Reydon } from '../../src/vendors/reydon.ts';
import { Tuf } from '../../src/vendors/tuf.ts';
import { DEFAULT_SHOPIFY_PRODUCT, ExternalShopifyProduct } from '../../src/vendors/shopify.ts';
import { assertCsvFixtureMatches, assertJsonFixtureMatches, loadExampleFixture, PRODUCT_CSV_KEYS } from '../testUtils/fixtureHelpers.ts';
import { shopifyVendor } from '../../src/vendors/index.ts';

const makeShopifyProduct = (product: Partial<ExternalShopifyProduct>): ExternalShopifyProduct => ({
	...DEFAULT_SHOPIFY_PRODUCT,
	'Option1 Name': 'Title',
	'Option1 Value': 'Default Title',
	'Variant Inventory Tracker': 'shopify',
	'Variant Inventory Policy': 'deny',
	'Variant Fulfillment Service': 'manual',
	'Variant Requires Shipping': 'TRUE',
	'Variant Taxable': 'TRUE',
	'Variant Weight Unit': 'kg',
	Published: 'TRUE',
	Status: 'active',
	...product,
});

const makeBlitzProduct = (product: Partial<BlitzProduct>): BlitzProduct => ({
	Title: '',
	Link: '',
	LinkComponent: '',
	Description: '',
	Sku: '',
	ParentSku: '',
	Ean: '',
	CatCode: '',
	Type: 'Standard',
	Taxable: 'True',
	Brand: '',
	Category: 'Sporting Goods',
	ImageUrl: '',
	InStock: 'True',
	Weight: '0',
	RetailPrice: '0',
	TradePrice: '0',
	Feature1: '',
	Feature2: '',
	Feature3: '',
	Feature4: '',
	Feature5: '',
	DueDate: '',
	Size: '',
	Colour: '',
	Design: '',
	AltImage1: '',
	AltImage2: '',
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
	...product,
});

describe('addProducts()', () => {
	it('adds a new vendor product not present in Shopify', () => {
		const shopifyProducts = [
			makeShopifyProduct({
				Handle: 'existing-product',
				Title: 'Existing Product',
				Tags: 'blitz',
				'Variant SKU': 'EXIST123',
				'Variant Price': '10.00',
				'Variant Compare At Price': '10.00',
			}),
		];
		const vendorProduct = makeBlitzProduct({
			Title: 'New Blitz Shoe',
			Sku: 'NEW123',
			Ean: '5055915130000',
			TradePrice: '10.00',
			RetailPrice: '20.00',
		});

		const result = addProducts(shopifyProducts, { blitz: [vendorProduct] });

		expect(result).toHaveLength(1);
		expect(result[0]!['Variant SKU']).toBe('NEW123');
	});

	it('skips a vendor product that already exists in Shopify', () => {
		const shopifyProducts = [
			makeShopifyProduct({
				Handle: 'existing-product',
				Title: 'Existing Product',
				Tags: 'blitz',
				'Variant SKU': 'EXIST123',
				'Variant Price': '10.00',
				'Variant Compare At Price': '10.00',
			}),
		];
		const vendorProduct = makeBlitzProduct({
			Title: 'Existing Product',
			Sku: 'EXIST123',
			Ean: '5055915130000',
			TradePrice: '10.00',
			RetailPrice: '20.00',
		});

		const result = addProducts(shopifyProducts, { blitz: [vendorProduct] });

		expect(result).toHaveLength(0);
	});

	it('tags new products with the vendor name and "new in"', () => {
		const vendorProduct = makeBlitzProduct({
			Title: 'Blitz Gloves',
			Sku: 'GLOVE123',
			Ean: '5055915130000',
			TradePrice: '10.00',
			RetailPrice: '20.00',
		});

		const result = addProducts([], { blitz: [vendorProduct] });

		expect(result).toHaveLength(1);
		const tags = result[0]!.Tags.split(', ');
		expect(tags).toContain('blitz');
		expect(tags).toContain('new in');
	});

	it('adds Blitz products from the example fixture and asserts the full output', async () => {
		const shopifyCsv = loadExampleFixture(['shopify', 'products.csv']);
		const [shopifyRaw] = await csv.parseString(shopifyCsv, shopifyVendor);
		const blitzCsv = loadExampleFixture(['vendors', 'blitz', 'blitz.csv']);
		const blitzProducts = await parseProductsCSV(blitzCsv, new Blitz());

		const result = addProducts(shopifyRaw, { blitz: blitzProducts });

		// Assert some general functional guidelines to avoid bad test data
		expect(result.length).toBeGreaterThan(0);
		expect(result.every(row => row.Handle !== '')).toBe(true);
		expect(result.filter(row => row.Status !== '').every(row => row.Status === 'active')).toBe(true);

		// Assert against the full fixture for consistency
		await assertJsonFixtureMatches('blitz-add-products.json', result);
	});

	it('adds Cartas products from the example fixture and asserts the full CSV output', async () => {
		const shopifyCsv = loadExampleFixture(['shopify', 'products.csv']);
		const [shopifyRaw] = await csv.parseString(shopifyCsv, shopifyVendor);
		const cartasCsv = loadExampleFixture(['vendors', 'cartas', 'product.csv']);
		const cartasProducts = await parseProductsCSV(cartasCsv, new Cartas());

		const result = addProducts(shopifyRaw, { cartas: cartasProducts });

		expect(result.every(row => row.Handle !== '')).toBe(true);
		expect(result.filter(row => row.Status !== '').every(row => row.Status === 'active')).toBe(true);

		await assertCsvFixtureMatches(csv.unparse(result), 'cartas-add-products.csv', PRODUCT_CSV_KEYS, shopifyVendor);
	});

	it('adds Reydon products from the example fixture and asserts the full CSV output', async () => {
		const shopifyCsv = loadExampleFixture(['shopify', 'products.csv']);
		const [shopifyRaw] = await csv.parseString(shopifyCsv, shopifyVendor);
		const reydonCsv = loadExampleFixture(['vendors', 'reydon', 'product.csv']);
		const reydonProducts = await parseProductsCSV(reydonCsv, new Reydon());

		const result = addProducts(shopifyRaw, { reydon: reydonProducts });

		expect(result.every(row => row.Handle !== '')).toBe(true);
		expect(result.filter(row => row.Status !== '').every(row => row.Status === 'active')).toBe(true);

		await assertCsvFixtureMatches(csv.unparse(result), 'reydon-add-products.csv', PRODUCT_CSV_KEYS, shopifyVendor);
	});

	it('adds Tuf products from the example fixture and asserts the full CSV output', async () => {
		const shopifyCsv = loadExampleFixture(['shopify', 'products.csv']);
		const [shopifyRaw] = await csv.parseString(shopifyCsv, shopifyVendor);
		const tufCsv = loadExampleFixture(['vendors', 'tuf', 'product.csv']);
		const tufProducts = await parseProductsCSV(tufCsv, new Tuf());

		const result = addProducts(shopifyRaw, { tuf: tufProducts });

		expect(result.every(row => row.Handle !== '')).toBe(true);
		expect(result.filter(row => row.Status !== '').every(row => row.Status === 'active')).toBe(true);

		await assertCsvFixtureMatches(csv.unparse(result), 'tuf-add-products.csv', PRODUCT_CSV_KEYS, shopifyVendor);
	});
});
