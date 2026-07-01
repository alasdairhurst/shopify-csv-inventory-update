import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExpectedError from '../src/utils/ExpectedError.ts';

vi.mock('../src/functions/updateInventory.ts', () => ({
  default: vi.fn(),
}));
vi.mock('../src/functions/addProducts.ts', () => ({
  default: vi.fn(),
}));
vi.mock('../src/functions/updateProducts.ts', () => ({
  default: vi.fn(),
}));
vi.mock('../src/files/csv.ts', () => ({
  unparse: vi.fn(),
}));

import updateInventory from '../src/functions/updateInventory.ts';
import addProducts from '../src/functions/addProducts.ts';
import updateProducts from '../src/functions/updateProducts.ts';
import * as csv from '../src/files/csv.ts';
import { shopifyVendor } from '../src/vendors/index.ts';
import { runUpdateInventory, runAddProducts, runUpdateProducts } from '../src/orchestrate.ts';

const mockUpdateInventory = vi.mocked(updateInventory);
const mockAddProducts = vi.mocked(addProducts);
const mockUpdateProducts = vi.mocked(updateProducts);
const mockUnparse = vi.mocked(csv.unparse);

const shopifyRows = [{ Handle: 'h1' }] as any[];
const vendorRows = [{ Code: 'c1' }] as any[];
const vendorMap = { MockVendor: vendorRows };
const resultRows = [{ Handle: 'result' }] as any[];

describe('orchestrate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUnparse.mockReturnValue('Handle\nresult');
  });

  describe('runUpdateInventory', () => {
    beforeEach(() => {
      mockUpdateInventory.mockReturnValue(resultRows);
    });

    it('passes shopify products to updateInventory', async () => {
      await runUpdateInventory(shopifyRows, vendorMap, { maxQuantity: 5 });
      expect(mockUpdateInventory).toHaveBeenCalledWith(shopifyRows, vendorMap, { maxQuantity: 5 });
    });

    it('returns the unparsed CSV string', async () => {
      const result = await runUpdateInventory(shopifyRows, vendorMap, { maxQuantity: 5 });
      expect(result).toBe('Handle\nresult');
    });

    it('throws ExpectedError when result is empty', async () => {
      mockUpdateInventory.mockReturnValue([]);
      await expect(runUpdateInventory(shopifyRows, vendorMap, { maxQuantity: 5 }))
        .rejects.toThrow('Stock levels already up to date');
    });
  });

  describe('runAddProducts', () => {
    beforeEach(() => {
      mockAddProducts.mockReturnValue(resultRows);
    });

    it('passes products to addProducts keyed by vendor name', async () => {
      await runAddProducts(shopifyRows, vendorMap);
      expect(mockAddProducts).toHaveBeenCalledWith(shopifyRows, vendorMap);
    });

    it('unparsed with shopifyVendor.expectedHeaders as columns', async () => {
      await runAddProducts(shopifyRows, vendorMap);
      expect(mockUnparse).toHaveBeenCalledWith(resultRows, { columns: shopifyVendor.expectedHeaders });
    });

    it('throws ExpectedError when result is empty', async () => {
      mockAddProducts.mockReturnValue([]);
      await expect(runAddProducts(shopifyRows, vendorMap))
        .rejects.toThrow('No new products to add');
    });
  });

  describe('runUpdateProducts', () => {
    beforeEach(() => {
      mockUpdateProducts.mockReturnValue(resultRows);
    });

    it('passes products to updateProducts with options', async () => {
      await runUpdateProducts(shopifyRows, vendorMap, { updateImages: true });
      expect(mockUpdateProducts).toHaveBeenCalledWith(shopifyRows, vendorMap, { updateImages: true });
    });

    it('throws ExpectedError when result is empty', async () => {
      mockUpdateProducts.mockReturnValue([]);
      await expect(runUpdateProducts(shopifyRows, vendorMap, { updateImages: false }))
        .rejects.toThrow('Products already up to date');
    });
  });
});
