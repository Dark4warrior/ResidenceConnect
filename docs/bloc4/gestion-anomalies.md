# Gestion des anomalies en production — ResidenceConnect

> Bloc 4 — *Processus de collecte et de consignation des anomalies*
> (compétence **C4.2.1**), *fiche de consignation* et *traitement d'une anomalie*
> (compétence **C4.2.2**).

## 1. Processus de collecte et de consignation (C4.2.1)

### 1.1 Sources de détection

| Source | Détail |
| --- | --- |
| **Supervision** | Les sondes planifiées (`monitoring.yml`) détectent les indisponibilités et ouvrent une issue automatiquement (cf. `docs/bloc4/supervision.md`). |
| **Intégration continue** | `ci.yml` échoue si le lint, le typage ou les tests régressent. |
| **Retours utilisateurs** | Signalements du gestionnaire / des utilisateurs / du jury. |
| **Revue de code** | Détection en revue de *pull request*. |

### 1.2 Outil de consignation

Les anomalies sont consignées comme **issues GitHub**, dans le même dépôt que le
code. C'est l'outil de collecte : il centralise, historise, et relie chaque
anomalie à sa correction (une issue est fermée par la *pull request* qui la
corrige, via `Closes #NN`). Un **label** qualifie la nature (`bug`, `supervision`,
`securité`) et un autre la **sévérité** (`bloquant`, `majeur`, `mineur`).

### 1.3 Gabarit de fiche de consignation

Chaque anomalie est décrite avec les informations **permettant de la reproduire
et de la corriger** :

| Champ | Contenu |
| --- | --- |
| Identifiant / titre | référence courte de l'anomalie |
| Date, environnement | quand et où (prod / préprod / dev) |
| Sévérité | bloquant / majeur / mineur |
| Description | symptôme observé |
| Étapes de reproduction | actions menant au bogue |
| Résultat observé vs attendu | l'écart constaté |
| Analyse (cause racine) | origine technique |
| Préconisation de correction | correctif envisagé |

### 1.4 Cycle de traitement

```
Détection → Issue (consignation) → Qualification (sévérité)
  → Branche fix/* → Correctif (+ test de non-régression)
  → Pull request (CI verte) → Intégration develop → Release main → Déploiement
```

Ce processus est détaillé dans le plan de correction des bogues
(`docs/plan-correction-bogues.md`).

## 2. Fiche de consignation — anomalie réelle

Anomalie rencontrée **en production** au cours du projet.

| Champ | Contenu |
| --- | --- |
| **Titre** | Routes profondes en erreur 404 sur le dashboard déployé |
| **Date / environnement** | Juillet 2026 — **production** (déploiement Vercel) |
| **Sévérité** | **Majeure** (l'application est inutilisable en accès direct à une URL) |
| **Description** | Après déploiement sur Vercel, l'ouverture directe d'une route (ex. `/login`, `/tickets/:id`) renvoie une page **404 NOT_FOUND** de Vercel, au lieu de l'application. |
| **Étapes de reproduction** | 1. Ouvrir `https://residence-connect-web.vercel.app/login`. 2. Observer l'erreur 404. (La racine `/` fonctionnait, mais pas les sous-routes ni le rechargement d'une page.) |
| **Résultat observé** | 404 NOT_FOUND ; l'application ne se charge pas. |
| **Résultat attendu** | L'application se charge et affiche la page demandée. |
| **Analyse (cause racine)** | L'application est une **SPA** (React Router : le routage est côté client). Sur Vercel, le *Root Directory* du projet est `apps/web`, si bien que le `vercel.json` placé à la racine du dépôt **n'était pas lu**. Sans règle de réécriture, Vercel cherchait un fichier physique `/login` — inexistant — d'où le 404. |
| **Préconisation** | Ajouter un `vercel.json` **dans `apps/web/`** avec une réécriture SPA renvoyant toutes les routes vers `/index.html`. |

## 3. Traitement de l'anomalie (C4.2.2)

Le correctif a suivi le **processus d'intégration et de déploiement continu** :

1. **Branche** `fix/vercel-spa-url` depuis `develop`.
2. **Correctif** — ajout de `apps/web/vercel.json` :
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
   Toutes les routes sont désormais servies par `index.html`, laissant React
   Router gérer l'affichage côté client.
3. **Pull request** — relue, **CI verte** (lint, typage, tests) avant fusion.
4. **Intégration puis release** — fusion sur `develop`, puis *pull request* de
   release `develop → main`. Le *push* sur `main` **déclenche automatiquement le
   redéploiement Vercel** (cf. `docs/ci-cd.md`).
5. **Vérification** — après redéploiement, `https://residence-connect-web.vercel.app/login`
   renvoie de nouveau **HTTP 200** et l'application se charge normalement.

### Prévention de la régression

- Le correctif est **versionné** (`apps/web/vercel.json`) : le comportement est
  reproductible à chaque déploiement, l'anomalie ne peut pas réapparaître par
  simple reconfiguration.
- La **sonde de supervision** interroge précisément `/login` : une régression de
  ce type serait **détectée automatiquement** (cf. `docs/bloc4/supervision.md`).
- Pour les anomalies **de code**, la règle est d'accompagner tout correctif d'un
  **test de non-régression** reproduisant le bogue (cf.
  `docs/plan-correction-bogues.md`).
