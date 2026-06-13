import { Product, Vendor } from '../vendors/index.ts';

const sortProducts = function<P extends Product>(products: P[], vendor: Vendor<P>) {
	if (vendor.orderBy) {
		// since sort is a different closure typescript thinks that orderBy can change...
		const orderBy = vendor.orderBy?.bind(vendor);
		products.sort((a, b) => {
			return orderBy(a).localeCompare(orderBy(b));
		});
	}
};

export default sortProducts;