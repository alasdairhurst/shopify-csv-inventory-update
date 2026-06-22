
import Papa from 'papaparse';
import { Product, Vendor } from '../vendors/index.ts';

// Utility function to parse CSV string
export function parseString<T extends Product>(csv: string, vendor: Vendor<T>): Promise<[T[], string[]]> {
	let emptyHeaderIdx = 0;
	return new Promise((resolve, reject) => {
		Papa.parse<T>(csv, {
			header: true,
			transform: (value) => value.trim(),
			transformHeader: (value) => {
				if (vendor.forceEmptyHeaders && !value) {
					const header = vendor.forceEmptyHeaders[emptyHeaderIdx++];
					if (header === undefined) {
						return '';
					}
					return header;
				}
				return value.trim()
			},
			skipEmptyLines: true,
			complete(results) {
				resolve([ results.data, results.meta.fields as string[] ]);
			},
			error: reject
		});
	});
}

export function unparse(obj: unknown[], options = {}) {
	return Papa.unparse(obj, {
		header: true,
		newline: '\n',
		...options
	});
}
