
// =====================================================================
// 16. Le monde qui tourne (étape 6) : une nouveauté toutes les 8 minutes, trois contrats à la station
//     payés le double, un événement toutes les 10 à 15 minutes annoncé 30 s avant, le jour et la nuit
//     (le solaire s'arrête, la batterie prend le relais, la lampe frontale s'allume), la sauvegarde.
// =====================================================================
// --- La table des nouveautés : le temps de jeu (en minutes) débloque la suite. ---
const NOUVEAUTES = [
  { min: 0, faire() {} },
  { min: 8, texte: 'Tuyau d’irrigation au comptoir · contrats à la station', faire() { DEBLOQUE.add('tuyau'); CONTRATS.ouverts = true; remplirContrats(); } },
  { min: 16, texte: 'Brosse large et ruches au comptoir · essaims sauvages', faire() { DEBLOQUE.add('large'); DEBLOQUE.add('ruche'); ESSAIMS_ACTIFS.v = true; } },
  { min: 24, texte: 'Brosse extra-large et outil de construction : convoyeurs, quai', faire() { DEBLOQUE.add('xl'); DEBLOQUE.add('marteau'); } },
  { min: 32, texte: 'Extracteur (pollen → miel) et panneau solaire', faire() { PIECES_DEBLOQUEES.add('extracteur'); PIECES_DEBLOQUEES.add('solaire'); } },
  { min: 40, texte: 'Souffleur à dos, maturateur (miel → miel de cru), batterie', faire() { DEBLOQUE.add('souffleur'); PIECES_DEBLOQUEES.add('maturateur'); PIECES_DEBLOQUEES.add('batterie'); } },
  { min: 48, texte: 'La pollinisatrice attend au garage', faire() { DEBLOQUE.add('pollinisatrice'); } },
];
function debloquerJusqua(n, annoncer = true) {
  while (S.debloque < n && S.debloque < NOUVEAUTES.length - 1) { S.debloque++; const nv = NOUVEAUTES[S.debloque]; nv.faire(); if (annoncer) { message('Nouveau : ' + nv.texte, 'evenement'); sons.achat(); } }
}
MAJ.push((dt) => {
  S.temps += dt;
  const n = NOUVEAUTES.findLastIndex((nv) => S.temps >= nv.min * 60);
  if (n > S.debloque) debloquerJusqua(n);
});
const prochaineNouveaute = () => { const nv = NOUVEAUTES[S.debloque + 1]; return nv ? Math.max(0, nv.min * 60 - S.temps) : -1; };

// --- Les contrats : trois à la fois, chacun payé le double de ce que rapporte le travail. On encaisse à la station. ---
const CONTRATS = { ouverts: false, liste: [], panneau: false };
const MODELES_CONTRAT = [
  { type: 'tuiles', si: () => true, faire() { const esp = Math.floor(Math.random() * 3), n = 15 + Math.floor(Math.random() * 4) * 5; return { esp, n, texte: `Polliniser ${n} tuiles de ${FLEURS[esp].nom}`, prime: Math.round(n * KG_TUILE * PRIX_KG * VALEUR_ESPECE[esp] * 2) }; } },
  { type: 'chardons', si: () => true, faire() { const n = 6 + Math.floor(Math.random() * 3) * 3; return { n, texte: `Désherber ${n} tuiles de chardons`, prime: n * 30 }; } },
  { type: 'miel', si: () => DEBLOQUE.has('ruche'), faire() { const n = 3 + Math.floor(Math.random() * 3); return { n, texte: `Récolter ${n} pots de miel`, prime: n * PRIX_MIEL * 2 }; } },
  { type: 'cru', si: () => PIECES_DEBLOQUEES.has('maturateur'), faire() { const n = 4 + Math.floor(Math.random() * 3); return { n, texte: `Expédier ${n} capsules de miel de cru`, prime: n * VALEUR_CAPSULE.cru * 2 }; } },
];
function remplirContrats() {
  while (CONTRATS.liste.length < 3) {
    const pris = CONTRATS.liste.map((c) => c.type), m = MODELES_CONTRAT.filter((m) => m.si() && !pris.includes(m.type)), ch = m.length ? m : MODELES_CONTRAT.filter((m) => m.si());
    const mod = ch[Math.floor(Math.random() * ch.length)]; CONTRATS.liste.push({ type: mod.type, fait: 0, ...mod.faire() });
  }
}
const avancer = (type, test = () => true) => { for (const c of CONTRATS.liste) if (c.type === type && c.fait < c.n && test(c)) { c.fait++; if (c.fait === c.n) message(`Contrat rempli : ${c.texte} · encaisse ${fmtCr(c.prime)} cr à la station`, 'gain'); } };
ECOUTE.tuile.push((i) => avancer('tuiles', (c) => c.esp === T.espece[i]));
ECOUTE_ACT.desherbe.push(() => avancer('chardons'));
ECOUTE_ACT.miel.push((n) => { for (let k = 0; k < n; k++) avancer('miel'); });
ECOUTE_CAP.push((type) => { if (type === 'cru') avancer('cru'); });
const contratsFinis = () => CONTRATS.liste.filter((c) => c.fait >= c.n);
function encaisser() {
  const f = contratsFinis(); if (!f.length) { CONTRATS.panneau = !CONTRATS.panneau; return; }
  const cr = f.reduce((s, c) => s + c.prime, 0); S.credits += cr; gainAffiche(cr); sons.vente();
  CONTRATS.liste = CONTRATS.liste.filter((c) => c.fait < c.n); remplirContrats();
  message(`${f.length} contrat${f.length > 1 ? 's' : ''} encaissé${f.length > 1 ? 's' : ''} : +${fmtCr(cr)} cr`, 'gain');
}
{   // le tableau des contrats sur la façade de la station : écran graphite au-dessus de la porte
  const g = STATION, b = g.userData.base;
  placer(g, boite(2.6, 1.0, 0.1, M.graphite, 0.03), -2, b + 3.0, 2.08);
  g.userData.ecranContrats = placer(g, new THREE.Mesh(new THREE.PlaneGeometry(2.45, 0.86), ecran('CONTRATS')), -2, b + 3.0, 2.135);
}
const PORTE_STATION = (() => { STATION.updateMatrixWorld(true); const v = new THREE.Vector3(0, 0, 3.4).applyMatrix4(STATION.matrixWorld); return v; })();
INTER.push({ x: PORTE_STATION.x, z: PORTE_STATION.z, y: 3.2, r: 3.4, nom: 'Station · contrats',
  texte() { if (!CONTRATS.ouverts) return 'Station · contrats bientôt'; const f = contratsFinis(); return f.length ? `Encaisser ${f.length} contrat${f.length > 1 ? 's' : ''} · ${fmtCr(f.reduce((s, c) => s + c.prime, 0))} cr` : 'Voir les contrats'; },
  actif: () => CONTRATS.ouverts, agir() { if (CONTRATS.ouverts) encaisser(); } });
OBJECTIFS.unshift(() => contratsFinis().length ? { x: PORTE_STATION.x, z: PORTE_STATION.z, nom: 'Station' } : null);
MAJ.push(() => { if (E.contrats && CONTRATS.ouverts) CONTRATS.panneau = !CONTRATS.panneau; });
const panneauContrats = document.createElement('div'); panneauContrats.id = 'contrats'; panneauContrats.className = 'plaque'; panneauContrats.hidden = true; hud.raccourcis.parentNode.appendChild(panneauContrats);
let sigContrats = '';
MAJ.push(() => {
  panneauContrats.hidden = !CONTRATS.panneau;
  if (!CONTRATS.panneau) return;
  const sig = CONTRATS.liste.map((c) => c.texte + c.fait).join();
  if (sig === sigContrats) return; sigContrats = sig;
  panneauContrats.innerHTML = `<h2>Contrats de la station <small>payés double</small></h2>` + CONTRATS.liste.map((c) => `<div class="contrat${c.fait >= c.n ? ' fini' : ''}"><p>${c.texte}<b>${fmtCr(c.prime)} cr</b></p><span><i style="transform:scaleX(${c.fait / c.n})"></i></span><small>${c.fait >= c.n ? 'Rempli · encaisse à la station' : `${c.fait} / ${c.n}`}</small></div>`).join('');
});

// --- Le jour et la nuit : un cycle de 12 minutes, dont 2 min 30 de nuit. ---
const CYCLE = 720, HEMI = scene.children.find((o) => o.isHemisphereLight);
const lampe = new THREE.SpotLight(0xfff1d6, 0, 28, 0.5, 0.55, 1.4); lampe.position.set(0, 0.1, 0); lampe.target.position.set(0, -0.2, -1); camera.add(lampe, lampe.target);
const NUIT = { zen: new THREE.Color(0x0b1430), hor: new THREE.Color(0x26324c) }, JOURC = { zen: new THREE.Color(0x2c66c8), hor: new THREE.Color(0xd3e8f5) }, ORAGE = { zen: new THREE.Color(0x3c434c), hor: new THREE.Color(0x8d969e) };
let orageFondu = 0;
MAJ.push((dt) => {
  const ph = (S.temps % CYCLE) / CYCLE, nuit = THREE.MathUtils.smoothstep(ph, 0.76, 0.8) * (1 - THREE.MathUtils.smoothstep(ph, 0.97, 1.0));
  orageFondu = lerp(orageFondu, EV.actif && EV.actif.cle === 'orage' ? 1 : 0, 1 - Math.exp(-dt * 0.8));
  const l = (1 - nuit) * (1 - orageFondu * 0.6);
  if (JOUR.nuit !== nuit > 0.5) { JOUR.nuit = nuit > 0.5; message(JOUR.nuit ? 'La nuit tombe : panneaux solaires à l’arrêt, lampe frontale allumée' : 'Le jour se lève', 'evenement'); }
  JOUR.lumiere = (1 - nuit) * (1 - orageFondu * 0.7);
  sun.intensity = 2.5 * l + 0.04; HEMI.intensity = 0.5 * (0.3 + 0.7 * l) + 0.05;
  const u = ciel.material.uniforms; u.uZen.value.copy(JOURC.zen).lerp(ORAGE.zen, orageFondu).lerp(NUIT.zen, nuit); u.uHor.value.copy(JOURC.hor).lerp(ORAGE.hor, orageFondu).lerp(NUIT.hor, nuit);
  scene.fog.color.copy(u.uHor.value);
  lampe.intensity = nuit * 22;
});

// --- Les événements : toutes les 10 à 15 minutes, annoncés 30 s avant. ---
const EVENEMENTS = {
  orage: { nom: 'Orage', annonce: 'Orage dans', duree: 40, debut() { pluie.visible = true; }, fin() { pluie.visible = false; let n = 0; const vertes = []; for (let i = 0; i < NT; i++) if (T.vert[i]) vertes.push(i); for (let k = 0; k < 20 && vertes.length; k++) { const i = vertes.splice(Math.floor(Math.random() * vertes.length), 1)[0]; fanerTuile(i); secteurs[T.secteur[i]].vert--; n++; } message(`L’orage a fané ${n} tuiles : à repolliniser`, 'alerte'); } },
  floraison: { nom: 'Floraison exceptionnelle', annonce: 'Floraison exceptionnelle dans', duree: 60, debut() { S.boost = 2; }, fin() { S.boost = 1; } },
  panne: { nom: 'Panne', annonce: 'Panne dans', duree: 0, debut() { const m = [...GRILLE.values()].filter((p) => PIECES[p.cle].entree); if (m.length) { const p = m[Math.floor(Math.random() * m.length)]; p.panne = true; message(`${PIECES[p.cle].nom} en panne : va le réparer (E)`, 'alerte'); } else { COLLECTEUR.userData.panne = true; message('Collecteur en panne : va le réparer (E)', 'alerte'); } } },
  acheteur: { nom: 'Acheteur pressé · prix ×3', annonce: 'Un acheteur paie triple dans', duree: 60, debut() { S.prixVente = 3; }, fin() { S.prixVente = 1; } },
};
const EV = { prochain: 600 + Math.random() * 300, prevu: null, actif: null, reste: 0 };
MAJ.push((dt) => {
  if (EV.actif) { EV.reste -= dt; if (EV.reste <= 0) { const a = EV.actif; EV.actif = null; if (a.fin) a.fin(); } }
  EV.prochain -= dt;
  if (!EV.prevu && EV.prochain <= 30) { const cles = Object.keys(EVENEMENTS); EV.prevu = cles[Math.floor(Math.random() * cles.length)]; sons.refus(); }
  if (EV.prevu && EV.prochain <= 0) { const e = EVENEMENTS[EV.prevu]; EV.actif = { cle: EV.prevu, ...e }; EV.reste = e.duree; EV.prevu = null; EV.prochain = 600 + Math.random() * 300; message(e.nom, 'evenement'); e.debut(); if (!e.duree) EV.actif = null; }
});
function lancerEvenement(cle) { EV.prevu = cle; EV.prochain = 30; }   // pour les essais
// La pluie : des traits qui tombent autour du joueur.
const NP = MOBILE ? 600 : 1500, pluiePos = new Float32Array(NP * 6), pluieGeo = new THREE.BufferGeometry();
pluieGeo.setAttribute('position', new THREE.BufferAttribute(pluiePos, 3));
const pluie = new THREE.LineSegments(pluieGeo, new THREE.LineBasicMaterial({ color: 0xc9d6e2, transparent: true, opacity: 0.5 })); pluie.frustumCulled = false; pluie.visible = false; scene.add(pluie);
const gouttes = new Float32Array(NP * 3); for (let k = 0; k < NP; k++) gouttes.set([(Math.random() - 0.5) * 40, Math.random() * 14, (Math.random() - 0.5) * 40], k * 3);
MAJ.push((dt) => {
  if (!pluie.visible) return;
  for (let k = 0; k < NP; k++) { let y = gouttes[k * 3 + 1] - dt * 16; if (y < 0) y += 14; gouttes[k * 3 + 1] = y; const x = joueur.x + gouttes[k * 3], z = joueur.z + gouttes[k * 3 + 2], b = joueur.y + y - 2; pluiePos.set([x, b, z, x + 0.05, b + 0.45, z], k * 6); }
  pluieGeo.attributes.position.needsUpdate = true;
});
// Le collecteur peut tomber en panne : on ne vend plus tant qu'il n'est pas réparé.
{ const it = INTER.find((it) => it.obj === COLLECTEUR), t0 = it.texte, a0 = it.agir, ac0 = it.actif;
  it.texte = () => COLLECTEUR.userData.panne ? 'Collecteur en panne · Réparer' : t0();
  it.agir = () => { if (COLLECTEUR.userData.panne) { COLLECTEUR.userData.panne = false; sons.achat(); message('Collecteur réparé', 'gain'); } else a0(); };
  it.actif = () => COLLECTEUR.userData.panne || ac0(); }

// --- Bandeau d'état en haut à gauche : jour ou nuit, énergie, événement en cours ou annoncé. ---
const bandeau = document.createElement('div'); bandeau.id = 'etat'; bandeau.className = 'plaque'; hud.raccourcis.parentNode.appendChild(bandeau);
const mn = (s) => s >= 60 ? `${Math.ceil(s / 60)} min` : `${Math.ceil(s)} s`;
MAJ.push(() => {
  if (gt - (bandeau.t || 0) < 0.25) return; bandeau.t = gt;
  const ph = (S.temps % CYCLE) / CYCLE, l = [];
  l.push(JOUR.nuit ? `<span class="lune"></span>Nuit · jour dans ${mn((1 - ph) * CYCLE)}` : `<span class="soleil"></span>Jour · nuit dans ${mn(Math.max(0, 0.78 - ph) * CYCLE)}`);
  if (ENERGIE.max > 0 || ENERGIE.prod > 0) l.push(`<span class="eclair"></span>${Math.round(ENERGIE.stock)} / ${Math.round(ENERGIE.max)} · ${ENERGIE.prod.toFixed(1).replace('.', ',')}/s`);
  if (EV.prevu) l.push(`<b class="alerte">${EVENEMENTS[EV.prevu].annonce} ${Math.ceil(EV.prochain)} s</b>`);
  if (EV.actif) l.push(`<b>${EV.actif.nom} · ${Math.ceil(EV.reste)} s</b>`);
  const pn = prochaineNouveaute(); if (pn >= 0) l.push(`<small>Nouveauté dans ${mn(pn)}</small>`);
  const h = l.map((x) => `<p>${x}</p>`).join(''); if (bandeau.innerHTML !== h) bandeau.innerHTML = h;
});
RACCOURCIS.push(
  { k: 'B', m: '⚒', t: 'Construire', tap: 'construire', si: () => S.outils.includes('marteau') },
  { k: 'R', m: '⟳', t: 'Tourner la pièce', tap: 'tourner', si: () => outilEnMain === 'marteau' },
  { k: 'Tab', m: '☰', t: 'Contrats', tap: 'contrats', si: () => CONTRATS.ouverts },
);

// --- La sauvegarde : dans le navigateur, toutes les 30 s et en quittant la page. ?neuf repart de zéro. ---
const CLE_SAUVEGARDE = 'pollen-v9-sauvegarde';
function etatSauve() {
  let tuiles = ''; for (let i = 0; i < NT; i++) tuiles += (T.vert[i] | (T.sorte[i] << 1) | (T.irrigue[i] << 3)).toString(16);
  return { v: 1, S: { ...S }, outil: outilEnMain, tuiles, tuyaux: TUYAUX.map((t) => t.pts.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)])),
    ruches: EMPL_RUCHE.map((e) => e.ruche ? { pots: e.ruche.pots, sauvage: e.ruche.sauvage } : null), balises: BALISES.map((b) => b.active),
    pieces: [...GRILLE.values()].map((p) => [p.cle, p.cx, p.cz, p.dir, p.stock]), energie: ENERGIE.stock,
    vehicule: { possede: V.possede, x: V.x, z: V.z, yaw: V.yaw, charge: V.charge, valeur: V.valeur },
    contrats: CONTRATS.liste, joueur: { x: joueur.x, z: joueur.z, yaw: joueur.yaw }, ev: EV.prochain };
}
function sauver() { if (joueur.enVehicule) return; try { localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(etatSauve())); } catch (e) { /* stockage refusé : on joue sans sauvegarde */ } }
function charger(d) {
  if (!d || d.v !== 1) return false;
  Object.assign(S, d.S, { boost: 1, prixVente: 1 }); const deb = S.debloque; S.debloque = 0; debloquerJusqua(deb, false);
  for (let i = 0; i < NT && i < d.tuiles.length; i++) {
    const c = parseInt(d.tuiles[i], 16), vert = c & 1, sorte = (c >> 1) & 3, irr = (c >> 3) & 1;
    if (T.sorte[i] === 1 && sorte === 0) desherber(i);
    if (T.sorte[i] === 3 && sorte === 0) cueillirDoree(i);
    T.sorte[i] = sorte; T.irrigue[i] = irr;
    if (vert && !T.vert[i]) fleurirTuile(i, -1000); else if (!vert && T.vert[i]) fanerTuile(i); else ecrireTuile(i);
  }
  for (const s of secteurs) { s.vert = 0; } for (let i = 0; i < NT; i++) secteurs[T.secteur[i]].vert += T.vert[i];
  for (const pts of d.tuyaux) { const t = { pts: [pts[0]] }; for (let k = 1; k < pts.length; k++) { segment(pts[k - 1], pts[k]); t.pts.push(pts[k]); } TUYAUX.push(t); }
  d.ruches.forEach((r, k) => { if (r) { installerRuche(EMPL_RUCHE[k], r.sauvage); EMPL_RUCHE[k].ruche.pots = r.pots; } });
  d.balises.forEach((a, k) => { if (a) { const b = BALISES[k]; b.active = true; b.feu.material.emissive.set(CHARTE.seve); for (const [i] of slotsDore) if (T.secteur[i] === b.s && T.sorte[i] === 3) doreesRevelees.push(i); } });
  for (const [cle, cx, cz, dir, stock] of d.pieces) poserPiece(cle, cx, cz, dir, true).stock = stock || 0;
  ENERGIE.stock = d.energie || 0;
  Object.assign(V, d.vehicule);
  CONTRATS.liste = d.contrats || []; if (CONTRATS.ouverts) remplirContrats();
  Object.assign(joueur, d.joueur); joueur.y = H(joueur.x, joueur.z);
  if (d.ev) EV.prochain = d.ev;
  if (S.outils.includes(d.outil)) prendre(d.outil);
  message('Partie reprise', 'gain');
  return true;
}
const NEUF = params.has('neuf');
if (!NEUF) { try { charger(JSON.parse(localStorage.getItem(CLE_SAUVEGARDE) || 'null')); } catch (e) { message('Sauvegarde illisible : nouvelle partie', 'alerte'); } }
let tSauve = 0;
MAJ.push((dt) => { tSauve += dt; if (tSauve >= 30) { tSauve = 0; sauver(); } });
addEventListener('pagehide', sauver);
document.addEventListener('visibilitychange', () => { if (document.hidden) sauver(); });
function debloquerTout() { S.temps = Math.max(S.temps, 48 * 60); debloquerJusqua(NOUVEAUTES.length - 1, false); }
