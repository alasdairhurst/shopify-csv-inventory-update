import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as csv from '../../src/files/csv.ts';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import addProducts from '../../src/functions/addProducts.ts';
import { Blitz, BlitzProduct } from '../../src/vendors/blitz.ts';
import { DEFAULT_SHOPIFY_PRODUCT } from '../../src/vendors/shopify.ts';
import { convertShopifyProductsToInternal } from '../../src/shopify/products.ts';

const readFixture = (segments: string[]) => readFileSync(resolve(__dirname, '..', ...segments), 'utf8');

describe('addProducts()', () => {
  it('adds a new Blitz product when it does not exist in Shopify', async () => {
    const shopifyProducts = convertShopifyProductsToInternal([
      {
        ...DEFAULT_SHOPIFY_PRODUCT,
        Handle: 'existing-product',
        Title: 'Existing Product',
        Tags: 'existing',
        Published: 'TRUE',
        'Option1 Name': 'Title',
        'Option1 Value': 'Default Title',
        'Variant SKU': 'EXIST123',
        'Variant Inventory Tracker': 'shopify',
        'Variant Inventory Policy': 'deny',
        'Variant Fulfillment Service': 'manual',
        'Variant Price': '10.00',
        'Variant Compare At Price': '10.00',
        'Variant Requires Shipping': 'TRUE',
        'Variant Taxable': 'TRUE',
        'Variant Barcode': '',
        'Image Src': '',
        'Variant Weight Unit': 'kg',
        Status: 'active'
      }
    ]);

    const vendorProduct: BlitzProduct = {
      Title: 'New Blitz Shoe',
      Link: 'https://example.com',
      LinkComponent: 'new-blitz-shoe',
      Description: 'A new shoe from Blitz.',
      Sku: 'NEW123',
      ParentSku: '',
      Ean: '5055915130000',
      CatCode: 'BLI000',
      Type: 'Standard',
      Taxable: 'True',
      Brand: 'Blitz',
      Category: 'Sporting Goods',
      ImageUrl: 'https://images.blitzsport.com/item/new-blitz-shoe.jpg',
      InStock: 'True',
      Weight: '1.00',
      RetailPrice: '20.00',
      TradePrice: '10.00',
      Feature1: 'Lightweight',
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
      AltImage12: ''
    };

    const updatedProducts = addProducts(shopifyProducts, { blitz: [vendorProduct] });

    expect(updatedProducts.length).toBe(2);
    const added = updatedProducts.find(product => product.primaryRow['Variant SKU'] === 'NEW123');
    expect(added).toBeDefined();
    expect(added?.edited).toBe(true);
    expect(added?.primaryRow.Tags).toContain('blitz');
  });

  it('adds Blitz products from the example fixture into Shopify and marks them edited', async () => {
    const shopifyCsv = readFixture(['examples', 'shopify', 'products.csv']);
    const [shopifyRaw] = await csv.parseString<Record<string, string>>(shopifyCsv);
    const shopifyProducts = convertShopifyProductsToInternal(shopifyRaw as any);
    const blitzCsv = readFixture(['examples', 'vendors', 'blitz', 'blitz.csv']);
    const blitzProducts = await parseProductsCSV(blitzCsv, new Blitz());

    const updatedProducts = addProducts(shopifyProducts, { blitz: blitzProducts as any });

    expect(updatedProducts.length).toBeGreaterThan(shopifyProducts.length);
    expect(updatedProducts.some(product => product.primaryRow.Tags.includes('blitz'))).toBe(true);
    expect(updatedProducts.some(product => product.edited)).toBe(true);
  });
});
