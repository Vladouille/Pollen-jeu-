
// =====================================================================
// 13. Les activités (étape 5) : désherber les chardons, irriguer les tuiles arides avec un tuyau
//     déroulé depuis la pompe, poser des ruches et récolter le miel, capturer les essaims sauvages
//     (une ruche gratuite), explorer : activer les balises de relevé révèle les fleurs dorées (50 fois le prix).
// =====================================================================
const PRIX_MIEL = 40;
const ECOUTE_ACT = { desherbe: [], miel: [] };   // abonnés (contrats, étape 6)

// --- Désherber : viser une tuile à chardons avec une brosse, maintenir : on arrache. ---
const brosseEnMain = () => !!OUTILS_DEF[outilEnMain].largeur;
ACTIONS.push({
  quand: (v) => brosseEnMain() && v && v.i >= 0 && T.sorte[v.i] === 1 && v.dist < 4,
  duree: 1.1, geste: 'arracher', texte: 'Maintenir · arracher les chardons',
  faire(v) { desherber(v.i); sons.arrache(); bouffee(T.x[v.i], H(T.x[v.i], T.z[v.i]), T.z[v.i], 14, 0x8c8794); S.credits += 2; gainAffiche(2); for (const f of ECOUTE_ACT.desherbe) f(v.i); },
});

// --- Irriguer : tuyau en main, on le branche à la pompe (E) et on marche : il se déroule derrière soi
//     (45 m au plus) et arrose les tuiles arides qu'il longe. E loin de la pompe le coupe ; il reste posé. ---
const SEG_MAX = 600, LONG_TUYAU = 45;
const segTuyau = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 8, 1, true).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: CHARTE.graphite, roughness: 0.5 }), SEG_MAX);
segTuyau.count = 0; segTuyau.receiveShadow = true; segTuyau.frustumCulled = false; scene.add(segTuyau);
const bagues = new THREE.InstancedMesh(new THREE.TorusGeometry(0.065, 0.018, 6, 12).rotateY(Math.PI / 2), M.pollen, SEG_MAX); bagues.count = 0; bagues.frustumCulled = false; scene.add(bagues);
const TUYAUX = [];   // { pts: [[x, z]...] } : les tuyaux posés (sauvegardés)
let tuyauCourant = null;
const SORTIE_POMPE = (() => { POMPE.updateMatrixWorld(true); const v = new THREE.Vector3(0.82, 0.5 + 0.49, 0.3).applyMatrix4(POMPE.matrixWorld); return [v.x, v.z]; })();
function segment(a, b) {   // un tronçon de tuyau posé au sol entre deux points, bague jaune à chaque jonction
  if (segTuyau.count >= SEG_MAX) return;
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  _m.compose(_p.set(mx, H(mx, mz) + 0.06, mz), _q.setFromEuler(_e.set(0, -Math.atan2(dz, dx), 0)), _s.set(l, 1, 1));
  segTuyau.setMatrixAt(segTuyau.count++, _m); segTuyau.instanceMatrix.needsUpdate = true;
  _m.compose(_p.set(b[0], H(b[0], b[1]) + 0.06, b[1]), _q, _s.set(1, 1, 1)); bagues.setMatrixAt(bagues.count++, _m); bagues.instanceMatrix.needsUpdate = true;
}
function arroser(x, z) {   // les tuiles arides à moins de 1,4 m du tuyau deviennent humides et pollinisables
  const [q0, r0] = versHex(x, z);
  for (let dq = -1; dq <= 1; dq++) for (let dr = -1; dr <= 1; dr++) { const i = idxDe(q0 + dq, r0 + dr); if (i < 0 || T.irrigue[i] || T.sorte[i] !== 2) continue; if (Math.hypot(T.x[i] - x, T.z[i] - z) > 1.6) continue; T.irrigue[i] = 1; ecrireTuile(i); bouffee(T.x[i], H(T.x[i], T.z[i]) - 0.2, T.z[i], 10, 0x6fb6ea); }
}
const longueur = (t) => { let l = 0; for (let k = 1; k < t.pts.length; k++) l += Math.hypot(t.pts[k][0] - t.pts[k - 1][0], t.pts[k][1] - t.pts[k - 1][1]); return l; };
INTER.push({ obj: POMPE, x: POMPE.position.x, z: POMPE.position.z, y: 3.0, r: 3.2, nom: 'Pompe',
  texte() { if (outilEnMain !== 'tuyau') return S.outils.includes('tuyau') ? 'Pompe · prends le tuyau (touche 6)' : 'Pompe · tuyau en vente au comptoir'; return tuyauCourant ? 'Couper le tuyau' : 'Brancher le tuyau'; },
  actif() { return outilEnMain === 'tuyau'; },
  agir() { if (outilEnMain !== 'tuyau') { sons.refus(); return; } if (tuyauCourant) { tuyauCourant = null; return; } tuyauCourant = { pts: [SORTIE_POMPE.slice()] }; TUYAUX.push(tuyauCourant); sons.achat(); message('Tuyau branché : marche jusqu’aux tuiles arides', 'gain'); } });
INTER_HORS.push(() => { if (!tuyauCourant) return false; tuyauCourant = null; message('Tuyau coupé : il reste posé et continue d’arroser'); return true; });
MAJ.push(() => {
  if (!tuyauCourant) return;
  if (outilEnMain !== 'tuyau') { tuyauCourant = null; return; }
  const t = tuyauCourant, d = t.pts[t.pts.length - 1], l = Math.hypot(joueur.x - d[0], joueur.z - d[1]);
  if (l < 1) return;
  if (longueur(t) + l > LONG_TUYAU) { tuyauCourant = null; message('Tuyau au bout : 45 m déroulés', 'alerte'); return; }
  const p = [joueur.x, joueur.z]; segment(d, p); t.pts.push(p); arroser(p[0], p[1]); arroser((p[0] + d[0]) / 2, (p[1] + d[1]) / 2);
});
CONTEXTES.push(() => tuyauCourant ? `<kbd>E</kbd>Tuyau branché · ${Math.round(longueur(tuyauCourant))} / ${LONG_TUYAU} m · E pour couper` : '');

// --- Les ruches : posées sur six emplacements autour de la station. Chacune pollinise autour d'elle
//     (une tuile toutes les 6 s dans un rayon de 9 m) et fait un pot de miel toutes les 45 s (6 au plus). ---
const EMPL_RUCHE = [0.35, 1.4, 2.45, 3.5, 4.55, 5.6].map((a) => { const x = Math.cos(a) * 23, z = Math.sin(a) * 23; return { x, z, ruche: null }; });
const M_CIRE = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb300, emissiveIntensity: 1.6 });
function fabriquerRuche() {   // corps blanc en trois hausses, toit graphite à liseré jaune, planche d'envol, fenêtre de cire
  const g = new THREE.Group(), base = socle(g, 0.7, 0.7);
  for (let k = 0; k < 3; k++) placer(g, boite(0.7, 0.3, 0.7, k === 1 ? M.panneau : M.blanc, 0.03), 0, base + 0.15 + k * 0.32, 0);
  for (let k = 0; k < 2; k++) placer(g, boite(0.74, 0.025, 0.74, M.graphite, 0.01), 0, base + 0.31 + k * 0.32, 0);
  placer(g, boite(0.86, 0.1, 0.86, M.graphite, 0.03), 0, base + 1.02, 0);
  placer(g, boite(0.88, 0.03, 0.88, M.pollen, 0.012), 0, base + 0.96, 0);
  placer(g, boite(0.4, 0.03, 0.14, M.pollen, 0.01), 0, base + 0.05, 0.42);                   // planche d'envol
  placer(g, boite(0.3, 0.04, 0.02, M.graphite, 0.01), 0, base + 0.09, 0.355);
  placer(g, boite(0.28, 0.12, 0.02, M_CIRE, 0.01), 0, base + 0.5, 0.355);                     // fenêtre : la cire luit quand il y a du miel
  return g;
}
const ABEILLES = 14, abeillesGeo = new THREE.BufferGeometry(), abeillesPos = new Float32Array(EMPL_RUCHE.length * ABEILLES * 3);
abeillesGeo.setAttribute('position', new THREE.BufferAttribute(abeillesPos, 3));
const abeilles = new THREE.Points(abeillesGeo, new THREE.PointsMaterial({ color: 0x3b2f12, size: 0.05 })); abeilles.frustumCulled = false; scene.add(abeilles);
for (const e of EMPL_RUCHE) {   // l'emplacement libre : une dalle hexagonale graphite au liseré jaune
  const d = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.08, 6), M.graphite); d.position.set(e.x, H(e.x, e.z) + 0.04, e.z); d.receiveShadow = true; scene.add(d);
  const l = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.97, 0.02, 6, 1, true), M.pollen); l.position.set(e.x, H(e.x, e.z) + 0.07, e.z); scene.add(l);
  e.dalle = d;
}
function installerRuche(e, sauvage = false) {
  const g = fabriquerRuche(); g.position.set(e.x, H(e.x, e.z), e.z); g.rotation.y = Math.atan2(-e.x, -e.z); scene.add(g);
  e.ruche = { g, pots: 0, tMiel: 0, tPoll: Math.random() * 6, sauvage }; OBSTACLES.push({ x: e.x, z: e.z, r: 0.8 });
  return e;
}
{ const p = PRESENTOIRS.find((p) => p.cle === 'ruche'), o = fabriquerRuche(); o.scale.setScalar(0.5); o.position.y = 0.96; p.g.remove(p.objet); p.g.add(o); p.objet = o; o.traverse((m) => { if (m.isMesh) m.userData.matOrigine = m.material; }); p.etat = ''; }   // une ruche miniature sur son présentoir
DEBLOQUE.add('tuyau'); DEBLOQUE.add('ruche');   // l'étape 6 les fera arriver avec la table des nouveautés
ACHAT.ruche = () => {
  const e = EMPL_RUCHE.find((e) => !e.ruche);
  if (!e) { S.credits += 600; message('Les six emplacements sont pris', 'alerte'); return; }
  installerRuche(e); message('Ruche posée : elle pollinise autour d’elle et fait du miel', 'gain');
};
for (const e of EMPL_RUCHE) INTER.push({ x: e.x, z: e.z, y: 2.0, r: 2.6, nom: 'Ruche', cache: () => !e.ruche,
  texte() { const n = e.ruche.pots; return n ? `Récolter le miel · ${n} pot${n > 1 ? 's' : ''}` : 'Ruche · le miel se fait'; },
  actif() { return e.ruche.pots > 0; },
  agir() { const n = e.ruche.pots; if (!n) { sons.refus(); return; } e.ruche.pots = 0; S.miel += n; sons.vente(); message(`+${n} pot${n > 1 ? 's' : ''} de miel : à vendre au collecteur`, 'gain'); for (const f of ECOUTE_ACT.miel) f(n); } });
VENTES.push({ qte: () => S.miel, libelle: (n) => `${n} pot${n > 1 ? 's' : ''} de miel`, prix: PRIX_MIEL, retirer() { S.miel = 0; } });
MAJ.push((dt) => {
  let k = 0;
  for (const e of EMPL_RUCHE) {
    const r = e.ruche;
    for (let b = 0; b < ABEILLES; b++, k++) {
      if (!r) { abeillesPos[k * 3 + 1] = -100; continue; }
      const a = gt * (1.2 + (b % 5) * 0.3) + b * 2.1, rr = 0.8 + (b % 4) * 0.5 + Math.sin(gt * 0.7 + b) * 0.3;
      abeillesPos.set([e.x + Math.cos(a) * rr, H(e.x, e.z) + 0.7 + Math.sin(a * 1.7 + b) * 0.4 + (b % 3) * 0.25, e.z + Math.sin(a) * rr], k * 3);
    }
    if (!r) continue;
    r.tMiel += dt; if (r.tMiel >= 45) { r.tMiel = 0; r.pots = Math.min(6, r.pots + 1); }
    r.tPoll += dt; if (r.tPoll >= 6) { r.tPoll = 0; const [q0, r0] = versHex(e.x, e.z); const c = []; for (let dq = -5; dq <= 5; dq++) for (let dr = -5; dr <= 5; dr++) { const i = idxDe(q0 + dq, r0 + dr); if (pollinisable(i) && T.sorte[i] !== 3 && Math.hypot(T.x[i] - e.x, T.z[i] - e.z) < 9) c.push(i); } if (c.length) polliniser(c[Math.floor(Math.random() * c.length)], 'ruche'); }
    r.g.children[r.g.children.length - 1].visible = r.pots > 0;
  }
  abeillesGeo.attributes.position.needsUpdate = true;
});

// --- Les essaims sauvages : un nuage d'abeilles se pose quelque part dans les champs (toutes les 2 à 4 min).
//     E à côté : capturé, il devient une ruche gratuite sur le premier emplacement libre. Il repart après 2 min. ---
const essaim = { actif: false, x: 0, z: 0, t: 0, prochain: 100 };
const NESS = 90, essaimPos = new Float32Array(NESS * 3), essaimGeo = new THREE.BufferGeometry(); essaimGeo.setAttribute('position', new THREE.BufferAttribute(essaimPos, 3));
const nuage = new THREE.Points(essaimGeo, new THREE.PointsMaterial({ color: 0x2b220c, size: 0.07 })); nuage.frustumCulled = false; nuage.visible = false; scene.add(nuage);
const ESSAIMS_ACTIFS = { v: true };   // coupé tant que les ruches ne sont pas débloquées (étape 6)
function lancerEssaim() {
  for (let n = 0; n < 50; n++) { const a = Math.random() * 6.283, d = 28 + Math.random() * 30, x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.hypot(x - joueur.x, z - joueur.z) > 15) { Object.assign(essaim, { actif: true, x, z, t: 120 }); message('Un essaim sauvage s’est posé dans les champs', 'evenement'); return; } }
}
MAJ.push((dt) => {
  if (!essaim.actif) { if (ESSAIMS_ACTIFS.v) { essaim.prochain -= dt; if (essaim.prochain <= 0) { essaim.prochain = 120 + Math.random() * 120; lancerEssaim(); } } nuage.visible = false; return; }
  essaim.t -= dt; if (essaim.t <= 0) { essaim.actif = false; message('L’essaim est reparti'); }
  nuage.visible = true; const y = H(essaim.x, essaim.z) + 1.2;
  for (let k = 0; k < NESS; k++) { const a = gt * (2 + (k % 7) * 0.4) + k, r = 0.3 + (k % 9) * 0.09 + Math.sin(gt * 3 + k) * 0.1; essaimPos.set([essaim.x + Math.cos(a) * r, y + Math.sin(a * 1.3 + k) * 0.45, essaim.z + Math.sin(a) * r], k * 3); }
  essaimGeo.attributes.position.needsUpdate = true;
});
INTER.push({ get x() { return essaim.x; }, get z() { return essaim.z; }, y: 2.2, r: 3, nom: 'Essaim sauvage', cache: () => !essaim.actif,
  texte: () => 'Capturer l’essaim · ruche gratuite', agir() {
    essaim.actif = false; sons.achat(); const e = EMPL_RUCHE.find((e) => !e.ruche);
    if (e) { installerRuche(e, true); message('Essaim capturé : une ruche de plus, gratuite', 'gain'); } else { S.credits += 300; gainAffiche(300); message('Plus d’emplacement : l’essaim est vendu 300 cr', 'gain'); }
  } });
MARQUEURS.push({ get x() { return essaim.x; }, get z() { return essaim.z; }, cls: 'essaim', actif: () => essaim.actif });
OBJECTIFS.push(() => essaim.actif && Math.hypot(essaim.x - joueur.x, essaim.z - joueur.z) < 30 ? { x: essaim.x, z: essaim.z, nom: 'Essaim' } : null);

// --- L'exploration : six balises de relevé au bord du terrain. Activée, une balise rapporte 100 cr
//     et révèle les fleurs dorées de son secteur (elles s'allument et apparaissent sur la boussole). ---
const BALISES = [];
for (let s = 0; s < NSECT; s++) {
  const a = (s + 0.5) / NSECT * Math.PI * 2, x = Math.cos(a) * 60, z = Math.sin(a) * 60, g = new THREE.Group(), base = socle(g, 0.6, 0.6);
  placer(g, tube(0.06, 0.08, 3.2, M.blanc), 0, base + 1.6, 0);
  for (let k = 0; k < 3; k++) placer(g, tube(0.085, 0.085, 0.06, M.graphite), 0, base + 0.6 + k * 1, 0);
  const feu = placer(g, new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: CHARTE.pollen, emissiveIntensity: 2.5 })), 0, base + 3.35, 0);
  placer(g, boite(0.5, 0.35, 0.06, M.graphite, 0.02), 0, base + 1.2, 0.1);
  g.position.set(x, H(x, z), z); g.rotation.y = Math.atan2(-x, -z); scene.add(g); OBSTACLES.push({ x, z, r: 0.6 });
  BALISES.push({ x, z, s, g, feu, active: false });
}
const doreesRevelees = [];
function activerBalise(b) {
  b.active = true; b.feu.material.emissive.set(CHARTE.seve); S.credits += 100; gainAffiche(100); sons.vente();
  let n = 0; for (const [i] of slotsDore) if (T.secteur[i] === b.s && T.sorte[i] === 3) { doreesRevelees.push(i); n++; }
  message(`Balise activée : ${n} fleur${n > 1 ? 's' : ''} dorée${n > 1 ? 's' : ''} révélée${n > 1 ? 's' : ''} dans le secteur ${b.s + 1}`, 'gain');
}
for (const b of BALISES) INTER.push({ x: b.x, z: b.z, y: 4.3, r: 2.6, nom: 'Balise de relevé', texte: () => b.active ? 'Balise active' : 'Activer la balise · +100 cr', actif: () => !b.active, agir() { if (!b.active) activerBalise(b); } });
for (const b of BALISES) MARQUEURS.push({ x: b.x, z: b.z, cls: '', actif: () => !b.active });
const doreeProche = () => { let best = 1e9, bi = -1; for (const i of doreesRevelees) if (T.sorte[i] === 3) { const d = (T.x[i] - joueur.x) ** 2 + (T.z[i] - joueur.z) ** 2; if (d < best) { best = d; bi = i; } } return bi; };
MARQUEURS.push({ get x() { const i = doreeProche(); return i >= 0 ? T.x[i] : 0; }, get z() { const i = doreeProche(); return i >= 0 ? T.z[i] : 0; }, cls: 'doree', actif: () => doreeProche() >= 0 });
// Les fleurs dorées pulsent ; une fois révélées, elles brillent plus fort.
MAJ.push(() => { dorees.material.emissiveIntensity = (doreesRevelees.length ? 1.6 : 0.9) + Math.sin(gt * 3) * 0.3; });
