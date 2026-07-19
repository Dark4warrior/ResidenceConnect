import { describe, it, expect } from 'vitest';
import { computeKpis } from '../analytics';
import { makeTicket } from '../../test/fixtures';

describe('computeKpis', () => {
  it('renvoie des compteurs à zéro et des valeurs neutres pour une liste vide', () => {
    const kpis = computeKpis([]);
    expect(kpis.total).toBe(0);
    expect(kpis.byStatus).toEqual({ pending: 0, in_progress: 0, resolved: 0 });
    expect(kpis.avgResolutionHours).toBeNull();
    expect(kpis.resolutionRate).toBe(0);
    expect(kpis.topCategory).toBeNull();
  });

  it('répartit correctement par statut, catégorie et urgence', () => {
    const kpis = computeKpis([
      makeTicket({ status: 'pending', category: 'plumbing', urgency_level: 'low' }),
      makeTicket({ status: 'pending', category: 'plumbing', urgency_level: 'high' }),
      makeTicket({ status: 'resolved', category: 'elevator', urgency_level: 'critical' }),
    ]);
    expect(kpis.total).toBe(3);
    expect(kpis.byStatus.pending).toBe(2);
    expect(kpis.byCategory.plumbing).toBe(2);
    expect(kpis.byUrgency.critical).toBe(1);
    expect(kpis.topCategory).toBe('plumbing');
  });

  it('calcule le taux de résolution en pourcentage arrondi', () => {
    const kpis = computeKpis([
      makeTicket({ status: 'resolved', resolved_at: '2026-07-01T10:00:00Z' }),
      makeTicket({ status: 'pending' }),
      makeTicket({ status: 'pending' }),
    ]);
    expect(kpis.resolutionRate).toBe(33);
  });

  it('calcule le délai moyen de résolution sur les seuls tickets résolus valides', () => {
    const kpis = computeKpis([
      // résolu en 10 h
      makeTicket({
        status: 'resolved',
        created_at: '2026-07-01T08:00:00Z',
        resolved_at: '2026-07-01T18:00:00Z',
      }),
      // résolu en 20 h
      makeTicket({
        status: 'resolved',
        created_at: '2026-07-01T00:00:00Z',
        resolved_at: '2026-07-01T20:00:00Z',
      }),
      // résolu mais date incohérente → ignoré du calcul de moyenne
      makeTicket({
        status: 'resolved',
        created_at: '2026-07-02T00:00:00Z',
        resolved_at: '2026-07-01T00:00:00Z',
      }),
      // non résolu → ignoré
      makeTicket({ status: 'in_progress' }),
    ]);
    // moyenne de 10 et 20 = 15
    expect(kpis.avgResolutionHours).toBe(15);
  });

  it('ignore les tickets marqués résolus sans date de résolution', () => {
    const kpis = computeKpis([
      makeTicket({ status: 'resolved', resolved_at: null }),
    ]);
    expect(kpis.avgResolutionHours).toBeNull();
    expect(kpis.resolutionRate).toBe(100);
  });
});
