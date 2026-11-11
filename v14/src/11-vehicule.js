
// =====================================================================
// 15. Le concessionnaire et les véhicules. Un bâtiment à part : hangar large et bas, façade entièrement vitrée,
//     structure blanche à poteaux charbon, grande enseigne orange sur le toit, porte sectionnelle sur le côté de la
//     façade, parvis en béton aux places marquées. Dedans : les véhicules tournent sur des plateformes blanches à
//     liseré cyan, chacun avec sa borne (nom, prix, trois barres, bouton d'achat, quatre boutons d'amélioration) ;
//     pont élévateur, pneus empilés, établi, distributeur de boissons.
//     Cinq véhicules : chariot pousseur, quad de service, pollinisatrice, remorque-citerne, transporteur lourd.
//     Quatre améliorations à trois niveaux, visibles sur le véhicule : moteur, châssis, pneus, phares.
//     À l'achat, la porte sectionnelle s'ouvre, le véhicule sort se garer sur le parvis, on est au volant.
// =====================================================================
const VEHICULES = {
  chariot: { nom: 'Chariot pousseur', prix: 900, cap: 150, vmax: 3.2, virage: 1.4, pente: 0.8, largeur: 1, contact: 0.6, siege: [-1.25, 0], hw: 0.55, hd: 0.9, sondes: [[0.5, 0.6], [-0.3, 0.6]], tete: 0.95, place: -4.4 },
  quad: { nom: 'Quad de service', prix: 4000, cap: 600, vmax: 11, virage: 1.1, pente: 2.4, largeur: 0, siege: [0.1, 0.45], hw: 0.8, hd: 1.3, sondes: [[0.7, 0.85], [-0.6, 0.85]], place: -2.6 },
  pollinisatrice: { nom: 'Pollinisatrice', prix: 18000, cap: 1200, vmax: 7, virage: 0.8, pente: 0.9, largeur: 3, contact: 0.25, siege: [0.85, 0.75], hw: 1.7, hd: 3.1, sondes: [[2.6, 1.6], [0.3, 1.35], [-1.8, 1.35]], tete: 3.15, place: 3.6 },
  citerne: { nom: 'Remorque-citerne', prix: 35000, cap: 0, vmax: 0, remorque: true, hw: 1.0, hd: 1.9, sondes: [], place: 6.6 },
  transporteur: { nom: 'Transporteur lourd', prix: 90000, cap: 4000, vmax: 6, virage: 0.9, pente: 1.2, auto: true, hw: 1.35, hd: 3.4, sondes: [[2.4, 1.5], [0, 1.4], [-2.2, 1.4]], place: 9.3 },
};
const ORDRE_VEHICULES = Object.keys(VEHICULES);
const AMELIO_VEH = { moteur: 'MOTEUR', chassis: 'CHÂSSIS', pneus: 'PNEUS', phares: 'PHARES' }, CLES_AMELIO = Object.keys(AMELIO_VEH);
const MULT_VEH = { moteur: [1, 1.15, 1.3, 1.5], chassis: [1, 1.3, 1.7, 2.2], pneus: [1, 1.2, 1.4, 1.6], phares: [0.4, 0.6, 0.8, 1] };   // vitesse, capacité, tenue de route, travail de nuit
const prixAmelioVeh = (cle, niv) => niv < 3 ? Math.round(VEHICULES[cle].prix * [0.15, 0.3, 0.6][niv]) : 0;
const M_PNEU = new THREE.MeshStandardMaterial({ color: 0x1c1f22, roughness: 0.9 });
// --- Les modèles. Avant du véhicule vers -z. Les améliorations se voient : pots d'échappement chromés (moteur),
//     coffres latéraux (châssis), jantes orange et pneus plus larges (pneus), rampe de phares (phares). ---
// --- Les pièces des véhicules. Proportions trapues, arêtes arrondies, beaucoup de détails lisibles : crampons, jantes
//     à rayons, cabines vitrées, hublots où l'on voit monter le pollen, gyrophare, feux. ---
const M_CABINE = new THREE.MeshStandardMaterial({ color: 0x8fbfd0, roughness: 0.04, metalness: 0.25, transparent: true, opacity: 0.42, depthWrite: false });
const M_GOMME = new THREE.MeshStandardMaterial({ color: 0x26292d, roughness: 0.93 }); M_GOMME.userData.sansReflet = true;
const M_POLLEN_NIV = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xf5c518, emissiveIntensity: 1.25 });
const M_GYRO = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: ORANGE, emissiveIntensity: 1.6, transparent: true, opacity: 0.92 });
const M_FEU_AR = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff5a3c, emissiveIntensity: 1.1 });
const GEO_CRAMPON = new RoundedBoxGeometry(1, 1, 1, 1, 0.12); GEO_CRAMPON.type = 'RoundedBoxGeometry';   // un seul segment d'arrondi : 44 triangles
function roue(g, x, y, z, r, l, niv, jante = M.blanc) {   // pneu à épaulements arrondis, crampons en chevrons, jante à cinq rayons
  const w = new THREE.Group(); w.position.set(x, y, z); w.rotation.order = 'YXZ'; w.userData.avant = z < 0; g.add(w);
  const L = l * (1 + niv.pneus * 0.12), s = Math.sign(x) || 1;
  const pts = [[r * 0.55, -L / 2], [r * 0.9, -L / 2], [r, -L / 2 + L * 0.18], [r, L / 2 - L * 0.18], [r * 0.9, L / 2], [r * 0.55, L / 2]].map(([a, b]) => new THREE.Vector2(a, b));
  const pneu = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), M_GOMME); pneu.geometry.rotateZ(Math.PI / 2); w.add(pneu);
  const n = Math.max(12, Math.round(2 * Math.PI * r / 0.11));
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, c = placer(w, new THREE.Mesh(GEO_CRAMPON, M_GOMME), (k % 2 ? 1 : -1) * L * 0.2, Math.cos(a) * (r + 0.012), Math.sin(a) * (r + 0.012)); c.scale.set(L * 0.42, 0.045, 0.07); c.rotation.x = -a; c.rotation.y = (k % 2 ? 1 : -1) * 0.35; }   // crampons, en géométrie légère
  placer(w, cylindre(r * 0.56, r * 0.56, L * 0.7, jante, 20), s * 0.02, 0, 0).geometry.rotateZ(Math.PI / 2);                        // la jante
  placer(w, cylindre(r * 0.46, r * 0.5, 0.03, M.graphite, 20), s * (L * 0.35 + 0.012), 0, 0).geometry.rotateZ(Math.PI / 2);
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, b = placer(w, boite(0.025, r * 0.36, 0.05, jante, 0.01), s * (L * 0.35 + 0.03), Math.cos(a) * r * 0.24, Math.sin(a) * r * 0.24); b.rotation.x = -a; }
  placer(w, cylindre(r * 0.14, r * 0.16, 0.06, niv.pneus ? M.lisere : M.seve, 12), s * (L * 0.35 + 0.05), 0, 0).geometry.rotateZ(Math.PI / 2);   // moyeu
  fusionner(w); g.userData.roues.push(w); return w;
}
function hublot(c, x, y, z, w, h, ry = 0) {   // fenêtre où l'on voit le pollen monter avec la charge
  const g = new THREE.Group(); placer(c, g, x, y, z, ry);
  placer(g, boite(w + 0.08, h + 0.08, 0.05, M.graphite, 0.02), 0, 0, 0); placer(g, boite(w, h, 0.03, M_CABINE, 0.01), 0, 0, 0.03);
  const niv = boite(w * 0.92, h * 0.94, 0.02, M_POLLEN_NIV, 0.008); niv.geometry.translate(0, h * 0.47, 0); niv.position.set(0, -h * 0.47, 0.018); niv.userData.garder = true; g.add(niv);
  c.userData.niveaux = (c.userData.niveaux || []).concat(niv); return g;
}
function phare(c, x, y, z, r = 0.09) { placer(c, cylindre(r + 0.02, r + 0.03, 0.06, M.graphite, 14), x, y, z).rotation.x = Math.PI / 2; placer(c, cylindre(r, r, 0.03, M_LUM, 14), x, y, z - 0.03).rotation.x = Math.PI / 2; }
function feuxArriere(c, hw, y, z) { for (const s of [-1, 1]) { placer(c, boite(0.2, 0.09, 0.04, M.graphite, 0.015), s * (hw - 0.18), y, z); placer(c, boite(0.16, 0.06, 0.02, M_FEU_AR, 0.01), s * (hw - 0.18), y, z + 0.025); } }
function gyrophare(g, c, y, z) {
  placer(c, cylindre(0.12, 0.14, 0.07, M.graphite, 16), 0, y, z);
  const gy = new THREE.Group(); gy.position.set(0, y + 0.11, z); gy.userData.garder = true; c.add(gy); g.userData.gyro = gy;
  placer(gy, cylindre(0.1, 0.11, 0.15, M_GYRO, 16), 0, 0, 0); placer(gy, boite(0.17, 0.09, 0.04, M_LUM, 0.01), 0, 0, 0.065);
}
function cabine(c, w, h, d, x, y, z) {   // montants charbon, vitres teintées, toit blanc à bandeau orange, rétroviseurs
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) placer(c, boite(0.09, h, 0.09, M.graphite, 0.03), x + a * (w / 2 - 0.05), y + h / 2, z + b * (d / 2 - 0.05));
  placer(c, boite(w - 0.12, h - 0.06, d - 0.12, M_CABINE, 0.03), x, y + h / 2, z);
  placer(c, boite(w + 0.14, 0.12, d + 0.18, M.blanc, 0.05), x, y + h + 0.06, z); placer(c, boite(w + 0.16, 0.035, d + 0.2, M.lisere, 0.012), x, y + h + 0.005, z);
  placer(c, boite(w - 0.3, 0.06, 0.05, M.graphite, 0.015), x, y + h - 0.12, z - d / 2 - 0.02);   // pare-soleil
  for (const s of [-1, 1]) { placer(c, tube(0.012, 0.012, 0.25, M.graphite), x + s * (w / 2 + 0.1), y + h * 0.7, z - d / 2 + 0.05).rotation.z = s * 1.2; placer(c, boite(0.05, 0.14, 0.1, M.graphite, 0.02), x + s * (w / 2 + 0.22), y + h * 0.75, z - d / 2 + 0.05); }   // rétroviseurs
}
function siege(c, x, y, z) { placer(c, boite(0.46, 0.1, 0.44, M.graphite, 0.04), x, y, z); placer(c, boite(0.46, 0.5, 0.1, M.graphite, 0.04), x, y + 0.28, z + 0.2); placer(c, boite(0.48, 0.03, 0.46, M.lisere, 0.01), x, y + 0.055, z); }
// Les améliorations se voient, chacune fixée à un endroit qui la porte : pots chromés (moteur), coffres boulonnés au
// châssis (châssis), rampe de phares posée sur le toit ou la face avant (phares). ou = { pot: [x, y, z] ou null,
// cof: [x, y, z0, dz, l], av: [y, z] }.
function equiper(c, niv, ou) {
  if (ou.pot) for (let k = 0; k < niv.moteur; k++) { const [x, y, z] = ou.pot; placer(c, tube(0.045, 0.05, 0.6, M_CHROME), x - k * 0.14, y + 0.3, z); placer(c, cylindre(0.055, 0.055, 0.04, M.graphite, 10), x - k * 0.14, y + 0.62, z); placer(c, boite(0.1, 0.05, 0.1, M.graphite, 0.015), x - k * 0.14, y + 0.025, z); }
  const [cx, cy, z0, dz, l] = ou.cof;
  for (let k = 0; k < niv.chassis; k++) for (const s of [-1, 1]) { placer(c, boite(0.2, 0.3, l, M.panneau, 0.04), s * cx, cy, z0 + k * dz); placer(c, boite(0.22, 0.035, l + 0.02, M.lisere, 0.012), s * cx, cy + 0.12, z0 + k * dz); placer(c, boite(0.08, 0.06, l * 0.6, M.graphite, 0.015), s * (cx - 0.12), cy, z0 + k * dz); }
  if (niv.phares) { const [y, z] = ou.av; placer(c, boite(0.3 + niv.phares * 0.35, 0.05, 0.05, M.graphite, 0.015), 0, y + 0.14, z + 0.04); for (const s of [-1, 1]) placer(c, boite(0.04, 0.14, 0.04, M.graphite, 0.01), s * (0.1 + niv.phares * 0.15), y + 0.07, z + 0.04); for (let k = 0; k < niv.phares * 2; k++) phare(c, (k - (niv.phares * 2 - 1) / 2) * 0.17, y + 0.14, z, 0.06); }
}
function essieu(c, y, z, l, r = 0.045) { placer(c, tube(r, r, l, M.graphite), 0, y, z).rotation.z = Math.PI / 2; }   // l'essieu qui relie les roues au châssis
function fabriquerVehicule(cle, niv = { moteur: 0, chassis: 0, pneus: 0, phares: 0 }) {
  const g = new THREE.Group(), c = new THREE.Group(), D = VEHICULES[cle]; g.add(c); g.userData.caisse = c; g.userData.roues = [];
  if (cle === 'chariot') {   // un chariot de jardinier : grand réservoir arrondi sur berceaux, rouleau-brosse à l'avant, guidon
    placer(c, boite(0.82, 0.08, 1.05, M.graphite, 0.03), 0, 0.3, 0.05);
    for (const z of [-0.1, 0.3]) placer(c, boite(0.5, 0.1, 0.1, M.graphite, 0.02), 0, 0.37, z);   // berceaux
    placer(c, new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.36, 8, 18).rotateZ(Math.PI / 2), M.blanc), 0, 0.7, 0.1);   // la cuve, posée sur ses berceaux
    for (const z of [-0.12, 0.32]) placer(c, new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.025, 8, 24), M.lisere), 0, 0.7, z).rotation.y = Math.PI / 2;
    placer(c, cylindre(0.12, 0.14, 0.08, M.graphite, 14), 0, 1.04, 0.1); hublot(c, 0, 0.7, -0.25, 0.26, 0.24);
    for (const s of [-1, 1]) { placer(c, tube(0.022, 0.022, 0.95, M.graphite), s * 0.3, 0.88, 0.75).rotation.x = 0.65; placer(c, boite(0.08, 0.1, 0.12, M.graphite, 0.02), s * 0.3, 0.4, 0.5); }   // bras du guidon, partis du plateau
    placer(c, tube(0.03, 0.03, 0.72, M_CHROME), 0, 1.26, 1.04).rotation.z = Math.PI / 2; for (const s of [-1, 1]) placer(c, tube(0.038, 0.038, 0.16, M.lisere), s * 0.27, 1.26, 1.04).rotation.z = Math.PI / 2;   // guidon, poignées
    placer(c, boite(1.3, 0.24, 0.32, M.panneau, 0.06), 0, 0.42, -0.86); placer(c, boite(1.32, 0.035, 0.34, M.lisere, 0.012), 0, 0.53, -0.86);   // carter de la brosse
    for (const s of [-1, 1]) { placer(c, boite(0.05, 0.36, 0.42, M.graphite, 0.02), s * 0.66, 0.28, -0.9); placer(c, boite(0.08, 0.06, 0.36, M.graphite, 0.02), s * 0.32, 0.32, -0.6); }   // flasques, et les bras qui tiennent le carter au plateau
    const r = placer(c, cylindre(0.15, 0.15, 1.18, M_POILS, 16), 0, 0.17, -0.92); r.geometry.rotateZ(Math.PI / 2); g.userData.rouleau = r; r.userData.garder = true;
    placer(c, boite(0.9, 0.03, 0.03, M.seve, 0.01), 0, 0.31, -0.71);
    essieu(c, 0.3, 0.42, 1.0, 0.03); for (const s of [-1, 1]) placer(c, boite(0.06, 0.12, 0.06, M.graphite, 0.015), s * 0.3, 0.2, -0.38);   // essieu arrière, fourches des roulettes
    equiper(c, niv, { pot: [0.14, 0.34, 0.6], cof: [0.47, 0.42, 0.05, -0.25, 0.22], av: [0.42, -1.03] });
    for (const s of [-1, 1]) { roue(g, s * 0.5, 0.3, 0.42, 0.3, 0.14, niv); roue(g, s * 0.36, 0.14, -0.38, 0.14, 0.08, niv, M.graphite); }
  } else if (cle === 'quad') {   // quad de service : carrosserie qui porte les garde-boue, selle sur son socle, guidon sur sa colonne
    placer(c, boite(0.62, 0.22, 2.0, M.graphite, 0.06), 0, 0.55, 0);
    for (const z of [-0.82, 0.82]) { placer(c, boite(0.92, 0.3, z < 0 ? 0.8 : 1.0, M.blanc, 0.06), 0, 0.8, z < 0 ? z : 0.82); essieu(c, 0.42, z, 1.3); for (const s of [-1, 1]) { placer(c, boite(0.4, 0.05, 0.06, M.graphite, 0.015), s * 0.35, 0.5, z - 0.12).rotation.z = s * 0.3; placer(c, boite(0.4, 0.05, 0.06, M.graphite, 0.015), s * 0.35, 0.5, z + 0.12).rotation.z = s * 0.3; } }   // carrosserie, essieux, triangles
    for (const z of [-0.82, 0.82]) for (const s of [-1, 1]) { const f = placer(c, boite(0.52, 0.09, 0.82, M.blanc, 0.04), s * 0.7, 0.95, z); f.rotation.z = -s * 0.12; placer(c, boite(0.54, 0.03, 0.84, M.lisere, 0.012), s * 0.7, 0.9, z).rotation.z = -s * 0.12; }   // garde-boue, prolongés depuis la carrosserie
    placer(c, boite(0.62, 0.28, 0.6, M.blanc, 0.1), 0, 1.0, -0.55); placer(c, boite(0.64, 0.04, 0.62, M.lisere, 0.015), 0, 0.88, -0.55);   // réservoir avant
    placer(c, boite(0.48, 0.3, 0.9, M.graphite, 0.05), 0, 0.78, 0.25);   // socle de la selle
    placer(c, boite(0.42, 0.14, 0.95, M.graphite, 0.07), 0, 0.98, 0.25); for (let k = 0; k < 3; k++) placer(c, boite(0.44, 0.015, 0.02, M.lisere, 0.005), 0, 1.05, -0.05 + k * 0.3);   // selle surpiquée
    placer(c, tube(0.03, 0.03, 0.55, M.graphite), 0, 1.25, -0.82).rotation.x = -0.45; placer(c, tube(0.025, 0.025, 0.9, M_CHROME), 0, 1.5, -0.94).rotation.z = Math.PI / 2;   // colonne de direction, guidon à son sommet
    for (const s of [-1, 1]) { placer(c, tube(0.034, 0.034, 0.14, M.graphite), s * 0.4, 1.5, -0.94).rotation.z = Math.PI / 2; placer(c, tube(0.01, 0.01, 0.2, M.graphite), s * 0.3, 1.6, -0.94); placer(c, boite(0.09, 0.06, 0.02, M_CABINE, 0.01), s * 0.3, 1.7, -0.94); }
    placer(c, boite(0.4, 0.2, 0.18, M.blanc, 0.06), 0, 1.3, -0.95); phare(c, -0.1, 1.3, -1.04, 0.06); phare(c, 0.1, 1.3, -1.04, 0.06);   // bloc optique sur la colonne
    placer(c, tube(0.035, 0.035, 1.0, M.graphite), 0, 0.72, -1.3).rotation.z = Math.PI / 2; for (const s of [-1, 1]) placer(c, boite(0.07, 0.07, 0.32, M.graphite, 0.02), s * 0.25, 0.68, -1.15);   // pare-chocs et ses pattes
    placer(c, boite(1.0, 0.04, 0.7, M.graphite, 0.015), 0, 0.97, 1.0);   // plateau du porte-bagages, sur la carrosserie
    for (const s of [-1, 1]) { placer(c, tube(0.025, 0.025, 0.7, M.graphite), s * 0.48, 1.12, 1.0).rotation.x = Math.PI / 2; for (const z of [0.7, 1.3]) placer(c, tube(0.02, 0.02, 0.15, M.graphite), s * 0.48, 1.05, z); }
    placer(c, boite(0.9, 0.42, 0.6, M.panneau, 0.07), 0, 1.2, 1.0); placer(c, boite(0.92, 0.04, 0.62, M.lisere, 0.015), 0, 1.4, 1.0); hublot(c, 0.455, 1.26, 1.0, 0.4, 0.22, Math.PI / 2);   // coffre à pollen, hublot sur le flanc
    feuxArriere(c, 0.55, 0.86, 1.34); placer(c, tube(0.04, 0.045, 0.45, M_CHROME), 0.32, 0.62, 1.15).rotation.x = Math.PI / 2;
    equiper(c, niv, { pot: [0.36, 0.95, 1.36], cof: [0.36, 0.78, -0.15, 0.3, 0.26], av: [1.3, -1.05] });
    for (const z of [-0.82, 0.82]) for (const s of [-1, 1]) roue(g, s * 0.72, 0.42, z, 0.42, 0.34, niv);
  } else if (cle === 'pollinisatrice') {   // une moissonneuse à l'envers : cabine haute, trémie à pollen, barre de coupe avec rabatteur
    placer(c, boite(1.7, 0.4, 4.6, M.graphite, 0.08), 0, 0.85, 0.2);
    placer(c, boite(2.0, 0.9, 1.8, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.12), 0, 1.45, -0.95);   // le corps sous la cabine
    placer(c, boite(2.02, 0.05, 1.82, M.lisere, 0.02), 0, 1.0, -0.95);
    cabine(c, 1.5, 1.15, 1.35, 0, 1.92, -1.05);
    placer(c, boite(1.2, 0.16, 0.36, M.graphite, 0.04), 0, 2.25, -1.48); siege(c, 0, 2.0, -0.95);
    const e = placer(c, new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.18), ecran('0 kg')), 0.3, 2.42, -1.6); e.rotation.x = -0.5; e.userData.garder = true; g.userData.ecran = e.material;
    for (const z of [-0.78, -0.42]) placer(c, boite(0.04, 0.9, 0.04, M.graphite, 0.01), -1.06, 1.5, z); for (let k = 0; k < 4; k++) placer(c, boite(0.06, 0.025, 0.36, M.graphite, 0.01), -1.06, 1.12 + k * 0.24, -0.6);   // échelle d'accès
    placer(c, boite(2.1, 1.5, 2.0, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.18), 0, 1.8, 1.3);   // la trémie, posée sur le châssis
    for (const z of [0.6, 1.3, 2.0]) placer(c, boite(2.14, 1.52, 0.06, M.blanc, 0.03), 0, 1.81, z);
    placer(c, boite(2.12, 0.05, 2.02, M.lisere, 0.02), 0, 2.57, 1.3); for (const s of [-1, 1]) hublot(c, s * 1.065, 1.85, 1.3, 1.0, 0.7, s * Math.PI / 2);
    placer(c, tube(0.09, 0.11, 1.4, M.graphite), 0.75, 2.9, 0.45); placer(c, cylindre(0.12, 0.12, 0.06, M_CHROME, 12), 0.75, 3.6, 0.45);   // cheminée
    placer(c, tube(0.12, 0.12, 1.8, M.panneau), -0.85, 2.55, -0.2).rotation.x = -0.9; placer(c, cylindre(0.14, 0.14, 0.08, M.lisere, 14), -0.85, 3.11, -0.905).rotation.x = -0.9;   // vis de vidange : sort de la trémie, monte vers l'avant
    // La barre de coupe : carter blanc, rouleau-brosse, rabatteur à cinq palettes qui tourne au-dessus, patins latéraux.
    placer(c, boite(3.4, 0.36, 0.7, M.panneau, 0.07), 0, 0.62, -3.15); placer(c, boite(3.42, 0.04, 0.72, M.lisere, 0.015), 0, 0.81, -3.15);
    for (const s of [-1, 1]) { placer(c, boite(0.08, 1.0, 0.9, M.blanc, 0.03), s * 1.72, 0.65, -3.25); placer(c, boite(0.12, 0.06, 0.95, M.graphite, 0.02), s * 1.72, 0.18, -3.25); placer(c, tube(0.05, 0.05, 1.1, M.graphite), s * 0.85, 0.9, -2.55).rotation.x = 1.2; }   // flasques, patins, bras de levage
    const r = placer(c, cylindre(0.22, 0.22, 3.2, M_POILS, 18), 0, 0.3, -3.3); r.geometry.rotateZ(Math.PI / 2); g.userData.rouleau = r; r.userData.garder = true;
    const rab = new THREE.Group(); rab.position.set(0, 1.25, -3.35); rab.userData.garder = true; c.add(rab); g.userData.rabatteur = rab;
    placer(rab, tube(0.04, 0.04, 3.3, M.graphite), 0, 0, 0).rotation.z = Math.PI / 2;
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; placer(rab, boite(3.1, 0.05, 0.12, k % 2 ? M.lisere : M.blanc, 0.02), 0, Math.cos(a) * 0.38, Math.sin(a) * 0.38).rotation.x = -a; for (const x of [-1.2, 0, 1.2]) placer(rab, boite(0.03, 0.38, 0.03, M.graphite, 0.008), x, Math.cos(a) * 0.19, Math.sin(a) * 0.19).rotation.x = -a; }   // palettes et leurs rayons
    for (const s of [-1, 1]) { placer(c, boite(0.06, 0.66, 0.06, M.graphite, 0.02), s * 1.6, 1.025, -3.125).rotation.x = -Math.PI / 4; placer(c, cylindre(0.07, 0.07, 0.06, M.lisere, 12), s * 1.6, 1.25, -3.35).rotation.z = Math.PI / 2; }   // les bras du rabatteur, du carter à son axe
    gyrophare(g, c, 3.23, -1.05); feuxArriere(c, 1.0, 1.25, 2.33);
    essieu(c, 0.72, 1.35, 2.0, 0.07); essieu(c, 0.46, -1.45, 1.9, 0.06);
    equiper(c, niv, { pot: [0.35, 2.55, 1.9], cof: [0.95, 0.85, 0.35, -0.45, 0.4], av: [2.45, -1.74] }); phare(c, -0.45, 2.85, -1.75); phare(c, 0.45, 2.85, -1.75);
    for (const s of [-1, 1]) { roue(g, s * 1.15, 0.72, 1.35, 0.72, 0.5, niv); roue(g, s * 1.05, 0.46, -1.45, 0.46, 0.36, niv); }
  } else if (cle === 'citerne') {   // la remorque-citerne : cuve cerclée sur berceaux, passerelle à rambarde, échelle arrière, garde-boue, timon
    placer(c, boite(1.4, 0.2, 3.3, M.graphite, 0.06), 0, 0.68, 0.1);
    for (const z of [-0.6, 0.1, 0.8]) placer(c, boite(1.0, 0.16, 0.16, M.graphite, 0.03), 0, 0.84, z);   // berceaux
    placer(c, new THREE.Mesh(new THREE.CapsuleGeometry(0.78, 1.9, 8, 24).rotateX(Math.PI / 2), M.blanc), 0, 1.6, 0.1);
    for (const z of [-0.85, -0.3, 0.3, 0.85]) placer(c, new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.04, 8, 30), Math.abs(z) > 0.5 ? M.lisere : M.graphite), 0, 1.6, z + 0.1);
    placer(c, boite(0.5, 0.04, 2.0, M.graphite, 0.015), 0, 2.4, 0.1); for (const s of [-1, 1]) { placer(c, tube(0.015, 0.015, 2.0, M.lisere), s * 0.24, 2.62, 0.1).rotation.x = Math.PI / 2; for (const z of [-0.85, -0.05, 0.75]) placer(c, tube(0.013, 0.013, 0.22, M.lisere), s * 0.24, 2.51, z + 0.15); }   // passerelle, rambarde et ses poteaux
    placer(c, cylindre(0.22, 0.24, 0.16, M.graphite, 16), 0, 2.48, -0.5); placer(c, cylindre(0.2, 0.2, 0.04, M.lisere, 16), 0, 2.58, -0.5);   // trou d'homme
    for (const s of [-1, 1]) placer(c, boite(0.04, 1.6, 0.04, M.graphite, 0.01), s * 0.2, 1.62, 1.95); for (let k = 0; k < 6; k++) placer(c, boite(0.44, 0.025, 0.04, M.graphite, 0.01), 0, 0.95 + k * 0.27, 1.95);   // échelle arrière
    for (const y of [1.0, 2.2]) placer(c, boite(0.44, 0.04, 0.2, M.graphite, 0.01), 0, y, 1.84);   // ses pattes, fixées à la cuve
    hublot(c, 0.79, 1.6, 0.1, 0.6, 0.45, Math.PI / 2);
    for (const s of [-1, 1]) { const f = placer(c, boite(0.4, 0.06, 1.4, M.blanc, 0.03), s * 0.85, 1.0, 0.9); placer(c, boite(0.42, 0.03, 1.42, M.lisere, 0.01), s * 0.85, 0.96, 0.9); placer(c, boite(0.06, 0.24, 1.2, M.graphite, 0.02), s * 0.68, 0.88, 0.9); f.castShadow = true; }   // garde-boue sur leurs flasques
    placer(c, boite(0.12, 0.12, 1.6, M.graphite, 0.04), 0, 0.62, -2.1); placer(c, new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), M_CHROME), 0, 0.62, -2.9);   // timon et anneau
    feuxArriere(c, 0.7, 0.68, 1.78);
    for (const z of [0.55, 1.35]) essieu(c, 0.42, z, 1.5, 0.05);
    equiper(c, niv, { pot: null, cof: [0.75, 0.62, -0.25, -0.45, 0.4], av: [0.7, -1.6] });
    for (const z of [0.55, 1.35]) for (const s of [-1, 1]) roue(g, s * 0.85, 0.42, z, 0.42, 0.32, niv);
  } else {   // le transporteur lourd : cabine avancée, calandre, caisse nervurée, trois essieux
    placer(c, boite(1.8, 0.35, 6.4, M.graphite, 0.08), 0, 0.85, 0.15);
    placer(c, boite(2.45, 1.3, 1.75, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.18), 0, 1.75, -2.45);
    placer(c, boite(2.1, 0.75, 0.06, M_CABINE, 0.03), 0, 2.12, -3.31); for (const s of [-1, 1]) placer(c, boite(0.06, 0.6, 0.9, M_CABINE, 0.02), s * 1.23, 2.15, -2.6);   // pare-brise, vitres
    placer(c, boite(2.5, 0.08, 1.8, M.lisere, 0.03), 0, 2.45, -2.45); placer(c, boite(2.2, 0.3, 1.2, M.blanc, 0.12), 0, 2.62, -2.3);   // déflecteur
    for (let k = 0; k < 6; k++) placer(c, boite(1.5, 0.045, 0.04, M.graphite, 0.012), 0, 1.15 + k * 0.08, -3.34);   // calandre
    placer(c, boite(2.5, 0.22, 0.35, M.graphite, 0.05), 0, 0.85, -3.2); phare(c, -0.95, 1.3, -3.35, 0.12); phare(c, 0.95, 1.3, -3.35, 0.12);   // pare-chocs contre le châssis
    for (const s of [-1, 1]) {
      placer(c, boite(0.22, 0.03, 0.03, M.graphite, 0.01), s * 1.32, 2.3, -3.1); placer(c, boite(0.06, 0.34, 0.16, M.graphite, 0.02), s * 1.44, 2.15, -3.1);   // rétroviseurs sur leur bras
      placer(c, boite(0.04, 0.6, 0.25, M.graphite, 0.01), s * 1.28, 0.8, -1.55); for (let k = 0; k < 2; k++) placer(c, boite(0.4, 0.04, 0.25, M.graphite, 0.01), s * 1.1, 0.62 + k * 0.28, -1.55);   // marchepieds sous la portière
    }
    placer(c, boite(2.5, 2.2, 4.5, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.1), 0, 2.15, 1.05);
    for (let k = 0; k < 9; k++) for (const s of [-1, 1]) placer(c, boite(0.05, 2.1, 0.08, M.blanc, 0.02), s * 1.27, 2.15, -1.05 + k * 0.52);   // nervures
    placer(c, boite(2.54, 0.1, 4.54, M.lisere, 0.03), 0, 3.2, 1.05); placer(c, boite(2.54, 0.06, 4.54, M.seve, 0.02), 0, 1.08, 1.05);
    for (const s of [-1, 1]) hublot(c, s * 1.29, 2.1, 1.0, 1.6, 0.5, s * Math.PI / 2);
    const e = placer(c, new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), ecran('0 kg')), 1.31, 1.55, 2.4, Math.PI / 2); e.userData.garder = true; g.userData.ecran = e.material; placer(c, bouton(), 1.29, 1.55, 2.95, Math.PI / 2).scale.setScalar(0.6);
    for (const s of [-1, 1]) { placer(c, boite(0.4, 0.3, 0.03, M.graphite, 0.01), s * 1.15, 0.5, 3.0); placer(c, boite(0.6, 0.05, 0.05, M.graphite, 0.015), s * 1.0, 0.67, 3.0); }   // bavettes et leur barre
    gyrophare(g, c, 2.8, -2.3); feuxArriere(c, 1.2, 1.15, 3.33);
    for (const z of [-2.3, 1.3, 2.25]) essieu(c, 0.52, z, 2.0, 0.07);
    equiper(c, niv, { pot: [0.8, 1.03, -1.4], cof: [1.05, 0.7, 0.4, -0.6, 0.45], av: [2.38, -3.2] });
    for (const z of [-2.3, 1.3, 2.25]) for (const s of [-1, 1]) roue(g, s * 1.2, 0.52, z, 0.52, 0.42, niv);
  }
  fusionner(c); return g;
}

// --- Le garage : la partie est du hall, devant le laboratoire et l'atelier. La porte sectionnelle est dans la façade
//     vitrée du hall ; dehors, le parvis de béton où chaque véhicule a sa place marquée. ---
const ZGAR = 3.4, Z_PLACE = 11.0, Z_ALLEE = 16.8;   // centre du garage dans le hall (z), places et allée du parvis
const CONCESSION = (() => {
  const W = 20, D = 10, F = 0.14, g = new THREE.Group(), zf = HALL_D / 2 - HALL_E / 2 - ZGAR, baie = [BAIE[0] - 10.4, BAIE[1] - 10.4];
  poserDans(g, HALL, 10.4, ZGAR);
  placer(g, boite(W - 1, 0.012, 0.07, M.lisere, 0.004), 0.5, F + 0.006, -D / 2 + 0.3);   // la limite du garage au sol
  for (let k = 0; k < 6; k++) placer(g, boite(0.5, 0.012, 0.16, M.lisere, 0.004), (baie[0] + baie[1]) / 2, F + 0.006, zf - 1.0 - k * 0.7);   // allée de sortie
  const lames = [0, 1, 2, 3, 4].map((k) => { const l = placer(g, boite(baie[1] - baie[0] - 0.3, 0.57, 0.08, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.02), (baie[0] + baie[1]) / 2, 0, zf); l.userData.garder = true; return l; });
  scene.add(g);
  const porteObs = boiteDe(g, (baie[1] - baie[0]) / 2, 0.2, {}, (baie[0] + baie[1]) / 2, zf); OBSTACLES.push(porteObs);
  // Le parvis, posé à part sur le sol de la planète (il est dehors) : dalle de béton, places marquées à l'orange.
  const pv = new THREE.Group(), zc = (zf + 0.15 + Z_ALLEE + 1.5) / 2, lp = Z_ALLEE + 1.5 - zf - 0.15;
  placer(pv, boite(W + 1, 0.3, lp, M_BETON, 0.03), 0, -0.1, 0);
  for (const cle of ORDRE_VEHICULES) { const V = VEHICULES[cle], x = V.place, w = V.hw + 0.25, l = V.hd + 0.3; for (const s of [-1, 1]) placer(pv, boite(0.1, 0.012, l * 2, M.lisere, 0.004), x + s * w, 0.056, Z_PLACE - zc); placer(pv, boite(w * 2, 0.012, 0.1, M.lisere, 0.004), x, 0.056, Z_PLACE - zc - l); }
  for (let k = 0; k < 9; k++) placer(pv, boite(0.9, 0.012, 0.12, M.blanc, 0.004), -7.5 + k * 2, 0.056, Z_ALLEE - zc);   // l'allée
  fusionner(pv); poserSur(pv, surSol(monde(g, 0, 0, zc)), g.userData.az); scene.add(pv);
  const S = { g, W, D, Ht: HALL_H, F, vantaux: [], PW: 0, dedans: false, ouverture: 0, lames, porteObs, porte: 0, zf, zone: true }; SALLES.push(S); g.userData.salle = S; VITRINE.salle = S;
  return g;
})();
// --- La flotte. ---
const FLOTTE = {};
const placeParvis = (cle) => monde(CONCESSION, VEHICULES[cle].place, 0, Z_PLACE);
for (const cle of ORDRE_VEHICULES) {
  const D = VEHICULES[cle], v = { cle, D, possede: false, p: surSol(placeParvis(cle)), f: CONCESSION.userData.az.clone(), v: 0, charge: 0, valeur: 0, niv: { moteur: 0, chassis: 0, pneus: 0, phares: 0 }, contact: new Map(), g: null, obs: null, auto: { etat: 'repos', t: 0, cible: null, bloque: 0 } };
  v.obs = boiteCollision(v.p, v.f, v.f, D.hw, D.hd, { inactif: true, vehicule: v }); OBSTACLES.push(v.obs); FLOTTE[cle] = v;
}
function refaireVehicule(v) {   // (re)construit le modèle : à l'achat et à chaque amélioration
  if (v.g) { scene.remove(v.g); scene.remove(v.ombre); }
  v.g = fabriquerVehicule(v.cle, v.niv); scene.add(v.g); v.ombre = ombreContact(v.g, 1, true); v.ombre.scale.set(v.D.hw + 0.2, 1, v.D.hd + 0.3); v.affiche = -1; poserVehicule(v);
}
function poserVehicule(v) {
  if (!v.g) return; tangent(v.p, v.f, v.f); poserSur(v.g, v.p, _lk.copy(v.f).negate());
  const av = sol(_d.copy(v.p).addScaledVector(v.f, 1.5).normalize()), ar = sol(_d.copy(v.p).addScaledVector(v.f, -1.5).normalize()); v.g.userData.caisse.rotation.x = -Math.atan2(av - ar, 3);
  v.obs.p.copy(v.p); v.obs.az.copy(v.f); v.obs.ax.crossVectors(_d.copy(v.p).normalize(), v.f); v.obs.inactif = !v.possede || joueur.enVehicule === v;
}
const capacite = (v) => v.D.cap * MULT_VEH.chassis[v.niv.chassis] * (FLOTTE.citerne.possede && FLOTTE.citerne.attelee === v ? 5 : 1);
const sondesDe = (v, p, f) => v.D.sondes.map(([a, r]) => [new V3().copy(p).addScaledVector(f, a), r]);
const cogne = (v, p, f) => sondesDe(v, p, f).some(([q, r]) => penetre(q, r, v.obs));
const enZone = (v, p, f) => sondesDe(v, p, f).some(([q, r]) => OBSTACLES.some((o) => o.machine && q.distanceTo(o.p) < o.r + r + ZONE_APPROCHE && ecartObstacle(o, q).d < r + ZONE_APPROCHE));
// La place de stationnement du collecteur : derrière lui. Garé dessus, le repère passe au vert et E vide les cuves.
const PARKING = (() => { const C = COLLECTEUR, L = 1.25 + ZONE_APPROCHE + 2.2, p = surSol(new V3().copy(C.position).addScaledVector(C.userData.az, -L)); return { p, ax: C.userData.az.clone(), az: C.userData.ax.clone() }; })();
const M_PARK = new THREE.MeshBasicMaterial({ color: ORANGE, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
cadreSol(PARKING.p, PARKING.ax, PARKING.az, 2.1, 3.9, M_PARK, 0.14); cadreSol(PARKING.p, PARKING.ax, PARKING.az, 1.2, 0.5, M_PARK, 0.1);
const bienGare = (v) => v.p.distanceTo(PARKING.p) < 2.2;
function avancer(v, dt, mz, mx) {   // un pas de conduite ; renvoie false si le véhicule a buté
  const D = v.D, up = _d2.copy(v.p).normalize().clone(), vmax = (enZone(v, v.p, v.f) ? 2.2 : D.vmax * MULT_VEH.moteur[v.niv.moteur]);
  const cible = mz * (mz > 0 ? vmax : Math.min(3, vmax));
  v.v = lerp(v.v, cible, 1 - Math.exp(-dt * (Math.abs(cible) > Math.abs(v.v) ? 1.2 : 2.5))); v.v = clamp(v.v, -vmax, vmax);
  const dyaw = -mx * D.virage * MULT_VEH.pneus[v.niv.pneus] * clamp(v.v / 3, -1, 1) * dt, nf = v.f.clone().applyAxisAngle(up, dyaw), np = surSol(new V3().copy(v.p).addScaledVector(nf, v.v * dt));
  const pente = Math.abs(sol(_d.copy(np).addScaledVector(nf, Math.sign(v.v) * 1.5).normalize()) - np.length());
  if (altitude(np) < NIVEAU_MER + 0.3 || pente > D.pente * (1 + v.niv.pneus * 0.15) || (cogne(v, np, nf) && !cogne(v, v.p, v.f))) {   // eau, pente trop raide ou obstacle : arrêt net
    if (Math.abs(v.v) > 0.6 && joueur.enVehicule === v) { secousse = Math.min(1, Math.abs(v.v) / 4); sons.choc(); }
    v.v = 0; return { ok: false, dyaw: 0 };
  }
  v.p.copy(np); v.f.copy(nf); return { ok: true, dyaw };
}
const nuit = () => 1 - JOUR.ici;
function travailler(v, dt) {   // la brosse pollinise ce qui passe dessous ; la nuit, il faut des phares
  const D = v.D; if (!D.largeur) return;
  const dr = _dr.crossVectors(v.f, _d2.copy(v.p).normalize()), vues = new Set(), rythme = lerp(1, MULT_VEH.phares[v.niv.phares], nuit()), n = D.largeur === 1 ? 0 : 2;
  for (let k = -n; k <= n; k++) {
    const i = tuileA(_vp.copy(v.p).addScaledVector(v.f, D.tete).addScaledVector(dr, k * 0.95)); if (i < 0 || !pollinisable(i) || vues.has(i)) continue; vues.add(i);
    const t = (v.contact.get(i) || 0) + dt * rythme; v.contact.set(i, t);
    if (t >= D.contact && v.charge + KG_TUILE <= capacite(v)) { const val = polliniser(i, 'vehicule'); if (val > 0) { v.charge += KG_TUILE; v.valeur += val; noter('pollen', KG_TUILE); sons.pop(); } }
  }
  for (const i of v.contact.keys()) if (!vues.has(i)) v.contact.delete(i);
}
// La sortie du hangar : la porte sectionnelle s'ouvre, le véhicule roule jusqu'à sa place du parvis.
const SORTIE = { v: null, t: 0, k: 0 };
const NPOUSS = 220, poussPos = new Float32Array(NPOUSS * 3), poussVel = new Float32Array(NPOUSS * 3), poussVie = new Float32Array(NPOUSS);
const poussGeo = new THREE.BufferGeometry(); poussGeo.setAttribute('position', new THREE.BufferAttribute(poussPos, 3));
const poussiereRoues = new THREE.Points(poussGeo, new THREE.PointsMaterial({ color: 0xcdbf9e, size: 0.16, transparent: true, opacity: 0.55, depthWrite: false })); poussiereRoues.frustumCulled = false; scene.add(poussiereRoues);
let poussI = 0;
function soulever(v, dt) {   // de la poussière soulevée derrière les roues : plus il va vite, plus il en sort
  const n = Math.min(4, Math.floor(Math.abs(v.v) * dt * 6 + Math.random())), up = _d2.copy(v.p).normalize().clone(), dr = new V3().crossVectors(v.f, up);
  for (let k = 0; k < n; k++) { const i = poussI++ % NPOUSS, s = Math.random() < 0.5 ? -1 : 1; _vp.copy(v.p).addScaledVector(v.f, -v.D.hd * 0.8).addScaledVector(dr, s * v.D.hw * 0.8).addScaledVector(up, 0.2); poussPos.set([_vp.x, _vp.y, _vp.z], i * 3); _vp.copy(up).multiplyScalar(0.6 + Math.random()).addScaledVector(v.f, -Math.sign(v.v) * (0.5 + Math.random())).addScaledVector(dr, (Math.random() - 0.5)); poussVel.set([_vp.x, _vp.y, _vp.z], i * 3); poussVie[i] = 0.9 + Math.random() * 0.6; }
}
MAJ.push((dt) => { const up = joueur.haut; for (let i = 0; i < NPOUSS; i++) { if (poussVie[i] <= 0) { poussPos[i * 3] = poussPos[i * 3 + 1] = poussPos[i * 3 + 2] = 0; continue; } poussVie[i] -= dt; for (let a = 0; a < 3; a++) { poussVel[i * 3 + a] -= up.getComponent(a) * dt * 0.8; poussPos[i * 3 + a] += poussVel[i * 3 + a] * dt; } } poussGeo.attributes.position.needsUpdate = true; });
// La vie du véhicule : roues avant qui braquent, caisse qui roule dans les virages et pique au freinage, petit
// rebond de suspension, gyrophare qui tourne, poussière derrière les roues.
function animerVehicule(v, dt, braquage) {
  if (!v.g) return; const c = v.g.userData.caisse, a0 = v.vAvant === undefined ? v.v : v.vAvant, acc = (v.v - a0) / Math.max(dt, 1e-3); v.vAvant = v.v;
  v.braque = lerp(v.braque || 0, braquage, 1 - Math.exp(-dt * 8));
  v.roulis = lerp(v.roulis || 0, -braquage * clamp(v.v / 6, -1, 1) * 0.07, 1 - Math.exp(-dt * 5));
  v.tangage = lerp(v.tangage || 0, clamp(-acc * 0.012, -0.06, 0.06), 1 - Math.exp(-dt * 5));
  c.rotation.x += v.tangage; c.rotation.z = v.roulis; c.position.y = Math.abs(v.v) > 0.3 ? Math.sin(gt * 13 + v.p.x) * 0.012 * clamp(Math.abs(v.v) / 4, 0, 1.5) : 0;
  for (const w of v.g.userData.roues) { w.rotation.x -= v.v * dt / 0.45; if (w.userData.avant) w.rotation.y = v.braque * 0.5; }
  if (v.g.userData.gyro) { const actif = Math.abs(v.v) > 0.4 || !!v.D.auto; v.g.userData.gyro.rotation.y += dt * (actif ? 9 : 0); }
  if (Math.abs(v.v) > 1.2) soulever(v, dt);
}
function versCible(v, cible, dt, vit = 1) {   // conduite automatique : droit vers la cible, en contournant ce qui gêne
  const vers = tangent(v.p, _vp.subVectors(cible, v.p), new V3()), up = _d2.copy(v.p).normalize().clone(); let choix = null;
  for (const a of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]) { const f = vers.clone().applyAxisAngle(up, a), q = surSol(new V3().copy(v.p).addScaledVector(f, 4.5)); if (altitude(q) > NIVEAU_MER + 0.4 && !penetre(q, 1.7, v.obs)) { choix = f; break; } }
  if (!choix) { v.v = 0; return false; }
  const cote = Math.sign(_dr.crossVectors(v.f, choix).dot(up)), ecart = v.f.angleTo(choix);
  const r = avancer(v, dt, ecart > 1.2 ? 0.25 : vit, clamp(-cote * ecart * 2.5, -1, 1) / Math.max(0.2, clamp(Math.abs(v.v) / 3, 0, 1)) * 0.9);
  return r.ok;
}
function acheterVehicule(cle) {
  const v = FLOTTE[cle]; if (v.possede || SORTIE.v) return false;
  if (S.credits < v.D.prix) { sons.refus(); return false; }
  S.credits -= v.D.prix; v.possede = true; sons.achat(); sauverBientot();
  v.p.copy(surSol(monde(CONCESSION, -7.5, 0, 1.2))); v.f.copy(CONCESSION.userData.az); refaireVehicule(v); v.obs.inactif = true; SORTIE.v = v; SORTIE.t = 0; SORTIE.k = 0; return true;
}
function monter(v) { if (v.D.auto || v.D.remorque) return; joueur.enVehicule = v; for (const t in S.sac) { const r = S.sac[t]; if (r.kg > 0 && v.charge + r.kg <= capacite(v)) { v.charge += r.kg; v.valeur += r.v; S.sac[t] = { kg: 0, v: 0 }; } } if (FLOTTE.citerne.possede && !v.D.remorque && v.cle !== 'chariot') FLOTTE.citerne.attelee = v; }
function descendre() {
  const v = joueur.enVehicule, dr = new V3().crossVectors(v.f, _d.copy(v.p).normalize()); joueur.enVehicule = null; v.v = 0; v.obs.inactif = false; poserVehicule(v);
  let p = new V3().copy(v.p).addScaledVector(dr, -(v.D.hw + 0.9)); if (penetre(p, 0.35, v.obs)) p = new V3().copy(v.p).addScaledVector(dr, v.D.hw + 0.9);
  surSol(repousser(p, 0.36).p, 0, joueur.p); joueur.v.set(0, 0, 0);
}
function viderCuves(v) { if (v.valeur <= 0) return false; const cr = encaisser(v.valeur); S.ventes++; if (joueur.enVehicule === v) sons.vente(); ecrireEcran(ECRAN_COLLECTEUR, `+${cr} cr`); sauverBientot(); v.charge = 0; v.valeur = 0; return true; }
function chargerVehicule(v) {   // prend ce qu'un quai ou un dépôt voisin a en stock
  let pris = false;
  for (const p of GRILLE.values()) { if (!PIECES[p.cle].stock || p.cle === 'silo' || p.pos.distanceTo(v.p) > 7) continue; while (p.stock.length && v.charge + 1 <= capacite(v)) { const c = p.stock.shift(); v.charge += 1; v.valeur += c.valeur; pris = true; } }
  return pris;
}
INTER_HORS.unshift(() => { const v = joueur.enVehicule; if (!v) return false; if (bienGare(v) && viderCuves(v)) return true; if (chargerVehicule(v)) { sons.achat(); return true; } descendre(); return true; });   // E au volant : vider, charger, ou descendre
for (const cle of ORDRE_VEHICULES) { const v = FLOTTE[cle]; if (!v.D.auto && !v.D.remorque) INTER.push({ get p() { return _lk.copy(v.p).addScaledVector(_d.copy(v.p).normalize(), 1); }, r: v.D.hd + 1.6, cache: () => !v.possede || SORTIE.v === v, agir: () => monter(v) }); }
function majVehicules(dt) {
  const S0 = CONCESSION.userData.salle;
  // La porte sectionnelle : ses lames montent puis filent sous le plafond.
  S0.porte = lerp(S0.porte, SORTIE.v ? 1 : 0, 1 - Math.exp(-dt * 2.2)); S0.porteObs.inactif = S0.porte > 0.8;
  S0.lames.forEach((l, k) => { const h = k * 0.58 + 0.29 + S0.porte * 2.95, haut = Math.max(0, h - 2.95); l.position.set(l.position.x, S0.F + Math.min(h, 2.95), S0.zf - haut); l.rotation.x = haut > 0 ? Math.PI / 2 : 0; });
  if (SORTIE.v) {
    const v = SORTIE.v, x = v.D.place; SORTIE.t += dt;   // trajet fixe : l'allée, le bord du parvis, puis sa place (il s'y gare en marche avant, nez vers la vitrine)
    const pts = [[-7.5, Z_ALLEE], [x, Z_ALLEE], [x, Z_PLACE]], but = surSol(monde(CONCESSION, pts[SORTIE.k][0], 0, pts[SORTIE.k][1]));
    if (S0.porte > 0.85) { const vers = tangent(v.p, _vp.subVectors(but, v.p), new V3()); v.f.lerp(vers, 1 - Math.exp(-dt * 5)).normalize(); v.v = lerp(v.v, 3.2, 1 - Math.exp(-dt * 2)); surSol(_vp.copy(v.p).addScaledVector(vers, Math.min(v.v * dt, v.p.distanceTo(but))), 0, v.p); if (v.p.distanceTo(but) < 0.3) SORTIE.k++; }
    if (SORTIE.k >= pts.length || SORTIE.t > 45) { v.v = 0; SORTIE.v = null; v.obs.inactif = false; monter(v); sauverBientot(); }
    poserVehicule(v); animerVehicule(v, dt, 0); if (SORTIE.v) v.obs.inactif = true;
  }
  const v = joueur.enVehicule;
  if (v) {
    const r = avancer(v, dt, E.mz, E.mx); if (r.dyaw) joueur.f.applyAxisAngle(joueur.haut, r.dyaw);   // le regard suit le virage
    travailler(v, dt);
    surSol(_vp.copy(v.p).addScaledVector(v.f, v.D.siege[0]), v.D.siege[1], joueur.p); joueur.vitesse = 0;
    if (v.g.userData.rouleau) v.g.userData.rouleau.rotation.x -= dt * (Math.abs(v.v) > 0.4 ? 14 : 0);
    if (v.g.userData.rabatteur) v.g.userData.rabatteur.rotation.x -= dt * (Math.abs(v.v) > 0.4 ? 3.5 : 0.4);
    poserVehicule(v); animerVehicule(v, dt, E.mx);
    const c = FLOTTE.citerne;   // la remorque suit son attelage
    if (c.possede && c.attelee === v && c.g && SORTIE.v !== c) { const att = _lk.copy(v.p).addScaledVector(v.f, -(v.D.hd + 0.6)), d = new V3().subVectors(c.p, att); tangent(att, d, d); surSol(new V3().copy(att).addScaledVector(d, 2.6), 0, c.p); c.f.copy(d).negate(); poserVehicule(c); c.obs.inactif = true; }
  }
  // Le transporteur lourd : tournées automatiques entre les dépôts, les quais et le collecteur.
  const t = FLOTTE.transporteur;
  if (t.possede && SORTIE.v !== t) {
    const a = t.auto; a.t += dt;
    if (a.etat === 'repos') { if (a.t > 2) { a.t = 0; let best = null; for (const p of GRILLE.values()) if ((p.cle === 'depot' || p.cle === 'quai') && p.stock.length >= 5 && (!best || p.stock.length > best.stock.length)) best = p; if (best) { a.cible = best; a.etat = 'aller'; a.bloque = 0; } } }
    else if (a.etat === 'aller') { if (!GRILLE.has(a.cible.id)) a.etat = 'retour'; else if (t.p.distanceTo(a.cible.pos) < 6.5) { t.v = 0; if (a.t > 2) { chargerVehicule(t); a.etat = 'retour'; a.bloque = 0; } } else { a.t = 0; if (!versCible(t, a.cible.pos, dt)) a.bloque += dt; if (a.bloque > 10) a.etat = 'retour'; } }
    else { if (t.p.distanceTo(PARKING.p) < 7) { t.v = 0; viderCuves(t); a.etat = 'repos'; a.t = 0; } else if (!versCible(t, PARKING.p, dt)) { a.bloque += dt; if (a.bloque > 20) { t.p.copy(surSol(placeParvis('transporteur'))); a.bloque = 0; } } }
    poserVehicule(t); animerVehicule(t, dt, 0);
  }
  for (const cle of ORDRE_VEHICULES) { const w = FLOTTE[cle]; if (w.g) for (const n of w.g.userData.caisse.userData.niveaux || []) n.scale.y = Math.max(0.02, Math.min(1, w.charge / Math.max(1, capacite(w))));
    if (w.g && w.g.userData.ecran && w.affiche !== Math.round(w.charge)) { w.affiche = Math.round(w.charge); ecrireEcran(w.g.userData.ecran, `${w.affiche} / ${Math.round(capacite(w))} kg`); } }
  M_PARK.color.set(v && bienGare(v) ? 0x3fd35a : ORANGE);
}
MAJ.push(majVehicules);
MAJ.push(() => { if (joueur.enVehicule) majCamera(); });   // la caméra se recale sur l'œil du conducteur
PASTILLE.push(() => joueur.enVehicule ? { nom: joueur.enVehicule.D.nom, charge: joueur.enVehicule.charge, max: Math.round(capacite(joueur.enVehicule)) } : null);

// --- L'intérieur : plateformes tournantes, bornes, pont élévateur, pneus, établi, distributeur de boissons. ---
const BORNES_VEH = [];
{
  const g = CONCESSION, F = g.userData.salle.F;
  ORDRE_VEHICULES.forEach((cle, n) => {
    const x = -4.4 + n * 3.1, z = -1.2, D = VEHICULES[cle];
    placer(g, cylindre(1.35, 1.4, 0.14, M.graphite, 32), x, F + 0.07, z); placer(g, cylindre(1.42, 1.42, 0.03, M.seve, 32), x, F + 0.03, z);
    const pl = new THREE.Group(); pl.userData.garder = true; placer(g, pl, x, F + 0.14, z); placer(pl, cylindre(1.25, 1.25, 0.1, M.blanc, 32), 0, 0.05, 0); placer(pl, cylindre(1.27, 1.27, 0.025, M.seve, 32), 0, 0.085, 0);
    const modele = fabriquerVehicule(cle); modele.scale.setScalar(Math.min(0.62, 1.15 / D.hd)); modele.position.y = 0.1; pl.add(modele); modele.traverse((o) => { if (o.isMesh) o.userData.matOrigine = o.material; });
    OBSTACLES.push({ p: monde(g, x, 0, z), r: 1.4 });
    // La borne sur pied : écran (nom, prix, trois barres), bouton d'achat, quatre boutons d'amélioration.
    const e = ecranDyn(256, 320), bx = x, bz = 1.05;
    placer(g, tube(0.05, 0.07, 1.0, M.graphite), bx, F + 0.5, bz); placer(g, cylindre(0.2, 0.24, 0.06, M.graphite, 16), bx, F + 0.03, bz);
    const tete = new THREE.Group(); placer(g, tete, bx, F + 1.25, bz); tete.rotation.x = -0.35;
    placer(tete, boite(0.62, 0.78, 0.07, M.graphite, 0.03), 0, 0, 0); const ec = placer(tete, new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.66), e.mat), 0, 0.02, 0.04); ec.userData.garder = true;
    placer(g, bouton(), bx, F + 0.72, bz + 0.1).scale.setScalar(0.75);
    CLES_AMELIO.forEach((a, k) => { const b = placer(g, bouton(), bx - 0.3 + k * 0.2, F + 0.52, bz + 0.08); b.scale.setScalar(0.32); INTER.push({ p: monde(g, bx - 0.3 + k * 0.2, F + 0.52, bz + 0.14), r: 1.9, cache: () => !FLOTTE[cle].possede, agir() { const v = FLOTTE[cle], prix = prixAmelioVeh(cle, v.niv[a]); if (!prix || S.credits < prix) { sons.refus(); return; } S.credits -= prix; v.niv[a]++; sons.achat(); refaireVehicule(v); sauverBientot(); } }); });
    INTER.push({ p: monde(g, bx, F + 1.25, bz + 0.1), r: 2.4, agir: () => acheterVehicule(cle) });
    OBSTACLES.push({ p: monde(g, bx, 0, bz), r: 0.25 });
    BORNES_VEH.push({ cle, e, pl, modele, sig: '' });
  });
  // Pont élévateur avec un véhicule en entretien, pneus empilés, établi, distributeur de boissons.
  for (const s of [-1, 1]) { placer(g, boite(0.3, 2.6, 0.4, M.lisere, 0.04), -7.5 + s * 1.5, F + 1.3, -3.4); placer(g, boite(0.5, 0.08, 0.6, M.graphite, 0.02), -7.5 + s * 1.5, F + 0.04, -3.4); placer(g, boite(1.1, 0.1, 0.25, M.graphite, 0.03), -7.5 + s * 0.85, F + 1.25, -3.4); }
  const entretien = fabriquerVehicule('quad'); entretien.scale.setScalar(0.95); placer(g, entretien, -7.5, F + 0.85, -3.4, Math.PI / 2);
  OBSTACLES.push(boiteDe(g, 1.8, 1.0, {}, -7.5, -3.6));
  for (let k = 0; k < 7; k++) placer(g, new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.13, 10, 22).rotateX(Math.PI / 2), M_PNEU), 7.0 + (k > 3 ? 0.75 : 0), F + 0.13 + (k % 4) * 0.26, -4.2);
  OBSTACLES.push(boiteDe(g, 0.85, 0.45, {}, 7.35, -4.2));
  meuble(g, comptoirMeuble(0.8, 2.4, 0.92), 9.2, F, -3.0, 0.45, 1.25); placer(g, boite(0.4, 0.07, 0.11, M.blanc, 0.025), 9.15, F + 0.96, -3.3, 0.5); placer(g, new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 8, 18).rotateX(Math.PI / 2), M_PNEU), 9.2, F + 1.02, -2.4); placer(g, boite(0.05, 0.8, 2.2, M.graphite, 0.02), 9.7, F + 1.7, -3.0);
  const dist = new THREE.Group(); placer(dist, boite(0.9, 1.9, 0.7, M.blanc, 0.05), 0, 0.95, 0); placer(dist, boite(0.7, 1.0, 0.04, M_VITRE, 0.02), -0.05, 1.25, 0.35); placer(dist, boite(0.92, 0.3, 0.72, M.lisere, 0.04), 0, 1.75, 0); placer(dist, boite(0.5, 0.16, 0.06, M.graphite, 0.02), -0.05, 0.4, 0.35); for (let k = 0; k < 6; k++) placer(dist, cylindre(0.045, 0.045, 0.16, k % 2 ? M.seve : M.lisere, 10), -0.28 + (k % 3) * 0.22, 1.02 + Math.floor(k / 3) * 0.32, 0.3); placer(dist, boite(0.92, 0.02, 0.5, M.seve, 0.008), 0, 0.02, 0.2);
  meuble(g, dist, 9.1, F, 3.6, 0.5, 0.45, -Math.PI / 2);
  decor(g, [['caisses', 8.9, -0.6, 0.3], ['chariot', 7.4, 3.9, 0.4], ['escabeau', 9.3, 1.0, 0.2], ['extincteur', 2.0, 4.6, Math.PI], ['affiche', -1.5, -5.07, 0, F + 1.9], ['plante', -1.7, 4.4], ['plante', 1.7, 4.4]]);
  fusionner(g);
}
MAJ.push((dt) => {
  const pres = joueur.p.distanceTo(CONCESSION.position) < 50;
  for (const b of BORNES_VEH) {
    if (pres) b.pl.rotation.y += dt * 0.35;
    const v = FLOTTE[b.cle], D = v.D, cher = !v.possede && S.credits < D.prix, sig = [v.possede, cher, ...CLES_AMELIO.map((a) => v.niv[a]), CLES_AMELIO.map((a) => S.credits >= prixAmelioVeh(b.cle, v.niv[a])).join()].join();
    if (sig === b.sig || !pres) continue; b.sig = sig;
    b.modele.traverse((o) => { if (o.isMesh) o.material = cher ? M_GRIS : o.userData.matOrigine; });
    const e = b.e, g = e.g; fond(e); g.textAlign = 'center'; g.fillStyle = '#edeae4'; g.font = '800 22px system-ui'; g.fillText(D.nom.toUpperCase(), 128, 26);
    g.font = '800 32px system-ui'; g.fillStyle = v.possede ? '#4fd6e3' : cher ? '#e0452f' : '#f08a24'; g.fillText(v.possede ? 'ACQUIS' : `${D.prix.toLocaleString('fr-FR')} cr`, 128, 68);
    const barres = [['VITESSE', D.vmax * MULT_VEH.moteur[v.niv.moteur] / 16], ['CHARGE', Math.sqrt((D.remorque ? 6000 : D.cap * MULT_VEH.chassis[v.niv.chassis]) / 9000)], ['TRAVAIL', D.auto ? 1 : D.remorque ? 0.1 : (D.largeur || 0.15) / 3]];
    g.textAlign = 'left'; g.font = '800 15px system-ui'; barres.forEach(([nom, val], k) => { const y = 108 + k * 34; g.fillStyle = '#c9c3b6'; g.fillText(nom, 16, y); g.fillStyle = '#3a3f45'; g.fillRect(100, y - 7, 140, 14); g.fillStyle = '#4fd6e3'; g.fillRect(100, y - 7, 140 * clamp(val, 0.04, 1), 14); });
    g.font = '800 12px system-ui'; CLES_AMELIO.forEach((a, k) => { const x = 10 + k * 61, niv = v.niv[a], prix = prixAmelioVeh(b.cle, niv); g.fillStyle = '#c9c3b6'; g.fillText(AMELIO_VEH[a], x, 222); for (let n = 0; n < 3; n++) { g.fillStyle = n < niv ? '#f08a24' : '#3a3f45'; g.fillRect(x + n * 17, 236, 14, 9); } g.fillStyle = !v.possede ? '#6c7076' : !prix ? '#4fd6e3' : S.credits >= prix ? '#f4b41a' : '#e0452f'; g.fillText(!prix ? 'MAX' : prix.toLocaleString('fr-FR'), x, 266); });
    e.maj();
  }
});

// =====================================================================
// Le quai de déchargement : une aire couverte au sud de la base. On y entre au volant, on s'arrête : la hotte aspire le
// pollen des cuves (40 kg/s), l'écran compte les crédits, la vente est immédiate. À pied, E y vend le sac.
// =====================================================================
const QUAI = (() => {
  const g = new THREE.Group(), L = 9, W = 6.4, p = local(0, 20);
  placer(g, boite(W + 1.2, 0.14, L + 1.2, M_BETON, 0.04), 0, 0.03, 0);
  for (const s of [-1, 1]) { placer(g, boite(0.12, 0.03, L + 1.0, M.seve, 0.01), s * (W / 2 + 0.45), 0.11, 0); placer(g, boite(0.08, 0.02, L, M.lisere, 0.006), s * (W / 2 - 0.3), 0.11, 0); }
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) placer(g, boite(0.9, 0.012, 0.16, M.lisere, 0.004), s * 0.42, 0.105, -3 + k * 1.6, s * 0.6);   // chevrons vers l'intérieur
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { placer(g, boite(0.5, 0.3, 0.5, M.graphite, 0.05), x * (W / 2 + 0.45), 0.25, z * (L / 2 - 0.3)); placer(g, boite(0.26, 4.6, 0.26, M.blanc, 0.06), x * (W / 2 + 0.45), 2.65, z * (L / 2 - 0.3)); placer(g, boite(0.28, 0.08, 0.28, M.lisere, 0.02), x * (W / 2 + 0.45), 1.2, z * (L / 2 - 0.3)); }
  placer(g, boite(W + 1.6, 0.36, L + 0.4, M.panneau, 0.08), 0, 5.05, 0); placer(g, boite(W + 1.64, 0.08, L + 0.44, M.lisere, 0.03), 0, 4.84, 0);   // la toiture
  for (let k = -1; k <= 1; k++) placer(g, boite(0.3, 0.04, L - 0.6, M_LUM, 0.01), k * 2, 4.85, 0);
  placer(g, boite(4.6, 0.7, 0.14, M.graphite, 0.04), 0, 5.6, L / 2 - 0.1); placer(g, boite(4.4, 0.56, 0.03, new THREE.MeshStandardMaterial({ map: texteTex([['DÉCHARGEMENT', 64]], 512, 96, '#f08a24', '#fffdf7'), roughness: 0.5 }), 0.01), 0, 5.6, L / 2 - 0.02);
  // La hotte d'aspiration, au centre, et son conduit vers la trémie de vente.
  placer(g, cylindre(0.9, 0.35, 0.7, M.blanc, 24), 0, 4.35, 0); placer(g, cylindre(0.92, 0.92, 0.06, M.lisere, 24), 0, 4.02, 0); placer(g, cylindre(0.7, 0.7, 0.04, M.seve, 24), 0, 3.99, 0);
  for (let k = 0; k < 10; k++) placer(g, new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 18), M.graphite), 1.2 + k * 0.26, 4.6 - k * 0.12, 0).rotation.y = Math.PI / 2;
  const tr = new THREE.Group(); placer(g, tr, W / 2 + 2.0, 0, 0); socle(tr, 1.6, 1.6);
  placer(tr, cylindre(0.9, 0.9, 2.6, M.panneau, 24), 0, 1.8, 0); placer(tr, cylindre(0.6, 0.92, 0.6, M.blanc, 24), 0, 3.4, 0); placer(tr, cylindre(0.93, 0.93, 0.08, M.lisere, 24), 0, 2.9, 0);
  const ec = ecranDyn(256, 128); placer(tr, boite(1.0, 0.6, 0.08, M.graphite, 0.03), -0.92, 1.9, 0, -Math.PI / 2); const m = placer(tr, new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.48), ec.mat), -0.97, 1.9, 0, -Math.PI / 2); m.userData.garder = true;
  placer(tr, bouton(), -0.93, 1.35, 0, -Math.PI / 2);
  fusionner(g); poserSur(g, p, versBase(p).negate()); scene.add(g);   // l'entrée regarde vers les champs
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) OBSTACLES.push({ p: monde(g, x * (W / 2 + 0.45), 0, z * (L / 2 - 0.3)), r: 0.42 });
  OBSTACLES.push({ p: monde(g, W / 2 + 2.0, 0, 0), r: 1.25 });
  return { g, p: g.position.clone(), ec, total: 0, flux: 0, hotte: monde(g, 0, 4.0, 0) };
})();
const NFLUX = 120, fluxPos = new Float32Array(NFLUX * 3), fluxT = new Float32Array(NFLUX).fill(2), fluxGeo = new THREE.BufferGeometry(); fluxGeo.setAttribute('position', new THREE.BufferAttribute(fluxPos, 3));
const fluxPollen = new THREE.Points(fluxGeo, new THREE.PointsMaterial({ color: 0xf5c518, size: 0.12, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending })); fluxPollen.frustumCulled = false; scene.add(fluxPollen);
let fluxI = 0, tQuai = 0;
function dessinerQuai() { const e = QUAI.ec, g = e.g; fond(e); g.textAlign = 'center'; g.fillStyle = '#c9c3b6'; g.font = '800 20px system-ui'; g.fillText('VENTE', 128, 26); g.fillStyle = '#f08a24'; g.font = '800 46px system-ui'; g.fillText(`+${Math.round(QUAI.total).toLocaleString('fr-FR')} cr`, 128, 80); e.maj(); }
dessinerQuai();
MAJ.push((dt) => {
  const v = joueur.enVehicule, dedans = v && v.p.distanceTo(QUAI.p) < 3.8 && Math.abs(v.v) < 1.5;
  if (dedans && v.charge > 0) {   // la hotte aspire : 40 kg/s, vendus au fur et à mesure
    const kg = Math.min(v.charge, 40 * dt), val = v.valeur * kg / v.charge; v.charge -= kg; v.valeur -= val; const cr = encaisser(val); QUAI.total += cr; QUAI.flux = 0.4;
    if (v.charge < 1e-3) { v.charge = 0; v.valeur = 0; S.ventes++; sons.vente(); sauverBientot(); }
    for (let k = 0; k < 3; k++) { const i = fluxI++ % NFLUX; fluxT[i] = 0; fluxPos.set([v.p.x, v.p.y, v.p.z], i * 3); }
    tQuai += dt; if (tQuai > 0.15) { tQuai = 0; dessinerQuai(); sons.pop(); }
  }
  QUAI.flux -= dt; if (QUAI.flux < -4 && QUAI.total) { QUAI.total = 0; dessinerQuai(); }   // 4 s après la vente, le compteur revient à zéro
  // le pollen monte en spirale de la cuve vers la hotte
  for (let i = 0; i < NFLUX; i++) {
    if (fluxT[i] >= 1) { fluxPos[i * 3] = fluxPos[i * 3 + 1] = fluxPos[i * 3 + 2] = 0; continue; }
    fluxT[i] += dt * 1.6; const t = fluxT[i], a = t * 12 + i;
    _vp.copy(v ? v.p : QUAI.p).lerp(QUAI.hotte, t); const up = _d2.copy(QUAI.p).normalize(), { est, nord } = repere(QUAI.p);
    _vp.addScaledVector(up, Math.sin(t * Math.PI) * 0.6 + 1.2 * (1 - t)).addScaledVector(est, Math.cos(a) * 0.35 * (1 - t)).addScaledVector(nord, Math.sin(a) * 0.35 * (1 - t));
    fluxPos.set([_vp.x, _vp.y, _vp.z], i * 3);
  }
  fluxGeo.attributes.position.needsUpdate = true;
});
INTER.push({ p: monde(QUAI.g, 6.4 / 2 + 1.05, 1.9, 0), r: 2.6, vente: true, get etiquette() { return kgSac() > 0 ? 'Vendre' : null; }, agir: () => vendre() });
REPERES_CARTE.push(() => [QUAI.p]);
