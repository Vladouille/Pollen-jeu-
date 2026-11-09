
// =====================================================================
// 14. L'automatisation : l'outil de construction pose des pièces sur une grille de 2 m, achetées et posées
//     tout de suite. Chaque machine a une durée de traitement visible (elle tourne, son écran montre l'avancement,
//     son voyant clignote), que l'on réduit en l'améliorant (E sur la machine : niveau 2 puis 3).
//     La chaîne : borne de pollinisation (pollinise seule et produit des capsules) ou collecteur → tamiseur,
//     extracteur → presse, maturateur → conditionneuse → quai d'expédition. Chaque étape multiplie la valeur.
// =====================================================================
const GR = 2, DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // nord (-z), est, sud, ouest
const PIECES = {
  convoyeur: { nom: 'Convoyeur', prix: 20, vitesse: 0.6 },
  rapide: { nom: 'Convoyeur rapide', prix: 60, vitesse: 1.4 },
  quai: { nom: 'Quai d’expédition', prix: 100 },
  borne: { nom: 'Borne de pollinisation', prix: 1500, durees: [4, 2.5, 1.5], source: true },
  tamiseur: { nom: 'Tamiseur', prix: 400, entree: 'pollen', besoin: 1, sortie: 'fin', mult: 1.3, durees: [2, 1.3, 0.8] },
  extracteur: { nom: 'Extracteur', prix: 800, entree: 'pollen', besoin: 2, sortie: 'miel', mult: 1.6, durees: [4, 2.5, 1.5] },
  presse: { nom: 'Presse', prix: 1200, entree: 'fin', besoin: 2, sortie: 'pain', mult: 1.5, durees: [3, 2, 1.2] },
  maturateur: { nom: 'Maturateur', prix: 1500, entree: 'miel', besoin: 1, sortie: 'cru', mult: 1.8, durees: [6, 4, 2.5] },
  conditionneuse: { nom: 'Conditionneuse', prix: 2500, entree: 'cru', besoin: 1, sortie: 'pot', mult: 1.6, durees: [3, 2, 1.2] },
};
const ORDRE_PIECES = Object.keys(PIECES);
const AMELIO = [1.5, 4];   // prix du niveau 2 et du niveau 3, en multiples du prix de la machine
const prixAmelio = (p) => p.niveau < 2 ? Math.round(PIECES[p.cle].prix * AMELIO[p.niveau]) : 0;
const COULEUR_CAPSULE = { pollen: CHARTE.pollen, fin: 0xffe9a0, miel: 0xd98a14, pain: 0xc7a052, cru: 0x9a5a12, pot: 0xf7f4ee };
const estTapis = (p) => p && (p.cle === 'convoyeur' || p.cle === 'rapide');
const GRILLE = new Map();   // "cx,cz" → pièce
const cle2 = (cx, cz) => cx + ',' + cz;
const centre = (c) => (c + 0.5) * GR;
// --- Les modèles des pièces, tous à la charte. Ils regardent vers -z (leur sortie). ---
const tapis = texture(64, 128, (g, w, h) => { g.fillStyle = '#ece8df'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4b41a'; for (let k = 0; k < 2; k++) { const y = k * h / 2 + 10; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w * 0.82, y + 22); g.lineTo(w * 0.62, y + 22); g.lineTo(w * 0.62, y + 40); g.lineTo(w * 0.38, y + 40); g.lineTo(w * 0.38, y + 22); g.lineTo(w * 0.18, y + 22); g.closePath(); g.fill(); } });
tapis.wrapT = THREE.RepeatWrapping; const M_TAPIS = new THREE.MeshStandardMaterial({ map: tapis, roughness: 0.7 });
const tapisR = tapis.clone(); tapisR.needsUpdate = true; const M_TAPIS_R = new THREE.MeshStandardMaterial({ map: tapisR, color: 0xfff1c4, roughness: 0.7 });
function ecranMachine() {   // un petit écran par machine : barre d'avancement, niveau, roue qui tourne
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ color: 0x0d0f11, roughness: 0.1, metalness: 0.2, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.3 });
}
function dessinerEcran(p) {
  const mat = p.ecran, cv = mat.emissiveMap.image, g = cv.getContext('2d'), av = p.duree ? p.t / p.duree : 0;
  g.fillStyle = '#121518'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = 'rgba(244,180,26,.2)'; g.fillRect(10, 38, 108, 12); g.fillStyle = '#f4b41a'; g.fillRect(10, 38, 108 * av, 12);   // avancement du lot
  for (let k = 0; k < 3; k++) { g.fillStyle = k <= p.niveau ? '#53d17a' : '#3a3f45'; g.fillRect(10 + k * 16, 12, 11, 11); }      // niveau
  g.save(); g.translate(104, 18); g.rotate(p.anim); g.fillStyle = p.travaille ? '#f4b41a' : '#3a3f45'; for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.fillRect(-2, 3, 4, 9); } g.restore();   // roue
  mat.emissiveMap.needsUpdate = true;
}
function corpsMachine(g, h = 1.5) {   // socle étagé, corps à panneaux, bandeau, bouche de sortie, écran, voyant
  const b = socle(g, 1.3, 1.3);
  placer(g, boite(1.4, h, 1.3, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.04), 0, b + h / 2, 0.1);
  placer(g, boite(1.45, 0.2, 1.35, M.graphite, 0.03), 0, b + 0.15, 0.1);
  placer(g, boite(0.7, 0.22, 0.12, M.graphite, 0.03), 0, b + 0.55, -0.6);
  placer(g, boite(0.62, 0.36, 0.05, M.graphite, 0.02), 0.2, b + 1.12, -0.57);
  const e = ecranMachine(); g.userData.ecran = e;
  placer(g, new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.27), e), 0.2, b + 1.12, -0.6).rotation.y = Math.PI;
  g.userData.voyant = placer(g, boite(0.14, 0.14, 0.04, M.graphite, 0.02), -0.45, b + 1.12, -0.56);
  return b;
}
function modelePiece(cle) {
  const g = new THREE.Group();
  if (cle === 'convoyeur' || cle === 'rapide') {
    for (const s of [-1, 1]) placer(g, boite(0.12, 0.35, 2, cle === 'rapide' ? M.pollen : M.graphite, 0.03), s * 0.5, 0.35, 0);   // longerons
    const t = placer(g, new THREE.Mesh(new THREE.PlaneGeometry(0.86, 2).rotateX(-Math.PI / 2), cle === 'rapide' ? M_TAPIS_R : M_TAPIS), 0, 0.5, 0); t.receiveShadow = true;
    for (const z of [-0.8, 0.8]) for (const s of [-1, 1]) placer(g, boite(0.1, 0.3, 0.1, M.graphite, 0.02), s * 0.5, 0.15, z);
    placer(g, boite(1.12, 0.03, 0.06, M.seve, 0.01), 0, 0.26, -0.95);
  } else if (cle === 'quai') {
    const b = socle(g, 1.3, 1.3);
    placer(g, boite(1.5, 0.1, 1.5, M.blanc, 0.03), 0, b + 0.05, 0);
    for (let k = 0; k < 3; k++) placer(g, boite(0.5, 0.012, 0.12, M.pollen, 0.005), 0, b + 0.11, -0.4 + k * 0.4).rotation.y = 0.6;
    for (const s of [-1, 1]) placer(g, boite(0.1, 1.0, 0.1, M.graphite, 0.02), s * 0.7, b + 0.6, 0.65);
    placer(g, boite(1.5, 0.22, 0.1, M.pollen, 0.03), 0, b + 1.1, 0.65);
  } else if (cle === 'borne') {   // un mât blanc, une tête qui tourne avec quatre pinceaux jaunes
    const b = corpsMachine(g, 1.0);
    placer(g, tube(0.08, 0.1, 1.4, M.blanc), 0, b + 1.7, 0.1);
    const tete = new THREE.Group(); tete.position.set(0, b + 2.45, 0.1); g.add(tete);
    placer(tete, tube(0.22, 0.22, 0.18, M.graphite, 20), 0, 0, 0);
    for (let k = 0; k < 4; k++) { const bras = placer(tete, boite(0.7, 0.06, 0.06, M.blanc, 0.02), Math.cos(k * Math.PI / 2) * 0.35, 0, Math.sin(k * Math.PI / 2) * 0.35); bras.rotation.y = -k * Math.PI / 2; placer(tete, boite(0.12, 0.16, 0.12, M_POILS, 0.03), Math.cos(k * Math.PI / 2) * 0.7, -0.08, Math.sin(k * Math.PI / 2) * 0.7); }
    g.userData.rotor = tete;
  } else {
    const b = corpsMachine(g);
    if (cle === 'extracteur') {   // tambour vitré où tourne le pollen
      placer(g, tube(0.42, 0.42, 0.7, M_VITRE, 24), 0, b + 1.85, 0.1); placer(g, tube(0.45, 0.45, 0.06, M.pollen, 24), 0, b + 2.2, 0.1); placer(g, tube(0.45, 0.45, 0.06, M.graphite, 24), 0, b + 1.5, 0.1);
      g.userData.rotor = placer(g, boite(0.6, 0.5, 0.06, M.pollen, 0.02), 0, b + 1.85, 0.1);
    } else if (cle === 'maturateur') {   // trois cuves, un agitateur
      for (let k = -1; k <= 1; k++) { placer(g, tube(0.2, 0.2, 0.5, M.blanc, 16), k * 0.45, b + 1.75, 0.1); placer(g, tube(0.21, 0.21, 0.05, M.pollen, 16), k * 0.45, b + 1.9, 0.1); }
      g.userData.rotor = placer(g, boite(0.06, 0.4, 0.06, M.graphite, 0.02), 0, b + 2.15, 0.1);
    } else if (cle === 'tamiseur') {   // un plateau incliné qui vibre
      g.userData.rotor = placer(g, boite(1.2, 0.08, 1.0, M.pollen, 0.03), 0, b + 1.7, 0.1); g.userData.rotor.rotation.x = 0.25; g.userData.vibre = true;
      for (const s of [-1, 1]) placer(g, boite(0.08, 0.3, 0.08, M.graphite, 0.02), s * 0.55, b + 1.6, 0.1);
    } else if (cle === 'presse') {   // un piston graphite qui monte et descend
      placer(g, boite(1.1, 0.12, 1.0, M.graphite, 0.03), 0, b + 2.5, 0.1);
      for (const s of [-1, 1]) placer(g, boite(0.1, 1.0, 0.1, M.graphite, 0.02), s * 0.5, b + 2.0, 0.1);
      g.userData.rotor = placer(g, boite(0.7, 0.3, 0.6, M.pollen, 0.04), 0, b + 1.8, 0.1); g.userData.piston = true;
    } else if (cle === 'conditionneuse') {   // trois pots sur un petit plateau tournant
      const pl = new THREE.Group(); pl.position.set(0, b + 1.55, 0.1); g.add(pl);
      placer(pl, tube(0.5, 0.5, 0.06, M.graphite, 24), 0, 0, 0);
      for (let k = 0; k < 3; k++) { const a = k * 2.094; placer(pl, tube(0.1, 0.1, 0.2, M.blanc, 12), Math.cos(a) * 0.3, 0.13, Math.sin(a) * 0.3); placer(pl, tube(0.105, 0.105, 0.05, M.pollen, 12), Math.cos(a) * 0.3, 0.25, Math.sin(a) * 0.3); }
      g.userData.rotor = pl;
    }
  }
  for (const o of [g.userData.rotor, g.userData.voyant]) if (o) o.userData.garder = true;
  g.traverse((o) => { if (o.isMesh && o.material === g.userData.ecran) o.userData.garder = true; });
  return fusionner(g);
}
// --- Poser, démonter, améliorer. ---
function libre(cx, cz) {
  if (GRILLE.has(cle2(cx, cz))) return false;
  const x = centre(cx), z = centre(cz), d = Math.hypot(x, z);
  if (d > RAYON - 2) return false;
  for (const o of OBSTACLES) if (!o.piece && Math.hypot(o.x - x, o.z - z) < o.r + 0.9) return false;
  return true;
}
function poserPiece(cle, cx, cz, dir, gratuit = false, niveau = 0) {
  const g = modelePiece(cle), x = centre(cx), z = centre(cz), def = PIECES[cle];
  g.position.set(x, H(x, z), z); g.rotation.y = -dir * Math.PI / 2; scene.add(g);
  const p = { cle, cx, cz, dir, g, entrees: [], sortie: null, t: 0, duree: 0, niveau, anim: 0, travaille: false, ecran: g.userData.ecran, tEcran: 0 };
  GRILLE.set(cle2(cx, cz), p);
  if (!estTapis(p)) { const o = { x, z, r: 0.85, piece: p }; OBSTACLES.push(o); p.obstacle = o; }
  if (def.durees) { INTER.push(p.inter = { x, z, r: 2.4, piece: p, agir() { ameliorer(p); } }); dessinerEcran(p); }
  if (!gratuit) S.credits -= def.prix;
  return p;
}
function ameliorer(p) {   // E sur une machine : le niveau suivant, tout de suite
  const prix = prixAmelio(p); if (!prix || S.credits < prix) { sons.refus(); return; }
  S.credits -= prix; p.niveau++; sons.achat(); dessinerEcran(p);
}
function demonter(p) {
  scene.remove(p.g); GRILLE.delete(cle2(p.cx, p.cz));
  if (p.obstacle) OBSTACLES.splice(OBSTACLES.indexOf(p.obstacle), 1);
  if (p.inter) INTER.splice(INTER.indexOf(p.inter), 1);
  for (let k = CAPSULES.length - 1; k >= 0; k--) if (CAPSULES[k].p === p) CAPSULES.splice(k, 1);
  S.credits += Math.round(PIECES[p.cle].prix / 2);
}
// --- Les capsules : { p (tapis), t (0 → 1), type, valeur }. ---
const CAPSULES = [];
const NCAP = 400, capsules = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.13, 0.22, 4, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.1 }), NCAP);
capsules.count = 0; capsules.castShadow = true; capsules.frustumCulled = false; scene.add(capsules);
const _c = new THREE.Color();
const occupe = (p) => CAPSULES.some((c) => c.p === p && c.t < 0.55);
function pousser(p, cap) { if (!estTapis(p) || occupe(p)) return false; CAPSULES.push({ p, t: 0, type: cap.type, valeur: cap.valeur }); return true; }
const devant = (p) => { const [dx, dz] = DIRS[p.dir]; return GRILLE.get(cle2(p.cx + dx, p.cz + dz)); };
function departs() {   // les tapis qui partent du collecteur
  const out = [], C = COLLECTEUR.position;
  for (const p of GRILLE.values()) { if (!estTapis(p)) continue; const x = centre(p.cx), z = centre(p.cz), d = Math.hypot(x - C.x, z - C.z); if (d < 4.3 && (DIRS[p.dir][0] * (x - C.x) + DIRS[p.dir][1] * (z - C.z)) > 0.3) out.push(p); }
  return out;
}
function expedier(v) { const cr = Math.round(v); S.credits += cr; S.expedie = (S.expedie || 0) + cr; }   // vendu par un quai
function livrer(p, cap) {   // la sortie d'une machine : sur le tapis devant elle, ou vendue si c'est un quai
  const n = devant(p);
  if (n && n.cle === 'quai') { expedier(cap.valeur); return true; }
  return pousser(n, cap);
}
function tuileBorne(p) {   // une tuile pollinisable à moins de 8 m de la borne
  const x = centre(p.cx), z = centre(p.cz), [q0, r0] = versHex(x, z), c = [];
  for (let dq = -5; dq <= 5; dq++) for (let dr = -5; dr <= 5; dr++) { const i = idxDe(q0 + dq, r0 + dr); if (pollinisable(i) && T.sorte[i] !== 3 && Math.hypot(T.x[i] - x, T.z[i] - z) < 8) c.push(i); }
  return c.length ? c[Math.floor(Math.random() * c.length)] : -1;
}
let tSilo = 0;
MAJ.push((dt) => {
  // Le silo du collecteur envoie une capsule par kilo sur les tapis de départ.
  tSilo += dt;
  if (S.silo >= 1 && tSilo > 0.7) for (const p of departs()) if (S.silo >= 1 && pousser(p, { type: 'pollen', valeur: S.siloValeur / S.silo })) { S.siloValeur -= S.siloValeur / S.silo; S.silo -= 1; tSilo = 0; }
  // Les machines : un lot à la fois, pendant sa durée ; puis la sortie attend une place.
  for (const p of GRILLE.values()) {
    const def = PIECES[p.cle]; if (!def.durees) continue;
    if (p.sortie && livrer(p, p.sortie)) p.sortie = null;
    const pret = def.source ? true : p.entrees.length >= def.besoin;
    p.travaille = !p.sortie && pret;
    if (p.travaille) {
      p.duree = def.durees[p.niveau]; p.t += dt; p.anim += dt * 9;
      if (p.t >= p.duree) {
        p.t = 0;
        if (def.source) { const i = tuileBorne(p); if (i >= 0) { const v = polliniser(i, 'borne'); p.sortie = { type: 'pollen', valeur: v }; } }
        else { const lot = p.entrees.splice(0, def.besoin); p.sortie = { type: def.sortie, valeur: lot.reduce((s, c) => s + c.valeur, 0) * def.mult }; }
      }
    } else p.t = 0;
    const r = p.g.userData.rotor;
    if (r && p.travaille) { if (p.g.userData.vibre) r.position.x = Math.sin(gt * 60) * 0.02; else if (p.g.userData.piston) r.position.y = p.g.userData.base0 === undefined ? (p.g.userData.base0 = r.position.y) : p.g.userData.base0 - Math.abs(Math.sin(gt * 6)) * 0.3; else r.rotation.y += dt * 8; }
    p.g.userData.voyant.material = p.travaille ? (Math.sin(gt * 12) > 0 ? M.seve : M.graphite) : p.sortie ? M.pollen : M.graphite;   // le voyant clignote pendant le lot
    p.tEcran += dt; if (p.tEcran > 0.1) { p.tEcran = 0; dessinerEcran(p); }
  }
  // Les capsules avancent ; au bout du tapis : tapis suivant, machine (si elle accepte), ou quai.
  for (let k = CAPSULES.length - 1; k >= 0; k--) {
    const c = CAPSULES[k], gene = CAPSULES.some((o) => o !== c && o.p === c.p && o.t > c.t && o.t - c.t < 0.3);
    if (!gene) c.t = Math.min(1, c.t + dt * PIECES[c.p.cle].vitesse);
    if (c.t < 1) continue;
    const n = devant(c.p); if (!n) continue;
    if (estTapis(n)) { if (!occupe(n)) { c.p = n; c.t = 0; } }
    else if (n.cle === 'quai') { expedier(c.valeur); CAPSULES.splice(k, 1); }
    else if (PIECES[n.cle].entree === c.type && n.entrees.length < PIECES[n.cle].besoin * 2) { n.entrees.push(c); CAPSULES.splice(k, 1); }
  }
  let i = 0;
  for (const c of CAPSULES) { if (i >= NCAP) break; const x = centre(c.p.cx) + DIRS[c.p.dir][0] * (c.t - 0.5) * GR, z = centre(c.p.cz) + DIRS[c.p.dir][1] * (c.t - 0.5) * GR; _m.compose(_p.set(x, H(centre(c.p.cx), centre(c.p.cz)) + 0.64, z), _q.setFromEuler(_e.set(0, -c.p.dir * Math.PI / 2, 0)), _s.set(1, 1, 1)); capsules.setMatrixAt(i, _m); capsules.setColorAt(i, _c.set(COULEUR_CAPSULE[c.type])); i++; }
  capsules.count = i; capsules.instanceMatrix.needsUpdate = true; if (capsules.instanceColor) capsules.instanceColor.needsUpdate = true;
  tapis.offset.y = (tapis.offset.y + dt * 0.6) % 1; tapisR.offset.y = (tapisR.offset.y + dt * 1.4) % 1;
});
// Le collecteur : s'il a un tapis de départ, E y dépose le réservoir dans le silo ; sinon il le vend.
function deposerOuVendre() {
  if (departs().length && S.charge > 0) { S.silo += S.charge; S.siloValeur += S.valeur; S.charge = 0; S.valeur = 0; sons.achat(); ecrireEcran(ECRAN_COLLECTEUR, `${Math.floor(S.silo)} kg`); return; }
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
