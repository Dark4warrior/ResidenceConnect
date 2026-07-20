import { computePriorityScore as shared } from '../src/scoring';
// La fonction Edge `priority-scoring` embarque une COPIE de l'algorithme
// (Deno ne peut pas résoudre le package workspace). Ce test garantit que la
// copie ne dérive jamais de la source de vérité.
import { computePriorityScore as edgeCopy } from '../../../supabase/functions/priority-scoring/scoring';
import type { TicketCategory, UrgencyLevel } from '../src/types';

const URGENCIES: UrgencyLevel[] = ['low', 'medium', 'high', 'critical'];
const CATEGORIES: TicketCategory[] = [
  'plumbing',
  'electricity',
  'elevator',
  'other',
];

describe('synchronisation scoring shared ↔ Edge Function', () => {
  it.each(
    URGENCIES.flatMap((u) => CATEGORIES.map((c) => [u, c] as const))
  )(
    'donne un résultat identique pour %s / %s',
    (urgency, category) => {
      expect(edgeCopy(urgency, category)).toEqual(shared(urgency, category));
    }
  );
});
