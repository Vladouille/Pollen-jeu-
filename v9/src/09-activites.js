
// =====================================================================
// 13. Les activités, toutes immédiates : arracher les chardons d'une pression, irriguer les tuiles arides
//     avec un tuyau déroulé depuis la pompe, poser une ruche (elle met en fleurs tout son voisinage d'un coup),
//     activer les balises de relevé (elles font briller les fleurs dorées de leur secteur, 50 fois le prix).
// =====================================================================
// --- Désherber : viser une tuile à chardons avec une brosse et presser : arrachés. ---
const brosseEnMain = () => !!OUTILS_DEF[outilEnMain].largeur;
ACTIONS.push({
  quand: (v) => brosseEnMain() && v && v.i >= 0 && T.sorte[v.i] === 1 && v.dist < 4.6, geste: 'arracher',
  faire(v) { desherber(v.i); sons.arrache(); bouffee(T.x[v.i], H(T.x[v.i], T.z[v.i]), T.z[v.i], 14, 0x8c8794); S.credits += 2; },
});

// --- Irriguer : tuyau en main, E à la pompe le branche ; on marche et il se déroule derrière soi (45 m au plus),
//     arrosant les tuiles arides qu'il longe. E ailleurs le coupe ; il reste posé. ---
const SEG_MAX = 600, LONG_TUYAU = 45;
const segTuyau = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 8, 1, true).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: CHARTE.graphite, roughness: 0.6 }), SEG_MAX);
segTuyau.count = 0; segTuyau.receiveShadow = true; segTuyau.frustumCulled = false; scene.add(segTuyau);
const bagues = new THREE.InstancedMesh(new THREE.TorusGeometry(0.065, 0.018, 6, 12).rotateY(Math.PI / 2), M.pollen, SEG_MAX); bagues.count = 0; bagues.frustumCulled = false; scene.add(bagues);
const TUYAUX = [];   // { pts: [[x, z]...] } : les tuyaux posés (sauvegardés)
let tuyauCourant = null;
const SORTIE_POMPE = (() => { POMPE.updateMatrixWorld(true); const v = new THREE.Vector3(0.82, 0.99, 0.3).applyMatrix4(POMPE.matrixWorld); return [v.x, v.z]; })();
function segment(a, b) {   // un tronçon posé au sol entre deux points, bague jaune à chaque jonction
  if (segTuyau.count >= SEG_MAX) return;
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  _m.compose(_p.set(mx, H(mx, mz) + 0.06, mz), _q.setFromEuler(_e.set(0, -Math.atan2(dz, dx), 0)), _s.set(l, 1, 1));
  segTuyau.setMatrixAt(segTuyau.count++, _m); segTuyau.instanceMatrix.needsUpdate = true;
  _m.compose(_p.set(b[0], H(b[0], b[1]) + 0.06, b[1]), _q, _s.set(1, 1, 1)); bagues.setMatrixAt(bagues.count++, _m); bagues.instanceMatrix.needsUpdate = true;
}
function arroser(x, z) {   // les tuiles arides à moins de 1,6 m du tuyau deviennent humides et pollinisables
  const [q0, r0] = versHex(x, z);
  for (let dq = -1; dq <= 1; dq++) for (let dr = -1; dr <= 1; dr++) { const i = idxDe(q0 + dq, r0 + dr); if (i < 0 || T.irrigue[i] || T.sorte[i] !== 2) continue; if (Math.hypot(T.x[i] - x, T.z[i] - z) > 1.6) continue; T.irrigue[i] = 1; ecrireTuile(i); bouffee(T.x[i], H(T.x[i], T.z[i]) - 0.2, T.z[i], 10, 0x6fb6ea); }
}
const longueur = (t) => { let l = 0; for (let k = 1; k < t.pts.length; k++) l += Math.hypot(t.pts[k][0] - t.pts[k - 1][0], t.pts[k][1] - t.pts[k - 1][1]); return l; };
INTER.push({ obj: POMPE, x: POMPE.position.x, z: POMPE.position.z, r: 3.2,
  agir() { if (outilEnMain !== 'tuyau') { sons.refus(); return; } if (tuyauCourant) { tuyauCourant = null; return; } tuyauCourant = { pts: [SORTIE_POMPE.slice()] }; TUYAUX.push(tuyauCourant); sons.achat(); } });
INTER_HORS.push(() => { if (!tuyauCourant) return false; tuyauCourant = null; return true; });
MAJ.push(() => {
  if (!tuyauCourant) return;
  if (outilEnMain !== 'tuyau') { tuyauCourant = null; return; }
  const t = tuyauCourant, d = t.pts[t.pts.length - 1], l = Math.hypot(joueur.x - d[0], joueur.z - d[1]);
  if (l < 1) return;
  if (longueur(t) + l > LONG_TUYAU) { tuyauCourant = null; sons.refus(); return; }
  const p = [joueur.x, joueur.z]; segment(d, p); t.pts.push(p); arroser(p[0], p[1]); arroser((p[0] + d[0]) / 2, (p[1] + d[1]) / 2);
});

// --- Les ruches : six emplacements autour de la station. Posée, une ruche met en fleurs d'un coup toutes les
//     tuiles pollinisables à moins de 10 m, et leur pollen est payé aussitôt. Les abeilles restent autour. ---
const RAYON_RUCHE = 10;
const EMPL_RUCHE = [0.35, 1.4, 2.45, 3.5, 4.55, 5.6].map((a) => { const x = Math.cos(a) * 24, z = Math.sin(a) * 24; return { x, z, ruche: null }; });
function fabriquerRuche() {   // corps blanc en trois hausses, toit graphite à liseré jaune, planche d'envol
  const g = new THREE.Group(), base = socle(g, 0.7, 0.7);
  for (let k = 0; k < 3; k++) placer(g, boite(0.7, 0.3, 0.7, k === 1 ? M.panneau : M.blanc, 0.03), 0, base + 0.15 + k * 0.32, 0);
  for (let k = 0; k < 2; k++) placer(g, boite(0.74, 0.025, 0.74, M.graphite, 0.01), 0, base + 0.31 + k * 0.32, 0);
  placer(g, boite(0.86, 0.1, 0.86, M.graphite, 0.03), 0, base + 1.02, 0);
  placer(g, boite(0.88, 0.03, 0.88, M.pollen, 0.012), 0, base + 0.96, 0);
  placer(g, boite(0.4, 0.03, 0.14, M.pollen, 0.01), 0, base + 0.05, 0.42);
  placer(g, boite(0.3, 0.04, 0.02, M.graphite, 0.01), 0, base + 0.09, 0.355);
  return fusionner(g);
}
const ABEILLES = 14, abeillesGeo = new THREE.BufferGeometry(), abeillesPos = new Float32Array(EMPL_RUCHE.length * ABEILLES * 3);
abeillesGeo.setAttribute('position', new THREE.BufferAttribute(abeillesPos, 3));
const abeilles = new THREE.Points(abeillesGeo, new THREE.PointsMaterial({ color: 0x3b2f12, size: 0.05 })); abeilles.frustumCulled = false; scene.add(abeilles);
{ const g = new THREE.Group();   // les emplacements : une dalle hexagonale graphite au liseré jaune
  for (const e of EMPL_RUCHE) { placer(g, new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.08, 6), M.graphite), e.x, H(e.x, e.z) + 0.04, e.z); placer(g, new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.97, 0.02, 6, 1, true), M.pollen), e.x, H(e.x, e.z) + 0.07, e.z); }
  scene.add(fusionner(g)); }
function installerRuche(e, pollinise = true) {
  const g = fabriquerRuche(); g.position.set(e.x, H(e.x, e.z), e.z); g.rotation.y = Math.atan2(-e.x, -e.z); scene.add(g);
  e.ruche = { g }; OBSTACLES.push({ x: e.x, z: e.z, r: 0.8 });
  if (!pollinise) return 0;
  let cr = 0; const [q0, r0] = versHex(e.x, e.z);
  for (let dq = -7; dq <= 7; dq++) for (let dr = -7; dr <= 7; dr++) { const i = idxDe(q0 + dq, r0 + dr); if (i >= 0 && T.sorte[i] !== 3 && Math.hypot(T.x[i] - e.x, T.z[i] - e.z) < RAYON_RUCHE) cr += polliniser(i, 'ruche'); }
  S.credits += Math.round(cr); return cr;
}
{ const p = PRESENTOIRS.find((p) => p.cle === 'ruche'), o = fabriquerRuche(); o.scale.setScalar(0.5); o.position.y = 0.96; o.userData.garder = true; p.g.remove(p.objet); p.g.add(o); p.objet = o; o.traverse((m) => { if (m.isMesh) m.userData.matOrigine = m.material; }); p.etat = ''; }   // une ruche miniature sur son présentoir
ACHAT.ruche = (p) => { const e = EMPL_RUCHE.find((e) => !e.ruche); if (!e) { S.credits += p.prix; sons.refus(); return; } installerRuche(e); };
MAJ.push(() => {
  let k = 0;
  for (const e of EMPL_RUCHE) for (let b = 0; b < ABEILLES; b++, k++) {
    if (!e.ruche) { abeillesPos[k * 3 + 1] = -100; continue; }
    const a = gt * (1.2 + (b % 5) * 0.3) + b * 2.1, rr = 0.8 + (b % 4) * 0.5 + Math.sin(gt * 0.7 + b) * 0.3;
    abeillesPos.set([e.x + Math.cos(a) * rr, H(e.x, e.z) + 0.7 + Math.sin(a * 1.7 + b) * 0.4 + (b % 3) * 0.25, e.z + Math.sin(a) * rr], k * 3);
  }
  abeillesGeo.attributes.position.needsUpdate = true;
});

// --- L'exploration : six balises au bord du terrain. E : +100 cr, et les fleurs dorées de son secteur s'allument. ---
const BALISES = [];
for (let s = 0; s < NSECT; s++) {
  const a = (s + 0.5) / NSECT * Math.PI * 2, x = Math.cos(a) * 60, z = Math.sin(a) * 60, g = new THREE.Group(), base = socle(g, 0.6, 0.6);
  placer(g, tube(0.06, 0.08, 3.2, M.blanc), 0, base + 1.6, 0);
  for (let k = 0; k < 3; k++) placer(g, tube(0.085, 0.085, 0.06, M.graphite), 0, base + 0.6 + k * 1, 0);
  const feu = placer(g, new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: CHARTE.pollen, emissiveIntensity: 2.5 })), 0, base + 3.35, 0);
  placer(g, boite(0.5, 0.35, 0.06, M.graphite, 0.02), 0, base + 1.2, 0.1);
  fusionner(g); g.position.set(x, H(x, z), z); g.rotation.y = Math.atan2(-x, -z); scene.add(g); OBSTACLES.push({ x, z, r: 0.6 });
  BALISES.push({ x, z, s, g, feu, active: false });
}
const doreesRevelees = [];
function activerBalise(b, payer = true) {
  b.active = true; b.feu.material.emissive.set(CHARTE.seve);
  if (payer) { S.credits += 100; sons.vente(); }
  for (const [i] of slotsDore) if (T.secteur[i] === b.s && T.sorte[i] === 3) doreesRevelees.push(i);
}
for (const b of BALISES) INTER.push({ x: b.x, z: b.z, r: 2.6, agir() { if (!b.active) activerBalise(b); } });
MAJ.push(() => { dorees.material.emissiveIntensity = (doreesRevelees.length ? 1.6 : 0.9) + Math.sin(gt * 3) * 0.3; });   // les dorées pulsent
