import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  URGENCY_LEVEL_LABELS,
} from '@residenceconnect/shared';
import type { TicketRow } from '../types';
import { formatDateTime } from './format';

/**
 * Séparateur de colonnes. On utilise le **point-virgule** et non la virgule :
 * c'est le séparateur attendu par Excel en locale française. Avec une virgule,
 * Excel FR place toute la ligne dans une seule colonne.
 */
export const CSV_SEPARATOR = ';';

/**
 * Marque d'ordre des octets (BOM) UTF-8. Sans elle, Excel interprète le
 * fichier en ANSI et casse les accents (« Résolu » → « RÃ©solu »).
 * À placer en tête du fichier téléchargé.
 */
export const UTF8_BOM = '﻿';

// En-têtes du fichier exporté (ordre des colonnes).
const HEADERS = [
  'Titre',
  'Statut',
  'Catégorie',
  'Urgence',
  'Résidence',
  'Logement',
  'Déclarant',
  'Assigné à',
  'Créé le',
  'Résolu le',
] as const;

/**
 * Échappe une valeur selon la RFC 4180 : entoure de guillemets si elle
 * contient un séparateur, un guillemet ou un saut de ligne, et double les
 * guillemets internes. La virgule est également traitée pour rester
 * interopérable si le séparateur venait à changer.
 */
export function escapeCsvValue(value: string): string {
  if (/[",;\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convertit une liste de tickets en texte CSV (séparateur virgule, en-tête
 * inclus). Toujours au moins la ligne d'en-tête, même sans ticket.
 * Fonction pure.
 */
export function ticketsToCsv(tickets: TicketRow[]): string {
  const rows = tickets.map((t) =>
    [
      t.title,
      TICKET_STATUS_LABELS[t.status],
      TICKET_CATEGORY_LABELS[t.category],
      URGENCY_LEVEL_LABELS[t.urgency_level],
      t.apartment?.residence?.name ?? '',
      t.apartment?.unit_number ?? '',
      t.reporter?.full_name ?? '',
      t.assignee?.full_name ?? '',
      formatDateTime(t.created_at),
      formatDateTime(t.resolved_at),
    ]
      .map((v) => escapeCsvValue(String(v)))
      .join(CSV_SEPARATOR)
  );

  return [HEADERS.join(CSV_SEPARATOR), ...rows].join('\r\n');
}
