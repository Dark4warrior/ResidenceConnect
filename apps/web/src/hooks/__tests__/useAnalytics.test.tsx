import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from '../useAnalytics';
import { supabase } from '../../lib/supabase';
import { makeTicket } from '../../test/fixtures';

vi.mock('../../lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

const mockedRpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAnalytics', () => {
  it('utilise l’agrégation SQL quand la RPC répond', async () => {
    const sqlKpis = {
      total: 3,
      byStatus: { pending: 1, in_progress: 1, resolved: 1 },
      byCategory: { plumbing: 2, electricity: 1, elevator: 0, other: 0 },
      byUrgency: { low: 0, medium: 1, high: 1, critical: 1 },
      resolutionRate: 33,
      avgResolutionHours: 12,
    };
    mockedRpc.mockImplementation((fn: string) => {
      if (fn === 'get_ticket_analytics') {
        return Promise.resolve({ data: sqlKpis, error: null });
      }
      return Promise.resolve({
        data: [
          { category: 'plumbing', total: 2, resolved: 1, avg_resolution_hours: 12 },
        ],
        error: null,
      });
    });

    const { result } = renderHook(() => useAnalytics([]));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.source).toBe('sql');
    expect(result.current.kpis.total).toBe(3);
    // topCategory est dérivée de byCategory côté client.
    expect(result.current.kpis.topCategory).toBe('plumbing');
    expect(result.current.breakdown).toHaveLength(1);
  });

  it('retombe sur le calcul client si la RPC est absente', async () => {
    mockedRpc.mockResolvedValue({
      data: null,
      error: { message: 'function not found' },
    });

    const tickets = [
      makeTicket({ status: 'resolved', category: 'elevator' }),
      makeTicket({ status: 'pending', category: 'elevator' }),
    ];

    const { result } = renderHook(() => useAnalytics(tickets));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.source).toBe('client');
    expect(result.current.kpis.total).toBe(2);
    expect(result.current.kpis.byCategory.elevator).toBe(2);
    expect(result.current.kpis.topCategory).toBe('elevator');
  });

  it('retombe aussi sur le client en cas de données RPC vides', async () => {
    mockedRpc.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useAnalytics([makeTicket()]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.source).toBe('client');
  });
});
