
// =====================================================================
// 11. La boucle : une pression sur une tuile sèche la transforme aussitôt (ses fleurs se redressent et
//     prennent leur couleur) et met son pollen dans le réservoir. On vide le réservoir au collecteur,
//     on achète au comptoir : tout est en vente tout de suite, seul l'argent manque. Aucune attente.
//     Une tuile donne 0,5 kg de pollen ; 1 kg vaut 10 cr ; une fleur dorée vaut 50 fois plus.
// =====================================================================
const KG_TUILE = 0.5, PRIX_KG = 10;
const OBJETS_DEF = { ruche: { nom: 'Ruche', court: 'Ruche' } };   // ce qui se vend au comptoir et n'est pas un outil en main
const S = { credits: 0, charge: 0, valeur: 0, outils: ['pinceau'], tuiles: 0, ventes: 0, silo: 0 };   // l'état du joueur (sauvegardé)
const ORDRE_OUTILS = ['pinceau', 'brosse', 'large', 'xl', 'souffleur', 'tuyau', 'marteau'];
const outilDef = () => OUTILS_DEF[outilEnMain];
const chargeMax = () => { let m = 0; for (const o of S.outils) m = Math.max(m, OUTILS_DEF[o].charge || 0); return m; };   // le réservoir suit le meilleur outil acquis

// --- Le son : synthèse WebAudio. Un pop varié par tuile, une petite fanfare par vente. ---
Object.assign(sons, {
  ctx: null,
  init() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.sortie = this.ctx.createGain(); this.sortie.gain.value = 0.35; this.sortie.connect(this.ctx.destination); } catch (e) { this.ctx = null; } },
  note(f, t0, d, type = 'sine', v = 0.3) { if (!this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0; o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(this.sortie); o.start(t); o.stop(t + d + 0.05); },
  pop() { const f = 520 + Math.random() * 380; this.note(f, 0, 0.12, 'triangle', 0.25); this.note(f * 1.5, 0.03, 0.1, 'sine', 0.12); },
  vente() { [523, 659, 784, 1047].forEach((f, k) => this.note(f, k * 0.08, 0.25, 'triangle', 0.22)); },
  achat() { [392, 523, 784].forEach((f, k) => this.note(f, k * 0.1, 0.35, 'square', 0.08)); },
  refus() { this.note(180, 0, 0.18, 'square', 0.08); },
  arrache() { this.note(140 + Math.random() * 60, 0, 0.15, 'sawtooth', 0.08); },
});

// --- Les particules : un nuage de pollen jaillit de la tuile transformée. ---
const NPART = 500, partPos = new Float32Array(NPART * 3), partVel = new Float32Array(NPART * 3), partVie = new Float32Array(NPART);
const partGeo = new THREE.BufferGeometry(); partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
const particules = new THREE.Points(partGeo, new THREE.PointsMaterial({ color: CHARTE.pollen, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false }));
particules.frustumCulled = false; scene.add(particules);
let partI = 0;
function bouffee(x, y, z, n = 18, couleur) {
  for (let k = 0; k < n; k++) { const i = partI++ % NPART; partPos.set([x + (Math.random() - 0.5) * 1.2, y + 0.3, z + (Math.random() - 0.5) * 1.2], i * 3); partVel.set([(Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 0.8], i * 3); partVie[i] = 0.8 + Math.random() * 0.6; }
  if (couleur) particules.material.color.set(couleur);
}
MAJ.push((dt) => {
  for (let i = 0; i < NPART; i++) { if (partVie[i] <= 0) { partPos[i * 3 + 1] = -100; continue; } partVie[i] -= dt; partVel[i * 3 + 1] -= dt * 1.2; for (let a = 0; a < 3; a++) partPos[i * 3 + a] += partVel[i * 3 + a] * dt; }
  partGeo.attributes.position.needsUpdate = true;
  UTEMPS.value = gt; majFleurs();
});

// --- La visée : rayon depuis l'œil vers le centre de l'écran, jusqu'au sol, portée 5 m. ---
const _dir = new THREE.Vector3();
let visee = null;   // { x, z, i (tuile), dist }
function viser() {
  camera.getWorldDirection(_dir); const o = camera.position;
  let prev = 0;
  for (let t = 0.3; t <= 5.2; t += 0.1) {
    const x = o.x + _dir.x * t, y = o.y + _dir.y * t, z = o.z + _dir.z * t;
    if (y <= H(x, z)) { const tt = (prev + t) / 2, X = o.x + _dir.x * tt, Z = o.z + _dir.z * tt, [q, r] = versHex(X, Z); return { x: X, z: Z, i: idxDe(q, r), dist: tt }; }
    prev = t;
  }
  return null;
}
// Une tuile est pollinisable si elle est sèche, sans chardons, et arrosée si elle est aride.
const pollinisable = (i) => i >= 0 && !T.vert[i] && T.sorte[i] !== 1 && !(T.sorte[i] === 2 && !T.irrigue[i]);
function groupeVise(v, largeur) {   // la tuile visée et ses voisines dans l'axe perpendiculaire au regard
  if (!v || v.i < 0) return [];
  const rx = Math.cos(joueur.yaw), rz = -Math.sin(joueur.yaw), out = [];
  for (let k = 0; k < largeur; k++) { const off = (k - (largeur - 1) / 2) * 1.8, [q, r] = versHex(v.x + rx * off, v.z + rz * off), i = idxDe(q, r); if (i >= 0 && !out.includes(i)) out.push(i); }
  return out;
}
const secteurs = Array.from({ length: NSECT }, () => ({ total: 0, vert: 0 }));
for (let i = 0; i < NT; i++) { secteurs[T.secteur[i]].total++; secteurs[T.secteur[i]].vert += T.vert[i]; }
function polliniser(i, par = 'joueur') {   // rend une tuile à la vie, tout de suite ; renvoie la valeur de son pollen
  if (!pollinisable(i)) return 0;
  const doree = T.sorte[i] === 3;
  if (doree) cueillirDoree(i);
  fleurirTuile(i, gt); secteurs[T.secteur[i]].vert++; S.tuiles++;
  bouffee(T.x[i], H(T.x[i], T.z[i]), T.z[i], par === 'joueur' ? 16 : 8, doree ? 0xffe27a : CHARTE.pollen);
  return KG_TUILE * PRIX_KG * (doree ? 50 : 1);
}
// L'action de l'outil en main se déclenche à la pression (pas de maintien). Les étapes suivantes ajoutent
// leurs actions (arracher, construire) : { quand(v), faire(v), geste }.
let groupe = [], actionAvant = false;
const ACTIONS = [];
function majAction() {
  visee = joueur.enVehicule ? null : viser();
  const def = outilDef();
  let cibleAction = null;
  for (const a of ACTIONS) if (a.quand(visee)) { cibleAction = a; break; }
  if (cibleAction) groupe = visee && visee.i >= 0 ? [visee.i] : [];
  else if (def.largeur && visee && visee.dist < 4.6 && S.charge < chargeMax() - 1e-6) groupe = groupeVise(visee, def.largeur).filter(pollinisable);
  else groupe = [];
  selectionner(groupe);
  SEL.value.z = groupe.length ? 0.7 + Math.sin(gt * 5) * 0.15 : 0;
  gesteType = cibleAction && cibleAction.geste ? cibleAction.geste : 'brosser';
  const presse = E.presse || (E.action && !actionAvant); actionAvant = E.action;
  if (!presse) return;
  coup = 1;   // le geste de l'outil à l'écran
  if (cibleAction) { cibleAction.faire(visee); return; }
  let n = 0;
  for (const i of groupe) {
    if (S.charge >= chargeMax() - 1e-6) break;
    const v = polliniser(i); if (v > 0) { S.charge = Math.min(chargeMax(), S.charge + KG_TUILE); S.valeur += v; n++; }
  }
  if (n) sons.pop();
}
MAJ.push(majAction);

// --- Changer d'outil : chiffres 1 à 7, molette, ou les ronds à l'écran. ---
function changerOutil(cle) { if (!S.outils.includes(cle) || cle === outilEnMain) return; prendre(cle); }
MAJ.push(() => {
  if (E.outil === -1) return;
  const possedes = ORDRE_OUTILS.filter((o) => S.outils.includes(o));
  if (E.outil >= 0) { const cle = ORDRE_OUTILS[E.outil]; if (cle) changerOutil(cle); }
  else { const k = possedes.indexOf(outilEnMain), n = possedes.length; changerOutil(possedes[(k + (E.outil === -3 ? 1 : -1) + n) % n]); }
});

// --- Le collecteur : E y vide le réservoir. Son écran affiche le gain de la dernière vente. ---
function ecrireEcran(mat, texte) {
  const cv = mat.emissiveMap.image, g = cv.getContext('2d'), w = cv.width, h = cv.height;
  g.fillStyle = '#121518'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(244,180,26,.25)'; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#f4b41a'; let f = 54; do { g.font = `800 ${f}px system-ui, sans-serif`; f -= 2; } while (g.measureText(texte).width > w - 24 && f > 12); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texte, w / 2, h / 2 + 4);
  mat.emissiveMap.needsUpdate = true;
}
let ECRAN_COLLECTEUR = null; COLLECTEUR.traverse((o) => { if (o.isMesh && o.material.emissiveMap) ECRAN_COLLECTEUR = o.material; });
function vendre() {
  const cr = Math.round(S.valeur); if (cr <= 0) { sons.refus(); return; }
  S.credits += cr; S.ventes++; S.charge = 0; S.valeur = 0;
  ecrireEcran(ECRAN_COLLECTEUR, `+${cr} cr`); sons.vente();
}
INTER.push({ obj: COLLECTEUR, x: COLLECTEUR.position.x, z: COLLECTEUR.position.z, r: 3.4, agir: () => vendre() });

// --- Le comptoir : chaque présentoir porte ce qu'il vend ; grisé tant que c'est trop cher. ---
const VENTE_COMPTOIR = [['brosse', 300], ['large', 1200], ['xl', 3200], ['souffleur', 8000], ['tuyau', 150], ['ruche', 400], ['marteau', 500]];
VENTE_COMPTOIR.forEach(([cle, prix], k) => presentoir(cle, prix, k, VENTE_COMPTOIR.length));
const ACHAT = { ruche: null };   // effet d'achat des objets, fourni par les activités
function acheter(p) {
  if (OUTILS_DEF[p.cle] && S.outils.includes(p.cle)) return;
  if (S.credits < p.prix) { sons.refus(); return; }
  S.credits -= p.prix; sons.achat();
  if (OUTILS_DEF[p.cle]) { S.outils.push(p.cle); changerOutil(p.cle); }
  else if (ACHAT[p.cle]) ACHAT[p.cle](p);
}
for (const p of PRESENTOIRS) INTER.push({ obj: p.g, x: p.x, z: p.z, r: 1.6, presentoir: p, agir() { acheter(p); } });
MAJ.push(() => { for (const p of PRESENTOIRS) majPresentoir(p, (S.outils.includes(p.cle) && OUTILS_DEF[p.cle]) ? 'acquis' : S.credits >= p.prix ? 'abordable' : 'cher'); });

// --- Interagir (E) : l'objet utilisable le plus proche, devant soi. ---
const INTER_HORS = [];   // E sans objet proche (descendre du véhicule, couper le tuyau, changer de pièce)
let interVise = null;
MAJ.push(() => {
  interVise = null; let best = 1e9;
  if (!joueur.enVehicule) {
    const fx = -Math.sin(joueur.yaw), fz = -Math.cos(joueur.yaw);
    for (const it of INTER) { if (it.cache && it.cache()) continue; const dx = it.x - joueur.x, dz = it.z - joueur.z, d = Math.hypot(dx, dz); if (d > it.r) continue; const face = (dx * fx + dz * fz) / (d || 1); if (face < 0.2 && d > 1.2) continue; const sc = d - face; if (sc < best) { best = sc; interVise = it; } }
  }
  if (E.inter && interVise) interVise.agir();
  else if (E.inter) for (const f of INTER_HORS) if (f()) break;
});
