
import { ZipReader, BlobReader, BlobWriter } from '@zip.js/zip.js';

export async function readZip(file) {
	const entries = await (
		new ZipReader(new BlobReader(file))
	).getEntries();

	// Only read the first csv entry
	const csvFile = entries.find(entry => entry.filename.endsWith('.csv'));
	if (!csvFile) {
		throw new Error('Cannot find .csv in zip file', file.name)
	}
	const blob = await csvFile.getData(new BlobWriter());

	return new File(new Array(blob), csvFile.filename);
}