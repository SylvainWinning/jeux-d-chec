# Chess Starter — Fix plateau/pions (v3)

- **Pré-rendu des 64 cases** dans le HTML : le damier est visible même si JS plante, puis le script remplace proprement au chargement.
- **Script sans `type="module"` + `defer`** pour compat maximale (fichiers locaux, GitHub Pages, Safari).
- **Pions** : joueur **rose**, adversaire **blanc**. Autres pièces lisibles.
- Thème neutre, clair/sombre auto. Règles classiques, IA simple, PGN, annuler/rétablir.

> Si vous avez des données locales d’un ancien essai, un **hard refresh** ou `localStorage.removeItem('chess-starter')` peut éviter les états bizarres.
