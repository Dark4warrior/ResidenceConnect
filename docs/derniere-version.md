# Dernière version — logiciel fonctionnel, fiable et viable

> Section 11 du dossier — *La dernière version du logiciel fonctionnel, fiable
> et viable*.

## 1. Version livrée

La dernière version est **v1.0.0**, présente sur la branche **`main`** du dépôt
`Dark4warrior/ResidenceConnect` (branche par défaut, celle que l'on clone).
Le détail des changements figure dans `CHANGELOG.md`.

## 2. Fonctionnel — le logiciel remplit sa mission

Les trois parcours métier sont opérationnels de bout en bout :

- **Locataire** — signaler un incident avec photo, suivre son avancement.
- **Gestionnaire** — lister/filtrer, assigner, changer le statut, analyser,
  exporter.
- **Technicien** — consulter ses missions, mettre à jour le statut.

Le tout avec **temps réel**, **journal d'audit** et **notifications**.

## 3. Fiable — la qualité est outillée

- **~180 tests unitaires** verts (Vitest web, Jest mobile/shared).
- **Couverture ≥ 70 %** imposée (mobile ~97 %, web ~92 %, shared 100 %).
- **TypeScript strict** (zéro `any`) et **ESLint** sans erreur.
- **CI bloquante** : rien n'entre sur `main` sans lint + typage + tests au vert
  (`docs/ci-cd.md`).
- **Cahier de recettes** exécuté (parcours gestionnaire : 10/10 conformes,
  0 anomalie — `docs/cahier-de-recettes.md`).
- **Sécurité vérifiée** : cloisonnement RLS testé (`scripts/test-rls.sh`).

## 4. Viable — le logiciel est maintenable et déployable

- **Architecture en monorepo** avec code partagé, documentée
  (`docs/architecture.md`).
- **CI/CD** prête (web Vercel, mobile EAS) et **migrations** versionnées.
- **Versionnement SemVer**, historique et procédure de release documentés
  (`docs/historique-versions.md`).
- **Accessibilité** conforme WCAG 2.1 AA (`docs/accessibilite.md`).
- **Processus de correction des bogues** défini (`docs/plan-correction-bogues.md`).

## 5. Manipulable en autonomie par un utilisateur

- **Application web déployée** : <https://residence-connect-web.vercel.app> — le
  jury peut se connecter et manipuler l'application sans installation, avec les
  **comptes de démonstration** :
  - gestionnaire : `manager@residenceconnect.dev`
  - locataire : `tenant@residenceconnect.dev`
  - technicien : `technicien@residenceconnect.dev`
  - mot de passe : `Demo1234!`
- **Application mobile** : lançable via Expo Go (`pnpm --filter
  @residenceconnect/mobile dev`) ou distribuée en APK via EAS.

## 6. Vérifier le code

```bash
git clone https://github.com/Dark4warrior/ResidenceConnect.git   # branche main
cd ResidenceConnect && pnpm install
pnpm lint && pnpm type-check && pnpm test     # tout doit être vert
```

Puis lancer le web (`pnpm --filter @residenceconnect/web dev`) et le mobile
(`pnpm --filter @residenceconnect/mobile dev`) en suivant le manuel de
déploiement (`docs/manuel-deploiement.md`).
