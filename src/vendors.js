const PARENT_SYMBOL = Symbol.for('parent');

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

const vendors = [
	{
		name: "reydon",
		importLabel: "Reydon Stock CSV",
		updateInventory: true,
		getSKU: item => item.Code.replace('\n', ''),
		getQuantity: item => +item.Quantity,
		useTitleForMatching: true,
		getTitle: item => item['Product Name'].replace(/\([^()]*\)/g, '')
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
		getQuantity: item => +item.Free_Stock,
		getTaxable: item => +item.VAT > 0,
		getRRP: item => +item.SRP,
		getPrice: item => {
			let shipping = 3;
			if (Math.max(item.Width_CM, item.Length_CM, item.Height_CM) >= 110) {
				shipping = 10;
			}
			return Math.ceil(+item.Your_Price * 1.4 * (1 + (+item.VAT / 100)) + shipping) - 0.01
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
		getQuantity: item => Math.min(+item.quantity, 50),
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
		// ZZ is discontinued
		getSKU: item => item.name.startsWith('ZZ') ? undefined : item.stock_code.trim(),
		getWeight: item => +item.weight.trim(),
		getQuantity: item => Math.min(+item.quantity, 50),
		getBarcode: item => {
			const barcode = item.ean.replace(/"/g, '').trim();
			if (barcode) {
				return `'${barcode}`;
			}
		},
		getPrice: item => {
			const VAT = +item.vat_code === 1 ? 1.2 : 1;
			return Math.ceil(+item.price * 1.3 * VAT + 3) - 0.01;
		},
		getRRP: item => {
			const VAT = +item.vat_code === 1 ? 1.2 : 1;
			return Math.ceil((+item.price * 1.3 * VAT + 3) * 1.2) - 0.01;
		},
		getTaxable: item => +item.vat_code === 1,
		getTaxCode: item => +item.vat_code,
		getVendor: item => 'Carta Sports',
		getDescription: item => item.description.replace(/^"/, '').replace(/"$/, ''),
		getMainImageURL: item => item.image_url,
		getTags: item => 'new in,cartas',
		useTitleForMatching: false,
		getTitle: item => item.name
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
		getBarcode: item => item.SKU,
		getQuantity: item => +item.Quantity,
		getTitle: item => item.Name,
		getWeight: item => +item.Weight,
		getPrice: item => Math.ceil(+item.Price * 1.2) - 0.01,
		getRRP: item => Math.ceil(+item.Price * 1.2) - 0.01,
		getDescription: item => item.Description,
		getVendor: item => item.Manufacturer,
		getMainImageURL: item => item['Main image'],
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
				if (!item.SKU && !item['Option SKU']) {
					parentItem = item;
					continue;
				}
				// singular
				if (item.SKU) {
					csv.push(item);
					continue;
				}
				// variant
				csv.push({
					...parentItem,
					SKU: item['Option SKU'],
					Quantity: item['Option quantity'],
					'Option value': item['Option value']
				});
			}
			return csv;
		}
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
		getTitle: item => `Arena Swimming ${item.Title} (${item.Col})`,
		getPrice: item => Math.ceil(+item['Your Price £'] * 1.4 * 1.2 + 3) - 0.01,
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
		getVendor: item => 'Arena',
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
			const shipping = blitzShipping[item.Sku] || 3;
			return Math.ceil(+item.TradePrice * 1.3 * (1+VAT) + shipping) - 0.01;
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
	}
];

export default vendors;