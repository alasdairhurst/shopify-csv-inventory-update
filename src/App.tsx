import { ReactNode, useState } from 'react';
import he from 'he';
import { vendors, Vendor, forEachVendorAsync } from './vendors2/index.ts';
import Spinner from './components/Spinner.tsx';
import type { VendorProducts } from './vendors2/index.ts';
import type { Product } from './vendors2/vendor.ts';
import Alert from './components/Alert.tsx';
import {
	PARENT_SYMBOL,
	DOWNLOAD_INVENTORY_FILE_NAME,
	DOWNLOAD_PRODUCTS_FILE_NAME,
	DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME
} from './utils/constants.ts';
import {
	SHOPIFY_PRODUCTS_OPTIONS,
	convertShopifyProductsToExternal,
	convertShopifyProductsToInternal
} from './shopify/products.ts';
import {
	SHOPIFY_INVENTORY_OPTIONS,
} from './shopify/inventory.ts';
import { readZip } from './files/zip.ts'
import { downloadTextFile } from './files/download.ts';
import logger from './utils/logger.ts';
import * as csv from './files/csv.ts';
import ExpectedError from './utils/ExpectedError.ts';
import updateInventory from './functions/updateInventory.ts';
import updateProducts from './functions/updateProducts.ts';
import addProducts from './functions/addProducts.ts';

import './App.css';

async function parseFilesAsCSV<P extends Product>(files: FileList, vendor: Vendor<P>) {
	let csv = (await Promise.all(
		Array.from(files).map(f => parseFileAsCSV(f, vendor))
	))
		.filter(f => f !== undefined)
		.flat(1);

	// since sort is used in a different context typescript thinks that orderBy can change...
	if (vendor.orderBy) {
		const orderBy = vendor.orderBy?.bind(vendor);
		csv = csv.sort((a, b) => {
			return orderBy(a).localeCompare(orderBy(b));
		});
	}
	return csv;
}

async function parseFileAsCSV<P extends Product>(file: File, vendor: Vendor<P>) {
	if (!file) return;

	if (file.name.endsWith('.zip')) {
		file = await readZip(file);
	}

	if (!file.name.endsWith('.csv')) {
		throw new Error(`Unknown file type: ${file.name}`);
	}

	const reader = new FileReader();
	// Read the file content synchronously
	reader.readAsText(file);
	await new Promise(resolve => {
		reader.onload = resolve;
	});

	let fileContent = reader.result as string; // Get the file content
	let headerRow = '';
	// Add headers when csv is missing them
	if (vendor.forceHeaders) {
		headerRow = vendor.forceHeaders.join(',') + '\n';
	}
	if (vendor.htmlDecode) {
		fileContent = he.decode(fileContent);
	}

	let [csvObj, headers] = await csv.parseString(headerRow + fileContent);

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

	// since sort is used in a different context typescript thinks that orderBy can change...
	if (vendor.orderBy) {
		const orderBy = vendor.orderBy?.bind(vendor);
		products = products.sort((a, b) => {
			return orderBy(a).localeCompare(orderBy(b));
		});
	}

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
}

const getFilesFromInput = (inputID: string) => {
	const form = document.getElementById('myform');
	const input = form?.querySelector<HTMLInputElement>(`#${inputID}`);
	return input?.files ?? undefined;
}

const loadVendorFiles = async (filter?: <P extends Product>(vendor: Vendor<P>) => boolean) => {
	const vendorInventory: VendorProducts = {};
	await forEachVendorAsync(async (key, vendor) => {
		if (filter && !filter(vendor)) {
			logger.debug(`[SKIP] load not applicable to ${vendor.name}`);
			return;
		}
		const files = getFilesFromInput(vendor.name);
		if (!files || !files[0]) {
			logger.debug(`[SKIP] no files selected for ${vendor.name}`);
			return;
		}
		const products = await parseFileAsCSV(files[0], vendor);
		if (products) {
			vendorInventory[key] = products;
		}
	});
	return vendorInventory;
}

// Updates existing items in inventory
// The full inventory is not downloaded, only updated rows
const updateInventoryAction = async (options: { maxQuantity: number }) => {
	const shopifyInventoryFiles = getFilesFromInput('shopify-inventory');
	if (!shopifyInventoryFiles) {
		throw new ExpectedError('no shopify inventory CSV selected');
	}
	const shopifyInventoryCSV = await parseFilesAsCSV(shopifyInventoryFiles, SHOPIFY_INVENTORY_OPTIONS);
	const vendorInventory = await loadVendorFiles(vendor => vendor.canUpdateInventory());

	const shopifyInventoryUpdates = updateInventory(shopifyInventoryCSV, vendorInventory, options)
	if (!shopifyInventoryUpdates.length) {
		logger.log('[DONE] Nothing to download');
		return 'Nothing to download';
	}
	logger.log('[DONE] Downloading inventory CSV');
	const text = csv.unparse(shopifyInventoryUpdates);
	downloadTextFile(text, DOWNLOAD_INVENTORY_FILE_NAME, 'text/csv');
}

const updateProductsAction = async (options: { updateImages: boolean }) => {
	const shopifyProductsFiles = getFilesFromInput('shopify-products');
	if (!shopifyProductsFiles) {
		throw new ExpectedError('no shopify products CSV selected');
	}
	const shopifyProductsCSV = await parseFilesAsCSV(shopifyProductsFiles, SHOPIFY_PRODUCTS_OPTIONS);
	const shopifyProducts = convertShopifyProductsToInternal(shopifyProductsCSV);
	const vendorProducts = await loadVendorFiles();
	const updatedProducts = updateProducts(shopifyProducts, vendorProducts, options);
	const shopifyProductsCSVExport = convertShopifyProductsToExternal(updatedProducts, { onlyEdited: true });

	if (!shopifyProductsCSVExport.length) {
		logger.log('[DONE] Nothing to download');
		return 'Nothing to download';
	}
	logger.log('[DONE] Downloading products CSV');
	const text = csv.unparse(shopifyProductsCSVExport, {
		// trim additional temp metadata like parsed barcode
		columns: SHOPIFY_PRODUCTS_OPTIONS.expectedHeaders
	});
	downloadTextFile(text, DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME, 'text/csv');
}

const addProductsAction = async (_options?: undefined) => {
	const shopifyProductsFiles = getFilesFromInput('shopify-products');
	if (!shopifyProductsFiles) {
		throw new ExpectedError('no shopify products CSV selected');
	}
	const shopifyProductsCSV = await parseFilesAsCSV(shopifyProductsFiles, SHOPIFY_PRODUCTS_OPTIONS);
	const shopifyProducts = convertShopifyProductsToInternal(shopifyProductsCSV);
	const vendorProducts = await loadVendorFiles(vendor => vendor.canAddProducts());
	const newProducts = addProducts(shopifyProducts, vendorProducts);
	const shopifyProductsCSVExport = convertShopifyProductsToExternal(newProducts, { onlyEdited: true });
	if (!shopifyProductsCSVExport.length) {
		logger.log('[DONE] Nothing to download');
		return 'Nothing to download';
	}
	logger.log('[DONE] Downloading products CSV');
	const text = csv.unparse(shopifyProductsCSVExport, {
		// trim additional temp metadata like parsed barcode
		columns: SHOPIFY_PRODUCTS_OPTIONS.expectedHeaders
	});
	downloadTextFile(text, DOWNLOAD_PRODUCTS_FILE_NAME, 'text/csv');
}

function App() {
	const [alert, setAlert] = useState<{ header: string, message?: ReactNode, hasClose?: boolean } | null>(null);
	const INITIAL_STOCK_CAP = 5;
	const [maxQuantity, setMaxQuantity] = useState(INITIAL_STOCK_CAP);
	const [updateImages, setUpdateImages] = useState(false);
	const onError = (err: Error | unknown) => {
		logger.error(err);
		const message = err instanceof ExpectedError ? err.message
			: err instanceof Error ? err.stack
				: undefined;
		setAlert({ header: 'Error', message });
	}
	const withLoading = <O extends unknown[],>(loadingMessage: string, fn: (...args: O) => ReactNode | void, ...args: O) => {
		return async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
			e.preventDefault();
			e.stopPropagation();

			setAlert({
				hasClose: false, header: loadingMessage || 'Loading...', message: (
					<>
						<Spinner />
					</>
				)
			})

			try {
				const info = await fn(...args);
				if (info) {
					setAlert({ header: 'Info', message: info });
				} else {
					setAlert(null);
				}
			} catch (err) {
				onError(err);
			}
		}
	}
	return (
		<div className="App">
			<header className="App-header">
				{alert ? <Alert header={alert.header} message={alert.message} hasClose={alert.hasClose} onClose={() => setAlert(null)} /> : null}
				<form style={{ pointerEvents: alert ? 'none' : undefined }} id="myform" className="form" onSubmit={e => { e.preventDefault() }}>
					<h2>Shopify Inventory</h2>
					<label htmlFor="shopify-inventory">{SHOPIFY_INVENTORY_OPTIONS.importLabel} </label>
					<input type="file" multiple accept=".csv,.zip" id="shopify-inventory" name="shopify-inventory" />
					<p />
					<h2>Shopify Products</h2>
					<label htmlFor="shopify-products">{SHOPIFY_PRODUCTS_OPTIONS.importLabel} </label>
					<input type="file" multiple accept=".csv,.zip" id="shopify-products" name="shopify-products" />
					<p />
					<h2>Vendor Inventory</h2>
					{Object.values(vendors).map(vendor =>
						<div key={vendor.name}>
							<label className="vendor-label" htmlFor={vendor.name}>{vendor.importLabel}</label>
							<input type="file" accept=".csv,.zip" id={vendor.name} name={vendor.name} />
							<p />
						</div>
					)}
					<h2>Settings</h2>
					<label htmlFor="maxquantity" style={{ paddingRight: '5px' }}>
						Maximum stock level
					</label>
					<input
						id="maxquantity"
						type="number"
						value={maxQuantity}
						onChange={e => setMaxQuantity(Number(e.target.value))}
					/>
					<p />
					<label htmlFor="updateImages" style={{ paddingRight: '5px' }}>
						Update variant images
					</label>
					<input
						id="updateImages"
						type="checkbox"
						value={String(updateImages)}
						onChange={e => setUpdateImages(e.target.value === 'false' ? true : false)}
					/>
					<p />
					<button
						onClick={withLoading('Generating updated inventory...', updateInventoryAction, { maxQuantity })}
						style={{ backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%' }}
					>
						Download Inventory CSV (Update Quantity)
					</button>
					<p />
					<button
						onClick={withLoading('Generating new products...', addProductsAction)}
						style={{ backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%' }}
					>
						Download Products CSV (Add missing products)
					</button>
					<p />
					<button
						onClick={withLoading('Generating updated products...', updateProductsAction, { updateImages })}
						style={{ backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%' }}
					>
						Download Products CSV (Edit products)
					</button>
					<p />
					<p />
				</form>
			</header>
			<div className="version-footer">
				Version: {new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long' }).format(+process.env.BUILD_TIME!)}
			</div>
		</div>
	);
}

export default App;
