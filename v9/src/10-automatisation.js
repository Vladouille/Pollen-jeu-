
// =====================================================================
// 14. L'automatisation (étape 6) : l'outil de construction pose des pièces sur une grille de 2 m.
//     Convoyeurs (des capsules y roulent), extracteur (2 kg de pollen → 1 pot de miel, sur-le-champ), maturateur
//     (miel → miel de cru, sur-le-champ), quai d'expédition (vend ce qui arrive). Tout est en vente tout de suite.
//     Un convoyeur qui part du collecteur y emporte le pollen déposé, une capsule par kilo.
// =====================================================================
const GR = 2, DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // nord (-z), est, sud, ouest
const PIECES = {
  convoyeur: { nom: 'Convoyeur', prix: 20 },
  quai: { nom: 'Quai d’expédition', prix: 100 },
  extracteur: { nom: 'Extracteur', prix: 800, entree: 'pollen', besoin: 2, sortie: 'miel' },
  maturateur: { nom: 'Maturateur', prix: 1500, entree: 'miel', besoin: 1, sortie: 'cru' },
};
const ORDRE_PIECES = Object.keys(PIECES);
const VALEUR_CAPSULE = { pollen: PRIX_KG, miel: 40, cru: 90 };
const COULEUR_CAPSULE = { pollen: CHARTE.pollen, miel: 0xd98a14, cru: 0x9a5a12 };
const GRILLE = new Map();   // "cx,cz" → pièce { cle, cx, cz, dir, g, ... }
const cle2 = (cx, cz) => cx + ',' + cz;
const centre = (c) => (c + 0.5) * GR;
// --- Les modèles des pièces, tous à la charte. Ils regardent vers -z (leur sortie). ---
const tapis = texture(64, 128, (g, w, h) => { g.fillStyle = '#ece8df'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4b41a'; for (let k = 0; k < 2; k++) { const y = k * h / 2 + 10; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w * 0.82, y + 22); g.lineTo(w * 0.62, y + 22); g.lineTo(w * 0.62, y + 40); g.lineTo(w * 0.38, y + 40); g.lineTo(w * 0.38, y + 22); g.lineTo(w * 0.18, y + 22); g.closePath(); g.fill(); } });
tapis.wrapT = THREE.RepeatWrapping; const M_TAPIS = new THREE.MeshStandardMaterial({ map: tapis, roughness: 0.7 });
function modelePiece(cle) {
  const g = new THREE.Group();
  if (cle === 'convoyeur') {
    for (const s of [-1, 1]) placer(g, boite(0.12, 0.35, 2, M.graphite, 0.03), s * 0.5, 0.35, 0);   // longerons
    const t = placer(g, new THREE.Mesh(new THREE.PlaneGeometry(0.86, 2).rotateX(-Math.PI / 2), M_TAPIS), 0, 0.5, 0); t.receiveShadow = true;
    for (const z of [-0.8, 0.8]) for (const s of [-1, 1]) placer(g, boite(0.1, 0.3, 0.1, M.graphite, 0.02), s * 0.5, 0.15, z);   // pieds
    placer(g, boite(1.12, 0.03, 0.06, M.seve, 0.01), 0, 0.26, -0.95);
  } else if (cle === 'quai') {
    const b = socle(g, 1.3, 1.3);
    placer(g, boite(1.5, 0.1, 1.5, M.blanc, 0.03), 0, b + 0.05, 0);
    for (let k = 0; k < 3; k++) placer(g, boite(0.5, 0.012, 0.12, M.pollen, 0.005), 0, b + 0.11, -0.4 + k * 0.4).rotation.y = 0.6;
    for (const s of [-1, 1]) placer(g, boite(0.1, 1.0, 0.1, M.graphite, 0.02), s * 0.7, b + 0.6, 0.65);
    placer(g, boite(1.5, 0.22, 0.1, M.pollen, 0.03), 0, b + 1.1, 0.65);
  } else if (cle === 'extracteur' || cle === 'maturateur') {
    const b = socle(g, 1.3, 1.3);
    placer(g, boite(1.4, 1.5, 1.3, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.04), 0, b + 0.75, 0.1);
    placer(g, boite(1.45, 0.2, 1.35, M.graphite, 0.03), 0, b + 0.15, 0.1);
    placer(g, boite(0.7, 0.22, 0.12, M.graphite, 0.03), 0, b + 0.55, -0.6);                   // bouche de sortie
    if (cle === 'extracteur') {   // tambour vitré où tourne le pollen
      placer(g, tube(0.42, 0.42, 0.7, M_VITRE, 24), 0, b + 1.85, 0.1); placer(g, tube(0.45, 0.45, 0.06, M.pollen, 24), 0, b + 2.2, 0.1); placer(g, tube(0.45, 0.45, 0.06, M.graphite, 24), 0, b + 1.5, 0.1);
      g.userData.rotor = placer(g, boite(0.6, 0.5, 0.06, M.pollen, 0.02), 0, b + 1.85, 0.1);
    } else {   // trois cuves de maturation
      for (let k = -1; k <= 1; k++) { placer(g, tube(0.2, 0.2, 0.5, M.blanc, 16), k * 0.45, b + 1.75, 0.1); placer(g, tube(0.21, 0.21, 0.05, M.pollen, 16), k * 0.45, b + 1.9, 0.1); }
      g.userData.rotor = placer(g, boite(0.2, 0.2, 0.06, M.seve, 0.02), 0.5, b + 1.25, -0.56);
    }
    g.userData.voyant = placer(g, boite(0.16, 0.16, 0.04, M.seve, 0.02), -0.45, b + 1.25, -0.56);
  }
  for (const o of [g.userData.rotor, g.userData.voyant]) if (o) o.userData.garder = true;
  return fusionner(g);
}
// --- Poser, démonter. ---
function libre(cx, cz) {
  if (GRILLE.has(cle2(cx, cz))) return false;
  const x = centre(cx), z = centre(cz), d = Math.hypot(x, z);
  if (d > RAYON - 2) return false;
  for (const o of OBSTACLES) if (!o.piece && Math.hypot(o.x - x, o.z - z) < o.r + 0.9) return false;
  return true;
}
function poserPiece(cle, cx, cz, dir, gratuit = false) {
  const g = modelePiece(cle), x = centre(cx), z = centre(cz);
  g.position.set(x, H(x, z), z); g.rotation.y = -dir * Math.PI / 2; scene.add(g);
  const p = { cle, cx, cz, dir, g, stock: 0, sortie: null, anim: 0 };
  GRILLE.set(cle2(cx, cz), p);
  if (cle !== 'convoyeur') { const o = { x, z, r: 0.85, piece: p }; OBSTACLES.push(o); p.obstacle = o; }
  if (!gratuit) S.credits -= PIECES[cle].prix;
  return p;
}
function demonter(p) {
  scene.remove(p.g); GRILLE.delete(cle2(p.cx, p.cz));
  if (p.obstacle) OBSTACLES.splice(OBSTACLES.indexOf(p.obstacle), 1);
  for (let k = CAPSULES.length - 1; k >= 0; k--) if (CAPSULES[k].p === p) CAPSULES.splice(k, 1);
  S.credits += Math.round(PIECES[p.cle].prix / 2);
}
// --- Les capsules. ---
const CAPSULES = [];   // { p (convoyeur), t (0 → 1 le long du tapis), type }
const NCAP = 400, capsules = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.13, 0.22, 4, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.1 }), NCAP);
capsules.count = 0; capsules.castShadow = true; capsules.frustumCulled = false; scene.add(capsules);
const _c = new THREE.Color();
const occupe = (p) => CAPSULES.some((c) => c.p === p && c.t < 0.55);
function pousser(p, type) {   // une capsule entre sur le convoyeur p si sa tête est libre
  if (!p || p.cle !== 'convoyeur' || occupe(p)) return false;
  CAPSULES.push({ p, t: 0, type }); return true;
}
function suivante(p) { const [dx, dz] = DIRS[p.dir]; return GRILLE.get(cle2(p.cx + dx, p.cz + dz)); }
function departs() {   // les convoyeurs qui partent du collecteur
  const out = [], C = COLLECTEUR.position;
  for (const p of GRILLE.values()) { if (p.cle !== 'convoyeur') continue; const x = centre(p.cx), z = centre(p.cz), d = Math.hypot(x - C.x, z - C.z); if (d < 4.3 && (DIRS[p.dir][0] * (x - C.x) + DIRS[p.dir][1] * (z - C.z)) > 0.3) out.push(p); }
  return out;
}
let tSilo = 0;
MAJ.push((dt) => {
  // Le silo du collecteur alimente les convoyeurs de départ.
  tSilo += dt;
  if (S.silo >= 1 && tSilo > 0.7) { for (const p of departs()) if (S.silo >= 1 && pousser(p, 'pollen')) { S.silo -= 1; tSilo = 0; } }
  // Machines.
  for (const p of GRILLE.values()) {
    const def = PIECES[p.cle]; if (!def.entree) continue;
    if (p.sortie) { const [dx, dz] = DIRS[p.dir], n = GRILLE.get(cle2(p.cx + dx, p.cz + dz)); if (n && n.cle === 'quai') { vendreCapsule(p.sortie); p.sortie = null; } else if (pousser(n, p.sortie)) p.sortie = null; }
    if (!p.sortie && p.stock >= def.besoin) { p.stock -= def.besoin; p.sortie = def.sortie; p.anim = 0.6; }   // transformation immédiate
    p.anim = Math.max(0, p.anim - dt); if (p.g.userData.rotor) p.g.userData.rotor.rotation.y += dt * 14 * (p.anim > 0 ? 1 : 0);
    p.g.userData.voyant.material = p.anim > 0 ? M.seve : M.graphite;
  }
  // Capsules : 1,2 tapis par seconde.
  for (let k = CAPSULES.length - 1; k >= 0; k--) {
    const c = CAPSULES[k], devant = CAPSULES.some((o) => o !== c && o.p === c.p && o.t > c.t && o.t - c.t < 0.3);
    if (!devant) c.t = Math.min(1, c.t + dt * 0.6);
    if (c.t < 1) continue;
    const n = suivante(c.p);
    if (!n) continue;
    if (n.cle === 'convoyeur') { if (!occupe(n)) { c.p = n; c.t = 0; } }
    else if (n.cle === 'quai') { vendreCapsule(c.type); CAPSULES.splice(k, 1); }
    else if (PIECES[n.cle].entree === c.type && n.stock < PIECES[n.cle].besoin * 2) { n.stock++; CAPSULES.splice(k, 1); }
  }
  let i = 0;
  for (const c of CAPSULES) { if (i >= NCAP) break; const x = centre(c.p.cx) + DIRS[c.p.dir][0] * (c.t - 0.5) * GR, z = centre(c.p.cz) + DIRS[c.p.dir][1] * (c.t - 0.5) * GR; _m.compose(_p.set(x, H(centre(c.p.cx), centre(c.p.cz)) + 0.64, z), _q.setFromEuler(_e.set(0, -c.p.dir * Math.PI / 2, 0)), _s.set(1, 1, 1)); capsules.setMatrixAt(i, _m); capsules.setColorAt(i, _c.set(COULEUR_CAPSULE[c.type])); i++; }
  capsules.count = i; capsules.instanceMatrix.needsUpdate = true; if (capsules.instanceColor) capsules.instanceColor.needsUpdate = true;
  tapis.offset.y = (tapis.offset.y + dt * 0.6) % 1;
});
function vendreCapsule(type) { S.credits += VALEUR_CAPSULE[type]; }
// Le collecteur : s'il a une ligne de départ, on y dépose le pollen (le miel reste vendu directement).
function deposerOuVendre() {
  if (departs().length && S.charge > 0) { S.silo += S.charge; S.charge = 0; S.valeur = 0; sons.achat(); ecrireEcran(ECRAN_COLLECTEUR, `${Math.floor(S.silo)} kg`); return; }
  vendre();
}
INTER.find((it) => it.obj === COLLECTEUR).agir = deposerOuVendre;

// --- L'outil de construction : clic pose, E change de pièce, R tourne, clic sur une pièce posée la démonte. ---
const fantome = new THREE.Group(), M_FANT = new THREE.MeshBasicMaterial({ color: CHARTE.seve, transparent: true, opacity: 0.35, depthWrite: false });
placer(fantome, boite(1.9, 0.08, 1.9, M_FANT, 0.03), 0, 0.04, 0);
placer(fantome, new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 3).rotateX(-Math.PI / 2), M_FANT), 0, 0.5, -0.4);
fantome.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });
fantome.visible = false; scene.add(fantome);
const CONS = { piece: 'convoyeur', dir: 0, cible: null, avant: false, modele: null };
// Le fantôme montre la pièce elle-même, translucide : on voit ce qu'on pose sans un mot.
const M_FANT_PIECE = new THREE.MeshBasicMaterial({ color: CHARTE.seve, transparent: true, opacity: 0.4, depthWrite: false });
function majFantome() {
  if (CONS.modele) fantome.remove(CONS.modele);
  const m = modelePiece(CONS.piece); m.traverse((o) => { if (o.isMesh) { o.material = M_FANT_PIECE; o.castShadow = o.receiveShadow = false; } }); fantome.add(m); CONS.modele = m;
}
majFantome();
function viseeLoin() { camera.getWorldDirection(_dir); const o = camera.position; for (let t = 0.5; t <= 10; t += 0.1) { const x = o.x + _dir.x * t, y = o.y + _dir.y * t, z = o.z + _dir.z * t; if (y <= H(x, z)) return [x, z]; } return null; }
MAJ.push(() => {
  if (E.construire) { if (outilEnMain === 'marteau') changerOutil(S.outils.find((o) => OUTILS_DEF[o].largeur && o !== 'marteau') || 'pinceau'); else changerOutil('marteau'); }
  const actif = outilEnMain === 'marteau' && !joueur.enVehicule;
  fantome.visible = false; CONS.cible = null;
  if (!actif) { CONS.avant = E.action; return; }
  if (E.tourner) CONS.dir = (CONS.dir + 1) % 4;
  const v = viseeLoin();
  if (v) {
    const cx = Math.floor(v[0] / GR), cz = Math.floor(v[1] / GR), p = GRILLE.get(cle2(cx, cz));
    CONS.cible = { cx, cz, p, ok: !p && libre(cx, cz) && S.credits >= PIECES[CONS.piece].prix };
    if (!p) {
      fantome.visible = true; fantome.position.set(centre(cx), H(centre(cx), centre(cz)) + 0.02, centre(cz)); fantome.rotation.y = -CONS.dir * Math.PI / 2;
      M_FANT.color.set(CONS.cible.ok ? CHARTE.seve : 0xd9534f); M_FANT_PIECE.color.copy(M_FANT.color);
    }
    if (E.presse || (E.action && !CONS.avant)) {
      if (p) { demonter(p); sons.arrache(); }
      else if (CONS.cible.ok) { poserPiece(CONS.piece, cx, cz, CONS.dir); sons.pop(); if (CONS.piece === 'convoyeur') { const [dx, dz] = DIRS[CONS.dir]; CONS.suivant = [cx + dx, cz + dz]; } }
      else sons.refus();
    }
  }
  CONS.avant = E.action;
});
INTER_HORS.unshift(() => { if (outilEnMain !== 'marteau') return false; CONS.piece = ORDRE_PIECES[(ORDRE_PIECES.indexOf(CONS.piece) + 1) % ORDRE_PIECES.length]; majFantome(); sons.pop(); return true; });
