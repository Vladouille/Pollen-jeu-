// Scénario de l’étape 5 de la v9, joué dans la page par tests/v9-smoke.mjs : désherber, irriguer, ruche et miel, essaim, balise et fleur dorée.
(() => {
  const P = window.pollen, J = P.joueur, out = {}; P.figer = true;
  P.DEBLOQUE.add('tuyau'); P.DEBLOQUE.add('ruche');   // sans attendre 8 et 16 minutes de jeu
  const face = (x, z, d, pitch) => { const a = Math.atan2(J.x - x, J.z - z); Object.assign(J, { x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, vx: 0, vz: 0, pitch }); J.y = P.H(J.x, J.z); J.yaw = Math.atan2(J.x - x, J.z - z); P.step(0.016, 2); };
  // désherber
  let i = -1; for (let k = 0; k < P.NT; k++) if (P.T.sorte[k] === 1) { i = k; break; }
  Object.assign(J, { x: P.T.x[i], z: P.T.z[i] + 2.2 }); face(P.T.x[i], P.T.z[i], 2.2, -0.62);
  out.badgeChardon = document.getElementById('contexte').textContent;
  const c0 = P.S.credits; P.E.action = true; P.step(0.1, 14); P.E.action = false; P.step(0.016);
  out.desherbe = P.T.sorte[i] === 0 && P.S.credits === c0 + 2;
  // irriguer
  P.S.outils.push('tuyau'); P.changerOutil('tuyau');
  face(P.POMPE.position.x, P.POMPE.position.z, 2.2, 0); out.pompe = P.interVise && P.interVise.texte();
  P.E.inter = true; P.step(0.016);
  let a = -1; for (let k = 0; k < P.NT; k++) if (P.T.sorte[k] === 2 && Math.hypot(P.T.x[k] - J.x, P.T.z[k] - J.z) < 40) { a = k; break; }
  out.aride = a; out.pollAvant = P.pollinisable(a);
  const x0 = J.x, z0 = J.z, n = Math.ceil(Math.hypot(P.T.x[a] - x0, P.T.z[a] - z0) / 0.8);
  for (let k = 1; k <= n; k++) { J.x = x0 + (P.T.x[a] - x0) * k / n; J.z = z0 + (P.T.z[a] - z0) * k / n; P.step(0.016); }
  out.irrigue = P.T.irrigue[a]; out.pollApres = P.pollinisable(a); out.tuyau = P.TUYAUX[0] && P.TUYAUX[0].pts.length;
  P.E.inter = true; P.step(0.016);
  // ruche
  P.S.credits = 700; const pr = P.PRESENTOIRS.find((p) => p.cle === 'ruche'); Object.assign(J, { x: pr.x + Math.sin(pr.g.rotation.y), z: pr.z + Math.cos(pr.g.rotation.y) }); face(pr.x, pr.z, 1, -0.2);
  out.achatRuche = P.interVise && P.interVise.texte(); P.E.inter = true; P.step(0.016);
  const e = P.EMPL_RUCHE[0]; out.ruche = !!e.ruche; const t0 = P.S.tuiles;
  P.step(0.5, 95); out.pots = e.ruche.pots; out.pollRuche = P.S.tuiles - t0;
  Object.assign(J, { x: e.x + 3, z: e.z }); face(e.x, e.z, 1.8, -0.1); out.recolte = P.interVise && P.interVise.texte(); P.E.inter = true; P.step(0.016); out.miel = P.S.miel;
  face(P.COLLECTEUR.position.x, P.COLLECTEUR.position.z, 2.6, 0); out.vente = P.interVise && P.interVise.texte(); const c1 = P.S.credits; P.E.inter = true; P.step(0.016); out.gainMiel = P.S.credits - c1;
  // essaim
  P.lancerEssaim(); const s = P.essaim; out.essaim = s.actif; Object.assign(J, { x: s.x + 2, z: s.z }); face(s.x, s.z, 1.5, 0); out.capt = P.interVise && P.interVise.texte(); P.E.inter = true; P.step(0.016);
  out.ruches = P.EMPL_RUCHE.filter((e) => e.ruche).length;
  // balise et fleur dorée
  const b = P.BALISES.find((b) => [...Array(P.NT).keys()].some((k) => P.T.sorte[k] === 3 && P.T.secteur[k] === b.s));
  Object.assign(J, { x: b.x * 0.97, z: b.z * 0.97 }); face(b.x, b.z, 1.8, 0); out.balise = P.interVise && P.interVise.texte();
  const c2 = P.S.credits; P.E.inter = true; P.step(0.016); out.baliseGain = P.S.credits - c2; out.revelees = P.doreesRevelees.length;
  const d = P.doreesRevelees[0]; P.S.charge = 0; P.S.valeur = 0; P.changerOutil('pinceau');
  Object.assign(J, { x: P.T.x[d], z: P.T.z[d] + 2.2 }); face(P.T.x[d], P.T.z[d], 2.2, -0.62); P.E.action = true; P.step(0.1, 26); P.E.action = false; P.step(0.016);
  out.doree = P.S.valeur;
  P.figer = false;
  return out;
})()
