## Version courante : v14 (`v14/index.html`)

La v10, avec : une planète entièrement couverte de fleurs, sans mer ni vide (654 850 parcelles de 2 m en 1 189 secteurs
en bandes, ouverts du plus proche au plus lointain de la base) ; les bâtiments rapprochés ; des outils et des véhicules
redessinés et animés (poils qui s'écrasent, réservoir qui se remplit, hélice, gestes variés ; gyrophare, braquage,
roulis, suspension, poussière). Test : `npm run smoke:v14`.
Plus de secteurs à débloquer : toute la planète est ouverte, le pourcentage est celui de la planète entière. Les fleurs
sont rose framboise.
Véhicules remodelés (cabines vitrées, pneus à crampons, hublots de pollen, rabatteur), esplanade bordée sans parcelles
qui débordent, et un quai de déchargement au sud de la base : on s'y arrête au volant, le pollen est aspiré et vendu.
Puis : sauvegarde automatique qui survit à la fermeture de la page (copie locale + copie en ligne privée sur claude.ai),
un seul bâtiment (hall vitré de 41 × 18 m : comptoir, station, atelier, laboratoire, garage et accueil), plus de
système d'eau, véhicules sans pièces qui flottent (essieux, berceaux, bras, pattes), rampe pleine et escalier qui
montent vraiment en pente.
Puis : l'élan (parcelles enchaînées ×1 à ×3), fleurs dorées, bourrasques de pollen, niveaux à prime, trois contrats
toujours à l'écran, prochain achat, gains des ruches pendant l'absence.
Puis : moissonneuse géante et aéroglisseur à rampe, vue extérieure au volant (C : cabine), mode Supprimer du marteau
(X), ruches et pollinisateur automatique reliés par convoyeur à un réceptionnaire qui vend seul.
Puis : les véhicules pollinisent à pleine vitesse, V fait venir son véhicule, ruches et pollinisateurs vendent seuls
sans convoyeur ni courant.
Puis : repère de la base sur la boussole, camion conduisible, esplanade de 50 m et grand garage, toiture solaire,
robots ouvriers, pilotes automatiques, recherche sans fin, saisons (la 30e sauve la planète).

## Version courante : v10 (`v10/index.html`)

Retour à la v10 à la demande du fondateur : parcelles de 2 m, planète de 500 m, six secteurs, intérieurs,
concessionnaire, mode construction. Les v11 à v13 restent dans le dépôt, mises de côté. Test : `npm run smoke:v10`.
Aucune parcelle n'est fleurie au départ. Les six secteurs sont de longues bandes parallèles (24 à 34 m de large, 120 à
270 m de long) qui partent du bord sud de la base, la première au milieu, les suivantes à droite et à gauche.

# POLLEN

## v13 — le jeu complet, sur des parcelles de 2 m (`v13/index.html`)

Version courante, à la demande du fondateur : « fais le jeu avec des parcelles plus petites, remets ce que tu avais fait
avant ». C'est la v11 entière (huit outils, quatorze machines en kg/s et kW, interface à cinq éléments et étiquettes,
paliers, construction, véhicules, carte, sauvegarde), sur des parcelles hexagonales de 2 m au lieu de 8 m.
Code dans `v13/src`, `node v13/construire.mjs`. Test : `npm run smoke:v13` (30 vérifications, toutes passent).

- 30 259 parcelles, douze secteurs en disques (38 à 78 m de rayon) disposés en spirale à 130–925 m de la base,
  cernés d'un liseré ; la friche entre eux. Prix de 5 à 230 cr la parcelle.
- Fleurs en touffes de quatre, une quinzaine de touffes par parcelle, dessinées jusqu'à 28 m (22 m sur téléphone).
- Machines et parcelles partagent la même grille de 2 m.
- Sauvegarde au format 8 ; une partie de la v11 n'apporte que l'argent, les outils et le temps.

## v12 — les briques, une par une (`v12/index.html`)

Nouveau départ, sur la méthode du document « les briques » : huit prompts courts, envoyés un par un, la suivante
seulement quand la précédente tourne. Code dans `v12/src`, `node v12/construire.mjs`. Test : `npm run smoke:v12`.

- **Brique 1, le socle (faite)** : planète de 500 m pavée de 40 962 tuiles (douze pentagones), relief de ±1,5 m,
  gravité vers le centre, vue à 1,7 m et 70°, caméra orientée par quaternion et lissée, ombre du joueur sans modèle,
  ciel noir étoilé à halo bleuté, soleil à 2,5 qui tourne en 16 minutes, hémisphère à 0,5, ACES 1,1, sol beige sec à
  grain peint et carte de normales, rainure fine entre les tuiles. La résolution baisse d'elle-même sous 50 img/s.

## v11 — la planète-prairie (`v11/index.html`)

Version courante. Un seul fichier, ordinateur et téléphone. Code dans `v11/src`, assemblé par `node v11/construire.mjs`.
Lancer : ouvrir `v11/index.html`. Test : `npm run smoke:v11` (30 vérifications, toutes passent).

- **La planète** : une sphère de 500 m couverte de fleurs d'un pôle à l'autre, ni mer ni montagne (relief de ±1,5 m).
  40 891 tuiles d'environ 8 m, douze secteurs (un par sommet de l'icosaèdre), liseré lumineux entre eux. Ciel noir
  étoilé, fin halo bleuté à l'horizon, soleil qui tourne en 16 minutes. Les fleurs sont dessinées jusqu'à 46 m (30 m
  sur téléphone) ; au-delà, chaque tuile est un aplat coloré.
- **Les outils** : pinceau (1 tuile, 2,5 s, 12 kg), brosse 400, brosse large 2 500, extra-large 9 000, souffleur
  30 000, souffleur double 95 000, pulvérisateur 280 000, diffuseur 800 000 (20 tuiles, 0,15 s, 5 000 kg) ; plus le
  collecteur à nectar 1 500, le râteau 300, l'enfumoir 600 et l'outil de construction 3 000.
- **L'interface** : boussole et distance vers l'objectif, anneau et pourcentage du secteur, pastille orange de l'outil
  et charge en gros chiffres, ronds des outils, argent en orange. Une étiquette flottante près de l'objet visé.
  Paliers à 25, 50, 75 et 100 % : vague de floraison, nuée, le chiffre pulse, un son plein. Le son monte d'un
  demi-ton par tuile enchaînée jusqu'à l'octave, et le compteur de charge pulse de plus en plus vite.
- **Les machines** circulent en lots de 10 kg, débits en kg/s, énergie en kW, trois niveaux qui doublent le débit :
  collecteur 50 kg/s, extracteur 20, maturateur 12, raffineur de cire 8, couveuse 5, germoir 3, empoteuse 30,
  trieuse 60, compacteur 40, convoyeur 25 ; poste solaire 20 kW, panneau suiveur 60 kW, batterie 400 kWh. Un tapis
  qui aboutit au collecteur de la base vend. Jusqu'à cinquante ruches autonomes.
- **Sauvegarde** locale au format 7. Une partie de la v10 n'apporte que l'argent, les outils et le temps de jeu.

Rythme des déblocages, **estimé au calcul** (pas encore mesuré sur un joueur) :

| Minute | Ce qui s'ouvre |
| --- | --- |
| 4 | Brosse à pollen (400) |
| 7 | Râteau à graines (300) |
| 10 | Portée, à l'atelier (500) |
| 14 | Réservoir +25 %, à l'atelier (800) |
| 19 | Collecteur à nectar (1 500) |
| 24 | Brosse large (2 500) |
| 30 | Outil de construction (3 000), palier 25 % |
| 33 | Ruche simple (2 000) |
| 36 | Extracteur (1 500), palier 50 % |
| 40 | Poste solaire (2 000) |
| 45 | Brosse extra-large (9 000) |
| 48 | Secteur 2 |

Ce qui reste simplifié : la cadence d'images n'est pas mesurée (pas de carte graphique ici : 2,7 millions de triangles
par image sur ordinateur, 0,5 million sur téléphone) ; le convoyeur courbe ne diffère du droit que par le modèle ;
les lignes électriques ne sont pas dessinées.

## v10 — la planète (`v10/index.html`)

Version courante. Un seul fichier, ordinateur et téléphone. Code dans `v10/src`, assemblé par `node v10/construire.mjs`.
Lancer : ouvrir `v10/index.html` dans un navigateur (il charge Three.js depuis jsDelivr). Test : `npm run smoke:v10`.

- **La planète** : une sphère de 500 m de rayon (3,1 km de tour). La gravité tire vers le centre, la caméra se redresse
  à chaque image. Tuiles d'un icosaèdre subdivisé (hexagones et douze pentagones). Relief par bruit sur le rayon : mer,
  continents, collines, montagnes, calottes blanches. Nuages qui dérivent, ciel étoilé la nuit, soleil qui tourne en
  16 minutes. Six secteurs en disques cernés d'un liseré lumineux ; aucun bord de carte.
- **La carte** (touche M ou bouton) : le globe, qu'on fait tourner. Secteurs colorés selon leur avancement, machines en
  orange, points de voyage rapide en cyan : on amène un point au centre et on appuie sur action.
- **Quatre bâtiments où l'on entre** : station (écran des secteurs, tableau de supervision, huit médaillons, lit pour
  passer la nuit), comptoir (dix outils sur l'établi, borne de vente, cageots), atelier (cinq améliorations),
  laboratoire (tableau des six variétés).
- **Le concessionnaire** : chariot pousseur 900, quad de service 4 000, pollinisatrice 18 000, remorque-citerne 35 000,
  transporteur lourd 90 000. Quatre améliorations à trois niveaux, visibles sur le véhicule : moteur, châssis, pneus,
  phares. À l'achat la porte sectionnelle s'ouvre, le véhicule sort se garer, on est au volant.
- **Le mode construction** (touche B, il faut l'outil de construction du comptoir) : cinq catégories, 29 pièces.
  Chiffres 1 à 5 : catégorie ; E : pièce suivante ; molette ou R : tourner ; G : verrouiller la direction ; clic : poser,
  ou démonter une pièce posée (remboursée entièrement). Fantôme vert ou rouge, avec la raison du refus.
  Électricité : panneaux, batteries et poteaux à moins de 10 m forment un réseau ; sans courant une machine tourne au quart.
- **Sauvegarde** locale, format 6, trois emplacements, export et import `.json`. Une partie de la v9 n'apporte que
  l'argent, les outils et le temps de jeu.
- `?mode=pc` ou `?mode=mobile`, `?debug`, `?neuf`, `?ao` / `?ao=0`.

Ce qui reste simplifié : le convoyeur courbe et le fusionneur ne diffèrent du droit que par le modèle et la vitesse ;
le transporteur lourd contourne les obstacles simplement ; les lignes électriques ne sont pas dessinées.

## v9 — la station agricole (`v9/index.html`)

Un seul fichier, ordinateur et téléphone (paysage forcé). Code dans `v9/src`, assemblé par `node v9/construire.mjs`.

- **L'Azurelle** : la seule fleur de la vallée, bleue (pétales #3B6FD4, cœur #F5C518, tige #4A7A3C, ±8 % de luminosité).
  Six variétés, une par secteur : commune (5 pétales, 25 cm, 3 cr la tuile), des champs (6, 35 cm, 7), double (10, 40 cm, 15),
  royale (grande corolle, 32), de nuit (fermée jusqu'au pollen, 70), mère (très grande, 150). Un secteur s'ouvre quand le
  précédent est à 100 % : vague de floraison, nuée d'abeilles, pourcentage qui pulse en vert.
- **Six ressources** dans un sac de 12 kg : pollen (polliniser), nectar (collecteur à main, sur une tuile en fleurs),
  graines (râteau, sur une tuile fanée : elle devient nue et devra être replantée), miel et cire (enfumoir, aux ruches),
  Azurelles mères (isolées, luisantes, une colonne de lumière les signale). Sac plein : E l'emballe en colis posé au sol ;
  on le porte au collecteur, ou au bout d'un tapis.
- **Actions avec durée** (maintien, jauge au-dessus de la cible, relâcher annule) ; **achats immédiats**.
- **Machines** (14 pièces) : une par ressource (tamiseur, presse, distillateur, extracteur, maturateur, germoir, fondoir,
  alambic), conditionneuse, borne de pollinisation, convoyeurs, quai, panneau solaire. Durées visibles, réduites par
  amélioration (E). Désordre et accidents : panneaux encrassés à brosser, pannes à réparer, essaim qui s'échappe,
  colis qui dévale une pente.
- **Rendu** : occlusion ambiante GTAO (coupée sur téléphone, `?ao` pour l'activer), ombres de contact, contre-jour rasant,
  reflets du ciel sur le métal et les écrans, panneaux rainurés à liseré orange sur toute surface blanche de plus de 50 cm,
  chanfreins partout, poussière de pollen.
- **Son** : chaque tuile enchaînée monte d'un demi-ton ; après deux secondes d'arrêt, on repart de la note de base.
- **Interface** : cinq éléments (boussole, pourcentage du secteur, outil et charge, ronds d'outils, argent).
- **Collisions (brief v10, étape 1)** : boîtes orientées un peu plus grandes que les modèles ; ni le joueur ni le
  véhicule ne traversent bâtiments, machines, convoyeurs ou véhicule. Le véhicule s'arrête net au contact (secousse, son
  sourd), ralentit dans la zone d'approche de 2 m marquée d'un liseré orange autour de chaque machine, et se décharge
  garé sur le repère derrière le collecteur (vert quand il est bien placé). Bâtiments fermés : portes sans poignée,
  terminal mural dehors (station : avancement du secteur ; garage : achat). Palette v10 : blanc #EDEAE4, charbon
  #2E343A, orange #F08A24, cyan #4FD6E3.
- **Sauvegarde locale** (localStorage, rien ne sort de la machine) : toutes les 30 s, juste après un achat, une vente,
  une machine posée ou un secteur fini, et quand l'onglet passe en arrière-plan ou se ferme. Trois emplacements
  (icône discrète sous le pourcentage) avec temps de jeu, argent et secteur ; suppression avec confirmation ;
  copie de secours de la sauvegarde précédente ; anciens formats convertis ; sauvegarde illisible : copie de secours,
  sinon partie neuve avec un message. Tuiles en octets (environ 6 Ko la partie). Exporter / Importer en fichier .json.
- `?mode=pc` ou `?mode=mobile`, `?debug`, `?neuf`, `?ao` / `?ao=0`. Tests : `npm run smoke:v9` (avec `tests/v9-sauvegarde.mjs`).

## v8 — vrais modèles 3D et boucle complète (`v8/index.html`)

Mise de côté par la v9. Même scène que la v7, agrandie à 80 m, mais les objets viennent de fichiers : fleur, marché, atelier,
tige de coton et pinceau en GLB, ciel en HDRI (voir `v8/LISEZMOI.md` pour les noms et le lancement par un serveur).
Écran de chargement avec barre ; un fichier absent est remplacé par une forme de substitution et signalé.

- Polliniser une tuile met une fleur au panier (14 avec la tige de coton, 3 s par tuile ; 28 avec le pinceau, 1 s).
- Panier plein : 20 % plus lent, plus de pollinisation, un marqueur montre le marché.
- Marché (à moins de 3 m) : « Vendre 14 fleurs — 42 crédits » ; les fleurs volent vers l'étal, les pièces tintent,
  le gain s'affiche, l'étal se remplit.
- Atelier : le pinceau est posé sur l'établi, gris tant qu'il est trop cher ; panneau nom, prix, effet ; à l'achat
  (250 crédits) il quitte l'établi et passe en main.
- Interface : crédits en haut à droite, outil et panier en bas, invite d'action près des bâtiments.

Test : `npm run smoke:v8` (33 vérifications : les six conditions du brief sur PC et téléphone avec des fichiers de test,
puis sans aucun fichier).

## v7 — une scène qui marche et qui est belle (`v7/index.html`)

Version courante. Un seul fichier HTML, le même pour l'ordinateur et le téléphone : l'appareil est détecté au chargement
(`?mode=pc` ou `?mode=mobile` pour forcer, `?debug` pour les compteurs). Rien d'autre que ce que le brief liste.

- **Le champ** : 60 m de côté, relief léger, 973 tuiles hexagonales de 2 m, une touffe de lavande par tuile. Moitié fanée,
  moitié fleurie, frontière irrégulière. Au-delà du bord, le sol se perd dans la brume.
- **La lavande** : 30 à 60 brins par touffe (43 355 au total), cinq formes d'épi de 21 à 30 fleurs. Tige à section carrée
  courbée, paires de feuilles et coussin gris-vert au pied, corolles à quatre lobes en `LatheGeometry`, étamines et
  sphère de pollen. Taille ±20 %, inclinaison 0-10°, teinte ±12 %, deux ou trois brins cassés, fanés ou en bouton par
  touffe. Tout en `InstancedMesh` ; courbure, vent et floraison dans le shader. Trois niveaux de détail (pleine
  définition près du joueur, brins simplifiés, cartes au loin qui s'élargissent avec la distance).
- **Les deux états** : fanée beige-gris, tiges affaissées, presque immobile ; fleurie violette, feuillage gris-vert,
  tiges dressées, vagues de vent, trois ou quatre abeilles.
- **Lumière** : soleil orangé à 25°, intensité 2,5, ombres douces (carte d'ombres près du joueur, ombres calculées au
  loin), hémisphère 0,6, ACES 1,1, ciel en dégradé de trois couleurs, brume `FogExp2`, grains de pollen dorés.
  Ordinateur : bloom léger et vignette. Téléphone : bloom seul.
- **Les mains** : gants de cuir fauve, la droite tient la tige de coton, la gauche plus basse et en retrait ; respiration,
  balancier en marchant, tamponnage pendant la pollinisation.
- **Jouer** : viser une touffe fanée (elle se surligne), maintenir l'action deux secondes (jauge en anneau). Elle se
  redresse et s'ouvre en vague en 0,4 s, passe au violet, trois abeilles arrivent, un carillon court. Relâcher annule.

| | Ordinateur | Téléphone |
|---|---|---|
| Marcher | ZQSD ou WASD (touches physiques), flèches | pouce gauche : joystick qui naît sous le pouce |
| Regarder | souris (pointeur verrouillé au premier clic ; glisser si la page le refuse) | pouce droit, en même temps que le gauche |
| Polliniser | clic gauche maintenu (ou espace) | bouton rond maintenu (glisser dessus ajuste la visée) |
| Paysage | — | plein écran et verrouillage tentés ; sinon la scène tourne d'un quart de tour |

Qualité : baisse automatique sous 52 img/s (résolution, puis rayons de détail, puis bloom). Compteurs mesurés dans le
navigateur de test : environ 4 millions de triangles par image sur ordinateur (ombres comprises), 1 million sur
téléphone, une cinquantaine d'appels de dessin. La fluidité réelle n'a pas pu être mesurée (pas de carte graphique ici).

Test : `npm run smoke:v7` (43 vérifications : les cinq conditions du brief, sur ordinateur et téléphone).

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
