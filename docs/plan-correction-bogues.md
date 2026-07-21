# Plan de correction des bogues — ResidenceConnect

> Section 13 du dossier — *Plan de correction des bogues* : processus de gestion
> des anomalies détectées, de leur signalement à leur résolution vérifiée.

## 1. Objectif

Définir un processus **reproductible et tracé** pour détecter, qualifier,
prioriser, corriger et vérifier les anomalies, en **prévenant les régressions**.
Chaque étape est matérialisée dans GitHub (issue → branche → PR), donc
vérifiable dans le dépôt.

## 2. Sources de détection

| Source | Détail |
| --- | --- |
| **Intégration continue** | `ci.yml` (lint, type-check, tests + couverture) échoue et bloque la fusion. |
| **Cahier de recettes** | Campagnes de recette fonctionnelle (`docs/cahier-de-recettes.md`). |
| **Tests automatisés** | ~180 tests unitaires (Jest mobile/shared, Vitest web) + `scripts/test-rls.sh` (sécurité). |
| **Retours utilisateurs** | Signalements des utilisateurs / du jury / de l'équipe. |
| **Revue de code** | Détection en revue de *pull request*. |

## 3. Classification des anomalies

### 3.1 Sévérité

| Sévérité | Définition | Exemple | Délai cible |
| --- | --- | --- | --- |
| **Bloquante** | Empêche l'utilisation d'une fonction essentielle, ou faille de sécurité / fuite de données. | Un rôle voit les données d'un autre ; connexion impossible. | Correctif immédiat, avant toute autre livraison. |
| **Majeure** | Fonction dégradée sans contournement simple. | L'assignation d'un technicien échoue silencieusement. | Correctif prioritaire dans l'itération courante. |
| **Mineure** | Gêne légère avec contournement, ou défaut cosmétique. | Libellé mal aligné, faute de frappe. | Planifié, sans urgence. |

### 3.2 Priorisation

La priorité combine **sévérité** et **fréquence / nombre d'utilisateurs
impactés**. Toute anomalie **de sécurité** est traitée comme **bloquante** quelle
que soit sa fréquence (cf. cloisonnement RLS, `docs/database-schema.md`).

## 4. Workflow de traitement

```
Détection → Issue GitHub → Qualification (sévérité + priorité)
     → Branche fix/<sujet> → Correctif + test de non-régression
     → Pull request (revue) → Intégration develop → Release develop → main
```

1. **Signalement** — création d'une *issue* GitHub décrivant : contexte,
   étapes de reproduction, résultat observé vs attendu, sévérité proposée,
   environnement. (Un scénario du cahier de recettes en échec fournit
   directement ces informations.)
2. **Qualification** — attribution de la sévérité/priorité via des *labels*
   (`bug`, `securité`, `bloquant`, `majeur`, `mineur`).
3. **Correction** — branche dédiée `fix/<sujet>` depuis `develop`.
4. **Test de non-régression** — **tout correctif est accompagné d'un test**
   reproduisant le bug (le test échoue avant, réussit après), afin qu'il ne
   puisse pas réapparaître.
5. **Pull request** — le correctif est relu ; la CI doit être verte (lint,
   type-check, tests, couverture ≥ 70 %).
6. **Intégration** — fusion sur `develop`, puis publication sur `main` via une
   *pull request* de release.
7. **Clôture** — l'issue est fermée automatiquement par la PR (`Closes #NN`) ;
   le scénario de recette correspondant est re-testé.

Commits au format conventionnel (`fix: …`) en français, pour une traçabilité
lisible de l'historique.

## 5. Prévention des régressions

- **Harnais de tests** : ~180 tests unitaires couvrant la logique métier
  (filtres, tri, scoring d'urgence, CSV, analytics, hooks, navigation clavier du
  composant `Select`…), exécutés à chaque *push* par la CI. Couverture ≥ 70 %
  imposée (mobile ~97 %, web ~92 %, shared 100 %).
- **CI bloquante** : une PR ne peut être fusionnée si lint, typage ou tests
  échouent.
- **Typage strict** (TypeScript, zéro `any`) : élimine en amont une classe
  entière de bogues.
- **Sécurité en base** : les règles RLS (testées par `scripts/test-rls.sh`)
  garantissent le cloisonnement indépendamment du client.

## 6. Exemple concret (historique du projet)

**Anomalie** : récursion infinie dans les politiques RLS (une politique
interrogeait une table elle-même protégée par une politique qui la
réinterrogeait), rendant certaines requêtes impossibles — **sévérité
bloquante** (fonction essentielle + périmètre sécurité).

**Correction** : isolement de la logique d'accès dans une fonction
`SECURITY DEFINER` pour casser la boucle, livrée par la migration
**`supabase/migrations/004_fix_rls_recursion.sql`** (commit `fix: …`).

**Vérification** : `scripts/test-rls.sh` valide le cloisonnement (aucune
récursion, chaque rôle n'accède qu'à ses données).

Ce cas illustre le cycle complet : détection → qualification (bloquante) →
correctif tracé (migration dédiée) → vérification automatisée anti-régression.

## 7. Suivi

L'état des anomalies est suivi via les **issues GitHub** (ouvertes / en cours /
fermées) et leurs *labels*. L'historique des correctifs est consultable dans les
*pull requests* fusionnées et les commits `fix:` — cf. `docs/historique-versions.md`.
