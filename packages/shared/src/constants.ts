import type { TicketStatus, TicketCategory, UrgencyLevel } from './types';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  resolved: 'Résolu',
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  plumbing: 'Plomberie',
  electricity: 'Électricité',
  elevator: 'Ascenseur',
  other: 'Autre',
};

export const URGENCY_LEVEL_LABELS: Record<UrgencyLevel, string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  critical: 'Critique',
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  pending: '#94a3b8',
  in_progress: '#3b82f6',
  resolved: '#22c55e',
};
