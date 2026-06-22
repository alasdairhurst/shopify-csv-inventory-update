import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Alert from '../../src/components/Alert.tsx';

afterEach(cleanup);

describe('Alert', () => {
	it('renders the header text', () => {
		render(<Alert header="Test Header" message="A message" onClose={vi.fn()} />);
		expect(screen.getByText('Test Header')).not.toBeNull();
	});

	it('renders a string message split across newlines', () => {
		const { container } = render(<Alert header="H" message={'first line\nsecond line'} onClose={vi.fn()} />);
		expect(container.textContent).toContain('first line');
		expect(container.textContent).toContain('second line');
	});

	it('renders a ReactNode message directly', () => {
		render(<Alert header="H" message={<span>custom node content</span>} onClose={vi.fn()} />);
		expect(screen.getByText('custom node content')).not.toBeNull();
	});

	it('shows the close button by default and calls onClose when clicked', () => {
		const onClose = vi.fn();
		render(<Alert header="H" message="m" onClose={onClose} />);
		fireEvent.click(screen.getByText('x'));
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('hides the close button when hasClose is false', () => {
		render(<Alert header="H" message="m" onClose={vi.fn()} hasClose={false} />);
		expect(screen.queryByText('x')).toBeNull();
	});
});
