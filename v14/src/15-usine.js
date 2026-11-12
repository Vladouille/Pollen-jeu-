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

// --- Le bâtiment : 30 × 16 m, toit à sheds vitrés, cheminée, grande porte vers la base. Dedans, deux lignes de production :
//     une presse au début, un tapis qui avance entre deux rangées d'établis, des porteurs qui emportent les caisses aux
//     étagères. La ligne A tourne avec les ouvriers embauchés ; la ligne B avec les habitants de la ville. ---
const UW = 30, UD = 16, UH = 7;
const USINE = (() => {
  const W = UW, D = UD, H = UH, g = new THREE.Group(), p = local(-52, -2);
  poserSur(g, p, versBase(p));
  const murs = [[W, 0.3, 0, -D / 2], [0.3, D, -W / 2, 0], [0.3, D, W / 2, 0], [(W - 7) / 2, 0.3, -(W + 7) / 4, D / 2], [(W - 7) / 2, 0.3, (W + 7) / 4, D / 2]];
  for (const [w, d, x, z] of murs) placer(g, boite(w, H + 0.5, d, M.blanc, 0.04), x, (H - 0.5) / 2, z);
  placer(g, boite(7, H - 4.6, 0.3, M.blanc, 0.04), 0, 4.6 + (H - 4.6) / 2, D / 2); placer(g, boite(7.4, 0.12, 0.36, M.lisere, 0.03), 0, 4.6, D / 2);   // linteau de la grande porte
  placer(g, boite(W + 0.1, 0.3, D + 0.1, M.graphite, 0.05), 0, -0.05, 0); placer(g, boite(W - 1, 0.012, D - 1, M_DALLE, 0.004), 0, 0.106, 0);   // dalle
  for (let x = -W / 2 + 1.5; x < W / 2; x += 2.5) for (const z of [-D / 2 - 0.17, D / 2 + 0.17]) if (Math.abs(x) > 4.5 || z < 0) placer(g, boite(0.28, 2.4, 0.05, M.seve, 0.02), x, 4.2, z);
  placer(g, boite(W + 0.5, 0.25, D + 0.5, M.blanc, 0.05), 0, H + 0.12, 0); placer(g, boite(W + 0.54, 0.07, D + 0.54, M.lisere, 0.02), 0, H - 0.02, 0);
  for (let i = 0; i < 6; i++) {   // les sheds : un pan incliné et une verrière verticale, six fois
    const x = -W / 2 + 2.5 + i * 5; const pan = placer(g, boite(5.1, 0.14, D, M.panneau, 0.04), x, H + 0.95, 0); pan.rotation.z = -0.32;
    placer(g, boite(0.08, 1.6, D - 0.4, M_VERRE, 0.01), x + 2.42, H + 1.0, 0); placer(g, boite(0.12, 0.08, D, M.lisere, 0.02), x + 2.42, H + 1.82, 0);
  }
  placer(g, tube(0.55, 0.65, 6, M.panneau, 20), W / 2 - 2.5, H + 3, -D / 2 + 2.5); for (const y of [H + 4, H + 5.6]) placer(g, tube(0.6, 0.6, 0.15, M.lisere, 20), W / 2 - 2.5, y, -D / 2 + 2.5);   // cheminée
  placer(g, boite(6.4, 1.1, 0.2, M.lisere, 0.05), 0, H - 1.0, D / 2 + 0.2); placer(g, boite(6.0, 0.9, 0.03, new THREE.MeshStandardMaterial({ map: texteTex([['USINE', 84]], 1024, 128, '#f08a24', '#fffdf7'), roughness: 0.5 }), 0.01), 0, H - 1.0, D / 2 + 0.32);
  for (let x = -W / 2 + 2; x <= W / 2 - 2; x += 4) placer(g, boite(0.3, 0.05, D - 2, M_LUM, 0.01), x, H - 0.2, 0);
  for (const zl of [-3.5, 3.5]) {   // une ligne : établis des deux côtés, tapis au milieu, presse au début, bac au bout
    for (const s of [-1, 1]) { placer(g, boite(17, 0.9, 0.8, M.blanc, 0.04), -1.5, 0.45, zl + s * 1.5); placer(g, boite(17.1, 0.07, 0.9, M.graphite, 0.02), -1.5, 0.93, zl + s * 1.5); placer(g, boite(17.1, 0.04, 0.9, M.lisere, 0.01), -1.5, 0.7, zl + s * 1.5); }
    placer(g, boite(20, 0.1, 0.9, M.graphite, 0.02), -1, 0.8, zl); for (let x = -10.5; x <= 8.6; x += 2.4) for (const s of [-1, 1]) placer(g, boite(0.08, 0.8, 0.08, M.graphite, 0.02), x, 0.4, zl + s * 0.4);
    const t = placer(g, new THREE.Mesh(new THREE.PlaneGeometry(19.6, 0.8).rotateX(-Math.PI / 2), M_TAPIS), -1, 0.86, zl); t.userData.garder = true;
    placer(g, boite(2.4, 2.6, 1.8, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.06), -12.6, 1.3, zl); placer(g, boite(1.6, 0.4, 1.2, M.graphite, 0.04), -12.6, 3.2, zl);   // la presse
    placer(g, boite(1.6, 0.7, 1.4, M.graphite, 0.04), 10.2, 0.35, zl); placer(g, boite(1.62, 0.05, 1.42, M.lisere, 0.02), 10.2, 0.72, zl);   // le bac d'arrivée
  }
  for (const z of [-6.8, -4.6, 4.6, 6.8]) { placer(g, boite(0.5, 2.6, 1.8, M.graphite, 0.03), 13.7, 1.3, z * 0.0 + z); }   // montants des étagères
  for (const y of [0.3, 1.2, 2.1]) placer(g, boite(0.7, 0.06, 13.8, M.blanc, 0.02), 13.7, y, 0);
  const ec = ecranDyn(1024, 384); placer(g, boite(6.2, 2.3, 0.12, M.graphite, 0.03), -2, 4.6, -D / 2 + 0.25); const m = placer(g, new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.1), ec.mat), -2, 4.6, -D / 2 + 0.33); m.userData.garder = true;
  fusionner(g); scene.add(g); ombreContact(g, 1).scale.set(W / 2 + 0.6, 1, D / 2 + 0.6);
  for (const [w, d, x, z] of murs) OBSTACLES.push(boiteDe(g, w / 2 + 0.05, d / 2 + 0.05, {}, x, z));
  for (const zl of [-3.5, 3.5]) { OBSTACLES.push(boiteDe(g, 9.6, 1.95, {}, -1.5, zl), boiteDe(g, 1.25, 0.95, {}, -12.6, zl), boiteDe(g, 0.85, 0.75, {}, 10.2, zl)); }
  OBSTACLES.push(boiteDe(g, 0.45, 7.1, {}, 13.7, 0));
  g.userData.ecran = ec; g.userData.tapis = g.children.filter((o) => o.userData.garder && o.material === M_TAPIS);
  return g;
})();
// --- Les ouvriers : combinaison bleue, casque jaune, bras et jambes articulés. ---
const M_COMBI = new THREE.MeshStandardMaterial({ color: 0x2f6db5, roughness: 0.8 }), M_PEAU = new THREE.MeshStandardMaterial({ color: 0xd9a27a, roughness: 0.7 }), M_CASQUE = new THREE.MeshStandardMaterial({ color: 0xf4b41a, roughness: 0.5 });
function fabriquerOuvrier(peau = M_PEAU) {
  const g = new THREE.Group(), membre = (l, r, mat) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 8), mat); m.position.y = -l / 2 - r * 0.5; m.castShadow = true; return m; };
  placer(g, new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.42, 4, 10), M_COMBI), 0, 1.16, 0).castShadow = true;
  placer(g, boite(0.38, 0.06, 0.3, M.lisere, 0.02), 0, 1.1, 0);   // ceinture orange
  placer(g, new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), peau), 0, 1.6, 0); placer(g, new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M_CASQUE), 0, 1.63, 0); placer(g, boite(0.3, 0.025, 0.1, M_CASQUE, 0.01), 0, 1.63, -0.13);
  const bras = [-1, 1].map((s) => { const b = new THREE.Group(); b.position.set(s * 0.25, 1.4, 0); b.add(membre(0.42, 0.06, M_COMBI)); const main = placer(b, new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), peau), 0, -0.56, 0); main.castShadow = true; g.add(b); return b; });
  const jambes = [-1, 1].map((s) => { const j = new THREE.Group(); j.position.set(s * 0.1, 0.86, 0); j.add(membre(0.62, 0.075, M.graphite)); placer(j, boite(0.12, 0.08, 0.22, M.graphite, 0.02), 0, -0.82, -0.04); g.add(j); return j; });
  const caisse = placer(g, boite(0.42, 0.3, 0.32, M.blanc, 0.03), 0, 0.95, -0.36); caisse.visible = false; placer(caisse, boite(0.43, 0.05, 0.33, M.lisere, 0.01), 0, 0.05, 0);
  g.userData = { bras, jambes, caisse }; return g;
}
const PEAUX = [0xd9a27a, 0xb07a52, 0x8a5a3c, 0xf0c8a0, 0x6b4430].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
// Les postes : douze monteurs par ligne (six de chaque côté du tapis), un opérateur à la presse, deux porteurs.
const POSTES = [];
for (const zl of [-3.5, 3.5]) {
  const ligne = [];
  for (let k = 0; k < 6; k++) for (const s of [-1, 1]) ligne.push({ type: 'monteur', x: -8.5 + k * 2.8, z: zl + s * 2.3, ry: s < 0 ? 0 : Math.PI });
  ligne.splice(2, 0, { type: 'porteur', x: 10.2, z: zl + 1.2, ry: 0 }); ligne.splice(7, 0, { type: 'presse', x: -12.6, z: zl + 1.6, ry: Math.PI }); ligne.splice(11, 0, { type: 'porteur', x: 10.2, z: zl - 1.2, ry: 0 });
  POSTES.push(...ligne);
}
const OUVRIERS_3D = POSTES.map((p, k) => { const o = fabriquerOuvrier(PEAUX[k % PEAUX.length]); o.visible = false; scene.add(o); return { o, p, t: Math.random() * 6, etat: 0 }; });
const CAISSES_3D = Array.from({ length: 30 }, (_, k) => { const c = caisses(1); poserDans(c, USINE, 13.7, -6.3 + (k % 10) * 1.4); c.position.addScaledVector(c.position.clone().normalize(), [0.36, 1.26, 2.16][Math.floor(k / 10)]); c.visible = false; scene.add(c); return c; });
// Les brosses qui avancent sur les tapis.
const geoBrosse = mergeGeometries([new THREE.BoxGeometry(0.4, 0.05, 0.08), new THREE.BoxGeometry(0.3, 0.08, 0.1).translate(0.05, 0.06, 0)].map((x) => x.toNonIndexed())); geoBrosse.type = 'RoundedBoxGeometry';
const brossesTapis = new THREE.InstancedMesh(geoBrosse, M_POILS, 80); brossesTapis.count = 0; brossesTapis.frustumCulled = false; scene.add(brossesTapis);
const SUR_TAPIS = [];   // { ligne, x }
const POPULATION = 24, SALAIRE_VILLE = 0.3;
S.ville = !!S.ville;
const effectifs = () => S.ouvriers + (S.ville ? POPULATION : 0);
const cibleStock = (q) => CIBLE_STOCK[q] * (S.ville ? 2 : 1);
const PROD = { acc: 0, parMin: 0, fait: [] };
function produire(dt, rythme = 1) {   // ce qui manque le plus, par rapport au stock voulu ; rien quand tout est plein
  const ouvriers = CHARGES.impaye ? 0 : effectifs(); PROD.acc += ouvriers / 20 * dt * rythme; let n = 0;
  while (PROD.acc >= 1) { PROD.acc -= 1; const q = S.stock.brosses / cibleStock('brosses') <= S.stock.pieces / cibleStock('pieces') ? 'brosses' : 'pieces'; if (S.stock[q] >= cibleStock(q)) { PROD.acc = 0; break; } S.stock[q]++; n++; }
  return n;
}
let tFumee = 0, tTapis = 0;
const _ub = new V3();
MAJ.push((dt) => {
  const n = produire(dt); if (n) PROD.fait.push(gt); while (PROD.fait.length && gt - PROD.fait[0] > 60) PROD.fait.shift(); PROD.parMin = PROD.fait.length;
  const pres = joueur.p.distanceTo(USINE.position) < 70, actifs = CHARGES.impaye ? 0 : effectifs(), plein = S.stock.brosses >= cibleStock('brosses') && S.stock.pieces >= cibleStock('pieces'), travaille = actifs > 0 && !plein;
  // chacun à son poste : les premiers venus sur la ligne A, les habitants sur la ligne B
  OUVRIERS_3D.forEach((w, k) => {
    const actif = k < Math.round(Math.min(S.ouvriers, MAX_OUVRIERS) * 15 / MAX_OUVRIERS) || (S.ville && k >= 15);   // ligne A : les embauchés (porteurs et presse compris) ; ligne B : les habitants
    w.o.visible = pres && actif; if (!w.o.visible) return;
    w.t += dt * (travaille ? 1 : 0.2); const { bras, jambes, caisse } = w.o.userData, P = w.p;
    if (P.type === 'porteur') {   // va-et-vient entre le bac et les étagères, une caisse dans les bras à l'aller
      const cycle = (w.t * 0.12) % 2, aller = cycle < 1, s = aller ? cycle : 2 - cycle, x = lerp(P.x, 13.0, s), z = lerp(P.z, P.z * 0.6, s);
      poserDans(w.o, USINE, x, z, aller ? -Math.PI / 2 : Math.PI / 2); const pas = Math.sin(w.t * 9);
      jambes[0].rotation.x = pas * 0.6; jambes[1].rotation.x = -pas * 0.6; caisse.visible = aller && travaille; bras[0].rotation.x = bras[1].rotation.x = caisse.visible ? -1.2 : pas * 0.4;
    } else {
      poserDans(w.o, USINE, P.x, P.z, P.ry); jambes[0].rotation.x = jambes[1].rotation.x = 0; caisse.visible = false;
      const a = P.type === 'presse' ? Math.sin(w.t * 2) * 0.5 - 1.0 : Math.sin(w.t * 5 + k) * 0.45 - 0.9;   // monteurs : ils assemblent ; l'opérateur pousse le levier
      bras[0].rotation.x = travaille ? a : 0; bras[1].rotation.x = travaille ? (P.type === 'presse' ? a : Math.sin(w.t * 5 + k + 1.7) * 0.45 - 0.9) : 0;
    }
  });
  CAISSES_3D.forEach((c, k) => { c.visible = pres && k < Math.ceil(S.stock.brosses / (cibleStock('brosses') / 30)); });
  // les brosses sur les tapis : il en part une à la presse tant que la ligne tourne
  if (pres) {
    tTapis += dt; const lignes = [S.ouvriers > 0, S.ville]; if (travaille && tTapis > 0.6) { tTapis = 0; lignes.forEach((a, l) => { if (a && SUR_TAPIS.length < 80) SUR_TAPIS.push({ l, x: -10.8 }); }); }
    let i = 0; for (let j = SUR_TAPIS.length - 1; j >= 0; j--) { const b = SUR_TAPIS[j]; if (travaille) b.x += dt * 0.9; if (b.x > 9.4) { SUR_TAPIS.splice(j, 1); continue; } }
    for (const b of SUR_TAPIS) { _ub.copy(monde(USINE, b.x, 0.95, b.l ? 3.5 : -3.5)); _m.compose(_ub, USINE.quaternion, _s.set(1, 1, 1)); brossesTapis.setMatrixAt(i++, _m); }
    brossesTapis.count = i; brossesTapis.instanceMatrix.needsUpdate = true;
  } else brossesTapis.count = 0;
  tFumee += dt; if (travaille && pres && tFumee > 0.5) { tFumee = 0; bouffee(monde(USINE, UW / 2 - 2.5, UH + 6.3, -UD / 2 + 2.5), 6, 0xbdbab3); }
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
const BORNE_USINE = borneDans(USINE, -5, UD / 2 + 2.2, 'USINE'), BORNE_DESH = borneDans(USINE, 5, UD / 2 + 2.2, 'DÉSHERBEURS');
const parMin = (x) => Math.round(x * 60);
function dessinerUsine() {
  const e = BORNE_USINE.e, g = e.g; fond(e); g.textAlign = 'left'; const L = (t, y, c = '#edeae4', f = 19) => { g.fillStyle = c; g.font = `800 ${f}px system-ui`; g.fillText(t, 16, y); };
  L(`OUVRIERS ${S.ouvriers} / ${MAX_OUVRIERS}${S.ville ? ` + ${POPULATION} habitants` : ''}`, 26, '#c9c3b6', 20);
  L(`Brosses ${Math.floor(S.stock.brosses)} / ${cibleStock('brosses')}`, 62); L(`Pièces ${Math.floor(S.stock.pieces)} / ${cibleStock('pieces')}`, 90); L(`${PROD.parMin} fabriquées par minute`, 118, '#4fd6e3', 17);
  L(`Salaires −${fmtCr(parMin(CHARGES.salaires))} cr/min`, 152, '#f4b41a', 17); L(`Électricité −${fmtCr(parMin(CHARGES.elec))} cr/min`, 178, '#f4b41a', 17);
  if (CHARGES.impaye) L('IMPAYÉ : ouvriers à l’arrêt', 208, '#e0452f', 18);
  L(S.ouvriers < MAX_OUVRIERS ? `● Embaucher ${fmtCr(EMBAUCHE)} cr   ○ Renvoyer` : '○ Renvoyer', 238, S.credits >= EMBAUCHE ? '#f08a24' : '#e0452f', 16); e.maj();
}
INTER.push({ p: BORNE_USINE.p, r: 2.2, get etiquette() { return S.ouvriers < MAX_OUVRIERS ? `Embaucher (${fmtCr(EMBAUCHE)} cr, ${parMin(SALAIRE)} cr/min)` : null; },
  agir() { if (S.ouvriers >= MAX_OUVRIERS || S.credits < EMBAUCHE) { sons.refus(); return; } S.credits -= EMBAUCHE; S.ouvriers++; sons.achat(); dessinerUsine(); sauverBientot(); } });
INTER.push({ p: BORNE_USINE.p2, r: 1.6, get etiquette() { return S.ouvriers ? 'Renvoyer un ouvrier' : null; }, agir() { if (!S.ouvriers) { sons.refus(); return; } S.ouvriers--; sons.arrache(); dessinerUsine(); sauverBientot(); } });

// --- Les charges : salaires, électricité du réseau extérieur, surplus solaire vendu. ---
function kwDemande() { return (TOIT.besoin || 0) + (effectifs() && !CHARGES.impaye ? 6 + 1.0 * effectifs() : 0) + 0.3 * (ROBOTS.length + DESHERBEURS.length); }
MAJ.push((dt) => {
  if (CHARGES.off) return;
  const demande = kwDemande(), prod = TOIT.prod || 0;
  CHARGES.kwAchat = CHARGES.impaye ? 0 : Math.max(0, demande - prod);   // impayé : plus de réseau, plus de salaires qui courent
  CHARGES.salaires = CHARGES.impaye ? 0 : S.ouvriers * SALAIRE + (S.ville ? POPULATION * SALAIRE_VILLE : 0);   // les habitants, logés, touchent moitié moins
  CHARGES.elec = CHARGES.kwAchat * PRIX_KW; CHARGES.vente = Math.max(0, prod - demande) * VENTE_KW;
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
const HERBES = { off: false, ens: new Set(), slots: new Map(), libres: [], t: 0, max: 0 }, MAX_HERBES = 3000;
const herbesMesh = new THREE.InstancedMesh(chardonGeo, chardons.material, MAX_HERBES * 2);
for (let j = MAX_HERBES * 2 - 1; j >= 0; j--) { herbesMesh.setMatrixAt(j, _m.makeScale(0, 0, 0)); HERBES.libres.push(j); }
herbesMesh.count = 0; herbesMesh.frustumCulled = false; herbesMesh.castShadow = true; scene.add(herbesMesh);   // on ne dessine que jusqu'au dernier emplacement servi
function poserHerbe(k) {
  if (HERBES.slots.has(k) || slotsChardon.has(k) || HERBES.libres.length < 2) return;
  const R = mulberry(k * 17 + 3), l = [], { est, nord } = repere(T.pos[k]);
  for (let c = 0; c < 2; c++) { const a = R() * 6.28, d = R() * 0.6, sc = 0.9 + R() * 0.5, j = HERBES.libres.pop(); surSol(_p.copy(T.pos[k]).addScaledVector(est, Math.cos(a) * d).addScaledVector(nord, Math.sin(a) * d), 0, _p); herbesMesh.setMatrixAt(j, _m.compose(_p, qHaut(T.dir[k], _q), _s.set(sc, sc, sc))); l.push(j); HERBES.max = Math.max(HERBES.max, j + 1); }
  herbesMesh.count = HERBES.max; HERBES.slots.set(k, l); herbesMesh.instanceMatrix.needsUpdate = true;
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
const PORTE_USINE = () => surSol(monde(USINE, 0, 0, UD / 2 + 1.2));
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
  const n = produire(s / 3, 1), du = Math.round((S.ouvriers * SALAIRE + (S.ville ? POPULATION * SALAIRE_VILLE : 0) + Math.max(0, (effectifs() ? 6 + effectifs() : 0) + 0.3 * (S.robots + S.desherbeurs) - kwToit() * 0.5) * PRIX_KW) * s / 3);
  const pris = Math.min(S.credits, du); S.credits -= pris; if (du > pris) { CHARGES.du += du - pris; CHARGES.impaye = true; }
  if (n || du) { const a = document.getElementById('annonce'); montrerAnnonce(`${a.hidden ? '' : a.textContent + ' '}L'usine a fabriqué ${n} pièces ; charges payées : ${fmtCr(pris)} cr.`); }
}
if (DEMARRAGE.repris) chargesAbsence(DEMARRAGE.date);
let tBornesU = 0;
function dessinerTableau() {   // le grand écran du mur du fond
  const e = USINE.userData.ecran, g = e.g; fond(e); g.textAlign = 'left';
  g.fillStyle = '#edeae4'; g.font = '800 46px system-ui'; g.fillText('PRODUCTION', 40, 56); g.fillStyle = '#f08a24'; g.fillRect(40, 84, 944, 5);
  const ligne = (t, x, y, c = '#edeae4', f = 34) => { g.fillStyle = c; g.font = `800 ${f}px system-ui`; g.fillText(t, x, y); };
  ligne(`Ligne A : ${S.ouvriers} ouvrier${S.ouvriers > 1 ? 's' : ''}`, 40, 150, S.ouvriers ? '#4fd6e3' : '#6c7076'); ligne(`Ligne B : ${S.ville ? `${POPULATION} habitants` : 'à l’arrêt (pas de ville)'}`, 40, 200, S.ville ? '#4fd6e3' : '#6c7076');
  ligne(`${PROD.parMin} pièces par minute`, 40, 270, '#f4b41a', 40);
  ligne(`Brosses ${Math.floor(S.stock.brosses)} / ${cibleStock('brosses')}`, 560, 150); ligne(`Pièces ${Math.floor(S.stock.pieces)} / ${cibleStock('pieces')}`, 560, 200);
  ligne(CHARGES.impaye ? 'IMPAYÉ : la ligne s’arrête' : `Charges −${fmtCr(parMin(CHARGES.salaires + CHARGES.elec))} cr/min`, 560, 270, CHARGES.impaye ? '#e0452f' : '#c9c3b6', 30); e.maj();
}
MAJ.push((dt) => { tBornesU += dt; if (tBornesU < 0.5 || joueur.p.distanceTo(USINE.position) > 45) return; tBornesU = 0; dessinerUsine(); dessinerDesh(); dessinerTableau(); });
dessinerUsine(); dessinerDesh();
