
// =====================================================================
// 10. La base et ses bâtiments. On y entre vraiment : chaque bâtiment est une pièce unique, lumineuse, entièrement
//     meublée. Règles communes : sol en dalles claires à joints sombres et liseré orange le long des murs, murs épais en
//     panneaux blancs rainurés de 3 m avec conduits apparents, bandeaux lumineux au plafond, lumière cyan sous les
//     meubles, au moins six objets de décor, porte coulissante qui s'ouvre à l'approche. Façades : panneaux blancs
//     répétés, hautes fenêtres verticales cyan, liseré orange continu.
// =====================================================================
const M_VITRE = new THREE.MeshStandardMaterial({ color: 0x1d2a33, roughness: 0.08, metalness: 0.6 });
const M_GRIS = new THREE.MeshStandardMaterial({ color: 0x9a9da0, roughness: 0.8, transparent: true, opacity: 0.42 });   // hors de prix : gris translucide
const M_LUM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff4e0, emissiveIntensity: 1.6 });           // bandeau lumineux
const M_VIOLET = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x9a5cff, emissiveIntensity: 2 });          // lampes de culture du laboratoire
const M_FEUILLE = new THREE.MeshStandardMaterial({ color: AZUR.tige, roughness: 0.9, flatShading: true });
const M_BLEU = new THREE.MeshStandardMaterial({ color: AZUR.petale, roughness: 0.8 });
const M_DALLE = new THREE.MeshStandardMaterial({ roughness: 0.75, map: texture(256, 256, (g, w) => { g.fillStyle = '#dedbd4'; g.fillRect(0, 0, w, w); g.strokeStyle = '#3a4046'; g.lineWidth = 5; g.strokeRect(0, 0, w, w); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, w); g.moveTo(0, w / 2); g.lineTo(w, w / 2); g.stroke(); }) }); M_DALLE.userData.monde = 1.2;
function texteTex(lignes, w = 512, h = 128, fond = '#edeae4', encre = '#2e343a') {
  return texture(w, h, (g) => {
    g.fillStyle = fond; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    lignes.forEach(([t, taille, couleur], k) => { g.fillStyle = couleur || encre; let f = taille; do { g.font = `800 ${f}px system-ui, sans-serif`; f -= 2; } while (g.measureText(t).width > w * 0.9 && f > 10); g.fillText(t, w / 2, h * (k + 0.5) / lignes.length + 2); });
    g.fillStyle = '#f08a24'; g.fillRect(w * 0.1, h - 10, w * 0.8, 5);
  });
}
function ecranDyn(w, h) {   // un écran dont on redessine le contenu : { mat, g (contexte 2D), maj() }
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return { mat: new THREE.MeshStandardMaterial({ color: 0x0d0f11, roughness: 0.1, metalness: 0.2, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.25 }), g: cv.getContext('2d'), w, h, maj() { t.needsUpdate = true; } };
}
const fond = (e) => { e.g.fillStyle = '#121518'; e.g.fillRect(0, 0, e.w, e.h); e.g.textBaseline = 'middle'; };
const INTER = [];      // ce qu'on utilise avec E : { p (point visé, dans le monde), r, agir(), cache() }
const SALLES = [];     // les pièces où l'on entre
// Une pièce : W de large, D de profond, porte au milieu de la façade (+z).
function salle(W, D, enseigne, pos, Ht = 3) {
  const g = new THREE.Group(), e = 0.25, PW = 1.9, PH = 2.4, F = 0.14, yM = F + Ht / 2;
  placer(g, boite(W, F, D, M_DALLE, 0.03), 0, F / 2, 0);                                                           // dalles
  for (const [w, d, x, z] of [[W - 2 * e - 0.3, 0.07, 0, -D / 2 + e + 0.12], [W - 2 * e - 0.3, 0.07, 0, D / 2 - e - 0.12], [0.07, D - 2 * e - 0.3, -W / 2 + e + 0.12, 0], [0.07, D - 2 * e - 0.3, W / 2 - e - 0.12, 0]]) placer(g, boite(w, 0.012, d, M.lisere, 0.004), x, F + 0.006, z);   // liseré orange le long des murs
  const murs = [[W, e, 0, -D / 2 + e / 2], [e, D, -W / 2 + e / 2, 0], [e, D, W / 2 - e / 2, 0], [(W - PW) / 2, e, -(W + PW) / 4, D / 2 - e / 2], [(W - PW) / 2, e, (W + PW) / 4, D / 2 - e / 2]];
  for (const [w, d, x, z] of murs) placer(g, boite(w, Ht, d, M.blanc, 0.03), x, yM, z);                              // murs épais, panneaux rainurés des deux côtés
  placer(g, boite(PW, Ht - PH, e, M.blanc, 0.03), 0, F + PH + (Ht - PH) / 2, D / 2 - e / 2);                         // linteau
  placer(g, boite(PW + 0.2, 0.08, e + 0.06, M.lisere, 0.02), 0, F + PH + 0.04, D / 2 - e / 2);
  placer(g, boite(W + 0.5, 0.3, D + 0.5, M.blanc, 0.05), 0, F + Ht + 0.15, 0);                                       // toit et corniche
  placer(g, boite(W + 0.54, 0.07, D + 0.54, M.lisere, 0.02), 0, F + Ht - 0.02, 0);                                   // liseré orange continu
  placer(g, boite(W - 1.2, 0.35, D - 1.2, M.blanc, 0.05), 0, F + Ht + 0.45, 0);
  placer(g, boite(W + 0.08, 0.12, D + 0.08, M.graphite, 0.04), 0, 0.06, 0);                    // plinthe charbon dehors
  // Hautes fenêtres verticales cyan sur les façades (lumineuses, on ne voit pas au travers).
  for (let x = -W / 2 + 1.2; x <= W / 2 - 1.2; x += 2) { if (Math.abs(x) > PW / 2 + 0.5) placer(g, boite(0.28, 1.7, 0.05, M.seve, 0.02), x, F + 1.6, D / 2 + 0.01); placer(g, boite(0.28, 1.7, 0.05, M.seve, 0.02), x, F + 1.6, -D / 2 - 0.01); }
  for (let z = -D / 2 + 1.2; z <= D / 2 - 1.2; z += 2) for (const s of [-1, 1]) placer(g, boite(0.05, 1.7, 0.28, M.seve, 0.02), s * (W / 2 + 0.01), F + 1.6, z);
  // Dedans : conduits apparents en haut des murs, bandeaux lumineux encastrés au plafond.
  placer(g, tube(0.07, 0.07, W - 2 * e - 0.1, M.graphite), 0, F + Ht - 0.28, -D / 2 + e + 0.12).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) placer(g, tube(0.055, 0.055, D - 2 * e - 0.1, M.graphite), s * (W / 2 - e - 0.1), F + Ht - 0.28, 0).rotation.x = Math.PI / 2;
  for (let x = -W / 2 + 1.6; x <= W / 2 - 1.6; x += 2.4) placer(g, boite(0.3, 0.05, D - 1.6, M_LUM, 0.02), x, F + Ht - 0.115, 0);
  placer(g, boite(W - 2 * e, 0.06, D - 2 * e, M.blanc, 0.02), 0, F + Ht - 0.09, 0);                                  // plafond
  // Enseigne, et porte coulissante vitrée à deux vantaux.
  const le = Math.min(W - 1, 4.4); placer(g, boite(le, 0.7, 0.12, M.graphite, 0.03), 0, F + Ht + 0.72, D / 2 + 0.1);
  placer(g, boite(le - 0.12, 0.58, 0.03, new THREE.MeshStandardMaterial({ map: texteTex([[enseigne, 76]]), roughness: 0.5 }), 0.01), 0, F + Ht + 0.72, D / 2 + 0.17);
  const vantaux = [-1, 1].map((s) => { const v = placer(g, boite(PW / 2, PH, 0.07, M_VITRE, 0.02), s * PW / 4, F + PH / 2, D / 2 - e / 2); v.userData.garder = true; v.userData.s = s; return v; });
  fusionner(g); poserSur(g, pos, versBase(pos)); scene.add(g);
  const ombre = ombreContact(g, 1); ombre.scale.set(W / 2 + 0.7, 1, D / 2 + 0.7);
  for (const [w, d, x, z] of murs) OBSTACLES.push(boiteDe(g, w / 2 + 0.05, d / 2 + 0.05, {}, x, z));
  SURCOTES.push({ p: g.position.clone(), ax: g.userData.ax, az: g.userData.az, hw: W / 2 + 0.4, hd: D / 2 + 0.4, h: F, bord: 0.5 });
  const S = { g, W, D, Ht, F, vantaux, PW, dedans: false, ouverture: 0 }; SALLES.push(S); g.userData.salle = S;
  return g;
}
const monde = (g, x, y, z) => new V3(x, y, z).applyMatrix4(g.matrixWorld);   // un point local d'un bâtiment, dans le monde
function meuble(g, o, x, y, z, hw, hd, ry = 0) { placer(g, o, x, y, z, ry); if (hw) OBSTACLES.push(boiteDe(g, hw, hd, {}, x, z)); return o; }   // un meuble et sa boîte de collision
const lueur = (g, x, z, w, d) => placer(g, boite(w, 0.02, d, M.seve, 0.008), x, 0.16, z);   // lumière cyan diffuse sous un meuble
// --- Le décor : six objets au moins par pièce. ---
function caisses(n = 3) { const g = new THREE.Group(); for (let k = 0; k < n; k++) { const s = 0.46 - k * 0.04, c = placer(g, boite(s, s, s, M.blanc, 0.03), (k % 2) * 0.05, 0.23 + k * 0.44, 0, k * 0.3); placer(c, boite(s + 0.01, 0.06, s + 0.01, M.lisere, 0.01), 0, 0.08, 0); } return g; }
function chariot() { const g = new THREE.Group(); placer(g, boite(0.9, 0.06, 0.55, M.graphite, 0.02), 0, 0.2, 0); for (const [x, z] of [[-0.35, -0.2], [0.35, -0.2], [-0.35, 0.2], [0.35, 0.2]]) placer(g, cylindre(0.07, 0.07, 0.05, M.graphite, 10), x, 0.08, z).rotation.x = Math.PI / 2; for (const s of [-1, 1]) placer(g, tube(0.015, 0.015, 0.8, M_CHROME), -0.42, 0.6, s * 0.22); placer(g, tube(0.015, 0.015, 0.46, M.lisere), -0.42, 1.0, 0).rotation.x = Math.PI / 2; placer(g, boite(0.4, 0.3, 0.4, M.blanc, 0.03), 0.1, 0.38, 0); return g; }
function escabeau() { const g = new THREE.Group(); for (const s of [-1, 1]) { placer(g, boite(0.04, 1.3, 0.05, M_CHROME, 0.015), s * 0.22, 0.62, 0.18).rotation.x = 0.28; placer(g, boite(0.04, 1.3, 0.05, M_CHROME, 0.015), s * 0.22, 0.62, -0.18).rotation.x = -0.28; } for (let k = 0; k < 3; k++) placer(g, boite(0.46, 0.035, 0.16, M.lisere, 0.012), 0, 0.3 + k * 0.34, 0.26 - k * 0.09); placer(g, boite(0.5, 0.04, 0.24, M.graphite, 0.015), 0, 1.24, 0); return g; }
function extincteur() { const g = new THREE.Group(); placer(g, cylindre(0.08, 0.08, 0.45, M.lisere, 14), 0, 0.3, 0); placer(g, cylindre(0.03, 0.05, 0.1, M.graphite, 10), 0, 0.57, 0); placer(g, boite(0.14, 0.03, 0.03, M.graphite, 0.01), 0.05, 0.63, 0); placer(g, boite(0.2, 0.5, 0.03, M.blanc, 0.01), 0, 0.3, -0.1); return g; }
function affiche() { const g = new THREE.Group(); placer(g, boite(0.84, 1.14, 0.03, M.graphite, 0.01), 0, 0, 0); placer(g, boite(0.78, 1.08, 0.02, new THREE.MeshStandardMaterial({ roughness: 0.6, map: texture(256, 352, (c, w, h) => { c.fillStyle = '#edeae4'; c.fillRect(0, 0, w, h); c.fillStyle = '#3b6fd4'; for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(w / 2 + Math.cos(k * 1.047) * 46, 130 + Math.sin(k * 1.047) * 46, 40, 26, k * 1.047, 0, 6.3); c.fill(); } c.fillStyle = '#f5c518'; c.beginPath(); c.arc(w / 2, 130, 26, 0, 6.3); c.fill(); c.fillStyle = '#4a7a3c'; c.fillRect(w / 2 - 5, 190, 10, 90); c.fillStyle = '#2e343a'; c.font = '800 34px system-ui'; c.textAlign = 'center'; c.fillText('AZURELLE', w / 2, 318); c.fillStyle = '#f08a24'; c.fillRect(40, 332, w - 80, 6); }) }), 0.006), 0, 0, 0.012); return g; }
function plante() { const g = new THREE.Group(); placer(g, cylindre(0.2, 0.15, 0.36, M.blanc, 14), 0, 0.18, 0); placer(g, cylindre(0.205, 0.205, 0.05, M.lisere, 14), 0, 0.33, 0); for (let k = 0; k < 7; k++) { const f = placer(g, new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.7 + (k % 3) * 0.15, 4), M_FEUILLE), Math.cos(k * 0.9) * 0.07, 0.72, Math.sin(k * 0.9) * 0.07); f.rotation.set(Math.sin(k * 0.9) * 0.35, 0, -Math.cos(k * 0.9) * 0.35); f.castShadow = true; } return g; }
function decor(g, liste) { const S = g.userData.salle; S.decor = (S.decor || 0) + liste.length; for (const [quoi, x, z, ry = 0, y] of liste) { const o = { caisses, chariot, escabeau, extincteur, affiche, plante }[quoi](); placer(g, o, x, y === undefined ? S.F : y, z, ry); if (quoi !== 'affiche' && quoi !== 'extincteur') OBSTACLES.push(boiteDe(g, 0.3, 0.3, {}, x, z)); } }
function comptoirMeuble(w, d, h = 1.0) { const g = new THREE.Group(); placer(g, boite(w, h - 0.08, d, M.blanc, 0.04), 0, (h - 0.08) / 2, 0); placer(g, boite(w + 0.08, 0.08, d + 0.08, M.graphite, 0.03), 0, h - 0.04, 0); placer(g, boite(w + 0.02, 0.05, d + 0.02, M.lisere, 0.015), 0, h - 0.3, 0); return g; }

// --- La station : le bâtiment central. Comptoir d'accueil en îlot, grand écran de progression du secteur, mur des
//     succès avec ses médaillons, tableau de supervision, et un lit pour passer la nuit. ---
const STATION = salle(11, 8, 'STATION POLLEN', local(0, -22));
const ECRAN_SECTEUR = ecranDyn(768, 320), ECRAN_SUPERVISION = ecranDyn(1024, 512), MEDAILLONS = [];
{
  const g = STATION, F = g.userData.salle.F;
  meuble(g, comptoirMeuble(3.2, 1.0), 0, F, 0.6, 1.7, 0.6); lueur(g, 0, 0.6, 3.0, 0.8);
  placer(g, boite(0.5, 0.32, 0.06, M.graphite, 0.02), -0.8, F + 1.2, 0.5).rotation.x = -0.3; placer(g, bouton(), 0.9, F + 1.0, 0.75).rotation.x = -Math.PI / 2;
  placer(g, boite(4.3, 1.9, 0.1, M.graphite, 0.03), -2.4, F + 1.7, -3.72); placer(g, new THREE.Mesh(new THREE.PlaneGeometry(4.1, 1.7), ECRAN_SECTEUR.mat), -2.4, F + 1.7, -3.66);          // progression du secteur
  placer(g, boite(0.1, 2.3, 4.5, M.graphite, 0.03), 5.22, F + 1.65, 0.4); placer(g, new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.15), ECRAN_SUPERVISION.mat), 5.16, F + 1.65, 0.4, -Math.PI / 2);   // supervision (mur est)
  for (let k = 0; k < 8; k++) { const m = placer(g, cylindre(0.24, 0.24, 0.06, M_GRIS, 20), -5.2, F + 2.1 - Math.floor(k / 4) * 0.7, -1.2 + (k % 4) * 0.75); m.rotation.z = Math.PI / 2; m.userData.garder = true; MEDAILLONS.push(m); placer(g, cylindre(0.3, 0.3, 0.03, M.graphite, 20), -5.23, F + 2.1 - Math.floor(k / 4) * 0.7, -1.2 + (k % 4) * 0.75).rotation.z = Math.PI / 2; }   // mur des succès
  const lit = new THREE.Group(); placer(lit, boite(2.1, 0.3, 1.0, M.graphite, 0.04), 0, 0.15, 0); placer(lit, boite(2.0, 0.18, 0.92, M.blanc, 0.06), 0, 0.39, 0); placer(lit, boite(1.2, 0.06, 0.96, M.lisere, 0.03), 0.35, 0.5, 0); placer(lit, boite(0.4, 0.12, 0.6, M.blanc, 0.05), -0.75, 0.53, 0); placer(lit, boite(0.08, 0.8, 1.0, M.blanc, 0.03), -1.05, 0.4, 0);
  meuble(g, lit, 3.6, F, -2.9, 1.1, 0.55); lueur(g, 3.6, -2.9, 1.9, 0.8);
  decor(g, [['caisses', -4.6, 3.0, 0.3], ['chariot', 4.2, 2.9, 1.2], ['escabeau', -4.5, -3.0, 0.4], ['extincteur', 1.3, 3.55, Math.PI], ['affiche', 1.6, -3.71, 0, F + 1.7], ['plante', -1.9, 0.9], ['plante', 1.9, 0.9], ['caisses', 0.4, -3.1, 1.1]]);
  INTER.push({ p: monde(g, 3.6, F + 0.6, -2.9), r: 2.2, agir: () => dormir() });
  fusionner(g);
}
// --- Le comptoir : la vente et les outils. Long établi contre le mur du fond avec tous les outils exposés (ceux qu'on ne
//     peut pas s'offrir en gris translucide), borne de vente face à l'entrée, cageots qui se remplissent des fleurs vendues. ---
const COMPTOIR = salle(11, 7, 'COMPTOIR', local(-20, -7));
const ETAL = [], CAGEOTS = [];
const BORNE_VENTE = { mat: null };
{
  const g = COMPTOIR, F = g.userData.salle.F;
  meuble(g, comptoirMeuble(10, 0.8, 0.9), 0, F, -2.85, 5.0, 0.45); lueur(g, 0, -2.85, 9.8, 0.6);
  placer(g, boite(10, 1.2, 0.06, M.graphite, 0.02), 0, F + 1.75, -3.2);                                             // panneau porte-outils derrière l'établi
  const borne = new THREE.Group(), b0 = socle(borne, 0.7, 0.6); placer(borne, boite(0.8, 1.1, 0.6, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.04), 0, b0 + 0.55, 0); placer(borne, boite(0.7, 0.42, 0.06, M.graphite, 0.02), 0, b0 + 0.8, 0.31); BORNE_VENTE.mat = ecran('0 cr'); placer(borne, new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.34), BORNE_VENTE.mat), 0, b0 + 0.8, 0.345); placer(borne, bouton(), 0, b0 + 0.35, 0.3);
  meuble(g, borne, 0, F, 0.3, 0.75, 0.65);
  for (let k = 0; k < 8; k++) { const c = new THREE.Group(); placer(c, boite(0.62, 0.3, 0.44, M.graphite, 0.03), 0, 0.15, 0); const f = placer(c, boite(0.54, 0.1, 0.36, M_BLEU, 0.03), 0, 0.31, 0); f.visible = false; f.userData.garder = true; CAGEOTS.push(f); meuble(g, c, -2.6 + (k % 4) * 0.72, F + Math.floor(k / 4) * 0.32, -1.3, 0, 0); }
  OBSTACLES.push(boiteDe(g, 1.5, 0.3, {}, -1.5, -1.3));
  decor(g, [['caisses', 4.6, 2.6, 0.2], ['chariot', -4.4, 2.4, 0.4], ['escabeau', 4.7, -1.4, -0.5], ['extincteur', -1.4, 3.05, Math.PI], ['affiche', -5.21, 0.3, Math.PI / 2, F + 1.7], ['plante', 1.5, 2.9], ['plante', 3.2, -1.2]]);
  fusionner(g);
}
// --- L'atelier : les améliorations. Établi central avec un outil démonté, tiroirs à outils sur roulettes, tableau
//     perforé couvert de clés et de pinces, terminal mural à cinq catégories. ---
const ATELIER = salle(9, 7, 'ATELIER', local(-17, 14));
const TERMINAL_ATELIER = [];
{
  const g = ATELIER, F = g.userData.salle.F;
  meuble(g, comptoirMeuble(2.6, 1.1, 0.92), 0, F, 0.2, 1.4, 0.65); lueur(g, 0, 0.2, 2.4, 0.9);
  placer(g, tube(0.016, 0.016, 0.8, M_CHROME), -0.5, F + 0.95, 0.1).rotation.z = Math.PI / 2; placer(g, boite(0.4, 0.07, 0.11, M.blanc, 0.025), 0.4, F + 0.96, 0.3, 0.5); placer(g, boite(0.38, 0.08, 0.09, M_POILS, 0.02), 0.7, F + 0.96, -0.1, -0.4); for (let k = 0; k < 4; k++) placer(g, cylindre(0.02, 0.02, 0.03, M.lisere, 8), -0.2 + k * 0.12, F + 0.94, 0.42);   // l'outil démonté
  for (const x of [-3.4, -2.4]) { const t = new THREE.Group(); placer(t, boite(0.7, 0.9, 0.5, M.lisere, 0.03), 0, 0.57, 0); for (let k = 0; k < 4; k++) placer(t, boite(0.62, 0.17, 0.03, M.graphite, 0.012), 0, 0.26 + k * 0.21, 0.25); for (const [a, b] of [[-0.28, -0.18], [0.28, -0.18], [-0.28, 0.18], [0.28, 0.18]]) placer(t, cylindre(0.05, 0.05, 0.04, M.graphite, 10), a, 0.06, b).rotation.x = Math.PI / 2; meuble(g, t, x, F, -2.7, 0.4, 0.3); }
  placer(g, boite(3.2, 1.3, 0.05, M.graphite, 0.02), 1.6, F + 1.7, -3.2);                                           // tableau perforé
  for (let k = 0; k < 9; k++) { const x = 0.3 + (k % 5) * 0.62, y = F + 2.05 - Math.floor(k / 5) * 0.6; placer(g, boite(0.05, 0.36, 0.02, M_CHROME, 0.01), x, y, -3.16).rotation.z = (k % 3 - 1) * 0.25; placer(g, k % 2 ? cylindre(0.05, 0.05, 0.02, M_CHROME, 8) : boite(0.1, 0.07, 0.02, M.lisere, 0.008), x, y + 0.2, -3.16).rotation.x = Math.PI / 2; }
  decor(g, [['caisses', 3.7, 2.6, 0.5], ['chariot', -3.5, 2.4, 0.9], ['escabeau', 3.8, -1.2, -0.3], ['extincteur', 1.4, 3.05, Math.PI], ['affiche', -4.21, -0.4, Math.PI / 2, F + 1.7], ['plante', -1.6, 2.9]]);
  fusionner(g);
}
// --- Le laboratoire : les variétés d'Azurelle. Paillasses blanches avec plateaux de semis sous lampes violettes, bocaux de
//     graines étiquetés, microscope, tableau vitré des six variétés (valeur, état de déblocage). ---
const LABO = salle(9, 7, 'LABORATOIRE', local(17, 14));
const ECRAN_VARIETES = ecranDyn(1024, 512);
{
  const g = LABO, F = g.userData.salle.F;
  for (const x of [-2.6, 0.2]) {
    meuble(g, comptoirMeuble(2.4, 0.8, 0.9), x, F, -2.85, 1.25, 0.45); lueur(g, x, -2.85, 2.2, 0.6);
    for (let k = 0; k < 2; k++) { placer(g, boite(0.9, 0.06, 0.5, M.graphite, 0.02), x - 0.55 + k * 1.1, F + 0.93, -2.85); for (let n = 0; n < 8; n++) placer(g, new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 4), M_FEUILLE), x - 0.85 + k * 1.1 + (n % 4) * 0.2, F + 1.01, -2.95 + Math.floor(n / 4) * 0.2); }
    placer(g, boite(2.2, 0.05, 0.25, M_VIOLET, 0.02), x, F + 1.75, -2.85); for (const s of [-1, 1]) placer(g, tube(0.015, 0.015, 0.85, M.graphite), x + s * 1.05, F + 1.33, -2.85);   // lampes violettes
  }
  meuble(g, comptoirMeuble(0.8, 2.6, 0.9), 3.75, F, -0.6, 0.45, 1.35); lueur(g, 3.75, -0.6, 0.6, 2.4);
  for (let k = 0; k < 6; k++) { placer(g, cylindre(0.09, 0.09, 0.22, M_VITRE, 12), 3.75, F + 1.01, -1.6 + k * 0.32); placer(g, cylindre(0.095, 0.095, 0.04, M.lisere, 12), 3.75, F + 1.13, -1.6 + k * 0.32); placer(g, boite(0.1, 0.07, 0.01, M.blanc, 0.003), 3.655, F + 1.0, -1.6 + k * 0.32).rotation.y = Math.PI / 2; }   // bocaux étiquetés
  const mic = new THREE.Group(); placer(mic, boite(0.22, 0.04, 0.26, M.graphite, 0.015), 0, 0.02, 0); placer(mic, boite(0.05, 0.34, 0.05, M.blanc, 0.02), 0, 0.2, -0.08); placer(mic, tube(0.03, 0.03, 0.22, M.graphite), 0, 0.34, 0.02).rotation.x = 0.5; placer(mic, cylindre(0.035, 0.035, 0.05, M.lisere, 10), 0, 0.42, 0.07).rotation.x = 0.5; placer(mic, boite(0.14, 0.015, 0.14, M_CHROME, 0.005), 0, 0.14, 0.02);
  placer(g, mic, 0.9, F + 0.9, -2.75);                                                                                // microscope
  placer(g, boite(0.1, 2.2, 4.3, M.graphite, 0.03), -4.22, F + 1.6, 0.3); placer(g, new THREE.Mesh(new THREE.PlaneGeometry(4.1, 2.05), ECRAN_VARIETES.mat), -4.16, F + 1.6, 0.3, Math.PI / 2);   // tableau vitré des variétés
  decor(g, [['caisses', 3.6, 2.6, 0.2], ['chariot', -3.2, 2.5, 2.2], ['escabeau', 2.2, -1.0, 0.6], ['extincteur', -1.4, 3.05, Math.PI], ['affiche', 2.6, -3.21, 0, F + 1.7], ['plante', 1.6, 2.9], ['plante', -3.7, -2.8]]);
  fusionner(g);
}
// Le collecteur dehors (on y vide les véhicules et les lignes en partent), et le point d'eau.
{ const o = boiteDe(COLLECTEUR, 1.55, 1.25, { machine: true }); OBSTACLES.push(o); cadreSol(o.p, o.ax, o.az, o.hw + ZONE_APPROCHE, o.hd + ZONE_APPROCHE, M_ZONE); ombreContact(COLLECTEUR, 1).scale.set(1.9, 1, 1.6); }
const POMPE = (() => {
  const g = new THREE.Group(), base = socle(g, 1.2, 1.2);
  placer(g, tube(0.55, 0.6, 1.6, M.panneau, 24), 0, base + 0.8, 0); placer(g, tube(0.62, 0.62, 0.12, M.graphite, 24), 0, base + 1.66, 0); placer(g, tube(0.4, 0.5, 0.3, M.blanc, 24), 0, base + 1.86, 0);
  placer(g, cylindre(0.22, 0.22, 0.03, new THREE.MeshStandardMaterial({ color: 0x3a8fd0, emissive: 0x2a6fb0, emissiveIntensity: 0.4, roughness: 0.1 }), 24), 0, base + 1.0, 0.585).rotation.x = Math.PI / 2;
  placer(g, new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.035, 8, 24), M.graphite), 0, base + 1.0, 0.59);
  placer(g, tube(0.06, 0.06, 0.5, M.graphite), 0.55, base + 0.5, 0.3).rotation.z = Math.PI / 2; placer(g, bouton(), 0.82, base + 0.5, 0.3).rotation.y = Math.PI / 2;
  fusionner(g); const p = local(-2, 27); poserSur(g, p, versBase(p)); scene.add(g); ombreContact(g, 1.3); OBSTACLES.push({ p: p.clone(), r: 1.1 });
  return g;
})();
// Les portes s'ouvrent à l'approche ; dedans, la lampe de la pièce s'allume et l'ambiance sonore devient plus sourde.
const DEDANS = { salle: null }, VITRINE = { salle: null };   // la vitrine du concessionnaire reste éclairée quand on passe devant
MAJ.push((dt) => {
  DEDANS.salle = null;
  for (const S of SALLES) {
    const d = _c.subVectors(joueur.p, S.g.position), lx = d.dot(S.g.userData.ax), lz = d.dot(S.g.userData.az), dedans = Math.abs(lx) < S.W / 2 && Math.abs(lz) < S.D / 2;
    const pres = Math.abs(lx) < 2.6 && Math.abs(lz - S.D / 2) < 3.4;
    S.ouverture = lerp(S.ouverture, pres && !joueur.enVehicule ? 1 : 0, 1 - Math.exp(-dt * 7));
    for (const v of S.vantaux) v.position.x = v.userData.s * (S.PW / 4 + S.ouverture * S.PW * 0.48);
    S.dedans = dedans; if (dedans && !joueur.enVehicule) DEDANS.salle = S;
  }
  const S = DEDANS.salle || (VITRINE.salle && joueur.p.distanceTo(VITRINE.salle.g.position) < 45 ? VITRINE.salle : null);
  if (S) lampeSalle.position.copy(monde(S.g, 0, S.F + S.Ht - 0.6, 0));
  lampeSalle.intensity = lerp(lampeSalle.intensity, S ? 13 : 0, 1 - Math.exp(-dt * 6));
});
