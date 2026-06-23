import type { Vendor, Product } from './vendors/vendor.ts';
import { shopifyVendor } from './vendors/index.ts';
import type { ShopifyInventoryProduct } from './vendors/shopify.ts';
import updateInventory from './functions/updateInventory.ts';
import addProducts from './functions/addProducts.ts';
import updateProducts from './functions/updateProducts.ts';
import * as csv from './files/csv.ts';
import ExpectedError from './utils/ExpectedError.ts';

export async function runUpdateInventory(
  shopifyProducts: Product[],
  vendorProducts: Product[],
  vendor: Vendor<any>,
  opts: { maxQuantity: number }
): Promise<string> {
  const result = updateInventory(
    shopifyProducts as ShopifyInventoryProduct[],
    { [vendor.name]: vendorProducts },
    opts
  );
  if (!result.length) throw new ExpectedError('Nothing to export');
  return csv.unparse(result);
}

export async function runAddProducts(
  shopifyProducts: Product[],
  vendorProducts: Product[],
  vendor: Vendor<any>
): Promise<string> {
  const result = addProducts(shopifyProducts as any, { [vendor.name]: vendorProducts });
  if (!result.length) throw new ExpectedError('Nothing to export');
  return csv.unparse(result, { columns: shopifyVendor.expectedHeaders });
}

export async function runUpdateProducts(
  shopifyProducts: Product[],
  vendorProducts: Product[],
  vendor: Vendor<any>,
  opts: { updateImages: boolean }
): Promise<string> {
  const result = updateProducts(shopifyProducts as any, { [vendor.name]: vendorProducts }, opts);
  if (!result.length) throw new ExpectedError('Nothing to export');
  return csv.unparse(result, { columns: shopifyVendor.expectedHeaders });
}
