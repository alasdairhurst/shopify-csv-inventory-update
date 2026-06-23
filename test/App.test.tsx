import { describe, expect, it, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App.tsx';

describe('App', () => {
	beforeAll(() => {
		process.env.BUILD_TIME = '1700000000000';
	});

	it('renders the wizard home step', () => {
		render(<App />);
		expect(screen.getByText('Update Inventory')).toBeInTheDocument();
		expect(screen.getByText('Add Products')).toBeInTheDocument();
		expect(screen.getByText('Edit Products')).toBeInTheDocument();
	});

	it('shows the build timestamp in the log panel', () => {
		render(<App />);
		expect(screen.getByText(/^Built /)).toBeInTheDocument();
	});
});
