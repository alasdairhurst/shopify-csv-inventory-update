import he from 'he';
import * as csv from '../files/csv.ts';
import logger from '../utils/logger.ts';
import { Product, Vendor } from '../vendors/index.ts';
import ExpectedError from '../utils/ExpectedError.ts';
import { PARENT_SYMBOL } from '../utils/constants.ts';
import sortProducts from './sortProducts.ts';

export const parseProductsCSV = async function <P extends Product>(fileContent: string, vendor: Vendor<P>) {
	let headerRow = '';
	// Add headers when csv is missing them
	if (vendor.forceHeaders) {
		headerRow = vendor.forceHeaders.join(',') + '\n';
	}
	if (vendor.htmlDecode) {
		fileContent = he.decode(fileContent);
	}

	const [csvObj, headers] = await csv.parseString(headerRow + fileContent, vendor);

	// Check the headers as soon as we parse the csv before we use any properties.
	const missingHeaders: string[] = [];
	// check if expected headers matches the ones we got
	vendor.expectedHeaders.forEach(expectedHeader => {
		// ideally we'd do a full match of all headers since the order sometimes matters,
		// but since shopify just decides to add random headers we'll just check for the
		// fields we know/care about.
		const there = headers.includes(expectedHeader);
		if (!there) {
			missingHeaders.push(expectedHeader);
			logger.warn(`[WARN] ${vendor.name} csv missing expected header: ${expectedHeader}`);
		}
		return there;
	});

	if (missingHeaders.length) {
		// TODO: Try and guess if the file was for another vendor so it can warn better
		throw new ExpectedError(`Did you pick the right file for ${vendor.importLabel}?\nMissing headers: ${missingHeaders}`);
	}

	let products: P[] = [];
	if (vendor.parseImport) {
		products = vendor.parseImport(csvObj);
	} else {
		products = csvObj as P[];
	}

	// filter ignored products
	if (vendor.shouldNotIgnore) {
		products = products.filter(vendor.shouldNotIgnore);
	}

	sortProducts(products, vendor);

	if (vendor.getVariantCorrelationId) {
		const parents: Record<string, P> = {};
		for (const item of products) {
			const id = vendor.getVariantCorrelationId(item);
			if (parents[id]) {
				item[PARENT_SYMBOL] = parents[id];
			} else if (id) {
				parents[id] = item;
			}
		}
	}
	return products;
};

export const parseProductsCSVs = async function <P extends Product>(csv: string[], vendor: Vendor<P>) {
	const promises = csv.map(x => parseProductsCSV(x, vendor));
	const products = (await Promise.all(promises)).flat();
	// Sort all the products together
	sortProducts(products, vendor);
	return products;
}

export default parseProductsCSV;