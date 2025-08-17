# Chess Starter — Jeu d’échecs pour débutants (v2)

Version corrigée avec :
- **Plateau toujours visible** (fallback sans OKLCH + contraste renforcé)
- **Pions du joueur roses**, pions de l’adversaire **blancs** (quel que soit le camp choisi)
- **Thème neutre** (pas de marron), clair/sombre automatiques
- Règles complètes, IA simple, annuler/rétablir, PGN, sauvegarde locale, accessibilité

## Publier sur GitHub Pages
1. Créez un dépôt public (ex. `chess-starter`).
2. Uploadez tous les fichiers à la **racine**.
3. Settings → Pages → “Deploy from a branch” → `main` /root.
4. Ouvrez l’URL fournie par GitHub Pages.

## Personnaliser
- Couleurs principales et du plateau : variables CSS en tête de `styles.css`.
- La coloration rose/blanc ne s’applique qu’aux **pions**. Le reste des pièces garde une teinte claire pour rester lisible.
