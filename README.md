# POLLEN

## v5 — version finale, deux fichiers (`v5/pollen-pc.html`, `v5/pollen-mobile.html`)

Brief v5 : repartir de zéro, deux fichiers qui partagent exactement le même code de jeu. Le code est écrit une seule
fois dans `v5/src/jeu.js` ; `node v5/construire.mjs` (ou `npm run build:v5`) génère les deux fichiers en y ajoutant
la qualité (`v5/src/config-pc.js` ou `config-mobile.js`) et les contrôles (`controles-pc.js` ou `controles-mobile.js`).
Les contrôles remplissent un objet d'entrée `E` que le jeu lit ; ils ne touchent à rien d'autre. Ne modifie jamais
les fichiers générés à la main.

| | PC | Mobile |
|---|---|---|
| Ombres | 2048 | 1024 |
| Brins d'herbe | 200 000 | 60 000 |
| Post-traitement | bloom, profondeur de champ, aberration, vignette, étalonnage | bloom, vignette |
| Distance d'affichage | 150 m | 70 m |
| Résolution | jusqu'à ×2 | jusqu'à ×1,5, baisse seule sous 50 img/s |

**Étape 1 (le rendu)** faite : vallée de 18 907 tuiles hexagonales, moitié fanée, moitié fleurie ; trèfle, pissenlit et
colza avec cinq variantes de forme chacun, étamines et pollen, nervures, teinte ±12 %, taille ±20 %, inclinaison 0-10°,
quelques fleurs cassées ; herbe sèche ou verte selon la tuile ; vent en rafales ; abeilles ; soleil rasant à 25°.

**Étape 2 (le joueur)** faite : première personne, œil à 1,65 m. Deux mains en gants de cuir fauve (paume bombée,
doigts en trois segments aux articulations renflées, longueurs inégales, coutures, bouts plus clairs, poignet de toile,
manche de combinaison) ; la droite tient la tige de coton, la gauche entre plus bas et plus en retrait. Respiration
à l'arrêt, balancier à contretemps en marchant, léger retard sur le regard. Marche 4 m/s, course 6,8 m/s, accélération
douce, relief suivi, pente maximale ~40° (le relief actuel ne dépasse pas ~26°), bord de carte, 180 rochers avec
collision. L'herbe et les fleurs s'écartent sous les pas. Pas qui craquent sur le sec et s'étouffent sur le fleuri.

| | PC | Mobile |
|---|---|---|
| Marcher | ZQSD (ou WASD, touches physiques), flèches | pouce gauche : joystick qui naît où on pose le pouce, zone morte 10 %, réponse progressive |
| Courir | Maj | joystick poussé à fond |
| Regarder | souris, pointeur verrouillé au clic (glisser si refusé) | pouce droit glissé, en même temps que le gauche |
| Outil | molette, 1 à 6 | (roue au pouce : étape 3) |
| Carte, interagir | M, E | (boutons : étape 3) |
| Orientation | — | paysage imposé : plein écran + verrouillage tenté ; sinon « Tourne ton téléphone » et pause |

Options d'URL pour une machine qui peine : `?herbe=30000`, `?rayon=30` (rayon des fleurs), `?msaa=2`, `?debug`.
Test : `npm run smoke:v5`.


## v4 — pollinisation et automatisation à la première personne (`v4/index.html`)

Version courante. Un seul fichier HTML. Étapes 1 à 4 du brief v4 :
1. **La grille** : 7 765 tuiles hexagonales de 2 m ; fanées grises ou fleuries en couleur, cinq espèces
   (lavande, colza, tournesol, trèfle, bruyère), fleurs instanciées dans un rayon de 42 m, aplats colorés au-delà.
   `?scene=grille` : caméra libre, moitié fleurie, moitié fanée.
2. **Première personne** : mains gantées et outil, joystick gauche et glissement du pouce droit, clavier-souris.
3. **Pollinisation** : clic maintenu (3 s avec la tige de coton), jauge circulaire, floraison en vague, abeilles, réservoir.
4. **Boucle** : ruchettes à 40 crédits posées par le joueur, qui renvoient seules le pollen vers la base ; comptoir de
   l'office (vider, vendre) ; hangar à outils (pinceau à 300 crédits, les quatre suivants visibles mais verrouillés).

Options : `?neuf` (nouvelle partie), `?debug`, `?rayon=20` (moins de fleurs). Test : `npm run smoke:v4`.
Reste : étape 5 (miellerie, chaîne de transformation, électricité, carte), étape 6 (construction, convoyeurs, ruches autonomes).


## v3 — graphismes organiques et jouabilité (`v3/index.html`)

Un seul fichier HTML. Étapes 1 à 4 du brief v3 faites :
- **Arbres organiques** : tronc en tube courbe évasé à la base, trois niveaux de branches, feuillage en plans croisés
  découpés en transparence (40 à 80 par arbre), chaque arbre différent. `?scene=arbre` montre un arbre seul.
- **Aucune BoxGeometry** : planches et caisses biseautées, formes tournées, capsules, rochers arrondis.
- **Terrain** en relief fractal, couleur selon la pente et l'altitude ; le sentier se creuse là où l'on passe.
- **Guidage sans texte** : une fleur qui luit, une icône de main, un marqueur au bord de l'écran.
- **Début lent** : tige de coton à une dose, fleurs sources dorées, panier de 6, marché à 50 m, endurance de 12 s,
  fleurs qui disparaissent en 90 s, fruits qui s'abîment après 2 min (4 crédits frais, 2 abîmés).
- **Marché** (charrette, auvent rayé, cageots, marchand, rai de lumière) et **établi** avec le pinceau à 250 crédits
  (8 fleurs par charge, panier de 20).

Test : `npm run smoke:v3`. Reste : apiculture (étape 5), parcelles, outils, saisons (étape 6).


## v2 — graphismes et jouabilité (`v2/index.html`)

Un seul fichier HTML autonome (Three.js chargé depuis un CDN). Ouvre-le et joue : le personnage est debout
dans le verger, on marche tout de suite, sans menu.

- **Rendu** : tone mapping ACES, ombres douces, ciel en dégradé, nuages, brume de distance, cycle jour/nuit
  de 20 minutes, 50 000 brins d'herbe instanciés qui ondulent au vent, textures générées en code.
- **Personnage** : agriculteur-apiculteur en primitives (chapeau de paille, salopette, bottes, voilette),
  vu de dos, marche, course, geste de pollinisation et de secousse.
- **Commandes** : ZQSD/WASD + souris (pointeur verrouillé au clic), Espace ou clic pour agir, E pour
  vendre ou acheter. Sur téléphone : deux joysticks qui naissent sous les pouces, bouton Agir, bouton
  contextuel, paysage obligatoire.
- **Boucle** : polliniser, laisser pousser, secouer, ramasser, vendre au marché, acheter le pinceau
  (250 crédits) et la parcelle voisine (150 crédits : la clôture tombe, la brume se lève).
- **Sauvegarde** automatique toutes les 30 secondes (localStorage). `?neuf` repart de zéro.
- Options : `?debug` (images/s), `?herbe=20000` (densité de l'herbe), `?vitesse=10`.

Test : `npm run smoke:v2` (Chromium, clavier, souris et deux pouces simultanés).
Pas encore fait (étape 5 du brief) : les 24 parcelles, les ruches, les six outils, les saisons, les succès.

---

## v1 — prototype du jalon 1

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
