// Scénario de l’étape 6 de la v9, joué dans la page par tests/v9-smoke.mjs : nouveautés, construction, ligne
// collecteur → extracteur → quai, énergie, pollinisatrice, contrats, événements, nuit, sauvegarde.
(() => {
  const P = window.pollen, J = P.joueur, out = {}; P.figer = true;
  const face = (x, z, d, pitch) => { const a = Math.atan2(J.x - x, J.z - z); Object.assign(J, { x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, vx: 0, vz: 0, pitch }); J.y = P.H(J.x, J.z); J.yaw = Math.atan2(J.x - x, J.z - z); P.step(0.016, 2); };
  // Nouveautés : rien de neuf au départ, tout est là après 48 minutes de jeu.
  out.avant = !P.DEBLOQUE.has('marteau') && !P.DEBLOQUE.has('pollinisatrice') && !P.CONTRATS.ouverts;
  P.S.temps = 8 * 60 + 1; P.step(0.016); out.a8 = P.DEBLOQUE.has('tuyau') && P.CONTRATS.ouverts;
  P.debloquerTout(); out.tout = P.DEBLOQUE.has('pollinisatrice') && P.PIECES_DEBLOQUEES.has('maturateur');
  P.S.credits = 20000; P.S.outils.push('marteau'); P.changerOutil('marteau');
  // Poser un convoyeur en visant le sol, puis le reste de la ligne.
  Object.assign(J, { x: 12, z: 14, yaw: 0, pitch: -0.5 }); J.y = P.H(12, 14); P.step(0.016, 2);
  const n0 = P.GRILLE.size; P.E.action = true; P.step(0.016); P.E.action = false; P.step(0.016); out.pose = P.GRILLE.size === n0 + 1;
  out.badge = document.getElementById('contexte').textContent;
  P.E.action = true; P.step(0.016); P.E.action = false; P.step(0.016); out.demonte = P.GRILLE.size === n0;
  P.poserPiece('convoyeur', 2, -1, 1); P.poserPiece('extracteur', 3, -1, 1); P.poserPiece('convoyeur', 4, -1, 1); P.poserPiece('quai', 5, -1, 1);
  P.poserPiece('solaire', 3, 1, 0); P.poserPiece('batterie', 4, 1, 0);
  out.depart = P.departs().length;
  P.changerOutil('brosse'); P.S.charge = 4; P.S.valeur = 40;
  face(P.COLLECTEUR.position.x, P.COLLECTEUR.position.z, 2.6, 0); out.deposer = P.interVise && P.interVise.texte();
  P.E.inter = true; P.step(0.016); out.silo = P.S.silo;
  const c0 = P.S.credits; P.step(0.1, 250); out.ligne = P.S.credits - c0; out.energie = P.ENERGIE.max;
  // La pollinisatrice : achat au garage, on roule, elle pollinise, on vide les cuves au collecteur.
  face(P.V.x, P.V.z, 3, 0); out.achatV = P.interVise && P.interVise.texte(); P.E.inter = true; P.step(0.016); out.possede = P.V.possede;
  P.E.inter = true; P.step(0.016); out.monte = J.enVehicule;
  const t0 = P.S.tuiles; Object.assign(P.V, { x: -18, z: 18 }); P.V.yaw = Math.atan2(-18 - -40, 18 - 40); J.yaw = P.V.yaw; P.E.mz = 1; P.step(0.1, 80); P.E.mz = 0; P.step(0.1, 20);
  out.roule = Math.hypot(P.V.x + 18, P.V.z - 18); out.cuves = P.V.charge; out.parVehicule = P.S.tuiles - t0;
  Object.assign(P.V, { x: P.COLLECTEUR.position.x + 5, z: P.COLLECTEUR.position.z + 4 }); P.step(0.016); const c2 = P.S.credits; P.E.inter = true; P.step(0.016); out.vide = P.S.credits > c2 && P.V.charge === 0 && J.enVehicule;
  P.E.inter = true; P.step(0.016); out.descendu = !J.enVehicule;
  // Contrats : trois à la station, encaissés quand ils sont remplis.
  out.contrats = P.CONTRATS.liste.length; P.CONTRATS.liste[0].fait = P.CONTRATS.liste[0].n; const prime = P.CONTRATS.liste[0].prime, c1 = P.S.credits;
  P.E.contrats = true; P.step(0.016); out.panneau = !document.getElementById('contrats').hidden; P.E.contrats = true; P.step(0.016);
  const du = P.CONTRATS.liste.filter((c) => c.fait >= c.n).reduce((s, c) => s + c.prime, 0); P.encaisser(); out.encaisse = du >= prime && P.S.credits - c1 === du && P.CONTRATS.liste.length === 3;
  // Événements annoncés 30 s avant.
  P.lancerEvenement('acheteur'); P.step(0.1, 4); out.annonce = document.getElementById('etat').textContent;
  P.step(0.1, 298); out.prix3 = P.S.prixVente; P.step(0.1, 610); out.prixFin = P.S.prixVente;
  P.lancerEvenement('orage'); P.step(0.1, 302); out.pluie = P.scene.children.some((o) => o.isLineSegments && o.visible);
  P.step(0.1, 405); const mf = P.MESSAGES.map((m) => m.texte).find((t) => t.includes('L’orage a fané')); out.fanees = mf ? +mf.match(/(\d+) tuiles/)[1] : 0;
  P.lancerEvenement('panne'); P.step(0.1, 302); const enPanne = [...P.GRILLE.values()].find((p) => p.panne); out.panne = !!enPanne;
  // La nuit : le solaire s'arrête, la lampe frontale s'allume.
  P.S.temps = Math.ceil(P.S.temps / 720) * 720 + 0.86 * 720; P.step(0.1, 10);
  out.nuit = P.JOUR.nuit && P.ENERGIE.prod === 0 && P.camera.children.some((o) => o.isSpotLight && o.intensity > 5);
  // Sauvegarde.
  P.sauver(); const s = JSON.parse(localStorage.getItem('pollen-v9-sauvegarde')); out.sauve = s && s.pieces.length === 6 && s.vehicule.possede;
  out.credits = Math.round(P.S.credits); out.vertes = P.T.vert.reduce((s, v) => s + v, 0);
  P.figer = false; return out;
})()
