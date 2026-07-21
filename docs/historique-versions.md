# Historique des versions — ResidenceConnect

> Section 10 du dossier — *Historique des différentes versions du logiciel*.

## 1. Stratégie de versionnement

ResidenceConnect suit le **versionnement sémantique** (SemVer) :
`MAJEUR.MINEUR.CORRECTIF`.

- **MAJEUR** — changement incompatible (rupture d'API ou de modèle) ;
- **MINEUR** — nouvelle fonctionnalité rétrocompatible ;
- **CORRECTIF** — correction de bogue rétrocompatible.

Chaque version livrable est **marquée par un tag Git** (`vX.Y.Z`) sur `main` et
publiée en **release GitHub**. Le détail des changements est tenu dans
`CHANGELOG.md` (format *Keep a Changelog*).

## 2. Traçabilité

L'historique complet est **vérifiable dans le dépôt** à trois niveaux :

1. **Commits** conventionnels (`feat:`, `fix:`, `docs:`, `test:`, `chore:`,
   `ci:`, `refactor:`) en français ;
2. **Pull requests** — une par sujet, reliée à son issue (`Closes #NN`), qui
   documente le quoi et le pourquoi ;
3. **Tags & releases** — les jalons livrables.

## 3. Jalons de développement (avant 1.0.0)

Le Bloc 2 a été construit par incréments successifs, intégrés sur `develop`
puis publiés sur `main` :

| Jalon | Contenu |
| --- | --- |
| Socle | Schéma PostgreSQL + index, authentification JWT, politiques RLS. |
| Signalements | Création avec photo, suivi, temps réel, journal d'audit de bout en bout. |
| Dashboard web | Liste + filtres, détail, assignation, statut, analytics, export CSV. |
| Edge Functions | `priority-scoring` et `notify-status-change` (déployées et testées). |
| Durcissement | Correction de la récursion RLS (migration 004), bucket Storage privé, RPC analytique, webhook de changement de statut. |

Ces jalons sont matérialisés par les migrations numérotées
(`supabase/migrations/001…007`) et par les *pull requests* fusionnées.

## 4. Versions publiées

| Version | Date | Description |
| --- | --- | --- |
| **v1.0.0** | 2026-07-21 | Première version fonctionnelle, fiable et viable : les 3 espaces mobile, le dashboard web, la sécurité RLS, les Edge Functions, l'accessibilité WCAG AA, la CI/CD et la documentation. Voir `CHANGELOG.md`. |

## 5. Procédure de publication d'une version

1. S'assurer que `develop` est vert (CI) et que le cahier de recettes passe.
2. Mettre à jour `CHANGELOG.md` (déplacer « Non publié » vers la nouvelle
   version datée).
3. Ouvrir et fusionner une *pull request* de release `develop → main`.
4. Créer le tag `vX.Y.Z` sur `main` et la **release GitHub** associée.
5. Le push sur `main` déclenche les workflows de déploiement (web / mobile).
