// Scénario des activités de la v9, joué dans la page par tests/v9-smoke.mjs : chardons, irrigation, ruche, balise et fleur dorée.
(() => {
  const P = window.pollen, J = P.joueur, out = {}; P.figer = true;
  P.OUVERTS.value = 6;   // tous les secteurs ouverts pour ce scénario
  const face = (x, z, d, pitch) => { const a = Math.atan2(J.x - x, J.z - z); Object.assign(J, { x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, vx: 0, vz: 0, pitch }); J.y = P.H(J.x, J.z); J.yaw = Math.atan2(J.x - x, J.z - z); P.step(0.016, 2); };
  // Chardons : on maintient (brosse en main : 1,8 × 0,7 = 1,26 s).
  let i = -1; for (let k = 0; k < P.NT; k++) if (P.T.sorte[k] === 1) { i = k; break; }
  P.changerOutil('brosse'); Object.assign(J, { x: P.T.x[i], z: P.T.z[i] + 2.2 }); face(P.T.x[i], P.T.z[i], 2.2, -0.62);
  const c0 = P.S.credits; P.E.action = true; P.step(0.1, 11); out.desherbe0 = P.T.sorte[i] === 1; P.step(0.1, 3); P.E.action = false; P.step(0.016);
  out.desherbe = P.T.sorte[i] === 0 && P.S.credits === c0 + 2;
  // Irrigation.
  P.S.outils.push('tuyau'); P.changerOutil('tuyau');
  face(P.POMPE.position.x, P.POMPE.position.z, 2.2, 0); P.E.inter = true; P.step(0.016);
  let a = -1; for (let k = 0; k < P.NT; k++) if (P.T.sorte[k] === 2 && Math.hypot(P.T.x[k] - J.x, P.T.z[k] - J.z) < 40) { a = k; break; }
  out.pollAvant = P.pollinisable(a);
  const x0 = J.x, z0 = J.z, n = Math.ceil(Math.hypot(P.T.x[a] - x0, P.T.z[a] - z0) / 0.8);
  for (let k = 1; k <= n; k++) { J.x = x0 + (P.T.x[a] - x0) * k / n; J.z = z0 + (P.T.z[a] - z0) * k / n; P.step(0.016); }
  out.irrigue = P.T.irrigue[a]; out.pollApres = P.pollinisable(a); out.tuyau = P.TUYAUX[0] && P.TUYAUX[0].pts.length;
  P.E.inter = true; P.step(0.016);
  // Ruche : achetée et posée tout de suite ; une tuile toutes les 3 s, puis 2 s après amélioration.
  P.installerRuche(P.EMPL_RUCHE[0]); P.EMPL_RUCHE[0].ruche.t = -1e6;   // emplacement 1 pris (ruche figée) : la ruche achetée ira sur le 2, dans un secteur encore sec
  P.S.credits = 400; const pr = P.PRESENTOIRS.find((p) => p.cle === 'ruche'); Object.assign(J, { x: pr.x + Math.sin(pr.g.rotation.y), z: pr.z + Math.cos(pr.g.rotation.y) }); face(pr.x, pr.z, 1, -0.2);
  P.E.inter = true; P.step(0.016); const e = P.EMPL_RUCHE[1]; out.ruche = !!e.ruche;
  let t0 = P.S.tuiles; P.step(0.1, 29); out.ruche29 = P.S.tuiles - t0; P.step(0.1, 2); out.ruche31 = P.S.tuiles - t0;
  P.S.credits = 600; Object.assign(J, { x: e.x + 2, z: e.z }); face(e.x, e.z, 1.6, 0); P.E.inter = true; P.step(0.016); out.niveau = e.ruche.niveau;
  e.ruche.t = 0; t0 = P.S.tuiles; P.step(0.1, 21); out.ruche2 = P.S.tuiles - t0;
  // Balise et fleur dorée (on maintient 2,5 s au pinceau).
  const b = P.BALISES.find((b) => [...Array(P.NT).keys()].some((k) => P.T.sorte[k] === 3 && P.T.secteur[k] === b.s));
  Object.assign(J, { x: b.x * 0.97, z: b.z * 0.97 }); face(b.x, b.z, 1.8, 0);
  const c2 = P.S.credits; P.E.inter = true; P.step(0.016); out.baliseGain = P.S.credits - c2; out.revelees = P.doreesRevelees.length;
  const d = P.doreesRevelees[0]; P.S.charge = 0; P.S.valeur = 0; P.changerOutil('pinceau'); out.prixDoree = P.ESPECES[P.T.couleur[d]].prix * 50;
  Object.assign(J, { x: P.T.x[d], z: P.T.z[d] + 2.2 }); face(P.T.x[d], P.T.z[d], 2.2, -0.62); P.E.action = true; P.step(0.1, 26); P.E.action = false; P.step(0.016);
  out.doree = P.S.valeur;
  P.figer = false; return out;
})()
