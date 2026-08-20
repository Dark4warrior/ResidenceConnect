# Mise à jour des dépendances — ResidenceConnect

> Bloc 4 — *Description du processus de mise à jour des dépendances*
> (compétence **C4.1.1**).

Pour garder l'application à jour et sûre sans y consacrer trop de temps, j'ai mis en place un processus **semi-automatique** de gestion des dépendances : l'outillage propose les mises à jour, et je garde la main sur ce qui est réellement intégré.

## 1. Périmètre concerné

Le monorepo regroupe plusieurs ensembles de dépendances, tous couverts :

- **`apps/web`** — React, Vite, Tailwind, supabase-js…
- **`apps/mobile`** — React Native, Expo SDK, expo-*, supabase-js…
- **`packages/shared`** — dépendances des types/constantes partagés.
- **Racine / outillage** — pnpm, Turborepo, ESLint, TypeScript, Vitest, Jest.
- **Actions GitHub** — les *actions* utilisées par les workflows CI/CD.

Les versions sont **verrouillées** par un unique `pnpm-lock.yaml` à la racine :
les installations sont reproductibles (`pnpm install --frozen-lockfile` en CI).

## 2. Fréquence

- **Automatique — hebdomadaire** : Dependabot (`.github/dependabot.yml`) inspecte
  chaque semaine les nouvelles versions des dépendances npm et des actions
  GitHub, et ouvre des *pull requests* de mise à jour.
- **Ponctuelle** : à l'occasion d'un correctif de sécurité signalé, ou d'un
  besoin fonctionnel.

## 3. Type : automatique **et** manuel

Le processus est **semi-automatique**, pour concilier fraîcheur et maîtrise :

1. **Automatique** — Dependabot ouvre les PR de montée de version (les mises à
   jour mineures et correctives sont **regroupées** en une seule PR pour limiter
   le bruit).
2. **Validation par la CI** — chaque PR déclenche `ci.yml` (lint, typage,
   tests + couverture). Une mise à jour qui casse quelque chose **ne peut pas
   être fusionnée**.
3. **Fusion manuelle** — la montée de version est **relue puis fusionnée** par le
   développeur. Les mises à jour **majeures** (risque de rupture) sont traitées
   au cas par cas.

## 4. Évaluation de l'impact et sécurité

- La **CI** mesure automatiquement l'impact d'une mise à jour (régression de
  test, erreur de typage) avant toute fusion.
- Contrainte spécifique mobile : **Expo SDK 54** est figé (compatibilité Expo
  Go) — les paquets `expo-*` sont alignés via `npx expo install --check`, et non
  montés arbitrairement.
- Les alertes de sécurité GitHub (Dependabot security) sont traitées **en
  priorité** (cf. `docs/plan-correction-bogues.md`).

### Exemple réel d'évaluation d'impact

À sa première exécution, Dependabot a ouvert une dizaine de *pull requests*
(cf. **Annexe A**). Elles ont été triées selon leur impact :

- **Acceptées** — les mises à jour **mineures et correctives** (regroupées en une
  PR), à faible risque, validées par la CI.
- **Écartées / reportées** — les montées **majeures** susceptibles de casser
  l'application : par exemple le passage d'**Expo 54 → 57** (incompatible avec la
  contrainte Expo Go du projet) ou de **TypeScript 5 → 7**. Ces PR sont
  **refusées** en connaissance de cause, illustrant l'**évaluation des impacts**
  avant toute intégration.

## 5. Synthèse

| Critère | Valeur |
| --- | --- |
| Périmètre | web, mobile, shared, outillage, actions GitHub |
| Fréquence | hebdomadaire (Dependabot) + ponctuelle (sécurité) |
| Type | automatique (ouverture des PR) + manuel (revue et fusion) |
| Garde-fou | CI bloquante (lint, typage, tests) sur chaque PR |
