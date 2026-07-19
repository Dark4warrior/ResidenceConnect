import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

beforeEach(() => {
  hookState.tickets = [];
  hookState.loading = false;
  hookState.error = null;
});

describe('Analytics', () => {
  it('affiche le nombre total de tickets', () => {
    hookState.tickets = [
      makeTicket({ status: 'resolved', created_at: '2026-07-01T08:00:00Z', resolved_at: '2026-07-01T18:00:00Z' }),
      makeTicket({ status: 'pending' }),
    ];
    render(<Analytics />);

    expect(screen.getByText('Tickets au total')).toBeInTheDocument();
    // La valeur 2 doit être présente dans une carte KPI.
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('affiche le taux de résolution calculé', () => {
    hookState.tickets = [
      makeTicket({ status: 'resolved', resolved_at: '2026-07-01T18:00:00Z' }),
      makeTicket({ status: 'pending' }),
    ];
    render(<Analytics />);
    expect(screen.getByText('50 %')).toBeInTheDocument();
  });

  it('gère l’absence de tickets sans planter', () => {
    render(<Analytics />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Taux de résolution')).toBeInTheDocument();
  });
});
