import { ReactNode, useState } from 'react';
import { vendors, Vendor, Product } from './vendors/index.ts';
import Spinner from './components/Spinner.tsx';
import {
	shopifyVendor,
	shopifyInventoryVendor
} from './vendors/index.ts';
import Alert from './components/Alert.tsx';
import {
	DOWNLOAD_INVENTORY_FILE_NAME,
	DOWNLOAD_PRODUCTS_FILE_NAME,
	DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME
} from './utils/constants.ts';
import {
	convertShopifyProductsToExternal,
	convertShopifyProductsToInternal
} from './shopify/products.ts';
import { readZip } from './files/zip.ts'
import { downloadTextFile } from './files/download.ts';
import logger from './utils/logger.ts';
import * as csv from './files/csv.ts';
import ExpectedError from './utils/ExpectedError.ts';
import updateInventory from './functions/updateInventory.ts';
import updateProducts from './functions/updateProducts.ts';
import addProducts from './functions/addProducts.ts';
import parseProductsCSV from './functions/parseProductsCSV.ts';
import sortProducts from './functions/sortProducts.ts';
import './App.css';

async function parseFilesAsCSV<P extends Product>(files: FileList, vendor: Vendor<P>) {
	const products = (await Promise.all(
		Array.from(files).map(f => parseFileAsCSV(f, vendor))
	))
		.filter(f => f !== undefined)
		.flat(1);
	// Sort across all files
	sortProducts(products, vendor);
	return products;
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

	return parseProductsCSV(reader.result as string, vendor);
}

const getFilesFromInput = (inputID: string) => {
	const form = document.getElementById('myform');
	const input = form?.querySelector<HTMLInputElement>(`#${inputID}`);
	return input?.files ?? undefined;
}

const loadVendorFiles = async (filter?: (vendor: Vendor) => boolean) => {
	const vendorInventory: Record<string, Product[]> = {};
	for (const vendor of vendors) {
		if (filter && !filter(vendor)) {
			logger.debug(`[SKIP] load not applicable to ${vendor.name}`);
			continue;
		}
		const files = getFilesFromInput(vendor.name);
		if (!files || !files[0]) {
			logger.debug(`[SKIP] no files selected for ${vendor.name}`);
			continue;
		}
		const products = await parseFileAsCSV(files[0], vendor);
		if (products) {
			vendorInventory[vendor.name] = products;
		}
	}
	return vendorInventory;
}

// Updates existing items in inventory
// The full inventory is not downloaded, only updated rows
const updateInventoryAction = async (options: { maxQuantity: number }) => {
	const shopifyInventoryFiles = getFilesFromInput('shopify-inventory');
	if (!shopifyInventoryFiles) {
		throw new ExpectedError('no shopify inventory CSV selected');
	}
	const shopifyInventoryCSV = await parseFilesAsCSV(shopifyInventoryFiles, shopifyInventoryVendor);
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
	const vendorProducts = await loadVendorFiles();
	const shopifyProductsCSV = await parseFilesAsCSV(shopifyProductsFiles, shopifyVendor);

	const shopifyProducts = convertShopifyProductsToInternal(shopifyProductsCSV);
	const updatedProducts = updateProducts(shopifyProducts, vendorProducts, options);
	const shopifyProductsCSVExport = convertShopifyProductsToExternal(updatedProducts, { onlyEdited: true });

	if (!shopifyProductsCSVExport.length) {
		logger.log('[DONE] Nothing to download');
		return 'Nothing to download';
	}
	logger.log('[DONE] Downloading products CSV');
	const text = csv.unparse(shopifyProductsCSVExport, {
		// trim additional temp metadata like parsed barcode
		columns: shopifyVendor.expectedHeaders
	});
	downloadTextFile(text, DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME, 'text/csv');
}

const addProductsAction = async (_options?: undefined) => {
	const shopifyProductsFiles = getFilesFromInput('shopify-products');
	if (!shopifyProductsFiles) {
		throw new ExpectedError('no shopify products CSV selected');
	}
	const shopifyProductsCSV = await parseFilesAsCSV(shopifyProductsFiles, shopifyVendor);
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
		columns: shopifyVendor.expectedHeaders
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
					<label htmlFor="shopify-inventory">{shopifyInventoryVendor.importLabel} </label>
					<input type="file" multiple accept=".csv,.zip" id="shopify-inventory" name="shopify-inventory" />
					<p />
					<h2>Shopify Products</h2>
					<label htmlFor="shopify-products">{shopifyVendor.importLabel} </label>
					<input type="file" multiple accept=".csv,.zip" id="shopify-products" name="shopify-products" />
					<p />
					<h2>Vendor Inventory</h2>
					{vendors.map(vendor =>
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
