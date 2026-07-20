# API — Edge Functions ResidenceConnect

Documentation des Edge Functions Deno déployées sous `supabase/functions/`.

URL de base (projet lié) :

```
https://<PROJECT_REF>.supabase.co/functions/v1/<function-name>
```

En local (`supabase functions serve`) :

```
http://127.0.0.1:54321/functions/v1/<function-name>
```

---

## 1. `priority-scoring`

Calcule un score de priorité déterministe à partir de l'urgence et de la catégorie
d'un ticket. L'algorithme est une copie locale de
`packages/shared/src/scoring.ts` (fichier
`supabase/functions/priority-scoring/scoring.ts`).

| | |
|---|---|
| **Méthode** | `POST` |
| **Auth JWT** | Non requise (`verify_jwt = false`) |
| **CORS** | Oui (`OPTIONS` + en-têtes `Access-Control-Allow-*`) |

### Corps d'entrée

```json
{
  "urgency": "low | medium | high | critical",
  "category": "plumbing | electricity | elevator | other"
}
```

### Réponses

**200** — score calculé :

```json
{ "score": 75, "label": "haute" }
```

Libellés possibles : `faible` | `normale` | `haute` | `immédiate`.

**400** — entrée invalide :

```json
{ "error": "urgency invalide. Valeurs acceptées : low | medium | high | critical." }
```

**405** — méthode autre que `POST` / `OPTIONS`.

### Exemple curl

```bash
curl -i -X POST 'http://127.0.0.1:54321/functions/v1/priority-scoring' \
  -H 'Content-Type: application/json' \
  -d '{"urgency":"high","category":"elevator"}'
```

---

## 2. `notify-status-change`

Réagit à un **Database Webhook** sur `UPDATE` de `public.tickets` : si le statut
change, crée une notification (`type = status_changed`) pour le déclarant
(`reported_by`) via le client `service_role` (contourne le RLS), puis envoie un
push Expo à chaque `push_tokens.expo_push_token` de cet utilisateur.

| | |
|---|---|
| **Méthode** | `POST` |
| **Auth JWT** | Requise (`verify_jwt = true`) — envoyer `Authorization: Bearer <anon_ou_service_key>` |
| **Secrets** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (via `Deno.env`) |

### Corps d'entrée (payload webhook Supabase)

```json
{
  "type": "UPDATE",
  "table": "tickets",
  "schema": "public",
  "record": {
    "id": "…",
    "title": "Fuite cuisine",
    "status": "in_progress",
    "reported_by": "…"
  },
  "old_record": {
    "id": "…",
    "title": "Fuite cuisine",
    "status": "pending",
    "reported_by": "…"
  }
}
```

### Réponses

**200** — statut inchangé :

```json
{ "skipped": true }
```

**200** — notification créée + pushes envoyés :

```json
{
  "ok": true,
  "notification_created": true,
  "pushes_sent": 2
}
```

**400** — JSON / payload invalide (`record` / `old_record` manquants).

**500** — secrets absents, erreur Supabase, ou échec API Expo :

```json
{ "error": "…" }
```

Message notification (exemple) :

> Votre signalement « Fuite cuisine » est passé au statut : En cours.

Traduction des statuts : `pending` → En attente, `in_progress` → En cours,
`resolved` → Résolu.

### Brancher le Database Webhook

1. Dashboard Supabase → **Database** → **Webhooks** → **Create a new hook**.
2. Table : `tickets` · Événement : `UPDATE`.
3. Type : **Supabase Edge Functions** → `notify-status-change`
   (ou URL HTTP vers
   `https://<PROJECT_REF>.supabase.co/functions/v1/notify-status-change`).
4. Ajouter l'en-tête `Authorization: Bearer <SUPABASE_ANON_KEY>` (ou service role)
   pour satisfaire `verify_jwt = true`.
5. Vérifier que les secrets `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont
   disponibles pour la fonction (injectés automatiquement en prod Supabase ;
   à exporter en local si besoin).

---

## Commandes — test local

Prérequis : [Supabase CLI](https://supabase.com/docs/guides/cli), Deno et/ou Docker.

```bash
# Démarrer la stack locale (DB + API + Functions runtime)
supabase start

# Servir les Edge Functions en local (hot-reload)
supabase functions serve

# Ou une seule fonction :
supabase functions serve priority-scoring --no-verify-jwt
supabase functions serve notify-status-change
```

Test `priority-scoring` :

```bash
curl -X POST 'http://127.0.0.1:54321/functions/v1/priority-scoring' \
  -H 'Content-Type: application/json' \
  -d '{"urgency":"critical","category":"electricity"}'
```

Test `notify-status-change` (payload simulé) :

```bash
curl -X POST 'http://127.0.0.1:54321/functions/v1/notify-status-change' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "type": "UPDATE",
    "table": "tickets",
    "schema": "public",
    "record": {
      "id": "<ticket-uuid>",
      "title": "Ascenseur bloqué",
      "status": "in_progress",
      "reported_by": "<user-uuid>"
    },
    "old_record": {
      "id": "<ticket-uuid>",
      "title": "Ascenseur bloqué",
      "status": "pending",
      "reported_by": "<user-uuid>"
    }
  }'
```

---

## Commandes — déploiement

```bash
# Déployer chaque fonction
supabase functions deploy priority-scoring
supabase functions deploy notify-status-change

# Secrets (notify-status-change) — SUPABASE_URL est souvent déjà injecté
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

Après déploiement, configurer le webhook Dashboard comme décrit ci-dessus.
