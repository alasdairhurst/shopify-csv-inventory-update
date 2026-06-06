
import Papa from 'papaparse';

// Utility function to parse CSV string
export function parseString(csv) {
	return new Promise((resolve, reject) => {
		Papa.parse(csv, {
			header: true,
			skipEmptyLines: true,
			complete(results) {
				resolve([results.data, results.meta.fields]);
			},
			error: reject
		});
	});
}

export function unparse(obj, options = {}) {
	return Papa.unparse(obj, {
		header: true,
		newline: '\n',
		...options
	});
}
