# ResidenceConnect

Application de **gestion des incidents en résidence** (logement social) : les
locataires signalent un problème depuis leur mobile, les gestionnaires suivent
et assignent les interventions depuis un dashboard web, les techniciens
mettent à jour les statuts sur le terrain.

> Projet de fin d'études — titre **RNCP 39583, Expert en développement logiciel
> (niveau 7)**, Ynov Campus Lyon, 2025-2026.

## Sommaire

- [Aperçu](#aperçu)
- [Architecture & stack](#architecture--stack)
- [Structure du monorepo](#structure-du-monorepo)
- [Prérequis](#prérequis)
- [Variables d'environnement](#variables-denvironnement)
- [Installation & lancement](#installation--lancement)
- [Qualité : lint, types, tests](#qualité--lint-types-tests)
- [Base de données Supabase](#base-de-données-supabase)
- [Intégration continue](#intégration-continue)
- [Documentation détaillée](#documentation-détaillée)
- [Équipe](#équipe)

## Aperçu

| Rôle | Plateforme | Usage principal |
|------|-----------|-----------------|
| Locataire (`tenant`) | Mobile | Créer un signalement (photo incluse), suivre son statut |
| Gestionnaire (`manager`) | Mobile + Web | Superviser tous les tickets, assigner, analyser |
| Technicien (`technician`) | Mobile | Consulter ses missions, mettre à jour le statut terrain |

## Architecture & stack

- **Mobile** — React Native `0.81` + Expo **SDK 54** (Expo Router, file-based routing), `expo-camera`, Expo Push Notifications.
- **Web** — React 19 + **Vite 5** + TailwindCSS 3 + react-router 6 (dashboard gestionnaire).
- **Backend** — **Supabase** : PostgreSQL, Auth (JWT), Storage, Realtime, Edge Functions (Deno).
- **Sécurité** — Row Level Security (RLS) activé sur **100 % des tables**.
- **Partagé** — types TypeScript stricts et constantes dans `packages/shared`.
- **Monorepo** — Turborepo + pnpm workspaces.
- **CI/CD** — GitHub Actions (lint, type-check, tests).

Voir [docs/architecture.md](docs/architecture.md) pour les diagrammes C4.

## Structure du monorepo

```
ResidenceConnect/
├── apps/
│   ├── mobile/            # React Native + Expo (3 espaces : tenant/manager/technician)
│   │   ├── app/           # routes Expo Router (file-based)
│   │   ├── components/    # UI + composants tickets
│   │   ├── hooks/         # useAuth, useTickets, useApartments, useRealtime, useNotifications
│   │   └── lib/           # client Supabase
│   └── web/               # Dashboard React + Vite + Tailwind
│       └── src/
│           ├── lib/       # logique pure testée (filtres, analytics, CSV, format)
│           ├── hooks/     # useAuth, useTickets
│           ├── pages/     # Login, Dashboard, TicketDetail, Analytics
│           └── components/
├── packages/
│   └── shared/            # types + constantes partagés (TS strict)
├── supabase/
│   ├── migrations/        # schéma, fonctions, RLS
│   └── seed.sql
├── .github/workflows/     # CI
└── docs/                  # documentation technique
```

## Prérequis

- **Node.js ≥ 20**
- **pnpm ≥ 9** (le dépôt épingle `pnpm@10.33.0` via `packageManager`)
- Un compte **Supabase** (pour le backend) et l'app **Expo Go** SDK 54 (pour le mobile)

## Variables d'environnement

Copier `.env.example` puis renseigner les valeurs de votre projet Supabase
(`Settings > API`).

| Application | Fichier | Variables |
|-------------|---------|-----------|
| Mobile | `apps/mobile/.env.local` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Web | `apps/web/.env.local` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

> La clé **anon** est publique par conception : la confidentialité des données
> est garantie par les politiques RLS, pas par le secret de la clé. Ne jamais
> committer les fichiers `.env.local` (déjà ignorés par Git).

## Installation & lancement

```bash
# À la racine du dépôt
pnpm install

# Mobile (Expo)
pnpm --filter @residenceconnect/mobile dev

# Web (Vite, http://localhost:5173)
pnpm --filter @residenceconnect/web dev
```

> L'app web démarre même sans backend configuré : un bandeau « mode
> démonstration » s'affiche et les appels de données sont désactivés
> proprement.

## Qualité : lint, types, tests

Toutes les commandes s'exécutent à la racine et sont orchestrées par Turborepo
sur l'ensemble des packages :

```bash
pnpm lint         # ESLint (mobile + web)
pnpm type-check   # TypeScript strict (tsc --noEmit)
pnpm test         # Jest (mobile, shared) + Vitest (web), avec couverture
```

Cible de couverture : **≥ 70 %** (seuil appliqué automatiquement). La logique
métier pure (scoring d'urgence, filtres, KPIs, export CSV, formatage) et les
hooks de données sont couverts par des tests unitaires ; les composants
critiques du web par des tests d'intégration (Testing Library).

## Base de données Supabase

Les migrations SQL sont dans `supabase/migrations/`, à appliquer dans l'ordre :

| Fichier | Contenu |
|---------|---------|
| `001_initial_schema.sql` | 8 tables, index, trigger `updated_at` |
| `002_functions.sql` | fonctions RLS `SECURITY DEFINER` + trigger de création de profil |
| `003_rls_policies.sql` | politiques RLS de chaque table |
| `004_fix_rls_recursion.sql` | correctif anti-récursion |

Application via la CLI Supabase :

```bash
supabase link --project-ref <votre-ref>
supabase db push
```

Détail des tables, relations et politiques : [docs/database-schema.md](docs/database-schema.md).

## Intégration continue

À chaque push sur `main` et à chaque pull request, GitHub Actions
(`.github/workflows/ci.yml`) exécute :

1. installation `pnpm --frozen-lockfile` (Node 20, cache pnpm) ;
2. `pnpm lint` ;
3. `pnpm type-check` ;
4. `pnpm test` (avec couverture) ;
5. archivage des rapports de couverture en artefact.

**Flux Git** : chaque fonctionnalité passe par une issue, une branche
(`feature/*`, `fix/*`, `test/*`, `docs/*`) et une pull request revue avant
fusion. Les intégrations sont regroupées sur la branche `develop` ; `main`
n'est mise à jour que par revue finale.

## Documentation détaillée

- [docs/architecture.md](docs/architecture.md) — diagrammes C4, choix techniques
- [docs/database-schema.md](docs/database-schema.md) — modèle de données & sécurité RLS

## Équipe

| Membre | Rôle |
|--------|------|
| Gilchrist (Steven) Laleye | Chef de projet / Architecte logiciel |
| Lucas Martin | Dev Frontend Mobile |
| Camille Dupont | Dev Frontend Web |
| Thomas Bernard | Dev Backend / DevOps |
| Sophie Leroy | Administration BDD |
| Marc Fontaine | Architecte logiciel |
| HabitatPlus (Direction) | Product Owner |
