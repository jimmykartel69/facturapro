# FacturaPro — Phase B1 : avoirs intégraux et conservation PDF

Développement isolé sur la branche feat/phase-b-avoirs-archives, dérivée de dev.
Ne jamais fusionner directement dans main.
La migration doit être appliquée sur Neon DEV avant de déployer ce lot.

## Fonctions réalisées

- Conservation du PDF exact de la facture à son émission (brouillon vers émise ou payée), avec SHA256.
- Instantané de l'entreprise, du client, de la facture et des montants.
- Avoir intégral avec motif obligatoire et numérotation indépendante AV-0001.
- Contrôle des doubles émissions dans une transaction sérialisée.
- PDF d'avoir avec référence de facture initiale, HT, TVA et TTC.
- Interface de création et téléchargement sur le détail de la facture.
- Verrouillage du statut après émission d'un avoir intégral.
- Avertissement explicite pour les anciennes factures sans archive figée.

Ce lot ne réalise aucun remboursement bancaire. Les avoirs partiels et les rectifications
sont prévus pour une autre livraison.

## Procédure de migration : EXCLUSIVEMENT DEV

Neon Project : bold-breeze-51776054
Neon Branch : facturapro-dev-2026-11
Ne pas utiliser la branche Neon main.

1. Vérifier la sauvegarde Neon avant migration.
2. Ouvrir Neon DEV et copier sa propre chaîne de connexion.
3. Dans un clone local de la branche de fonctionnalité, configurer DATABASE_URL
   uniquement sur Neon DEV (ne jamais partager l'URL ou son mot de passe).
4. Lancer npm install
5. Lancer npx prisma migrate status
6. Lancer npx prisma migrate deploy
7. Lancer npx prisma migrate status
8. Lancer npm test et npm run build

Migration versionnée : prisma/migrations/20261104233000_phase_b_credit_archive/migration.sql

Attention : appliquer manuellement le SQL via Neon SQL Editor puis exécuter
Prisma migrate deploy désynchronise potentiellement son historique _prisma_migrations.

## Scénarios de validation

- Créer un devis et une facture brouillon de test sur DEV.
- Émettre la facture ; contrôler le PDF archivé et son empreinte.
- Modifier la fiche client ; l'ancien PDF doit rester identique.
- Créer un avoir intégral, motif de 10 à 200 caractères.
- Vérifier le numéro, le PDF, la référence à la facture initiale et la TVA.
- Refuser la création d'un second avoir intégral sur la même facture.
- Interdire les modifications de facture émise et les accès d'autres utilisateurs.
- Vérifier les anciennes factures sans archive : avertissement obligatoire.

## Limites

- Les factures émises avant installation ne peuvent pas être certifiées rétroactivement.
- Les avoirs ne sont pas encore déduits du tableau de bord.
- Pas de remboursement bancaire automatique.
- Aucun test avec une base Neon connectée n'a été effectué dans cet environnement.
- L'émission d'une facture ne correspond pas à un envoi d'e-mail automatique.
- Validation fiscale/comptable du PDF à effectuer avant usage réel.

## Contrôles

- Prisma schema validation : OK avec URL locale fictive sans connexion réseau.
- npm test : 29/29.
- Next.js build : OK.
- Aucune migration exécutée contre Neon.
