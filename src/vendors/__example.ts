

// INV

type InvProduct = {
	SKU: string;
	ID: number;
	QUANTITY: number;
}

class InventoryVendor extends Vendor<InvProduct> implements InventoryUpdatable {
	name = "Inv"

	getSKU = (product: InvProduct) => {
		return product.SKU;
	}

	getQuantity(product: InvProduct) {
    return product.QUANTITY;
  }
}

// PROD

type ProdProduct = {
	sku: string;
	product_title: string;
	my_price: number;
};

class ProductVendor extends Vendor<ProdProduct> implements ProductAddable {
	name = "Prod"

	getSKU = (product: ProdProduct) => {
		return product.sku;
	}

  getTitle = (product: ProdProduct) => {
    return product.product_title;
  }

  getPrice = (product: ProdProduct) => {
    return this.somethingExtra(product);
  }

	somethingExtra(product: ProdProduct) {
		return product.my_price;
	}
}

// MEGA

// TODO: turn this into something that can validate data at runtime as well as a type
type MegaProduct = {
	sku: string;
	title: string;
	price: number;
	quantity: number;
};

class MegaVendor extends Vendor<MegaProduct> implements InventoryUpdatable, ProductAddable {
	name = "Mega"

	getSKU = (product: MegaProduct) => {
		return product.sku;
	}

	getQuantity(product: MegaProduct) {
    return product.quantity;
  }

  getTitle = (product: MegaProduct) => {
    return product.title;
  }

  getPrice = (product: MegaProduct) => {
    return product.price;
  }
}

// DEFINITIONS


type VendorKey = keyof typeof vendors;

type VendorProducts = {
  [K in VendorKey]: VendorProductMap[K][];
};

type TypedVendorMap = {
  [K in VendorKey]: Vendor<VendorProductMap[K]>;
};

function forEachVendor<K extends VendorKey>(
  vendors: TypedVendorMap,
  fn: <K extends VendorKey>(key: K, v: TypedVendorMap[K]) => void
) {
  (Object.keys(vendors) as K[]).forEach((key) => {
    fn(key, vendors[key]);
  });
}

// USAGE

const vendorProducts: VendorProducts = {
	"Mega": [
		{ "sku": "abc", "title": "apple", "price": 1, "quantity": 10 },
		{ "sku": "def", "title": "orange", "price": 2, "quantity": 0 }
	],
	"Prod": [
		{ "sku": "xx", "product_title": "apple", "my_price": 1, },
		{ "sku": "yy", "product_title": "orange", "my_price": 2, }
	],
	"Inv": [
		{ "SKU": "1", "ID": 134, "QUANTITY": 10 },
		{ "SKU": "2", "ID": 229, "QUANTITY": 0 }
	]
}

const productManagerExample = {
	updateInventory: (_sku: string, _quantity: number) => {},
	addProduct: (_product: { sku: string; title: string, price: number }) => {},
}

forEachVendor(vendors, (key, v) => {
	const products = vendorProducts[key];
	console.log(v.name);

	for (const p of products) {
		const sku = v.getSKU(p);
		const title = v.getTitle?.(p);
		console.log(`Actioning item ${sku}: ${title}`);

		if (v.canUpdateInventory()) {
			// Update inventory with the quantity that
			// we know exists because we have the capability
			productManagerExample.updateInventory(sku, v.getQuantity(p));
		}

		if (v.canAddProducts()) {
			// Create a product with the necesarry fields that
			// we know exist because we have the capability
			productManagerExample.addProduct({
				sku,
				title: v.getTitle(p),
				price: v.getPrice(p)
			})
 	 }
	}
});