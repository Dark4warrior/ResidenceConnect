#!/usr/bin/env bash
# ============================================================================
# Tests automatisés des politiques Row Level Security (RLS)
#
# Vérifie, contre un projet Supabase réel, que le cloisonnement des données
# est bien appliqué par PostgreSQL — indépendamment du code client.
#
# PRÉREQUIS
#   1. Les 3 comptes de démonstration existent (voir supabase/seed.sql) :
#        manager@residenceconnect.dev / tenant@… / technicien@…
#   2. Le seed a été exécuté.
#   3. Variables d'environnement :
#        SUPABASE_URL       (ex. https://xxxx.supabase.co)
#        SUPABASE_ANON_KEY
#        RLS_TEST_PASSWORD  (mot de passe commun aux 3 comptes de test)
#
# USAGE
#   export SUPABASE_URL=... SUPABASE_ANON_KEY=... RLS_TEST_PASSWORD=...
#   ./scripts/test-rls.sh
#
# Sort en code 0 si tous les tests passent, 1 sinon (utilisable en CI).
# ============================================================================
set -uo pipefail

URL="${SUPABASE_URL:-}"
KEY="${SUPABASE_ANON_KEY:-}"
PASSWORD="${RLS_TEST_PASSWORD:-}"

if [ -z "$URL" ] || [ -z "$KEY" ] || [ -z "$PASSWORD" ]; then
  echo "ERREUR : SUPABASE_URL, SUPABASE_ANON_KEY et RLS_TEST_PASSWORD doivent être définies." >&2
  exit 2
fi

PASS=0
FAIL=0

green() { printf "  \033[32mOK\033[0m   %s\n" "$1"; }
red()   { printf "  \033[31mECHEC\033[0m %s\n" "$1"; }

# Compare une valeur observée à une valeur attendue.
check() {
  local label="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    green "$label (= $actual)"
    PASS=$((PASS + 1))
  else
    red "$label — attendu '$expected', obtenu '$actual'"
    FAIL=$((FAIL + 1))
  fi
}

# Authentifie un compte et renvoie son access_token.
login() {
  curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
    -H "apikey: $KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null
}

# Nombre de lignes renvoyées par une requête REST pour un jeton donné.
count() {
  curl -s "$URL/rest/v1/$2" -H "apikey: $KEY" -H "Authorization: Bearer $1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null
}

echo "=============================================================="
echo " Tests RLS — ResidenceConnect"
echo "=============================================================="

# ---------- Authentification ----------
echo
echo "[1] Authentification des comptes de test"
TOK_MANAGER=$(login "manager@residenceconnect.dev")
TOK_TENANT=$(login "tenant@residenceconnect.dev")
TOK_TECH=$(login "technicien@residenceconnect.dev")

for pair in "gestionnaire:$TOK_MANAGER" "locataire:$TOK_TENANT" "technicien:$TOK_TECH"; do
  name="${pair%%:*}"; tok="${pair#*:}"
  if [ -n "$tok" ]; then green "connexion $name"; PASS=$((PASS + 1));
  else red "connexion $name impossible"; FAIL=$((FAIL + 1)); fi
done

if [ -z "$TOK_MANAGER" ] || [ -z "$TOK_TENANT" ] || [ -z "$TOK_TECH" ]; then
  echo; echo "Abandon : impossible de poursuivre sans les trois sessions." >&2
  exit 1
fi

# ---------- Lecture : cloisonnement par rôle ----------
echo
echo "[2] Lecture — chaque rôle ne voit que ce qui le concerne"
check "gestionnaire voit tous les tickets"        "4" "$(count "$TOK_MANAGER" 'tickets?select=id')"
check "technicien ne voit que ses missions"       "2" "$(count "$TOK_TECH"    'tickets?select=id')"
check "locataire ne voit que son profil"          "1" "$(count "$TOK_TENANT"  'profiles?select=id')"
check "gestionnaire voit tous les logements"      "3" "$(count "$TOK_MANAGER" 'apartments?select=id')"
check "locataire ne voit pas le logement vacant"  "2" "$(count "$TOK_TENANT"  'apartments?select=id')"
check "locataire voit ses notifications"          "2" "$(count "$TOK_TENANT"  'notifications?select=id')"
check "gestionnaire ne voit pas celles du locataire" "0" "$(count "$TOK_MANAGER" 'notifications?select=id')"

# ---------- Écriture : politiques UPDATE ----------
echo
echo "[3] Écriture — seules les personnes habilitées peuvent modifier"

TICKET_ID=$(curl -s "$URL/rest/v1/tickets?select=id,status&status=eq.in_progress&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $TOK_MANAGER" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)

if [ -z "$TICKET_ID" ]; then
  red "aucun ticket 'in_progress' trouvé — relance supabase/seed.sql"
  FAIL=$((FAIL + 1))
else
  # Le locataire NE DOIT PAS pouvoir changer le statut (0 ligne modifiée).
  n=$(curl -s -X PATCH "$URL/rest/v1/tickets?id=eq.$TICKET_ID" \
        -H "apikey: $KEY" -H "Authorization: Bearer $TOK_TENANT" \
        -H "Content-Type: application/json" -H "Prefer: return=representation" \
        -d '{"status":"resolved"}' \
      | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
  check "locataire NE PEUT PAS changer le statut" "0" "$n"

  # Le gestionnaire DOIT pouvoir le faire.
  n=$(curl -s -X PATCH "$URL/rest/v1/tickets?id=eq.$TICKET_ID" \
        -H "apikey: $KEY" -H "Authorization: Bearer $TOK_MANAGER" \
        -H "Content-Type: application/json" -H "Prefer: return=representation" \
        -d '{"status":"resolved","resolved_at":"2026-01-01T00:00:00Z"}' \
      | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
  check "gestionnaire PEUT changer le statut" "1" "$n"

  # Restauration de l'état initial pour que le script reste rejouable.
  curl -s -o /dev/null -X PATCH "$URL/rest/v1/tickets?id=eq.$TICKET_ID" \
    -H "apikey: $KEY" -H "Authorization: Bearer $TOK_MANAGER" \
    -H "Content-Type: application/json" \
    -d '{"status":"in_progress","resolved_at":null}'
fi

# ---------- Audit immuable ----------
echo
echo "[4] Journal d'audit — non modifiable"
HIST_ID=$(curl -s "$URL/rest/v1/ticket_history?select=id&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $TOK_MANAGER" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)

if [ -n "$HIST_ID" ]; then
  n=$(curl -s -X PATCH "$URL/rest/v1/ticket_history?id=eq.$HIST_ID" \
        -H "apikey: $KEY" -H "Authorization: Bearer $TOK_MANAGER" \
        -H "Content-Type: application/json" -H "Prefer: return=representation" \
        -d '{"comment":"tentative de falsification"}' \
      | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
  check "l'historique NE PEUT PAS être réécrit" "0" "$n"
fi

# ---------- Accès anonyme ----------
echo
echo "[5] Accès anonyme — aucune donnée exposée sans session"
check "anonyme ne lit aucun ticket"  "0" "$(count "$KEY" 'tickets?select=id')"
check "anonyme ne lit aucun profil"  "0" "$(count "$KEY" 'profiles?select=id')"

# ---------- Bilan ----------
echo
echo "=============================================================="
printf " Résultat : %d réussite(s), %d échec(s)\n" "$PASS" "$FAIL"
echo "=============================================================="
[ "$FAIL" -eq 0 ] || exit 1
