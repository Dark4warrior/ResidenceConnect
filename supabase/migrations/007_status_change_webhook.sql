-- Migration 007 : Webhook de changement de statut (déclenche l'Edge Function)
--
-- Équivalent versionné d'un « Database Webhook » Supabase : quand le statut
-- d'un ticket change, un trigger appelle l'Edge Function notify-status-change
-- (qui crée la notification et envoie le push). Le mettre dans une migration
-- plutôt que de le configurer dans le dashboard le rend visible, relu et
-- reproductible à partir du seul dépôt.
--
-- L'appel HTTP passe par pg_net (asynchrone) : un échec du webhook ne bloque
-- jamais la mise à jour du ticket.

-- Extension pour les requêtes HTTP sortantes depuis PostgreSQL.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://ymwhvjtvdktinoyxafdr.supabase.co/functions/v1/notify-status-change',
    body := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'tickets',
      'schema', 'public',
      'record', to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- Clé anon PUBLIQUE (déjà livrée dans les apps clientes) : elle sert
      -- uniquement à satisfaire verify_jwt de l'Edge Function. La fonction
      -- écrit ensuite avec sa propre clé service_role injectée par Supabase.
      -- Pour un autre projet : adapter cette URL et cette clé anon.
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltd2h2anR2ZGt0aW5veXhhZmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDk5MjQsImV4cCI6MjA5NTg4NTkyNH0.01f6ZVbvZE9_hYECwpCH3JkbWK_odisWEq5QX6NXUH8'
    )
  );
  RETURN NEW;
END;
$$;

-- Ne se déclenche qu'au VRAI changement de statut (pas à chaque UPDATE).
DROP TRIGGER IF EXISTS on_ticket_status_change ON public.tickets;
CREATE TRIGGER on_ticket_status_change
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_ticket_status_change();
