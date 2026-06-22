
import Papa from 'papaparse';

// Utility function to parse CSV string
export function parseString<T>(csv: string): Promise<[T[], string[]]> {
	return new Promise((resolve, reject) => {
		Papa.parse<T>(csv, {
			header: true,
			transform: (value) => value.trim(),
			transformHeader: (value) => value.trim(),
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
