# Chess Starter — Jeu d’échecs pour débutants

Une petite appli web (HTML/CSS/JS) moderne, responsive et accessible pour jouer aux échecs **dans votre navigateur**. Idéale pour un dépôt GitHub et une publication via **GitHub Pages**.

## Fonctionnalités
- Humain vs humain **ou** contre un **ordinateur (niveau facile)**
- Vérification des **coups légaux**, gestion de l’**échec**, **échec et mat** et **pat**
- Spéciaux inclus : **roque**, **prise en passant**, **promotion** (auto-dame par défaut)
- **Historique** des coups + **export PGN**
- **Annuler / Rétablir** et sauvegarde automatique (localStorage)
- **Design 2025** mobile-first (tokens, OKLCH, glassmorphism léger), respect de `prefers-reduced-motion`
- **Accessible** (ARIA, clavier: Entrée/Espace pour jouer)

## Démo locale
Ouvrez simplement `index.html` dans votre navigateur.

## Publier sur GitHub Pages
1. Créez un dépôt (public) sur GitHub, par exemple `chess-starter`.
2. Glissez-déposez ces fichiers dans le dépôt (ou `git add` / `commit` / `push`).
3. Dans **Settings → Pages** :
   - **Source**: *Deploy from a branch*
   - **Branch**: `main` (ou `master`) et le dossier `/root`.
4. L’URL sera du type `https://<votre-utilisateur>.github.io/chess-starter/`.

> Astuce: mettez un tag de version (ex: `v1.0.0`) quand vous êtes satisfait.

## Personnaliser
- Couleurs: modifiez les variables CSS dans `styles.css` (`:root`).
- Difficulté CPU: la fonction `chooseCpuMove` est **gloutonne 1 coup**. Pour un bot plus fort, ajoutez une recherche Minimax/Negamax avec profondeur >1.
- Orientation par défaut: changez la variable `orientation` côté JS.
- Promotion: par défaut en **dame**. Vous pouvez implémenter un mini-menu pour choisir la pièce.

## Licence
MIT © Vous
