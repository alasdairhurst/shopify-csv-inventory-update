import { describe, expect, it } from 'vitest';
import * as csv from '../../src/files/csv.ts';
import updateProducts from '../../src/functions/updateProducts.ts';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Cartas, CartasProduct } from '../../src/vendors/cartas.ts';
import { DEFAULT_SHOPIFY_PRODUCT, ExternalShopifyProduct } from '../../src/vendors/shopify.ts';
import { assertJsonFixtureMatches, loadExampleFixture } from '../testUtils/fixtureHelpers.ts';
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

describe('updateProducts()', () => {
	it('updates the price when the vendor price differs from Shopify', () => {
		const shopifyProducts = [
			makeShopifyProduct({
				Handle: 'cartas-product',
				Title: 'Cartas Product',
				Tags: 'cartas',
				'Variant SKU': 'CANT00058',
				'Variant Price': '10.00',
				'Variant Compare At Price': '10.00',
				'Variant Barcode': '5054698692271',
			}),
		];

		const vendorProduct: CartasProduct = {
			STATUS: 'LIVE',
			CODE: 'CANT00058',
			WEIGHT: '1',
			STOCK: '5',
			CATEGORY: 'CLOTHING',
			BRAND: 'Mizuno',
			EAN: '5054698692271',
			VAT: '20%',
			TRADE_PRICE: '10',
			DESCRIPTION: 'A Cartas product description.',
			MAIN_IMAGE: 'https://cartasport.net/main_images/MIZU00001.jpg',
			PRODUCT_NAME: 'Cartas Product',
			IMAGE_1: '',
			IMAGE_2: '',
			IMAGE_3: '',
			IMAGE_4: '',
			SIZE: 'Small',
			COLOUR: 'Black',
			PERANT_ID: '',
			LENGTH: '',
			WIDTH: '',
			HEIGHT: ''
		};

		const result = updateProducts(shopifyProducts, { cartas: [vendorProduct] }, { updateImages: false });

		expect(result).toHaveLength(1);
		expect(result[0]!['Variant Price']).toBe('20.99');
		expect(result[0]!.Tags).toContain('cartas');
	});

	it('returns no updates when the vendor product is not in Shopify', () => {
		const shopifyProducts = [
			makeShopifyProduct({
				Handle: 'existing-product',
				Title: 'Existing Product',
				Tags: 'cartas',
				'Variant SKU': 'OTHER123',
				'Variant Price': '10.00',
				'Variant Compare At Price': '10.00',
			}),
		];

		const vendorProduct: CartasProduct = {
			STATUS: 'LIVE',
			CODE: 'CANT00058',
			WEIGHT: '1',
			STOCK: '5',
			CATEGORY: 'CLOTHING',
			BRAND: 'Mizuno',
			EAN: '5054698692271',
			VAT: '20%',
			TRADE_PRICE: '10',
			DESCRIPTION: 'A Cartas product description.',
			MAIN_IMAGE: 'https://cartasport.net/main_images/MIZU00001.jpg',
			PRODUCT_NAME: 'Existing Product',
			IMAGE_1: '',
			IMAGE_2: '',
			IMAGE_3: '',
			IMAGE_4: '',
			SIZE: '',
			COLOUR: '',
			PERANT_ID: '',
			LENGTH: '',
			WIDTH: '',
			HEIGHT: ''
		};

		const result = updateProducts(shopifyProducts, { cartas: [vendorProduct] }, { updateImages: false });

		expect(result).toHaveLength(0);
	});

	it('updates Cartas products from the example fixture and asserts the full output', async () => {
		const shopifyCsv = loadExampleFixture(['shopify', 'products.csv']);
		const [shopifyRaw] = await csv.parseString(shopifyCsv, shopifyVendor);
		const cartasCsv = loadExampleFixture(['vendors', 'cartas', 'product.csv']);
		const cartasProducts = await parseProductsCSV(cartasCsv, new Cartas());

		const result = updateProducts(shopifyRaw, { cartas: cartasProducts }, { updateImages: false });

		// Assert some general functional guidelines to avoid bad test data
		expect(result.length).toBeGreaterThan(0);
		expect(result.every(row => row.Handle !== '')).toBe(true);

		// Assert against the full fixture for consistency
		await assertJsonFixtureMatches('cartas-update-products.json', result);
	});
});
