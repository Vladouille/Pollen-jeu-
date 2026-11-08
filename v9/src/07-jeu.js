
// =====================================================================
// 11. La boucle : polliniser (la charge monte, la tuile passe du beige au vert, les fleurs se redressent),
//     vider la charge au collecteur (les crédits montent), acheter l'outil suivant au comptoir
//     (il passe en main tout de suite). Une tuile donne 0,5 kg de pollen ; 1 kg vaut 10 cr.
// =====================================================================
const KG_TUILE = 0.5, PRIX_KG = 10, VALEUR_ESPECE = [1, 0.8, 1.25];   // lavande, colza, trèfle
const OBJETS_DEF = {   // ce qui se vend au comptoir et n'est pas un outil en main
  ruche: { nom: 'Ruche', court: 'Ruche', effet: 'Pollinise autour d’elle et produit du miel' },
};
const S = {   // tout l'état du joueur (sauvegardé à l'étape 6)
  credits: 0, charge: 0, valeur: 0, outils: ['pinceau'], miel: 0, temps: 0, tuiles: 0, ventes: 0, debloque: 0,
  boost: 1, prixVente: 1,
};
const ORDRE_OUTILS = ['pinceau', 'brosse', 'large', 'xl', 'souffleur', 'tuyau', 'marteau'];
const outilDef = () => OUTILS_DEF[outilEnMain];
const chargeMax = () => { let m = 0; for (const o of S.outils) m = Math.max(m, OUTILS_DEF[o].charge || 0); return m; };   // le réservoir suit le meilleur outil acquis

// --- Le son : synthèse WebAudio, rien à charger. Un pop varié par tuile, une petite fanfare par vente. ---
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

// --- Les particules de pollen : un nuage jaune qui jaillit de la tuile pollinisée. ---
const NPART = 400, partPos = new Float32Array(NPART * 3), partVel = new Float32Array(NPART * 3), partVie = new Float32Array(NPART);
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
});

// --- Messages : une ligne qui apparaît sous la boussole puis s'efface. ---
const MESSAGES = [];
function message(texte, type = '') { MESSAGES.push({ texte, type, t: gt }); if (MESSAGES.length > 3) MESSAGES.shift(); }

// --- La visée : rayon depuis l'œil vers le centre de l'écran, jusqu'au sol, portée 4,5 m. ---
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
// Une tuile est pollinisable si elle est sèche, sans chardons et arrosée si elle est aride.
const pollinisable = (i) => i >= 0 && !T.vert[i] && T.sorte[i] !== 1 && !(T.sorte[i] === 2 && !T.irrigue[i]);
function groupeVise(v, largeur) {   // la tuile visée et ses voisines dans l'axe perpendiculaire au regard
  if (!v || v.i < 0) return [];
  const rx = Math.cos(joueur.yaw), rz = -Math.sin(joueur.yaw), out = [];
  for (let k = 0; k < largeur; k++) { const off = (k - (largeur - 1) / 2) * 1.8, [q, r] = versHex(v.x + rx * off, v.z + rz * off), i = idxDe(q, r); if (i >= 0 && !out.includes(i)) out.push(i); }
  return out;
}
const secteurs = Array.from({ length: NSECT }, () => ({ total: 0, vert: 0 }));
for (let i = 0; i < NT; i++) { secteurs[T.secteur[i]].total++; secteurs[T.secteur[i]].vert += T.vert[i]; }
const ECOUTE = { tuile: [] };   // abonnés aux tuiles fleuries (contrats, étape 6)
function polliniser(i, par = 'joueur') {   // rend une tuile à la vie ; renvoie la valeur du pollen récolté
  if (!pollinisable(i)) return 0;
  const doree = T.sorte[i] === 3;
  if (doree) cueillirDoree(i);
  fleurirTuile(i, gt); secteurs[T.secteur[i]].vert++; S.tuiles++;
  bouffee(T.x[i], H(T.x[i], T.z[i]), T.z[i], par === 'joueur' ? 16 : 8, doree ? 0xffe27a : CHARTE.pollen);
  for (const f of ECOUTE.tuile) f(i, par);
  return KG_TUILE * PRIX_KG * VALEUR_ESPECE[T.espece[i]] * (doree ? 50 : 1) * S.boost;
}
let progres = 0, groupe = [], dernierPop = 0;
const ACTIONS = [];   // actions de l'outil en main ajoutées par les étapes 5 et 6 : { quand(v), duree, faire(v), texte }
function majAction(dt) {
  visee = joueur.enVehicule ? null : viser();
  const def = outilDef();
  let cibleAction = null;
  for (const a of ACTIONS) if (a.quand(visee)) { cibleAction = a; break; }
  if (cibleAction) { groupe = cibleAction.groupe ? cibleAction.groupe(visee) : visee && visee.i >= 0 ? [visee.i] : []; }
  else if (def.largeur && visee && visee.dist < 4.6) groupe = groupeVise(visee, def.largeur).filter(pollinisable);
  else groupe = [];
  selectionner(groupe);
  const plein = S.charge >= chargeMax() - 1e-6;
  const peut = cibleAction ? true : groupe.length > 0 && !plein;
  majAction.etat = { cibleAction, peut, plein, groupe };
  gesteType = cibleAction && cibleAction.geste ? cibleAction.geste : 'brosser';
  if (E.action && peut) {
    const duree = cibleAction ? cibleAction.duree : def.duree;
    progres += dt;
    if (progres >= duree) {
      progres = 0;
      if (cibleAction) cibleAction.faire(visee, groupe);
      else {
        let n = 0;
        for (const i of groupe) {
          if (S.charge >= chargeMax() - 1e-6) break;
          const v = polliniser(i); if (v > 0) { S.charge = Math.min(chargeMax(), S.charge + KG_TUILE); S.valeur += v; n++; }
        }
        if (n && gt - dernierPop > 0.05) { sons.pop(); dernierPop = gt; }
        if (S.charge >= chargeMax() - 1e-6) message('Réservoir plein : vide-le au collecteur', 'alerte');
      }
    }
  } else progres = Math.max(0, progres - dt * 3);
  SEL.value.z = groupe.length ? 0.55 + 0.45 * Math.sin(gt * 6) * 0.3 + (progres / ((cibleAction ? cibleAction.duree : def.duree) || 1)) * 0.9 : 0;
  majAction.progres = groupe.length ? progres / ((cibleAction ? cibleAction.duree : def.duree) || 1) : 0;
}
MAJ.push(majAction);
MAJ.push(() => { UTEMPS.value = gt; S.temps += 0; });

// --- Changer d'outil : chiffres 1 à 7, molette, ou les emplacements à l'écran. ---
function changerOutil(cle) { if (!S.outils.includes(cle) || cle === outilEnMain) return; prendre(cle); progres = 0; }
MAJ.push(() => {
  if (E.outil === -1) return;
  const possedes = ORDRE_OUTILS.filter((o) => S.outils.includes(o));
  if (E.outil >= 0) { const cle = ORDRE_OUTILS[E.outil]; if (cle) changerOutil(cle); }
  else { const k = possedes.indexOf(outilEnMain), n = possedes.length; changerOutil(possedes[(k + (E.outil === -3 ? 1 : -1) + n) % n]); }
});

// --- Le collecteur : on y vide la charge. Son écran affiche la dernière vente. ---
function ecrireEcran(mat, texte) {
  const cv = mat.emissiveMap.image, g = cv.getContext('2d'), w = cv.width, h = cv.height;
  g.fillStyle = '#121518'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(244,180,26,.25)'; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#f4b41a'; g.font = '800 54px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texte, w / 2, h / 2 + 4);
  mat.emissiveMap.needsUpdate = true;
}
let ECRAN_COLLECTEUR = null; COLLECTEUR.traverse((o) => { if (o.isMesh && o.material.emissiveMap) ECRAN_COLLECTEUR = o.material; });
const VENTES = [];   // ce qui se vend au collecteur en plus du pollen (miel, étape 5) : { qte(), libelle(n), prix, retirer() }
function venteTotale() { let cr = S.valeur * S.prixVente, parts = []; if (S.charge > 0) parts.push(`${S.charge.toFixed(1).replace('.', ',')} kg`); for (const v of VENTES) { const n = v.qte(); if (n > 0) { cr += n * v.prix * S.prixVente; parts.push(v.libelle(n)); } } return { cr: Math.round(cr), parts }; }
function vendre() {
  const { cr, parts } = venteTotale(); if (cr <= 0) { sons.refus(); return; }
  S.credits += cr; S.ventes++; S.charge = 0; S.valeur = 0; for (const v of VENTES) v.retirer();
  ecrireEcran(ECRAN_COLLECTEUR, `+${cr} cr`); sons.vente(); gainAffiche(cr);
  message(`Vendu : ${parts.join(' + ')} → ${cr.toLocaleString('fr-FR')} cr`, 'gain');
}
const gainsFlottants = []; function gainAffiche(cr) { gainsFlottants.push({ cr, t: gt }); }
INTER.push({ obj: COLLECTEUR, x: COLLECTEUR.position.x, z: COLLECTEUR.position.z, y: 2.7, r: 3.4, nom: 'Collecteur',
  texte() { const { cr, parts } = venteTotale(); return cr > 0 ? `Vendre ${parts.join(' + ')} · ${cr.toLocaleString('fr-FR')} cr` : 'Collecteur · rien à vendre'; },
  actif() { return venteTotale().cr > 0; }, agir: vendre });

// --- Le comptoir : chaque présentoir porte un outil ; grisé s'il est trop cher, « bientôt » s'il n'est pas encore débloqué. ---
const VENTE_COMPTOIR = [['brosse', 300], ['large', 1200], ['xl', 3200], ['souffleur', 8000], ['tuyau', 150], ['ruche', 600], ['marteau', 500]];
VENTE_COMPTOIR.forEach(([cle, prix], k) => presentoir(cle, prix, k, VENTE_COMPTOIR.length));
const DEBLOQUE = new Set(['brosse', 'large', 'xl', 'souffleur']);   // complété par la table des nouveautés (étape 6)
const ACHAT = { ruche: null };   // effet d'achat des objets, fourni par l'étape 5
function acheter(p) {
  const possede = S.outils.includes(p.cle);
  if (possede || !DEBLOQUE.has(p.cle)) return;
  if (S.credits < p.prix) { sons.refus(); message(`Il manque ${(p.prix - S.credits).toLocaleString('fr-FR')} cr`, 'alerte'); return; }
  S.credits -= p.prix; sons.achat();
  if (OUTILS_DEF[p.cle]) { S.outils.push(p.cle); changerOutil(p.cle); message(`${OUTILS_DEF[p.cle].nom} en main : ${OUTILS_DEF[p.cle].effet}`, 'gain'); }
  else if (ACHAT[p.cle]) ACHAT[p.cle](p);
}
for (const p of PRESENTOIRS) INTER.push({ obj: p.g, x: p.x, z: p.z, y: 1.5, r: 1.6, nom: (OUTILS_DEF[p.cle] || OBJETS_DEF[p.cle]).nom, presentoir: p,
  texte() { const d = OUTILS_DEF[p.cle] || OBJETS_DEF[p.cle]; if (!DEBLOQUE.has(p.cle)) return `${d.nom} · bientôt`; if (S.outils.includes(p.cle)) return `${d.nom} · acquis`; return `Acheter ${d.nom} · ${p.prix.toLocaleString('fr-FR')} cr`; },
  actif() { return DEBLOQUE.has(p.cle) && !S.outils.includes(p.cle) && S.credits >= p.prix; }, agir() { acheter(p); } });
MAJ.push(() => { for (const p of PRESENTOIRS) majPresentoir(p, !DEBLOQUE.has(p.cle) ? 'verrou' : (S.outils.includes(p.cle) && OUTILS_DEF[p.cle]) ? 'acquis' : S.credits >= p.prix ? 'abordable' : 'cher'); });

// --- Interagir : l'objet utilisable le plus proche, dans le champ de vision. ---
const INTER_HORS = [];   // E sans objet proche (descendre du véhicule, couper le tuyau…)
let interVise = null;
MAJ.push(() => {
  interVise = null; let best = 1e9;
  if (!joueur.enVehicule) {
    const fx = -Math.sin(joueur.yaw), fz = -Math.cos(joueur.yaw);
    for (const it of INTER) { if (it.cache && it.cache()) continue; const dx = it.x - joueur.x, dz = it.z - joueur.z, d = Math.hypot(dx, dz); if (d > it.r) continue; const face = (dx * fx + dz * fz) / (d || 1); if (face < 0.2 && d > 1.2) continue; const sc = d - face; if (sc < best && it.texte()) { best = sc; interVise = it; } }
  }
  if (E.inter && interVise) interVise.agir();
  else if (E.inter && INTER_HORS.length) for (const f of INTER_HORS) if (f()) break;
});

// --- L'objectif de la boussole : la prochaine chose utile à faire. ---
function objectif() {
  for (const f of OBJECTIFS) { const o = f(); if (o) return o; }
  if (S.charge >= chargeMax() - 1e-6 || (S.charge > 0 && S.charge >= chargeMax() * 0.8)) return { x: COLLECTEUR.position.x, z: COLLECTEUR.position.z, nom: 'Collecteur' };
  const p = PRESENTOIRS.find((p) => DEBLOQUE.has(p.cle) && !S.outils.includes(p.cle) && S.credits >= p.prix && OUTILS_DEF[p.cle]);
  if (p) return { x: p.x, z: p.z, nom: 'Comptoir' };
  return tuileProche();
}
const OBJECTIFS = [];   // contrats, essaims… insérés par les étapes suivantes
let tuileCache = null, tuileCacheT = -10;
function tuileProche() {   // la tuile pollinisable la plus proche (recalculée deux fois par seconde)
  if (gt - tuileCacheT < 0.5 && tuileCache && pollinisable(tuileCache.i)) return tuileCache;
  tuileCacheT = gt; let best = 1e9, bi = -1;
  for (let i = 0; i < NT; i++) if (pollinisable(i)) { const d = (T.x[i] - joueur.x) ** 2 + (T.z[i] - joueur.z) ** 2; if (d < best) { best = d; bi = i; } }
  tuileCache = bi >= 0 ? { x: T.x[bi], z: T.z[bi], nom: 'Tuile sèche', i: bi } : null;
  return tuileCache;
}
