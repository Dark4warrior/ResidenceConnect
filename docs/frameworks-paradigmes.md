# Frameworks et paradigmes de développement — ResidenceConnect

> Section 6 du dossier — *Utilisation de frameworks et de paradigmes de
> développement adaptés*.

## 1. Frameworks et technologies

| Couche | Technologie | Rôle |
| --- | --- | --- |
| Mobile | **React Native 0.81 / Expo SDK 54** (Expo Router) | Applications iOS/Android à partir d'une base unique. |
| Web | **React 19 + Vite 5 + Tailwind CSS + React Router** | Dashboard gestionnaire, build rapide. |
| Langage | **TypeScript strict** (partout) | Typage statique, moins d'erreurs à l'exécution. |
| Backend | **Supabase** (PostgreSQL, Auth, Storage, Realtime) | Base, authentification, fichiers, temps réel managés. |
| Fonctions | **Edge Functions Deno** | Logique serveur légère (scoring, notifications). |
| Monorepo | **pnpm + Turborepo** | Orchestration des paquets, cache de tâches. |

## 2. Paradigmes de développement

### 2.1 Programmation déclarative (UI)

React et React Native reposent sur un paradigme **déclaratif** : on décrit
l'interface **en fonction de l'état**, et le framework se charge de la mettre à
jour. Le code exprime *quoi* afficher, pas *comment* manipuler le DOM.

### 2.2 Composants et hooks

- **Composition de composants** réutilisables (`Button`, `Input`, `Select`,
  `TicketCard`…) : une brique, une responsabilité.
- **Hooks** pour la logique d'état et les effets (`useTickets`, `useAuth`,
  `useTicketHistory`…), qui isolent la logique métier de l'affichage.

### 2.3 Sécurité déclarative en base (RLS)

Le cloisonnement des données est exprimé de façon **déclarative** via les
politiques **Row Level Security** de PostgreSQL, plutôt que par du code
impératif côté client. La règle d'accès est *déclarée une fois* et s'applique à
toute requête (cf. `docs/securite.md`).

### 2.4 Typage statique

Le **typage strict** (TypeScript, zéro `any`) est un paradigme transverse : les
contrats de données (types partagés dans `packages/shared`) sont vérifiés à la
compilation, sur le web comme sur le mobile.

### 2.5 Architecture en monorepo

Le code commun (types, constantes) vit dans **`packages/shared`** et alimente les
deux applications — une seule source de vérité, pas de duplication (cf.
`docs/architecture.md`).

## 3. Conventions transverses

- Gestion d'erreur explicite sur les appels réseau / base.
- JSDoc sur les fonctions complexes.
- Commits conventionnels, une branche/PR par sujet.
- Variables sensibles en `.env` (jamais en dur).

## 4. Synthèse

Le projet combine un socle **déclaratif** (UI React, sécurité RLS), un **typage
statique strict** partagé entre plateformes, et une **organisation monorepo**
qui maximise la réutilisation — trois choix orientés **maintenabilité** et
**fiabilité**.
