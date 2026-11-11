# FacturaPro — corrections de performances

Version préparée le 11 novembre 2026 depuis le commit de production `9195258c04cc2714f9d2def3e033c88eb75c8705`, branche locale `perf/navigation-session`.

Les changements sont locaux. Aucun push, déploiement, changement de paramètres Vercel ou exécution de migration sur Neon n'a été effectué.

## Résultat

- Cache de requêtes en mémoire, isolé par utilisateur, URL, recherche, filtre et page. Données fraîches pendant 30 secondes, suppression après 5 minutes sans utilisation. Revalidation au retour de fenêtre ; annulation des lectures obsolètes. Aucun stockage persistant de données de facturation.
- Retour immédiat aux écrans déjà chargés, avec actualisation en arrière-plan après expiration. Les mutations invalident les listes filtrées, le tableau de bord et les réglages.
- Session limitée à l'identité et aux indicateurs documentaires légers ; logo, CGV et coordonnées bancaires exclus des vérifications ordinaires. Les opérations de génération/archivage PDF et CGV récupèrent explicitement les réglages complets.
- Recherche temporisée de 300 ms, erreurs visibles avec réessai et annulation des anciennes recherches par TanStack Query.
- API de listes bornées à 50 éléments avec indicateur de page suivante, tri stable et validation du numéro de page. Les descriptions longues des lignes ne sont plus envoyées dans les listes. L'édition recharge systématiquement le document complet avant de monter le formulaire.
- Écrans et formulaires chargés à leur utilisation ; les dialogues fermés ne sont plus montés au démarrage. Abonnements Zustand ciblés sur les écrans principaux.
- En-tête `Cache-Control: private, no-store` sur les API. Effacement des caches à la déconnexion ou à l'expiration de session. Une réponse de session terminée après déconnexion ne peut pas restaurer le compte.
- Dérivation des mots de passe asynchrone, compatible avec les hashes existants ; rejet propre des hashes malformés.
- Import PDF différé dans le handler de facture ; migration du fichier `middleware.ts` vers `proxy.ts`, suivant la convention Next.js installée.
- Configuration Vercel préparée pour `fra1`, installation Bun verrouillée et commande de build sans second `prisma generate` inutile.
- Migration préparée pour un index non unique de `User.sessionToken`. L'application reste compatible avant son application.

## Architecture et fichiers

Le monolithe Next.js est conservé. TanStack Query était déjà présent dans les dépendances ; aucun nouveau service de cache n'est nécessaire.

```text
src/
  app/
    page.tsx                          écrans et formulaires différés
    api/{clients,devis,invoices}/      listes paginées
    api/auth/                         connexion et récupération de session
  hooks/use-api-query.ts               requêtes annulables et recherche temporisée
  lib/query-client.ts                  cache, invalidation et effacement
  lib/session.ts                      identité minimale / réglages complets
  lib/store.ts                        authentification, mutations, données de formulaire
  lib/pagination.ts                   validation et bornes de pagination
  lib/auth.ts                         dérivation asynchrone des mots de passe
  components/facturapro/
    form-loader.tsx                   préparation complète avant édition
    list-feedback.tsx                 erreurs, chargement et pagination
    *-list.tsx                        listes observant le cache de requêtes
  proxy.ts                            contrôle préalable du cookie
prisma/
  schema.prisma
  migrations/20261111220000_session_token_index/migration.sql
tests/performance.test.cjs             non-régressions des optimisations
vercel.json                           région et commandes du prochain déploiement
```

Les données des listes ne servent plus de source à l'édition des documents : les détails complets sont chargés avant la saisie. Les sélecteurs de clients des formulaires parcourent toutes les pages de clients à la demande, avec un cache dédié, afin de ne masquer aucun client. Une recherche de clients dans ce sélecteur serait une évolution utile pour plusieurs milliers de clients.

## Lancement sur Windows

Prérequis : Node.js 22, Bun 1.4.4, PostgreSQL accessible et accès réseau pour installer les dépendances et récupérer les polices au build. Aucun secret n'est livré.

Depuis le dossier extrait :

```powershell
bun install --frozen-lockfile
Copy-Item .env.example .env
```

Renseigner `DATABASE_URL` dans `.env` avec la base de développement choisie. Utiliser une base de test pour les créations, paiements et suppressions de validation. Le runtime Neon peut utiliser une connexion poolée ; la chaîne directe est à réserver aux migrations.

```powershell
bun run db:generate
bun run dev
```

Ouvrir `http://localhost:3000` et se connecter au compte de cette base. L'installation ne crée pas de compte et ne copie aucune donnée de production.

Pour une base de développement vide, les migrations versionnées s'appliquent avec `bun run db:migrate:deploy` après configuration de sa connexion. Ne pas utiliser `db:reset` ou `db:push` sur une base de production.

## Vérifications et compilation

```powershell
bun run test
bunx tsc --noEmit
bun run build
```

Le build utilise explicitement Webpack, moteur intégré à Next.js. Le moteur Turbopack a rencontré une erreur de création de processus sous Windows dans cet environnement. Webpack a compilé et prérendu l'application avec succès ; Next.js et Prisma sont fixés aux versions constatées en production : 16.4.2 et 6.19.3. Le verrouillage Bun a aussi été réparé pour les dépendances QR déjà déclarées.

Pour démarrer le résultat autonome en local après le build :

```powershell
Copy-Item -Recurse -Force public .next/standalone/public
Copy-Item -Recurse -Force .next/static .next/standalone/.next/static
$env:PORT = '3000'
$env:HOSTNAME = '127.0.0.1'
bun run start
```

Le serveur autonome charge son environnement au lancement ; fournir `DATABASE_URL` dans l'environnement du processus ou dans le fichier d'environnement attendu dans son dossier d'exécution. Le serveur de développement charge directement le `.env` à la racine du projet.

## Validation effectuée

- TypeScript sans erreur.
- Analyse ESLint ciblée sur les modules modifiés, sans erreur.
- 37 tests réussis, dont règles de facturation et d'immutabilité, archivage PDF, compatibilité des mots de passe, session minimale, préservation des réglages pour l'émission des documents, pagination, déduplication, isolation des comptes, invalidation et annulation après déconnexion.
- Installation verrouillée vérifiée avec `bun install --frozen-lockfile --ignore-scripts`.
- Compilation de production Next.js avec Webpack et prérendu des pages réussis.
- Vérification dans Brave avec application compilée et données entièrement fictives : trois passages Devis → Factures → Tableau de bord, une seule requête par écran pendant la fenêtre de fraîcheur ; passage à la page 2 d'un historique de 51 documents ; édition conservant la description complète, le client et le régime de TVA ; retour à la liste et rechargement de la page active après enregistrement.
- Réponse 401 de l'application compilée vérifiée avec `Cache-Control: private, no-store`.

Le serveur fournissant les données fictives sert uniquement aux vérifications locales et n'est pas inclus dans l'application livrée. Les durées de réponse artificielles de ce test ne mesurent pas Neon ni les performances de production.

## Mise en production ultérieure

Cette étape n'a pas été exécutée. La configuration et la migration sont préparées pour une prochaine demande explicite de déploiement.

1. Confirmer que la connexion de production pointe bien vers le projet Neon de Francfort identifié lors de l'audit. Le lien a été établi par forte concordance de branche, schéma et volumes, sans lecture de la chaîne de connexion.
2. Tester cette version sur un environnement isolé avec une base appropriée. Vérifier création et édition, statuts, numérotation, conversion devis/facture, TVA, remises, PDF, CGV, avoirs et archivage.
3. Sauvegarder la base et appliquer la migration d'index avec la connexion directe autorisée, après vérification de l'historique des migrations. Aucune autre migration ou redimensionnement de compute n'est requis par les optimisations client.
4. Déployer la version revue. `vercel.json` prépare la région de calcul `fra1` et les commandes Bun ; cela ne déplace pas le déploiement déjà en ligne.
5. Rejouer les mesures de l'audit : accueil, devis, factures, parcours après cinq minutes d'inactivité puis parcours chauds. Comparer tailles de session et délais API. Les gains de région et les p95 restent à mesurer.

Le réveil de Neon gratuit après inactivité reste possible. Aucun abonnement n'a été changé et aucune garantie chiffrée de délai en production n'est annoncée.

## Contenu des livrables

- `facturapro-corrige.zip` : sources de l'application, assets publics, migrations, tests, configuration et ce guide. Il exclut les dépendances installées, builds, secrets, bases locales et bibliothèques de skills sans rapport avec l'application.
- `facturapro-corrections.patch` : changements complets par rapport au commit de production audité. Sur une copie propre de ce commit, vérifier avec `git apply --check`, puis appliquer avec `git apply`.
- Aucun push ni PR n'a été créé pour éviter tout déploiement automatique connecté au dépôt.
