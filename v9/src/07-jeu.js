
// =====================================================================
// 11. La boucle : on maintient l'action sur une tuile sèche ; une jauge circulaire se remplit sur la tuile
//     (2,5 s au pinceau, 0,5 s au souffleur) ; relâcher avant la fin annule. Pleine, la tuile fleurit et son pollen
//     va au réservoir. On vide le réservoir au collecteur. Les achats, eux, sont immédiats.
//     Une tuile donne 0,5 kg de pollen et rapporte le prix de son espèce (3 à 150 cr) ; une fleur dorée, 50 fois plus.
//     Un secteur s'ouvre quand le précédent est pollinisé à 100 %.
// =====================================================================
const KG_TUILE = 0.5;
const OBJETS_DEF = { ruche: { nom: 'Ruche', court: 'Ruche' } };   // ce qui se vend au comptoir et n'est pas un outil en main
const S = { credits: 0, charge: 0, valeur: 0, outils: ['pinceau'], tuiles: 0, ventes: 0, silo: 0, siloValeur: 0 };   // l'état du joueur (sauvegardé)
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
const ouvert = (i) => T.secteur[i] < OUVERTS.value;
const pollinisable = (i) => i >= 0 && ouvert(i) && !T.vert[i] && T.sorte[i] !== 1 && !(T.sorte[i] === 2 && !T.irrigue[i]);
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
  const v = ESPECES[T.couleur[i]].prix * (doree ? 50 : 1);
  bouffee(T.x[i], H(T.x[i], T.z[i]), T.z[i], par === 'joueur' ? 16 : 8, doree ? 0xffe27a : CHARTE.pollen);
  const s = T.secteur[i];   // secteur complet : le suivant s'ouvre
  if (s === OUVERTS.value - 1 && secteurs[s].vert >= secteurs[s].total && OUVERTS.value < NSECT) { OUVERTS.value++; sons.vente(); setTimeout(() => sons.achat(), 400); }
  return v;
}
// L'action de l'outil en main : on la maintient sur la cible pendant la durée de l'outil (ou de l'action :
// arracher, construire). Relâcher, ou changer de cible, remet la jauge à zéro.
let groupe = [], progres = 0, cibleAvant = '', actionAvant = false;
const ACTIONS = [];   // { quand(v), faire(v), duree, geste, instant } ajoutées par les activités et la construction
function majAction(dt) {
  visee = joueur.enVehicule ? null : viser();
  const def = outilDef();
  let cibleAction = null;
  for (const a of ACTIONS) if (a.quand(visee)) { cibleAction = a; break; }
  if (cibleAction) groupe = visee && visee.i >= 0 ? [visee.i] : [];
  else if (def.largeur && visee && visee.dist < 4.6 && S.charge < chargeMax() - 1e-6) groupe = groupeVise(visee, def.largeur).filter(pollinisable);
  else groupe = [];
  selectionner(groupe);
  gesteType = cibleAction && cibleAction.geste ? cibleAction.geste : 'brosser';
  const cle = groupe.join() + (cibleAction ? 'a' : '');
  if (cle !== cibleAvant) { progres = 0; cibleAvant = cle; }   // nouvelle cible : on recommence
  const duree = cibleAction ? cibleAction.duree : def.duree;
  gesteActif = !!(groupe.length || cibleAction);
  if (cibleAction && cibleAction.instant) {   // l'outil de construction agit à la pression
    const presse = E.presse || (E.action && !actionAvant); actionAvant = E.action;
    if (presse) cibleAction.faire(visee);
    SEL.value.set(0, 0, 0); return;
  }
  actionAvant = E.action;
  if (E.action && groupe.length) {
    progres += dt;
    if (progres >= duree) {
      progres = 0; cibleAvant = '';
      if (cibleAction) cibleAction.faire(visee);
      else {
        let n = 0;
        for (const i of groupe) {
          if (S.charge >= chargeMax() - 1e-6) break;
          const v = polliniser(i); if (v > 0) { S.charge = Math.min(chargeMax(), S.charge + KG_TUILE); S.valeur += v; n++; }
        }
        if (n) sons.pop();
      }
    }
  } else progres = 0;   // relâcher annule
  SEL.value.set(0, groupe.length ? progres / duree : 0, groupe.length ? 0.75 + Math.sin(gt * 5) * 0.1 : 0);
}
MAJ.push(majAction);
// La jauge circulaire : un anneau posé juste au-dessus des fleurs de chaque tuile visée, qui se remplit en jaune pollen.
const JAUGE_MAT = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { uP: { value: 0 }, uC: { value: new THREE.Color(CHARTE.pollen) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec2 vUv; uniform float uP; uniform vec3 uC;
    void main(){ vec2 d = vUv - 0.5; float r = length(d) * 2.0; if (r < 0.8 || r > 0.97) discard;
      float a = fract(atan(d.x, d.y) / 6.2831853 + 1.0); bool plein = a < uP;
      gl_FragColor = plein ? vec4(uC * 1.4, 1.0) : vec4(0.12, 0.13, 0.15, 0.45);
      #include <colorspace_fragment>
    }`,
});
const JAUGES = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7).rotateX(-Math.PI / 2), JAUGE_MAT); m.renderOrder = 5; m.visible = false; scene.add(m); return m; });
MAJ.push(() => {
  JAUGE_MAT.uniforms.uP.value = SEL.value.y;
  JAUGES.forEach((m, k) => { const i = groupe[k]; m.visible = i !== undefined && !joueur.enVehicule; if (m.visible) m.position.set(T.x[i], H(T.x[i], T.z[i]) + 0.5, T.z[i]); });
});

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
