// =====================================================================
// 16. L'équipe et la longue partie : toiture solaire, robots ouvriers, pilotes automatiques, saisons.
//     - Toiture solaire : trois niveaux de panneaux sur le hall puis sur le garage. Elle alimente toutes les machines
//       qui manquent de courant et vend le surplus, le jour.
//     - Robots ouvriers : ils sortent du hall, marchent jusqu'aux parcelles fanées les plus proches, les pollinisent
//       et vendent le pollen eux-mêmes. Prix croissant, quarante au plus.
//     - Pilote automatique : acheté à la borne d'un véhicule ; quand tu n'es pas dedans, le véhicule part polliniser
//       seul, revient vider sa cuve au quai, repart. On l'arrête ou le relance à la même borne.
//     - Saisons : quand assez de la planète a refleuri, on peut clore la saison à la borne de l'accueil. La planète
//       fane de nouveau, on garde tout (outils, véhicules, machines, robots, toiture) et chaque parcelle vaut 50 % de
//       plus, pour toujours. Le seuil monte à chaque saison : c'est la longue partie.
// =====================================================================
const borneAccueil = (x, z, titre) => {   // une borne sur pied dans l'accueil du hall, écran incliné et gros bouton
  const g = HALL, F = g.userData.salle.F, e = ecranDyn(320, 256);
  const b = new THREE.Group(); placer(b, cylindre(0.22, 0.26, 0.06, M.graphite, 16), 0, 0.03, 0); placer(b, tube(0.05, 0.07, 1.0, M.graphite), 0, 0.5, 0);
  const tete = new THREE.Group(); placer(b, tete, 0, 1.25, 0); tete.rotation.x = -0.35; placer(tete, boite(0.72, 0.6, 0.07, M.graphite, 0.03), 0, 0, 0);
  const ec = placer(tete, new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.51), e.mat), 0, 0.01, 0.04); ec.userData.garder = true; placer(b, bouton(), 0, 0.75, 0.1).scale.setScalar(0.8);
  placer(b, boite(0.6, 0.12, 0.03, new THREE.MeshStandardMaterial({ map: texteTex([[titre, 44]], 512, 96, '#2e343a', '#fffdf7'), roughness: 0.5 }), 0.01), 0, 1.68, 0);
  poserDans(b, g, x, z); scene.add(b); OBSTACLES.push({ p: monde(g, x, 0, z), r: 0.3 });
  return { e, p: monde(g, x, F + 1.2, z + 0.1) };
};

// --- La toiture solaire. ---
const TOIT = { niveaux: [{ prix: 6000, kw: 20 }, { prix: 30000, kw: 60 }, { prix: 150000, kw: 180 }], prod: 0, vendu: 0, cumul: 0, cellules: [] };
S.toit = S.toit || 0;
const kwToit = () => TOIT.niveaux.slice(0, S.toit).reduce((s, n) => s + n.kw, 0);
{   // les panneaux : une grille de cellules inclinées vers le soleil sur le hall, puis sur le garage ; on en montre autant que le niveau
  const cell = [], ajouter = (parent, x, z, y) => cell.push({ parent, x, z, y });
  for (let x = -17.4; x <= 17.5; x += 2.15) for (let z = -7.2; z <= 6.3; z += 1.55) { if (Math.abs(Math.abs(x) - 13) < 2.2 && z > -6.3 && z < -2.7) continue; ajouter(HALL, x, z, HALL_H + 0.88); }
  for (let x = -14; x <= 14.1; x += 2.15) for (let z = -5.6; z <= 5.7; z += 1.55) ajouter(HANGAR, x, z, 5.5);
  const centre = (c) => c.parent === HALL ? Math.hypot(c.x, c.z) : 100 + Math.hypot(c.x, c.z);   // le hall d'abord, du centre vers les bords
  cell.sort((a, b) => centre(a) - centre(b));
  const n = cell.length, mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
  const cadre = mk(new THREE.BoxGeometry(1.95, 0.07, 1.15), M.graphite), verre = mk(new THREE.BoxGeometry(1.85, 0.03, 1.05), M_CELLULE), pied = mk(new THREE.BoxGeometry(1.8, 0.32, 0.06), M.graphite);
  cadre.geometry.type = verre.geometry.type = pied.geometry.type = 'RoundedBoxGeometry';   // de simples plaques : on les déclare comme les autres pièces de la charte
  const _mm = new THREE.Matrix4(), _q2 = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), 0.28), _u = new V3(1, 1, 1), _pp = new V3();
  cell.forEach((c, k) => {
    const g = c.parent; g.updateMatrixWorld(true);
    _mm.compose(_pp.set(c.x, c.y + 0.2, c.z), _q2, _u).premultiply(g.matrixWorld); cadre.setMatrixAt(k, _mm);
    _mm.compose(_pp.set(c.x, c.y + 0.24, c.z), _q2, _u).premultiply(g.matrixWorld); verre.setMatrixAt(k, _mm);
    _mm.compose(_pp.set(c.x, c.y + 0.1, c.z - 0.45), new THREE.Quaternion(), _u).premultiply(g.matrixWorld); pied.setMatrixAt(k, _mm);
  });
  TOIT.maj = () => { TOIT.niv = S.toit; const parNiv = [0, 52, 120, n], m = parNiv[S.toit]; for (const o of [cadre, verre, pied]) { o.count = m; o.instanceMatrix.needsUpdate = true; } TOIT.cellules = m; };
  TOIT.maj();
}
function toitureSolaire(dt) {   // appelée par le réseau électrique : alimente ce qui manque de courant, vend le surplus
  const kw = kwToit(); if (!kw) { TOIT.prod = 0; return; }
  TOIT.prod = kw * lisse(-0.05, 0.3, _c.copy(BASE).normalize().dot(SOLEIL));
  let besoin = 0; const sans = []; for (const p of GRILLE.values()) { const d = PIECES[p.cle]; if (d.conso && !p.courant && (p.veut || d.tapis)) { besoin += d.conso; sans.push(p); } }
  if (TOIT.prod >= besoin) for (const p of sans) p.courant = true;
  const surplus = Math.max(0, TOIT.prod - (TOIT.prod >= besoin ? besoin : 0));
  TOIT.cumul += surplus * dt * 0.4;   // 0,4 cr par kW et par seconde
  if (TOIT.cumul >= 25) { TOIT.vendu += expedier(TOIT.cumul, 'energie'); TOIT.cumul = 0; }
}
const BORNE_TOIT = borneAccueil(-8.0, 0.1, 'TOITURE SOLAIRE');
function dessinerToit() {
  const e = BORNE_TOIT.e, g = e.g, n = TOIT.niveaux[S.toit]; fond(e); g.textAlign = 'center';
  g.fillStyle = '#c9c3b6'; g.font = '800 22px system-ui'; g.fillText(`NIVEAU ${S.toit} / 3`, 160, 30);
  for (let k = 0; k < 3; k++) { g.fillStyle = k < S.toit ? '#4fd6e3' : '#3a3f45'; g.fillRect(70 + k * 64, 50, 52, 16); }
  g.fillStyle = '#edeae4'; g.font = '800 26px system-ui'; g.fillText(`${kwToit()} kW crête`, 160, 104);
  g.fillStyle = '#f4b41a'; g.font = '800 22px system-ui'; g.fillText(`${(TOIT.prod).toFixed(1).replace('.', ',')} kW maintenant`, 160, 140);
  g.fillStyle = '#c9c3b6'; g.font = '800 18px system-ui'; g.fillText(`${fmtCr(TOIT.vendu)} cr vendus`, 160, 172);
  g.font = '800 24px system-ui'; g.fillStyle = !n ? '#4fd6e3' : S.credits >= n.prix ? '#f08a24' : '#e0452f'; g.fillText(!n ? 'COMPLET' : `+${n.kw} kW : ${fmtCr(n.prix)} cr`, 160, 222); e.maj();
}
INTER.push({ p: BORNE_TOIT.p, r: 2.2, get etiquette() { const n = TOIT.niveaux[S.toit]; return n ? `Panneaux (${fmtCr(n.prix)} cr)` : null; },
  agir() { const n = TOIT.niveaux[S.toit]; if (!n || S.credits < n.prix) { sons.refus(); return; } S.credits -= n.prix; S.toit++; TOIT.maj(); sons.achat(); dessinerToit(); sauverBientot(); } });

// --- Les robots ouvriers. ---
const ROBOTS = [], RESERVEES = new Set(), MAX_ROBOTS = 40, vitRobot = () => 2.4 * (1 + 0.05 * S.rech.robots), travailRobot = () => 1.6 / (1 + 0.05 * S.rech.robots);
const prixRobot = (n) => Math.round(2500 * Math.pow(1.35, n) / 50) * 50;
S.robots = S.robots || 0;
function fabriquerRobot() {   // un petit robot de champ : corps blanc à bande orange, tête à visière cyan, antenne, bras-pinceau
  const g = new THREE.Group(), c = new THREE.Group(); g.add(c);
  placer(c, new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.32, 4, 12), M.blanc), 0, 0.62, 0); placer(c, cylindre(0.205, 0.205, 0.06, M.lisere, 14), 0, 0.6, 0);
  placer(c, new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), M.graphite), 0, 1.02, 0); placer(c, boite(0.22, 0.06, 0.06, M.seve, 0.02), 0, 1.04, -0.15);
  placer(c, tube(0.012, 0.012, 0.22, M.graphite), 0.06, 1.25, 0); placer(c, new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M.lisere), 0.06, 1.37, 0);
  for (const s of [-1, 1]) placer(c, tube(0.05, 0.06, 0.36, M.graphite), s * 0.1, 0.2, 0);   // jambes
  const bras = new THREE.Group(); bras.position.set(0.24, 0.78, 0); bras.userData.garder = true; c.add(bras);
  placer(bras, tube(0.03, 0.03, 0.45, M.graphite), 0, -0.2, -0.05).rotation.x = 0.4; placer(bras, cylindre(0.06, 0.08, 0.14, M_POILS, 10), 0, -0.42, -0.14);
  g.userData.corps = c; g.userData.bras = bras; fusionner(c); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
const SORTIE_HALL = () => surSol(monde(HALL, -3, 0, HALL_D / 2 + 2.2));
function nouveauRobot() { const r = { g: fabriquerRobot(), p: SORTIE_HALL().addScaledVector(new V3().randomDirection(), 0.8), f: versBase(SORTIE_HALL()).negate(), k: -1, t: 0, etat: 'cherche', phase: Math.random() * 6 }; surSol(r.p, 0, r.p); scene.add(r.g); ROBOTS.push(r); return r; }
function chercherTuile(p, rmax = 70, fA = null) {   // la parcelle fanée la plus proche (en spirale), qu'aucun autre ouvrier ne vise
  const { est, nord } = repere(p);
  for (let r = 2; r <= rmax; r += 2) {
    const n = Math.max(6, Math.round(r * 1.6));
    for (let a = 0; a < n; a++) { const t = (a / n) * Math.PI * 2 + r; _vp.copy(p).addScaledVector(est, Math.cos(t) * r).addScaledVector(nord, Math.sin(t) * r); const k = tuileA(_vp); if (k >= 0 && pollinisable(k) && !RESERVEES.has(k)) return k; }
  }
  return -1;
}
const _rd = new V3();
MAJ.push((dt) => {
  while (ROBOTS.length < Math.min(S.robots, MAX_ROBOTS)) nouveauRobot();
  for (const r of ROBOTS) {
    r.phase += dt;
    if (r.k >= 0 && !pollinisable(r.k)) { RESERVEES.delete(r.k); r.k = -1; r.etat = 'cherche'; }
    if (r.etat === 'cherche') { r.t += dt; if (r.t > 0.4) { r.t = 0; const k = chercherTuile(r.p); if (k >= 0) { r.k = k; RESERVEES.add(k); r.etat = 'va'; } else { r.etat = 'explore'; r.but = surSol(new V3().copy(r.p).addScaledVector(tangent(r.p, _rd.subVectors(r.p, BASE)), 60)); } } }
    let but = r.etat === 'va' ? T.pos[r.k] : r.etat === 'explore' ? r.but : null;
    if (but) {
      const d = r.p.distanceTo(but);
      if (r.etat === 'va' && d < 0.9) { r.etat = 'travaille'; r.t = 0; }
      else if (r.etat === 'explore' && d < 2) r.etat = 'cherche';
      else { tangent(r.p, _rd.subVectors(but, r.p), _rd); r.f.lerp(_rd, 1 - Math.exp(-dt * 6)).normalize(); surSol(_vp.copy(r.p).addScaledVector(_rd, Math.min(d, vitRobot() * dt)), 0, r.p); const rp = repousser(r.p, 0.3); surSol(rp.p, 0, r.p); }
    }
    if (r.etat === 'travaille') {
      r.t += dt;
      if (r.t >= travailRobot()) { const v = polliniser(r.k, 'bot'); RESERVEES.delete(r.k); r.k = -1; r.etat = 'cherche'; r.t = 0.4; if (v > 0) { const cr = expedier(v, 'pollen'); S.robotVendu = (S.robotVendu || 0) + cr; if (r.p.distanceTo(joueur.p) < 30) flotter(_vp.copy(r.p).addScaledVector(_d.copy(r.p).normalize(), 0.6), `+${cr}`, ''); } }
    }
    if (r.p.distanceTo(joueur.p) < 120) {   // on ne pose et n'anime que ceux qu'on peut voir
      poserSur(r.g, r.p, r.f); const marche = r.etat === 'va' || r.etat === 'explore';
      r.g.userData.corps.position.y = marche ? Math.abs(Math.sin(r.phase * 9)) * 0.06 : 0; r.g.userData.corps.rotation.z = marche ? Math.sin(r.phase * 9) * 0.06 : 0;
      r.g.userData.bras.rotation.x = r.etat === 'travaille' ? Math.sin(r.phase * 14) * 0.5 - 0.3 : 0; r.g.visible = true;
    } else r.g.visible = false;
  }
});
const BORNE_ROBOTS = borneAccueil(-12.4, 0.1, 'ROBOTS OUVRIERS');   // les portes du comptoir (x = -14,5) et de la station (x = -3,5) restent libres
{ const vitrine = fabriquerRobot(); poserDans(vitrine, HALL, -16.7, 1.1, Math.PI * 0.85); scene.add(vitrine); }
function dessinerRobots() {
  const e = BORNE_ROBOTS.e, g = e.g; fond(e); g.textAlign = 'center';
  g.fillStyle = '#c9c3b6'; g.font = '800 22px system-ui'; g.fillText('ÉQUIPE', 160, 30);
  g.fillStyle = '#edeae4'; g.font = '800 44px system-ui'; g.fillText(`${S.robots} / ${MAX_ROBOTS}`, 160, 84);
  g.fillStyle = '#c9c3b6'; g.font = '800 18px system-ui'; g.fillText(`${fmtCr(S.robotVendu || 0)} cr récoltés`, 160, 130);
  const prix = prixRobot(S.robots); g.font = '800 24px system-ui'; g.fillStyle = S.robots >= MAX_ROBOTS ? '#4fd6e3' : S.credits >= prix ? '#f08a24' : '#e0452f';
  g.fillText(S.robots >= MAX_ROBOTS ? 'COMPLET' : `+1 robot : ${fmtCr(prix)} cr`, 160, 200); e.maj();
}
INTER.push({ p: BORNE_ROBOTS.p, r: 2.2, get etiquette() { return S.robots < MAX_ROBOTS ? `Robot (${fmtCr(prixRobot(S.robots))} cr)` : null; },
  agir() { const prix = prixRobot(S.robots); if (S.robots >= MAX_ROBOTS || S.credits < prix) { sons.refus(); return; } S.credits -= prix; S.robots++; sons.achat(); dessinerRobots(); sauverBientot(); } });

// --- Les pilotes automatiques. ---
const prixPilote = (v) => Math.max(1500, Math.round(v.D.prix * 0.3 / 50) * 50);
function chercherCible(w) {   // devant soi d'abord, de plus en plus loin et de plus en plus de côté
  const up = _d.copy(w.p).normalize().clone();
  for (const d of [9, 14, 20, 30, 45, 65, 90, 130]) for (const a of [0, 0.3, -0.3, 0.7, -0.7, 1.2, -1.2, 1.8, -1.8, 2.6, -2.6, Math.PI]) {
    const q = surSol(new V3().copy(w.p).addScaledVector(w.f.clone().applyAxisAngle(up, a), d)), k = tuileA(q); if (k >= 0 && pollinisable(k)) return q;
  }
  return surSol(new V3().copy(w.p).addScaledVector(tangent(w.p, _rd.subVectors(w.p, BASE)), 150));   // tout est fleuri autour : on s'éloigne de la base
}
function viderAuQuai(w) { if (w.valeur <= 0) return; const cr = encaisser(w.valeur * (1 + 0.06 * S.rech.pilotes)); S.ventes++; w.charge = 0; w.valeur = 0; QUAI.total += cr; QUAI.flux = 0.4; dessinerQuai(); }
MAJ.push((dt) => {
  for (const c of ORDRE_VEHICULES) {
    const w = FLOTTE[c], P = w.pilote;
    const pilote = P && P.achete && P.actif && w.possede && w.g && joueur.enVehicule !== w && SORTIE.v !== w && !w.D.remorque;
    if (P) P.roule = !!pilote;
    if (!w.piloteModele && pilote) w.piloteModele = fabriquerPilote(c !== 'chariot');
    if (w.piloteModele) { const ca = w.g && w.g.userData.caisse; if (pilote && ca) { if (w.piloteModele.parent !== ca) ca.add(w.piloteModele); const a = w.D.assise || [0, 0]; w.piloteModele.position.set(0, a[0], a[1]); } else if (w.piloteModele.parent) w.piloteModele.parent.remove(w.piloteModele); }
    if (!pilote) continue;
    if (w.p.distanceTo(BASE) < RB - 2 && P.etat !== 'retour') { w.p.copy(surSol(local(0, RB + 6))); w.f.copy(tangent(w.p, _rd.subVectors(w.p, BASE))); P.cible = null; }   // il quitte la base par le sud, d'un bond
    if (P.etat === 'retour') {
      if (w.p.distanceTo(QUAI.p) < 4) { w.v = 0; viderAuQuai(w); P.etat = 'travail'; P.cible = null; w.p.copy(surSol(local(0, RB + 6))); w.f.copy(tangent(w.p, _rd.subVectors(w.p, BASE))); }
      else if (!versCible(w, QUAI.p, dt)) P.bloque += dt; else P.bloque = Math.max(0, P.bloque - dt);
      if (P.bloque > 8) { w.p.copy(surSol(new V3().copy(QUAI.p).addScaledVector(tangent(QUAI.p, _rd.subVectors(QUAI.p, BASE)), 6))); P.bloque = 0; }   // coincé : il saute au quai
    } else {
      if (w.charge >= capacite(w) * 0.95) { P.etat = 'retour'; P.cible = null; }
      P.t += dt; if (!P.cible || w.p.distanceTo(P.cible) < 3.5 || P.t > 25) { P.cible = chercherCible(w); P.t = 0; }
      if (!versCible(w, P.cible, dt)) P.bloque += dt; else P.bloque = Math.max(0, P.bloque - dt * 0.5);
      if (P.bloque > 5) { P.cible = null; P.bloque = 0; P.coince = (P.coince || 0) + 1; if (P.coince > 3) { P.coince = 0; w.f.applyAxisAngle(_d.copy(w.p).normalize(), Math.PI * 0.7); w.p.copy(surSol(new V3().copy(w.p).addScaledVector(w.f, 8))); } }
      travailler(w, dt);
    }
    poserVehicule(w); animerVehicule(w, dt, 0);
  }
});

// --- La recherche : trois lignes sans fin, chaque niveau coûte le double du précédent. ---
S.rech = { robots: 0, pilotes: 0, valeur: 0, ...(S.rech || {}) };
const RECHERCHE = [['robots', 'Robots +5 % vitesse', 20000], ['pilotes', 'Pilotes +6 % de recette', 30000], ['valeur', 'Parcelles +5 % de valeur', 50000]];
const prixRech = (i) => RECHERCHE[i][2] * Math.pow(2, S.rech[RECHERCHE[i][0]]);
const BORNE_RECH = borneAccueil(-18.2, 0.1, 'RECHERCHE');
RECHERCHE.forEach(([cle, nom], i) => {
  const x = -18.2 + (i - 1) * 0.3; if (i !== 1) { const b = new THREE.Group(); placer(b, bouton(), 0, 0, 0).scale.setScalar(0.6); poserDans(b, HALL, x, 0.2); b.position.addScaledVector(b.position.clone().normalize(), HALL.userData.salle.F + 0.75); scene.add(b); }
  INTER.push({ p: monde(HALL, x, HALL.userData.salle.F + 0.8, 0.3), r: 1.8, get etiquette() { return `${nom} (${fmtCr(prixRech(i))} cr)`; },
    agir() { const prix = prixRech(i); if (S.credits < prix) { sons.refus(); return; } S.credits -= prix; S.rech[cle]++; sons.achat(); dessinerRech(); sauverBientot(); } });
});
function dessinerRech() {
  const e = BORNE_RECH.e, g = e.g; fond(e); g.textAlign = 'left';
  g.fillStyle = '#c9c3b6'; g.font = '800 20px system-ui'; g.fillText('RECHERCHE', 16, 26);
  RECHERCHE.forEach(([cle, nom], i) => { const y = 70 + i * 62, prix = prixRech(i); g.fillStyle = '#edeae4'; g.font = '800 18px system-ui'; g.fillText(`${['◀', '●', '▶'][i]} ${nom.split(' ')[0]} : niveau ${S.rech[cle]}`, 16, y);
    g.fillStyle = S.credits >= prix ? '#f08a24' : '#e0452f'; g.font = '800 17px system-ui'; g.fillText(`${nom.split(' ').slice(1).join(' ')} — ${fmtCr(prix)} cr`, 36, y + 24); });
  e.maj();
}
// --- Les saisons. ---
S.saison = S.saison || 0;
const SAISON_FINALE = 30;   // à la trentième saison, la planète est sauvée (on peut continuer)
const seuilSaison = () => Math.min(1, 0.02 * Math.pow(1.5, S.saison));   // 2 %, 3 %, 4,5 %… puis toute la planète à partir de la dixième
function cloreSaison() {
  if (PLANETE_PROG.vert / NT < seuilSaison()) { sons.refus(); return false; }
  for (let i = 0; i < NT; i++) { if (T.sorte[i] === 4) T.sorte[i] = 0; T.nectar[i] = 0; if (T.vert[i]) fanerTuile(i); else ecrireTuile(i); }
  for (const s of secteurs) s.vert = 0; PLANETE_PROG.vert = 0; majProgres();
  S.saison++; sons.niveau(); if (S.saison === SAISON_FINALE) { S.succes.sauvee = 1; montrerBandeau('La planète est sauvée', `${SAISON_FINALE} saisons : merci, pollinisateur. Tu peux continuer.`); sauver(); return true; }
  montrerBandeau(`Saison ${S.saison + 1}`, `la planète fane ; chaque parcelle vaut désormais ×${multSaison().toFixed(1).replace('.', ',')}`); sauver(); return true;
}
const BORNE_SAISON = borneAccueil(-10.2, 0.1, 'SAISONS');
function dessinerSaison() {
  const e = BORNE_SAISON.e, g = e.g, p = PLANETE_PROG.vert / NT, s = seuilSaison(); fond(e); g.textAlign = 'center';
  g.fillStyle = '#c9c3b6'; g.font = '800 22px system-ui'; g.fillText(`SAISON ${S.saison + 1} / ${SAISON_FINALE}`, 160, 30);
  g.fillStyle = '#edeae4'; g.font = '800 26px system-ui'; g.fillText(`Parcelles ×${multSaison().toFixed(1).replace('.', ',')}`, 160, 72);
  g.fillStyle = '#3a3f45'; g.fillRect(30, 100, 260, 20); g.fillStyle = p >= s ? '#4fd6e3' : '#f4b41a'; g.fillRect(30, 100, 260 * Math.min(1, p / s), 20);
  g.fillStyle = '#c9c3b6'; g.font = '800 18px system-ui'; g.fillText(`${(p * 100).toFixed(1).replace('.', ',')} % / ${Math.round(s * 100)} % de la planète`, 160, 146);
  g.font = '800 22px system-ui'; g.fillStyle = p >= s ? '#f08a24' : '#6c7076'; g.fillText(p >= s ? 'CLORE LA SAISON' : 'Pas encore', 160, 208); e.maj();
}
INTER.push({ p: BORNE_SAISON.p, r: 2.2, get etiquette() { return PLANETE_PROG.vert / NT >= seuilSaison() ? 'Clore la saison' : null; }, agir: () => cloreSaison() });
let tBornes = 0;
MAJ.push((dt) => { if (TOIT.niv !== S.toit) TOIT.maj(); tBornes += dt; if (tBornes < 0.5 || joueur.p.distanceTo(HALL.position) > 40) return; tBornes = 0; dessinerToit(); dessinerRobots(); dessinerSaison(); dessinerRech(); });
dessinerToit(); dessinerRobots(); dessinerSaison(); dessinerRech();

// --- L'absence : les robots et les pilotes ont travaillé eux aussi (deux heures au plus), de parcelle en parcelle
//     à partir de là où ils étaient, au tiers de leur rythme en jeu. Le total s'ajoute à l'annonce du retour. ---
function absenceEquipe(date) {
  const s = Math.min(7200, (Date.now() - date) / 1000); if (!date || s < 300) return;
  const cr0 = S.credits, t0 = S.tuiles; let budget = 40000;
  const travail = (depart, n, vendre) => { let p = depart.clone(); for (; n > 0 && budget > 0; n--, budget--) { const k = chercherTuile(p, 40); if (k < 0) { p = surSol(p.addScaledVector(tangent(p, _rd.subVectors(p, BASE)), 30)); continue; } p.copy(T.pos[k]); vendre(polliniser(k, 'bot')); } };
  travail(SORTIE_HALL(), Math.floor(Math.min(S.robots, MAX_ROBOTS) * s * 0.35 / 3), (v) => { S.robotVendu = (S.robotVendu || 0) + expedier(v, 'pollen'); });
  for (const c of ORDRE_VEHICULES) { const w = FLOTTE[c]; if (!w.possede || !w.pilote || !w.pilote.achete || !w.pilote.actif || !w.D.largeur) continue; const voies = w.D.largeur === 1 ? 1 : 2 * Math.max(2, Math.floor(w.D.largeur / 2)) + 1; travail(w.p.distanceTo(BASE) < RB ? surSol(local(0, RB + 6)) : w.p, Math.floor(voies * 0.95 / 2 * w.D.vmax * 0.5 * s / 3), (v) => encaisser(v * (1 + 0.06 * S.rech.pilotes))); }
  const cr = Math.round(S.credits - cr0), n = S.tuiles - t0; if (!n) return;
  const a = document.getElementById('annonce'); montrerAnnonce(`${a.hidden ? '' : a.textContent + ' '}Ton équipe (robots et pilotes) a pollinisé ${n} parcelles (+${fmtCr(cr)} cr).`); sauverBientot();
}
if (DEMARRAGE.repris) absenceEquipe(DEMARRAGE.date);
