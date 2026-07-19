import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import { makeTicket } from '../../test/fixtures';
import type { TicketRow } from '../../types';

// État du hook injecté par test.
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

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  hookState.tickets = [];
  hookState.loading = false;
  hookState.error = null;
});

describe('Dashboard', () => {
  it('affiche un état vide quand il n’y a aucun ticket', () => {
    renderDashboard();
    expect(screen.getByText(/aucun ticket à afficher/i)).toBeInTheDocument();
  });

  it('affiche un message d’erreur explicite', () => {
    hookState.error = 'permission denied';
    renderDashboard();
    expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
  });

  it('liste les tickets et les trie par urgence décroissante', () => {
    hookState.tickets = [
      makeTicket({ title: 'Ampoule', urgency_level: 'low' }),
      makeTicket({ title: 'Ascenseur bloqué', urgency_level: 'critical' }),
    ];
    renderDashboard();

    const rows = screen.getAllByRole('row').slice(1); // hors en-tête
    expect(rows).toHaveLength(2);
    // Le plus urgent (critical) doit apparaître en premier.
    expect(within(rows[0]).getByText('Ascenseur bloqué')).toBeInTheDocument();
  });

  it('filtre la liste via le champ de recherche', async () => {
    const user = userEvent.setup();
    hookState.tickets = [
      makeTicket({ title: 'Ampoule grillée' }),
      makeTicket({ title: 'Ascenseur bloqué' }),
    ];
    renderDashboard();

    await user.type(
      screen.getByLabelText(/rechercher un ticket/i),
      'ascenseur'
    );

    expect(screen.getByText('Ascenseur bloqué')).toBeInTheDocument();
    expect(screen.queryByText('Ampoule grillée')).not.toBeInTheDocument();
  });

  it('désactive l’export CSV quand la liste visible est vide', () => {
    renderDashboard();
    expect(
      screen.getByRole('button', { name: /exporter en csv/i })
    ).toBeDisabled();
  });
});
