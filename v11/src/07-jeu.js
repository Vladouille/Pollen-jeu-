
// =====================================================================
// 11. La boucle : on maintient l'action sur une tuile sèche ; une jauge circulaire se remplit au-dessus de la tuile
//     (2,5 s au pinceau, 0,5 s au souffleur) ; relâcher avant la fin annule. Pleine, la tuile fleurit et son pollen
//     va au sac (12 kg au départ, toutes ressources confondues ; plein, E l'emballe en colis). On vend à la borne du
//     comptoir ou au collecteur. Les achats sont immédiats. Un secteur s'ouvre quand le précédent est à 100 %.
// =====================================================================
const KG_TUILE = 0.5;
const RESSOURCES = { pollen: 'Pollen', nectar: 'Nectar', graines: 'Graines', miel: 'Miel', cire: 'Cire', mere: 'Azurelle mère' };
const sacVide = () => Object.fromEntries(Object.keys(RESSOURCES).map((k) => [k, { kg: 0, v: 0 }]));
// Les cinq améliorations de l'atelier (trois niveaux chacune).
const AMELIOS = {
  sac: { nom: 'RÉSERVOIR', unite: '%', valeurs: [100, 125, 150, 200], prix: [800, 4000, 20000] },
  jambes: { nom: 'MARCHE', unite: '%', valeurs: [100, 115, 130, 150], prix: [300, 1200, 4000] },
  geste: { nom: 'GESTE', unite: '%', valeurs: [100, 88, 76, 65], prix: [500, 2000, 6500] },
  negoce: { nom: 'VENTE', unite: '%', valeurs: [100, 110, 120, 135], prix: [800, 3000, 9000] },
  portee: { nom: 'PORTÉE', unite: 'm', valeurs: [6, 7.5, 9, 11], prix: [500, 2500, 9000] },
};
const S = { credits: 0, sac: sacVide(), outils: ['pinceau'], tuiles: 0, ventes: 0, silo: sacVide(), expedie: 0, temps: 0, amelio: { sac: 0, jambes: 0, geste: 0, negoce: 0, portee: 0 }, succes: {}, recolte: 0, pieces: 0 };   // l'état du joueur (sauvegardé)
const amelio = (c) => AMELIOS[c].valeurs[S.amelio[c]];
const ORDRE_OUTILS = ['pinceau', 'brosse', 'large', 'xl', 'souffleur', 'double', 'pulverisateur', 'diffuseur', 'collecteur', 'rateau', 'enfumoir', 'marteau'];
const outilDef = () => OUTILS_DEF[outilEnMain];
const chargeMax = () => Math.round(Math.max(...S.outils.map((o) => OUTILS_DEF[o].charge || 0)) * amelio('sac') / 100);   // le plus grand réservoir parmi les outils possédés
const kgSac = (sac = S.sac) => Object.values(sac).reduce((s, r) => s + r.kg, 0);
const valeurSac = (sac = S.sac) => Object.values(sac).reduce((s, r) => s + r.v, 0);
const place = () => chargeMax() - kgSac();
const DEBITS = {};   // production récente par ressource (pour le tableau de supervision) : { type: [instants] }
function noter(type, n = 1) { const l = DEBITS[type] || (DEBITS[type] = []); for (let k = 0; k < n; k++) l.push(gt); }
function ajouter(type, kg, v, sac = S.sac) { sac[type].kg = +(sac[type].kg + kg).toFixed(3); sac[type].v += v; if (sac === S.sac) { S.recolte += kg; noter(type, kg); } }
function retirer(type, kg) { const r = S.sac[type]; if (r.kg < kg - 1e-6) return false; const part = r.v * kg / r.kg; r.kg = +(r.kg - kg).toFixed(3); r.v -= part; return true; }

// --- Le son : synthèse WebAudio. Chaque tuile enchaînée monte d'un demi-ton ; dehors le vent, dedans un bruit plus sourd. ---
Object.assign(sons, {
  ctx: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.sortie = c.createGain(); this.sortie.gain.value = 0.35; this.sortie.connect(c.destination);
      const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;   // l'ambiance : un bruit filtré
      const src = c.createBufferSource(); src.buffer = b; src.loop = true; this.filtre = c.createBiquadFilter(); this.filtre.type = 'lowpass'; this.filtre.frequency.value = 700; this.vent = c.createGain(); this.vent.gain.value = 0.05;
      src.connect(this.filtre); this.filtre.connect(this.vent); this.vent.connect(this.sortie); src.start();
    } catch (e) { this.ctx = null; }
  },
  ambiance(dedans) { if (!this.ctx) return; const t = this.ctx.currentTime; this.filtre.frequency.setTargetAtTime(dedans ? 160 : 700, t, 0.25); this.vent.gain.setTargetAtTime(dedans ? 0.09 : 0.05, t, 0.25); },
  note(f, t0, d, type = 'sine', v = 0.3) { if (!this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0; o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(this.sortie); o.start(t); o.stop(t + d + 0.05); },
  serie: 0, dernier: -10,
  pop() { this.serie = gt - this.dernier < 2 ? Math.min(this.serie + 1, 12) : 0; /* jusqu’à l’octave, retombe après 2 s d’arrêt */ this.dernier = gt; const f = 440 * Math.pow(2, this.serie / 12); this.note(f, 0, 0.14, 'triangle', 0.25); this.note(f * 2, 0.02, 0.1, 'sine', 0.1); },
  vente() { [523, 659, 784, 1047].forEach((f, k) => this.note(f, k * 0.08, 0.25, 'triangle', 0.22)); },
  achat() { [392, 523, 784].forEach((f, k) => this.note(f, k * 0.1, 0.35, 'square', 0.08)); },
  refus() { this.note(180, 0, 0.18, 'square', 0.08); },
  arrache() { this.note(140 + Math.random() * 60, 0, 0.15, 'sawtooth', 0.08); },
  choc() { this.note(70, 0, 0.25, 'sine', 0.5); this.note(110, 0, 0.12, 'square', 0.12); },
});
MAJ.push(() => sons.ambiance(!!DEDANS.salle));

// --- Les particules : un nuage de pollen jaillit de la tuile transformée. ---
const NPART = 500, partPos = new Float32Array(NPART * 3), partVel = new Float32Array(NPART * 3), partVie = new Float32Array(NPART);
const partGeo = new THREE.BufferGeometry(); partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
const particules = new THREE.Points(partGeo, new THREE.PointsMaterial({ color: CHARTE.pollen, size: 0.07, transparent: true, opacity: 0.9, depthWrite: false }));
particules.frustumCulled = false; scene.add(particules);
let partI = 0;
const _pu = new V3();
function bouffee(p, n = 18, couleur) {   // p : point du monde
  const { up, est, nord } = repere(p);
  for (let k = 0; k < n; k++) { const i = partI++ % NPART, a = Math.random() - 0.5, b = Math.random() - 0.5; _pu.copy(p).addScaledVector(est, a * 1.2).addScaledVector(nord, b * 1.2).addScaledVector(up, 0.3); partPos.set([_pu.x, _pu.y, _pu.z], i * 3); _pu.copy(up).multiplyScalar(0.8 + Math.random() * 1.2).addScaledVector(est, a * 0.8).addScaledVector(nord, b * 0.8); partVel.set([_pu.x, _pu.y, _pu.z], i * 3); partVie[i] = 0.8 + Math.random() * 0.6; }
  if (couleur) particules.material.color.set(couleur);
}
MAJ.push((dt) => {
  const up = joueur.haut;
  for (let i = 0; i < NPART; i++) { if (partVie[i] <= 0) { partPos[i * 3] = partPos[i * 3 + 1] = partPos[i * 3 + 2] = 0; continue; } partVie[i] -= dt; for (let a = 0; a < 3; a++) { partVel[i * 3 + a] -= up.getComponent(a) * dt * 1.2; partPos[i * 3 + a] += partVel[i * 3 + a] * dt; } }
  partGeo.attributes.position.needsUpdate = true;
  UTEMPS.value = gt; majFleurs();
});

// --- La visée : rayon depuis l'œil vers le centre de l'écran, jusqu'au sol. ---
const _dir = new V3(), _vp = new V3();
let visee = null;   // { p (point du sol), k (tuile de secteur ou -1), id (tuile du treillis), dist }
function viser(portee = amelio('portee') + 0.6) {
  camera.getWorldDirection(_dir); const o = camera.position; let prev = 0;
  for (let t = 0.3; t <= portee; t += 0.15) {
    _vp.copy(o).addScaledVector(_dir, t); const l = _vp.length(); _d.copy(_vp).multiplyScalar(1 / l);
    if (l <= sol(_d) + surcote(_vp)) { const tt = (prev + t) / 2, p = surSol(new V3().copy(o).addScaledVector(_dir, tt)); _d.copy(p).normalize(); return { p, id: tuileDe(_d), k: tuileA(p), dist: tt }; }
    prev = t;
  }
  return null;
}
const ouvert = (k) => k >= 0 && T.sect[k] < OUVERTS.value;
const pollinisable = (k) => ouvert(k) && !T.vert[k] && T.sorte[k] === 0;
const prixTuile = (k) => SECTEURS[T.sect[k]].prix;
function groupeVise(v, largeur) {   // la tuile visée et les plus proches du point visé, parmi celles à rendre à la vie
  if (!v || v.k < 0) return [];
  const vus = new Set([v.k]), file = [v.k], cand = [];
  while (file.length && cand.length < largeur * 3 + 6) { const k = file.shift(); cand.push(k); for (const n of voisinesT(k)) if (!vus.has(n)) { vus.add(n); file.push(n); } }
  return cand.filter(pollinisable).sort((a, b) => T.pos[a].distanceTo(v.p) - T.pos[b].distanceTo(v.p)).slice(0, largeur);
}
const secteurs = Array.from({ length: NSECT }, () => ({ total: 0, vert: 0 }));
for (let k = 0; k < NT; k++) { secteurs[T.sect[k]].total++; secteurs[T.sect[k]].vert += T.vert[k]; }
for (const Se of secteurs) Se.palier = Math.floor(Se.vert / Se.total * 4);
const majProgres = () => { for (let s = 0; s < NSECT; s++) SOL_U.uProg.value[s] = secteurs[s].vert / secteurs[s].total; };
const FIN_SECTEUR = [];   // ce qui se joue quand un secteur atteint 100 %
const PALIERS = [];   // ce qui se joue à 25, 50 et 75 % d'un secteur : (secteur, palier)
function polliniser(k, par = 'joueur') {   // rend une tuile à la vie ; renvoie la valeur de son pollen
  if (!pollinisable(k)) return 0;
  fleurirTuile(k, gt); const s = T.sect[k], Se = secteurs[s]; Se.vert++; S.tuiles++; majProgres();
  bouffee(T.pos[k], par === 'joueur' ? 16 : 8, CHARTE.pollen);
  const palier = Math.floor(Se.vert / Se.total * 4);
  if (palier > (Se.palier || 0)) { Se.palier = palier; if (palier < 4) for (const f of PALIERS) f(s, palier * 25); }
  if (s === OUVERTS.value - 1 && Se.vert >= Se.total) { if (OUVERTS.value < NSECT) OUVERTS.value++; for (const f of FIN_SECTEUR) f(s); }
  return prixTuile(k);
}
// L'action de l'outil en main : on la maintient sur la cible pendant la durée de l'outil. Relâcher, ou changer de cible,
// remet la jauge à zéro. Les activités ajoutent leurs actions : { quand(v), faire(v), duree, geste, objet(v) }.
let groupe = [], progres = 0, cibleAvant = '';
const ACTIONS = [], JAUGE_OBJ = { pos: null };
function majAction(dt) {
  visee = (joueur.enVehicule || CARTE.ouverte || CONS.actif) ? null : viser();
  const def = outilDef();
  let cibleAction = null;
  if (visee) for (const a of ACTIONS) if (a.quand(visee)) { cibleAction = a; break; }
  if (cibleAction) groupe = cibleAction.objet ? [] : visee.k >= 0 ? [visee.k] : [];
  else if (def.largeur && visee && place() >= KG_TUILE) groupe = groupeVise(visee, def.largeur).filter(pollinisable);
  else groupe = [];
  selectionner(groupe);
  gesteType = cibleAction && cibleAction.geste ? cibleAction.geste : 'brosser';
  JAUGE_OBJ.pos = cibleAction && cibleAction.objet ? cibleAction.objet(visee) : null;   // calculée avant l'action, qui peut faire disparaître la cible
  const cle = groupe.join() + (cibleAction ? 'a' + ACTIONS.indexOf(cibleAction) : '');
  if (cle !== cibleAvant) { progres = 0; cibleAvant = cle; }
  const duree = (cibleAction ? cibleAction.duree : def.duree || 1) * amelio('geste') / 100;
  gesteActif = !!(groupe.length || cibleAction);
  if (E.action && gesteActif) {
    progres += dt;
    if (progres >= duree) {
      progres = 0; cibleAvant = '';
      if (cibleAction) cibleAction.faire(visee);
      else { let n = 0; for (const k of groupe) { if (place() < KG_TUILE) break; const v = polliniser(k); if (v > 0) { ajouter('pollen', KG_TUILE, v); n++; } } if (n) sons.pop(); }
    }
  } else progres = 0;   // relâcher annule
  SEL.y = gesteActif ? progres / duree : 0; SOL_U.uSelI.value = groupe.length ? 0.75 + Math.sin(gt * 5) * 0.1 : 0;
}
MAJ.push(majAction);
// La jauge circulaire : un anneau posé juste au-dessus de la cible, qui se remplit en jaune pollen.
const JAUGE_MAT = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { uP: { value: 0 }, uC: { value: new THREE.Color(ORANGE) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `varying vec2 vUv; uniform float uP; uniform vec3 uC;
    void main(){ vec2 d = vUv - 0.5; float r = length(d) * 2.0; if (r < 0.8 || r > 0.97) discard;
      gl_FragColor = fract(atan(d.x, d.y) / 6.2831853 + 1.0) < uP ? vec4(uC * 1.4, 1.0) : vec4(0.12, 0.13, 0.15, 0.45);
      #include <colorspace_fragment>
    }`,
});
const JAUGES = Array.from({ length: 20 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4).rotateX(-Math.PI / 2), JAUGE_MAT); m.renderOrder = 5; m.visible = false; scene.add(m); return m; });
MAJ.push(() => {
  JAUGE_MAT.uniforms.uP.value = SEL.y;
  JAUGES.forEach((m, n) => { const k = groupe[n]; m.visible = k !== undefined && !joueur.enVehicule; if (m.visible) { m.position.copy(T.pos[k]).addScaledVector(T.dir[k], 0.7); qHaut(T.dir[k], m.quaternion); } });
  if (JAUGE_OBJ.pos && !joueur.enVehicule) { const m = JAUGES[0]; m.visible = true; m.position.copy(JAUGE_OBJ.pos); qHaut(_d.copy(JAUGE_OBJ.pos).normalize(), m.quaternion); }
});

// --- Changer d'outil : chiffres 1 à 0, molette, ou les ronds à l'écran. ---
function changerOutil(cle) { if (!S.outils.includes(cle) || cle === outilEnMain) return; prendre(cle); }
MAJ.push(() => {
  if (E.outil === -1 || CONS.actif) return;
  const possedes = ORDRE_OUTILS.filter((o) => S.outils.includes(o));
  if (E.outil >= 0) { const cle = ORDRE_OUTILS[E.outil]; if (cle) changerOutil(cle); }
  else { const k = possedes.indexOf(outilEnMain), n = possedes.length; changerOutil(possedes[(k + (E.outil === -3 ? 1 : -1) + n) % n]); }
});

// --- Vendre : à la borne du comptoir (face à l'entrée) ou au collecteur dehors. Les cageots du comptoir se remplissent. ---
function ecrireEcran(mat, texte) {
  const cv = mat.emissiveMap.image, g = cv.getContext('2d'), w = cv.width, h = cv.height;
  g.fillStyle = '#121518'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(240,138,36,.25)'; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#f08a24'; let f = 54; do { g.font = `800 ${f}px system-ui, sans-serif`; f -= 2; } while (g.measureText(texte).width > w - 24 && f > 12); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texte, w / 2, h / 2 + 4);
  mat.emissiveMap.needsUpdate = true;
}
let ECRAN_COLLECTEUR = null; COLLECTEUR.traverse((o) => { if (o.isMesh && o.material.emissiveMap) ECRAN_COLLECTEUR = o.material; });
function encaisser(v) { const cr = Math.round(v * amelio('negoce') / 100); S.credits += cr; return cr; }   // tout ce qui se vend passe par ici
function vendre(extra = 0) {
  const brut = valeurSac() + extra; if (brut <= 0) { sons.refus(); return 0; }
  const cr = encaisser(brut); S.ventes++; S.sac = sacVide();
  ecrireEcran(ECRAN_COLLECTEUR, `+${cr} cr`); ecrireEcran(BORNE_VENTE.mat, `+${cr} cr`); sons.vente(); sauverBientot(); return cr;
}
INTER.push({ p: new V3().copy(COLLECTEUR.position).addScaledVector(COLLECTEUR.userData.az, 0.9).addScaledVector(_d.copy(COLLECTEUR.position).normalize(), 1.6), r: 3.6, vente: true, get etiquette() { return porte ? 'Vendre le colis' : kgSac() > 0 ? (departs().length ? 'Verser au silo' : 'Vendre') : null; }, agir: () => vendre() });
INTER.push({ p: monde(COMPTOIR, 0, 1.3, 0.6), r: 2.6, vente: true, get etiquette() { return porte ? 'Vendre le colis' : kgSac() > 0 ? 'Vendre' : null; }, agir: () => vendre() });

// --- L'établi du comptoir : tous les outils y sont exposés. Possédé : blanc et orange ; trop cher : gris translucide. ---
const VENTE_COMPTOIR = ORDRE_OUTILS.map((o) => [o, OUTILS_DEF[o].prix]);
VENTE_COMPTOIR.forEach(([cle, prix], n) => {
  const g = COMPTOIR, F = g.userData.salle.F, x = -4.55 + n * 0.83, objet = fusionner(fabriquerOutil(cle)), l = { pinceau: 0.42, brosse: 1.05, large: 1.2, xl: 1.35, rateau: 1.1, souffleur: 0.8 }[cle] || 0.6;
  objet.scale.setScalar(Math.min(1, 0.85 / l) * (cle === 'xl' || cle === 'large' ? 0.5 : 1)); objet.userData.garder = true; placer(g, objet, x, F + 0.9, -2.85);
  const plaque = placer(g, boite(0.7, 0.26, 0.02, new THREE.MeshStandardMaterial({ roughness: 0.5 }), 0.008), x, F + 2.15, -3.16); plaque.userData.garder = true;
  objet.traverse((o) => { if (o.isMesh) o.userData.matOrigine = o.material; });
  const e = { cle, prix, objet, plaque, etat: '' }; ETAL.push(e);
  INTER.push({ p: monde(g, x, F + 1.35, -2.85), r: 2.3, get etiquette() { const d = OUTILS_DEF[e.cle]; return S.outils.includes(e.cle) ? (outilEnMain === e.cle ? null : `Prendre · ${d.nom}`) : `${d.nom} · ${e.prix.toLocaleString('fr-FR')}`; }, agir: () => acheter(e) });
});
function majEtal(e, etat) {   // 'acquis' | 'abordable' | 'cher'
  if (e.etat === etat) return; e.etat = etat;
  e.objet.traverse((o) => { if (o.isMesh) o.material = etat === 'cher' ? M_GRIS : o.userData.matOrigine; });
  const d = OUTILS_DEF[e.cle], m = e.plaque.material; if (m.map) m.map.dispose();
  m.map = texteTex(etat === 'acquis' ? [[d.nom, 34], ['ACQUIS', 30, '#1c8a96']] : [[d.nom, 34], [`${e.prix.toLocaleString('fr-FR')} cr`, 36, etat === 'cher' ? '#f08a24' : '#f08a24']], 256, 96); m.needsUpdate = true;
}
function acheter(e) {
  if (S.outils.includes(e.cle)) { changerOutil(e.cle); return; }
  if (S.credits < e.prix) { sons.refus(); return; }
  S.credits -= e.prix; sons.achat(); S.outils.push(e.cle); changerOutil(e.cle); sauverBientot();
}
MAJ.push(() => { if (gt - (majEtal.t || -9) < 0.3) return; majEtal.t = gt; for (const e of ETAL) majEtal(e, S.outils.includes(e.cle) ? 'acquis' : S.credits >= e.prix ? 'abordable' : 'cher'); CAGEOTS.forEach((c, n) => { c.visible = S.ventes > n; }); });

// --- Le terminal de l'atelier : cinq catégories d'amélioration, un panneau et un bouton par catégorie. ---
Object.keys(AMELIOS).forEach((c, n) => {
  const g = ATELIER, F = g.userData.salle.F, z = -1.7 + n * 0.85, e = ecranDyn(160, 200);
  placer(g, boite(0.12, 1.25, 0.7, M.graphite, 0.03), 4.2, F + 1.4, z); placer(g, new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.72), e.mat), 4.135, F + 1.62, z, -Math.PI / 2);
  const b = placer(g, bouton(), 4.14, F + 1.0, z, -Math.PI / 2); b.scale.setScalar(0.8);
  const t = { c, e, sig: '' }; TERMINAL_ATELIER.push(t);
  INTER.push({ p: monde(g, 4.1, F + 1.4, z), r: 2.2, get etiquette() { const p = AMELIOS[c].prix[S.amelio[c]]; return p === undefined ? `${AMELIOS[c].nom} · max` : `${AMELIOS[c].nom} · ${p.toLocaleString('fr-FR')}`; }, agir() { const niv = S.amelio[c], prix = AMELIOS[c].prix[niv]; if (prix === undefined || S.credits < prix) { sons.refus(); return; } S.credits -= prix; S.amelio[c]++; sons.achat(); sauverBientot(); } });
});
placer(ATELIER, boite(0.14, 0.08, 4.5, M.lisere, 0.02), 4.2, ATELIER.userData.salle.F + 2.1, 0);
MAJ.push(() => {
  if (DEDANS.salle !== ATELIER.userData.salle) return;
  for (const t of TERMINAL_ATELIER) {
    const A = AMELIOS[t.c], niv = S.amelio[t.c], prix = A.prix[niv], ok = prix !== undefined && S.credits >= prix, sig = niv + ' ' + ok; if (sig === t.sig) continue; t.sig = sig;
    const g = t.e.g; fond(t.e); g.textAlign = 'center'; g.fillStyle = '#edeae4'; g.font = '800 26px system-ui'; g.fillText(A.nom, 80, 26);
    g.fillStyle = '#4fd6e3'; g.font = '800 34px system-ui'; g.fillText(`${A.valeurs[niv]} ${A.unite}`.replace('.', ','), 80, 72);
    for (let k = 0; k < 3; k++) { g.fillStyle = k < niv ? '#4fd6e3' : '#3a3f45'; g.fillRect(26 + k * 38, 100, 30, 12); }
    g.fillStyle = prix === undefined ? '#4fd6e3' : ok ? '#f08a24' : '#f08a24'; g.font = '800 26px system-ui'; g.fillText(prix === undefined ? 'MAX' : `${prix.toLocaleString('fr-FR')} cr`, 80, 160);
    t.e.maj();
  }
});

// --- Interagir (E) : ce qu'on regarde, parmi ce qui est à portée. ---
const INTER_HORS = [];   // E sans rien devant soi (descendre du véhicule, couper le tuyau, emballer le sac…)
let interVise = null;
MAJ.push(() => {
  interVise = null; let best = 0.55;
  if (!joueur.enVehicule && !CARTE.ouverte && !CONS.actif) {
    camera.getWorldDirection(_dir);
    for (const it of INTER) { if (it.cache && it.cache()) continue; _vp.subVectors(it.p, camera.position); const d = _vp.length(); if (d > it.r) continue; const sc = d < 1.1 ? 1 : _vp.dot(_dir) / d; if (sc > best) { best = sc; interVise = it; } }
  }
  if (E.inter && interVise) interVise.agir();
  else if (E.inter) for (const f of INTER_HORS) if (f()) break;
});
