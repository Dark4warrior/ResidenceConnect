import type { TicketRow } from '../types';

/**
 * Fabrique un ticket de test avec des valeurs par défaut réalistes,
 * surchargeables champ par champ.
 */
export function makeTicket(overrides: Partial<TicketRow> = {}): TicketRow {
  return {
    id: 't-' + Math.random().toString(36).slice(2, 8),
    apartment_id: 'a1',
    reported_by: 'p-tenant',
    assigned_to: null,
    title: 'Fuite sous l’évier',
    description: 'De l’eau s’écoule en continu',
    category: 'plumbing',
    urgency_level: 'high',
    status: 'pending',
    created_at: '2026-07-01T08:00:00Z',
    updated_at: '2026-07-01T08:00:00Z',
    resolved_at: null,
    apartment: {
      id: 'a1',
      unit_number: 'B12',
      residence: { id: 'r1', name: 'Les Tilleuls' },
    },
    reporter: { id: 'p-tenant', full_name: 'Camille Dupont' },
    assignee: null,
    ...overrides,
  };
}
