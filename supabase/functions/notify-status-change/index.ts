import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Statuts métier des tickets (alignés sur le CHECK SQL). */
type TicketStatus = 'pending' | 'in_progress' | 'resolved';

/** Libellés français affichés dans les notifications. */
const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  resolved: 'Résolu',
};

interface TicketRecord {
  id: string;
  title: string;
  status: TicketStatus;
  reported_by: string;
}

interface WebhookPayload {
  type?: string;
  table?: string;
  schema?: string;
  record?: TicketRecord;
  old_record?: TicketRecord;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status as TicketStatus] ?? status;
}

/**
 * Envoie un push Expo à chaque token de l'utilisateur.
 * L'API accepte un tableau de messages en une seule requête.
 */
async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (tokens.length === 0) {
    console.log('[notify-status-change] Aucun push_token à notifier.');
    return;
  }

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data,
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Échec API Expo Push (${res.status}) : ${text}`);
  }

  const result = await res.json();
  console.log('[notify-status-change] Réponse Expo Push :', JSON.stringify(result));
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Méthode non autorisée. Utilisez POST.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        '[notify-status-change] Secrets manquants : SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY.',
      );
      return jsonResponse(
        {
          error:
            'Configuration serveur incomplète : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.',
        },
        500,
      );
    }

    let payload: WebhookPayload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: 'Corps JSON invalide.' }, 400);
    }

    const { record, old_record } = payload;

    if (!record || !old_record) {
      return jsonResponse(
        { error: 'Payload webhook invalide : record et old_record sont requis.' },
        400,
      );
    }

    // Pas de changement de statut → rien à faire
    if (record.status === old_record.status) {
      console.log(
        `[notify-status-change] Statut inchangé (${record.status}) pour le ticket ${record.id} — ignoré.`,
      );
      return jsonResponse({ skipped: true }, 200);
    }

    const message =
      `Votre signalement « ${record.title} » est passé au statut : ${statusLabel(record.status)}.`;

    console.log(
      `[notify-status-change] Ticket ${record.id} : ${old_record.status} → ${record.status}`,
    );

    // Client service_role : contourne le RLS pour écrire les notifications
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: insertError } = await supabase.from('notifications').insert({
      user_id: record.reported_by,
      ticket_id: record.id,
      type: 'status_changed',
      message,
      is_read: false,
    });

    if (insertError) {
      console.error('[notify-status-change] Échec insert notifications :', insertError);
      return jsonResponse(
        { error: `Impossible de créer la notification : ${insertError.message}` },
        500,
      );
    }

    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', record.reported_by);

    if (tokensError) {
      console.error('[notify-status-change] Échec lecture push_tokens :', tokensError);
      return jsonResponse(
        { error: `Impossible de lire les push_tokens : ${tokensError.message}` },
        500,
      );
    }

    const expoTokens = (tokens ?? []).map((row) => row.expo_push_token as string);

    await sendExpoPush(expoTokens, 'Mise à jour de votre signalement', message, {
      ticket_id: record.id,
      type: 'status_changed',
      status: record.status,
    });

    console.log(
      `[notify-status-change] Notification créée et ${expoTokens.length} push(s) envoyé(s).`,
    );

    return jsonResponse({
      ok: true,
      notification_created: true,
      pushes_sent: expoTokens.length,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[notify-status-change] Erreur non gérée :', detail);
    return jsonResponse({ error: detail }, 500);
  }
});
