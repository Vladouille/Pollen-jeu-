
// =====================================================================
// 14. L'automatisation (étape 6) : l'outil de construction pose des pièces sur une grille de 2 m.
//     Convoyeurs (des capsules y roulent), extracteur (2 kg de pollen → 1 pot de miel), maturateur
//     (miel → miel de cru), panneau solaire, batterie, quai d'expédition (vend ce qui arrive).
//     Un convoyeur qui part du collecteur y emporte le pollen déposé, une capsule par kilo.
// =====================================================================
const GR = 2, DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // nord (-z), est, sud, ouest
const PIECES = {
  convoyeur: { nom: 'Convoyeur', prix: 20 },
  quai: { nom: 'Quai d’expédition', prix: 100 },
  extracteur: { nom: 'Extracteur', prix: 800, entree: 'pollen', besoin: 2, sortie: 'miel', duree: 4 },
  maturateur: { nom: 'Maturateur', prix: 1500, entree: 'miel', besoin: 1, sortie: 'cru', duree: 6 },
  solaire: { nom: 'Panneau solaire', prix: 400 },
  batterie: { nom: 'Batterie', prix: 600 },
};
const PIECES_DEBLOQUEES = new Set(['convoyeur', 'quai']);
const VALEUR_CAPSULE = { pollen: PRIX_KG, miel: PRIX_MIEL, cru: 90 };
const COULEUR_CAPSULE = { pollen: CHARTE.pollen, miel: 0xd98a14, cru: 0x9a5a12 };
const GRILLE = new Map();   // "cx,cz" → pièce { cle, cx, cz, dir, g, ... }
const cle2 = (cx, cz) => cx + ',' + cz;
const centre = (c) => (c + 0.5) * GR;
// --- Les modèles des pièces, tous à la charte. Ils regardent vers -z (leur sortie). ---
const tapis = texture(64, 128, (g, w, h) => { g.fillStyle = '#ece8df'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4b41a'; for (let k = 0; k < 2; k++) { const y = k * h / 2 + 10; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w * 0.82, y + 22); g.lineTo(w * 0.62, y + 22); g.lineTo(w * 0.62, y + 40); g.lineTo(w * 0.38, y + 40); g.lineTo(w * 0.38, y + 22); g.lineTo(w * 0.18, y + 22); g.closePath(); g.fill(); } });
tapis.wrapT = THREE.RepeatWrapping; const M_TAPIS = new THREE.MeshStandardMaterial({ map: tapis, roughness: 0.7 });
const M_PANNEAU_PV = new THREE.MeshStandardMaterial({ color: 0x1b2a44, roughness: 0.15, metalness: 0.5, map: texture(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8fa3c0'; g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(k * w / 4, 0); g.lineTo(k * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, k * h / 4); g.lineTo(w, k * h / 4); g.stroke(); } }) });
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
  } else if (cle === 'solaire') {
    placer(g, boite(0.5, 0.2, 0.5, M.graphite, 0.04), 0, 0.1, 0);
    placer(g, tube(0.06, 0.06, 1.1, M.blanc), 0, 0.75, 0);
    const p = new THREE.Group(); p.position.y = 1.35; p.rotation.x = -0.55; g.add(p);
    placer(p, boite(1.8, 0.06, 1.3, M.graphite, 0.02), 0, 0, 0);
    placer(p, new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.2).rotateX(-Math.PI / 2), M_PANNEAU_PV), 0, 0.035, 0);
    placer(p, boite(1.82, 0.04, 0.05, M.pollen, 0.01), 0, 0.02, 0.65);
  } else if (cle === 'batterie') {
    const b = socle(g, 1.0, 0.8);
    placer(g, boite(1.0, 1.3, 0.8, M.blanc, 0.04), 0, b + 0.65, 0);
    placer(g, boite(0.3, 0.12, 0.3, M.graphite, 0.03), -0.25, b + 1.36, 0); placer(g, boite(0.3, 0.12, 0.3, M.pollen, 0.03), 0.25, b + 1.36, 0);
    g.userData.barres = [];
    for (let k = 0; k < 5; k++) g.userData.barres.push(placer(g, boite(0.6, 0.12, 0.04, M.graphite, 0.02), 0, b + 0.25 + k * 0.2, -0.41));
  }
  for (const o of [g.userData.rotor, g.userData.voyant, ...(g.userData.barres || [])]) if (o) o.userData.garder = true;
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
  const p = { cle, cx, cz, dir, g, stock: 0, sortie: null, t: 0, marche: false, panne: false };
  GRILLE.set(cle2(cx, cz), p);
  if (cle !== 'convoyeur') { const o = { x, z, r: 0.85, piece: p }; OBSTACLES.push(o); p.obstacle = o; INTER.push(p.inter = interPiece(p)); }
  if (!gratuit) S.credits -= PIECES[cle].prix;
  return p;
}
function demonter(p) {
  scene.remove(p.g); GRILLE.delete(cle2(p.cx, p.cz));
  if (p.obstacle) OBSTACLES.splice(OBSTACLES.indexOf(p.obstacle), 1);
  if (p.inter) INTER.splice(INTER.indexOf(p.inter), 1);
  for (let k = CAPSULES.length - 1; k >= 0; k--) if (CAPSULES[k].p === p) CAPSULES.splice(k, 1);
  S.credits += Math.round(PIECES[p.cle].prix / 2);
}
function interPiece(p) {
  const def = PIECES[p.cle];
  return { x: centre(p.cx), z: centre(p.cz), y: 2.6, r: 2.4, nom: def.nom, piece: p,
    texte() {
      if (p.panne) return `${def.nom} en panne · Réparer`;
      if (def.entree) return `${def.nom} · ${p.stock}/${def.besoin} ${def.entree === 'pollen' ? 'kg de pollen' : 'pot'} · ${p.marche ? 'en marche' : ENERGIE.manque ? 'sans énergie' : 'en attente'}`;
      if (p.cle === 'batterie') return `Batterie · ${Math.round(ENERGIE.stock)} / ${Math.round(ENERGIE.max)}`;
      if (p.cle === 'solaire') return `Panneau solaire · ${JOUR.nuit ? 'à l’arrêt la nuit' : '1,5 ⚡/s'}`;
      if (p.cle === 'quai') return 'Quai d’expédition · vend ce qui arrive';
      return def.nom;
    },
    actif: () => p.panne, agir() { if (p.panne) { p.panne = false; sons.achat(); message(`${def.nom} réparé`, 'gain'); } } };
}
// --- L'énergie : chaque panneau donne 1,5 unité par seconde de jour ; chaque batterie en garde 120 ;
//     une machine qui travaille en consomme 1 par seconde. ---
const ENERGIE = { stock: 0, max: 0, prod: 0, manque: false };
const JOUR = { nuit: false, lumiere: 1 };   // réglé par le cycle jour/nuit (module suivant)
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
  // Énergie.
  let pv = 0, bat = 0, demande = 0; for (const p of GRILLE.values()) { if (p.cle === 'solaire') pv++; else if (p.cle === 'batterie') bat++; else if (PIECES[p.cle].entree && p.stock >= PIECES[p.cle].besoin && !p.panne && !p.sortie) demande++; }
  ENERGIE.max = bat * 120; ENERGIE.prod = pv * 1.5 * JOUR.lumiere;
  const bilan = (ENERGIE.prod - demande) * dt; ENERGIE.stock = clamp(ENERGIE.stock + bilan, 0, ENERGIE.max);
  const dispo = ENERGIE.prod >= demande || ENERGIE.stock > 0.01; ENERGIE.manque = demande > 0 && !dispo;
  // Le silo du collecteur alimente les convoyeurs de départ.
  tSilo += dt;
  if (S.silo >= 1 && tSilo > 0.7) { for (const p of departs()) if (S.silo >= 1 && pousser(p, 'pollen')) { S.silo -= 1; tSilo = 0; } }
  // Machines.
  for (const p of GRILLE.values()) {
    const def = PIECES[p.cle]; if (!def.entree) continue;
    if (p.sortie) { const [dx, dz] = DIRS[p.dir], n = GRILLE.get(cle2(p.cx + dx, p.cz + dz)); if (n && n.cle === 'quai') { vendreCapsule(p.sortie); p.sortie = null; } else if (pousser(n, p.sortie)) p.sortie = null; }
    p.marche = !p.panne && !p.sortie && p.stock >= def.besoin && dispo;
    if (p.marche) { p.t += dt; if (p.g.userData.rotor) p.g.userData.rotor.rotation.y += dt * 8; if (p.t >= def.duree) { p.t = 0; p.stock -= def.besoin; p.sortie = def.sortie; } }
    p.g.userData.voyant.material = p.panne ? M.pollen : p.marche ? M.seve : M.graphite;
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
  for (const p of GRILLE.values()) if (p.cle === 'batterie') p.g.userData.barres.forEach((b, k) => { b.material = ENERGIE.max && ENERGIE.stock / ENERGIE.max > k / 5 ? M.seve : M.graphite; });
});
const ECOUTE_CAP = [];
function vendreCapsule(type) { const cr = Math.round(VALEUR_CAPSULE[type] * S.prixVente); S.credits += cr; gainAffiche(cr); for (const f of ECOUTE_CAP) f(type); }
// Le collecteur : s'il a une ligne de départ, on y dépose le pollen (le miel reste vendu directement).
const venteAvant = vendre;
function deposerOuVendre() {
  if (departs().length && S.charge > 0) { const kg = S.charge; S.silo += kg; S.charge = 0; S.valeur = 0; sons.achat(); message(`${fmtKg(kg)} kg déposés dans la ligne`, 'gain'); if (venteTotale().cr > 0) venteAvant(); return; }
  venteAvant();
}
{ const it = INTER.find((it) => it.obj === COLLECTEUR); const t0 = it.texte; it.agir = deposerOuVendre; it.texte = () => (departs().length && S.charge > 0) ? `Déposer ${fmtKg(S.charge)} kg dans la ligne${S.silo >= 1 ? ` · silo ${Math.floor(S.silo)} kg` : ''}` : t0(); it.actif = () => S.charge > 0 || venteTotale().cr > 0; }
S.silo = 0;

// --- L'outil de construction : clic pose, E change de pièce, R tourne, clic sur une pièce posée la démonte. ---
const fantome = new THREE.Group(), M_FANT = new THREE.MeshBasicMaterial({ color: CHARTE.seve, transparent: true, opacity: 0.35, depthWrite: false });
placer(fantome, boite(1.9, 0.08, 1.9, M_FANT, 0.03), 0, 0.04, 0);
placer(fantome, new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 3).rotateX(-Math.PI / 2), M_FANT), 0, 0.5, -0.4);
fantome.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });
fantome.visible = false; scene.add(fantome);
const CONS = { piece: 'convoyeur', dir: 0, cible: null, avant: false, modele: null };
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
      M_FANT.color.set(CONS.cible.ok ? CHARTE.seve : 0xd9534f);
    }
    if (E.action && !CONS.avant) {
      if (p) { demonter(p); sons.arrache(); }
      else if (CONS.cible.ok) { poserPiece(CONS.piece, cx, cz, CONS.dir); sons.pop(); if (CONS.piece === 'convoyeur') { const [dx, dz] = DIRS[CONS.dir]; CONS.suivant = [cx + dx, cz + dz]; } }
      else sons.refus();
    }
  }
  CONS.avant = E.action;
});
INTER_HORS.unshift(() => { if (outilEnMain !== 'marteau') return false; const l = [...PIECES_DEBLOQUEES]; CONS.piece = l[(l.indexOf(CONS.piece) + 1) % l.length]; return true; });
CONTEXTES.unshift(() => {
  if (outilEnMain !== 'marteau' || joueur.enVehicule) return '';
  const d = PIECES[CONS.piece], c = CONS.cible, a = MOBILE ? '●' : 'Clic';
  if (c && c.p) return `<kbd>${a}</kbd>Démonter ${PIECES[c.p.cle].nom} · +${Math.round(PIECES[c.p.cle].prix / 2)} cr`;
  return `<kbd>${a}</kbd>Poser ${d.nom} · ${d.prix} cr <kbd style="margin-left:9px">E</kbd>pièce <kbd style="margin-left:9px">${MOBILE ? '⟳' : 'R'}</kbd>${['nord', 'est', 'sud', 'ouest'][CONS.dir]}`;
});
