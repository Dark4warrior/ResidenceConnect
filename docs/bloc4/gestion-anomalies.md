# Gestion des anomalies en production — ResidenceConnect

> Bloc 4 — *Processus de collecte et de consignation des anomalies*
> (compétence **C4.2.1**), *fiche de consignation* et *traitement d'une anomalie*
> (compétence **C4.2.2**).

Quand une anomalie survient, je veux pouvoir la **retrouver**, **comprendre son origine** et la **corriger sans rien casser d'autre**. J'ai donc formalisé un processus, que j'illustre ensuite avec une anomalie réellement rencontrée après la mise en production.

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

### 1.4 Classification et priorité

Toutes les anomalies ne se valent pas : je les **qualifie** dès leur consignation
pour décider de l'ordre de traitement. La priorité combine la **sévérité** et le
**nombre d'utilisateurs impactés** ; toute anomalie touchant la **sécurité** est
traitée comme bloquante quelle que soit sa fréquence.

| Sévérité | Définition | Délai de traitement visé |
| --- | --- | --- |
| **Bloquante** | Empêche l'usage d'une fonction essentielle, ou faille de sécurité | Immédiat, avant toute autre livraison |
| **Majeure** | Fonction dégradée sans contournement simple | Dans l'itération courante |
| **Mineure** | Gêne légère avec contournement, ou défaut cosmétique | Planifiée, sans urgence |

L'anomalie présentée plus bas (404 sur les routes profondes) a ainsi été qualifiée
de **majeure** : l'application était inutilisable en accès direct à une URL, mais
la racine `/` restait accessible.

### 1.5 Cycle de traitement

De la détection au rétablissement, chaque anomalie suit le même cycle :

![Cycle de vie d'une anomalie : détection, consignation en issue, qualification, correction sur une branche avec test de non-régression, validation par pull request (CI verte), déploiement continu, puis vérification du rétablissement.](images/anomalie-cycle.svg)

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

## 4. Deuxième anomalie : indisponibilité du backend

Cette seconde anomalie illustre le lien direct entre la **supervision**
(section 2) et la gestion des anomalies : c'est la sonde qui l'a détectée, sans
intervention humaine.

| Champ | Contenu |
| --- | --- |
| **Titre** | Indisponibilité du backend en production |
| **Date / environnement** | Août 2026 — **production** |
| **Sévérité** | **Bloquante** (plus aucune connexion, sur le web comme sur le mobile) |
| **Mode de détection** | **Automatique**, par la sonde de supervision : `API backend — INJOIGNABLE` |
| **Description** | Les requêtes vers Supabase échouent : impossible de se connecter ou de charger les données, quelle que soit l'application. |
| **Étapes de reproduction** | Ouvrir l'application déployée et tenter une connexion → échec ; la sonde de supervision renvoie une alerte. |
| **Analyse (cause racine)** | Le projet Supabase (offre gratuite) se met **en pause** après une période d'inactivité ; le service ne répond plus. |
| **Préconisation** | Réactiver le projet ; à terme, **fiabiliser le backend** (offre payante ou maintien en éveil) pour supprimer la cause. |

**Traitement.** J'ai réactivé le projet Supabase depuis son tableau de bord ; les
sondes de supervision sont repassées au vert dès l'exécution suivante, confirmant
le rétablissement.

Contrairement à la première anomalie, celle-ci **ne se corrige pas par du code**
mais par une **action d'exploitation** et une **décision d'infrastructure**. C'est
précisément ce qui la rend intéressante : elle montre qu'une partie de la
maintenance en condition opérationnelle relève de l'environnement d'exécution, et
elle alimente directement les **axes d'amélioration** présentés en section 5
(fiabiliser le backend).
