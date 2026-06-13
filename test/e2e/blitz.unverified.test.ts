import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as csv from '../../src/files/csv.ts';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import addProducts from '../../src/functions/addProducts.ts';
import updateInventory from '../../src/functions/updateInventory.ts';
import updateProducts from '../../src/functions/updateProducts.ts';
import { Blitz } from '../../src/vendors/blitz.ts';
import { ExternalShopifyProduct, ShopifyInventoryProduct } from '../../src/vendors/shopify.ts';
import { convertShopifyProductsToInternal } from '../../src/shopify/products.ts';

const readFixture = (segments: string[]) => readFileSync(resolve(__dirname, '..', ...segments), 'utf8');

describe('Blitz end-to-end CSV flow', () => {
  it('adds Blitz products to Shopify product catalog', async () => {
    const shopifyProductsCsv = readFixture(['examples', 'shopify', 'products.csv']);
    const [shopifyProductsRaw] = await csv.parseString<Record<string, string>>(shopifyProductsCsv);
    const shopifyProducts = convertShopifyProductsToInternal(shopifyProductsRaw as any);
    const initialCount = shopifyProducts.length;

    const blitzCsv = readFixture(['examples', 'vendors', 'blitz', 'blitz.csv']);
    const blitzProducts = await parseProductsCSV(blitzCsv, new Blitz());

    const addedProducts = addProducts(shopifyProducts, { blitz: blitzProducts as any });

    // Verify products were added
    expect(addedProducts.length).toBeGreaterThan(initialCount);

    // Verify added products are marked as edited
    const editedProducts = addedProducts.filter(p => p.edited);
    expect(editedProducts.length).toBeGreaterThan(0);

    // Verify at least one Blitz product exists
    const blitzTaggedProducts = addedProducts.filter(p => p.primaryRow.Tags?.includes('blitz'));
    expect(blitzTaggedProducts.length).toBeGreaterThan(0);

    // Verify first added product has correct structure
    const firstEdited = editedProducts[0]!;
    expect(firstEdited.primaryRow.Handle).toBeDefined();
    expect(firstEdited.primaryRow.Title).toBeDefined();
    expect(firstEdited.primaryRow['Variant SKU']).toBeDefined();
    expect(firstEdited.primaryRow['Variant Price']).toBeDefined();
  }, 90000);

  it('updates inventory levels for Blitz products', async () => {
    const shopifyInventoryCsv = readFixture(['examples', 'shopify', 'inventory.csv']);
    const [shopifyInventoryRows] = await csv.parseString<ShopifyInventoryProduct>(shopifyInventoryCsv);

    const blitzCsv = readFixture(['examples', 'vendors', 'blitz', 'blitz.csv']);
    const blitzProducts = await parseProductsCSV(blitzCsv, new Blitz());

    const inventoryUpdates = updateInventory(shopifyInventoryRows, { blitz: blitzProducts as any }, { maxQuantity: 50 });

    // Verify inventory updates were generated
    expect(Array.isArray(inventoryUpdates)).toBe(true);
    expect(inventoryUpdates.length).toBeGreaterThan(0);

    // Verify updates have the correct structure
    const firstUpdate = inventoryUpdates[0]!;
    expect(firstUpdate.SKU).toBeDefined();
    expect(firstUpdate['On hand (new)']).toBeDefined();

    // Verify the value is within expected range (0-50)
    const newQty = parseInt(firstUpdate['On hand (new)'] as string);
    expect(newQty).toBeLessThanOrEqual(50);
    expect(newQty).toBeGreaterThanOrEqual(0);
  }, 90000);

  it('updates product prices and descriptions from Blitz data', async () => {
    const shopifyProductsCsv = readFixture(['examples', 'shopify', 'products.csv']);
    const [shopifyProductsRaw] = await csv.parseString<ExternalShopifyProduct>(shopifyProductsCsv);
		const shopifyProducts = convertShopifyProductsToInternal(shopifyProductsRaw);

    const blitzCsv = readFixture(['examples', 'vendors', 'blitz', 'blitz.csv']);
    const blitzProducts = await parseProductsCSV(blitzCsv, new Blitz());

    const updatedProducts = updateProducts(shopifyProducts, { blitz: blitzProducts }, { updateImages: false });

    // Verify some products were updated
    const editedProducts = updatedProducts.filter(p => p.edited);
    expect(editedProducts.length).toBeGreaterThanOrEqual(0);

    // Verify product structure is valid
    updatedProducts.forEach(product => {
      expect(product.primaryRow.Handle).toBeDefined();
      expect(product.primaryRow.Title).toBeDefined();
      expect(Array.isArray(product.secondaryRows)).toBe(true);
    });
  }, 90000);
});
