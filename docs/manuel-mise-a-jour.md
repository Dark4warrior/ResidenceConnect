# Manuel de mise à jour — ResidenceConnect

> Section 16 du dossier — *Manuel de mise à jour*.

Ce manuel décrit comment faire évoluer une installation existante en toute
sécurité (code, base de données, applications déployées).

## 1. Principe

Les mises à jour suivent le **flux de branches** et le **versionnement
sémantique** du projet (cf. `docs/ci-cd.md` et `docs/historique-versions.md`) :
tout passe par `develop`, puis par une **release `develop → main`** qui déclenche
les déploiements.

## 2. Mettre à jour le code

```bash
git checkout develop
git pull origin develop
pnpm install            # réaligne les dépendances si le lockfile a changé
```

## 3. Mettre à jour la base de données (migrations)

Les évolutions de schéma sont livrées sous forme de **nouvelles migrations
numérotées** dans `supabase/migrations/` (jamais de modification d'une migration
déjà appliquée).

```bash
supabase db push        # applique les migrations non encore exécutées
```

> Les migrations sont **ordonnées et rejouables** ; appliquer toujours dans
> l'ordre. En production, effectuer une **sauvegarde** avant `db push`.

## 4. Publier une nouvelle version

1. Vérifier que `develop` est **vert** (CI) et que le **cahier de recettes**
   passe (`docs/cahier-de-recettes.md`).
2. Mettre à jour **`CHANGELOG.md`** (déplacer « Non publié » vers la version
   datée).
3. Ouvrir et fusionner une **PR de release `develop → main`**.
4. Créer le **tag `vX.Y.Z`** et la **release GitHub**.
5. Le *push* sur `main` déclenche automatiquement :
   - `deploy-web.yml` → redéploiement du dashboard (Vercel) ;
   - `build-mobile.yml` → nouveau build mobile (EAS).

## 5. Mise à jour de l'application mobile côté utilisateur

- En **développement/démo** : recharger via Expo Go.
- En **production** : nouvelle version distribuée via EAS (store ou APK). Les
  changements de schéma étant rétrocompatibles au sein d'une version MAJEURE,
  une ancienne app continue de fonctionner jusqu'à la mise à jour.

## 6. Mettre à jour les Edge Functions

```bash
supabase functions deploy priority-scoring
supabase functions deploy notify-status-change
```

## 7. Vérification après mise à jour

- CI verte sur `main`.
- Migrations appliquées (aucune en attente).
- Parcours critiques re-testés (cahier de recettes) : connexion, création de
  signalement, changement de statut, temps réel.

## 8. Retour arrière (rollback)

En cas de régression : revenir au **tag précédent** (`git revert` de la PR de
release ou redéploiement du tag antérieur). Les migrations de base doivent être
compensées par une **migration corrective** dédiée (on ne supprime pas une
migration déjà publiée) — cf. `docs/plan-correction-bogues.md`.
