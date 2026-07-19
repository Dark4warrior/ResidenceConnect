import type { TicketCategory, UrgencyLevel } from './types';

/**
 * Niveaux de priorité calculée, du moins au plus prioritaire.
 */
export type PriorityLabel = 'faible' | 'normale' | 'haute' | 'immédiate';

/**
 * Score de base par niveau d'urgence déclaré (0–90).
 * L'urgence reste le facteur dominant du score.
 */
const URGENCY_BASE: Record<UrgencyLevel, number> = {
  low: 10,
  medium: 35,
  high: 65,
  critical: 90,
};

/**
 * Bonus lié à la nature de l'incident. Les catégories à risque pour la
 * sécurité des personnes (ascenseur : personnes bloquées ; électricité :
 * risque d'incendie) sont pondérées plus fortement.
 */
const CATEGORY_BOOST: Record<TicketCategory, number> = {
  elevator: 10,
  electricity: 7,
  plumbing: 4,
  other: 0,
};

export interface PriorityScore {
  /** Score entier borné à [0, 100]. */
  score: number;
  /** Libellé lisible dérivé du score. */
  label: PriorityLabel;
}

/**
 * Convertit un score en libellé de priorité selon des seuils fixes.
 */
export function priorityLabelFromScore(score: number): PriorityLabel {
  if (score >= 90) return 'immédiate';
  if (score >= 60) return 'haute';
  if (score >= 30) return 'normale';
  return 'faible';
}

/**
 * Calcule un score de priorité déterministe pour un ticket, à partir de son
 * niveau d'urgence et de sa catégorie.
 *
 * Propriétés garanties :
 * - le résultat est un entier borné dans l'intervalle [0, 100] ;
 * - à catégorie égale, un niveau d'urgence supérieur donne un score supérieur
 *   ou égal (monotonie) ;
 * - à urgence égale, une catégorie plus sensible donne un score supérieur ou
 *   égal.
 *
 * Fonction pure : aucun effet de bord, aucune dépendance externe. Elle
 * constitue le cœur métier réutilisable par le mobile, le web et la future
 * Edge Function `priority-scoring`.
 */
export function computePriorityScore(
  urgency: UrgencyLevel,
  category: TicketCategory
): PriorityScore {
  const raw = URGENCY_BASE[urgency] + CATEGORY_BOOST[category];
  const score = Math.max(0, Math.min(100, raw));
  return { score, label: priorityLabelFromScore(score) };
}
