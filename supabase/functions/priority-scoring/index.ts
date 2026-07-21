import { computePriorityScore, type TicketCategory, type UrgencyLevel } from './scoring.ts';

/** En-têtes CORS partagés (préflight + réponses JSON). */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_URGENCIES = new Set<UrgencyLevel>(['low', 'medium', 'high', 'critical']);
const VALID_CATEGORIES = new Set<TicketCategory>([
  'plumbing',
  'electricity',
  'elevator',
  'other',
]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Préflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Méthode non autorisée. Utilisez POST.' }, 405);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Corps JSON invalide.' }, 400);
  }

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return jsonResponse({ error: 'Le corps doit être un objet JSON { urgency, category }.' }, 400);
  }

  const { urgency, category } = payload as Record<string, unknown>;

  if (typeof urgency !== 'string' || !VALID_URGENCIES.has(urgency as UrgencyLevel)) {
    return jsonResponse(
      {
        error:
          'urgency invalide. Valeurs acceptées : low | medium | high | critical.',
      },
      400,
    );
  }

  if (typeof category !== 'string' || !VALID_CATEGORIES.has(category as TicketCategory)) {
    return jsonResponse(
      {
        error:
          'category invalide. Valeurs acceptées : plumbing | electricity | elevator | other.',
      },
      400,
    );
  }

  const result = computePriorityScore(
    urgency as UrgencyLevel,
    category as TicketCategory,
  );

  return jsonResponse(result, 200);
});
