import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TokenGate } from './TokenGate.js';

describe('TokenGate', () => {
  it('renders the 503 explanation without a form', () => {
    render(<TokenGate onSubmit={() => undefined} reason={503} />);
    expect(screen.getByText('Metrics are disabled')).toBeDefined();
    expect(screen.queryByPlaceholderText('METRICS_TOKEN')).toBeNull();
  });

  it('submits the entered token and clears the field', () => {
    const onSubmit = vi.fn();
    render(<TokenGate onSubmit={onSubmit} reason={401} />);
    const input = screen.getByPlaceholderText('METRICS_TOKEN');
    fireEvent.change(input, { target: { value: 'secret-token' } });
    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledWith('secret-token');
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('ignores a whitespace-only submit', () => {
    const onSubmit = vi.fn();
    render(<TokenGate onSubmit={onSubmit} reason={401} />);
    const input = screen.getByPlaceholderText('METRICS_TOKEN');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables the submit button while the token is blank', () => {
    render(<TokenGate onSubmit={() => undefined} reason={401} />);
    const input = screen.getByPlaceholderText('METRICS_TOKEN');
    const unlock = screen.getByRole('button', { name: 'Unlock' });
    expect(unlock.getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(input, { target: { value: 'filled' } });
    expect(unlock.getAttribute('aria-disabled')).toBeNull();
  });
});
