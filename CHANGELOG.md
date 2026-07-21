# Changelog

Toutes les évolutions notables de ResidenceConnect sont consignées ici.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
et le versionnement suit [SemVer](https://semver.org/lang/fr/)
(`MAJEUR.MINEUR.CORRECTIF`).

## [Non publié]

_Rien pour l'instant._

## [1.0.0] — 2026-07-21

Première version fonctionnelle, fiable et viable — livrable du Bloc 2.

### Ajouté
- **Application mobile** (React Native / Expo) : trois espaces complets
  — locataire (signaler avec photo, suivre l'avancement), gestionnaire,
  technicien (missions, mise à jour de statut).
- **Dashboard web** (React + Vite) : connexion, liste filtrable, détail,
  assignation, changement de statut, analytics, export CSV, profil.
- **Backend Supabase** : schéma PostgreSQL + index, authentification JWT,
  Storage privé pour les photos, Realtime, journal d'audit (`ticket_history`).
- **Sécurité** : RLS sur 100 % des tables (cloisonnement par rôle en base) ;
  fonctions `SECURITY DEFINER` ; script de tests RLS (`scripts/test-rls.sh`).
- **Edge Functions** : `priority-scoring` (score d'urgence),
  `notify-status-change` (notification + push).
- **Accessibilité** (WCAG 2.1 AA / RGAA) : navigation clavier web, compatibilité
  lecteurs d'écran (VoiceOver / TalkBack), contrastes conformes, cibles
  tactiles — cf. `docs/accessibilite.md`.
- **Qualité / CI-CD** : TypeScript strict, ESLint, ~180 tests unitaires
  (couverture ≥ 70 %), 3 workflows GitHub Actions.
- **Documentation** : architecture, schéma de base, API, accessibilité, cahier
  de recettes, plan de correction des bogues, CI/CD, manuels.

### Sécurité
- Correction de la récursion des politiques RLS
  (`supabase/migrations/004_fix_rls_recursion.sql`).

---

Les évolutions antérieures à la version 1.0.0 correspondent aux phases de
construction du Bloc 2 (socle & schéma, signalements de bout en bout, dashboard
web, Edge Functions), tracées dans l'historique Git et les *pull requests* du
dépôt. Le détail est présenté dans `docs/historique-versions.md`.

[Non publié]: https://github.com/Dark4warrior/ResidenceConnect/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Dark4warrior/ResidenceConnect/releases/tag/v1.0.0
