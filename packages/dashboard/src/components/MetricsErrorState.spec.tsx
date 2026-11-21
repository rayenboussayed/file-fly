import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api.js';
import { MetricsErrorState } from './MetricsErrorState.js';

beforeEach(() => {
  sessionStorage.clear();
});

describe('MetricsErrorState', () => {
  it('stores the token and refetches on a 401', () => {
    const onRefetch = vi.fn();
    render(<MetricsErrorState error={new ApiError(401)} onRefetch={onRefetch} />);
    const input = screen.getByPlaceholderText('METRICS_TOKEN');
    fireEvent.change(input, { target: { value: 'secret-token' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(sessionStorage.getItem('file-fly-metrics-token')).toBe('secret-token');
    expect(onRefetch).toHaveBeenCalledOnce();
  });

  it('explains a 503 without a form', () => {
    render(<MetricsErrorState error={new ApiError(503)} onRefetch={vi.fn()} />);
    expect(screen.getByText('Metrics are disabled')).toBeDefined();
    expect(screen.queryByPlaceholderText('METRICS_TOKEN')).toBeNull();
  });

  it('announces a generic error with the message', () => {
    render(<MetricsErrorState error={new Error('upstream broke')} onRefetch={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('upstream broke')).toBeDefined();
  });

  it('falls back to a fixed message for a non-Error value', () => {
    render(<MetricsErrorState error="broken" onRefetch={vi.fn()} />);
    expect(screen.getByText('The metrics request failed.')).toBeDefined();
  });
});
