# Maintenance évolutive et support — ResidenceConnect

> Bloc 4 — *Recommandations argumentées d'amélioration* (compétence **C4.3.1**)
> et *exemple de problème résolu en collaboration avec le support client*
> (compétence **C4.3.3**).

## 1. Recommandations d'amélioration (C4.3.1)

Ces axes s'appuient sur les **indicateurs** (disponibilité mesurée par la
supervision) et les **retours** rencontrés pendant le projet. Chacun est chiffré
en effort et en gain, et reste **réaliste** au regard du contexte.

| Axe d'amélioration | Problème adressé | Gain attendu | Effort estimé |
| --- | --- | --- | --- |
| **Fiabiliser le backend** (offre Supabase payante ou tâche de maintien en éveil) | Le projet gratuit se met en pause après inactivité (indisponibilité détectée par la supervision) | **Disponibilité permanente** — supprime la cause d'indisponibilité la plus fréquente | ~25 $/mois, quelques heures de mise en place |
| **Suivi d'erreurs applicatives (Sentry)** | Aujourd'hui seule la disponibilité est surveillée, pas les erreurs runtime côté utilisateur | Détection **proactive** des bogues, délai de résolution réduit | Gratuit (offre dev), ~0,5 j |
| **Audit d'accessibilité automatisé (axe-core en CI)** | L'accessibilité est vérifiée manuellement | Prévention des **régressions** d'accessibilité à chaque PR | ~0,5 j |
| **Historisation des métriques de supervision** | Les sondes donnent un état instantané, pas de tendance | Pilotage (taux de disponibilité, latence dans le temps) | ~1 j |
| **Mode hors-ligne / notifications enrichies (mobile)** | Usage terrain avec connexion instable | Renforce l'**attractivité** et le confort d'usage | ~2–3 j |

Priorité recommandée : **fiabiliser le backend** (impact disponibilité le plus
fort pour un coût faible), puis **Sentry** (visibilité sur les erreurs réelles).

## 2. Problème résolu en collaboration avec le support client (C4.3.3)

### Contexte du retour utilisateur

Après la mise en ligne du dashboard, un **utilisateur (gestionnaire)** remonte un
problème : *« impossible de se connecter sur le site déployé »*. À la saisie des
identifiants, l'application affiche « Identifiants invalides ou service
indisponible », alors que les mêmes identifiants fonctionnent en local.

### Diagnostic (expertise technique)

Le **support technique** (développeur) reproduit le problème sur l'URL déployée,
puis analyse le **paquet JavaScript servi en production** : l'URL Supabase y est
présente, mais **la clé d'API anonyme est absente du build**. Cause racine : la
variable d'environnement `VITE_SUPABASE_ANON_KEY` **n'avait pas été prise en
compte au moment du build** sur la plateforme d'hébergement (Vite n'inline que
les variables présentes à la compilation). L'application se chargeait donc sans
clé, et toutes ses requêtes d'authentification échouaient.

### Résolution apportée

1. Ajout de la variable `VITE_SUPABASE_ANON_KEY` (valeur complète) dans la
   configuration d'environnement de la plateforme, en **production**.
2. **Redéploiement** (une nouvelle variable ne s'applique qu'à un nouveau build).
3. **Vérification** : la clé est bien présente dans le nouveau paquet, et la
   connexion fonctionne de nouveau.

### Contribution des parties prenantes

- **Utilisateur** : a signalé le problème avec un cas précis (connexion KO en
  prod / OK en local), puis a **validé le rétablissement** après correction.
- **Support / développeur** : a reproduit, diagnostiqué (analyse du build) et
  appliqué le correctif de configuration.
- **Plateforme d'hébergement** (Vercel) : fournit la gestion des variables
  d'environnement et le redéploiement automatique.

### Mesure de prévention

La documentation de déploiement précise désormais **explicitement** les deux
variables requises (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) et un
`.env.example` sert de modèle, afin d'éviter qu'une variable soit oubliée lors
d'un futur déploiement.
