// Version PC : qualité maximale. Seul ce fichier diffère de la version mobile (avec les contrôles, plus tard).
const PLATEFORME = {
  nom: 'pc',
  pixelRatioMax: 2,
  ombres: 2048,
  herbe: 200000,
  rayonHerbe: 48,
  rayonFleurs: 56,
  capFleurs: 7000,          // par variante de forme (15 variantes)
  distance: 150,            // distance d'affichage : la brume ferme la vue au-delà
  terrainSegments: 280,
  postComplet: true,        // bloom, profondeur de champ, aberration, vignette, étalonnage
  reductionAuto: false,
};
