import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { MTB, MTBProduct } from '../../src/vendors/mtb.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor MTB', () => {
	const mtb = new MTB();

	const makeProduct = (overrides: Partial<MTBProduct>): MTBProduct => ({
		'Variant SKU': 'TEST-1',
		'Variant Barcode': '123456789012',
		'Variant Inventory Qty': '10',
		Title: 'Test Product',
		Vendor: 'Generic',
		'Variant Weight': '1',
		'Variant Taxable': 'true',
		'Variant Price': '50.00',
		'Body HTML': '<p>Test</p>',
		'Image Src': 'https://example.com/image.jpg',
		'Option1 Name': 'Title',
		'Option1 Value': 'Default Title',
		Handle: 'test-product',
		...overrides,
	});

	it('validates the vendor features', () => {
		expect(mtb.name).toBe('mtb');
		expect(mtb.importLabel).toBe('Muay Thai Boxing CSV');
		expect(mtb.useBarcodeForExclusiveMatching).toBe(true);
		expect(mtb.useTitleForMatching).toBe(true);
		expect(mtb.canAddProducts()).toBe(true);
		expect(mtb.canUpdateInventory()).toBe(true);
	});

	it('accepts MTB headers and parses the example file', async () => {
		const mtbCsv = loadExampleFixture(['vendors', 'mtb', 'mtb.csv']);
		const products = await parseProductsCSV(mtbCsv, mtb);

		expect(products.length).toBeGreaterThan(0);
		const product = products[0]!;

		expect(mtb.getTitle(product)).toEqual('Fairtex Maddox II Ultimate Grappling Dummy');
		expect(mtb.getDescription(product)).toEqual(`<p>The evolved and improved version of the world's best grappling dummy.</p>
<p>The new model now features both hands and feet to perform even more holds and submissions. Also now has an improved posture, leaning forward which simulates a more realistic position of an opponent in your guard.</p>
<p>Made from special microfiber synthetic leather which is very durable and easy to wipe clean.</p>
<p>Shoulder system designed by Fairtex to realistically perform triangle chokes, arm bars and arm triangles and drill them over and over full strength without requiring a training partner.</p>
<p>It can used for top or bottom positions and the legs can stretch out. It's possible to drill any position realistically with the Maddox II.</p>
<p>Strong base with sand filled up bottom half of the legs.</p>
<p>The neck is designed to support rear naked chokes, guillotine chokes, darce choke, anaconda choke etc, just like you would do on a real person.</p>
<p>Good for all kind of controls; side mount, full mount, north south, back control etc.</p>
<hr>
<h3>Features:</h3>
<ul>
	<li>Has hands and feet</li>
	<li>Suitable for all MMA/BJJ positions</li>
	<li>Realistic posture for in your guard</li>
	<li>Durable microfiber outer shell</li>
	<li>All submissions are possible</li>
	<li>Great for drilling or practising at home</li>
</ul>
<hr>
<br>
<table width="100%">
	<tbody>
		<tr>
            <th>Height</th>
            <th>Neck</th>
			<th>Shoulders</th>
            <th>Chest</th>
			<th>Waist</th>
			<th>Hips</th>
            <th>Weight</th>
		</tr>
		<tr>
			<td>190 cm</td>
			<td>42 cm</td>
			<td>120 cm</td>
            <td>87 cm</td>
			<td>90 cm</td>
            <td>110 cm</td>
			<td>28 - 30 kg (Approx.)</td>
		</tr>
	</tbody>
</table>
<br>`);
		expect(mtb.getVendor(product)).toEqual('Fairtex');
		expect(mtb.getSKU(product)).toEqual('GD2');
		expect(mtb.getMainImageURL(product)).toEqual(
			'https://cdn.shopify.com/s/files/1/0779/9511/4763/files/gd2-fairtex-maddox-ii-ultimate-grappling-dummy.jpg?v=1739480078'
		);
		expect(mtb.getQuantity(product)).toEqual(0);
		expect(mtb.getTaxable(product)).toEqual(true);
		expect(mtb.getRRP(product)).toEqual(674.99);
		expect(mtb.getPrice(product)).toEqual(699.99);
		expect(mtb.getWeightGrams(product)).toEqual(34000);
		expect(mtb.getVariants(product)).toEqual([
			{
				name: 'Title',
				value: 'Default Title'
			}
		]);
		expect(mtb.getBarcode(product)).toEqual('8859368939758');
		expect(mtb.getVariantCorrelationId(product)).toEqual('gd2-fairtex-maddox-ii-ultimate-grappling-dummy');
	});

	describe('getTitle()', () => {
		it('strips the leading SKU segment from Fairtex titles', () => {
			const product = makeProduct({ Vendor: 'Fairtex', 'Variant SKU': 'BGL6', Title: 'BGL6 Fairtex Boxing Gloves' });
			expect(mtb.getTitle(product)).toBe('Fairtex Boxing Gloves');
		});

		it('strips the compound SKU prefix from Fairtex titles when the first segment alone does not match', () => {
			const product = makeProduct({ Vendor: 'Fairtex', 'Variant SKU': 'BGL-6-BK', Title: 'BGL-6 Fairtex Boxing Gloves Black' });
			expect(mtb.getTitle(product)).toBe('Fairtex Boxing Gloves Black');
		});

		it('strips the leading SKU segment from Twins Special titles', () => {
			const product = makeProduct({ Vendor: 'Twins Special', 'Variant SKU': 'BGVL3', Title: 'BGVL3 Twins Boxing Gloves' });
			expect(mtb.getTitle(product)).toBe('Twins Boxing Gloves');
		});

		it('strips the second SKU segment from TUFF Sport titles', () => {
			const product = makeProduct({ Vendor: 'TUFF Sport', 'Variant SKU': 'TN-SHIELD-S', Title: 'SHIELD Tuff Body Shield Small' });
			expect(mtb.getTitle(product)).toBe('Tuff Body Shield Small');
		});

		it('returns the title unchanged for other vendors', () => {
			const product = makeProduct({ Vendor: 'Hayabusa', Title: 'Hayabusa T3 Boxing Gloves' });
			expect(mtb.getTitle(product)).toBe('Hayabusa T3 Boxing Gloves');
		});
	});

	describe('getPrice()', () => {
		it('adds large shipping (25) for heavy items weighing 3kg or more', () => {
			const product = makeProduct({ 'Variant Weight': '3', 'Variant Price': '100.00', Vendor: 'Fairtex' });
			// getRRP = roundPrice(100) = 99.99; getPrice = 99.99 + 25
			expect(mtb.getPrice(product)).toBe(124.99);
		});

		it('returns just the RRP with no shipping for TUFF Sport products', () => {
			const product = makeProduct({ Vendor: 'TUFF Sport', 'Variant Weight': '1', 'Variant Price': '50.00' });
			// getRRP = roundPrice(50) = 49.99; getPrice = 49.99
			expect(mtb.getPrice(product)).toBe(49.99);
		});

		it('adds small shipping (5) for regular light items', () => {
			const product = makeProduct({ Vendor: 'Hayabusa', 'Variant Weight': '1', 'Variant Price': '50.00' });
			// getRRP = roundPrice(50) = 49.99; getPrice = 49.99 + 5
			expect(mtb.getPrice(product)).toBe(54.99);
		});
	});

	describe('getAdditionalImages()', () => {
		it('returns an empty array when no additional images are set', () => {
			expect(mtb.getAdditionalImages(makeProduct({}))).toEqual([]);
		});

		it('returns the additional images array when set', () => {
			const images = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'];
			expect(mtb.getAdditionalImages(makeProduct({ _additionalImages: images }))).toEqual(images);
		});
	});

	describe('parseImport()', () => {
		it('collects rows without a SKU as additional images on the previous product', () => {
			const product = makeProduct({ 'Variant SKU': 'TEST1', Handle: 'handle-1', 'Image Src': 'https://example.com/main.jpg' });
			const imageRow = makeProduct({ 'Variant SKU': '', Handle: 'handle-1', 'Image Src': 'https://example.com/extra.jpg' });

			const result = mtb.parseImport!([product, imageRow]);

			expect(result).toHaveLength(1);
			expect(result[0]!._additionalImages).toEqual(['https://example.com/extra.jpg']);
		});

		it('skips image rows whose handle does not match the previous product', () => {
			const product = makeProduct({ 'Variant SKU': 'TEST1', Handle: 'handle-1' });
			const strayRow = makeProduct({ 'Variant SKU': '', Handle: 'handle-2', 'Image Src': 'https://example.com/stray.jpg' });

			const result = mtb.parseImport!([product, strayRow]);

			expect(result).toHaveLength(1);
			expect(result[0]!._additionalImages).toBeUndefined();
		});
	});
});
