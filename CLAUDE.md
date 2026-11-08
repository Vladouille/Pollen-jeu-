# POLLEN — brief de développement

Ce fichier reprend le brief du projet (document « Prompt de développement — POLLEN (jeu Steam) »).
Lis-le entièrement avant de coder. Réponds en français, phrases courtes.

## État du projet

- **Jalon 1 (le noyau) : prototype web fait** (Three.js, `src/`). Décision prise avec le fondateur : prototyper
  la boucle dans le navigateur, où elle peut être lancée et testée, avant de choisir Unity ou Godot.
- **v2 (brief « graphismes et jouabilité ») : `v2/index.html`**, un seul fichier, troisième personne, tactile.
  Étapes 1 à 4 du brief faites (décor, personnage, commandes, boucle). Reste l'étape 5 : 24 parcelles, ruches,
  six outils, saisons, succès. Test : `npm run smoke:v2`.
- **v8 (brief « vrais modèles 3D, gratuits ») : `v8/index.html`**, version courante. Plus rien de dessiné en code : les
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
