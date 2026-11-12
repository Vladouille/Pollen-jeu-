// =====================================================================
// 17. L'usine et les charges. Une usine à l'ouest de la base, des ouvriers payés, de l'électricité payée.
//     - L'usine fabrique des brosses (robots, désherbeurs, pollinisateurs, tours, drones) et des pièces de rechange (pilotes
//       automatiques). Un ouvrier fait une pièce toutes les 20 s ; il touche 0,6 cr/s, embauché ou non au travail.
//     - L'électricité qui manque (machines, usine, recharge des robots) vient du réseau extérieur à 0,25 cr par kW et par
//       seconde ; la toiture solaire passe d'abord, son surplus se vend 0,1 cr/kW/s.
//     - Les charges sont prélevées toutes les 2 s. Sans argent : la facture reste due, les ouvriers s'arrêtent et le réseau
//       extérieur est coupé jusqu'au paiement ; rien n'est perdu.
//     - Chaque secteur entièrement fleuri paie une prime (la moitié de sa valeur), une fois par saison.
//     - Les mauvaises herbes gagnent les parcelles fanées voisines ; des robots désherbeurs les arrachent.
//     - Vingt-quatre fleurs rares, violettes, signalées par une colonne de lumière : seul le joueur peut les polliniser (×25).
// =====================================================================
S.stock = { brosses: 40, pieces: 20, ...(S.stock || {}) };
S.ouvriers = S.ouvriers || 0; S.desherbeurs = S.desherbeurs || 0; S.finis = S.finis || [];
const CIBLE_STOCK = { brosses: 150, pieces: 60 }, MAX_OUVRIERS = 12, SALAIRE = 0.6, PRIX_KW = 0.25, VENTE_KW = 0.1, EMBAUCHE = 400;
const CHARGES = { off: false, impaye: false, du: 0, salaires: 0, elec: 0, vente: 0, kwAchat: 0, t: 0, paye: 0 };
const brosseOk = () => S.stock.brosses > 0, piecesOk = () => S.stock.pieces > 0;
function consommer(q, n) { S.stock[q] = Math.max(0, S.stock[q] - n); }
APRES_POLLEN.push((k, par, v) => { if (par === 'bot') consommer('brosses', 1 / 30); else if (par === 'pilote') consommer('pieces', 1 / 400); return v; });   // l'usure

// --- Le bâtiment : murs blancs, toit à sheds vitrés, cheminée, grande porte vers la base ; établis, presse, tapis, caisses. ---
const USINE = (() => {
  const W = 20, D = 12, H = 6, g = new THREE.Group(), p = local(-37, -2);
  poserSur(g, p, versBase(p));
  const murs = [[W, 0.3, 0, -D / 2], [0.3, D, -W / 2, 0], [0.3, D, W / 2, 0], [(W - 6) / 2, 0.3, -(W + 6) / 4, D / 2], [(W - 6) / 2, 0.3, (W + 6) / 4, D / 2]];
  for (const [w, d, x, z] of murs) placer(g, boite(w, H + 0.4, d, M.blanc, 0.04), x, (H - 0.4) / 2, z);
  placer(g, boite(6, H - 4.2, 0.3, M.blanc, 0.04), 0, 4.2 + (H - 4.2) / 2, D / 2); placer(g, boite(6.4, 0.12, 0.36, M.lisere, 0.03), 0, 4.2, D / 2);   // linteau de la grande porte
  placer(g, boite(W + 0.1, 0.3, D + 0.1, M.graphite, 0.05), 0, -0.05, 0);   // dalle
  for (let x = -W / 2 + 1.5; x < W / 2; x += 2.5) placer(g, boite(0.28, 2.2, 0.05, M.seve, 0.02), x, 3.6, -D / 2 - 0.17);
  placer(g, boite(W + 0.5, 0.25, D + 0.5, M.blanc, 0.05), 0, H + 0.12, 0); placer(g, boite(W + 0.54, 0.07, D + 0.54, M.lisere, 0.02), 0, H - 0.02, 0);
  for (let i = 0; i < 4; i++) {   // les sheds : un pan incliné et une verrière verticale, quatre fois
    const x = -W / 2 + 2.5 + i * 5; const pan = placer(g, boite(5.1, 0.14, D, M.panneau, 0.04), x, H + 0.95, 0); pan.rotation.z = -0.32;
    placer(g, boite(0.08, 1.6, D - 0.4, M_VERRE, 0.01), x + 2.42, H + 1.0, 0); placer(g, boite(0.12, 0.08, D, M.lisere, 0.02), x + 2.42, H + 1.82, 0);
  }
  placer(g, tube(0.45, 0.55, 5, M.panneau, 20), W / 2 - 2, H + 2.5, -D / 2 + 2); for (const y of [H + 3.5, H + 4.8]) placer(g, tube(0.5, 0.5, 0.15, M.lisere, 20), W / 2 - 2, y, -D / 2 + 2);   // cheminée
  placer(g, boite(5.4, 1.0, 0.2, M.lisere, 0.05), 0, H - 0.8, D / 2 + 0.2); placer(g, boite(5.0, 0.8, 0.03, new THREE.MeshStandardMaterial({ map: texteTex([['USINE', 84]], 1024, 128, '#f08a24', '#fffdf7'), roughness: 0.5 }), 0.01), 0, H - 0.8, D / 2 + 0.32);
  for (let x = -W / 2 + 2; x <= W / 2 - 2; x += 4) placer(g, boite(0.3, 0.05, D - 2, M_LUM, 0.01), x, H - 0.2, 0);
  for (const z of [-2.2, 1.4]) { placer(g, boite(13, 0.9, 0.9, M.blanc, 0.04), 0, 0.45, z); placer(g, boite(13.1, 0.08, 1.0, M.graphite, 0.02), 0, 0.94, z); placer(g, boite(13.1, 0.04, 1.0, M.lisere, 0.01), 0, 0.7, z); }   // établis
  placer(g, boite(2.2, 2.4, 1.6, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.06), -7.9, 1.2, -4.3); placer(g, boite(1.4, 0.3, 1.0, M.graphite, 0.04), -7.9, 2.55, -4.3);   // la presse
  placer(g, boite(12, 0.06, 0.8, M_TAPIS, 0.01), 1.0, 0.82, -4.6); for (let x = -4.6; x <= 6.6; x += 2.8) placer(g, boite(0.1, 0.8, 0.7, M.graphite, 0.02), x, 0.4, -4.6);   // le tapis
  fusionner(g); scene.add(g); ombreContact(g, 1).scale.set(W / 2 + 0.6, 1, D / 2 + 0.6);
  for (const [w, d, x, z] of murs) OBSTACLES.push(boiteDe(g, w / 2 + 0.05, d / 2 + 0.05, {}, x, z));
  for (const z of [-2.2, 1.4]) OBSTACLES.push(boiteDe(g, 6.6, 0.5, {}, 0, z)); OBSTACLES.push(boiteDe(g, 1.2, 0.9, {}, -7.9, -4.3), boiteDe(g, 6.0, 0.45, {}, 1.0, -4.6));
  return g;
})();
// Les ouvriers : debout aux établis, ils se penchent sur leur travail ; les caisses de brosses s'empilent près de la porte.
const POSTES = []; for (const z of [-3.0, 2.2]) for (let x = -5.5; x <= 5.6; x += 2.2) POSTES.push([x, z, z < 0 ? 0 : Math.PI]);
const OUVRIERS_3D = POSTES.map(([x, z, ry]) => { const o = new THREE.Group(), corps = fabriquerPilote(false); o.add(corps); o.userData.corps = corps; poserDans(o, USINE, x, z, ry); o.visible = false; scene.add(o); return o; });   // le corps à part : on l'incline sans toucher au repère
const CAISSES_3D = Array.from({ length: 12 }, (_, k) => { const c = caisses(1); poserDans(c, USINE, 7.2 + (k % 3) * 0.6, -0.4 + Math.floor(k / 3) * 0.6); c.visible = false; scene.add(c); return c; });
const PROD = { acc: 0, parMin: 0, fait: [] };
function produire(dt, rythme = 1) {   // ce qui manque le plus, par rapport au stock voulu ; rien quand tout est plein
  const ouvriers = CHARGES.impaye ? 0 : S.ouvriers; PROD.acc += ouvriers / 20 * dt * rythme; let n = 0;
  while (PROD.acc >= 1) { PROD.acc -= 1; const q = S.stock.brosses / CIBLE_STOCK.brosses <= S.stock.pieces / CIBLE_STOCK.pieces ? 'brosses' : 'pieces'; if (S.stock[q] >= CIBLE_STOCK[q]) { PROD.acc = 0; break; } S.stock[q]++; n++; }
  return n;
}
let tFumee = 0;
MAJ.push((dt) => {
  const n = produire(dt); if (n) PROD.fait.push(gt); while (PROD.fait.length && gt - PROD.fait[0] > 60) PROD.fait.shift(); PROD.parMin = PROD.fait.length;
  const pres = joueur.p.distanceTo(USINE.position) < 70, travaille = S.ouvriers > 0 && !CHARGES.impaye;
  OUVRIERS_3D.forEach((o, k) => { o.visible = k < S.ouvriers && pres; if (o.visible) o.userData.corps.rotation.x = travaille ? 0.12 + Math.sin(gt * 3 + k) * 0.1 : 0; });
  CAISSES_3D.forEach((c, k) => { c.visible = pres && k < Math.ceil(S.stock.brosses / 12); });
  tFumee += dt; if (travaille && pres && tFumee > 0.6) { tFumee = 0; bouffee(monde(USINE, 8, 11.6, -4), 6, 0xbdbab3); }
});
// Les bornes devant l'usine.
function borneDans(parent, x, z, titre) {
  const e = ecranDyn(320, 256), b = new THREE.Group(); placer(b, cylindre(0.22, 0.26, 0.06, M.graphite, 16), 0, 0.03, 0); placer(b, tube(0.05, 0.07, 1.0, M.graphite), 0, 0.5, 0);
  const tete = new THREE.Group(); placer(b, tete, 0, 1.25, 0); tete.rotation.x = -0.35; placer(tete, boite(0.72, 0.6, 0.07, M.graphite, 0.03), 0, 0, 0);
  const ec = placer(tete, new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.51), e.mat), 0, 0.01, 0.04); ec.userData.garder = true; placer(b, bouton(), 0, 0.75, 0.1).scale.setScalar(0.8);
  placer(b, bouton(), 0.3, 0.75, 0.08).scale.setScalar(0.5);
  placer(b, boite(0.6, 0.12, 0.03, new THREE.MeshStandardMaterial({ map: texteTex([[titre, 44]], 512, 96, '#2e343a', '#fffdf7'), roughness: 0.5 }), 0.01), 0, 1.68, 0);
  poserDans(b, parent, x, z); b.position.copy(surSol(b.position)); scene.add(b); OBSTACLES.push({ p: b.position.clone(), r: 0.3 });
  return { e, p: monde(parent, x, 1.2, z + 0.1), p2: monde(parent, x + 0.3, 0.8, z + 0.1) };
}
const BORNE_USINE = borneDans(USINE, -4, 8.2, 'USINE'), BORNE_DESH = borneDans(USINE, 4, 8.2, 'DÉSHERBEURS');
const parMin = (x) => Math.round(x * 60);
function dessinerUsine() {
  const e = BORNE_USINE.e, g = e.g; fond(e); g.textAlign = 'left'; const L = (t, y, c = '#edeae4', f = 19) => { g.fillStyle = c; g.font = `800 ${f}px system-ui`; g.fillText(t, 16, y); };
  L(`OUVRIERS ${S.ouvriers} / ${MAX_OUVRIERS}`, 26, '#c9c3b6', 20);
  L(`Brosses ${Math.floor(S.stock.brosses)} / ${CIBLE_STOCK.brosses}`, 62); L(`Pièces ${Math.floor(S.stock.pieces)} / ${CIBLE_STOCK.pieces}`, 90); L(`${PROD.parMin} fabriquées par minute`, 118, '#4fd6e3', 17);
  L(`Salaires −${fmtCr(parMin(CHARGES.salaires))} cr/min`, 152, '#f4b41a', 17); L(`Électricité −${fmtCr(parMin(CHARGES.elec))} cr/min`, 178, '#f4b41a', 17);
  if (CHARGES.impaye) L('IMPAYÉ : ouvriers à l’arrêt', 208, '#e0452f', 18);
  L(S.ouvriers < MAX_OUVRIERS ? `● Embaucher ${fmtCr(EMBAUCHE)} cr   ○ Renvoyer` : '○ Renvoyer', 238, S.credits >= EMBAUCHE ? '#f08a24' : '#e0452f', 16); e.maj();
}
INTER.push({ p: BORNE_USINE.p, r: 2.2, get etiquette() { return S.ouvriers < MAX_OUVRIERS ? `Embaucher (${fmtCr(EMBAUCHE)} cr, ${parMin(SALAIRE)} cr/min)` : null; },
  agir() { if (S.ouvriers >= MAX_OUVRIERS || S.credits < EMBAUCHE) { sons.refus(); return; } S.credits -= EMBAUCHE; S.ouvriers++; sons.achat(); dessinerUsine(); sauverBientot(); } });
INTER.push({ p: BORNE_USINE.p2, r: 1.6, get etiquette() { return S.ouvriers ? 'Renvoyer un ouvrier' : null; }, agir() { if (!S.ouvriers) { sons.refus(); return; } S.ouvriers--; sons.arrache(); dessinerUsine(); sauverBientot(); } });

// --- Les charges : salaires, électricité du réseau extérieur, surplus solaire vendu. ---
function kwDemande() { return (TOIT.besoin || 0) + (S.ouvriers && !CHARGES.impaye ? 4 + 1.5 * S.ouvriers : 0) + 0.3 * (ROBOTS.length + DESHERBEURS.length); }
MAJ.push((dt) => {
  if (CHARGES.off) return;
  const demande = kwDemande(), prod = TOIT.prod || 0;
  CHARGES.kwAchat = CHARGES.impaye ? 0 : Math.max(0, demande - prod);   // impayé : plus de réseau, plus de salaires qui courent
  CHARGES.salaires = CHARGES.impaye ? 0 : S.ouvriers * SALAIRE; CHARGES.elec = CHARGES.kwAchat * PRIX_KW; CHARGES.vente = Math.max(0, prod - demande) * VENTE_KW;
  CHARGES.du += (CHARGES.salaires + CHARGES.elec) * dt; TOIT.cumul += CHARGES.vente * dt;
  if (TOIT.cumul >= 25) { TOIT.vendu += expedier(TOIT.cumul, 'energie'); TOIT.cumul = 0; }
  CHARGES.t += dt; if (CHARGES.t < 2) return; CHARGES.t = 0;
  if (CHARGES.du <= 0) { CHARGES.impaye = false; return; }
  if (S.credits >= CHARGES.du) { S.credits -= CHARGES.du; CHARGES.paye += CHARGES.du; CHARGES.du = 0; CHARGES.impaye = false; }
  else { if (!CHARGES.impaye) sons.refus(); CHARGES.impaye = true; }
});
{   // la ligne des charges, sous les crédits
  const el = $('charges'); let sig = '';
  MAJ.push(() => { const m = parMin(CHARGES.salaires + CHARGES.elec), t = CHARGES.off || (!m && !CHARGES.impaye) ? '' : CHARGES.impaye ? `Impayé : ${fmtCr(CHARGES.du)} cr` : `Charges −${fmtCr(m)} cr/min`; if (t === sig) return; sig = t; el.textContent = t; el.hidden = !t; el.classList.toggle('impaye', CHARGES.impaye); });
}

// --- Les primes de secteur : une fois par secteur et par saison. ---
let FINIS = new Set(S.finis), finisRef = S.finis, saisonVue = S.saison;
SECTEUR_FINI.push((s) => {
  if (S.finis !== finisRef) { FINIS = new Set(S.finis); finisRef = S.finis; }
  if (FINIS.has(s)) return; FINIS.add(s); S.finis = finisRef = [...FINIS];
  const prime = Math.round(secteurs[s].total * VARIETES[SECTEURS[s].variete].prix * 0.5 * multSaison());
  S.credits += prime; montrerBandeau('Secteur terminé', `prime : +${fmtCr(prime)} cr`); sons.vente(); sauverBientot();
});
MAJ.push(() => { if (S.saison !== saisonVue) { saisonVue = S.saison; FINIS = new Set(); S.finis = finisRef = []; } });

// --- Les mauvaises herbes : elles gagnent les parcelles fanées voisines ; leurs instances à part de celles du départ. ---
const HERBES = { off: false, ens: new Set(), slots: new Map(), libres: [], t: 0 }, MAX_HERBES = 3000;
const herbesMesh = new THREE.InstancedMesh(chardonGeo, chardons.material, MAX_HERBES * 2);
for (let j = MAX_HERBES * 2 - 1; j >= 0; j--) { herbesMesh.setMatrixAt(j, _m.makeScale(0, 0, 0)); HERBES.libres.push(j); }
herbesMesh.frustumCulled = false; herbesMesh.castShadow = true; scene.add(herbesMesh);
function poserHerbe(k) {
  if (HERBES.slots.has(k) || slotsChardon.has(k) || HERBES.libres.length < 2) return;
  const R = mulberry(k * 17 + 3), l = [], { est, nord } = repere(T.pos[k]);
  for (let c = 0; c < 2; c++) { const a = R() * 6.28, d = R() * 0.6, sc = 0.9 + R() * 0.5, j = HERBES.libres.pop(); surSol(_p.copy(T.pos[k]).addScaledVector(est, Math.cos(a) * d).addScaledVector(nord, Math.sin(a) * d), 0, _p); herbesMesh.setMatrixAt(j, _m.compose(_p, qHaut(T.dir[k], _q), _s.set(sc, sc, sc))); l.push(j); }
  HERBES.slots.set(k, l); herbesMesh.instanceMatrix.needsUpdate = true;
}
function planterHerbe(k) { if (k < 0 || T.sorte[k] !== 0 || T.vert[k] || HERBES.slots.size >= MAX_HERBES) return false; changerSorte(k, 1); poserHerbe(k); HERBES.ens.add(k); return true; }
APRES_DESHERBER.push((k) => { const l = HERBES.slots.get(k); if (l) { for (const j of l) { herbesMesh.setMatrixAt(j, _m.makeScale(0, 0, 0)); HERBES.libres.push(j); } herbesMesh.instanceMatrix.needsUpdate = true; HERBES.slots.delete(k); } HERBES.ens.delete(k); });
function reconcilierHerbes() { HERBES.ens.clear(); for (let k = 0; k < NT; k++) if (T.sorte[k] === 1) { HERBES.ens.add(k); poserHerbe(k); } }
reconcilierHerbes();
MAJ.push((dt) => {
  HERBES.t += dt; if (HERBES.t < 3 || HERBES.off) return; HERBES.t = 0;
  const l = [...HERBES.ens]; if (!l.length) return;
  for (let n = 0; n < 25; n++) { if (Math.random() > 0.05) continue;   // environ une nouvelle herbe toutes les 2,5 s
    const k = l[Math.floor(Math.random() * l.length)], v = voisinsDe(T.id[k]); planterHerbe(IDX.get(v[Math.floor(Math.random() * v.length)]) ?? -1); }
});

// --- Les robots désherbeurs : orange, une pince au bout du bras ; ils vont à la mauvaise herbe la plus proche. ---
const DESHERBEURS = [], MAX_DESH = 20, prixDesherbeur = (n) => Math.round(3000 * Math.pow(1.4, n) / 50) * 50;
function fabriquerDesherbeur() {
  const g = new THREE.Group(), c = new THREE.Group(); g.add(c);
  placer(c, new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.3, 4, 12), M.lisere), 0, 0.62, 0); placer(c, cylindre(0.205, 0.205, 0.06, M.graphite, 14), 0, 0.6, 0);
  placer(c, new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), M.graphite), 0, 1.0, 0); placer(c, boite(0.22, 0.06, 0.06, M.seve, 0.02), 0, 1.02, -0.14);
  for (const s of [-1, 1]) placer(c, tube(0.05, 0.06, 0.36, M.graphite), s * 0.1, 0.2, 0);
  const bras = new THREE.Group(); bras.position.set(0.24, 0.78, 0); bras.userData.garder = true; c.add(bras);
  placer(bras, tube(0.03, 0.03, 0.45, M.graphite), 0, -0.2, -0.05).rotation.x = 0.4; for (const s of [-1, 1]) placer(bras, boite(0.03, 0.14, 0.04, M.blanc, 0.01), s * 0.04, -0.46, -0.15).rotation.z = s * 0.3;
  g.userData.corps = c; g.userData.bras = bras; fusionner(c); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
const PORTE_USINE = () => surSol(monde(USINE, 0, 0, 7.6));
function chercherHerbe(p, rmax = 90) {
  const { est, nord } = repere(p);
  for (let r = 2; r <= rmax; r += 2) { const n = Math.max(6, Math.round(r * 1.6)); for (let a = 0; a < n; a++) { const t = (a / n) * Math.PI * 2 + r; _vp.copy(p).addScaledVector(est, Math.cos(t) * r).addScaledVector(nord, Math.sin(t) * r); const k = tuileA(_vp); if (k >= 0 && T.sorte[k] === 1 && !RESERVEES.has(k)) return k; } }
  return -1;
}
MAJ.push((dt) => {
  while (DESHERBEURS.length < Math.min(S.desherbeurs, MAX_DESH)) { const r = { g: fabriquerDesherbeur(), p: PORTE_USINE(), f: versBase(PORTE_USINE()), k: -1, t: 0, etat: 'cherche', phase: Math.random() * 6 }; scene.add(r.g); DESHERBEURS.push(r); }
  for (const r of DESHERBEURS) {
    r.phase += dt;
    if (r.k >= 0 && T.sorte[r.k] !== 1) { RESERVEES.delete(r.k); r.k = -1; r.etat = 'cherche'; }
    if (r.etat === 'cherche' && !brosseOk()) continue;
    if (r.etat === 'cherche') { r.t += dt; if (r.t > 0.5) { r.t = 0; const k = chercherHerbe(r.p); if (k >= 0) { r.k = k; RESERVEES.add(k); r.etat = 'va'; } else { r.etat = 'explore'; r.but = surSol(new V3().copy(r.p).addScaledVector(tangent(r.p, _rd.subVectors(r.p, BASE)), 60)); } } }
    const but = r.etat === 'va' ? T.pos[r.k] : r.etat === 'explore' ? r.but : null;
    if (but) {
      const d = r.p.distanceTo(but);
      if (r.etat === 'va' && d < 0.9) { r.etat = 'arrache'; r.t = 0; } else if (r.etat === 'explore' && d < 2) r.etat = 'cherche';
      else { tangent(r.p, _rd.subVectors(but, r.p), _rd); r.f.lerp(_rd, 1 - Math.exp(-dt * 6)).normalize(); surSol(_vp.copy(r.p).addScaledVector(_rd, Math.min(d, vitRobot() * dt)), 0, r.p); const rp = repousser(r.p, 0.3); surSol(rp.p, 0, r.p); }
    }
    if (r.etat === 'arrache') { r.t += dt; if (r.t >= 2.6) { if (T.sorte[r.k] === 1) { desherber(r.k); consommer('brosses', 1 / 40); expedier(2, 'graines'); if (r.p.distanceTo(joueur.p) < 30) bouffee(T.pos[r.k], 10, 0x8c8794); } RESERVEES.delete(r.k); r.k = -1; r.etat = 'cherche'; } }
    if (r.p.distanceTo(joueur.p) < 120) { poserSur(r.g, r.p, r.f); const m = r.etat === 'va' || r.etat === 'explore'; r.g.userData.corps.position.y = m ? Math.abs(Math.sin(r.phase * 9)) * 0.06 : 0; r.g.userData.bras.rotation.x = r.etat === 'arrache' ? Math.sin(r.phase * 10) * 0.6 - 0.4 : 0; r.g.visible = true; } else r.g.visible = false;
  }
});
function dessinerDesh() {
  const e = BORNE_DESH.e, g = e.g; fond(e); g.textAlign = 'center';
  g.fillStyle = '#c9c3b6'; g.font = '800 20px system-ui'; g.fillText('DÉSHERBEURS', 160, 28);
  g.fillStyle = '#edeae4'; g.font = '800 42px system-ui'; g.fillText(`${S.desherbeurs} / ${MAX_DESH}`, 160, 80);
  g.fillStyle = '#c9c3b6'; g.font = '800 18px system-ui'; g.fillText(`${fmtCr(HERBES.ens.size)} mauvaises herbes`, 160, 124);
  const prix = prixDesherbeur(S.desherbeurs); g.font = '800 22px system-ui'; g.fillStyle = S.desherbeurs >= MAX_DESH ? '#4fd6e3' : S.credits >= prix ? '#f08a24' : '#e0452f';
  g.fillText(S.desherbeurs >= MAX_DESH ? 'COMPLET' : `+1 : ${fmtCr(prix)} cr`, 160, 200); e.maj();
}
INTER.push({ p: BORNE_DESH.p, r: 2.2, get etiquette() { return S.desherbeurs < MAX_DESH ? `Désherbeur (${fmtCr(prixDesherbeur(S.desherbeurs))} cr)` : null; },
  agir() { const prix = prixDesherbeur(S.desherbeurs); if (S.desherbeurs >= MAX_DESH || S.credits < prix) { sons.refus(); return; } S.credits -= prix; S.desherbeurs++; sons.achat(); dessinerDesh(); sauverBientot(); } });

// --- Les fleurs rares : grandes, violettes, une colonne de lumière les signale de loin. ---
const RARES = { ens: new Set(), cible: 24, cueillies: 0 };
const M_RARE = new THREE.MeshStandardMaterial({ color: 0x8a4dff, emissive: 0x7a3dff, emissiveIntensity: 0.9, roughness: 0.4 });
const raresFleurs = new THREE.InstancedMesh(mereGeo, M_RARE, RARES.cible + 8), raresColonnes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.6, 40, 12, 1, true).translate(0, 20, 0), new THREE.MeshBasicMaterial({ color: 0xa070ff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), RARES.cible + 8);
for (const m of [raresFleurs, raresColonnes]) { m.count = 0; m.frustumCulled = false; scene.add(m); }
function majRares() { let i = 0; for (const k of RARES.ens) { if (i >= raresFleurs.instanceMatrix.count) break; _m.compose(T.pos[k], qHaut(T.dir[k], _q), _s.set(1.3, 1.3, 1.3)); raresFleurs.setMatrixAt(i, _m); _m.compose(T.pos[k], qHaut(T.dir[k], _q), _s.set(1, 1, 1)); raresColonnes.setMatrixAt(i, _m); i++; } raresFleurs.count = raresColonnes.count = i; raresFleurs.instanceMatrix.needsUpdate = raresColonnes.instanceMatrix.needsUpdate = true; }
function semerRare() { for (let essai = 0; essai < 200; essai++) { const k = Math.floor(Math.random() * NT); if (T.sorte[k] === 0 && !T.vert[k] && T.pos[k].distanceTo(BASE) > 90) { changerSorte(k, 5); RARES.ens.add(k); return k; } } return -1; }
function reconcilierRares() { RARES.ens.clear(); for (let k = 0; k < NT; k++) if (T.sorte[k] === 5) RARES.ens.add(k); while (RARES.ens.size < RARES.cible) if (semerRare() < 0) break; majRares(); }
reconcilierRares();
RARE_CUEILLIE.push((k, v) => { RARES.ens.delete(k); RARES.cueillies++; S.rares = (S.rares || 0) + 1; sons.or(); bouffee(T.pos[k], 60, 0xa070ff); montrerBandeau('Fleur rare', `+${fmtCr(v)} cr`); semerRare(); majRares(); sauverBientot(); });
REPERES_CARTE.push(() => [...RARES.ens].map((k) => T.pos[k]));

// --- Les drones du nid : chaque lot, un drone file vers la parcelle, la pollinise et revient se poser. ---
const droneGeo = (() => { const parts = [new THREE.BoxGeometry(0.3, 0.08, 0.3)]; for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) parts.push(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 12).translate(x, 0.06, z)); return mergeGeometries(parts.map((p) => p.index ? p.toNonIndexed() : p)); })();
droneGeo.type = 'RoundedBoxGeometry';
const dronesMesh = new THREE.InstancedMesh(droneGeo, M.graphite, 240); dronesMesh.count = 0; dronesMesh.frustumCulled = false; scene.add(dronesMesh);
function lancerDrone(p) {
  if (!p.drones) p.drones = Array.from({ length: 6 }, (_, i) => ({ t: 2, i, b: new V3() })); p.idr = ((p.idr || 0) + 1) % 6;
  const d = p.drones[p.idr]; d.t = 0; d.b.copy(T.pos[p.dernier]);
}
const _da = new V3(), _db = new V3();
MAJ.push((dt) => {
  let n = 0;
  for (const p of GRILLE.values()) {
    if (p.cle !== 'drones' || !p.drones || p.pos.distanceTo(joueur.p) > 200) continue;
    for (const d of p.drones) {
      d.t = Math.min(2, d.t + dt / 0.7); const a = (d.i / 6) * Math.PI * 2, { est, nord } = repere(p.pos);
      _da.copy(p.pos).addScaledVector(p.up, 1.75).addScaledVector(est, Math.cos(a) * 0.62).addScaledVector(nord, Math.sin(a) * 0.62);
      const s = d.t <= 1 ? d.t : 2 - d.t, h = Math.sin(s * Math.PI) * 8; _db.copy(_da).lerp(d.b, s).addScaledVector(p.up, h + s * 0.6);
      _m.compose(_db, qHaut(p.up, _q), _s.set(1, 1, 1)); if (n < 240) dronesMesh.setMatrixAt(n++, _m);
    }
  }
  dronesMesh.count = n; dronesMesh.instanceMatrix.needsUpdate = true;
});

// --- L'absence : l'usine a produit (au tiers) et les charges ont couru (au tiers, sans jamais passer sous zéro). ---
function chargesAbsence(date) {
  const s = Math.min(7200, (Date.now() - date) / 1000); if (!date || s < 300 || CHARGES.off) return;
  const n = produire(s / 3, 1), du = Math.round((S.ouvriers * SALAIRE + Math.max(0, (S.ouvriers ? 4 + 1.5 * S.ouvriers : 0) + 0.3 * (S.robots + S.desherbeurs) - kwToit() * 0.5) * PRIX_KW) * s / 3);
  const pris = Math.min(S.credits, du); S.credits -= pris; if (du > pris) { CHARGES.du += du - pris; CHARGES.impaye = true; }
  if (n || du) { const a = document.getElementById('annonce'); montrerAnnonce(`${a.hidden ? '' : a.textContent + ' '}L'usine a fabriqué ${n} pièces ; charges payées : ${fmtCr(pris)} cr.`); }
}
if (DEMARRAGE.repris) chargesAbsence(DEMARRAGE.date);
let tBornesU = 0;
MAJ.push((dt) => { tBornesU += dt; if (tBornesU < 0.5 || joueur.p.distanceTo(USINE.position) > 40) return; tBornesU = 0; dessinerUsine(); dessinerDesh(); });
dessinerUsine(); dessinerDesh();
