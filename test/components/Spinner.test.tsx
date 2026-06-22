import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Spinner from '../../src/components/Spinner.tsx';

describe('Spinner', () => {
	it('renders the spinner container', () => {
		const { container } = render(<Spinner />);
		expect(container.querySelector('.lds-roller')).not.toBeNull();
	});

	it('renders 8 inner animation divs', () => {
		const { container } = render(<Spinner />);
		expect(container.querySelectorAll('.lds-roller > div')).toHaveLength(8);
	});
});
