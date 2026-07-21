# Présentation d'un prototype — ResidenceConnect

> Section 5 du dossier — *Présentation d'un des prototypes réalisés*
> (compétence **C2.2.1** : concevoir un prototype tenant compte des spécificités
> ergonomiques et des équipements ciblés, des fonctionnalités et de la sécurité).

## 1. Prototype retenu : le signalement d'incident par le locataire (mobile)

Le prototype présenté est le **parcours « Signaler un incident »**, cœur métier
de l'application côté locataire. Une première maquette statique a été réalisée
(`design-mockups/index.html`) puis concrétisée dans l'écran
`apps/mobile/app/(tenant)/new-ticket.tsx`.

## 2. Équipements ciblés — un choix justifié

| Rôle | Équipement | Pourquoi |
| --- | --- | --- |
| **Locataire** | **Mobile** | Signale depuis chez lui, souvent avec une **photo** prise sur le moment. |
| **Technicien** | **Mobile** | Sur le terrain, met à jour ses missions en déplacement. |
| **Gestionnaire** | **Web** | Travaille depuis un poste, a besoin d'un **tableau de bord** large (liste, filtres, analytics, export). |

Le prototype locataire est donc pensé **mobile-first** : usage à une main,
en extérieur, potentiellement en connexion instable.

## 3. Spécificités ergonomiques

- **Saisie guidée, pas de champ libre inutile** : la catégorie et le niveau
  d'urgence se choisissent par **cartes / puces** tactiles (pas de menu
  déroulant), avec un exemple de titre proposé selon la catégorie.
- **Cibles tactiles confortables** (≥ 44 pt), boutons pleine largeur.
- **Ajout de photo** en deux gestes (caméra ou galerie), avec aperçu et
  suppression, limité à 3 pour rester lisible.
- **Retours immédiats** : messages d'erreur explicites, indicateur de
  chargement, désactivation des actions pendant l'envoi.
- **Accessibilité intégrée** : libellés lecteurs d'écran, états sélectionnés
  annoncés, contrastes conformes (cf. `docs/accessibilite.md`).

## 4. Fonctionnalités couvertes par le prototype

1. Choix du logement (si l'utilisateur en a plusieurs).
2. Choix de la catégorie et de l'urgence.
3. Saisie du titre et de la description (avec limites de longueur).
4. Ajout de photos (caméra / galerie).
5. Validation des champs obligatoires.
6. Envoi → création du signalement + upload des photos → retour à la liste avec
   suivi de l'avancement.

## 5. Sécurité prise en compte dès le prototype

- Le signalement est créé **au nom de l'utilisateur authentifié**
  (`reported_by = profil courant`) ; impossible d'écrire pour autrui.
- Les données créées restent **cloisonnées par la RLS** : le locataire ne verra
  que ses propres signalements.
- Les **photos** partent dans un **bucket privé** (pas d'URL publique), avec
  limite de taille et types d'images autorisés.
- Le prototype ne fait **aucune confiance au client** pour les règles d'accès :
  celles-ci sont appliquées en base (cf. `docs/securite.md`).

## 6. Du prototype au produit

Le prototype a validé les choix d'ergonomie et de parcours avant l'implémentation
complète. Il se prolonge dans les autres écrans (suivi de l'avancement côté
locataire, dashboard côté gestionnaire) qui réutilisent les mêmes composants et
tokens de design, garantissant une expérience cohérente sur les deux plateformes.
