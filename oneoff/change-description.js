const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const products = path.resolve('./products_export_1.csv')
const productsFile = fs.readFileSync(products).toString();
const products2 = path.resolve('./products_export_2.csv')
const productsFile2 = fs.readFileSync(products2).toString();
const raydon = path.resolve('./raydon-products.csv');
const raydonProductsFile = fs.readFileSync(raydon).toString();

function parseCSVString(csvString) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        resolve(results.data);
      },
      error: function(error) {
        reject(error);
      }
    });
  });
}


(async () => {
	const shopifyCSV1 = await parseCSVString(productsFile);
	const shopifyCSV2 = await parseCSVString(productsFile2);
	const shopifyCSV = [ ...shopifyCSV1, ...shopifyCSV2];
	const raydonCSV = await parseCSVString(raydonProductsFile);
	const changedProducts = [];
	
	for (const shopifyItem of shopifyCSV) {
		const raydonItem = raydonCSV.find(r => r.Sku_Code.replace('\n', '') === shopifyItem['Variant SKU']);
		if (raydonItem && shopifyItem.Title && shopifyItem['Variant SKU']) {
			// console.error('found raydon item', raydonItem?.Sku_Code)
			if (shopifyItem['Body (HTML)'] !== raydonItem.Description) {
				shopifyItem['Body (HTML)'] = raydonItem.Description;
				changedProducts.push(shopifyItem);
			}
		}
	}

	const newCSV = Papa.unparse(changedProducts, {
		header: true,
		newline: '\n',
	});
	console.log(newCSV)
})()