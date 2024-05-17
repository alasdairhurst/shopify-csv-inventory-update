const PARENT_SYMBOL = Symbol.for('parent');

const RM_LARGE_LETTER = 2;
const RM_SMALL_SHIPPING = 3.5;
const RM_LARGE_SHIPPING = 15;

// in milimeters
const RM_LARGE_LETTER_SIZE = { LENGTH: 38, WIDTH: 28, HEIGHT: 3 };

const blitzShipping = {
	16098: 42,
	16829: 15.84,
	21891: 18,
	21892: 18,
	21893: 18,
	4021: 15.84,
	12836: 15.84,
	6371: 42
};

const cartasShipping = item => {
	const isLL = +item.LENGTH <= RM_LARGE_LETTER_SIZE.LENGTH
		&& +item.WIDTH <= RM_LARGE_LETTER_SIZE.WIDTH
		&& +item.HEIGHT <= RM_LARGE_LETTER_SIZE.HEIGHT;
	if (isLL) {
		return RM_LARGE_LETTER;
	}
	return RM_SMALL_SHIPPING;
}

const cartasProductVAT = item => {
	const VATpc = +item.VAT.replace('%', '');
	const VAT = (VATpc / 100) + 1
	return VAT;
}

const vendors = [
	{
		name: "reydon",
		importLabel: "Reydon Stock CSV",
		updateInventory: true,
		getSKU: item => item.Code.replace('\n', ''),
		getQuantity: item => +item.Quantity,
		useTitleForMatching: true,
		// different CSVs have different columns
		getTitle: item => (item['Product Name']||item['Product_Name']).replace(/\([^()]*\)/g, '')
	},
	{
		name: 'reydon-products',
		importLabel: 'Reydon Products CSV',
		updateProducts: true,
		addProducts: true,
		useBarcodeForExclusiveMatching: true,
		useTitleForMatching: true,
		getTitle: item => item.Product_Name,
		getDescription: item => item.Description,
		getVendor: item => item.Brand,
		getSKU: item => item.Sku_Code.replace('\n', ''),
		getMainImageURL: item => item['Image_FTP'],
		getVariantImageURL: item => item['Image_FTP'],
		getQuantity: item => +item.Free_Stock,
		getTaxable: item => +item.VAT > 0,
		getRRP: item => +item.SRP,
		getPrice: item => {
			let shipping = RM_SMALL_SHIPPING;
			if (Math.max(item.Width_CM, item.Length_CM, item.Height_CM) >= 110) {
				shipping = RM_LARGE_SHIPPING;
			} else {
				const isLL = +item.Length_CM <= RM_LARGE_LETTER_SIZE.LENGTH
					&& +item.Width_CM <= RM_LARGE_LETTER_SIZE.WIDTH
					&& +item.Height_CM <= RM_LARGE_LETTER_SIZE.HEIGHT;
				if (isLL) {
					shipping = RM_LARGE_LETTER;
				}
			}
			return Math.ceil(+item.Your_Price * 1.45 * (1 + (+item.VAT / 100)) + shipping) - 0.01
		},
		getWeight: item => +item.Weight_KG,
		getVariants: item => {
			const variants = [];
			if (item.Size) {
				variants.push({
					name: 'Size',
					value: item.Size
				});
			}
			if (item.Colour) {
				variants.push({
					name: 'Colour',
					value: item.Colour
				});
			}
			return variants;
		},
		getTags: item => 'new in,reydon',
		getBarcode: item => item.Barcode.trim(),
		getParent: item => item.parent,
		getVariantCorrelationId: item => item.Product_Name,
		orderBy: item => item.Product_Name,
	},
	{
		"name": "cartas",
		"importLabel": "Cartas Inventory CSV",
		"headers": ["a", "b", "c", "d", "SKU", "Title", "f", "g", "Quantity", "h"],
		updateInventory: true,
		updateProducts: false,
		getSKU: item => item.SKU,
		getQuantity: item => Math.min(+item.Quantity, 50),
		useTitleForMatching: false,
		getTitle: item => item.Title
	},
	{
		name: 'cartas-products',
		importLabel: 'Cartas Products CSV',
		updateInventory: false,
		updateProducts: true,
		addProducts: true,
		useBarcodeForExclusiveMatching: false,
		getSKU: item => item.STATUS === 'LIVE' ? item.CODE.trim() : undefined, 
		getWeight: item => +item.WEIGHT.trim(),
		getQuantity: item => Math.min(+item.STOCK, 50),
		getType: item => item.CATEGORY.replace(item.BRAND.toUpperCase(), '').replace(/-/g, ' ').trim(),
		getBarcode: item => {
			const barcode = item.EAN.replace(/"/g, '').trim();
			if (barcode) {
				return `'${barcode}`;
			}
		},
		getPrice: item => {
			const VAT = cartasProductVAT(item);
			return Math.ceil(+item.TRADE_PRICE * 1.35 * VAT + cartasShipping(item)) - 0.01;
		},
		getRRP: item => {
			const VAT = cartasProductVAT(item);
			return Math.ceil((+item.TRADE_PRICE * 1.35 * VAT + cartasShipping(item)) * 1.2) - 0.01;
		},
		getTaxable: item => cartasProductVAT(item) > 1,
		getVendor: item => item.BRAND.trim(),
		getDescription: item => item.DESCRIPTION.replace(/^"/, '').replace(/"$/, '').trim(),
		getMainImageURL: item => item.MAIN_IMAGE.trim(),
		getTags: item => 'new in,cartas,cartas-new-csv',
		useTitleForMatching: false,
		getTitle: item => item.PRODUCT_NAME.trim(),
		getAdditionalImages: item => {
			const images = [];
			for (let i = 1; i<= 4; i++) {
				const image = item[`IMAGE_${i}`].trim();
				if (image) {
					images.push(image);
				}

			}
			return images;
		},
		getVariants: item => {
			const variants = [];
			const size = item.SIZE.trim();
			const colour = item.COLOUR.trim();
			if (size) {
				variants.push({
					name: 'Size',
					value: size
				});
			}
			if (colour) {
				variants.push({
					name: 'Colour',
					value: colour
				});
			}
			return variants;
		},
		getVariantCorrelationId: item => item.PERANT_ID || item.PARENT_ID,
	},
	{
		name: "unicorn",
		importLabel: "Unicorn CSV",
		updateInventory: true,
		updateProducts: true,
		useBarcodeForExclusiveMatching: true,
		getSKU: item => item.SKU,
		getQuantity: item => +item.QTY,
		getBarcode: item => item['Barcode EAN/UPC'],
		useTitleForMatching: false,
		getTitle: item => item.Description
	},
	{
		name: "muaythai",
		importLabel: "Muay Thai Boxing CSV",
		updateInventory: true,
		updateProducts: true,
		addProducts: true,
		useBarcodeForExclusiveMatching: true,
		getSKU: item => item.SKU,
		getBarcode: item => item.EAN,
		getQuantity: item => +item.Quantity,
		getTitle: item => item.Name,
		getWeight: item => +item.Weight,
		getPrice: item => Math.ceil(+item.Price * 1.2) - 0.01,
		getRRP: item => Math.ceil(+item.Price * 1.2) - 0.01,
		getDescription: item => item.Description,
		getVendor: item => item.Manufacturer,
		getMainImageURL: item => item['Main image'],
		getAdditionalImages: item => {
			const images = [];
			for (let i = 2; i<= 5; i++) {
				const image = item[`Image ${i}`];
				if (image) {
					images.push(image);
				}

			}
			return images;
		},
		getTags: item => 'mtb, new in',
		getVariants: item => [{
			name: 'Variant',
			value: item['Option value'],
		}],
		getVariantCorrelationId: item => item.Model,
		parseImport: items => {
			const csv = [];
			let parentItem;
			for (const item of items) {
				// variant parent
				if (!item.EAN && !item['Option EAN']) {
					parentItem = item;
					continue;
				}
				// singular
				if (item.EAN) {
					csv.push(item);
					continue;
				}
				// variant
				csv.push({
					...parentItem,
					SKU: item['Option EAN'], // change to SKU when they're done changing
					EAN: item['Option EAN'],
					Quantity: item['Option quantity'],
					'Option value': item['Option value']
				});
			}
			return csv;
		}
	},
	{
		name: "tuf",
		importLabel: "TUF CSV",
		updateInventory: true,
		updateProducts: true,
		addProducts: true,
		useBarcodeForExclusiveMatching: true,
		getSKU: item => item.SKU,
		getBarcode: item => item.SKU,
		getQuantity: item => item.STOCK === 'Y' ? 10 : item.STOCK === 'N' ? 0 : +item.STOCK,
		getTitle: item => {
			const lcName = item.Name.toLowerCase();
			let [code, ...details] = item['PARENT CODE'].split('-');
			details = details.map(str => {
				const lcDetail = str.toLowerCase();
				if (!str || lcName.includes(lcDetail)) {
					return null;
				}
				return lcDetail[0].toUpperCase() + lcDetail.substring(1);
			}).filter(x => !!x);

			let name = item.Name.replace('Tuf Wear', 'Tuf Wear Boxing');
			if (!name.startsWith('Tuf Wear Boxing')) {
				name = `Tuf Wear Boxing ${name}`;
			}

			if (!details.length) {
				return name;
			}
			return `${name} ${details.join(' ')}`;
		},
		getPrice: item => {
			const price = +item.Sell;
			return Math.ceil(price < 15 ? price + 4 : price) - 0.01;
		},
		getRRP: item => Math.ceil(+item.RRP) - 0.01,
		getDescription: item => item.DESCRIPTION,
		getVendor: item => 'Tuf Wear',
		getMainImageURL: item => item['Image1'],
		getAdditionalImages: item => {
			const images = [];
			for (let i = 2; i<= 4; i++) {
				const image = item[`Image${i}`];
				if (image) {
					images.push(image);
				}
			}
			return images;
		},
		getTags: item => 'tuf, new in',
		getVariants: item => [{
			name: 'Size',
			value: item.SIZE,
		}],
		getVariantCorrelationId: item => item['PARENT CODE']
	},
	{
		name: "sting",
		importLabel: "Sting Inventory CSV",
		updateInventory: true,
		useBarcodeForExclusiveMatching: false,
		getSKU: item => item.SKU,
		getQuantity: item => +item.OnHand
	},
	{
		name: "lp",
		importLabel: "LP Inventory CSV",
		updateInventory: true,
		useBarcodeForExclusiveMatching: false,
		getSKU: item => item['Alternative Reference'].trim(),
		getQuantity: item => +item['Available Stock']
	},
	{
		name: "arena-products",
		importLabel: "Arena Products CSV",
		updateInventory: true,
		updateProducts: true,
		addProducts: true,
		useBarcodeForExclusiveMatching: true,
		getSKU: item => item['Item code'],
		getBarcode: item => item.EAN,
		getQuantity: item => 25,
		getTitle: item => {
			if (item.COO === 'Turkey') {
				return `Comfyballs Underwear ${item.Title} (${item.Col})`;
			}
			return `Arena Swimming ${item.Title} (${item.Col})`;
		},
		getPrice: item => Math.ceil(+item['Your Price £'] * 1.45 * 1.2 + RM_SMALL_SHIPPING) - 0.01,
		getRRP: item => +item.RRP,
		getFeatures: item => {
			const features = [];
			for (let i = 1; i <=3; i++) {
				if (item[`Product feature ${i}`]) {
					features.push(item[`Product feature ${i}`]);
				}
			}
			return features;
		},
		getDescription: item => item['extended descriptiom'],
		getVendor: item => {
			if (item.COO === 'Turkey') {
				return 'Comfyballs';
			}
			return 'Arena';
		},
		getMainImageURL: item => item['Image link 1'].replace('dropbox.com', 'dl.dropboxusercontent.com'),
		getAdditionalImages: item => {
			const image = item['Image link 2'];
			if (image) {
				return [image.replace('dropbox.com', 'dl.dropboxusercontent.com')]
			}
			return [];
		},
		getTags: item => 'arena, new in',
		getVariants: item => {
			if (item.Size) {
				return [{
					name: 'Size',
					value: item.Size,
				}]
			}
			return;
		},
		getVariantCorrelationId: item => item.Title+item.Col
	},
	{
		name: "arena-stock",
		importLabel: "Arena Stock CSV",
		updateInventory: true,
		useBarcodeForExclusiveMatching: false,
		getSKU: item => item.sku,
		getQuantity: item => Math.min(+item.qty, 25),
		deny: [
			'21127',
			'21594'
		]
	},
	{
		name: "blitz",
		importLabel: "Blitz CSV",
		updateInventory: true,
		updateProducts: true,
		addProducts: true,
		htmlDecode: true,
		useBarcodeForExclusiveMatching: true,
		getSKU: item => item.Sku,
		getQuantity: item => item.InStock === 'True' ? 25 : 0,
		getPrice: item => {
			const VAT = item.Taxable === 'True' ? 0.2 : 0;
			const shipping = blitzShipping[item.Sku] || RM_SMALL_SHIPPING;
			return Math.ceil(+item.TradePrice * 1.35 * (1+VAT) + shipping) - 0.01;
		},
		getRRP: item => item.RetailPrice,
		getMainImageURL: item => item.ImageUrl,
		getAdditionalImages: item => {
			if (item[PARENT_SYMBOL]) {
				return [];
			}
			const images = [];
			for (let i = 1; i <=12; i++) {
				const image = item[`AltImage${i}`];
				if (image) {
					images.push(image);
				}
			}
			return images;
		},
		getTitle: item => item.Title,
		useTitleForMatching: true,
		getBarcode: item => item.Ean,
		getTaxable: item => item.Taxable === 'True',
		// getVariantCorrelationId: item => item.LinkComponent || item.Link.replace('https://www.blitzsport.com/', ''),
		getVariantCorrelationId: item => item.ParentSku,
		getFeatures: item => {
			const features = [];
			for (let i = 1; i <=5; i++) {
				if (item[`Feature${i}`]) {
					features.push(item[`Feature${i}`]);
				}
			}
			return features;
		},
		getWeight: item => item.Weight,
		getType: item => item.Category,
		getTags: item => 'new in,blitz',
		getVendor: item => item.Brand,
		getDescription: item => item.Description,
		getVariants: item => {
			const variants = [];
			if (item.Size) {
				variants.push({
					name: 'Size',
					value: item.Size
				});
			}
			if (item.Colour) {
				variants.push({
					name: 'Colour',
					value: item.Colour
				});
			}
			return variants;
		},
		deny: [
			// Test item
			'21682'
		],
		parseImport: items => {
			const csv = [];
			const parents = {};
			for (const item of items) {
				// variant parent
				if (item.Type === 'Parent') {
					if (parents[item.Sku]) {
						console.error(`[ERROR] blitz duplicate parent SKU ${item.Sku}`);
						continue;
					}
					parents[item.Sku] = item;
					continue;
				}
				// singular
				if (item.Type === 'Standard') {
					csv.push(item);
					continue;
				}
				if (item.Type !== 'Child') {
					continue;
				}
				// variant
				const parentItem = parents[item.ParentSku];
				if (!parentItem) {
					// there are one or two missing a parent, add as a regular?
					console.warn(`[WARN] blitz dangling child/variant without parent SKU ${item.Sku}`)
					parents[item.Sku] = item;
					csv.push(item);
					continue;
				}
				// use parent as a base and override with non-empty values for each key, ignoring title
				const newItem = {...parentItem};
				for (const key in item) {
					if (key !== 'Title' && item[key] !== '') {
						newItem[key] = item[key];
					}
				}
				csv.push(newItem);
			}
			return csv;
		}
	},
	{
		"name": "fitnessmad",
		"importLabel": "Fitness Mad CSV",
		updateInventory: true,
		getSKU: item => {
			const variant = item.Variant.trim();
			const SKU = item['No.'].trim();
			if (variant) {
				return `${SKU}-${variant}`;
			}
			return SKU;
		},
		getQuantity: item => Math.min(+item['Free Stock Today'], 50),
		useTitleForMatching: false,
		getTitle: item => item.Description
	},
	{
		"name": "victor",
		"importLabel": "Victor CSV",
		updateInventory: true,
		getSKU: item => item['RSG Code'].trim(),
		getQuantity: item => +item['STOCK'],
		useTitleForMatching: false,
		getTitle: item => item['Product Description']
	},
	// {
	// 	"name": "transglobal",
	// 	"importLabel": "Transglobal CSV",
	// 	updateInventory: true,
	// 	updateProducts: true,
	// 	addProducts: true,
	// 	useBarcodeForExclusiveMatching: true,
	// 	getSKU: item => {
	// 		return item['Variant SKU'] ? 'TRANSGLOBAL-' + item['Variant SKU'] : undefined
	// 	},
	// 	getQuantity: item => item['Variant Inventory Qty'],
	// 	getPrice: item => item['Variant Price'],
	// 	getRRP: item => item['Variant Price'],
	// 	getMainImageURL: item => item['Image Src'],
	// 	getAdditionalImages: item => {
	// 		if (item['Variant Image']) {
	// 			return [item['Variant Image']];
	// 		}
	// 		return [];
	// 	},
	// 	getTitle: item => item.Vendor + ' ' + item.Title,
	// 	useTitleForMatching: true,
	// 	getBarcode: item => item['Variant Barcode'],
	// 	getTaxable: item => item['Variant Taxable'],
	// 	getVariantCorrelationId: item => item.Handle,
	// 	getWeight: item => item['Variant Grams'],
	// 	getType: item => item.Type,
	// 	getTags: item => 'new in,transglobal',
	// 	getVendor: item => item.Vendor,
	// 	getDescription: item => item['Body (HTML)'],
	// 	getVariants: item => {
	// 		const variants = [];
	// 		if (item['Option1 Name']) {
	// 			variants.push({
	// 				name: item['Option1 Name'],
	// 				value: item['Option1 Value']
	// 			});
	// 		}
	// 		if (item['Option2 Name']) {
	// 			variants.push({
	// 				name: item['Option2 Name'],
	// 				value: item['Option2 Value']
	// 			});
	// 		}
	// 		if (item['Option3 Name']) {
	// 			variants.push({
	// 				name: item['Option3 Name'],
	// 				value: item['Option3 Value']
	// 			});
	// 		}
	// 		return variants;
	// 	}
	// }
];

export default vendors;