// Toutes les valeurs d'équilibrage du jalon 1, au même endroit.
// Ce sont des points de départ à régler en test, pas un dogme.

export const CONFIG = {
  // Verger : une parcelle, 10 pommiers de 10 fleurs = 100 fleurs.
  orchard: {
    cols: 5,
    rows: 2,
    spacing: 5.5, // mètres entre deux arbres
    originZ: -7, // z de la première rangée (le joueur part en z = 0, regard vers -z)
    flowersPerTree: 10,
    trunkHeight: 1.5,
    trunkRadius: 0.55, // rayon de collision du tronc
    canopyY: 2.45, // centre du feuillage
    canopyHalf: 1.05, // demi-côté du cube de feuillage
  },

  // Cycle de vie d'une fleur (secondes).
  flower: {
    budTime: [4, 30], // bouton fermé avant l'ouverture
    regrowTime: [15, 35], // bouton après la récolte
    bloomWindow: [65, 95], // fenêtre de floraison : passé ce délai, la fleur fane
    wiltTime: 25, // fleur fanée avant de redevenir un bouton
    startOpenRatio: 0.35, // part des fleurs déjà ouvertes au lancement
  },

  // Pomme : de la fleur pollinisée au fruit mûr. Le brief dit 2 à 6 min selon l'espèce ;
  // la pomme est l'espèce rapide du départ.
  apple: {
    growTime: 110,
    price: 3, // crédits
  },

  // Outil du palier 1.
  tool: {
    name: 'Tige de coton',
    doses: 2, // fleurs pollinisées par charge (les deux bouts de la tige)
    chargeHold: 0.5, // secondes de clic maintenu pour charger
    reach: 3.2, // portée en mètres
  },

  // Transport du palier 1.
  pockets: { capacity: 12, pickupRadius: 1.5 },

  market: { x: 11, z: 1.5, sellRadius: 3.2 },

  player: {
    eye: 1.7,
    walk: 4.5,
    sprint: 7.5,
    radius: 0.35,
    bounds: 40, // demi-côté de la zone jouable
    spawn: { x: 0, z: 1.5 },
  },

  physics: { gravity: 14, bounce: 0.35, friction: 4 },
};
