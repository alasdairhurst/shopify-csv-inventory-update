import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as csv from '../../src/files/csv.ts';
import updateProducts from '../../src/functions/updateProducts.ts';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { Cartas, CartasProduct } from '../../src/vendors/cartas.ts';
import { convertShopifyProductsToInternal } from '../../src/shopify/products.ts';
import { DEFAULT_SHOPIFY_PRODUCT } from '../../src/vendors/shopify.ts';

const readFixture = (segments: string[]) => readFileSync(resolve(__dirname, '..', ...segments), 'utf8');

describe('updateProducts()', () => {
  it('updates Shopify prices for Cartas products and marks parents edited', () => {
    const shopifyProducts = convertShopifyProductsToInternal([
      {
        ...DEFAULT_SHOPIFY_PRODUCT,
        Handle: 'cartas-product',
        Title: 'Cartas Product',
        Tags: 'cartas',
        Published: 'TRUE',
        'Option1 Name': 'Title',
        'Option1 Value': 'Default Title',
        'Variant SKU': 'CANT00058',
        'Variant Inventory Tracker': 'shopify',
        'Variant Inventory Policy': 'deny',
        'Variant Fulfillment Service': 'manual',
        'Variant Price': '10.00',
        'Variant Compare At Price': '10.00',
        'Variant Requires Shipping': 'TRUE',
        'Variant Taxable': 'TRUE',
        'Variant Barcode': '5054698692271',
        'Image Src': 'https://cartasport.net/main_images/MIZU00001.jpg',
        'Variant Weight Unit': 'kg',
        Status: 'active'
      }
    ]);

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

    const updated = updateProducts(shopifyProducts, { cartas: [vendorProduct] }, { updateImages: false });

    expect(updated[0]!.edited).toBe(true);
    expect(updated[0]!.primaryRow['Variant Price']).toBe('19.99');
    expect(updated[0]!.primaryRow.Tags).toContain('cartas');
  });

  it('updates Cartas product prices from the real fixtures', async () => {
    const shopifyCsv = readFixture(['examples', 'shopify', 'products.csv']);
    const [shopifyRaw] = await csv.parseString<Record<string, string>>(shopifyCsv);
    const shopifyProducts = convertShopifyProductsToInternal(shopifyRaw as any);
    const cartasCsv = readFixture(['examples', 'vendors', 'cartas', 'product.csv']);
    const cartasProducts = await parseProductsCSV(cartasCsv, new Cartas());

    const updated = updateProducts(shopifyProducts, { cartas: cartasProducts as any }, { updateImages: false });

    expect(updated.filter(product => product.edited).length).toBeGreaterThan(0);
    expect(updated.some(product => product.primaryRow.Tags.includes('cartas'))).toBe(true);
  });
});
