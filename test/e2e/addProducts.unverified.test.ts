import { describe, expect, it } from 'vitest';
import * as csv from '../../src/files/csv.ts';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import addProducts from '../../src/functions/addProducts.ts';
import { Blitz } from '../../src/vendors/blitz.ts';
import { convertShopifyProductsToInternal, convertShopifyProductsToExternal } from '../../src/shopify/products.ts';
import { Shopify } from '../../src/vendors/shopify.ts';
import { assertCsvFixtureMatches, loadExampleFixture, isRegenFixtures } from '../testUtils/fixtureHelpers.ts';

const parseShopifyProducts = async (input: string) => {
  const [rows] = await csv.parseString<Record<string, string>>(input);
  return convertShopifyProductsToInternal(rows as any);
};

describe('e2e addProducts', () => {
  it('generates expected add-products output for Blitz fixture', async () => {
    const shopifyCsv = loadExampleFixture(['shopify', 'products.csv']);
    const shopifyProducts = await parseShopifyProducts(shopifyCsv);
    const blitzCsv = loadExampleFixture(['vendors', 'blitz', 'blitz.csv']);
    const blitzProducts = await parseProductsCSV(blitzCsv, new Blitz());

    const added = addProducts(shopifyProducts, { blitz: blitzProducts as any });
    const addedCSV = csv.unparse(convertShopifyProductsToExternal(added, { onlyEdited: true }), {
      columns: new Shopify().expectedHeaders
    });

    await assertCsvFixtureMatches(addedCSV, 'blitz-add-products.csv', ['Handle', 'Variant SKU', 'Variant Price', 'Variant Barcode', 'Image Src']);

    if (isRegenFixtures()) {
      expect(added.length).toBeGreaterThan(0);
    }
  }, 90000);

  it('ensures new Blitz SKUs are marked edited', async () => {
    const shopifyCsv = loadExampleFixture(['shopify', 'products.csv']);
    const shopifyProducts = await parseShopifyProducts(shopifyCsv);
    const blitzCsv = loadExampleFixture(['vendors', 'blitz', 'blitz.csv']);
    const blitzProducts = await parseProductsCSV(blitzCsv, new Blitz());

    const added = addProducts(shopifyProducts, { blitz: blitzProducts as any });
    const editedProducts = added.filter(product => product.edited);

    expect(editedProducts.length).toBeGreaterThan(0);
    expect(added.some(product => product.primaryRow.Tags.includes('blitz'))).toBe(true);
    expect(editedProducts.some(product => product.primaryRow.Tags?.includes('blitz'))).toBe(true);
  }, 90000);
});
