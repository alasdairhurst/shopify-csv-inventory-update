import { parseBarcode } from '../utils/helpers.ts';
import type { Vendor } from '../vendors/index.ts';
import { ExternalShopifyProduct } from '../vendors/shopify.ts';
import { matchShopifyItems } from './items.ts';

export type ShopifyProduct = {
	primaryRow: ExternalShopifyProduct;
	secondaryRows: ExternalShopifyProduct[];
	edited: boolean;
	sale?: boolean; // TODO: do this better
	_parsedBarcode?: string;
};

export const isOnSale = (shopifyProduct: ExternalShopifyProduct) => {
	// Update the product sale tag - run after price update
	const price = +shopifyProduct['Variant Price'];
	const rrp = +shopifyProduct['Variant Compare At Price'];
	return (price / rrp) <= 0.7;
};

// Replace
export const getShopifyProductParsedBarcode = (product: ExternalShopifyProduct) => {
	if (!('_parsedBarcode' in product)) {
		product._parsedBarcode = parseBarcode(product['Variant Barcode']);
	}
	return product._parsedBarcode;
}

export const convertShopifyProductsToInternal = (shopifyProductsCSV: ExternalShopifyProduct[]) => {
	shopifyProductsCSV = shopifyProductsCSV.sort((a, b) => {
		return a.Handle.localeCompare(b.Handle);
	});

	// reformat
	const shopifyProductsNewFormat: ShopifyProduct[] = [];
	let currentProduct: ShopifyProduct | undefined;
	for (const shopifyProduct of shopifyProductsCSV) {
		shopifyProduct['Variant SKU'] = shopifyProduct['Variant SKU'].replace(/^'/, '');
		if (currentProduct?.primaryRow.Handle !== shopifyProduct.Handle) {
			currentProduct = {
				primaryRow: shopifyProduct,
				secondaryRows: [],
				edited: false
			};
			shopifyProductsNewFormat.push(currentProduct);
		} else {
			currentProduct.secondaryRows.push(shopifyProduct);
		}
	}
	return shopifyProductsNewFormat;
}

export const convertShopifyProductsToExternal = (products: ShopifyProduct[], options: { onlyEdited?: boolean} = {}) => {
	const shopifyProductsCSV: ExternalShopifyProduct[] = [];
	for (const product of products) {
		if (options.onlyEdited && !product.edited) {
			continue;
		}
		shopifyProductsCSV.push(product.primaryRow);
		shopifyProductsCSV.push(...product.secondaryRows);
	}
	return shopifyProductsCSV;
}

const matchProduct = (shopifyParent: ShopifyProduct, shopifyProduct: ExternalShopifyProduct, vendor: Vendor<any>, vendorProduct: any) => {
	return matchShopifyItems(
		{
			sku: shopifyProduct['Variant SKU'],
			title: shopifyParent.primaryRow.Title,
			barcode: getShopifyProductParsedBarcode(shopifyProduct),
			tags: shopifyParent.primaryRow.Tags.split(', ')
		},
		vendor,
		vendorProduct,
		{
			matchVendorTag: true
		}
	);
};

export const getShopifyProductAndParent = (shopifyProducts: ShopifyProduct[], vendor: Vendor<any>, vendorProduct: any) => {
	let shopifyProduct: ExternalShopifyProduct | undefined;
	let shopifyProductLabel: string | undefined;
	const shopifyParent = shopifyProducts.find(product => {
		// eslint-disable-next-line no-cond-assign
		if (shopifyProductLabel = matchProduct(product, product.primaryRow, vendor, vendorProduct)) {
			shopifyProduct = product.primaryRow;
			return true;
		}
		return !!product.secondaryRows.find(secondaryRow => {
			// eslint-disable-next-line no-cond-assign
			if (shopifyProductLabel = matchProduct(product, secondaryRow, vendor, vendorProduct)) {
				shopifyProduct = secondaryRow;
				return true;
			}
			return false;
		});
	});
	return { shopifyProduct, shopifyParent, shopifyProductLabel };
}