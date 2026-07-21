# Manuel de déploiement — ResidenceConnect

> Section 14 du dossier — *Manuel de déploiement*.

Ce manuel décrit comment installer, configurer et déployer ResidenceConnect
(base de données, dashboard web, application mobile).

## 1. Prérequis

- **Node.js 20**, **pnpm** (version indiquée dans `package.json`).
- Un projet **Supabase** (base PostgreSQL managée).
- Comptes optionnels pour la production : **Vercel** (web), **Expo EAS** (mobile).
- CLI Supabase pour appliquer les migrations.

## 2. Installation locale

```bash
git clone https://github.com/Dark4warrior/ResidenceConnect.git
cd ResidenceConnect
pnpm install
```

## 3. Configuration (variables d'environnement)

Créer les fichiers `.env.local` **non versionnés** :

- `apps/web/.env.local` et `apps/mobile/.env.local` :
  ```
  VITE_SUPABASE_URL=...           # (EXPO_PUBLIC_SUPABASE_URL côté mobile)
  VITE_SUPABASE_ANON_KEY=...      # clé anonyme publique
  ```

> Seule la **clé anonyme publique** est exposée côté client ; aucune clé de
> service ne doit s'y trouver (cf. `docs/securite.md`).

## 4. Base de données (Supabase)

Appliquer les migrations dans l'ordre (`supabase/migrations/001…007`) :

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Charger le jeu de données de démonstration (`supabase/seed`) si besoin.

## 5. Lancer en développement

```bash
pnpm --filter @residenceconnect/web dev      # http://localhost:5173
pnpm --filter @residenceconnect/mobile dev   # Expo Go (QR code)
```

## 6. Déploiement en production

Le déploiement est **automatisé par GitHub Actions** au *push* sur `main`
(cf. `docs/ci-cd.md`).

### 6.1 Dashboard web (Vercel)

1. Renseigner les secrets GitHub : `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
   `VERCEL_PROJECT_ID`, et les variables `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY`.
2. Fusionner sur `main` → le workflow `deploy-web.yml` **construit** puis
   **déploie** sur Vercel (production).
3. Sans secrets Vercel, le build est validé mais le déploiement est ignoré
   proprement.

### 6.2 Application mobile (Expo EAS)

1. Créer un projet EAS (`eas init`) et ajouter le secret GitHub `EXPO_TOKEN`.
2. Un *push* sur `main` déclenche `build-mobile.yml` → **build Android** (profil
   `preview`, APK) sur les serveurs EAS. Déclenchement manuel possible
   (`workflow_dispatch`).
3. Pour la distribution : soumettre via EAS Submit (stores) ou partager l'APK.

### 6.3 Edge Functions

```bash
supabase functions deploy priority-scoring
supabase functions deploy notify-status-change
```

## 7. Vérification post-déploiement

- Le dashboard web se charge et la connexion gestionnaire fonctionne.
- Un signalement de test remonte en temps réel.
- La CI est verte sur `main` (`ci.yml`).
