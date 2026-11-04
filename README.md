# FacturaPro — Lot A sécurité, 4 novembre 2026

## État et contenu

Correctif préparé **uniquement** pour le dépôt `jimmykartel69/facturapro`, branche `dev`, à partir du commit de référence :

`39c30cd7425e95cff54a39618e8d1b863a969d1d`

Ce paquet est une **solution de repli** : la connexion GitHub ChatGPT a refusé l'écriture avec HTTP 403. Un commit équivalent a été créé dans une copie de travail Vercel isolée (`81fa5c3984a81e3dadaf1741f652b7f818f6fcb7`), mais il **n'est pas présent dans GitHub**.

Il inclut :
- Filtrage des données sensibles dans les réponses API de paramètres.
- Interdiction de modifier/supprimer les factures émises ; transitions de statut autorisées.
- Verrouillage optimiste des modifications pour limiter les conflits concurrents.
- Validation serveur des lignes de devis (désignation, quantité, prix, TVA).
- Vérification de la propriété du client lors d'une modification de devis.
- Blocage de modification/suppression d'un devis déjà converti.
- Ajustement des boutons de l'interface utilisateur.
- Tests automatisés de sécurité et de non-régression.

**Aucune migration Prisma n'est nécessaire** pour ce lot. Il ne modifie pas les données de production.

## Application sur un clone GitHub local

Sur Windows, installer Git, Node.js 22 et Python 3 si nécessaire.

1. Cloner le dépôt, ou ouvrir un clone déjà existant :

```powershell
git clone https://github.com/jimmykartel69/facturapro.git
cd facturapro
git checkout dev
git status
```

2. Extraire ce ZIP dans un dossier à part, par exemple `Téléchargements\FacturaPro_PhaseA_Security_2026-11-04`.

3. Appliquer le correctif **à partir du dossier du dépôt** (adapter le chemin vers le script) :

```powershell
py "C:\Users\<votre_utilisateur>\Downloads\FacturaPro_PhaseA_Security_2026-11-04\apply_phase_a.py" --repo "."
```

Le script vérifie d'abord que la branche est `dev`, que le commit de départ est exactement celui attendu et que le répertoire est propre. Il s'arrête sans écrire si une condition n'est pas remplie.

4. Vérifier et tester les fichiers :

```powershell
npm install
npm test
npm run build
git diff --check
git status
```

5. **Après validation**, publier uniquement sur `dev` :

```powershell
git add package.json src tests
git commit -m "fix(security): guard issued invoices and validate billing access"
git push origin dev
```

Ne pas fusionner vers `main` avant les tests fonctionnels sur la base Neon DEV et une revue du nouveau comportement des factures émises.

## Vérification déjà effectuée

Dans la copie isolée du dépôt sur Vercel :
- `tsc --noEmit` : OK.
- `npm run build` : OK.
- `npm test` : 20 tests réussis, 0 échec.
- Push GitHub `dev` : **non effectué** (pas d'identifiants d'écriture).

## Limites

Ce lot **n'intègre pas encore** d'avoirs, de factures rectificatives, de versionnage PDF, ni de limitation durable des tentatives de connexion. Les factures émises sont verrouillées : les corrections doivent être traitées ultérieurement par le flux d'avoir/rectification qui reste à développer. Il faudra aussi ajouter des tests d'intégration avec une base Neon DEV, car les tests actuels utilisent des doubles de données.
