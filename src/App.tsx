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
import { readZip } from './files/zip.ts'
import { downloadTextFile } from './files/download.ts';
import logger from './utils/logger.ts';
import * as csv from './files/csv.ts';
import ExpectedError from './utils/ExpectedError.ts';
import updateInventory from './functions/updateInventory.ts';
import updateProducts from './functions/updateProducts.ts';
import addProducts from './functions/addProducts.ts';
import { parseProductsCSVs } from './functions/parseProductsCSV.ts';
import './App.css';

async function readCSVFileList(files: FileList) {
	const csvs: string[] = [];
	for (let file of Array.from(files)) {
		// If the file is a zip, unzip it.
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

		csvs.push(reader.result as string);
	}
	return csvs;
}

const getFileListFromInput = (inputID: string) => {
	const form = document.getElementById('myform');
	const input = form?.querySelector<HTMLInputElement>(`#${inputID}`);
	return input?.files ?? undefined;
}

const loadVendorProducts = async (filter?: (vendor: Vendor) => boolean) => {
	const vendorInventory: Record<string, Product[]> = {};
	for (const vendor of vendors) {
		if (filter && !filter(vendor)) {
			logger.debug(`[SKIP] load not applicable to ${vendor.name}`);
			continue;
		}
		const files = getFileListFromInput(vendor.name);
		if (!files || !files[0]) {
			logger.debug(`[SKIP] no files selected for ${vendor.name}`);
			continue;
		}
		const csvs = await readCSVFileList(files);
		const products = await parseProductsCSVs(csvs, vendor);
		if (products) {
			vendorInventory[vendor.name] = products;
		}
	}
	return vendorInventory;
}

// Updates existing items in inventory
// The full inventory is not downloaded, only updated rows
const updateInventoryAction = async (options: { maxQuantity: number }) => {
	const shopifyInventoryFiles = getFileListFromInput('shopify-inventory');
	if (!shopifyInventoryFiles) {
		throw new ExpectedError('no shopify inventory CSV selected');
	}
	const shopifyInventoryCSV = await readCSVFileList(shopifyInventoryFiles);
	const shopifyInventory = await parseProductsCSVs(shopifyInventoryCSV, shopifyInventoryVendor);
	const vendorInventory = await loadVendorProducts(vendor => vendor.canUpdateInventory());

	const shopifyInventoryUpdates = updateInventory(shopifyInventory, vendorInventory, options)

	if (!shopifyInventoryUpdates.length) {
		logger.log('[DONE] Nothing to download');
		return 'Nothing to download';
	}
	logger.log('[DONE] Downloading inventory CSV');
	const text = csv.unparse(shopifyInventoryUpdates);
	downloadTextFile(text, DOWNLOAD_INVENTORY_FILE_NAME, 'text/csv');
}

const updateProductsAction = async (options: { updateImages: boolean }) => {
	const shopifyProductsFiles = getFileListFromInput('shopify-products');
	if (!shopifyProductsFiles) {
		throw new ExpectedError('no shopify products CSV selected');
	}
	const vendorProducts = await loadVendorProducts();
	const shopifyProductsCSV = await readCSVFileList(shopifyProductsFiles);
	const shopifyProducts = await parseProductsCSVs(shopifyProductsCSV, shopifyVendor);

	const updatedProducts = updateProducts(shopifyProducts, vendorProducts, options);

	if (!updatedProducts.length) {
		logger.log('[DONE] Nothing to download');
		return 'Nothing to download';
	}
	logger.log('[DONE] Downloading products CSV');
	const text = csv.unparse(updatedProducts, {
		// trim additional temp metadata like parsed barcode
		columns: shopifyVendor.expectedHeaders
	});
	downloadTextFile(text, DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME, 'text/csv');
}

const addProductsAction = async (_options?: undefined) => {
	const shopifyProductsFiles = getFileListFromInput('shopify-products');
	if (!shopifyProductsFiles) {
		throw new ExpectedError('no shopify products CSV selected');
	}
	const vendorProducts = await loadVendorProducts(vendor => vendor.canAddProducts());
	const shopifyProductsCSV = await readCSVFileList(shopifyProductsFiles);
	const shopifyProducts = await parseProductsCSVs(shopifyProductsCSV, shopifyVendor);

	const newProducts = addProducts(shopifyProducts, vendorProducts);

	if (!newProducts.length) {
		logger.log('[DONE] Nothing to download');
		return 'Nothing to download';
	}
	logger.log('[DONE] Downloading products CSV');
	const text = csv.unparse(newProducts, {
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
