import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Alert from '../../src/components/Alert.tsx';

describe('Alert component', () => {
  it('renders header, message, and close button', () => {
    const onClose = vi.fn();
    render(<Alert header="Test Header" message="Line1\nLine2" onClose={onClose} />);

    expect(screen.getByText('Test Header')).toBeDefined();
    expect(screen.getByText(/Line1/)).toBeDefined();
    expect(screen.getByText(/Line2/)).toBeDefined();
    expect(screen.getByText('x')).toBeDefined();
  });
});
