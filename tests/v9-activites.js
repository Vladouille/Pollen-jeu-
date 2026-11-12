// Scénario des activités de la v9, joué dans la page par tests/v9-smoke.mjs : chardons, graines et replantation,
// nectar, ruche (miel, cire, essaim échappé), Azurelle mère, irrigation, colis qui dévale.
(() => {
  const P = window.pollen, J = P.joueur, out = {}; P.figer = true;
  P.OUVERTS.value = 6; P.S.sac = P.sacVide();
  const face = (x, z, d, pitch) => { const a = Math.atan2(J.x - x, J.z - z); Object.assign(J, { x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, vx: 0, vz: 0, pitch }); J.y = P.H(J.x, J.z); J.yaw = Math.atan2(J.x - x, J.z - z); P.step(0.016, 2); };
  const viser = (i) => { Object.assign(J, { x: P.T.x[i], z: P.T.z[i] + 2.2 }); face(P.T.x[i], P.T.z[i], 2.2, -0.62); };
  const maintenir = (s) => { P.E.action = true; P.step(0.1, Math.round(s * 10)); P.E.action = false; P.step(0.016); };
  const outil = (o) => { if (!P.S.outils.includes(o)) P.S.outils.push(o); P.changerOutil(o); };
  // Chardons (brosse : 1,26 s).
  let i = -1; for (let k = 0; k < P.NT; k++) if (P.T.sorte[k] === 1) { i = k; break; }
  outil('brosse'); viser(i); const c0 = P.S.credits; maintenir(1.4); out.desherbe = P.T.sorte[i] === 0 && P.S.credits === c0 + 2;
  // Graines au râteau, puis replanter.
  let g = -1; for (let k = 0; k < P.NT; k++) if (P.pollinisable(k) && Math.hypot(P.T.x[k], P.T.z[k]) > 22) { g = k; break; }
  outil('rateau'); viser(g); maintenir(1.4); out.graines = P.S.sac.graines.kg === 0.5; out.nue = P.T.sorte[g] === 4; out.pollNue = P.pollinisable(g);
  maintenir(1.4); out.replante = P.T.sorte[g] === 0 && P.S.sac.graines.kg === 0;
  // Nectar sur une tuile en fleurs, une seule fois.
  let n = -1; for (let k = 0; k < P.NT; k++) if (P.T.vert[k] && Math.hypot(P.T.x[k], P.T.z[k]) > 16) { n = k; break; }
  outil('collecteur'); viser(n); maintenir(1.2); out.nectar = P.S.sac.nectar.kg === 0.25; maintenir(1.2); out.nectarUneFois = P.S.sac.nectar.kg === 0.25;
  // Ruche : achetée, posée ; améliorée ; miel et cire à l'enfumoir.
  P.S.credits = 400; const pr = P.PRESENTOIRS.find((p) => p.cle === 'ruche'); Object.assign(J, { x: pr.x + Math.sin(pr.g.rotation.y), z: pr.z + Math.cos(pr.g.rotation.y) }); face(pr.x, pr.z, 1, -0.2);
  P.E.inter = true; P.step(0.016); const e = P.EMPL_RUCHE.find((x) => x.ruche); out.ruche = !!e;
  P.S.credits = 600; Object.assign(J, { x: e.x + 2, z: e.z }); face(e.x, e.z, 1.6, 0); P.E.inter = true; P.step(0.016);
  P.ESSAIM.prochain = 1e9; P.step(0.5, 85);
  outil('enfumoir'); Object.assign(J, { x: e.x + 2.5, z: e.z }); face(e.x, e.z, 2.0, -0.72); maintenir(1.7);
  out.miel = P.S.sac.miel.kg; out.cire = P.S.sac.cire.kg;
  // L'essaim s'échappe ; la ruche s'arrête ; on le ramène.
  P.echapperEssaim(); out.essaimParti = P.ESSAIM.actif; out.rucheArretee = P.EMPL_RUCHE.some((x) => x.ruche && x.ruche.partie);
  P.step(0.1, 100); Object.assign(J, { x: P.ESSAIM.x + 3, z: P.ESSAIM.z }); face(P.ESSAIM.x, P.ESSAIM.z, 2.0, -0.72); maintenir(1.7); out.essaimRevenu = !P.ESSAIM.actif;
  // Azurelle mère (brosse, 3 s).
  let m = -1; for (let k = 0; k < P.NT; k++) if (P.T.sorte[k] === 3) { m = k; break; }
  P.S.sac = P.sacVide(); outil('brosse'); viser(m); maintenir(3.2); out.mere = P.T.sorte[m] === 0; out.mereSac = P.S.sac.mere.kg;
  // Irrigation.
  outil('tuyau'); face(P.POMPE.position.x, P.POMPE.position.z, 2.2, 0); P.E.inter = true; P.step(0.016);
  let a = -1; for (let k = 0; k < P.NT; k++) if (P.T.sorte[k] === 2 && Math.hypot(P.T.x[k] - J.x, P.T.z[k] - J.z) < 40) { a = k; break; }
  out.pollAvant = P.pollinisable(a);
  const x0 = J.x, z0 = J.z, nn = Math.ceil(Math.hypot(P.T.x[a] - x0, P.T.z[a] - z0) / 0.8);
  for (let k = 1; k <= nn; k++) { J.x = x0 + (P.T.x[a] - x0) * k / nn; J.z = z0 + (P.T.z[a] - z0) * k / nn; P.step(0.016); }
  out.irrigue = P.T.irrigue[a]; out.pollApres = P.pollinisable(a); P.E.inter = true; P.step(0.016);
  // Un colis posé sur une pente dévale.
  let best = null, bp = 0; for (let k = 0; k < 400; k++) { const x = (Math.random() - 0.5) * 100, z = (Math.random() - 0.5) * 100; if (Math.hypot(x, z) < 20 || Math.hypot(x, z) > 60) continue; const gx = (P.H(x + 0.3, z) - P.H(x - 0.3, z)) / 0.6, gz = (P.H(x, z + 0.3) - P.H(x, z - 0.3)) / 0.6, p = Math.hypot(gx, gz); if (p > bp) { bp = p; best = [x, z]; } }
  P.changerOutil('brosse'); P.S.sac = P.sacVide(); P.ajouter('pollen', 1, 6); Object.assign(J, { x: best[0], z: best[1] + 1.2, yaw: 0 }); J.y = P.H(J.x, J.z); P.step(0.016);
  P.E.inter = true; P.step(0.016); const c = P.COLIS[P.COLIS.length - 1], cx = c.x, cz = c.z; P.step(0.1, 50); out.devale = Math.hypot(c.x - cx, c.z - cz);
  P.figer = false; return out;
})()
