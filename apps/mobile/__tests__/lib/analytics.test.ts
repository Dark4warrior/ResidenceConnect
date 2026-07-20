import { computeKpis, formatDuration } from '../../lib/analytics';
import type {
  TicketStatus,
  TicketCategory,
  UrgencyLevel,
} from '@residenceconnect/shared';

function makeTicket(
  overrides: Partial<{
    status: TicketStatus;
    category: TicketCategory;
    urgency_level: UrgencyLevel;
    created_at: string;
    resolved_at: string | null;
  }> = {},
) {
  return {
    status: 'pending' as TicketStatus,
    category: 'plumbing' as TicketCategory,
    urgency_level: 'medium' as UrgencyLevel,
    created_at: '2026-07-01T08:00:00Z',
    resolved_at: null as string | null,
    ...overrides,
  };
}

describe('computeKpis', () => {
  it('renvoie des compteurs à zéro pour une liste vide', () => {
    const kpis = computeKpis([]);
    expect(kpis.total).toBe(0);
    expect(kpis.resolutionRate).toBe(0);
    expect(kpis.avgResolutionHours).toBeNull();
    expect(kpis.byStatus).toEqual({ pending: 0, in_progress: 0, resolved: 0 });
  });

  it('répartit par statut, catégorie et urgence', () => {
    const kpis = computeKpis([
      makeTicket({ status: 'pending', category: 'plumbing', urgency_level: 'low' }),
      makeTicket({ status: 'resolved', category: 'elevator', urgency_level: 'critical' }),
    ]);
    expect(kpis.total).toBe(2);
    expect(kpis.byStatus.pending).toBe(1);
    expect(kpis.byCategory.elevator).toBe(1);
    expect(kpis.byUrgency.critical).toBe(1);
  });

  it('calcule le taux de résolution arrondi', () => {
    const kpis = computeKpis([
      makeTicket({ status: 'resolved', resolved_at: '2026-07-01T10:00:00Z' }),
      makeTicket({ status: 'pending' }),
      makeTicket({ status: 'pending' }),
    ]);
    expect(kpis.resolutionRate).toBe(33);
  });

  it('calcule le délai moyen sur les résolus valides uniquement', () => {
    const kpis = computeKpis([
      makeTicket({
        status: 'resolved',
        created_at: '2026-07-01T08:00:00Z',
        resolved_at: '2026-07-01T18:00:00Z',
      }),
      makeTicket({
        status: 'resolved',
        created_at: '2026-07-01T00:00:00Z',
        resolved_at: '2026-07-01T20:00:00Z',
      }),
      makeTicket({
        status: 'resolved',
        created_at: '2026-07-02T00:00:00Z',
        resolved_at: '2026-07-01T00:00:00Z',
      }),
      makeTicket({ status: 'in_progress' }),
    ]);
    expect(kpis.avgResolutionHours).toBe(15);
  });
});

describe('formatDuration', () => {
  it('formate correctement', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(5)).toBe('5 h');
    expect(formatDuration(24)).toBe('1 j');
    expect(formatDuration(27)).toBe('1 j 3 h');
  });
});
