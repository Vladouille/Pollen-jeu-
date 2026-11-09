
// =====================================================================
// 13. Les activités et les six ressources. Chaque geste se maintient, jauge au-dessus de la cible :
//     - chardons : arrachés avec une brosse (2 cr) ;
//     - graines : au râteau, sur une tuile fanée AVANT de la polliniser ; la tuile devient nue, il faudra la replanter
//       (râteau encore, 0,5 kg de graines) pour finir le secteur : vitesse ou valeur, un choix à chaque tuile ;
//     - nectar : au collecteur à main, sur une tuile déjà en fleurs (une fois par tuile) ;
//     - miel et cire : à l'enfumoir, sur une ruche (la cire seulement si la ruche est améliorée) ;
//     - Azurelles mères : isolées et luisantes, cueillies avec une brosse en 3 s ;
//     - irrigation : tuyau déroulé depuis la pompe. Balises : E, +100 cr.
// =====================================================================
const brosseEnMain = () => !!OUTILS_DEF[outilEnMain].largeur;
const PRIX_RES = { nectar: 1.2, graines: 0.6 };   // en multiples du prix de la tuile
ACTIONS.push({   // arracher les chardons
  quand: (v) => brosseEnMain() && v && v.i >= 0 && T.sorte[v.i] === 1 && ouvert(v.i) && v.dist < 4.6, geste: 'arracher',
  get duree() { return outilDef().duree * 0.7; },
  faire(v) { desherber(v.i); sons.arrache(); bouffee(T.x[v.i], H(T.x[v.i], T.z[v.i]), T.z[v.i], 14, 0x8c8794); S.credits += 2; },
});
ACTIONS.push({   // cueillir une Azurelle mère
  quand: (v) => brosseEnMain() && v && v.i >= 0 && T.sorte[v.i] === 3 && v.dist < 4.6 && place() >= 1, duree: 3, geste: 'arracher',
  faire(v) { ajouter('mere', 1, 120 * (T.variete[v.i] + 1)); cueillirMere(v.i); sons.vente(); bouffee(T.x[v.i], H(T.x[v.i], T.z[v.i]) + 0.4, T.z[v.i], 30, 0x8fb4ff); },
});
ACTIONS.push({   // ramasser les graines d'une tuile fanée
  quand: (v) => outilEnMain === 'rateau' && v && v.i >= 0 && ouvert(v.i) && !T.vert[v.i] && T.sorte[v.i] === 0 && v.dist < 4.6 && place() >= 0.5, duree: 1.2, geste: 'arracher',
  faire(v) { const i = v.i; ajouter('graines', 0.5, prixTuile(i) * PRIX_RES.graines); T.sorte[i] = 4; ecrireTuile(i); sons.arrache(); bouffee(T.x[i], H(T.x[i], T.z[i]), T.z[i], 12, 0x8a6a3a); },
});
ACTIONS.push({   // replanter une tuile nue (0,5 kg de graines)
  quand: (v) => outilEnMain === 'rateau' && v && v.i >= 0 && T.sorte[v.i] === 4 && v.dist < 4.6 && S.sac.graines.kg >= 0.5, duree: 1.2, geste: 'arracher',
  faire(v) { retirer('graines', 0.5); T.sorte[v.i] = 0; ecrireTuile(v.i); sons.pop(); },
});
ACTIONS.push({   // aspirer le nectar d'une tuile en fleurs
  quand: (v) => outilEnMain === 'collecteur' && v && v.i >= 0 && T.vert[v.i] && !T.nectar[v.i] && v.dist < 4.6 && place() >= 0.25, duree: 1.0,
  faire(v) { const i = v.i; ajouter('nectar', 0.25, prixTuile(i) * PRIX_RES.nectar); T.nectar[i] = 1; sons.pop(); bouffee(T.x[i], H(T.x[i], T.z[i]) + 0.2, T.z[i], 10, 0x9fd0ff); },
});
// Une cible « objet » : ce qu'on vise de près (ruche, panneau, machine, essaim), à moins de 1,6 m du point visé.
function objetVise(v, liste, r = 1.6) { if (!v) return null; let best = null, bd = r; for (const o of liste) { const d = Math.hypot(o.x - v.x, o.z - v.z); if (d < bd && Math.hypot(o.x - joueur.x, o.z - joueur.z) < 4) { bd = d; best = o; } } return best; }
// --- Irriguer : tuyau en main, E à la pompe le branche ; on marche et il se déroule derrière soi (45 m au plus),
//     arrosant les tuiles arides qu'il longe. E ailleurs le coupe ; il reste posé. ---
const SEG_MAX = 600, LONG_TUYAU = 45;
const segTuyau = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: CHARTE.graphite, roughness: 0.6 }), SEG_MAX);
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


// --- Les ruches : six emplacements autour de la station. Une ruche pollinise seule une tuile ouverte à moins de 10 m
//     toutes les 3 s (2 s, puis 1,2 s après amélioration : E sur la ruche ; le pollen est payé aussitôt), fait un pot
//     de miel (0,5 kg) toutes les 20 s et, améliorée, un pain de cire (0,25 kg) toutes les 40 s. On les prend à l'enfumoir.
//     Accident : de temps en temps un essaim s'échappe ; la ruche s'arrête tant qu'on ne l'a pas ramené (enfumoir ou brosse). ---
const RAYON_RUCHE = 10, DUREES_RUCHE = [3, 2, 1.2], PRIX_AMELIO_RUCHE = [600, 1500], PRIX_MIEL = 12, PRIX_CIRE = 18;
const EMPL_RUCHE = [0.35, 1.4, 2.45, 3.5, 4.55, 5.6].map((a) => { const x = Math.cos(a) * 24, z = Math.sin(a) * 24; return { x, z, ruche: null }; });
function fabriquerRuche() {   // corps à panneaux en trois hausses, toit graphite à liseré, planche d'envol, voyants de niveau
  const g = new THREE.Group(), base = socle(g, 0.7, 0.7);
  for (let k = 0; k < 3; k++) placer(g, boite(0.7, 0.3, 0.7, M.panneau, 0.03), 0, base + 0.15 + k * 0.32, 0);
  for (let k = 0; k < 2; k++) placer(g, boite(0.74, 0.025, 0.74, M.graphite, 0.01), 0, base + 0.31 + k * 0.32, 0);
  placer(g, boite(0.86, 0.1, 0.86, M.graphite, 0.03), 0, base + 1.02, 0);
  placer(g, boite(0.88, 0.03, 0.88, M.lisere, 0.012), 0, base + 0.96, 0);
  placer(g, boite(0.4, 0.03, 0.14, M.pollen, 0.01), 0, base + 0.05, 0.42);
  placer(g, boite(0.3, 0.04, 0.02, M.graphite, 0.01), 0, base + 0.09, 0.355);
  g.userData.voyants = [0, 1, 2].map((k) => { const v = placer(g, boite(0.07, 0.07, 0.02, M.graphite, 0.01), -0.12 + k * 0.12, base + 0.82, 0.355); v.userData.garder = true; return v; });
  return fusionner(g);
}
const ABEILLES = 14, abeillesGeo = new THREE.BufferGeometry(), abeillesPos = new Float32Array(EMPL_RUCHE.length * ABEILLES * 3);
abeillesGeo.setAttribute('position', new THREE.BufferAttribute(abeillesPos, 3));
const abeilles = new THREE.Points(abeillesGeo, new THREE.PointsMaterial({ color: 0x3b2f12, size: 0.05 })); abeilles.frustumCulled = false; scene.add(abeilles);
{ const g = new THREE.Group();   // les emplacements : une dalle hexagonale graphite au liseré jaune
  for (const e of EMPL_RUCHE) { placer(g, cylindre(0.9, 0.95, 0.08, M.graphite, 6), e.x, H(e.x, e.z) + 0.04, e.z); placer(g, cylindre(0.97, 0.97, 0.02, M.pollen, 6), e.x, H(e.x, e.z) + 0.07, e.z); }
  scene.add(fusionner(g)); }
function installerRuche(e, niveau = 0) {
  const g = fabriquerRuche(); g.position.set(e.x, assise(e.x, e.z, 0.7), e.z); g.rotation.y = Math.atan2(-e.x, -e.z); scene.add(g); ombreContact(g, 0.9);
  e.ruche = { g, niveau, t: 0, miel: 0, cire: 0, tMiel: 0, tCire: 0, partie: false }; OBSTACLES.push({ x: e.x, z: e.z, r: 0.8 });
  return e;
}
function tuileProcheRuche(e) {
  const [q0, r0] = versHex(e.x, e.z), c = [];
  for (let dq = -7; dq <= 7; dq++) for (let dr = -7; dr <= 7; dr++) { const i = idxDe(q0 + dq, r0 + dr); if (pollinisable(i) && Math.hypot(T.x[i] - e.x, T.z[i] - e.z) < RAYON_RUCHE) c.push(i); }
  return c.length ? c[Math.floor(Math.random() * c.length)] : -1;
}
{ const p = PRESENTOIRS.find((p) => p.cle === 'ruche'), o = fabriquerRuche(); o.scale.setScalar(0.5); o.position.y = 0.96; o.userData.garder = true; p.g.remove(p.objet); p.g.add(o); p.objet = o; o.traverse((m) => { if (m.isMesh) m.userData.matOrigine = m.material; }); p.etat = ''; }
ACHAT.ruche = (p) => { const e = EMPL_RUCHE.find((e) => !e.ruche); if (!e) { S.credits += p.prix; sons.refus(); return; } installerRuche(e); };
for (const e of EMPL_RUCHE) INTER.push({ x: e.x, z: e.z, r: 2.6, cache: () => !e.ruche, agir() {   // E : améliorer la ruche
  const n = e.ruche.niveau; if (n >= 2 || S.credits < PRIX_AMELIO_RUCHE[n]) { sons.refus(); return; }
  S.credits -= PRIX_AMELIO_RUCHE[n]; e.ruche.niveau++; sons.achat(); sauverBientot(); } });
const ruchesPosees = () => EMPL_RUCHE.filter((e) => e.ruche);
ACTIONS.push({   // enfumer une ruche : on prend son miel et sa cire
  quand: (v) => outilEnMain === 'enfumoir' && !!objetVise(v, ruchesPosees()) && (objetVise(v, ruchesPosees()).ruche.miel + objetVise(v, ruchesPosees()).ruche.cire) > 0,
  duree: 1.5, objet: (v) => { const e = objetVise(v, ruchesPosees()); return new THREE.Vector3(e.x, H(e.x, e.z) + 1.7, e.z); },
  faire(v) {
    const e = objetVise(v, ruchesPosees()), r = e.ruche;
    while (r.miel > 0 && place() >= 0.5) { r.miel--; ajouter('miel', 0.5, PRIX_MIEL * 0.5 * 2); }
    while (r.cire > 0 && place() >= 0.25) { r.cire--; ajouter('cire', 0.25, PRIX_CIRE); }
    sons.vente(); bouffee(e.x, H(e.x, e.z) + 0.8, e.z, 30, 0xd8d8d8);
  },
});
// L'essaim échappé : un nuage qui va se poser plus loin. On le ramène en le visant (enfumoir ou brosse), 1,5 s.
const ESSAIM = { actif: false, e: null, x: 0, z: 0, tx: 0, tz: 0, prochain: 360 + Math.random() * 180 };
const NESS = 90, essaimPos = new Float32Array(NESS * 3), essaimGeo = new THREE.BufferGeometry(); essaimGeo.setAttribute('position', new THREE.BufferAttribute(essaimPos, 3));
const nuage = new THREE.Points(essaimGeo, new THREE.PointsMaterial({ color: 0x2b220c, size: 0.07 })); nuage.frustumCulled = false; nuage.visible = false; scene.add(nuage);
function echapperEssaim() {
  const l = ruchesPosees().filter((e) => !e.ruche.partie); if (!l.length) return false;
  const e = l[Math.floor(Math.random() * l.length)], a = Math.random() * 6.283, d = 14 + Math.random() * 10;
  Object.assign(ESSAIM, { actif: true, e, x: e.x, z: e.z, tx: clamp(e.x + Math.cos(a) * d, -55, 55), tz: clamp(e.z + Math.sin(a) * d, -55, 55) }); e.ruche.partie = true; return true;
}
ACTIONS.push({
  quand: (v) => ESSAIM.actif && (outilEnMain === 'enfumoir' || brosseEnMain()) && !!objetVise(v, [ESSAIM], 2.2), duree: 1.5,
  objet: () => new THREE.Vector3(ESSAIM.x, H(ESSAIM.x, ESSAIM.z) + 1.5, ESSAIM.z),
  faire() { ESSAIM.e.ruche.partie = false; ESSAIM.actif = false; sons.achat(); },
});
MAJ.push((dt) => {
  let k = 0;
  for (const e of EMPL_RUCHE) {
    const r = e.ruche;
    for (let b = 0; b < ABEILLES; b++, k++) {
      if (!r || r.partie) { abeillesPos[k * 3 + 1] = -100; continue; }
      const a = gt * (1.2 + (b % 5) * 0.3) * (1 + r.niveau * 0.4) + b * 2.1, rr = 0.8 + (b % 4) * 0.5 + Math.sin(gt * 0.7 + b) * 0.3;
      abeillesPos.set([e.x + Math.cos(a) * rr, H(e.x, e.z) + 0.7 + Math.sin(a * 1.7 + b) * 0.4 + (b % 3) * 0.25, e.z + Math.sin(a) * rr], k * 3);
    }
    if (!r || r.partie) continue;
    r.t += dt; if (r.t >= DUREES_RUCHE[r.niveau]) { r.t = 0; const i = tuileProcheRuche(e); if (i >= 0) S.credits += polliniser(i, 'ruche'); }
    r.tMiel += dt; if (r.tMiel >= 20) { r.tMiel = 0; r.miel = Math.min(6, r.miel + 1); }
    if (r.niveau >= 1) { r.tCire += dt; if (r.tCire >= 40) { r.tCire = 0; r.cire = Math.min(4, r.cire + 1); } }
    r.g.userData.voyants.forEach((v, n) => { v.material = n <= r.niveau ? M.seve : M.graphite; });
  }
  abeillesGeo.attributes.position.needsUpdate = true;
  // L'essaim : il s'envole vers son point de chute, puis tourne en boule.
  if (!ESSAIM.actif) { ESSAIM.prochain -= dt; if (ESSAIM.prochain <= 0) { ESSAIM.prochain = 360 + Math.random() * 180; echapperEssaim(); } nuage.visible = false; return; }
  ESSAIM.x = lerp(ESSAIM.x, ESSAIM.tx, 1 - Math.exp(-dt * 0.4)); ESSAIM.z = lerp(ESSAIM.z, ESSAIM.tz, 1 - Math.exp(-dt * 0.4));
  nuage.visible = true; const y = H(ESSAIM.x, ESSAIM.z) + 1.4;
  for (let n = 0; n < NESS; n++) { const a = gt * (2 + (n % 7) * 0.4) + n, rr = 0.3 + (n % 9) * 0.09 + Math.sin(gt * 3 + n) * 0.1; essaimPos.set([ESSAIM.x + Math.cos(a) * rr, y + Math.sin(a * 1.3 + n) * 0.45, ESSAIM.z + Math.sin(a) * rr], n * 3); }
  essaimGeo.attributes.position.needsUpdate = true;
});

// --- L'exploration : six balises au bord du terrain. E : +100 cr, le feu passe au vert. ---
const BALISES = [];
for (let s = 0; s < NSECT; s++) {
  const a = (s + 0.5) / NSECT * Math.PI * 2, x = Math.cos(a) * 60, z = Math.sin(a) * 60, g = new THREE.Group(), base = socle(g, 0.6, 0.6);
  placer(g, tube(0.06, 0.08, 3.2, M.blanc), 0, base + 1.6, 0);
  for (let k = 0; k < 3; k++) placer(g, tube(0.085, 0.085, 0.06, M.graphite), 0, base + 0.6 + k * 1, 0);
  const feu = placer(g, new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: CHARTE.pollen, emissiveIntensity: 2.5 })), 0, base + 3.35, 0);
  placer(g, boite(0.5, 0.35, 0.06, M.graphite, 0.02), 0, base + 1.2, 0.1);
  fusionner(g); g.position.set(x, assise(x, z, 0.65), z); g.rotation.y = Math.atan2(-x, -z); scene.add(g); ombreContact(g, 0.8); OBSTACLES.push({ x, z, r: 0.6 });
  BALISES.push({ x, z, s, g, feu, active: false });
}
function activerBalise(b, payer = true) { b.active = true; b.feu.material.emissive.set(CHARTE.seve); if (payer) { S.credits += 100; sons.vente(); } }
for (const b of BALISES) INTER.push({ x: b.x, z: b.z, r: 2.6, agir() { if (!b.active) activerBalise(b); } });

// --- Les colis : sac plein, E (sans rien à utiliser devant soi) l'emballe et le pose au sol devant soi.
//     E près d'un colis le prend à bras-le-corps (on ne peut plus travailler, on marche moins vite) ;
//     E au collecteur le vend, E au bout d'un tapis ou sur un quai l'y dépose (ses ressources partent en capsules),
//     E ailleurs le repose. Accident : posé sur une pente, un colis dévale jusqu'au replat. ---
const COLIS = [], M_COLIS = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, map: texPanneaux(2, 1, [0.45]) });
let porte = null;
function fabriquerColis() { const g = new THREE.Group(); placer(g, boite(0.5, 0.42, 0.5, M_COLIS, 0.05), 0, 0.21, 0); placer(g, boite(0.52, 0.06, 0.52, M.lisere, 0.02), 0, 0.3, 0); placer(g, boite(0.2, 0.05, 0.08, M.graphite, 0.02), 0, 0.44, 0); return g; }
function emballer() {
  if (kgSac() <= 0) return false;
  const fx = -Math.sin(joueur.yaw), fz = -Math.cos(joueur.yaw), x = joueur.x + fx * 1.2, z = joueur.z + fz * 1.2;
  const c = { contenu: S.sac, x, z, vx: 0, vz: 0, g: fabriquerColis() }; S.sac = sacVide();
  c.g.position.set(x, H(x, z), z); scene.add(c.g); c.ombre = ombreContact(c.g, 0.45, true); COLIS.push(c); sons.achat(); return true;
}
function prendreColis(c) { porte = c; scene.remove(c.g); c.ombre.visible = false; COLIS.splice(COLIS.indexOf(c), 1); vue.visible = false; joueur.lent = 0.75; sons.pop(); }
function poserColis() { const c = porte; porte = null; joueur.lent = 1; const fx = -Math.sin(joueur.yaw), fz = -Math.cos(joueur.yaw); c.x = joueur.x + fx * 1.2; c.z = joueur.z + fz * 1.2; c.vx = c.vz = 0; c.g.position.set(c.x, H(c.x, c.z), c.z); scene.add(c.g); c.ombre.visible = true; COLIS.push(c); }
const colisCible = () => COLIS.map((c) => ({ x: c.x, z: c.z, c })).filter((o) => Math.hypot(o.x - joueur.x, o.z - joueur.z) < 2.2);
INTER_HORS.push(() => {   // E sans cible : poser le colis porté, ou en prendre un proche, ou emballer le sac
  if (porte) { if (DEPOSER_COLIS.some((f) => f(porte))) { porte = null; joueur.lent = 1; return true; } poserColis(); return true; }
  const proche = colisCible().sort((a, b) => Math.hypot(a.x - joueur.x, a.z - joueur.z) - Math.hypot(b.x - joueur.x, b.z - joueur.z))[0];
  if (proche) { prendreColis(proche.c); return true; }
  return emballer();
});
const DEPOSER_COLIS = [];   // l'automatisation y ajoute : déposer sur un tapis ou un quai
{ const it = INTER.find((it) => it.obj === COLLECTEUR), a0 = it.agir; it.agir = () => { if (porte) { const v = valeurSac(porte.contenu); porte = null; joueur.lent = 1; vendre(v); return; } a0(); }; }
MAJ.push((dt) => {
  vue.visible = !porte && !joueur.enVehicule;
  for (const c of COLIS) {   // la pente fait rouler les colis
    const e = 0.3, gx = (H(c.x + e, c.z) - H(c.x - e, c.z)) / (2 * e), gz = (H(c.x, c.z + e) - H(c.x, c.z - e)) / (2 * e), pente = Math.hypot(gx, gz);
    if (pente > 0.035) { c.vx -= gx * 9 * dt; c.vz -= gz * 9 * dt; }
    c.vx *= Math.exp(-dt * 0.8); c.vz *= Math.exp(-dt * 0.8);
    if (Math.hypot(c.vx, c.vz) < 0.05 && pente <= 0.035) { c.vx = c.vz = 0; continue; }
    c.x += c.vx * dt; c.z += c.vz * dt;
    { const r = repousser(c.x, c.z, 0.3); if (r.touche) { c.x = r.x; c.z = r.z; c.vx *= -0.4; c.vz *= -0.4; } }
    const d0 = Math.hypot(c.x, c.z); if (d0 > RAYON - 1) { c.x *= (RAYON - 1) / d0; c.z *= (RAYON - 1) / d0; c.vx = c.vz = 0; }
    c.g.position.set(c.x, H(c.x, c.z), c.z); c.g.rotation.x += c.vz * dt * 2; c.g.rotation.z -= c.vx * dt * 2;
  }
});
