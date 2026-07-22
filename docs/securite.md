# Mesures de sécurité — ResidenceConnect

> Section 8 du dossier — *Présentation des mesures de sécurité mises en œuvre*.

La sécurité de ResidenceConnect repose sur un principe directeur : **le
cloisonnement des données est appliqué en base**, pas côté client. Même en cas
de compromission de l'application, un utilisateur ne peut accéder qu'à ses
propres données.

## 1. Authentification (JWT)

- Authentification gérée par **Supabase Auth** : mots de passe hachés côté
  serveur (jamais stockés en clair), sessions par **jeton JWT** signé.
- Le jeton est transmis à chaque requête ; PostgreSQL en extrait l'identité
  (`auth.uid()`) et le rôle pour appliquer les règles d'accès.
- Côté mobile, le jeton de session est conservé dans le **stockage sécurisé**
  du système (`expo-secure-store`), pas dans un stockage en clair.

## 2. Cloisonnement par rôle — RLS (Row Level Security)

- **RLS activée sur 100 % des tables** (`ENABLE ROW LEVEL SECURITY` sur les
  8 tables — `supabase/migrations/003_rls_policies.sql`).
- Chaque rôle ne voit et ne modifie que ce qui le concerne :
  - **locataire** — uniquement les signalements de ses logements ;
  - **technicien** — uniquement les signalements qui lui sont assignés ;
  - **gestionnaire** — les signalements de son périmètre de gestion.
- Le contrôle est **déclaratif et centralisé en base** : il s'applique à toute
  requête, quelle que soit l'origine (app mobile, dashboard web, appel API
  direct).

### `SECURITY DEFINER`

Certaines vérifications d'accès nécessitent de lire une table elle-même
protégée, ce qui provoquerait une récursion. Elles sont isolées dans des
fonctions **`SECURITY DEFINER`** (migrations `002_functions.sql`,
`004_fix_rls_recursion.sql`, `007_status_change_webhook.sql`), qui s'exécutent
avec des droits maîtrisés et cassent la boucle — cf. le plan de correction des
bogues pour l'anomalie de récursion corrigée.

## 3. Stockage privé des photos

- Le bucket **`ticket-photos` est privé** (`public = false`,
  `supabase/migrations/005_storage_ticket_photos.sql`) : aucune photo n'est
  accessible par URL publique.
- L'accès aux fichiers passe par des **URL signées temporaires** générées à la
  demande pour les utilisateurs autorisés.
- Le bucket impose une **limite de taille** et une **liste de types MIME
  autorisés** (images uniquement).

## 4. Journal d'audit immuable

- Chaque changement de statut est enregistré dans `ticket_history` (auteur,
  ancien/nouveau statut, horodatage), via un **trigger** en base — l'écriture
  n'est pas laissée au client.
- Les entrées sont **immuables** (pas de modification ni de suppression), ce qui
  garantit une piste d'audit fiable (vérifié en recette, cf.
  `docs/cahier-de-recettes.md`, CR-TR-02).

## 5. Gestion des secrets

- Aucune donnée sensible en dur dans le code : les variables sensibles vivent
  dans des fichiers `.env` **non versionnés** (`.gitignore`) et dans les
  **secrets GitHub Actions** pour la CI/CD.
- Seule la **clé anonyme publique** Supabase est exposée côté client — c'est sa
  fonction (elle ne donne aucun accès au-delà de ce que la RLS autorise).
- Les Edge Functions et le webhook utilisent des secrets côté serveur
  (service role, jamais transmis au client).

## 6. Robustesse du code

- **TypeScript strict** (zéro `any`) : réduit les erreurs de manipulation de
  données.
- **Gestion d'erreur explicite** sur les appels réseau / base.
- Validation des entrées (champs obligatoires, tailles maximales, types de
  fichiers).

## 7. Vérification de la sécurité

- **`scripts/test-rls.sh`** : 15 assertions exécutées contre un vrai projet
  Supabase, qui vérifient le cloisonnement (un rôle ne peut pas lire/écrire les
  données d'un autre).
- Les scénarios de sécurité du cahier de recettes (CR-SEC-01→03) s'appuient sur
  ce script.

## 8. Couverture des risques OWASP Top 10 (2021)

Les mesures ci-dessus adressent les **10 principales failles de sécurité** du
référentiel **OWASP Top 10**.

| # OWASP | Risque | Mesure dans ResidenceConnect |
| --- | --- | --- |
| **A01** | Contrôle d'accès défaillant | **RLS sur 100 % des tables** (cloisonnement par rôle **en base**, appliqué à toute requête), fonctions `SECURITY DEFINER`, accès web réservé au rôle gestionnaire. |
| **A02** | Défaillances cryptographiques | HTTPS/TLS partout (Supabase, Vercel) ; mots de passe **hachés** côté serveur ; JWT signé ; jeton mobile en **secure-store** ; aucun secret en clair dans le code. |
| **A03** | Injection | Accès aux données via le client Supabase (**requêtes paramétrées**, pas de SQL concaténé depuis une entrée utilisateur) ; typage strict ; validation des entrées. |
| **A04** | Conception non sécurisée | **Moindre privilège** par défaut (RLS), stockage privé, journal d'audit immuable — la sécurité est pensée dès la conception (cf. `docs/prototype.md`). |
| **A05** | Mauvaise configuration | Bucket Storage **privé** (`public=false`), secrets en variables d'environnement, déploiements **gardés par secret**, seule la clé **anon publique** exposée. |
| **A06** | Composants vulnérables / obsolètes | Dépendances figées (`pnpm --frozen-lockfile`), stack récente maintenue, installation reproductible en CI. |
| **A07** | Défaillances d'authentification | **Supabase Auth** (JWT, gestion de session), **longueur minimale** de mot de passe à l'inscription, message de connexion **générique** (pas d'énumération de comptes). |
| **A08** | Défaut d'intégrité logiciel/données | `--frozen-lockfile`, JWT signé, **migrations versionnées** et **journal d'audit immuable**. |
| **A09** | Journalisation / supervision insuffisante | **`ticket_history`** (piste d'audit immuable des changements) + journaux Supabase. |
| **A10** | SSRF | Pas de récupération d'URL contrôlée par l'utilisateur ; les Edge Functions n'appellent que des points de terminaison **maîtrisés**. |

## 9. Synthèse

| Mesure | Mise en œuvre |
| --- | --- |
| Authentification | Supabase Auth, JWT, secure-store (mobile) |
| Autorisation | RLS sur 8/8 tables, cloisonnement par rôle en base |
| Anti-récursion | Fonctions `SECURITY DEFINER` |
| Fichiers | Bucket privé + URL signées + limites taille/MIME |
| Auditabilité | `ticket_history` immuable (trigger) |
| Secrets | `.env` non versionnés + secrets CI ; seule la clé anon publique exposée |
| Conformité | Couverture **OWASP Top 10** (§8) |
| Vérification | `scripts/test-rls.sh` (15 assertions) |
