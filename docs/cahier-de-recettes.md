# Cahier de recettes — ResidenceConnect

> Section 12 du dossier — *Cahier de recettes* (compétence **C2.3.1** :
> élaborer les scénarios de tests et leurs résultats attendus pour détecter
> anomalies et régressions).

## 1. Objectif et périmètre

Ce cahier décrit les **scénarios de recette fonctionnelle** de ResidenceConnect
et leurs **résultats attendus**, afin de valider que le logiciel répond aux
spécifications et de détecter toute anomalie ou régression avant livraison.

Il couvre les deux applications et les trois rôles :

- **Locataire** (mobile) — signaler un incident, suivre son avancement ;
- **Gestionnaire** (web) — piloter les signalements, assigner, analyser ;
- **Technicien** (mobile) — traiter les missions assignées.

Ainsi que les aspects transversaux : **authentification**, **cloisonnement des
données (RLS)**, **temps réel**, **journal d'audit** et **accessibilité**.

## 2. Environnement de recette

| Élément | Valeur |
| --- | --- |
| Web (gestionnaire) | `http://localhost:5173` (dev) — `pnpm --filter @residenceconnect/web dev` |
| Mobile (locataire/technicien) | Expo Go — `pnpm --filter @residenceconnect/mobile dev` |
| Backend | Supabase (projet `ymwhvjtvdktinoyxafdr`), migrations 001→007 appliquées, seed chargé |
| Compte gestionnaire | `manager@residenceconnect.dev` / `Demo1234!` |
| Compte locataire | `tenant@residenceconnect.dev` / `Demo1234!` |
| Compte technicien | `technicien@residenceconnect.dev` / `Demo1234!` |

## 3. Conventions

Chaque scénario est identifié par `CR-<DOMAINE>-<NN>` et décrit :

- **Préconditions** — état requis avant le test ;
- **Étapes** — actions à réaliser ;
- **Résultat attendu** — comportement conforme ;
- **Résultat obtenu / Statut** — à renseigner lors de l'exécution.

**Statuts** : ✅ Conforme · ❌ Non conforme · ⏳ À exécuter.
**Sévérité d'une anomalie** : Bloquante · Majeure · Mineure (voir le plan de
correction des bogues, `docs/plan-correction-bogues.md`).

> Les anomalies détectées en recette sont consignées comme *issues* GitHub et
> suivies selon le plan de correction des bogues.

---

## 4. Authentification et sécurité (transversal)

### CR-AUTH-01 — Inscription d'un nouveau compte
- **Préconditions** : app mobile ouverte, écran d'inscription.
- **Étapes** : saisir nom, email, (téléphone), mot de passe (≥ 8 car.),
  choisir un rôle, valider.
- **Résultat attendu** : compte créé, écran de confirmation « Compte créé ! »,
  redirection possible vers la connexion.

### CR-AUTH-02 — Connexion avec identifiants valides
- **Préconditions** : compte existant.
- **Étapes** : saisir email + mot de passe corrects, valider.
- **Résultat attendu** : accès à l'espace correspondant au rôle
  (locataire/technicien sur mobile, gestionnaire sur web).

### CR-AUTH-03 — Connexion avec identifiants invalides
- **Étapes** : saisir un mot de passe erroné, valider.
- **Résultat attendu** : message « Identifiants invalides… », **aucun** accès,
  aucune fuite d'information (pas de distinction « email inconnu » / « mauvais
  mot de passe »).

### CR-AUTH-04 — Champs obligatoires manquants
- **Étapes** : laisser un champ requis vide, valider.
- **Résultat attendu** : message de validation, soumission bloquée.

### CR-AUTH-05 — Déconnexion
- **Étapes** : depuis un espace connecté, se déconnecter.
- **Résultat attendu** : retour à l'écran de connexion, session invalidée
  (le retour arrière ne redonne pas accès).

### CR-AUTH-06 — Cloisonnement d'accès web par rôle
- **Préconditions** : se connecter au **web** avec un compte **locataire** ou
  **technicien**.
- **Résultat attendu** : écran « Accès réservé aux gestionnaires », impossibilité
  d'atteindre le tableau de bord, action « Changer de compte » disponible.

---

## 5. Espace Locataire (mobile)

### CR-LOC-01 — Créer un signalement (champs obligatoires)
- **Préconditions** : connecté en locataire, rattaché à ≥ 1 logement.
- **Étapes** : choisir catégorie + urgence, saisir titre et description, envoyer.
- **Résultat attendu** : signalement créé, retour à la liste, le nouveau
  signalement y apparaît au statut « En attente ».

### CR-LOC-02 — Créer un signalement avec photo(s)
- **Étapes** : dans le formulaire, ajouter une photo (caméra ou galerie),
  envoyer.
- **Résultat attendu** : la (les) photo(s) sont téléversées et visibles dans le
  détail du signalement (côté locataire, gestionnaire et technicien).

### CR-LOC-03 — Validation des champs obligatoires
- **Étapes** : tenter d'envoyer sans titre ou sans description.
- **Résultat attendu** : message « Le titre et la description sont
  obligatoires. », envoi bloqué.

### CR-LOC-04 — Limite de 3 photos
- **Étapes** : tenter d'ajouter une 4ᵉ photo.
- **Résultat attendu** : ajout refusé, message « Maximum 3 photos… », boutons
  d'ajout désactivés à 3 photos.

### CR-LOC-05 — Suivre l'avancement d'un signalement
- **Étapes** : ouvrir un signalement existant.
- **Résultat attendu** : frise de progression (Reçu → En cours → Résolu)
  reflétant le statut courant, avec message contextuel.

### CR-LOC-06 — Agrandir une photo
- **Étapes** : dans le détail, toucher une miniature.
- **Résultat attendu** : ouverture plein écran, fermeture possible.

### CR-LOC-07 — Aucun logement rattaché
- **Préconditions** : compte locataire sans logement.
- **Résultat attendu** : message « Aucun logement rattaché », création de
  signalement indisponible.

---

## 6. Espace Gestionnaire (web)

### CR-GES-01 — Afficher la liste des signalements
- **Résultat attendu** : tableau listant tous les signalements (titre,
  logement, urgence, statut, assigné à, date), triés par urgence puis date.

### CR-GES-02 — Filtrer les signalements
- **Étapes** : utiliser la recherche, puis les filtres statut / urgence /
  catégorie.
- **Résultat attendu** : la liste se restreint en conséquence, le compteur
  « N tickets » se met à jour ; filtres combinables.

### CR-GES-03 — Onglets attribués / non attribués
- **Étapes** : basculer entre « Tous », « Non attribués », « Attribués ».
- **Résultat attendu** : la liste et les compteurs correspondent ; un
  signalement résolu n'est pas compté comme « non attribué ».

### CR-GES-04 — Ouvrir le détail d'un signalement
- **Étapes** : cliquer sur une ligne.
- **Résultat attendu** : page de détail (description, photos, informations,
  historique).

### CR-GES-05 — Assigner un technicien
- **Étapes** : dans le détail, choisir un technicien dans la liste.
- **Résultat attendu** : le signalement est assigné, « Assigné à » mis à jour,
  l'action est tracée dans l'historique.

### CR-GES-06 — Retirer l'assignation
- **Étapes** : sélectionner « Non assigné ».
- **Résultat attendu** : le signalement redevient non assigné.

### CR-GES-07 — Changer le statut
- **Étapes** : cliquer sur un statut (En attente / En cours / Résolu).
- **Résultat attendu** : statut mis à jour, horodatage de résolution renseigné
  le cas échéant, entrée ajoutée à l'historique (transition ancien → nouveau).

### CR-GES-08 — Consulter les analytics
- **Résultat attendu** : indicateurs (total, taux de résolution 7 j, délai moyen,
  catégorie fréquente), répartitions par statut et catégorie, tableau de
  récurrence par catégorie. La source (« Agrégation SQL » / « Calcul client »)
  est indiquée.

### CR-GES-09 — Exporter en CSV
- **Étapes** : cliquer « Exporter en CSV » (avec des résultats affichés).
- **Résultat attendu** : téléchargement d'un fichier `tickets-*.csv` ouvrable
  dans Excel avec accents corrects (BOM UTF-8), reflétant la liste filtrée.

### CR-GES-10 — Modifier son profil
- **Étapes** : page « Mon compte », modifier nom / téléphone, enregistrer.
- **Résultat attendu** : message de confirmation, données mises à jour ;
  l'e-mail reste en lecture seule.

---

## 7. Espace Technicien (mobile)

### CR-TEC-01 — Voir ses missions
- **Résultat attendu** : liste des signalements **assignés au technicien
  connecté uniquement**.

### CR-TEC-02 — Mettre à jour le statut d'une mission
- **Étapes** : ouvrir une mission, saisir un commentaire (facultatif),
  choisir un nouveau statut.
- **Résultat attendu** : statut mis à jour, commentaire enregistré dans
  l'historique, retour reflété côté locataire et gestionnaire.

### CR-TEC-03 — Consulter les informations d'intervention
- **Résultat attendu** : logement et **adresse** de la résidence affichés pour
  se rendre sur place.

---

## 8. Transversal — temps réel, audit, notifications

### CR-TR-01 — Mise à jour en temps réel
- **Préconditions** : un gestionnaire (web) et le locataire concerné (mobile)
  ouverts sur le même signalement.
- **Étapes** : le gestionnaire change le statut.
- **Résultat attendu** : la vue du locataire se met à jour **sans rechargement
  manuel** (Realtime).

### CR-TR-02 — Journal d'audit
- **Étapes** : effectuer plusieurs changements de statut / assignation.
- **Résultat attendu** : chaque changement apparaît dans l'historique
  (`ticket_history`) avec auteur, date et transition ; entrées **immuables**.

### CR-TR-03 — Notification de changement de statut
- **Étapes** : changer le statut d'un signalement.
- **Résultat attendu** : la notification est déclenchée (trigger `pg_net` →
  Edge Function `notify-status-change`).

---

## 9. Cloisonnement des données — sécurité (RLS)

> Ces scénarios sont **automatisés** par `scripts/test-rls.sh` (15 assertions
> contre un vrai projet Supabase). Voir aussi `docs/database-schema.md`
> (matrice RLS).

### CR-SEC-01 — Un locataire ne voit que ses signalements
- **Résultat attendu** : requêtes limitées aux signalements de ses logements ;
  aucun accès aux autres.

### CR-SEC-02 — Un technicien ne voit que ses missions
- **Résultat attendu** : accès restreint aux signalements qui lui sont assignés.

### CR-SEC-03 — Accès direct à l'API bloqué
- **Étapes** : tenter une requête API pour des données d'un autre utilisateur.
- **Résultat attendu** : refus par les politiques RLS (cloisonnement en base,
  pas côté client).

---

## 10. Accessibilité

Les scénarios d'accessibilité (navigation clavier, lecteurs d'écran, contrastes,
cibles tactiles) sont détaillés dans **`docs/accessibilite.md`** (section 9) et
ont été validés — web en préversion, mobile sur appareil réel (VoiceOver /
TalkBack).

---

## 11. Campagne de recette — résultats

Synthèse à compléter à l'issue de l'exécution.

| Domaine | Scénarios | ✅ | ❌ | ⏳ |
| --- | --- | --- | --- | --- |
| Authentification & sécurité | CR-AUTH-01→06 | | | |
| Locataire | CR-LOC-01→07 | | | |
| Gestionnaire | CR-GES-01→10 | | | |
| Technicien | CR-TEC-01→03 | | | |
| Transversal | CR-TR-01→03 | | | |
| RLS (auto) | CR-SEC-01→03 | | | |
| **Total** | **32** | | | |

Toute anomalie détectée est enregistrée en *issue* GitHub et traitée selon
`docs/plan-correction-bogues.md`.
