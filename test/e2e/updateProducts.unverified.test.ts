import { describe, expect, it } from 'vitest';
import * as csv from '../../src/files/csv.ts';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import updateProducts from '../../src/functions/updateProducts.ts';
import { Blitz } from '../../src/vendors/blitz.ts';
import { convertShopifyProductsToInternal, convertShopifyProductsToExternal } from '../../src/shopify/products.ts';
import { Shopify } from '../../src/vendors/shopify.ts';
import { assertCsvFixtureMatches, loadExampleFixture, isRegenFixtures } from '../testUtils/fixtureHelpers.ts';

const parseShopifyProducts = async (input: string) => {
  const [rows] = await csv.parseString<Record<string, string>>(input);
  return convertShopifyProductsToInternal(rows as any);
};

describe('e2e updateProducts', () => {
  it('generates expected updated products output for Blitz fixture', async () => {
    const shopifyCsv = loadExampleFixture(['shopify', 'products.csv']);
    const shopifyProducts = await parseShopifyProducts(shopifyCsv);
    const blitzCsv = loadExampleFixture(['vendors', 'blitz', 'blitz.csv']);
    const blitzProducts = await parseProductsCSV(blitzCsv, new Blitz());

    const updated = updateProducts(shopifyProducts, { blitz: blitzProducts as any }, { updateImages: false });
    const updatedCSV = csv.unparse(convertShopifyProductsToExternal(updated, { onlyEdited: true }), {
      columns: new Shopify().expectedHeaders
    });

    await assertCsvFixtureMatches(updatedCSV, 'blitz-update-products.csv', ['Handle', 'Variant SKU', 'Variant Price', 'Variant Barcode', 'Image Src']);
    const editedProducts = updated.filter(product => product.edited);
    expect(updated.length).toBeGreaterThan(0);
    expect(editedProducts.length).toBeGreaterThan(0);
    expect(updated.some(product => product.primaryRow.Tags.includes('blitz'))).toBe(true);

    if (isRegenFixtures()) {
      expect(updated.length).toBeGreaterThan(0);
    }
  }, 90000);
});
