# Journal des versions déployées — ResidenceConnect

> Bloc 4 — *Présentation d'un exemplaire du journal de version*
> (compétence **C4.3.2** : établir un journal des versions déployées en y
> intégrant la documentation des correctifs réalisés).

Pour savoir à tout moment ce qui a été déployé et pourquoi, je tiens un **journal de version**. Il me sert autant à documenter les correctifs qu'à communiquer les évolutions.

## 1. Où et comment le journal est tenu

Le journal des versions est **tenu dans le dépôt** à deux niveaux, cohérents
entre eux :

- **`CHANGELOG.md`** (format *Keep a Changelog*) : pour chaque version, la liste
  des **ajouts**, **corrections** et éléments de **sécurité**.
- **Releases GitHub** + **tags** `vX.Y.Z` : chaque version livrée est marquée par
  un tag et publiée en release (avec les livrables associés, ex. l'APK).

Le versionnement suit **SemVer** (`MAJEUR.MINEUR.CORRECTIF`). Chaque version
déployée est **traçable** jusqu'aux *pull requests* et commits qui la composent.

## 2. Exemplaire du journal

Extrait du `CHANGELOG.md` — les deux versions déployées à ce jour :

### [1.0.1] — 2026-08-20 · Maintenance (Bloc 4)

**Ajouté**
- Système de supervision : sondes de disponibilité planifiées (web + Supabase)
  avec seuils et signalement automatique.
- Automatisation des mises à jour de dépendances (Dependabot).

**Corrigé**
- Routes profondes en 404 sur le déploiement : ajout d'un *fallback* SPA
  (`apps/web/vercel.json`). Correctif déployé via l'intégration/déploiement
  continu.

### [1.0.0] — 2026-07-21 · Première version

**Ajouté** — les trois espaces mobile, le dashboard web, le backend Supabase
(RLS, Auth, Storage, Realtime, Edge Functions), l'accessibilité WCAG AA, la
CI/CD et la documentation.
**Sécurité** — correction de la récursion des politiques RLS (migration `004`).

## 3. Ce que le journal apporte

- **Amélioration apportée par chaque version** : chaque entrée liste les
  nouveautés et les **correctifs** (ex. le 404 SPA en 1.0.1).
- **Correctifs documentés** : le correctif est décrit (cause + solution) et
  relié à son implémentation (`apps/web/vercel.json`, PR de correction).
- **Traçabilité** : version → CHANGELOG → *pull requests* → commits → tag/release.

## 4. Procédure de publication d'une version

1. Vérifier que `develop` est vert (CI) et que le cahier de recettes passe.
2. Mettre à jour `CHANGELOG.md` (déplacer « Non publié » vers la version datée).
3. Fusionner une *pull request* de release `develop → main`.
4. Créer le **tag `vX.Y.Z`** et la **release GitHub**.
5. Le *push* sur `main` déclenche le déploiement (cf. `docs/ci-cd.md`).
