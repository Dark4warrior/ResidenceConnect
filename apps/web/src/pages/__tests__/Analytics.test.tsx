import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Analytics } from '../Analytics';
import { makeTicket } from '../../test/fixtures';
import type { TicketRow } from '../../types';

const hookState: {
  tickets: TicketRow[];
  loading: boolean;
  error: string | null;
} = { tickets: [], loading: false, error: null };

vi.mock('../../hooks/useTickets', () => ({
  useTickets: () => ({
    ...hookState,
    refetch: vi.fn(),
    updateStatus: vi.fn(),
    assignTechnician: vi.fn(),
  }),
}));

// La page passe désormais par `useAnalytics`, qui interroge une RPC SQL.
// On simule une RPC absente pour vérifier le repli sur le calcul client.
vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'absent' } }),
  },
}));

beforeEach(() => {
  hookState.tickets = [];
  hookState.loading = false;
  hookState.error = null;
});

describe('Analytics', () => {
  it('affiche le nombre total de tickets (repli client)', async () => {
    hookState.tickets = [
      makeTicket({ status: 'resolved', created_at: '2026-07-01T08:00:00Z', resolved_at: '2026-07-01T18:00:00Z' }),
      makeTicket({ status: 'pending' }),
    ];
    render(<Analytics />);

    expect(screen.getByText('Tickets au total')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
  });

  it('affiche le taux de résolution calculé', async () => {
    hookState.tickets = [
      makeTicket({ status: 'resolved', resolved_at: '2026-07-01T18:00:00Z' }),
      makeTicket({ status: 'pending' }),
    ];
    render(<Analytics />);
    await waitFor(() => expect(screen.getByText('50 %')).toBeInTheDocument());
  });

  it('signale la source des indicateurs', async () => {
    render(<Analytics />);
    // RPC absente → badge « Calcul client ».
    await waitFor(() =>
      expect(screen.getByText('Calcul client')).toBeInTheDocument()
    );
  });

  it('gère l’absence de tickets sans planter', async () => {
    render(<Analytics />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('Taux de résolution')).toBeInTheDocument()
    );
  });
});
