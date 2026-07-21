# Critères de qualité et de performance — ResidenceConnect

> Section 2 du dossier — *Critères de qualité et de performance retenus, et
> moyens mis en œuvre pour les respecter*.

## 1. Critères de qualité du code

| Critère | Exigence | Moyen de contrôle |
| --- | --- | --- |
| **Typage** | TypeScript **strict**, zéro `any` | `pnpm type-check` (CI bloquante) |
| **Style / erreurs** | Aucune erreur ESLint | `pnpm lint` (CI bloquante) |
| **Couverture de tests** | **≥ 70 %** | seuil imposé dans la config de test (CI) |
| **Documentation** | JSDoc sur les fonctions complexes ; docs `/docs` | revue de code |
| **Traçabilité** | 1 issue + 1 branche + 1 PR par sujet, commits conventionnels | historique Git / PR |

**Couverture mesurée** (au-delà du seuil de 70 %) : mobile ~97 %, web ~92 %,
`shared` 100 %. Les rapports sont publiés dans le récapitulatif de chaque job CI
et archivés en artefacts.

### Maintenabilité

- **Monorepo** pnpm + Turborepo : code partagé isolé dans
  `packages/shared` (types et constantes), réutilisé par le web et le mobile —
  une seule source de vérité.
- **Design system mobile** centralisé (`apps/mobile/theme`) : couleurs,
  espacements, typographie en tokens (un changement se propage partout).
- Architecture en couches documentée (`docs/architecture.md`).

## 2. Critères de performance

### 2.1 Base de données

- **Index** ciblés sur les colonnes de filtrage/jointure les plus sollicitées
  (13 index créés dès `supabase/migrations/001_initial_schema.sql`) : les
  requêtes du dashboard (par statut, urgence, logement, assignation) restent
  rapides même à volume croissant.
- **Agrégations côté serveur** : les indicateurs analytics sont calculés par une
  **fonction PostgreSQL (RPC)** (`006_analytics_rpc.sql`) plutôt que de
  rapatrier toutes les lignes au client — moins de données transférées, calcul
  au plus près de la donnée. Un repli « calcul client » existe si la RPC n'est
  pas déployée (dégradation maîtrisée, la source est affichée à l'utilisateur).

### 2.2 Réseau et médias

- **Photos compressées** avant envoi (qualité réduite à l'upload) et servies via
  **URL signées** ; bucket privé avec limite de taille.
- **Temps réel** (Supabase Realtime) : les mises à jour sont poussées aux clients
  concernés plutôt que par interrogation périodique (*polling*).

### 2.3 Traitements applicatifs

- Score d'urgence calculé par une **Edge Function** dédiée (`priority-scoring`),
  déployée et testée sur 16 combinaisons — logique déportée du client.
- Côté React, mémoïsation des calculs coûteux (filtres/tri de la liste) via
  `useMemo` pour éviter les recalculs inutiles au rendu.

## 3. Moyens de contrôle continu

- **CI GitHub Actions** (`ci.yml`) : lint + type-check + tests + couverture à
  chaque *pull request* — une PR non conforme ne peut pas être fusionnée
  (cf. `docs/ci-cd.md`).
- **~180 tests unitaires** couvrant la logique métier (filtres, tri, scoring,
  CSV, analytics, hooks, navigation clavier du `Select`).
- **Tests de sécurité** (`scripts/test-rls.sh`) et **cahier de recettes**
  fonctionnel.

## 4. Synthèse

La qualité est **outillée et non déclarative** : typage strict, lint et seuil de
couverture sont **imposés par la CI**. La performance est traitée à la source
(index, agrégation SQL, temps réel, compression) plutôt que corrigée après coup.
