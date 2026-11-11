# Suivi du chiffre d'affaires annuel

Règle confirmée par l'utilisateur : factures actuellement marquées « Payée », montants TTC après remise, regroupés selon la date d'émission. La sélection d'année concerne uniquement le nouveau bloc de chiffre d'affaires ; les cartes d'activité et les documents récents restent actuels.

Le bloc propose le total annuel, le nombre de factures payées, un graphique mensuel ou cumulé et un tableau mensuel détaillé. Les cinq dernières années et tout historique de facturation plus ancien sont proposés. Une année vide affiche 0 € et un message explicite. Le total de décembre en vue cumulée correspond au total annuel ; les additions sont faites en centimes après arrondi de chaque facture, en conservant la méthode de calcul TTC existante.

## Modules

- `src/lib/revenue.ts` : validation des années, calcul TTC conservé, agrégation mensuelle/annuelle et cumul.
- `src/lib/revenue-data.ts` : lectures Prisma bornées à l'année et au compte connecté ; découverte de l'historique par la première facture du compte.
- `src/app/api/dashboard/route.ts` : fournit les données annuelles courantes avec le tableau de bord, sans second appel client pour l'année actuelle.
- `src/app/api/dashboard/revenue/route.ts` : fournit uniquement les données d'une année sélectionnée via `?year=2025`. Réponses privées, contrôle de session et rejet des années invalides/futures.
- `src/components/facturapro/revenue-overview.tsx` : sélection d'année, montant, compteur, graphique et détail accessible. Cache par compte et année, annulation lors d'un changement de sélection et réessai en cas d'erreur.
- `tests/revenue.test.cjs` : limites d'année, cumul, centimes, TVA/remises, années vides, validation, isolation et compatibilité des indicateurs existants.

Le tableau de bord conserve ses propriétés de réponse précédentes pour les onglets déjà ouverts. Les clics des documents récents ont également été corrigés pour ouvrir leur détail après navigation.

## Lancement et vérifications

Avec Node.js 22 et Bun 1.4.4, depuis le projet configuré selon `README_PERFORMANCE.md` :

```powershell
bun install --frozen-lockfile
bun run db:generate
bun run dev
```

Vérifications :

```powershell
bun run test
bunx tsc --noEmit
bun run build
```

44 tests passent. Vérifications navigateur réalisées avec des données fictives pour une année renseignée, une année vide, les vues mensuelle et cumulée, le tableau des montants et un écran de 390 pixels sans débordement horizontal. Les essais ne modifient aucun document réel.

Aucune nouvelle dépendance, colonne ou migration de base n'est nécessaire. L'historique ne reconstitue pas les dates de paiement : il suit volontairement la règle d'année d'émission confirmée par l'utilisateur.
