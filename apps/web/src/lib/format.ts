/**
 * Formate une date ISO en date lisible française (JJ/MM/AAAA).
 * Renvoie une chaîne vide si la valeur est absente ou invalide.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formate une date ISO en date + heure française.
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Durée en heures (arrondie) entre deux dates ISO.
 * Renvoie `null` si l'une des bornes manque ou est invalide, ou si la fin
 * précède le début (données incohérentes).
 */
export function hoursBetween(
  startIso: string | null | undefined,
  endIso: string | null | undefined
): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  if (end < start) return null;
  return Math.round((end - start) / (1000 * 60 * 60));
}

/**
 * Formate une durée en heures sous forme lisible ("—", "5 h", "2 j 3 h").
 */
export function formatDuration(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0 ? `${days} j` : `${days} j ${rest} h`;
}
