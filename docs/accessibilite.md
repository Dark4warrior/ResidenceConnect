# Accessibilité — ResidenceConnect

> Section 9 du dossier — *Présentation des actions mises en œuvre pour rendre
> le logiciel accessible aux personnes en situation de handicap* (compétence
> **C2.2.3**).

## 1. Démarche et référentiels

L'accessibilité de ResidenceConnect vise le niveau **WCAG 2.1 AA** (référentiel
international) et s'aligne sur le **RGAA 4** (déclinaison française). L'objectif
est que les trois profils utilisateurs — locataire, gestionnaire, technicien —
puissent utiliser l'application **au clavier**, **au lecteur d'écran**
(VoiceOver sur iOS, TalkBack sur Android, lecteurs de bureau sur le web) et avec
une **basse vision** (contrastes, tailles de cible).

La démarche a suivi trois temps :

1. **Audit** de l'existant, fichier par fichier, sur les deux applications
   (web et mobile) — labels manquants, éléments non atteignables au clavier,
   contrastes insuffisants, cibles tactiles trop petites, absence d'annonces.
2. **Renforcement du code**, regroupé en quatre lots livrés par *pull request*
   dédiée (traçabilité, cf. §7).
3. **Vérification** : lint, typage strict, tests unitaires, et contrôle en
   conditions réelles (arbre d'accessibilité du navigateur, pilotage clavier,
   export du bundle mobile).

Le périmètre couvre **l'application web** (React 19 + Vite, tableau de bord
gestionnaire) et **l'application mobile** (React Native / Expo, les trois
espaces).

## 2. Structure sémantique et repères de navigation (web)

| Action | Détail | Fichier |
| --- | --- | --- |
| Repères ARIA (`landmarks`) | `<main>`, `<header>`, `<nav aria-label>` présents sur toutes les vues, y compris hors gabarit (Login, 404, accès refusé) | `apps/web/src/components/Layout.tsx`, `Login.tsx`, `NotFound.tsx`, `ProtectedRoute.tsx` |
| Lien d'évitement | « Aller au contenu » (skip-link), visible au focus, cible `#main` — RGAA 12.7 | `apps/web/src/components/Layout.tsx` |
| Hiérarchie de titres | un `<h1>` par page, sections en `<h2>` (auparavant de simples `<p>` stylés) | `TicketDetail.tsx`, `Analytics.tsx` |
| `lang` du document | `<html lang="fr">` | `apps/web/index.html` |

## 3. Navigation au clavier

**Web.** Tout est atteignable et actionnable sans souris :

- Les **lignes du tableau des signalements**, auparavant cliquables à la souris
  uniquement (`<tr onClick>`), exposent désormais un **vrai lien** décrivant la
  ligne (« Ouvrir le signalement : … logement … créé le … ») dans la cellule
  titre. La **sémantique de tableau est préservée** (pas de `role="button"` sur
  la ligne, qui l'aurait cassée). → `apps/web/src/pages/Dashboard.tsx`
- **Focus visible homogène** sur tous les boutons d'action via une règle
  globale `:focus-visible` (anneau bleu marque). Choix **maintenable** : une
  seule règle couvre les boutons présents et futurs, sans dupliquer un style sur
  chaque composant. → `apps/web/src/index.css`
- À chaque **changement de route** (SPA), le focus est ramené sur le contenu
  principal, pour ne pas laisser l'utilisateur clavier « bloqué » sur le dernier
  élément cliqué. → `apps/web/src/components/Layout.tsx`

**Cas d'étude — la liste déroulante des filtres.** Le composant `Select` est une
liste déroulante personnalisée (un `<select>` natif n'est pas stylable). Elle a
été réécrite selon le **motif ARIA _listbox_** :

- la liste ouverte reçoit le focus et expose l'option active via
  `aria-activedescendant` (les options ne sont pas focusables une à une) ;
- navigation **flèches haut/bas**, **Origine/Fin**, **saisie au vol**
  (typeahead) ;
- **Entrée / Espace** valide, **Échap** annule, et le **focus revient au bouton
  déclencheur** à la fermeture.

→ `apps/web/src/components/Select.tsx`, couvert par
`apps/web/src/components/__tests__/Select.test.tsx`.

## 4. Compatibilité lecteurs d'écran

**Web.**

- Toutes les images utiles portent un `alt` ; les icônes décoratives sont en
  `aria-hidden`.
- Les tableaux de données ont des en-têtes `<th scope="col">` et une
  `<caption>` (lue par le lecteur, masquée visuellement).
- Les messages d'erreur sont annoncés (`role="alert"`).
- Chaque champ de formulaire a un libellé associé (`<label>`, `htmlFor` ou
  `aria-label`).

**Mobile (React Native).** L'API d'accessibilité de React Native a été appliquée
systématiquement :

| Élément | Traitement | Fichiers |
| --- | --- | --- |
| Boutons | `accessibilityRole="button"` + `accessibilityState` (`disabled`, `busy`, `selected`) | `components/ui/Button.tsx`, écrans `ticket/[id]`, `new-ticket.tsx` |
| Champs de saisie | nom accessible relié (`accessibilityLabel`), plus de champ « anonyme » reposant sur le seul placeholder | `components/ui/Input.tsx`, `app/(auth)/login.tsx`, `register.tsx` |
| Bouton afficher/masquer mot de passe | rôle + libellé dynamique (« Afficher / Masquer le mot de passe ») | `components/ui/Input.tsx` |
| Cartes de la liste | libellé récapitulatif lu **d'un seul tenant** (titre, catégorie, logement, statut, urgence, date) | `components/tickets/TicketCard.tsx` |
| Choix (catégorie, urgence, logement, rôle, technicien) | `accessibilityState={{ selected }}` pour annoncer l'option active | `new-ticket.tsx`, `register.tsx`, `(manager)/ticket/[id].tsx` |
| Images | `accessibilityLabel` (« Photo N sur M », « Photo en plein écran ») | `TicketPhotos.tsx`, `(tenant)/ticket/[id].tsx`, `new-ticket.tsx` |
| Icônes décoratives | masquées (`accessibilityElementsHidden` / `importantForAccessibility="no"`) pour éviter le bruit | tous les écrans touchés |
| Modale d'assignation | `accessibilityViewIsModal`, titre en `accessibilityRole="header"` | `(manager)/ticket/[id].tsx` |

**Annonces dynamiques.** Les changements sans transition visuelle explicite sont
annoncés vocalement :

- changement de statut d'un signalement →
  `AccessibilityInfo.announceForAccessibility("Statut mis à jour : …")`
  (`(manager)` et `(technician)/ticket/[id].tsx`) ;
- erreurs de formulaire → `accessibilityLiveRegion` sur les encarts d'erreur.

## 5. Contrastes et présentation visuelle

- **Web** : la couleur de texte informatif `text-slate-400` (contraste ≈ 2,8:1
  sur blanc, **échec AA**) a été remplacée par `text-slate-500` (≈ 4,8:1,
  **conforme AA**) partout où il s'agit de texte réel (les éléments purement
  décoratifs `aria-hidden` restent inchangés). → `Dashboard.tsx`,
  `TicketDetail.tsx`, `Analytics.tsx`, `StatCard.tsx`, `Login.tsx`
- **Mobile** : le token de design `textLight` valait `#94A3B8` (contraste
  ≈ 2,6:1, **échec AA**). Il a été relevé à `#67768C` (≈ 4,6:1, **conforme
  AA**), tout en restant plus clair que `textMuted`. La hiérarchie visuelle
  repose désormais aussi sur la graisse et la taille, pas uniquement sur un gris
  trop pâle. → `apps/mobile/theme/index.ts`

Le design mobile s'appuie sur un **système de tokens centralisé**
(`apps/mobile/theme/index.ts`) : corriger un contraste à un seul endroit se
répercute sur toute l'application.

## 6. Cibles tactiles (mobile)

Les zones interactives visent le **minimum de 44 × 44 pt** recommandé (WCAG
2.5.5 / HIG Apple) :

- boutons principaux `Button` : hauteur 54 pt ;
- bouton œil du champ mot de passe et **suppression de photo** : `hitSlop`
  étendu à 12 pt sur chaque bord (≈ 44 pt de cible réelle autour d'une icône de
  22 pt). → `components/ui/Input.tsx`, `app/(tenant)/new-ticket.tsx`

## 7. Traçabilité (vérifiable dans le dépôt)

Chaque lot a été livré par une issue + une branche + une *pull request* dédiées,
avec des commits en français au format conventionnel :

| Lot | Portée | Issue / PR |
| --- | --- | --- |
| A | Web — navigation clavier & repères | #45 / #46 |
| B | Web — focus, tables, titres, contraste, Select clavier | #47 / #48 |
| C | Mobile — composants transverses (Button, Input, auth, tokens) | #50 / #51 |
| D | Mobile — écrans, états sélectionnés, annonces, cibles | #52 / #53 |

## 8. Vérification et tests

- **Typage strict** (TypeScript, zéro `any`) et **lint** sans erreur sur les
  deux applications.
- **Tests unitaires** : le comportement clavier du composant `Select` est
  couvert par 5 tests dédiés (ouverture clavier, navigation par flèches,
  Origine/Fin, saisie au vol, validation, fermeture par Échap) —
  `apps/web/src/components/__tests__/Select.test.tsx`. Suites vertes :
  **77/77** (web) et **77/77** (mobile).
- **Contrôle en conditions réelles** (web) : arbre d'accessibilité du navigateur
  (présence du skip-link, des repères, des libellés de ligne), pilotage complet
  du `Select` au clavier, focus replacé après navigation.
- **Mobile** : compilation validée par l'export du bundle Metro
  (`expo export`) ; le rendu et les lecteurs d'écran (VoiceOver / TalkBack) sont
  validés sur appareil réel.

## 9. Limites connues et pistes d'amélioration

- Pas de **mode sombre** ni de prise en compte de `prefers-color-scheme`.
- Contrôle des contrastes **manuel** (pas encore d'audit automatisé type
  axe-core intégré à la CI).
- Le `Select` custom implémente l'essentiel du motif _listbox_ ; un audit
  lecteur d'écran approfondi pourrait affiner les annonces d'ouverture.

Ces points sont documentés comme dette d'accessibilité assumée, à traiter dans
une itération ultérieure.
