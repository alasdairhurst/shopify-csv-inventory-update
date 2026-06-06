import { useState } from 'react';
import he from 'he';
import './App.css';
import Spinner from './components/Spinner.jsx';
import vendors from './vendors';
import Alert from './components/Alert.tsx';
import {
	PARENT_SYMBOL,
	BARCODE_DOES_NOT_APPLY,
	DOWNLOAD_INVENTORY_FILE_NAME,
	DOWNLOAD_PRODUCTS_FILE_NAME,
	DOWNLOAD_PRODUCTS_UPDATE_FILE_NAME
} from './utils/constants.js';
import {
	DEFAULT_SHOPIFY_PRODUCT,
	convertShopifyProductsToExternal,
	convertShopifyProductsToInternal,
	getShopifyProductAndParent,
	getShopifyProductParsedBarcode
} from './shopify/products.js';
import {
	SHOPIFY_INVENTORY_ON_HAND_CURRENT,
	SHOPIFY_INVENTORY_ON_HAND_NEW,
	SHOPIFY_INVENTORY_OPTIONS,
	matchInventory
} from './shopify/inventory.js';
import { readZip } from './files/zip.js'
import { downloadTextFile } from './files/download.js';
import logger from './utils/logger.js';
import * as csv from './files/csv.js';
import ExpectedError from './utils/ExpectedError.js';
import {
	parseSKU,
	escapeSKU,
	parseBarcode,
	escapeBarcode,
	roundPrice
} from './utils/helpers.js';
import { isOnSale } from './shopify/products.js';

const SHOPIFY_PRODUCTS_OPTIONS = {
	orderBy: item => item.Handle,
	importLabel: 'Shopify products CSV',
	name: 'shopify-products',
	expectedHeaders: Object.keys(DEFAULT_SHOPIFY_PRODUCT)
};

async function parseFilesAsCSV(files, vendor) {
	const allFiles = await Promise.all(Array.from(files).map(f => parseFileAsCSV(f, vendor)));

	let csv = [].concat(...allFiles);
	if (vendor?.orderBy) {
		csv = csv.sort((a, b) => {
			return vendor.orderBy(a).localeCompare(vendor.orderBy(b));
		});
	}
	return csv;
}

async function parseFileAsCSV(file, vendor) {
	if (!file) return;

	if (file.name.endsWith('.zip')) {
		file = await readZip(file);
	}

	if (!file.name.endsWith('.csv')) {
		throw new Error('Unknown file type', file.name);
	}

	const reader = new FileReader();
	// Read the file content synchronously
	reader.readAsText(file);
	await new Promise(resolve => {
		reader.onload = resolve;
	});

	let fileContent = reader.result; // Get the file content
	let headerRow = '';
	// Add headers when csv is missing them
	if (vendor?.forceHeaders) {
		headerRow = vendor.forceHeaders.join(',') + '\n';
	}
	if (vendor?.htmlDecode) {
		fileContent = he.decode(fileContent);
	}

	let [csvObj, headers] = await csv.parseString(headerRow + fileContent);

	// Check the headers as soon as we parse the csv before we use any properties.
	if (vendor?.expectedHeaders) {
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
			const expected = vendor.expectedHeaders.map(JSON.stringify).join('\nor\n');
			throw new ExpectedError(`Did you pick the right file for ${vendor.importLabel}?\n CSV headers don't look right.\n\n  Expected:\n ${expected}\n\n  Got:\n ${JSON.stringify(headers)}`);
		}

	}

	if (vendor?.parseImport) {
		csvObj = vendor.parseImport(csvObj);
	}
	if (vendor?.orderBy) {
		csvObj = csvObj.sort((a, b) => {
			return vendor.orderBy(a).localeCompare(vendor.orderBy(b));
		});
	}
	if (vendor?.getVariantCorrelationId) {
		const parents = {};
		for (const item of csvObj) {

			const id = vendor.getVariantCorrelationId(item);
			if (parents[id]) {
				item[PARENT_SYMBOL] = parents[id];
			} else if (id) {
				parents[id] = item;
			}
		}
	}

	vendor.getParsedBarcode = (product) => {
		if (!vendor.getBarcode) {
			return BARCODE_DOES_NOT_APPLY;
		}
		if (!('_parsedBarcode' in product)) {
			product._parsedBarcode = parseBarcode(vendor.getBarcode(product));
		}
		return product._parsedBarcode;
	}

	return csvObj;
}

const getFiles = (inputID) => {
	const form = document.getElementById('myform');
	const input = form?.querySelector(`#${inputID}`);
	return input?.files || [];
}

// Updates existing items in inventory
// The full inventory is not downloaded, only updated rows
const updateInventory = async (e, { maxQuantity }) => {
	const shopifyInventoryFiles = getFiles('shopify-inventory');
	if (!shopifyInventoryFiles.length) {
		throw new ExpectedError('no shopify inventory CSV selected');
	}
	const shopifyInventoryCSV = await parseFilesAsCSV(shopifyInventoryFiles, SHOPIFY_INVENTORY_OPTIONS);
	const shopifyInventoryUpdates = [];
	for (const vendor of vendors) {
		if (!vendor.updateInventory) {
			logger.log(`[SKIP] inventory update not applicable to ${vendor.name}`);
			continue;
		}
		const vendorInventory = getFiles(vendor.name);
		let vendorInventoryCSV = await parseFileAsCSV(vendorInventory[0], vendor);
		if (!vendorInventoryCSV) {
			logger.log(`[SKIP] no inventory file selected for ${vendor.name}`);
			continue;
		}

		for (const vendorItem of vendorInventoryCSV) {
			const vendorItemSKU = parseSKU(vendor.getSKU(vendorItem));
			if (!vendorItemSKU) {
				continue;
			}

			const shopifyItem = shopifyInventoryCSV.find(r => {
				return !!matchInventory(r, vendor, vendorItem)
			});

			if (!shopifyItem) {
				logger.debug(`[NOT FOUND] ${vendor.name} SKU ${vendorItemSKU} in shopify inventory`);
				continue;
			}
			logger.debug(`[FOUND] ${vendor.name} SKU ${vendorItemSKU} in shopify inventory`);
			let updated = false

			// Update quantity

			// Cap the new quantity
			const vendorItemQuantity = Math.min(vendor.getQuantity(vendorItem), maxQuantity);
			const shopifyItemQuantity = +shopifyItem[SHOPIFY_INVENTORY_ON_HAND_CURRENT];
			if (shopifyItemQuantity === vendorItemQuantity) {
				logger.debug(`[QUANTITY MATCH] ${vendor.name} SKU ${vendorItemSKU} quantity ${vendorItemQuantity} matches shopify inventory: ${shopifyItemQuantity}`);
			} else {
				logger.log(`[QUANTITY UPDATE] ${vendor.name} SKU ${vendorItemSKU} quantity ${vendorItemQuantity} differs in shopify inventory: ${shopifyItemQuantity}`);
				shopifyItem[SHOPIFY_INVENTORY_ON_HAND_NEW] = vendorItemQuantity;
				updated = true;
			}

			// If there are any updates, push to updates array
			if (updated) {
				shopifyInventoryUpdates.push(shopifyItem);
			}
		}
	}
	if (!shopifyInventoryUpdates.length) {
		logger.log('[DONE] Nothing to download');
		return 'Nothing to download';
	}
	logger.log('[DONE] Downloading inventory CSV');
	const text = csv.unparse(shopifyInventoryUpdates);
	downloadTextFile(text, DOWNLOAD_INVENTORY_FILE_NAME, 'text/csv');
}

const updateProducts = async (e, { updateImages }) => {
	const shopifyProductsFiles = getFiles('shopify-products');
	if (!shopifyProductsFiles.length) {
		throw new ExpectedError('no shopify products CSV selected');
	}
	const shopifyProductsCSV = await parseFilesAsCSV(shopifyProductsFiles, SHOPIFY_PRODUCTS_OPTIONS);
	const shopifyProducts = convertShopifyProductsToInternal(shopifyProductsCSV);

	for (const vendor of vendors) {

		if (!vendor.updateProducts) {
			logger.log(`[SKIP] product update not applicable to ${vendor.name}`);
			continue;
		}
		const vendorProductFiles = getFiles(vendor.name);
		let vendorProductCSV = await parseFileAsCSV(vendorProductFiles[0], vendor);
		if (!vendorProductCSV) {
			logger.log(`[SKIP] no product file selected for ${vendor.name}`);
			continue;
		}

		logger.log(`Reading ${vendorProductCSV.length} items from product file for ${vendor.name}`);
		for (const vendorProduct of vendorProductCSV) {
			const vendorProductSKU = parseSKU(vendor.getSKU(vendorProduct));
			if (!vendorProductSKU) {
				logger.debug(`[NOT FOUND] ${vendor.name} no SKU found for product`, vendorProduct);
				continue;
			}

			const vendorProductTitle = vendor.getTitle?.(vendorProduct) || '';
			const vendorProductBarcode = vendor.getParsedBarcode(vendorProduct);
			const vendorProductLabel = `${vendorProductSKU} (${vendorProductTitle}/${vendorProductBarcode})`;
			const { shopifyProduct, shopifyParent, shopifyProductLabel } = getShopifyProductAndParent(
				shopifyProducts, vendor, vendorProduct
			);

			if (!shopifyProduct) {
				logger.debug(`[NOT FOUND] ${vendor.name} SKU ${vendorProductLabel} in shopify products`);
				continue;
			}

			// TODO: Is it possible to run an update on the parent row to change the shopify parent?
			const isParent = shopifyParent['Variant SKU'] === vendorProductSKU;

			// Update price
			if (!vendor.getPrice) {
				// logger.debug(`[WARN] cannot update price for vendor ${vendor.name} getPrice not implemented`);
			} else {
				const vendorProductPrice = roundPrice(vendor.getPrice(vendorProduct)).toString();
				const shopifyProductPrice = shopifyProduct['Variant Price'].toString();

				if (shopifyProductPrice === vendorProductPrice) {
					logger.debug(`[PRICE MATCH] ${vendor.name} SKU ${vendorProductLabel} price ${vendorProductPrice} matches shopify product ${shopifyProductLabel}: ${shopifyProductPrice}`);
				} else {
					logger.log(`[PRICE UPDATE] ${vendor.name} SKU ${vendorProductLabel} price ${vendorProductPrice} differs in shopify product ${shopifyProductLabel}: ${shopifyProductPrice}`);
					shopifyProduct['Variant Price'] = vendorProductPrice;
					shopifyParent.edited = true;
				}
			}

			// Update barcode
			if (!vendor.getBarcode) {
				// logger.debug(`[WARN] cannot update barcode for vendor ${vendor.name} getBarcode not implemented`);
			} else {
				const shopifyProductBarcode = getShopifyProductParsedBarcode(shopifyProduct);
				if (shopifyProductBarcode === vendorProductBarcode) {
					logger.debug(`[BARCODE MATCH] ${vendor.name} SKU ${vendorProductLabel} barcode matches shopify product ${shopifyProductLabel}`);
					// even if the barcode matches it may not be nicely formatted. enable this once for existing products, then it's already handled
					// check the raw value to avoid updating absolutely everything
					// if ((shopifyProduct['Variant Barcode'] !== escapeBarcode(vendorProductBarcode))) {
					//   logger.log(`[BARCODE UPDATE] ${vendor.name} SKU ${vendorProductLabel} raw barcode differs in shopify product (${shopifyProduct['Variant Barcode']}) ${shopifyProductLabel}`);
					//   shopifyProduct['Variant Barcode'] = escapeBarcode(vendorProductBarcode);
					//   shopifyParent.edited = true;
					// }
				} else if (vendorProductBarcode === BARCODE_DOES_NOT_APPLY) {
					logger.debug(`[BARCODE UPDATE IGNORED] ${vendor.name} SKU ${vendorProductLabel} barcode missing but exists in shopify product ${shopifyProductLabel}`);
				} else {
					logger.log(`[BARCODE UPDATE] ${vendor.name} SKU ${vendorProductLabel} barcode differs in shopify product ${shopifyProductLabel}`);
					shopifyProduct['Variant Barcode'] = escapeBarcode(vendorProductBarcode);
					shopifyParent.edited = true;
				}
			}

			// Update tags
			const tags = shopifyParent.primaryRow.Tags.split(', ');

			// Ensure the product has a vendor tag
			if (!tags.includes(vendor.name)) {
				logger.log(`[TAGS UPDATE] shopify product ${shopifyProductLabel} tags are missing ${vendor.name} vendor: [${tags}]`);
				tags.push(vendor.name);
				shopifyParent.primaryRow.Tags = tags.join(', ');
				shopifyParent.edited = true;
			}

			// Set sale if any variant seen has a sale. then we'll use that to update the parent tags
			// This expects all variants from the vendor to be iterated so by the time we get to the
			// last one we'll know for sure. This may stil end up with an update if the tag is removed
			// before a later sale is seen.
			shopifyParent.sale = shopifyParent.sale ?? isOnSale(shopifyProduct);

			if (shopifyParent.sale && !tags.includes('sale')) {
				logger.log(`[TAGS UPDATE] shopify product ${shopifyProductLabel} tags are missing sale: [${tags}]`);
				tags.push('sale');
				shopifyParent.primaryRow.Tags = tags.join(', ');
				shopifyParent.edited = true;
			} else if (!shopifyParent.sale && tags.includes('sale')) {
				logger.log(`[TAGS UPDATE] shopify product ${shopifyProductLabel} tags should not have sale: [${tags}]`);
				tags.splice(tags.indexOf('sale'), 1);
				shopifyParent.primaryRow.Tags = tags.join(', ');
				shopifyParent.edited = true;
			}

			// Add main image on parent
			if (!vendor.getMainImageURL || !isParent) {
				// logger.debug(`[WARN] cannot update variant images for vendor ${vendor.name} getMainImageURL not implemented`);
			} else {
				// Edit the image if there is none set or we want to manually update them
				if (!shopifyProduct['Image Src'] || updateImages) {
					logger.log(`[IMAGE UPDATE] ${vendor.name} SKU ${vendorProductLabel} editing main image on product ${shopifyProductLabel}`);
					shopifyProduct['Image Src'] = vendor.getMainImageURL(vendorProduct);
					shopifyParent.edited = true;
				}
			}

			// Add variant image that is shown when you select a variant
			if (!vendor.getVariantImageURL) {
				// logger.debug(`[WARN] cannot update variant images for vendor ${vendor.name} getVariantImageURL not implemented`);
			} else {
				// Edit the image if there is none set or we want to manually update them
				if (!shopifyProduct['Variant Image'] || updateImages) {
					logger.log(`[IMAGE UPDATE] ${vendor.name} SKU ${vendorProductLabel} editing variant image on product ${shopifyProductLabel}`);
					shopifyProduct['Variant Image'] = vendor.getVariantImageURL(vendorProduct);
					shopifyParent.edited = true;
				}
			}

			// Update images. Do this for every sub item??
			if (!vendor.getAdditionalImages) {
				// logger.debug(`[WARN] cannot update additional images for vendor ${vendor.name} getAdditionalImages not implemented`);
			} else {
				const shopifyProductAdditionalImages = shopifyParent.secondaryRows.filter(row => {
					return row['Image Src'] && !row['Title'] && !row['Variant SKU'];
				});

				// Currently we only add new secondary images if there are no existing ones.
				// It's much harder to check if the images match between shopify and vendor because
				// the URL changes on import and we don't want to modify every listing every time.
				const vendorProductImages = vendor.getAdditionalImages(vendorProduct);
				if (!shopifyProductAdditionalImages.length && vendorProductImages.length) {
					logger.log(`[ADDITIONAL IMAGE UPDATE] ${vendor.name} SKU ${vendorProductLabel} adding ${vendorProductImages.length} more images to product ${shopifyProductLabel}`);
					// Add new images
					for (const image of vendorProductImages) {
						shopifyParent.secondaryRows.push({
							...DEFAULT_SHOPIFY_PRODUCT,
							Handle: shopifyParent.primaryRow.Handle,
							'Image Src': image,
						});
						shopifyParent.edited = true;
					};
				}
			}
		}
	}

	const shopifyProductsCSVExport = convertShopifyProductsToExternal(shopifyProducts, { onlyEdited: true });
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

const addProducts = async (e, { maxQuantity }) => {
	const shopifyProductsFiles = getFiles('shopify-products');
	if (!shopifyProductsFiles.length) {
		throw new ExpectedError('no shopify products CSV selected');
	}
	const shopifyProductsCSV = await parseFilesAsCSV(shopifyProductsFiles, SHOPIFY_PRODUCTS_OPTIONS);
	const shopifyProducts = convertShopifyProductsToInternal(shopifyProductsCSV);

	for (const vendor of vendors) {
		if (!vendor.addProducts) {
			logger.log(`[SKIP] add product not applicable to ${vendor.name}`);
			continue;
		}
		const vendorProductFiles = getFiles(vendor.name);
		let vendorProductCSV = await parseFileAsCSV(vendorProductFiles[0], vendor);
		if (!vendorProductCSV) {
			logger.log(`[SKIP] no product file selected for ${vendor.name}`);
			continue;
		}

		logger.log(`[INFO] loading ${vendorProductCSV.length} items from ${vendor.name}`);
		for (const vendorProduct of vendorProductCSV) {
			const vendorProductSKU = parseSKU(vendor.getSKU(vendorProduct));
			if (!vendorProductSKU) {
				logger.debug(`[NOT FOUND] ${vendor.name} no SKU found for product`, vendorProduct);
				continue;
			}

			const Title = vendor.getTitle(vendorProduct).trim();
			const vendorProductBarcode = vendor.getParsedBarcode(vendorProduct);
			const vendorProductLabel = `${vendorProductSKU} (${Title}/${vendorProductBarcode})`;
			const { shopifyProduct } = getShopifyProductAndParent(
				shopifyProducts, vendor, vendorProduct
			);

			if (shopifyProduct) {
				logger.debug(`[FOUND] ${vendor.name} SKU ${vendorProductLabel} in shopify products`);
				continue;
			}

			const vendorParent = vendorProduct[PARENT_SYMBOL];
			const { shopifyParent } = vendorParent ? getShopifyProductAndParent(
				shopifyProducts, vendor, vendorParent
			) : { shopifyParent: undefined };
			const isNewProduct = !shopifyParent;

			// Generate a handle
			const Handle = isNewProduct
				? vendor.name + '-' + Title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-)|(-$)/g, '').replace(/-+/g, '-')
				: shopifyParent.primaryRow.Handle;

			let product;
			if (isNewProduct) {
				const features = vendor.getFeatures?.(vendorProduct) || [];
				const featureHTML = features.length ? `<br><ul>${features.map(f => `<li><p>${f}</p></li>`).join('')}</ul>` : '';

				// create product as parent
				product = {
					Title,
					Handle,
					'Body (HTML)': featureHTML + vendor.getDescription(vendorProduct),
					Vendor: vendor.getVendor(vendorProduct),
					'Product Category': 'Sporting Goods',
					Type: vendor.getType?.(vendorProduct) ?? 'Sporting Goods',
					Published: 'TRUE',
					'Image Src': vendor.getMainImageURL(vendorProduct)
				};
				logger.log(`[ADDING] ${vendor.name} SKU ${vendorProductLabel} to shopify`);
			} else {
				logger.log(`[ADDING] ${vendor.name} SKU ${vendorProductLabel} to existing product in shopify`);
			}

			const price = roundPrice(vendor.getPrice(vendorProduct));
			product = {
				...DEFAULT_SHOPIFY_PRODUCT,
				...product,
				Handle,
				'Variant SKU': escapeSKU(vendorProductSKU),
				'Variant Inventory Tracker': 'shopify',
				// maybe it works, maybe it doesnt?
				'Variant Inventory Qty': Math.min(vendor.getQuantity(vendorProduct), maxQuantity),
				'Variant Inventory Policy': 'deny',
				'Variant Fulfillment Service': 'manual',
				'Variant Price': price,
				'Variant Compare At Price': vendor.getRRP ? roundPrice(vendor.getRRP(vendorProduct, vendor)) : price,
				'Variant Requires Shipping': 'TRUE',
				'Variant Taxable': vendor.getTaxable?.(vendorProduct) ? 'TRUE' : 'FALSE',
				'Variant Tax Code': vendor.getTaxCode?.(vendorProduct),
				'Variant Barcode': escapeBarcode(vendorProductBarcode),
				'Gift Card': 'FALSE',
				'Variant Weight Unit': 'kg',
				'Included / United Kingdom': 'TRUE',
				'Status': 'active'
			};

			if (vendor.getWeight) {
				product['Variant Grams'] = Math.min(vendor.getWeight(vendorProduct), 999);
			}

			const variants = vendor.getVariants?.(vendorProduct);
			if (variants?.length) {
				// Add an image spepecifically for the variant if the vendor offers one to allow image changes when changing selection
				if (vendor.getVariantImageURL) {
					product['Variant Image'] = vendor.getVariantImageURL(vendorProduct);
				}

				for (let i = 0; i <= variants.length && i <= 3; i++) {
					if (variants[i]) {
						product[`Option${i + 1} Name`] = variants[i].name;
						product[`Option${i + 1} Value`] = variants[i].value;
					}
				}
			} else {
				product['Option1 Name'] = 'Title';
				product['Option1 Value'] = 'Default Title';
			}
			let additionalImages = [];
			if (vendor.getAdditionalImages) {
				additionalImages = vendor.getAdditionalImages(vendorProduct).map(image => ({
					...DEFAULT_SHOPIFY_PRODUCT,
					Handle,
					'Image Src': image,
				}))
			}

			// Add or update parent tags
			const tags = shopifyParent?.primaryRow.Tags.split(', ') ?? [];

			// Ensure any product has new in when importing a new product or variant
			if (!tags.includes('new in')) {
				tags.push('new in');
			}

			// Ensure any product has the vendor as a tag
			if (!tags.includes(vendor.name)) {
				tags.push(vendor.name);
			}

			// Ensure the sale tag is either set or not set
			// Check all the current rows with a price to see if any are already on sale
			const currentOnSale = isOnSale(product);
			const anyVariantOnSale = shopifyParent?.secondaryRows.some(product => {
				if (!product['Variant Price']) {
					return false;
				}
				return isOnSale(product);
			}) ?? false;
			const parentOnSale = shopifyParent && isOnSale(shopifyParent.primaryRow);
			const onSale = currentOnSale || anyVariantOnSale || parentOnSale;

			if (onSale && !tags.includes('sale')) {
				tags.push('sale');
			}

			if (!onSale && tags.includes('sale')) {
				tags.splice(tags.indexOf('sale'), 1);
			}


			if (vendor.getTags) {
				tags.push(...vendor.getTags(vendorProduct));
			}

			if (!isNewProduct) {
				shopifyParent.primaryRow.Tags = tags.join(', ');
				shopifyParent.secondaryRows.push(product);
				shopifyParent.secondaryRows.push(...additionalImages);
				shopifyParent.edited = true;
			} else {
				product.Tags = tags.join(', ');
				shopifyProducts.push({
					primaryRow: product,
					secondaryRows: additionalImages,
					edited: true
				});
			}
		}
	}

	const shopifyProductsCSVExport = convertShopifyProductsToExternal(shopifyProducts, { onlyEdited: true });
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
	const [alert, setAlert] = useState(null);
	const INITIAL_STOCK_CAP = 5;
	const [maxQuantity, setMaxQuantity] = useState(INITIAL_STOCK_CAP);
	const [updateImages, setUpdateImages] = useState(false);
	const onError = (err) => {
		logger.error(err);
		const message = err instanceof ExpectedError ? err.message : err.stack;
		setAlert({ header: 'Error', message });
	}
	const withLoading = (fn, options) => {
		const { loadingMessage, ...otherOptions } = options;
		return async (e) => {
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
				const info = await fn(e, otherOptions);
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
					{vendors.map(vendor => (
						<div key={vendor.name}>
							<label className="vendor-label" htmlFor={vendor.name}>{vendor.importLabel}</label>
							<input type="file" accept=".csv,.zip" id={vendor.name} name={vendor.name} />
							<p />
						</div>
					))}
					<h2>Settings</h2>
					<label htmlFor="maxquantity" style={{ paddingRight: '5px' }}>
						Maximum stock level
					</label>
					<input
						id="maxquantity"
						type="number"
						value={maxQuantity}
						onChange={e => setMaxQuantity(e.target.value)}
					/>
					<p />
					<label htmlFor="updateImages" style={{ paddingRight: '5px' }}>
						Update variant images
					</label>
					<input
						id="updateImages"
						type="checkbox"
						value={updateImages}
						onChange={e => setUpdateImages(e.target.value === 'false' ? true : false)}
					/>
					<p />
					<button
						onClick={withLoading(updateInventory, { maxQuantity, loadingMessage: 'Generating updated inventory...' })}
						style={{ backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%' }}
					>
						Download Inventory CSV (Update Quantity)
					</button>
					<p />
					<button
						onClick={withLoading(addProducts, { maxQuantity, loadingMessage: 'Generating new products...' })}
						style={{ backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%' }}
					>
						Download Products CSV (Add missing products)
					</button>
					<p />
					<button
						onClick={withLoading(updateProducts, { updateImages, loadingMessage: 'Generating updated products...' })}
						style={{ backgroundColor: 'green', color: 'white', height: '50px', fontSize: '20px', width: '100%' }}
					>
						Download Products CSV (Edit products)
					</button>
					<p />
					<p />
				</form>
			</header>
			<div className="version-footer">
				Version: {new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'long' }).format(+process.env.BUILD_TIME)}
			</div>
		</div>
	);
}

export default App;
