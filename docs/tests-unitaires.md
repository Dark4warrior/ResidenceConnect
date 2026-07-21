# Jeu de tests unitaires — ResidenceConnect

> Section 7 du dossier — *Jeu de tests unitaires couvrant une fonctionnalité
> demandée* (compétence **C2.2.2** : développer un harnais de tests unitaires
> pour prévenir les régressions).

## 1. Fonctionnalité couverte : le filtrage et le tri des signalements

La fonctionnalité présentée est le **filtrage et le tri de la liste des
signalements** du dashboard gestionnaire — une exigence centrale (retrouver
rapidement un signalement parmi beaucoup). La logique est **isolée dans des
fonctions pures** (`filterTickets`, `sortByUrgencyThenDate` dans
`apps/web/src/lib/filters.ts`), donc facilement testable sans interface.

Le jeu de tests associé : **`apps/web/src/lib/__tests__/filters.test.ts`**
(10 cas).

## 2. Cas de test

| # | Cas | Vérifie |
| --- | --- | --- |
| 1 | Sans filtre | renvoie tous les tickets |
| 2 | Filtre par statut | ne garde que le statut demandé |
| 3 | Filtre par urgence | ne garde que l'urgence demandée |
| 4 | Filtre par catégorie | ne garde que la catégorie demandée |
| 5 | Combinaison de filtres | applique un **ET** logique |
| 6 | Recherche | **insensible à la casse**, sur titre et logement |
| 7 | Recherche sans résultat | renvoie une liste vide |
| 8 | Immuabilité (filtre) | ne mute pas le tableau d'entrée |
| 9 | Tri urgence puis date | ordre décroissant sur les deux critères |
| 10 | Immuabilité (tri) | ne mute pas le tableau d'entrée |

Les cas ne couvrent pas seulement le chemin nominal : ils testent aussi les
**cas limites** (aucun résultat, combinaison impossible) et une **propriété de
robustesse** (les fonctions ne modifient pas leurs entrées, ce qui évite des
bogues d'effet de bord).

## 3. Extrait

```ts
describe('filterTickets', () => {
  const tickets = [
    makeTicket({ status: 'pending', urgency_level: 'low', category: 'plumbing', title: 'Robinet' }),
    makeTicket({ status: 'resolved', urgency_level: 'critical', category: 'elevator', title: 'Ascenseur bloqué' }),
    makeTicket({ status: 'in_progress', urgency_level: 'high', category: 'electricity', title: 'Panne de courant' }),
  ];

  it('combine plusieurs filtres (ET logique)', () => {
    const res = filterTickets(
      tickets,
      withFilters({ status: 'pending', category: 'electricity' })
    );
    expect(res).toHaveLength(0);
  });

  it('recherche insensible à la casse dans titre et logement', () => {
    expect(filterTickets(tickets, withFilters({ search: 'ASCENSEUR' }))).toHaveLength(1);
  });
});
```

*Motif « Arrange–Act–Assert »* : on prépare des données représentatives
(`makeTicket`, une fabrique de test), on exécute la fonction, on vérifie le
résultat attendu.

## 4. Un harnais, pas un test isolé

Ce jeu s'inscrit dans un **harnais global de ~180 tests unitaires** :

- **Web (Vitest)** : filtres, tri, export CSV (13 cas), analytics, hooks,
  navigation clavier du composant `Select` (5 cas d'accessibilité).
- **Mobile (Jest)** : hooks (`useTickets`, `useTicketHistory`, `useApartments`,
  `useRealtime`), gestion des photos, stockage sécurisé, calculs analytiques.
- **`shared`** : constantes et utilitaires métier (couverture 100 %).

## 5. Prévention des régressions

- Les tests s'exécutent **à chaque *push* et *pull request*** via la CI
  (`ci.yml`) ; une PR qui casse un test **ne peut pas être fusionnée**.
- **Seuil de couverture ≥ 70 %** imposé (mobile ~97 %, web ~92 %, shared 100 %).
- **Règle d'équipe** : tout correctif de bogue est accompagné d'un test qui
  reproduit le bug (cf. `docs/plan-correction-bogues.md`), garantissant qu'il ne
  réapparaîtra pas.

## 6. Exécution

```bash
pnpm test                              # tout le monorepo, avec couverture
pnpm --filter @residenceconnect/web test
pnpm --filter @residenceconnect/mobile test
```
