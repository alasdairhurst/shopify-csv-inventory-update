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

	let [csvObj, headers] = await csv.parseString<P>(headerRow + fileContent);

	// Check the headers as soon as we parse the csv before we use any properties.
	let match = false;
	// check if expected headers matches the ones we got
	match = vendor.expectedHeaders.every(expectedHeader => {
		// ideally we'd do a full match of all headers since the order sometimes matters,
		// but since shopify just decides to add random headers we'll just check for the
		// fields we know/care about.
		const there = headers.includes(expectedHeader);
		if (!there) {
			logger.warn(`[WARN] ${vendor.name} csv missing possible header: ${expectedHeader}`);
		}
		return there;
	});

	if (!match) {
		// TODO: Give a proper diff that fits on the screen
		// TODO: Try and guess if the file was for another vendor so it can warn better
		const expected = vendor.expectedHeaders.map(value => JSON.stringify(value)).join('\nor\n');
		throw new ExpectedError(`Did you pick the right file for ${vendor.importLabel}?\n CSV headers don't look right.\n\n  Expected:\n ${expected}\n\n  Got:\n ${JSON.stringify(headers)}`);
	}

	let products: P[] = [];
	if (vendor.parseImport) {
		products = vendor.parseImport(csvObj);
	} else {
		products = csvObj as P[];
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