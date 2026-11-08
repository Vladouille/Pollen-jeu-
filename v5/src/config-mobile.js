// Version mobile : même jeu, qualité adaptée au téléphone.
const PLATEFORME = {
  nom: 'mobile',
  pixelRatioMax: 1.5,
  ombres: 1024,
  herbe: 60000,
  rayonHerbe: 30,
  rayonFleurs: 34,
  capFleurs: 2600,
  distance: 70,
  terrainSegments: 170,
  postComplet: false,       // bloom et vignette seulement
  reductionAuto: true,      // baisse la résolution si la fréquence tombe sous 50 img/s
};
