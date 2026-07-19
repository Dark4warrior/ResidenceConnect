import {
  computePriorityScore,
  priorityLabelFromScore,
} from '../src/scoring';
import type { TicketCategory, UrgencyLevel } from '../src/types';

const URGENCIES: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];
const CATEGORIES: TicketCategory[] = [
  'plumbing',
  'electricity',
  'elevator',
  'other',
];

describe('priorityLabelFromScore', () => {
  it('mappe les seuils sur les bons libellés', () => {
    expect(priorityLabelFromScore(0)).toBe('faible');
    expect(priorityLabelFromScore(29)).toBe('faible');
    expect(priorityLabelFromScore(30)).toBe('normale');
    expect(priorityLabelFromScore(59)).toBe('normale');
    expect(priorityLabelFromScore(60)).toBe('haute');
    expect(priorityLabelFromScore(89)).toBe('haute');
    expect(priorityLabelFromScore(90)).toBe('immédiate');
    expect(priorityLabelFromScore(100)).toBe('immédiate');
  });
});

describe('computePriorityScore', () => {
  it('calcule les valeurs de référence attendues', () => {
    // low(10) + other(0)
    expect(computePriorityScore('low', 'other')).toEqual({
      score: 10,
      label: 'faible',
    });
    // critical(90) + elevator(10) = 100
    expect(computePriorityScore('critical', 'elevator')).toEqual({
      score: 100,
      label: 'immédiate',
    });
    // high(65) + plumbing(4)
    expect(computePriorityScore('high', 'plumbing')).toEqual({
      score: 69,
      label: 'haute',
    });
  });

  it('borne toujours le score dans [0, 100]', () => {
    for (const u of URGENCIES) {
      for (const c of CATEGORIES) {
        const { score } = computePriorityScore(u, c);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(Number.isInteger(score)).toBe(true);
      }
    }
  });

  it('est monotone croissant avec l’urgence (catégorie fixe)', () => {
    for (const c of CATEGORIES) {
      const scores = URGENCIES.map((u) => computePriorityScore(u, c).score);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
      }
    }
  });

  it('priorise les catégories sensibles à urgence égale', () => {
    const u: UrgencyLevel = 'high';
    const elevator = computePriorityScore(u, 'elevator').score;
    const electricity = computePriorityScore(u, 'electricity').score;
    const plumbing = computePriorityScore(u, 'plumbing').score;
    const other = computePriorityScore(u, 'other').score;
    expect(elevator).toBeGreaterThan(electricity);
    expect(electricity).toBeGreaterThan(plumbing);
    expect(plumbing).toBeGreaterThan(other);
  });

  it('classe un incident critique d’ascenseur en priorité immédiate', () => {
    expect(computePriorityScore('critical', 'elevator').label).toBe('immédiate');
  });
});
