import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateTime,
  hoursBetween,
  formatDuration,
} from '../format';

describe('formatDate', () => {
  it('formate une date ISO au format français', () => {
    expect(formatDate('2026-07-01T08:00:00Z')).toBe('01/07/2026');
  });

  it('renvoie une chaîne vide pour une valeur absente ou invalide', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('pas-une-date')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('inclut l’heure et les minutes', () => {
    const out = formatDateTime('2026-07-01T08:30:00Z');
    expect(out).toMatch(/01\/07\/2026/);
    expect(out).toMatch(/\d{2}:\d{2}/);
  });

  it('renvoie une chaîne vide si invalide', () => {
    expect(formatDateTime(null)).toBe('');
  });
});

describe('hoursBetween', () => {
  it('calcule le nombre d’heures entre deux dates', () => {
    expect(
      hoursBetween('2026-07-01T08:00:00Z', '2026-07-01T14:00:00Z')
    ).toBe(6);
  });

  it('arrondit à l’heure la plus proche', () => {
    expect(
      hoursBetween('2026-07-01T08:00:00Z', '2026-07-01T09:40:00Z')
    ).toBe(2);
  });

  it('renvoie null si une borne manque', () => {
    expect(hoursBetween(null, '2026-07-01T09:00:00Z')).toBeNull();
    expect(hoursBetween('2026-07-01T08:00:00Z', null)).toBeNull();
  });

  it('renvoie null si la fin précède le début (incohérence)', () => {
    expect(
      hoursBetween('2026-07-02T08:00:00Z', '2026-07-01T08:00:00Z')
    ).toBeNull();
  });
});

describe('formatDuration', () => {
  it('affiche un tiret pour null', () => {
    expect(formatDuration(null)).toBe('—');
  });

  it('affiche les heures sous 24 h', () => {
    expect(formatDuration(5)).toBe('5 h');
  });

  it('affiche les jours et heures au-delà de 24 h', () => {
    expect(formatDuration(51)).toBe('2 j 3 h');
    expect(formatDuration(48)).toBe('2 j');
  });
});
