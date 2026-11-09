// Scénario de l'automatisation de la v9, joué dans la page par tests/v9-smoke.mjs : construction, ligne
// collecteur → extracteur (4 s par lot) → quai, améliorations, borne de pollinisation, pollinisatrice, sauvegarde.
(() => {
  const P = window.pollen, J = P.joueur, out = {}; P.figer = true;
  const face = (x, z, d, pitch) => { const a = Math.atan2(J.x - x, J.z - z); Object.assign(J, { x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, vx: 0, vz: 0, pitch }); J.y = P.H(J.x, J.z); J.yaw = Math.atan2(J.x - x, J.z - z); P.step(0.016, 2); };
  P.S.credits = 30000; P.S.outils.push('marteau'); P.changerOutil('marteau');
  Object.assign(J, { x: 12, z: 14, yaw: 0, pitch: -0.5 }); J.y = P.H(12, 14); P.step(0.016, 2);
  const n0 = P.GRILLE.size; P.E.presse = true; P.step(0.016); out.pose = P.GRILLE.size === n0 + 1;
  P.E.presse = true; P.step(0.016); out.demonte = P.GRILLE.size === n0;
  P.E.inter = true; P.step(0.016); out.piece = P.CONS.piece;
  P.poserPiece('convoyeur', 2, -1, 1); const ex = P.poserPiece('extracteur', 3, -1, 1); P.poserPiece('convoyeur', 4, -1, 1); P.poserPiece('quai', 5, -1, 1);
  out.depart = P.departs().length;
  P.changerOutil('pinceau'); P.S.charge = 4; P.S.valeur = 40;
  face(P.COLLECTEUR.position.x, P.COLLECTEUR.position.z, 2.6, 0); P.E.inter = true; P.step(0.016);
  const c0 = P.S.expedie || 0; let t = 0, vu = false, ecran = false;
  while ((P.S.expedie || 0) - c0 < 64 && t < 40) { P.step(0.1); t += 0.1; if (ex.travaille && ex.t > 1 && ex.t < 3.5) { vu = true; ecran = ex.ecran.emissiveMap.version > 2; } }
  out.ligne = (P.S.expedie || 0) - c0; out.enCours = vu; out.ecran = ecran;
  // Améliorer l'extracteur : E sur la machine, tout de suite.
  face(P.GRILLE.get('3,-1').g.position.x, P.GRILLE.get('3,-1').g.position.z, 2, 0); P.E.inter = true; P.step(0.016);
  out.niveau = ex.niveau; ex.entrees.push({ type: 'pollen', valeur: 1 }, { type: 'pollen', valeur: 1 }); P.step(0.1); out.duree = ex.duree;
  P.ameliorer(ex); P.step(0.1, 30); ex.entrees.push({ type: 'pollen', valeur: 1 }, { type: 'pollen', valeur: 1 }); P.step(0.1); out.niveau3 = ex.duree;
  // Borne de pollinisation → tapis → quai, dans un secteur ouvert.
  P.OUVERTS.value = 6;
  P.poserPiece('borne', 9, 9, 1); P.poserPiece('convoyeur', 10, 9, 1); P.poserPiece('quai', 11, 9, 1);
  const c1 = P.S.expedie; P.step(0.1, 120); out.borne = P.S.expedie - c1;
  // Pollinisatrice : achetée au garage, on roule, on vide les cuves au collecteur.
  Object.assign(J, { x: P.V.x - 4, z: P.V.z - 4 }); face(P.V.x, P.V.z, 3, 0); P.E.inter = true; P.step(0.016); out.possede = P.V.possede;
  P.E.inter = true; P.step(0.016);
  const t0 = P.S.tuiles; Object.assign(P.V, { x: -18, z: 18 }); P.V.yaw = Math.atan2(-18 - -40, 18 - 40); J.yaw = P.V.yaw; P.E.mz = 1; P.step(0.05, 160); P.E.mz = 0; P.step(0.1, 20);
  out.roule = Math.hypot(P.V.x + 18, P.V.z - 18); out.parVehicule = P.S.tuiles - t0;
  Object.assign(P.V, { x: P.COLLECTEUR.position.x + 5, z: P.COLLECTEUR.position.z + 4 }); P.step(0.016); const c2 = P.S.credits; P.E.inter = true; P.step(0.016); out.vide = P.S.credits > c2 && P.V.charge === 0 && J.enVehicule;
  P.E.inter = true; P.step(0.016); out.descendu = !J.enVehicule;
  P.ameliorer(ex);
  P.sauver(); const s = JSON.parse(localStorage.getItem('pollen-v9-sauvegarde')); out.pieces = P.GRILLE.size; out.sauve = s && s.v === 3 && s.pieces.length === out.pieces && s.vehicule.possede && s.ouverts === 6;
  out.credits = Math.round(P.S.credits); out.vertes = P.T.vert.reduce((s, v) => s + v, 0);
  P.figer = false; return out;
})()
