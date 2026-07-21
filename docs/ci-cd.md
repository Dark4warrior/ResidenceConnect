# Intégration et déploiement continus — ResidenceConnect

> Sections 3 et 1 du dossier — *Protocole d'intégration continue* et *Protocole
> de déploiement continu*.

L'automatisation repose sur **GitHub Actions** (3 workflows dans
`.github/workflows/`) et sur le modèle de branches Git décrit ci-dessous.

## 1. Modèle de branches

- `main` — **branche de production**, toujours livrable ; c'est elle qui déclenche
  les déploiements.
- `develop` — branche d'**intégration** ; toutes les fonctionnalités y sont
  fusionnées via *pull request*.
- `feature/*`, `fix/*`, `docs/*` — une branche par sujet, une *pull request* par
  sujet, un correctif/une fonctionnalité isolés.

Chemin d'une modification : `feature/*` → PR → `develop` → PR de release →
`main` → déploiement.

## 2. Protocole d'intégration continue (`ci.yml`)

**Déclenchement** : à chaque *pull request* et à chaque *push* sur `main`.

**Étapes** (job unique `quality`, sur `ubuntu-latest`) :

1. `checkout` du code ;
2. installation de **pnpm** (version lue depuis `packageManager` du
   `package.json`) et de **Node 20** (avec cache pnpm) ;
3. `pnpm install --frozen-lockfile` (installation reproductible) ;
4. **Lint** — `pnpm lint` (ESLint) ;
5. **Typage** — `pnpm type-check` (TypeScript strict) ;
6. **Tests + couverture** — `pnpm test` (Vitest web, Jest mobile/shared), seuil
   de couverture **≥ 70 %** ;
7. **Résumé de couverture** publié dans le récapitulatif du job
   (`$GITHUB_STEP_SUMMARY`) ;
8. **archivage** des rapports de couverture en artefacts.

**Garanties** :

- une PR dont le lint, le typage ou les tests échouent **ne peut pas être
  fusionnée** (la CI passe au rouge) — c'est le filet anti-régression ;
- `concurrency` annule les exécutions obsolètes quand un nouveau commit arrive
  sur la même référence (économie de temps machine).

## 3. Protocole de déploiement continu

Le déploiement est déclenché **uniquement par un push sur `main`** — donc après
qu'une PR de release `develop → main` a été fusionnée.

### 3.1 Dashboard web — `deploy-web.yml` (Vercel)

**Déclenchement** : push sur `main`.

1. installation (pnpm + Node 20) ;
2. **build** du dashboard (`pnpm --filter @residenceconnect/web build`) avec les
   variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — le build **valide
   toujours** que l'application compile ;
3. **garde-fou** : le déploiement Vercel ne s'exécute que si le secret
   `VERCEL_TOKEN` est présent. Sinon l'étape est **ignorée proprement** (`notice`)
   au lieu de faire échouer `main`.

### 3.2 Application mobile — `build-mobile.yml` (Expo EAS)

**Déclenchement** : push sur `main` (+ déclenchement manuel `workflow_dispatch`).

1. **garde-fou** : le build EAS ne s'exécute que si le secret `EXPO_TOKEN` est
   présent ; sinon le job s'auto-ignore avec un message d'aide ;
2. installation + configuration d'EAS ;
3. **build Android** (profil `preview`, APK) sur les serveurs EAS
   (`--no-wait`).

### 3.3 Choix de conception — déploiements « gardés »

Les deux workflows de déploiement sont **conditionnés à la présence de secrets**.
Objectif : la chaîne CI/CD est **complète et fonctionnelle**, mais tant que les
comptes Vercel / EAS ne sont pas connectés, `main` **reste vert** (le build est
validé, seul le déploiement effectif est différé). Cela évite qu'une intégration
échoue pour une raison d'infrastructure et non de code.

## 4. Migrations de base de données

Le schéma Supabase est versionné sous forme de **migrations SQL numérotées**
(`supabase/migrations/001…007`), rejouables et ordonnées. Le protocole de
mise à jour de la base est détaillé dans le manuel de mise à jour
(`docs/manuel-mise-a-jour.md`).

## 5. Synthèse

| Workflow | Déclencheur | Rôle |
| --- | --- | --- |
| `ci.yml` | PR + push `main` | Qualité : lint, typage, tests, couverture (bloquant). |
| `deploy-web.yml` | push `main` | Build + déploiement Vercel (gardé par secret). |
| `build-mobile.yml` | push `main` + manuel | Build EAS Android (gardé par secret). |
