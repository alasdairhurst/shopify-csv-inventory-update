const PARENT_SYMBOL = Symbol.for('parent');

const RM_SMALL_SHIPPING = 5;
const RM_LARGE_SHIPPING = 20;

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

const cartasProductVAT = item => {
	const VATpc = +item.VAT.replace('%', '');
	const VAT = (VATpc / 100) + 1
	return VAT;
}

const vendors = [
	{
		name: 'reydon-inventory',
		importLabel: 'Reydon Inventory CSV',
		updateInventory: true,
		getSKU: item => item.Code.replace('\n', ''),
		getQuantity: item => +item.Quantity,
		useTitleForMatching: true,
		getTitle: item => item['Product Name'].replace(/\([^()]*\)/g, ''),
		expectedHeaders: ['Product Name', 'Code', 'Quantity']
	},
	{
		name: 'reydon',
		importLabel: 'Reydon CSV',
		updateProducts: true,
		updateInventory: true,
		addProducts: true,
		useBarcodeForExclusiveMatching: true,
		useTitleForMatching: true,
		expectedHeaders: ['Sku_Code','Product_Name','Description','Image_File','Image_FTP','Size','Colour','Brand','VAT','Barcode','Trade','SRP','Weight_KG','Length_CM','Width_CM','Height_CM','Commodity_Code','Easy_Store_Quantity','COFO','COFO_Code','Product_Parent','Date_First_Available','Free_Stock','Approx_Restock_Date_MMyy','Can_Sell_In','Cannot_Sell_In','Product_Material','Your_Price','Currency','Price_Updated'],
		getTitle: item => item.Product_Name,
		getDescription: item => item.Description,
		getVendor: item => item.Brand,
		getSKU: item => item.Sku_Code.replace('\n', ''),
		getMainImageURL: item => item['Image_FTP'],
		getVariantImageURL: item => item['Image_FTP'],
		getQuantity: item => +item.Free_Stock,
		getTaxable: item => +item.VAT > 0,
		getRRP: (item, vendor) => vendor.getPrice(item) * 1.2,
		getPrice: item => {
			let shipping = RM_SMALL_SHIPPING;
			if (Math.max(item.Width_CM, item.Length_CM, item.Height_CM) >= 110) {
				shipping = RM_LARGE_SHIPPING;
			}
			// your price + profit + vat + shipping
			return +item.Your_Price * 1.45 * (1 + (+item.VAT / 100)) + shipping
		},
		getWeight: item => +item.Weight_KG,
		getVariants: item => {
			const variants = [];
			if (item.Colour) {
				variants.push({
					name: 'Colour',
					value: item.Colour
				});
			}
			if (item.Size) {
				variants.push({
					name: 'Size',
					value: item.Size
				});
			}
			return variants;
		},
		// getTags: item => [],
		getBarcode: item => item.Barcode,
		getParent: item => item.parent,
		getVariantCorrelationId: item => item.Product_Name,
		orderBy: item => item.Product_Name,
	},
	{
		name: 'cartas-inventory',
		importLabel: 'Cartas Inventory CSV',
		updateInventory: true,
		updateProducts: false,
		useTitleForMatching: true,
		getSKU: item => item.CHILD_CODE.trim(),
		getQuantity: item => Math.min(+item.QUANTITY.trim(), 50),
		getTitle: item => item.PRODUCT_NAME.trim(),
		expectedHeaders: ['PRODUCT_ID','PARENT_CODE','PRODUCT_NAME','OPTION_NAME','SIZE','CHILD_CODE','QUANTITY','LIST_PRICE'],
	},
	{
		name: 'cartas',
		importLabel: 'Cartas Products CSV',
		updateInventory: false,
		updateProducts: true,
		addProducts: true,
		useTitleForMatching: true,
		useBarcodeForExclusiveMatching: false,
		expectedHeaders: ['STATUS','CODE','WEIGHT','STOCK','CATEGORY','BRAND','EAN','VAT','TRADE_PRICE','DESCRIPTION','MAIN_IMAGE','PRODUCT_NAME','IMAGE_1','IMAGE_2','IMAGE_3','IMAGE_4','SIZE','COLOUR','PERANT_ID'],
		getSKU: item => item.STATUS === 'LIVE' ? item.CODE.trim() : undefined, 
		getWeight: item => +item.WEIGHT.trim(),
		getQuantity: item => Math.min(+item.STOCK, 50),
		getType: item => item.CATEGORY.replace(item.BRAND.toUpperCase(), '').replace(/-/g, '').trim(),
		getBarcode: item => item.EAN || item.UPC,
		getPrice: item => {
			const VAT = cartasProductVAT(item);
			return +item.TRADE_PRICE * 0.9 * 1.45 * VAT + RM_SMALL_SHIPPING;
		},
		getRRP: item => {
			const VAT = cartasProductVAT(item);
			return (+item.TRADE_PRICE * 1.45 * VAT + RM_SMALL_SHIPPING) * 1.2;
		},
		getTaxable: item => cartasProductVAT(item) > 1,
		getVendor: item => item.BRAND.trim(),
		getDescription: item => item.DESCRIPTION.replace(/^'/, '').replace(/'$/, '').trim(),
		getMainImageURL: item => item.MAIN_IMAGE.trim(),
		getVariantImageURL: item => item.MAIN_IMAGE.trim(),
		// getTags: item => [],
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
			if (colour) {
				variants.push({
					name: 'Colour',
					value: colour
				});
			}
			if (size) {
				variants.push({
					name: 'Size',
					value: size
				});
			}
			return variants;
		},
		getVariantCorrelationId: item => item.PERANT_ID || item.PARENT_ID,
	},
	{
		name: 'unicorn',
		importLabel: 'Unicorn CSV',
		updateInventory: true,
		updateProducts: true,
		useTitleForMatching: true,
		useBarcodeForExclusiveMatching: true,
		expectedHeaders: ['SKU', 'Description', 'QTY', 'Unit Of Measure', 'Barcode EAN/UPC', 'Material Group', 'Brand', 'URL'],
		getSKU: item => item.SKU,
		getQuantity: item => +item.QTY,
		getBarcode: item => item['Barcode EAN/UPC'],
		getTitle: item => item.Description
	},
	{
		name: 'mtb',
		importLabel: 'Muay Thai Boxing CSV',
		updateInventory: true,
		updateProducts: true,
		addProducts: true,
		useTitleForMatching: true,
		useBarcodeForExclusiveMatching: true,
		getSKU: item => item['Variant SKU'],
		getBarcode: item => item['Variant Barcode'],
		getQuantity: item => +item['Variant Inventory Qty'],
		getTitle: item => {
			const title = item.Title;
			if (['Fairtex', 'Twins Special', 'MTG Pro'].includes(item.Vendor)) {
				const skuStart = item['Variant SKU'].split('-')[0];
				let newTitle = title.replace(new RegExp(`^${skuStart}\\s`), '');
				if (newTitle === title) {
					const skuMiddle = item['Variant SKU'].split('-')[1];
					newTitle = title.replace(new RegExp(`^${skuStart}-${skuMiddle}\\s`), '');
				}
				return newTitle;

			} else if (item.Vendor === 'TUFF Sport') {
				const skuStart = item['Variant SKU'].split('-')[1];
				return title.replace(new RegExp(`^${skuStart}\\s`), '');
			}
			return title;
		},
		getWeight: item => +item['Variant Weight'],
		getTaxable: item => item['Variant Taxable'] === 'true',
		getPrice: item => +item['Variant Price'],
		getDescription: item => item['Body HTML'],
		getVendor: item => item.Vendor,
		getMainImageURL: item => item['Image Src'],
		getAdditionalImages: item => {
			return item.additionalImages || [];
		},
		// getTags: item => [],
		getVariants: item => {
			return [
				{
					name: item['Option1 Name'],
					value: item['Option1 Value'],
				}
			];
		},
		getVariantCorrelationId: item => item.Handle,
		parseImport: items => {
			const csv = [];
			let variant;
			for (const item of items) {
				// variant parent
				if (item['Variant SKU']) {
					variant = item;
					csv.push(item);
					continue;
				}

				// who knows what happened here
				if (item.Handle !== variant.Handle) {
					variant = undefined;
					continue;
				}

				// assume subsequent lines without sku are images
				variant.additionalImages = variant.additionalImages || [];
				variant.additionalImages.push(item['Image Src']);
			}
			return csv;
		}
	},
	{
		name: 'blitz',
		importLabel: 'Blitz CSV',
		updateInventory: true,
		updateProducts: true,
		addProducts: true,
		htmlDecode: true,
		useTitleForMatching: true,
		useBarcodeForExclusiveMatching: true,
		expectedHeaders: ['Title', 'Link', 'LinkComponent', 'Description', 'Sku', 'ParentSku', 'Ean', 'CatCode', 'Type', 'Taxable', 'Brand', 'Category', 'ImageUrl', 'InStock', 'Weight', 'RetailPrice', 'TradePrice', 'Feature1', 'Feature2', 'Feature3', 'Feature4', 'Feature5', 'DueDate', 'Size', 'Colour', 'Design', 'AltImage1', 'AltImage2', 'AltImage3', 'AltImage4', 'AltImage5', 'AltImage6', 'AltImage7', 'AltImage8', 'AltImage9', 'AltImage10', 'AltImage11', 'AltImage12'],
		getSKU: item => item.Sku,
		getQuantity: item => item.InStock === 'True' ? 25 : 0,
		getPrice: item => {
			const VAT = item.Taxable === 'True' ? 0.2 : 0;
			const shipping = blitzShipping[item.Sku] || RM_SMALL_SHIPPING;
			return +item.TradePrice * 1.45 * (1+VAT) + shipping;
		},
		getRRP: item => item.RetailPrice,
		getMainImageURL: item => item.ImageUrl,
		getVariantImageURL: item => item.ImageUrl,
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
		getBarcode: item => item.Ean,
		getTaxable: item => item.Taxable === 'True',
		// getVariantCorrelationId: item => item.LinkComponent || item.Link.replace('https://www.blitzsport.com/', ', '),
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
		// getTags: item => [],
		getVendor: item => item.Brand,
		getDescription: item => item.Description,
		getVariants: item => {
			const variants = [];
			if (item.Colour) {
				variants.push({
					name: 'Colour',
					value: item.Colour
				});
			}
			if (item.Size) {
				variants.push({
					name: 'Size',
					value: item.Size
				});
			}
			if (item.Design) {
				variants.push({
					name: 'Design',
					value: item.Design
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
	}
];

export default vendors;