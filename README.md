# ResidenceConnect

[![CI](https://github.com/Dark4warrior/ResidenceConnect/actions/workflows/ci.yml/badge.svg)](https://github.com/Dark4warrior/ResidenceConnect/actions/workflows/ci.yml)
![Tests](https://img.shields.io/badge/tests-176-brightgreen)
![Couverture](https://img.shields.io/badge/couverture-%E2%89%A5%2070%25-brightgreen)

Application de gestion des incidents en résidence pour un bailleur social. Un
locataire signale un problème depuis son téléphone (photo à l'appui), le
gestionnaire suit les signalements et les attribue à un technicien depuis un
tableau de bord web, et le technicien met à jour l'avancement sur le terrain.

Projet de fin d'études pour le titre RNCP 39583 — Expert en développement
logiciel (niveau 7), Ynov Campus Lyon, 2025-2026.

## Sommaire

- [Les trois rôles](#les-trois-rôles)
- [Stack technique](#stack-technique)
- [Organisation du dépôt](#organisation-du-dépôt)
- [Prérequis](#prérequis)
- [Mise en route](#mise-en-route)
  - [1. Installer les dépendances](#1-installer-les-dépendances)
  - [2. Configurer le backend Supabase](#2-configurer-le-backend-supabase)
  - [3. Renseigner les variables d'environnement](#3-renseigner-les-variables-denvironnement)
  - [4. Créer un jeu de données de démonstration](#4-créer-un-jeu-de-données-de-démonstration)
  - [5. Lancer les applications](#5-lancer-les-applications)
- [Parcours de test](#parcours-de-test)
- [Lint, types et tests](#lint-types-et-tests)
- [Intégration et déploiement continus](#intégration-et-déploiement-continus)
- [Documentation technique](#documentation-technique)
- [Équipe](#équipe)

## Les trois rôles

| Rôle | Plateforme | Ce qu'il fait |
|------|-----------|---------------|
| Locataire (`tenant`) | Mobile | Crée un signalement avec photo, suit son avancement |
| Gestionnaire (`manager`) | Mobile + Web | Voit tous les signalements de ses résidences, attribue, analyse |
| Technicien (`technician`) | Mobile | Consulte ses missions, met à jour le statut sur place |

Le cloisonnement entre rôles n'est pas géré côté application : il est appliqué
par PostgreSQL via des politiques Row Level Security. Un locataire ne peut donc
pas lire les signalements d'un autre, même en contournant l'interface.

## Stack technique

- **Mobile** : React Native 0.81 + Expo SDK 54, Expo Router (routing par
  fichiers), `expo-camera` / `expo-image-picker` pour les photos, Expo
  Notifications pour le push.
- **Web** : React 19 + Vite 5 + TailwindCSS 3 + React Router 6.
- **Backend** : Supabase — PostgreSQL, Auth (JWT), Storage, Realtime, Edge
  Functions (Deno).
- **Code partagé** : types et constantes TypeScript dans `packages/shared`.
- **Monorepo** : pnpm workspaces + Turborepo.
- **Qualité** : TypeScript strict partout, ESLint, tests Jest (mobile, shared)
  et Vitest (web).

> Le SDK Expo est volontairement resté en 54 : c'est la dernière version
> compatible avec l'application Expo Go publiée sur les stores, ce qui permet
> de tester sans build natif.

## Organisation du dépôt

```
ResidenceConnect/
├── apps/
│   ├── mobile/              # React Native + Expo
│   │   ├── app/             # écrans, routing par fichiers (auth, tenant, manager, technician)
│   │   ├── components/      # UI, cartes de tickets, galerie photos, profil
│   │   ├── hooks/           # accès aux données (useTickets, useAuth, useRealtime, …)
│   │   └── lib/             # client Supabase, upload photo, stockage sécurisé
│   └── web/
│       └── src/
│           ├── pages/       # Login, Dashboard, TicketDetail, Analytics
│           ├── hooks/       # accès aux données
│           ├── lib/         # logique métier pure et testée (filtres, KPIs, CSV)
│           └── components/
├── packages/shared/         # types et constantes communs
├── supabase/
│   ├── migrations/          # schéma, fonctions, RLS, storage, RPC (à appliquer dans l'ordre)
│   ├── functions/           # Edge Functions Deno (priority-scoring, notify-status-change)
│   └── seed.sql             # données de démonstration
├── scripts/test-rls.sh      # tests de sécurité RLS contre un vrai projet
├── .github/workflows/       # ci.yml, deploy-web.yml, build-mobile.yml
└── docs/                    # architecture (C4), schéma BDD, API des fonctions
```

## Prérequis

- Node.js 20 ou supérieur.
- pnpm 9 ou supérieur (le dépôt épingle `pnpm@10.33.0` via le champ
  `packageManager`, donc Corepack installe la bonne version automatiquement).
- Un projet [Supabase](https://supabase.com) (offre gratuite suffisante).
- Pour tester le mobile : l'application **Expo Go** sur un téléphone, ou un
  simulateur iOS / émulateur Android.
- Optionnel : la [CLI Supabase](https://supabase.com/docs/guides/cli) pour
  appliquer les migrations en ligne de commande.

## Mise en route

### 1. Installer les dépendances

```bash
pnpm install
```

Une seule commande à la racine : pnpm installe les trois workspaces (mobile,
web, shared).

### 2. Configurer le backend Supabase

Créez un projet sur Supabase, puis appliquez les migrations du dossier
`supabase/migrations/` **dans l'ordre**. Deux méthodes.

Avec la CLI (recommandé) :

```bash
supabase link --project-ref <référence-du-projet>
supabase db push
```

Sans la CLI : ouvrez chaque fichier `.sql` dans l'ordre numérique et
copiez-collez son contenu dans le **SQL Editor** du tableau de bord Supabase.

| Migration | Contenu |
|-----------|---------|
| `001_initial_schema.sql` | 8 tables, index, trigger `updated_at` |
| `002_functions.sql` | fonctions d'identité `SECURITY DEFINER` + trigger de création de profil à l'inscription |
| `003_rls_policies.sql` | politiques RLS de chaque table |
| `004_fix_rls_recursion.sql` | correctif anti-récursion sur `profiles` |
| `005_storage_ticket_photos.sql` | bucket privé `ticket-photos` + politiques Storage |
| `006_analytics_rpc.sql` | fonctions d'agrégation analytique (RPC) |
| `007_status_change_webhook.sql` | trigger appelant l'Edge Function à chaque changement de statut |

Les Edge Functions se déploient **avant** d'appliquer la migration 007 (qui les
appelle). Voir [docs/api.md](docs/api.md) :

```bash
supabase functions deploy priority-scoring
supabase functions deploy notify-status-change
```

> La migration 007 remplace la configuration manuelle d'un « Database Webhook »
> dans le dashboard : le déclenchement de l'Edge Function sur changement de
> statut est ainsi versionné dans le dépôt. L'URL et la clé anon (publique) y
> sont fixées pour ce projet ; les adapter pour une autre instance.

### 3. Renseigner les variables d'environnement

Les deux applications lisent leur propre fichier `.env.local` (jamais versionné).
La clé `anon` est publique par conception — la confidentialité repose sur le RLS,
pas sur le secret de la clé. Récupérez l'URL et la clé dans Supabase, section
*Settings → API*.

`apps/mobile/.env.local` :

```
EXPO_PUBLIC_SUPABASE_URL=https://votre-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
```

`apps/web/.env.local` :

```
VITE_SUPABASE_URL=https://votre-ref.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
```

Le fichier `.env.example` à la racine sert de rappel du format.

### 4. Créer un jeu de données de démonstration

La base est vide après les migrations. Pour disposer de comptes et de
signalements, créez d'abord trois utilisateurs, puis lancez le seed.

Dans le tableau de bord Supabase, *Authentication → Users → Add user* (cocher
**Auto Confirm User**), créez :

| Email | Mot de passe | Rôle obtenu |
|-------|--------------|-------------|
| `manager@residenceconnect.dev` | `Demo1234!` | gestionnaire |
| `tenant@residenceconnect.dev` | `Demo1234!` | locataire |
| `technicien@residenceconnect.dev` | `Demo1234!` | technicien |

Le trigger d'inscription crée un profil au rôle `tenant` par défaut ; le seed se
charge ensuite de corriger les rôles. Exécutez `supabase/seed.sql` dans le SQL
Editor : il attribue les bons rôles, crée une résidence, trois logements, quatre
signalements variés (dont un résolu), l'historique et des notifications. Le
script est idempotent — on peut le relancer sans créer de doublons.

### 5. Lancer les applications

```bash
# Application mobile — ouvre Expo, scannez le QR code avec Expo Go
pnpm --filter @residenceconnect/mobile dev

# Tableau de bord web — http://localhost:5173
pnpm --filter @residenceconnect/web dev
```

Le tableau de bord web est réservé aux gestionnaires. Il démarre même sans
backend configuré (un bandeau « mode démonstration » remplace alors les données).

## Parcours de test

Avec le jeu de données ci-dessus, un évaluateur peut suivre le cycle complet
d'un signalement.

1. **Mobile, en locataire** (`tenant@…`) : la liste des signalements et leur
   avancement, la création d'un nouveau signalement avec photo, le détail avec
   la frise de progression.
2. **Web, en gestionnaire** (`manager@…`, sur `http://localhost:5173`) : le
   tableau des signalements et ses filtres, l'attribution d'un technicien et le
   changement de statut sur la page de détail, la page Analytics, l'export CSV.
3. **Mobile, en technicien** (`technicien@…`) : la liste « Mes missions » ne
   montre que les signalements qui lui sont attribués — deux sur quatre — ce qui
   illustre le cloisonnement RLS.
4. **Temps réel** : gardez la liste mobile ouverte pendant qu'un changement de
   statut est fait depuis le web ; la liste se met à jour sans rafraîchissement.

## Lint, types et tests

Les commandes s'exécutent à la racine ; Turborepo les orchestre sur les trois
workspaces.

```bash
pnpm lint         # ESLint
pnpm type-check   # tsc --noEmit (TypeScript strict)
pnpm test         # Jest (mobile, shared) + Vitest (web), couverture incluse
```

La suite compte **176 tests** (Jest côté mobile et `shared`, Vitest côté web) :

- la **logique métier pure** — scoring de priorité, filtres, calcul des
  indicateurs, export CSV, formatage des dates ;
- **tous les hooks d'accès aux données** des deux applications (chargement,
  gestion d'erreur, écriture de l'audit, résilience) ;
- les **écrans critiques du web** en tests d'intégration (Testing Library) ;
- un **garde anti-dérive** entre l'algorithme de scoring partagé et sa copie
  dans l'Edge Function.

La couverture est mesurée sur le code métier et les hooks, avec un seuil de
70 % appliqué automatiquement (le build échoue en dessous). Les rapports :

| Package | Instructions | Branches | Lignes |
|---------|-------------|----------|--------|
| Mobile | 97 % | 83 % | 98 % |
| Web | 94 % | 88 % | 94 % |
| Shared | 100 % | 100 % | 100 % |

Comment les consulter :

- `pnpm test` génère un rapport HTML par package dans `apps/*/coverage/` et
  `packages/shared/coverage/` — ouvrir `coverage/lcov-report/index.html`.
- Chaque exécution de la CI affiche le tableau de couverture directement sur la
  page du job (onglet **Actions** du dépôt), sans téléchargement, et archive les
  rapports complets en artefact.

### Tests de sécurité RLS

`scripts/test-rls.sh` vérifie le cloisonnement des données **contre un vrai
projet Supabase** : il connecte les trois rôles et contrôle que chacun ne voit
et ne modifie que ce qui le concerne (lecture, écriture, audit non modifiable,
accès anonyme vide). Le script restaure l'état qu'il modifie et sort en code
d'erreur au premier échec, ce qui le rend utilisable en CI.

```bash
export SUPABASE_URL=https://votre-ref.supabase.co
export SUPABASE_ANON_KEY=votre-cle-anon
export RLS_TEST_PASSWORD=Demo1234!
./scripts/test-rls.sh
```

Prérequis : les trois comptes de démonstration et le seed de l'étape 4.

## Intégration et déploiement continus

Trois workflows GitHub Actions, dans `.github/workflows/` :

- **`ci.yml`** — sur chaque pull request et sur push vers `main` : installation
  `--frozen-lockfile`, `lint`, `type-check`, `test` avec couverture, puis
  archivage des rapports.
- **`deploy-web.yml`** — sur push vers `main` : build de `apps/web` et
  déploiement sur Vercel. Nécessite les secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`.
- **`build-mobile.yml`** — sur push vers `main` : build Android (profil
  `preview`) sur les serveurs EAS. Le job s'ignore proprement tant que le secret
  `EXPO_TOKEN` n'est pas configuré, pour ne pas bloquer `main`.

**Flux Git** : une issue puis une branche par fonctionnalité
(`feature/*`, `fix/*`, `test/*`, `docs/*`, `ci/*`), une pull request revue avant
fusion. Les fonctionnalités sont intégrées sur `develop` ; `main` n'est mise à
jour que par une revue finale.

### Bon à savoir

- **Expo Go et le push Android** : depuis le SDK 53, Expo Go ne reçoit plus les
  notifications push distantes sur Android. Un avertissement s'affiche au
  démarrage — c'est attendu et sans conséquence sur le reste. Le push nécessite
  un build de développement (`build-mobile.yml`).
- **Metro et `node_modules`** : ne pas ajouter `node_modules` à
  `.watchmanconfig`. Metro construit son index de fichiers via watchman ; en
  l'excluant, plus aucune dépendance n'est résolue (`Unable to resolve module`).

## Documentation technique

- [docs/architecture.md](docs/architecture.md) — diagrammes C4 et choix techniques.
- [docs/database-schema.md](docs/database-schema.md) — modèle de données, index, fonctions et politiques RLS.
- [docs/api.md](docs/api.md) — Edge Functions : entrées, sorties, déploiement.

## Équipe

| Membre | Rôle |
|--------|------|
| Gilchrist (Steven) Laleye | Chef de projet / Architecte logiciel |
| Lucas Martin | Développeur frontend mobile |
| Camille Dupont | Développeuse frontend web |
| Thomas Bernard | Développeur backend / DevOps |
| Sophie Leroy | Administration de la base de données |
| Marc Fontaine | Architecte logiciel |
| HabitatPlus (direction) | Product Owner |
