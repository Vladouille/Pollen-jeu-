// Scénario de l'automatisation de la v9, joué dans la page par tests/v9-smoke.mjs : construction, ligne collecteur →
// tamiseur → quai, améliorations, colis sur un tapis, panne, panneau solaire encrassé, borne, pollinisatrice, sauvegarde.
(() => {
  const P = window.pollen, J = P.joueur, out = {}; P.figer = true;
  const face = (x, z, d, pitch) => { const a = Math.atan2(J.x - x, J.z - z); Object.assign(J, { x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, vx: 0, vz: 0, pitch }); J.y = P.H(J.x, J.z); J.yaw = Math.atan2(J.x - x, J.z - z); P.step(0.016, 2); };
  const maintenir = (s) => { P.E.action = true; P.step(0.1, Math.round(s * 10)); P.E.action = false; P.step(0.016); };
  P.OUVERTS.value = 6; P.PANNES.prochaine = 1e9; P.ESSAIM.prochaine = 1e9;
  P.S.credits = 60000; if (!P.S.outils.includes('marteau')) P.S.outils.push('marteau'); P.changerOutil('marteau');
  out.machines = Object.keys(P.PIECES).length;
  Object.assign(J, { x: 12, z: 14, yaw: 0, pitch: -0.5 }); J.y = P.H(12, 14); P.step(0.016, 2);
  const n0 = P.GRILLE.size; P.E.presse = true; P.step(0.016); out.pose = P.GRILLE.size === n0 + 1;
  P.E.presse = true; P.step(0.016); out.demonte = P.GRILLE.size === n0;
  P.E.inter = true; P.step(0.016); out.piece = P.CONS.piece;
  // Collecteur → tamiseur → tapis → quai.
  P.poserPiece('convoyeur', 2, -1, 1); const ta = P.poserPiece('tamiseur', 3, -1, 1); P.poserPiece('convoyeur', 4, -1, 1); P.poserPiece('quai', 5, -1, 1);
  out.depart = P.departs().length;
  P.changerOutil('pinceau'); P.S.sac = P.sacVide(); P.ajouter('pollen', 3, 18);
  face(P.COLLECTEUR.position.x, P.COLLECTEUR.position.z, 2.6, 0); P.E.inter = true; P.step(0.016);
  const c0 = P.S.expedie; let t = 0, vu = false, ecran = false;
  while (P.S.expedie - c0 < 60 && t < 40) { P.step(0.1); t += 0.1; if (ta.travaille && ta.t > 0.5) { vu = true; ecran = ta.ecran.emissiveMap.version > 2; } }
  out.ligne = P.S.expedie - c0; out.enCours = vu; out.ecran = ecran;
  // Extracteur : 4 s, puis 2,5 s, puis 1,5 s.
  const ex = P.poserPiece('extracteur', 3, 3, 1);
  face(ex.x, ex.z, 2, 0); P.E.inter = true; P.step(0.016); out.niveau = ex.niveau;
  ex.entrees.push({ type: 'miel', valeur: 1 }, { type: 'miel', valeur: 1 }); P.step(0.1); out.duree = ex.duree;
  P.ameliorer(ex); P.step(0.1, 30); ex.entrees.push({ type: 'miel', valeur: 1 }, { type: 'miel', valeur: 1 }); P.step(0.1); out.niveau3 = ex.duree;
  // Un colis déposé au bout d'un tapis part en capsules.
  P.poserPiece('convoyeur', 8, 8, 1); P.poserPiece('quai', 9, 8, 1);
  P.S.sac = P.sacVide(); P.ajouter('nectar', 2, 30); Object.assign(J, { x: 17, z: 13, yaw: Math.PI }); J.y = P.H(17, 13); P.step(0.016);
  P.E.inter = true; P.step(0.016); P.E.inter = true; P.step(0.016);   // emballer, reprendre
  Object.assign(J, { x: 17, z: 18.6, yaw: 0 }); P.step(0.016); const e0 = P.S.expedie; P.E.inter = true; P.step(0.1, 60); out.colisTapis = P.S.expedie > e0 && !P.porteColis();
  // Panne et réparation.
  ta.entrees.push({ type: 'pollen', valeur: 1 }); ta.panne = true; P.step(0.1, 5); out.panne = !ta.travaille;
  Object.assign(J, { x: ta.x, z: ta.z + 2.4 }); face(ta.x, ta.z, 2.4, -0.45); maintenir(2.2); out.repare = !ta.panne;
  // Panneau solaire : propre, il accélère ; encrassé, plus ; brossé, à nouveau.
  const so = P.poserPiece('solaire', 3, 1, 0); so.sale = 0.99; P.step(0.1, 30);
  ta.entrees.push({ type: 'pollen', valeur: 1 }); P.step(0.1); out.sale = so.sale >= 1; out.lent = Math.abs(ta.duree - 2) < 1e-6;
  P.changerOutil('brosse'); Object.assign(J, { x: so.x, z: so.z + 2.4 }); face(so.x, so.z, 2.2, -0.66); maintenir(1.8); out.propre = so.sale < 0.05;
  ta.entrees.push({ type: 'pollen', valeur: 1 }); P.step(0.1, 3); out.rapide = Math.abs(ta.duree - 2 / 1.5) < 1e-6;
  // Borne de pollinisation → tapis → quai.
  P.poserPiece('borne', 9, 11, 1); P.poserPiece('convoyeur', 10, 11, 1); P.poserPiece('quai', 11, 11, 1);
  const e1 = P.S.expedie; P.step(0.1, 120); out.borne = P.S.expedie - e1;
  // Pollinisatrice.
  Object.assign(J, { x: P.V.x - 4, z: P.V.z - 4 }); face(P.V.x, P.V.z, 3, 0); P.E.inter = true; P.step(0.016); out.possede = P.V.possede;
  P.E.inter = true; P.step(0.016);
  const t0 = P.S.tuiles; Object.assign(P.V, { x: -18, z: 18 }); P.V.yaw = Math.atan2(-18 - -40, 18 - 40); J.yaw = P.V.yaw; P.E.mz = 1; P.step(0.05, 160); P.E.mz = 0; P.step(0.1, 20);
  out.parVehicule = P.S.tuiles - t0;
  Object.assign(P.V, { x: P.COLLECTEUR.position.x + 5, z: P.COLLECTEUR.position.z + 4 }); P.step(0.016); const c2 = P.S.credits; P.E.inter = true; P.step(0.016); out.vide = P.S.credits > c2 && P.V.charge === 0 && J.enVehicule;
  P.E.inter = true; P.step(0.016); out.descendu = !J.enVehicule;
  P.sauver(); const s = JSON.parse(localStorage.getItem('pollen-v9-emplacement-1')); out.pieces = P.GRILLE.size; out.colis = P.COLIS.length; out.sauve = s && s.v === 5 && s.pieces.length === out.pieces && s.vehicule.possede && s.ouverts === 6;
  out.credits = Math.round(P.S.credits); out.vertes = P.T.vert.reduce((a, v) => a + v, 0);
  P.figer = false; return out;
})()
