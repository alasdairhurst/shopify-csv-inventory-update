import { describe, expect, it } from 'vitest';
import parseProductsCSV from '../../src/functions/parseProductsCSV.ts';
import { MTB } from '../../src/vendors/mtb.ts';
import { loadExampleFixture } from '../testUtils/fixtureHelpers.ts';

describe('vendor MTB', () => {
	const mtb = new MTB();

	it ('Validates the vendor features', () => {
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
});
