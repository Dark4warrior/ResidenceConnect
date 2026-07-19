import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  URGENCY_LEVEL_LABELS,
  URGENCY_COLORS,
  STATUS_COLORS,
} from '../src/constants';
import type {
  TicketStatus,
  TicketCategory,
  UrgencyLevel,
} from '../src/types';

// Valeurs de référence : doivent rester synchronisées avec les contraintes
// CHECK des colonnes en base (migration 001_initial_schema.sql).
const STATUSES: TicketStatus[] = ['pending', 'in_progress', 'resolved'];
const CATEGORIES: TicketCategory[] = [
  'plumbing',
  'electricity',
  'elevator',
  'other',
];
const URGENCIES: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];

const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

describe('constants partagées', () => {
  describe('libellés de statut', () => {
    it('couvre exactement les trois statuts', () => {
      expect(Object.keys(TICKET_STATUS_LABELS).sort()).toEqual(
        [...STATUSES].sort()
      );
    });

    it('fournit un libellé français non vide pour chaque statut', () => {
      STATUSES.forEach((s) => {
        expect(TICKET_STATUS_LABELS[s]).toBeTruthy();
      });
      expect(TICKET_STATUS_LABELS.in_progress).toBe('En cours');
    });
  });

  describe('libellés de catégorie', () => {
    it('couvre exactement les quatre catégories', () => {
      expect(Object.keys(TICKET_CATEGORY_LABELS).sort()).toEqual(
        [...CATEGORIES].sort()
      );
    });

    it('traduit correctement les catégories techniques', () => {
      expect(TICKET_CATEGORY_LABELS.plumbing).toBe('Plomberie');
      expect(TICKET_CATEGORY_LABELS.elevator).toBe('Ascenseur');
    });
  });

  describe('libellés d’urgence', () => {
    it('couvre exactement les quatre niveaux', () => {
      expect(Object.keys(URGENCY_LEVEL_LABELS).sort()).toEqual(
        [...URGENCIES].sort()
      );
    });
  });

  describe('palettes de couleurs', () => {
    it('associe une couleur hexadécimale valide à chaque niveau d’urgence', () => {
      URGENCIES.forEach((u) => {
        expect(isHexColor(URGENCY_COLORS[u])).toBe(true);
      });
    });

    it('associe une couleur hexadécimale valide à chaque statut', () => {
      STATUSES.forEach((s) => {
        expect(isHexColor(STATUS_COLORS[s])).toBe(true);
      });
    });

    it('utilise des couleurs distinctes selon la gravité de l’urgence', () => {
      const values = URGENCIES.map((u) => URGENCY_COLORS[u]);
      expect(new Set(values).size).toBe(URGENCIES.length);
    });
  });
});
