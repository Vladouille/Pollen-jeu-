# POLLEN — prototype du jalon 1

> Un continent à polliniser. Une tige de coton pour commencer.

Prototype jouable du **jalon 1 (« Le noyau »)** du brief : une parcelle, cent fleurs, la tige de coton,
la pollinisation, la pousse, la récolte et la vente. Solo, cubes gris, aucun art.

Son seul but : répondre à la question du brief, **« est-ce agréable à jouer dix minutes ? »**
Si oui, on passe au vrai moteur (Unity 6 ou Godot 4) pour le jalon 2. Sinon, on s'arrête là.

Il tourne dans le navigateur (Three.js, inclus dans `vendor/`) : aucune installation, aucune étape de build.

## Jouer

```bash
python3 -m http.server 8000
```

puis ouvre http://localhost:8000 dans Chrome, Edge ou Firefox, et clique sur **Jouer**.

| Touche | Action |
|---|---|
| Z Q S D (ou W A S D), flèches | se déplacer |
| Maj | courir |
| Souris | regarder |
| Clic maintenu sur une fleur ouverte (rose) | prendre son pollen : la tige est chargée pour 2 fleurs |
| Clic sur une autre fleur ouverte | la polliniser |
| E (ou clic) sur un arbre qui porte des pommes rouges | le secouer |
| Marcher sur les pommes au sol | les ramasser (12 places dans les poches) |
| E au point de collecte | vendre (3 crédits la pomme) |
| Échap | pause |

Options d'URL : `?debug` affiche images/s, temps et statistiques ; `?vitesse=10` accélère la simulation
pour tester l'équilibrage.

## Ce que fait le jalon 1

- **Polliniser** : clic maintenu 0,5 s sur une fleur ouverte pour charger la tige (2 doses, une par bout),
  puis un clic par fleur. On ne pollinise jamais une fleur avec son propre pollen.
- **Le temps est la seule contrainte** : chaque fleur a une fenêtre de floraison de 65 à 95 s. Une fleur qui
  va faner tremble ; une fleur non pollinisée fane, puis redevient un bouton (aucune perte définitive).
- **Pousse** : la pomme grossit et passe du vert au rouge en 110 s. Pendant ce temps, on pollinise ailleurs.
- **Récolte** : on secoue l'arbre, les pommes tombent, roulent, et se ramassent en marchant dessus.
- **Vente** : au point de collecte, à droite du verger.
- **Seule aide** : la première fleur ouverte est entourée d'un anneau jaune jusqu'au premier geste.

## Équilibrage

Toutes les valeurs sont dans [`src/config.js`](src/config.js) : durées, prix, portée, poches, vitesse.
Le joueur simulé des tests fait sa première vente **entre 122 et 138 s** sur 5 parties : la règle du brief
« première vente dans les trois premières minutes » est tenue.

## Structure

| Fichier | Rôle |
|---|---|
| `src/sim.js` | toute la logique du jeu, sans rendu, testable sous Node |
| `src/main.js` | rendu Three.js, contrôles, interface, effets |
| `src/audio.js` | sons synthétisés (aucun fichier audio) |
| `src/config.js` | valeurs d'équilibrage |
| `tests/sim.test.mjs` | tests de la logique, dont la règle des 3 minutes |
| `tests/bot.mjs` | joueur simulé qui marche à vitesse réelle |
| `tests/smoke.mjs` | test dans un vrai navigateur (souris, clavier, captures d'écran) |

Les fleurs ne sont pas des objets : ce sont des index dans des tableaux typés, et elles sont dessinées
en un seul appel (rendu instancié). C'est la structure que demande le jalon 2 pour des dizaines de milliers
de fleurs.

## Tests

```bash
npm test          # logique (Node 20+)
npm run smoke     # navigateur ; nécessite Playwright et Chromium
```

## Ce qui reste cassé ou volontairement absent

- Pas de sauvegarde (jalon 3), pas d'amélioration ni d'établi (jalon 3), pas de coop (jalon 4).
- Les fruits mûrs ne pourrissent pas : ils attendent sur l'arbre.
- Les textes d'action sous le viseur (« Clic : polliniser ») sont une entorse au « aucun tutoriel écrit »
  du brief : ils servent au test du prototype et se retirent en une ligne dans `updateUI`.
