import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import CSVPreview from '../../src/components/CSVPreview.tsx';

const makeCSV = (rows: number): string => {
  const header = 'Handle,Title,SKU';
  const dataRows = Array.from({ length: rows }, (_, i) => `handle-${i},Title ${i},SKU-${i}`);
  return [header, ...dataRows].join('\n');
};

describe('CSVPreview', () => {
  it('renders column headers in table view', () => {
    render(<CSVPreview csv={"Handle,Title\nrow1,val1"} />);
    expect(screen.getByText('Handle')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders data rows in table view', () => {
    render(<CSVPreview csv={"Handle,Title\ntest-handle,Test Title"} />);
    expect(screen.getByText('test-handle')).toBeInTheDocument();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('caps table at 500 rows and shows banner when exceeded', () => {
    const csv = makeCSV(502);
    render(<CSVPreview csv={csv} />);
    expect(screen.getByText('Showing first 500 of 502 rows')).toBeInTheDocument();
    expect(screen.getByText('Showing 500 of 502 rows')).toBeInTheDocument();
  });

  it('shows row count without banner when under limit', () => {
    render(<CSVPreview csv={"Handle,Title\nrow1,val1\nrow2,val2"} />);
    expect(screen.getByText('2 rows')).toBeInTheDocument();
    expect(screen.queryByText(/Showing first/)).not.toBeInTheDocument();
  });

  it('switches to text view and renders textarea', async () => {
    const user = userEvent.setup();
    const csv = "Handle,Title\nrow1,val1";
    render(<CSVPreview csv={csv} />);
    await user.click(screen.getByText('Text'));
    const textarea = document.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue(csv);
  });

  it('switches back to table view', async () => {
    const user = userEvent.setup();
    render(<CSVPreview csv={"Handle,Title\nrow1,val1"} />);
    await user.click(screen.getByText('Text'));
    await user.click(screen.getByText('Table'));
    expect(document.querySelector('table')).toBeInTheDocument();
    expect(document.querySelector('textarea')).not.toBeInTheDocument();
  });
});
