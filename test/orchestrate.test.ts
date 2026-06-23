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

const mockVendor = { name: 'MockVendor', importLabel: '', expectedHeaders: [], getSKU: () => '', urlConfig: { supportsFile: true, supportsURL: true } };
const shopifyRows = [{ Handle: 'h1' }] as any[];
const vendorRows = [{ Code: 'c1' }] as any[];
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
      await runUpdateInventory(shopifyRows, vendorRows, mockVendor as any, { maxQuantity: 5 });
      expect(mockUpdateInventory).toHaveBeenCalledWith(shopifyRows, { MockVendor: vendorRows }, { maxQuantity: 5 });
    });

    it('returns the unparsed CSV string', async () => {
      const result = await runUpdateInventory(shopifyRows, vendorRows, mockVendor as any, { maxQuantity: 5 });
      expect(result).toBe('Handle\nresult');
    });

    it('throws ExpectedError when result is empty', async () => {
      mockUpdateInventory.mockReturnValue([]);
      await expect(runUpdateInventory(shopifyRows, vendorRows, mockVendor as any, { maxQuantity: 5 }))
        .rejects.toThrow('Nothing to export');
    });
  });

  describe('runAddProducts', () => {
    beforeEach(() => {
      mockAddProducts.mockReturnValue(resultRows);
    });

    it('passes products to addProducts keyed by vendor name', async () => {
      await runAddProducts(shopifyRows, vendorRows, mockVendor as any);
      expect(mockAddProducts).toHaveBeenCalledWith(shopifyRows, { MockVendor: vendorRows });
    });

    it('unparsed with shopifyVendor.expectedHeaders as columns', async () => {
      await runAddProducts(shopifyRows, vendorRows, mockVendor as any);
      expect(mockUnparse).toHaveBeenCalledWith(resultRows, { columns: shopifyVendor.expectedHeaders });
    });

    it('throws ExpectedError when result is empty', async () => {
      mockAddProducts.mockReturnValue([]);
      await expect(runAddProducts(shopifyRows, vendorRows, mockVendor as any))
        .rejects.toThrow('Nothing to export');
    });
  });

  describe('runUpdateProducts', () => {
    beforeEach(() => {
      mockUpdateProducts.mockReturnValue(resultRows);
    });

    it('passes products to updateProducts with options', async () => {
      await runUpdateProducts(shopifyRows, vendorRows, mockVendor as any, { updateImages: true });
      expect(mockUpdateProducts).toHaveBeenCalledWith(shopifyRows, { MockVendor: vendorRows }, { updateImages: true });
    });

    it('throws ExpectedError when result is empty', async () => {
      mockUpdateProducts.mockReturnValue([]);
      await expect(runUpdateProducts(shopifyRows, vendorRows, mockVendor as any, { updateImages: false }))
        .rejects.toThrow('Nothing to export');
    });
  });
});
