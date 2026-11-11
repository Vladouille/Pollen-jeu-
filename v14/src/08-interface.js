
// =====================================================================
// 12. L'interface : ruban de boussole en haut, pourcentage du secteur en haut à droite, outil et charge en bas à
//     gauche, ronds des outils en bas au centre, argent en bas à droite. Aucun texte qui dise quoi faire.
//     La carte (touche M ou bouton) : le globe entier, qu'on fait tourner ; secteurs colorés selon leur avancement,
//     machines posées en orange, points de voyage rapide en cyan (on amène un point au centre, on appuie sur action).
// =====================================================================
const $ = (id) => document.getElementById(id);
if (MOBILE) jeu.classList.add('mobile');
const hud = { bande: $('bande'), secP: $('secP'), nomOutil: $('nomOutil'), charge: $('charge'), slots: $('slots'), cr: $('cr'), hex: document.querySelector('#secteur .hex') };
const fmtKg = (v) => v.toFixed(1).replace('.', ',');
const fmtCr = (v) => Math.round(v).toLocaleString('fr-FR');
// Boussole : un ruban de ±90° autour du cap, graduations tous les 15°, lettres cardinales. Le nord est le pôle de la planète.
const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
{ let h = ''; for (let d = 0; d < 360; d += 15) h += `<i data-a="${d}" class="${d % 45 ? 'g' : 'c'}">${d % 45 ? '' : CARD[d / 45]}</i>`; hud.bande.innerHTML = h; }
const marques = [...hud.bande.children].map((el) => ({ el, a: +el.dataset.a }));
const angle = (a) => ((a % 360) + 540) % 360 - 180;
const cap = () => { const { est, nord } = repere(joueur.p); return (Math.atan2(joueur.f.dot(est), joueur.f.dot(nord)) * 180 / Math.PI + 360) % 360; };   // 0 = nord, 90 = est
const PASTILLE = [];   // ce que montre la pastille quand ce n'est pas l'outil (le véhicule, la construction)
let tSlots = '', dernierHUD = -1;
function majHUD() {
  const c = cap(), L = hud.bande.parentNode.clientWidth || 360, px = L / 180;
  for (const m of marques) { const r = angle(m.a - c); m.el.style.display = Math.abs(r) > 92 ? 'none' : ''; m.el.style.transform = `translateX(${r * px}px)`; }
  const s = { vert: PLANETE_PROG.vert, total: NT };   // l'objectif : toute la planète
  hud.secP.textContent = `${(s.vert / s.total * 100).toFixed(2).replace('.', ',')} %`;   // la planète entière, au centième
  let pa = { nom: porte ? 'Colis' : outilDef().nom, charge: porte ? kgSac(porte.contenu) : kgSac(), max: chargeMax() }; for (const f of PASTILLE) { const r = f(); if (r) { pa = r; break; } }
  hud.nomOutil.textContent = pa.nom; hud.charge.textContent = pa.texte || `${fmtKg(pa.charge)} / ${pa.max} KG`;
  const possedes = ORDRE_OUTILS.filter((o) => S.outils.includes(o)), sig = possedes.join() + outilEnMain;
  if (sig !== tSlots) { tSlots = sig; hud.slots.innerHTML = possedes.map((o) => `<button type="button" data-tactile data-outil="${o}" class="${o === outilEnMain ? 'actif' : ''}" aria-label="${OUTILS_DEF[o].nom}">${ICONES[o] || ICONES.defaut}</button>`).join(''); }
  hud.slots.style.display = CONS.actif || CARTE.ouverte ? 'none' : '';
  if (S.credits > crAffiche + 0.5) { if (gt - crPulse > 0.4) { crPulse = gt; $('credits').classList.remove('gain'); void $('credits').offsetWidth; $('credits').classList.add('gain'); } crAffiche += Math.max(1, (S.credits - crAffiche) * 0.25); if (crAffiche > S.credits) crAffiche = S.credits; }
  else crAffiche = S.credits;   // une dépense s'affiche tout de suite
  hud.cr.textContent = fmtCr(crAffiche);
}
let crAffiche = 0, crPulse = -1;
const ICONES = {   // pictogrammes des ronds, dessinés au trait
  pinceau: '<svg viewBox="0 0 24 24"><path d="M5 19l9-9m1-1l3-3 1 1-3 3"/><path d="M4 20c1-3 2-4 3-3s0 2-3 3z"/></svg>',
  brosse: '<svg viewBox="0 0 24 24"><path d="M12 3v10"/><rect x="7" y="13" width="10" height="3" rx="1"/><path d="M8 16v4m2-4v4m2-4v4m2-4v4m2-4v4"/></svg>',
  large: '<svg viewBox="0 0 24 24"><path d="M12 3v9"/><rect x="4" y="12" width="16" height="3" rx="1"/><path d="M5 15v4m3-4v4m3-4v4m3-4v4m3-4v4m2-4v4"/></svg>',
  xl: '<svg viewBox="0 0 24 24"><path d="M12 3v8"/><rect x="2" y="11" width="20" height="3" rx="1"/><path d="M3 14v5m3-5v5m3-5v5m3-5v5m3-5v5m3-5v5m3-5v5"/></svg>',
  souffleur: '<svg viewBox="0 0 24 24"><path d="M4 17l10-10"/><path d="M14 7l2-2 3 3-2 2z"/><path d="M18 12c2 0 3 1 3 3m-5-1c1 0 2 1 2 2"/></svg>',
  marteau: '<svg viewBox="0 0 24 24"><path d="M6 20l8-8"/><rect x="11" y="4" width="9" height="5" rx="1" transform="rotate(45 15 7)"/></svg>',
  rateau: '<svg viewBox="0 0 24 24"><path d="M12 3v11"/><path d="M5 14h14M6 14v5m4-5v5m4-5v5m4-5v5"/></svg>',
  collecteur: '<svg viewBox="0 0 24 24"><path d="M6 8h12l-2 12H8z"/><path d="M9 8V5h6v3"/></svg>',
  enfumoir: '<svg viewBox="0 0 24 24"><rect x="7" y="10" width="9" height="10" rx="2"/><path d="M11 10l-2-4h5l1 4"/><path d="M12 4c0-2 2-1 2-3"/></svg>',
  defaut: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>',
};
// Toucher ou cliquer un rond prend l'outil.
$('rappel').addEventListener('pointerdown', (e) => { E.rappel = true; e.stopPropagation(); e.preventDefault(); });
hud.slots.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-outil]'); if (!b) return; changerOutil(b.dataset.outil); e.stopPropagation(); e.preventDefault(); });

// --- Fin de secteur : vague de floraison qui traverse tout le secteur, nuée d'abeilles, le pourcentage pulse. ---
const NNUEE = 400, nueePos = new Float32Array(NNUEE * 3), nueeGeo = new THREE.BufferGeometry(); nueeGeo.setAttribute('position', new THREE.BufferAttribute(nueePos, 3));
const nuee = new THREE.Points(nueeGeo, new THREE.PointsMaterial({ color: 0x3b2f12, size: 0.08 })); nuee.frustumCulled = false; nuee.visible = false; scene.add(nuee);
const FETE = { t: -100, s: 0 };
FIN_SECTEUR.push((s) => {
  const c = joueur.p; VAGUE.value.set(c.x, c.y, c.z, gt); VAGUE_S.value = SECTEURS[s].variete;   // la vague part du joueur
  FETE.t = gt; FETE.s = s; sons.vente(); setTimeout(() => sons.achat(), 450);
  $('secteur').classList.remove('fin'); void $('secteur').offsetWidth; $('secteur').classList.add('fin');
});
MAJ.push(() => {
  const age = gt - FETE.t; nuee.visible = age < 8;
  if (!nuee.visible) return;
  const c0 = joueur.p.clone().normalize();
  for (let k = 0; k < NNUEE; k++) {   // la nuée s'envole autour du joueur et s'élargit
    const r = 3 + ((age * 7 + (k % 37) * 0.9) % 30), d = deplacer(c0, k * 137.5 + Math.sin(gt * 2 + k) * 6, r);
    d.multiplyScalar(sol(d) + 1.2 + Math.sin(gt * 4 + k * 1.7) * 0.8 + (k % 5) * 0.3); nueePos.set([d.x, d.y, d.z], k * 3);
  }
  nueeGeo.attributes.position.needsUpdate = true;
});
// --- La poussière de pollen en suspension : des grains qui flottent autour du joueur et accrochent le soleil. ---
const NPOUS = MOBILE ? 140 : 300, pousPos = new Float32Array(NPOUS * 3), pousGeo = new THREE.BufferGeometry(), pousGraine = new Float32Array(NPOUS * 3);
for (let k = 0; k < NPOUS; k++) pousGraine.set([Math.random() * 24 - 12, Math.random() * 4, Math.random() * 24 - 12], k * 3);
pousGeo.setAttribute('position', new THREE.BufferAttribute(pousPos, 3));
const poussiere = new THREE.Points(pousGeo, new THREE.PointsMaterial({ color: 0xfff1b0, size: 0.03, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
poussiere.frustumCulled = false; scene.add(poussiere);
const derive = { x: 0, z: 0, p: joueur.p.clone() };
MAJ.push(() => {
  const { up, est, nord } = repere(joueur.p);
  _vp.subVectors(joueur.p, derive.p); if (_vp.lengthSq() < 400) { derive.x -= _vp.dot(est); derive.z -= _vp.dot(nord); } derive.p.copy(joueur.p);   // le nuage ne se déplace pas avec le joueur
  poussiere.visible = !CARTE.ouverte && !DEDANS.salle;
  for (let k = 0; k < NPOUS; k++) {
    const x = ((pousGraine[k * 3] + derive.x + Math.sin(gt * 0.3 + k) * 0.4 + gt * 0.15) % 24 + 36) % 24 - 12, z = ((pousGraine[k * 3 + 2] + derive.z + Math.cos(gt * 0.25 + k * 1.3) * 0.4) % 24 + 36) % 24 - 12;
    _vp.copy(joueur.p).addScaledVector(est, x).addScaledVector(nord, z).addScaledVector(up, 0.3 + pousGraine[k * 3 + 1] + Math.sin(gt * 0.5 + k * 2.1) * 0.2); pousPos.set([_vp.x, _vp.y, _vp.z], k * 3);
  }
  pousGeo.attributes.position.needsUpdate = true;
});
MAJ.push(() => { if (gt - dernierHUD > 1 / 30 || (window.pollen && window.pollen.figer)) { dernierHUD = gt; majHUD(); } });

// --- La carte : le globe. ---
const rondTex = (couleur, plein) => texture(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = couleur; g.fillStyle = couleur; g.lineWidth = 7; g.beginPath(); g.arc(32, 32, 24, 0, 7); g.stroke(); if (plein) { g.beginPath(); g.arc(32, 32, 11, 0, 7); g.fill(); } });
const M_VOYAGE = new THREE.SpriteMaterial({ map: rondTex('#4fd6e3', true), depthTest: false, transparent: true }), M_VOYAGE_VISE = new THREE.SpriteMaterial({ map: rondTex('#f08a24', true), depthTest: false, transparent: true }), M_ICI = new THREE.SpriteMaterial({ map: rondTex('#f4b41a', false), depthTest: false, transparent: true });
const VOYAGES = [() => [{ p: local(-2, 7), nom: 'Station' }, ]];   // les huit derniers secteurs ouverts   // les modules ajoutent leurs points (dépôts de terrain)
const REPERES_CARTE = [];   // fonctions qui donnent les positions des machines posées
const CARTE = {
  ouverte: false, dir: new V3(0, 0, 1), haut: new V3(0, 1, 0), points: [], vise: null, groupe: new THREE.Group(), ici: new THREE.Sprite(M_ICI),
  machines: new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: ORANGE, size: 5, sizeAttenuation: false, depthTest: false })),
  ouvrir() {
    this.ouverte = true; this.dir.copy(joueur.haut); tangent(this.dir, joueur.f, this.haut); SOL_U.uCarte.value = 1; HALO.visible = true; this.brume = scene.fog.density; scene.fog.density = 0;
    this.groupe.clear(); this.points = [];
    for (const f of VOYAGES) for (const v of f()) { const sp = new THREE.Sprite(M_VOYAGE); sp.position.copy(v.p).multiplyScalar(1.03); sp.scale.setScalar(42); sp.renderOrder = 9; this.groupe.add(sp); this.points.push({ ...v, sp }); }
    this.ici.position.copy(joueur.p).multiplyScalar(1.04); this.ici.scale.setScalar(30); this.ici.renderOrder = 10; this.groupe.add(this.ici);
    const pos = []; for (const f of REPERES_CARTE) for (const p of f()) pos.push(p.x * 1.02, p.y * 1.02, p.z * 1.02);
    this.machines.geometry.dispose(); this.machines.geometry = new THREE.BufferGeometry(); this.machines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); this.machines.frustumCulled = false; this.machines.renderOrder = 8; this.groupe.add(this.machines);
    $('reticule').classList.add('carte');
  },
  fermer() { this.ouverte = false; SOL_U.uCarte.value = 0; HALO.visible = false; scene.fog.density = this.brume; this.groupe.clear(); $('reticule').classList.remove('carte'); },
  glisser(dx, dy) { const dr = _dr.crossVectors(this.haut, this.dir).normalize(); this.dir.applyAxisAngle(this.haut, -dx * 0.8).applyAxisAngle(dr, -dy * 0.8).normalize(); this.haut.addScaledVector(this.dir, -this.haut.dot(this.dir)).normalize(); },
  voyager(v) { if (joueur.enVehicule) { sons.refus(); return false; } surSol(v.p, 0, joueur.p); joueur.v.set(0, 0, 0); joueur.haut.copy(joueur.p).normalize(); tangent(joueur.p, versBase(joueur.p), joueur.f); this.fermer(); sons.achat(); return true; },
};
scene.add(CARTE.groupe);
MAJ.push(() => {
  if (E.carte) { E.carte = false; if (CARTE.ouverte) CARTE.fermer(); else if (!CONS.actif) CARTE.ouvrir(); }
  if (!CARTE.ouverte) return;
  camera.position.copy(CARTE.dir).multiplyScalar(RP * 2.9); camera.up.copy(CARTE.haut); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  let best = 0.9985; CARTE.vise = null;   // le point de voyage le plus proche du centre de l'écran
  for (const v of CARTE.points) { const sc = _vp.copy(v.p).normalize().dot(CARTE.dir); v.sp.material = M_VOYAGE; v.sp.scale.setScalar(42); if (sc > best) { best = sc; CARTE.vise = v; } }
  if (CARTE.vise) { CARTE.vise.sp.material = M_VOYAGE_VISE; CARTE.vise.sp.scale.setScalar(60); if (E.presse || E.inter) CARTE.voyager(CARTE.vise); }
});
$('carte').addEventListener('pointerdown', (e) => { E.carte = true; e.stopPropagation(); e.preventDefault(); });
