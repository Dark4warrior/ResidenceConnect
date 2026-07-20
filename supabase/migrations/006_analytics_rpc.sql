-- Migration 006 : Module analytique côté base (fonctions RPC)
--
-- Ces fonctions calculent les indicateurs directement en SQL plutôt que côté
-- client : le calcul reste performant même sur un grand volume de tickets, et
-- le client ne télécharge que le résultat agrégé (quelques octets) au lieu de
-- toute la liste.
--
-- SECURITY INVOKER (comportement par défaut, rendu explicite) : les fonctions
-- s'exécutent avec l'identité de l'appelant, donc les politiques RLS de la
-- table `tickets` s'appliquent. Un gestionnaire n'obtient les statistiques que
-- de SES résidences, un locataire que de ses propres signalements.
--
-- search_path = '' impose de qualifier chaque objet (protection contre le
-- détournement de schéma).

-- ============================================================
-- get_ticket_analytics()
-- Indicateurs globaux sur les tickets visibles par l'appelant.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ticket_analytics()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH visible AS (
    SELECT status, category, urgency_level, created_at, resolved_at
    FROM public.tickets
  )
  SELECT json_build_object(
    'total', (SELECT count(*) FROM visible),
    'byStatus', json_build_object(
      'pending',     (SELECT count(*) FROM visible WHERE status = 'pending'),
      'in_progress', (SELECT count(*) FROM visible WHERE status = 'in_progress'),
      'resolved',    (SELECT count(*) FROM visible WHERE status = 'resolved')
    ),
    'byCategory', json_build_object(
      'plumbing',    (SELECT count(*) FROM visible WHERE category = 'plumbing'),
      'electricity', (SELECT count(*) FROM visible WHERE category = 'electricity'),
      'elevator',    (SELECT count(*) FROM visible WHERE category = 'elevator'),
      'other',       (SELECT count(*) FROM visible WHERE category = 'other')
    ),
    'byUrgency', json_build_object(
      'low',      (SELECT count(*) FROM visible WHERE urgency_level = 'low'),
      'medium',   (SELECT count(*) FROM visible WHERE urgency_level = 'medium'),
      'high',     (SELECT count(*) FROM visible WHERE urgency_level = 'high'),
      'critical', (SELECT count(*) FROM visible WHERE urgency_level = 'critical')
    ),
    'resolutionRate', (
      SELECT CASE
        WHEN count(*) = 0 THEN 0
        ELSE round(100.0 * count(*) FILTER (WHERE status = 'resolved') / count(*))
      END
      FROM visible
    ),
    -- Délai moyen de résolution (heures), sur les seuls tickets résolus dont
    -- la date de résolution est cohérente. NULL si aucun.
    'avgResolutionHours', (
      SELECT round(avg(extract(epoch FROM (resolved_at - created_at)) / 3600.0))
      FROM visible
      WHERE status = 'resolved'
        AND resolved_at IS NOT NULL
        AND resolved_at >= created_at
    )
  );
$$;

-- ============================================================
-- get_category_breakdown()
-- Récurrence et performance par catégorie : combien d'incidents, combien
-- résolus, et délai moyen de résolution pour chaque type.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_category_breakdown()
RETURNS TABLE (
  category            TEXT,
  total               BIGINT,
  resolved            BIGINT,
  avg_resolution_hours NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    t.category,
    count(*) AS total,
    count(*) FILTER (WHERE t.status = 'resolved') AS resolved,
    round(
      avg(extract(epoch FROM (t.resolved_at - t.created_at)) / 3600.0)
      FILTER (
        WHERE t.status = 'resolved'
          AND t.resolved_at IS NOT NULL
          AND t.resolved_at >= t.created_at
      )
    ) AS avg_resolution_hours
  FROM public.tickets t
  GROUP BY t.category
  ORDER BY total DESC;
$$;

-- Autorise les rôles authentifiés à appeler ces fonctions.
GRANT EXECUTE ON FUNCTION public.get_ticket_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_category_breakdown() TO authenticated;
