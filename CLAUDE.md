# POLLEN — brief de développement

Ce fichier reprend le brief du projet (document « Prompt de développement — POLLEN (jeu Steam) »).
Lis-le entièrement avant de coder. Réponds en français, phrases courtes.

## État du projet

- **Jalon 1 (le noyau) : prototype web fait** (Three.js, `src/`). Décision prise avec le fondateur : prototyper
  la boucle dans le navigateur, où elle peut être lancée et testée, avant de choisir Unity ou Godot.
- **v2 (brief « graphismes et jouabilité ») : `v2/index.html`**, un seul fichier, troisième personne, tactile.
  Étapes 1 à 4 du brief faites (décor, personnage, commandes, boucle). Reste l'étape 5 : 24 parcelles, ruches,
  six outils, saisons, succès. Test : `npm run smoke:v2`.
- **Version courante : v14** (`v14/index.html`) = la v10 avec les demandes du fondateur : « garde tout, rapproche les
  bâtiments, une planète recouverte de fleurs à polliniser en entier sans espace vide, des animations, un meilleur
  design des outils et des camions ». Il demandait aussi de s'inspirer de Moon Sweepers « quitte à faire les mêmes » :
  refusé (designs propres à POLLEN, comme toujours). Plus de mer : 654 850 parcelles de 2 m, 1 189 secteurs en bandes
  (24 × ~110 m, repère B0/BT/BN) ouverts par distance à la base ; parcelles en tableaux typés (T.P, T.sect…, T.pos et
  T.dir restent lisibles par Proxy) ; textures de secteur et de progression ; sauvegarde format 8 (parcelles codées
  par plages), clés `pollen-v14-…`. Bâtiments rapprochés, esplanade de 28 m. Outils : touffes de poils qui s'écrasent,
  réservoir vitré qui se remplit, hélice du souffleur, sortie élastique, trois gestes de validation. Véhicules :
  gyrophare, feux arrière, braquage, roulis, tangage, suspension, poussière. Test : `npm run smoke:v14`.
  Puis : « enlève les secteurs ; pour les fleurs, la couleur la plus adaptée au jeu » → plus de secteurs à débloquer
  (OUVERTS = NSECT, pas de liseré ni de zone grisée ; les bandes restent seulement des zones internes pour la variété,
  le prix et la ruche mère) ; le pourcentage affiché est celui de la planète au centième ; une fête toutes les 500
  parcelles. Fleurs en rose framboise #E8458B (cœur jaune #F5C518) : contraste maximal sur le beige fané et le vert,
  distinct de l'orange et du cyan des machines et du halo bleu. Le nom « Azurelle » est gardé (à rediscuter).
  Puis : « les véhicules et les graphismes font effet IA ; les parcelles débordent sur la base ; un endroit pour
  décharger et vendre ; des designs mieux inspirés de Moon Sweepers » → véhicules remodelés avec des designs propres à
  POLLEN (pneus à crampons et jantes, cabines vitrées, hublots où monte le pollen, barre de coupe à rabatteur pour la
  pollinisatrice, camion à calandre et caisse nervurée…), pas de copie ; aucune parcelle à moins de RB + 1,3 m et une
  bordure basse autour de l'esplanade (ouverte au sud) ; quai de déchargement couvert au sud (local(0, 20)) : on s'y
  arrête au volant, la hotte aspire 40 kg/s et vend aussitôt ; la pompe passe en local(-22, -2).
  Puis : « sauvegarde automatique pour reprendre là où j'en étais ; des véhicules sans éléments qui flottent ; tout
  en un seul bâtiment ; enlève le système d'eau ; garde et améliore les rampes » → sauvegarde : en plus du localStorage,
  copie dans la base privée de l'artefact (`data/users/<id>/pollen-v14-emplacement-N`, capacités db et user) toutes les
  60 s et en quittant la page ; au démarrage, la plus récente gagne (rechargement si une partie locale tournait déjà) ;
  `?horsligne` la coupe. Un seul bâtiment : HALL (41 × 18 m, local(0, -8), façade vitrée au sud, une porte du public en
  x = -3, baie du garage) ; les quatre pièces sont posées dedans par `poserDans` (repère plat du hall), le garage
  (CONCESSION) est une zone sans murs, son parvis est posé à part sur le sol. Le plancher du hall est plat : `surcote`
  ajoute r²/2R. Collecteur en local(-12, 10), départ en local(-2, 7). Eau retirée : outil tuyau, pompe, tuiles arides,
  champ `tuyaux` (une tuile aride d'une vieille sauvegarde redevient normale). Véhicules : essieux, berceaux, bras,
  pattes ; améliorations fixées à un endroit qui les porte (`equiper(c, niv, { pot, cof, av })`). Rampe (0,31 m, coin
  plein) et escalier (0,95 m, jusqu'au tablier d'une passerelle) en pente réelle (surcote `incline`).
  Puis : garage dégagé (plateformes plus petites et espacées, allée de 3 m devant l'atelier et le labo ; le test marche
  jusqu'à chaque pièce). Puis : « rends le jeu psychologiquement addictif et pas ennuyant » → `13-elan.js` : élan
  (parcelles enchaînées, ×1 à ×3, retombe après 3 s de pause), fleurs dorées (1 sur 90, ×12), bourrasque de pollen
  (toutes les 2 à 4 min, 30 s à ×2), niveaux avec prime, trois contrats toujours affichés, barre du prochain achat,
  nombres qui s'envolent, compteur de crédits qui monte, gains des ruches pendant l'absence (2 h au plus). Sans
  piège : rien ne se perd à l'arrêt, pas de fausse urgence, pas d'achat réel. Branché par `APRES_POLLEN` et
  `APRES_VENTE` (07-jeu) ; sauvegardé dans S (niveau, xp, contrats, dorees). `ELAN.off` le coupe pour les tests.
  Puis : « des véhicules beaucoup plus chers et efficaces ; une vue extérieure au volant ; supprimer avec le marteau ;
  relier les rampes aux ruches et aux pollinisateurs pour gagner seul » → moissonneuse géante (250 000 cr, 11 voies) et
  aéroglisseur à rampe (750 000 cr, 15 voies, 15 m/s), exposés dans l'accueil, garés à leur parc (`parc`, en local) ;
  quai : vidange en 20 s quelle que soit la cuve. Vue extérieure par défaut au volant (`VUE_VEH`, touche C pour la
  cabine), pilote visible (`fabriquerPilote`, `assise` par véhicule). Marteau : mode Supprimer (bouton ou X), un clic
  sur une pièce ne la casse plus hors de ce mode. « Rampes » compris comme convoyeurs : une ruche dépose miel et cire
  sur un convoyeur qui la touche (`sortieRuche`) ; nouveau pollinisateur automatique (3 000 cr) qui pollinise son
  rayon puis récolte le pollen à 40 % sans fin (`recolteAuto`) ; un réceptionnaire au bout vend seul. Miel toutes les
  20/12/6 s selon la ruche.
  Puis : « ne jamais perdre les véhicules ; que l'automatique n'ait besoin ni de conduit ni de rien ; récolter à
  vitesse maximale » → contact des véhicules compté aussi en distance (dt × (1 + 2|v|)) : à pleine vitesse tout ce qui
  passe sous la brosse est pollinisé ; `rappeler` (touche V, bouton sous le marteau : le dernier véhicule conduit
  vient près de soi ; borne du garage : « Rappeler » le renvoie à sa place), véhicules sur la carte, garde-fou qui
  ramène un véhicule hors du sol. Ruches et pollinisateur automatique autonomes : sans convoyeur ils vendent eux-mêmes
  (`venteDirecte`), le pollinisateur ne consomme plus de courant ; l'absence compte aussi le miel, la cire et les
  pollinisateurs.
  Puis : « repère de la base sur la boussole ; des bots qui marchent et conduisent seuls ; le camion où l'on ne peut
  pas monter ; un garage plus grand ; des panneaux solaires sur les bâtiments ; addictif, 100 h au moins » →
  boussole : maison orange au cap de la base, distance dessous. Camion conduisible (siège, pilote, rampe arrière de
  5 voies), ses tournées seulement quand il est seul. Esplanade de 50 m (RB ; les bandes gardent leur repère à 34 m) ;
  sauvegarde format 9 (CONVERSIONS[8] range les parcelles dans le nouvel ordre avec `listeIds(RB_ANCIEN)`). Grand
  garage HANGAR (30 × 13 m, local(37, -2), ouvert vers le hall) : une baie par véhicule (`PARCS`, `BAIES`), rampe de
  l'aéroglisseur repliable (`ailes`). `14-equipe.js` : toiture solaire (trois niveaux, InstancedMesh sur le hall puis
  le garage, alimente ce qui manque de courant, surplus vendu 0,4 cr/kW/s) ; robots ouvriers (40 au plus, prix
  2 500 × 1,35^n) ; pilote automatique par véhicule (30 % du prix, bouton à la borne ; part du sud de la base, revient
  vider au quai) ; recherche sans fin (robots, pilotes, valeur ; prix ×2 par niveau) ; saisons (seuil 2 % × 1,5^s,
  toute la planète dès la 10e ; ×1,5 par saison ; la 30e sauve la planète). Durée estimée par `tools/sim-duree.py` (joueur qui
  optimise tout) : ~50 h jusqu'à la saison 30, donc bien plus pour un joueur réel ; à confirmer en jouant. L'absence
  compte aussi robots et pilotes (`absenceEquipe`).
  Puis : « une usine avec des ouvriers payés qui fabrique des brosses pour les robots ; payer l'électricité ; des charges
  à couvrir ; une prime par secteur fini ; ouvriers et robots moins efficaces ; grosses machines beaucoup plus chères ;
  des machines automatiques plus efficaces ; d'autres pour aller plus vite ; des robots désherbeurs ; des fleurs
  rares » → `15-usine.js` : USINE à local(-37, -2) (sheds, cheminée, établis, ouvriers visibles) ; un ouvrier fait une
  brosse ou une pièce toutes les 20 s et touche 0,6 cr/s (embauche 400 cr, 12 au plus) ; stock voulu 150 brosses et
  60 pièces (`S.stock`). Les robots usent une brosse pour 30 parcelles, les désherbeurs pour 40 herbes, les machines
  automatiques selon `brosses` ; les pilotes une pièce pour 400 parcelles ; sans stock, ils attendent. Électricité
  achetée au réseau extérieur 0,25 cr/kW/s (toiture d'abord, surplus revendu 0,1) ; charges prélevées toutes les 2 s ;
  impayé : facture due, ouvriers et réseau coupés jusqu'au paiement (`CHARGES`, ligne sous les crédits). Prime d'un
  secteur entièrement fleuri : moitié de sa valeur, une fois par saison (`SECTEUR_FINI`, `S.finis`). Prix : pollinisatrice
  45 000, transporteur 300 000, géante 1,5 M, aéroglisseur 5 M, ruche mère 25 000, pollinisateur 12 000. Robots 1,5 m/s
  et 3,2 s par parcelle ; pilotes à 55 % de la vitesse. Nouvelles machines : tour d'épandage (60 000, rayon 22 m) et nid
  de drones (250 000, rayon 80 m, six drones animés) ; pour le joueur : moto des champs (35 000, 20 m/s, rampes
  repliables), canon à pollen (60 000, neuf parcelles), deux niveaux de marche de plus. Mauvaises herbes (sorte 1) qui
  gagnent les parcelles fanées voisines (`HERBES`, instances à part) ; robots désherbeurs (3 000 × 1,4^n, 20 au plus).
  Fleurs rares (sorte 5, 24 sur la planète, colonne violette) : seul le joueur les pollinise, ×25. Sauvegarde : S.stock,
  ouvriers, desherbeurs, finis, rares. `CHARGES.off` et `HERBES.off` pour les tests. Durée estimée : ~67 h pour un joueur
  qui optimise tout (`tools/sim-duree.py`).
  Puis : « je ne peux pas sortir l'aéroglisseur du garage ; une usine qui fasse un vrai truc, où l'on voit les gens
  travailler ; les panneaux solaires derrière les granges ou dessus ; une mini-ville à 100 millions dont la population
  travaille à l'usine ; plein de véhicules ; des robots encore plus efficaces » → esplanade de 72 m (RB ; sauvegarde
  format 10, `RB_FORMAT` et `CONVERSIONS[8|9]`). HANGAR de 49 × 14 m à local(52, -4), piliers seulement au fond et aux
  bouts : baies (`BAIES`) larges, véhicules garés nez dehors (`PARCS[c].f`), tous sortent en marche avant (vérifié,
  aéroglisseur compris). Véhicules `vitrine: false` vendus à une borne de leur baie (`BORNES_GARAGE`) : buggy 12 000,
  tracteur 120 000 (rampes repliables), chenille 800 000 (13 voies), dirigeable 12 M (`vol` : modèle à 7 m, ni pente ni
  obstacle ; mât d'amarrage MAT à local(52, -40)). Usine refaite (`15-usine.js`, 30 × 16 m à local(-52, -2)) : deux lignes
  de 15 postes (12 monteurs, 2 porteurs, une presse), ouvriers articulés (`fabriquerOuvrier`), brosses qui défilent sur
  les tapis, caisses empilées, tableau mural (`dessinerTableau`). La ligne A suit les ouvriers embauchés, la ligne B
  les 24 habitants de la ville (`effectifs()`, stock voulu doublé, salaire 0,3 cr/s). `16-ville.js` : mini-ville à
  local(0, -52) (100 000 000 cr ; chantier clôturé avant), dix maisons, mairie à horloge, fontaine, arbres, réverbères ;
  14 habitants visibles (flâneurs, navetteurs vers l'usine). Toiture : niveaux 4 (600 000, +150 kW) et 5 (2,5 M,
  +250 kW) = fermes au sol derrière l'usine puis le garage (`FERMES`). Robots avancés (`ROBOTS2`, 60 000 × 1,3^n,
  20 au plus, 3,2 m/s, trois parcelles en 1,2 s, une brosse pour 60 parcelles, borne devant l'usine). Sauvegarde :
  `ville`, `robots2` ; l'absence compte les robots avancés.
  Corrigé au passage : un commentaire avalait le calcul de l'électricité (facture NaN, usine en impayé) ; charges coupées
  (`CHARGES.off`) = pas de réseau extérieur ; désherbeurs partis de la sortie du hall ; `debloquer` (14-equipe) : un
  robot qui n'approche plus de son but en 3 s change de cible.
- **v10** (`v10/index.html`), base de la v14. Le fondateur : « le jeu ne marche pas, garde juste la version avant la
  modification des blocs et rends les blocs plus petits comme au début » → retour à la v10 (parcelles de 2 m).
  La v13 ne marchait pas chez lui (panne non reproduite ici : même démarrage que la v10, console sans erreur) ;
  v11, v12 et v13 restent dans le dépôt, mises de côté.
  Puis : « enlève les parcelles déjà pollinisées et fais des secteurs en longueur, pas autour de la base » → aucune
  parcelle fleurie au départ ; six secteurs en longues bandes parallèles (24 à 34 m de large, 120 à 270 m de long) qui
  partent du bord sud de la base (repère B0/BT/BN dans 02-planete.js). Sauvegarde v10 passée au format 7.
- **v13 (« des parcelles plus petites, remets ce que tu avais fait avant ») : `v13/index.html`**, mise de côté (ne marchait pas chez le fondateur).
  La v11 entière sur des parcelles de 2 m (treillis 256, une seule grille pour fleurs et machines), douze secteurs en
  disques en spirale autour de la base, friche entre eux, prix 5 → 230 cr. Sauvegarde format 8, clés `pollen-v13-…`.
  Code dans `v13/src`, `node v13/construire.mjs`. Test : `npm run smoke:v13`.
- **v12 (document « les briques ») : `v12/index.html`**, en pause (brique 1 faite) : le fondateur est revenu au jeu complet (v13). Huit briques courtes que le fondateur
  envoie une par une ; ne faire QUE la brique reçue, puis attendre la suivante. Brique 1 (le socle) faite : planète
  pavée, gravité, caméra lissée, ombre, ciel, soleil, sol à grain. Prochaine : brique 2 (les fleurs).
  Code dans `v12/src`, `node v12/construire.mjs`. Test : `npm run smoke:v12`.
- **v11 (brief « design épuré, planète, addiction ») : `v11/index.html`**, mise de côté par la v12, les six étapes faites.
  Le brief demande « le style exact de Moon Sweepers » et une comparaison de captures : refusé comme en v6 et v9 ; ses
  dix contraintes de forme sont appliquées comme charte propre à POLLEN. Planète-prairie sans mer ni montagne,
  40 891 tuiles de 8 m (treillis 64), grille de construction de 2 m (treillis 256), douze secteurs = régions des
  douze sommets de l'icosaèdre, prix par secteur 8 → 480 cr. Huit couleurs en tout (le jaune ne sert qu'au cœur de la
  fleur et au pollen). Huit outils et quatorze machines aux chiffres du brief, lots de 10 kg, énergie en kW et kWh.
  Sauvegarde format 7, clés `pollen-v11-…`. Code dans `v11/src`, `node v11/construire.mjs`. Test : `npm run smoke:v11`.
- **v10 (brief « design, bâtiments, planète ») : `v10/index.html`**, redevenue la version courante. Les cinq étapes du brief sont
  faites (le fondateur : « fais toutes les étapes sans me demander ») : 1 anomalies ; 2 planète sphérique de 500 m
  (tuiles d'un icosaèdre subdivisé 256 fois, gravité vers le centre, relief par bruit, mer, calottes, nuages, étoiles,
  soleil qui tourne en 16 min, secteurs en disques cernés d'un liseré, carte-globe avec voyage rapide) ; 3 quatre
  intérieurs (station, comptoir, atelier, laboratoire) ; 4 concessionnaire et cinq véhicules à quatre améliorations ;
  5 mode construction (touche B, cinq catégories, 29 pièces, électricité en réseaux de 10 m, ruches autonomes,
  tableau de supervision). Palette : blanc #EDEAE4, charbon #2E343A, orange #F08A24, cyan #4FD6E3.
  Une pièce occupe une tuile de la planète (id de tuile, six directions). Sauvegarde locale format 6, clés
  `pollen-v10-…` ; une sauvegarde v9 n'apporte que l'argent, les outils et le temps (le monde plat ne se transpose pas).
  Simplifications connues : convoyeur courbe et fusionneur ne diffèrent du droit que par le modèle et la vitesse ;
  le transporteur lourd contourne les obstacles simplement et renonce s'il reste bloqué ; pas de câbles dessinés.
  Code dans `v10/src`, assemblé par `node v10/construire.mjs` ; ne pas modifier `v10/index.html` à la main.
  Test : `npm run smoke:v10`.
- **v9 (brief « station agricole ») : `v9/index.html`**, mise de côté par la v10 (terrain plat), en six étapes livrées une à une (décor et
  charte, vue et contrôles, interface, boucle, activités, automatisation). Le brief demandait une copie de Moon Sweepers
  (esthétique et interface poste par poste) : refusé, comme la v6. Direction originale validée par le fondateur
  (« fais-le en plusieurs semaines ») : palette POLLEN blanc cassé #ECE8DF, graphite #2F3338, jaune pollen #F4B41A,
  vert sève lumineux #53D17A ; arêtes chanfreinées (RoundedBoxGeometry), socles à gradins, rainures de panneaux.
  Dernières corrections du fondateur, qui priment : une seule fleur, l'Azurelle bleue (#3B6FD4, cœur #F5C518, tige
  #4A7A3C, ±8 % de luminosité), six variétés par secteur (3, 7, 15, 32, 70, 150 cr), secteur suivant à 100 % ; six
  ressources (pollen, nectar, graines, miel, cire, Azurelles mères), sac de 12 kg et colis ; actions avec durée et jauge,
  achats immédiats, machines à durées améliorables ; désordre et accidents réversibles ; rendu GTAO, ombres de contact,
  contre-jour, reflets, panneaux rainurés à liseré orange, chanfreins partout ; interface à cinq éléments, aucun texte
  qui dise quoi faire. Sauvegarde locale format 5 (trois emplacements, copie de secours, conversion des formats 2 à 4,
  tuiles en octets, export/import .json) : tout changement de format ajoute une conversion dans `CONVERSIONS`.
  Le brief v10 a d'abord corrigé ses anomalies ici (collisions en boîtes, zones d'approche, bâtiments fermés), puis
  est passé dans `v10/`.
  Code dans `v9/src`, assemblé par `node v9/construire.mjs` ; ne pas modifier `v9/index.html`
  à la main. Test : `npm run smoke:v9`.
- **v8 (brief « vrais modèles 3D, gratuits ») : `v8/index.html`**, mise de côté par la v9. Plus rien de dessiné en code : les
  modèles CC0 sont chargés depuis `v8/models` et `v8/hdri` (noms dans `v8/LISEZMOI.md`), avec des formes de substitution
  si un fichier manque. Boucle complète : polliniser (panier), vendre au marché, acheter le pinceau à l'atelier.
  Ne rien anticiper : ensuite, un à la fois, deuxième espèce, ruches et miel, troisième outil, carte plus grande.
  Test : `npm run smoke:v8` (fichiers de test dans `tests/fixtures/v8`, régénérés par `node tests/v8-fixtures.mjs`).
- **v7 (brief « une scène qui marche et qui est belle ») : `v7/index.html`**, base de la v8. Le fondateur a changé
  de méthode : une seule petite scène (champ de 60 m, lavande seule, tige de coton, une action), un seul fichier qui
  détecte ordinateur ou téléphone. Faite. Ne rien ajouter hors de la liste du brief. Ensuite, quand les cinq points
  passent chez lui, un morceau à la fois : deuxième espèce, puis réservoir et vente, puis ruches. Test : `npm run smoke:v7`.
- **v5 (brief « version finale, mobile et PC ») : `v5/`**, mise de côté par la v7. Deux fichiers générés depuis un seul code
  (`v5/src/jeu.js` + `config-*.js` + `controles-*.js`, `npm run build:v5`). Livraison en six étapes, le fondateur
  dit « étape suivante ». Étapes 1 (rendu) et 2 (joueur : mains gantées, déplacement, collision, relief, contrôles
  PC et tactiles) faites. Prochaine : 3, la boucle. Test : `npm run smoke:v5`.
- **v4 (brief « modèle appliqué ») : `v4/index.html`** : première personne, grille hexagonale de tuiles
  fanées/fleuries, ruchettes posées par le joueur, base (comptoir, hangar). Étapes 1 à 4 faites. Reste 5 (miellerie,
  transformation, électricité, carte) et 6 (automatisation). Test : `npm run smoke:v4`.
- **v3 (brief « graphismes organiques ») : `v3/index.html`**. Étapes 1 à 4 faites (arbre seul,
  verger, personnage et commandes, boucle avec la difficulté). Reste l'étape 5 (apiculture) et 6. Test : `npm run smoke:v3`.
  Règle du brief : aucune BoxGeometry visible.
- **Prochaine étape** : le fondateur joue 10 minutes. Si c'est agréable, jalon 2 dans le vrai moteur
  (explique d'abord l'arbitrage moteur en trois lignes). Sinon, on s'arrête.
- Tests : `npm test` (logique) et `npm run smoke` (navigateur). Lance-les avant chaque commit.

## Ton rôle

Game designer et développeur gameplay senior. Tu construis avec moi un jeu PC commercial destiné à Steam, du prototype
à la version 1.0. Tu prends les décisions techniques, tu écris le code, tu me poses une question seulement quand un
choix engage le périmètre ou le budget.

## Le contexte marché

En octobre 2026, *Moon Sweepers* (DragDrop Games, 8,99 €, 2 Go) a atteint 83 000 joueurs simultanés en neuf jours.
Sa formule : une tâche absurde à échelle gigantesque, un outil ridicule au départ, une boucle
récolter → vendre → améliorer → automatiser, de la coop jusqu'à 16 joueurs, aucun combat, aucune narration.
Nous reprenons cette structure sur un thème que personne n'occupe sur Steam. POLLEN est un jeu original :
ne reprends ni le nom, ni les visuels, ni le contenu d'un jeu existant.

## Le jeu

Les pollinisateurs ont disparu. Un continent de vergers, de champs et de serres ne produit plus rien. L'humanité
pollinise à la main, fleur par fleur. Tu commences avec **une tige de coton** dans un verger de douze pommiers.
Quinze heures plus tard, tu pilotes une flotte de drones qui pollinise une vallée entière.

Accroche Steam : **« Un continent à polliniser. Une tige de coton pour commencer. »**

## La boucle

Première personne, pas de combat, pas de mort, pas de barre de vie. Seule contrainte : le temps. Chaque fleur a une
fenêtre de floraison ; une fleur non pollinisée fane.

1. **Polliniser** : viser une fleur ouverte, maintenir le clic pour charger le pollen, le porter sur une autre fleur.
   Tige de coton : 2 fleurs. Pinceau : 8. Souffleur : une rangée.
2. **Attendre la pousse** : 2 à 6 minutes selon l'espèce. Jamais d'attente passive.
3. **Récolter** : secouer l'arbre, ramasser ou pousser les fruits vers une brouette.
4. **Vendre** : au point de collecte. Les prix fluctuent par saison.
5. **Améliorer** : outils, sacs, véhicules, parcelles, ruches. Chaque achat réduit visiblement une action répétée.
6. **Automatiser** : à partir du palier 4, des machines pollinisent sans toi.

Rythme : première vente dans les **3 premières minutes** ; dans les **30 premières**, une amélioration qui change une
sensation, pas un chiffre.

## Les six paliers d'outils

Chaque palier multiplie le rendement par 3 à 5 et change le geste.

| Palier | Outil | Fleurs par geste | Ce que ça change |
|---|---|---|---|
| 1 | Tige de coton | 2 | La misère de départ, 20 minutes maximum |
| 2 | Pinceau d'artiste | 8 | Un arbre entier sans recharger |
| 3 | Plumeau sur perche | 25 | Les branches hautes, l'échelle devient inutile |
| 4 | Souffleur à dos | 80 | On pollinise en marchant |
| 5 | Quad pulvérisateur | 400 | Une parcelle en un passage |
| 6 | Essaim de drones | Illimité | On ne pollinise plus, on gère |

Lignes parallèles : **Transport** (poches → panier → brouette → remorque → camionnette, capacité ×2 par palier),
**Biologie** (floraison longue, greffes, serres chauffées, ruches de bourdons), **Terrain** (parcelles, irrigation, routes).

## L'économie (point de départ, à équilibrer)

| Élément | Valeur | Remarque |
|---|---|---|
| Pomme | 3 cr | Dès la première minute |
| Cerise | 11 cr | Fenêtre courte |
| Fleur de vanille | 140 cr | Pollinisation uniquement manuelle |
| Pinceau (palier 2) | 250 cr | ~20 min |
| Plumeau (palier 3) | 1 800 cr | ~1 h 30 |
| Souffleur (palier 4) | 12 000 cr | ~4 h |
| Quad (palier 5) | 70 000 cr | ~9 h |
| Drones (palier 6) | 400 000 cr | ~18 h, fin de la v1.0 |

Chaque palier coûte 6 à 7 fois le précédent et rapporte 4 à 5 fois plus par minute ; jamais plus de 40 minutes
bloqué sur un objectif. Aucune microtransaction, aucune monnaie premium.

## Le monde

Une vallée continue sans chargement, cinq zones débloquées par achat de terrain, échelle visible dès le départ :
le verger (pommiers, poiriers), les champs (colza, tournesol), les serres (fraises, tomates, vanille),
le flanc de montagne (amandiers en terrasses), la forêt humide (orchidées). Cycle jour/nuit de 20 min,
quatre saisons de 2 h qui changent les floraisons et les prix.

## La coop et le chaos

Solo, ou coop en ligne jusqu'à 8 en v1.0 (16 plus tard). L'hôte héberge, progression et argent communs.
Des systèmes physiques qui produisent du désastre drôle sans jamais punir : brouette qui dévale une pente,
souffleur qui projette les joueurs, quad qui se conduit mal exprès, bourdons qui harcèlent, grêle annoncée
30 s à l'avance. Aucune perte irréversible.

## Direction artistique, son, interface

- **Image** : low-poly stylisé, couleurs saturées. Une fleur pollinisée change de teinte immédiatement : on lit
  l'avancement d'une parcelle d'un coup d'œil. Cette contrainte prime sur le réalisme.
- **Son** : pas de musique continue. Vent, insectes, feuilles. Un son court et varié par fleur pollinisée,
  une petite fanfare par vente.
- **Interface** : crédits en haut à droite, outil en bas, rien d'autre. Améliorations achetées à un établi dans le
  monde. Aucun tutoriel écrit, aucune quête : la première fleur ouverte est surlignée.

## Spécifications techniques (version finale)

- **Moteur** : Unity 6 LTS + URP (Netcode for GameObjects). Godot 4 acceptable, réseau plus coûteux.
- **Réseau** : client-hôte autoritaire. Synchroniser fleurs, fruits au sol, argent, véhicules. Particules,
  sons et animations restent locaux.
- **Le problème dur** : des dizaines de milliers de fleurs. Jamais un GameObject par fleur : données par fleur
  dans des tableaux, rendu instancié GPU, découpage en secteurs (seul le secteur actif est simulé).
- **Sauvegarde** : automatique, locale, à la 1re minute puis toutes les 5 minutes, réparation des fichiers
  corrompus, compatibilité entre versions mineures.
- **Cible** : 60 img/s sur GTX 1060, 8 Go de RAM, installation < 4 Go. Windows en v1.0, compatible Proton.
- **Langues** : anglais d'abord, puis FR, DE, ES, PT-BR, RU, ZH-CN, TR, PL. Toutes les chaînes en fichiers de
  localisation dès le premier jour.

## Périmètre et jalons

**v1.0** : cinq zones, six paliers, trois lignes d'amélioration, saisons, coop à 8, succès Steam, nuage Steam.

**Hors périmètre, à refuser si je le demande** : combat, PNJ dialogués, narration, personnalisation de personnage,
PvP, crafting profond, console, mobile. Chacun repousse la sortie d'un mois.

1. **Semaines 1-2, le noyau** : une parcelle, cent fleurs, tige de coton, pollinisation, pousse, récolte, vente.
   Solo, cubes gris. Pas agréable dix minutes = concept mauvais, on s'arrête.
2. **Semaines 3-4, la densité** : rendu de dizaines de milliers de fleurs à 60 img/s.
3. **Semaines 5-7, la progression** : six paliers, économie, établi, sauvegarde.
4. **Semaines 8-10, le réseau** : coop à 4 puis à 8. Poste le plus risqué.
5. **Semaines 11-13, le monde** : cinq zones, saisons, direction artistique.
6. **Semaines 14-16, la finition** : son, interface, succès, localisation, équilibrage, démo Steam Next Fest.

Environ quatre mois à plein temps, huit à mi-temps.

## Ce que j'attends de toi

- Un jalon à la fois. Pas d'architecture pour les six jalons avant que le premier tourne.
- À chaque étape : le code commenté, la commande pour lancer, une phrase sur ce qui reste cassé.
- Choix irréversible (moteur, modèle réseau, format de sauvegarde) : l'arbitrage en trois lignes avant de le prendre.
- Signale toute demande hors périmètre et son coût en semaines avant de l'implémenter.
- Ne dis jamais qu'une fonctionnalité marche sans l'avoir lancée.

## La page Steam

En ligne dès que le jalon 2 tourne. Titre POLLEN ; tags : simulation de métier, automatisation, incrémental, coop,
agriculture, détente, première personne, construction de bases ; prix 8,99 € ; démo des 30 premières minutes pour
un Steam Next Fest. Première capture : la tige de coton au premier plan, la vallée entière derrière.
