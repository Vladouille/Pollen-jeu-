
// =====================================================================
// 14. L'automatisation. Une touche (B) ouvre le mode construction : le monde bleuit, une grille fine apparaît au sol,
//     une barre en bas montre cinq catégories (Transport, Production, Énergie, Stockage, Structure). Le fantôme est
//     vert si la pose est possible, rouge sinon, avec la raison écrite. Molette ou R : tourner ; G : verrouiller la
//     direction ; clic sur une pièce posée : la démonter, remboursée entièrement.
//     Les pièces occupent une tuile de la planète (six directions). Chaque machine affiche sa cadence en chiffres.
//     L'électricité : panneaux, batteries et poteaux à moins de 10 m les uns des autres forment un réseau ; une machine
//     sans courant tourne au quart de sa vitesse. Désordre : les panneaux s'encrassent ; accidents : pannes.
// =====================================================================
const CATEGORIES = ['Transport', 'Production', 'Énergie', 'Stockage', 'Structure'];
const PIECES = {
  convoyeur: { nom: 'Convoyeur droit', cat: 0, prix: 20, vitesse: 0.6, tapis: true },
  courbe: { nom: 'Convoyeur courbe', cat: 0, prix: 20, vitesse: 0.6, tapis: true },
  montant: { nom: 'Convoyeur montant', cat: 0, prix: 40, vitesse: 0.5, tapis: true, pente: true },
  aiguillage: { nom: 'Aiguillage', cat: 0, prix: 120, vitesse: 0.6, tapis: true },
  fusionneur: { nom: 'Fusionneur', cat: 0, prix: 120, vitesse: 1.4, tapis: true },
  pied: { nom: 'Pied de support', cat: 0, prix: 60, vitesse: 0.6, tapis: true },
  passerelle: { nom: 'Passerelle', cat: 0, prix: 80, vitesse: 0.6, tapis: true, marche: 0.95 },
  extracteur: { nom: 'Extracteur', cat: 1, prix: 800, entree: ['pollen', 'nectar', 'graines', 'mere'], besoin: 1, sortie: 'extrait', mult: 1.5, durees: [3, 2, 1.2], conso: 2 },
  maturateur: { nom: 'Maturateur', cat: 1, prix: 1500, entree: ['miel', 'extrait'], besoin: 2, sortie: 'cru', mult: 1.8, durees: [6, 4, 2.5], conso: 3 },
  empoteuse: { nom: 'Empoteuse', cat: 1, prix: 2500, entree: ['cru', 'bougie'], besoin: 1, sortie: 'pot', mult: 1.4, durees: [3, 2, 1.2], conso: 4 },
  trieuse: { nom: 'Trieuse', cat: 1, prix: 600, vitesse: 0.6, tapis: true, conso: 1 },
  raffineur: { nom: 'Raffineur de cire', cat: 1, prix: 1100, entree: ['cire'], besoin: 1, sortie: 'bougie', mult: 2, durees: [4, 2.5, 1.5], conso: 3 },
  pollinisateur: { nom: 'Pollinisateur automatique', cat: 1, prix: 3000, sortie: 'pollen', durees: [2.4, 1.4, 0.7], auto: true },   // autonome : ni courant ni convoyeur ; s'il a un convoyeur devant lui, il l'utilise   // pollinise autour de lui, puis récolte le pollen des fleurs ; le pose sur son convoyeur
  ruche0: { nom: 'Ruche simple', cat: 1, prix: 400, ruche: 0 },
  ruche1: { nom: 'Ruche renforcée', cat: 1, prix: 1500, ruche: 1 },
  ruche2: { nom: 'Ruche mère', cat: 1, prix: 6000, ruche: 2 },
  solaire: { nom: 'Poste solaire', cat: 2, prix: 300, prod: 4, energie: true },
  double: { nom: 'Panneau double', cat: 2, prix: 700, prod: 9, energie: true },
  suiveur: { nom: 'Panneau suiveur', cat: 2, prix: 1600, prod: 16, energie: true },
  batterie: { nom: 'Batterie', cat: 2, prix: 900, reserve: 1500, energie: true },
  poteau: { nom: 'Poteau de ligne', cat: 2, prix: 80, energie: true },
  silo: { nom: 'Silo', cat: 3, prix: 500, stock: 100, emet: true },
  depot: { nom: 'Dépôt de terrain', cat: 3, prix: 700, stock: 200, emet: true },
  quai: { nom: 'Quai de chargement', cat: 3, prix: 400, stock: 200 },
  receptionnaire: { nom: 'Réceptionnaire', cat: 3, prix: 1200 },
  fondation: { nom: 'Fondation', cat: 4, prix: 30, marche: 0.3 },
  rampe: { nom: 'Rampe', cat: 4, prix: 40, marche: 0.31, incline: true },        // du sol au dessus d'une fondation
  escalier: { nom: 'Escalier', cat: 4, prix: 50, marche: 0.95, incline: true },   // du sol au tablier d'une passerelle
  plancher: { nom: 'Plancher', cat: 4, prix: 20, marche: 0.12 },
  gardecorps: { nom: 'Garde-corps', cat: 4, prix: 15 },
  eclairage: { nom: 'Éclairage', cat: 4, prix: 60 },
};
const PORTEE_RESEAU = 10;
const accepte = (def, type) => !!def.entree && def.entree.includes(type);
const AMELIO = [1.5, 4];   // prix du niveau 2 et du niveau 3, en multiples du prix de la machine
const prixAmelio = (p) => p.niveau < 2 ? Math.round(PIECES[p.cle].prix * AMELIO[p.niveau]) : 0;
const COULEUR_CAPSULE = { pollen: CHARTE.pollen, nectar: 0x9fd0ff, miel: 0xd98a14, graines: 0x8a6a3a, cire: 0xf3e3a0, mere: 0xf07bb0, extrait: 0x5a8fe0, cru: 0x9a5a12, bougie: 0xfff6dc, pot: 0xf7f4ee };
const NOMS_PRODUITS = { ...RESSOURCES, extrait: 'Extrait', cru: 'Miel cru', bougie: 'Bougies', pot: 'Pots' };
const estTapis = (p) => !!p && !!PIECES[p.cle].tapis;
const GRILLE = new Map();   // id de tuile → pièce
// --- Les modèles des pièces, tous à la charte. Ils regardent vers -z (leur sortie). ---
const tapis = texture(64, 128, (g, w, h) => { g.fillStyle = '#ece8df'; g.fillRect(0, 0, w, h); g.fillStyle = '#f08a24'; for (let k = 0; k < 2; k++) { const y = k * h / 2 + 10; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w * 0.82, y + 22); g.lineTo(w * 0.62, y + 22); g.lineTo(w * 0.62, y + 40); g.lineTo(w * 0.38, y + 40); g.lineTo(w * 0.38, y + 22); g.lineTo(w * 0.18, y + 22); g.closePath(); g.fill(); } });
tapis.wrapT = THREE.RepeatWrapping; const M_TAPIS = new THREE.MeshStandardMaterial({ map: tapis, roughness: 0.7 });
const M_CELLULE = new THREE.MeshStandardMaterial({ color: 0x1b2a44, roughness: 0.08, metalness: 0.6 }), M_CELLULE_SALE = new THREE.MeshStandardMaterial({ color: 0x6b5a3e, roughness: 0.9 });
const M_ROUGE = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xe0452f, emissiveIntensity: 2 });
function ecranMachine() { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ color: 0x0d0f11, roughness: 0.1, metalness: 0.2, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.3 }); }
function cadence(p) { const d = PIECES[p.cle]; if (d.durees) return 60 / d.durees[p.niveau] * (!d.conso || p.courant ? 1 : 0.25); if (d.tapis) return d.vitesse * 60; if (d.ruche !== undefined) return 60 / DUREES_RUCHE[d.ruche]; return 0; }
function dessinerEcran(p) {   // écran sombre : cadence en chiffres, avancement du lot, niveau ; rouge à l'arrêt
  const mat = p.ecran; if (!mat) return; const cv = mat.emissiveMap.image, g = cv.getContext('2d'), d = PIECES[p.cle], av = p.duree ? p.t / p.duree : 0, arret = p.panne || (d.conso && !p.courant);
  g.fillStyle = '#121518'; g.fillRect(0, 0, 128, 64); g.textBaseline = 'middle'; g.textAlign = 'left';
  g.fillStyle = arret ? '#e0452f' : '#f4b41a'; g.font = '800 26px system-ui, sans-serif';
  const txt = d.prod ? `${(p.puissance || 0).toFixed(1).replace('.', ',')} kW` : d.reserve ? `${Math.round((p.charge || 0) / d.reserve * 100)} %` : d.stock ? `${p.stock.length}/${d.stock}` : p.cle === 'receptionnaire' || d.auto ? `${Math.round(p.total || 0)} cr` : `${Math.round(cadence(p))}/min`;
  g.fillText(txt, 8, 22);
  if (d.durees) { g.fillStyle = 'rgba(244,180,26,.2)'; g.fillRect(8, 42, 112, 10); g.fillStyle = arret ? '#e0452f' : '#f4b41a'; g.fillRect(8, 42, 112 * av, 10); for (let k = 0; k < 3; k++) { g.fillStyle = k <= p.niveau ? '#4fd6e3' : '#3a3f45'; g.fillRect(86 + k * 13, 8, 9, 9); } }
  mat.emissiveMap.needsUpdate = true;
}
function pupitre(g, x, y, z, ry = Math.PI) {   // écran sombre et gros bouton rond orange : toute machine en a un
  const e = ecranMachine(); g.userData.ecran = e;
  placer(g, boite(0.62, 0.36, 0.05, M.graphite, 0.02), x, y, z + (ry ? 0.03 : -0.03), ry);
  const m = placer(g, new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.27), e), x, y, z, ry); m.userData.garder = true;
  placer(g, bouton(), x - (ry ? -0.5 : 0.5), y - 0.02, z + (ry ? 0.02 : -0.02), ry).scale.setScalar(0.62);
}
function corpsMachine(g, h = 1.5) {   // socle étagé à bande cyan, corps à panneaux rainurés, bandeau, bouche de sortie, pupitre, voyant
  const b = socle(g, 1.3, 1.3);
  placer(g, boite(1.4, h, 1.3, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.04), 0, b + h / 2, 0.1);
  placer(g, boite(1.45, 0.2, 1.35, M.graphite, 0.03), 0, b + 0.15, 0.1); placer(g, boite(1.43, 0.04, 1.33, M.lisere, 0.015), 0, b + h - 0.12, 0.1);
  placer(g, boite(0.7, 0.22, 0.12, M.graphite, 0.03), 0, b + 0.55, -0.6);
  pupitre(g, 0.05, b + 1.12, -0.6);
  g.userData.voyant = placer(g, boite(0.12, 0.12, 0.04, M.graphite, 0.02), -0.5, b + 1.3, -0.56);
  return b;
}
function tapisBase(g, y = 0.5, mat = M.graphite) {
  for (const s of [-1, 1]) placer(g, boite(0.12, 0.3, PAS, mat, 0.03), s * 0.5, y - 0.15, 0);
  const t = placer(g, new THREE.Mesh(new THREE.PlaneGeometry(0.86, PAS).rotateX(-Math.PI / 2), M_TAPIS), 0, y, 0); t.receiveShadow = true;
  placer(g, boite(1.12, 0.03, 0.06, M.seve, 0.01), 0, y - 0.24, -PAS / 2 + 0.06);
}
function panneauSolaire(parent, w, d) { placer(parent, boite(w + 0.1, 0.06, d + 0.1, M.graphite, 0.02), 0, 0, 0); const c = placer(parent, boite(w, 0.02, d, M_CELLULE, 0.008), 0, 0.035, 0); placer(parent, boite(w + 0.12, 0.04, 0.05, M.lisere, 0.01), 0, 0.02, d / 2 + 0.05); return c; }
// Un coin : un profil triangulaire extrudé, haut côté -z. Le corps plein de la rampe, les limons de l'escalier.
function coin(l, h, ep, mat) {
  const s = new THREE.Shape(); s.moveTo(-l / 2, 0); s.lineTo(l / 2, 0); s.lineTo(l / 2, h); s.lineTo(-l / 2, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: false }); geo.rotateY(Math.PI / 2); geo.translate(-ep / 2, 0, 0); return new THREE.Mesh(geo, mat);
}
function modelePiece(cle) {
  const g = new THREE.Group(), d = PIECES[cle];
  if (d.tapis) {
    const y = cle === 'pied' ? 0.9 : 0.5;
    tapisBase(g, y, cle === 'fusionneur' || cle === 'montant' ? M.lisere : M.graphite);
    if (cle === 'pied') { placer(g, tube(0.14, 0.2, 4, M.blanc), 0, -1.4, 0); placer(g, tube(0.22, 0.22, 0.08, M.seve, 16), 0, 0.5, 0); placer(g, boite(0.9, 0.12, 0.5, M.graphite, 0.03), 0, 0.6, 0); }
    else for (const z of [-0.8, 0.8]) for (const s of [-1, 1]) placer(g, boite(0.1, 0.3, 0.1, M.graphite, 0.02), s * 0.5, 0.15, z);
    if (cle === 'courbe') placer(g, boite(0.06, 0.16, PAS * 0.8, M.seve, 0.02), 0.56, 0.62, 0, 0.18);
    if (cle === 'montant') for (let k = -2; k <= 2; k++) placer(g, boite(0.8, 0.04, 0.06, M.graphite, 0.015), 0, 0.52, k * 0.38);
    if (cle === 'aiguillage') { for (const s of [-1, 1]) placer(g, boite(0.5, 0.05, 0.14, M.lisere, 0.02), s * 0.3, 0.55, -0.55, s * 0.9); placer(g, cylindre(0.16, 0.16, 0.1, M.graphite, 12), 0, 0.56, -0.1); }
    if (cle === 'fusionneur') for (const s of [-1, 1]) placer(g, boite(0.5, 0.05, 0.14, M.seve, 0.02), s * 0.3, 0.55, 0.55, -s * 0.9);
    if (cle === 'passerelle') { placer(g, boite(1.95, 0.08, 1.95, M.blanc, 0.03), 0, 0.93, 0); placer(g, boite(1.97, 0.04, 1.97, M.lisere, 0.015), 0, 0.87, 0); for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) { placer(g, boite(0.1, 0.9, 0.1, M.graphite, 0.02), x, 0.45, z); placer(g, boite(0.24, 0.05, 0.24, M.graphite, 0.015), x, 0.025, z); }
      for (const s of [-1, 1]) for (const r of [-1, 1]) placer(g, boite(0.04, Math.hypot(1.8, 0.78), 0.04, M.graphite, 0.01), s * 0.9, 0.45, 0).rotation.x = r * Math.atan2(1.8, 0.78); }   // pieds sur platines, croix de contreventement
    if (cle === 'trieuse') { for (const s of [-1, 1]) placer(g, boite(0.12, 1.2, 0.5, M.blanc, 0.03), s * 0.62, 0.6, 0); placer(g, boite(1.36, 0.3, 0.6, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.04), 0, 1.3, 0); pupitre(g, -0.1, 1.3, -0.31); placer(g, boite(0.4, 0.05, 0.14, M.lisere, 0.02), -0.62, 0.9, -0.4, 0.9); }
  } else if (d.durees) {
    const b = corpsMachine(g);
    if (cle === 'extracteur') { placer(g, tube(0.42, 0.42, 0.7, M_VITRE, 24), 0, b + 1.85, 0.1); placer(g, tube(0.45, 0.45, 0.06, M.lisere, 24), 0, b + 2.2, 0.1); placer(g, tube(0.45, 0.45, 0.06, M.graphite, 24), 0, b + 1.5, 0.1); g.userData.rotor = placer(g, boite(0.6, 0.5, 0.06, M.pollen, 0.02), 0, b + 1.85, 0.1); }
    else if (cle === 'maturateur') { for (let k = -1; k <= 1; k++) { placer(g, cylindre(0.2, 0.2, 0.5, M.blanc, 16), k * 0.45, b + 1.75, 0.1); placer(g, cylindre(0.21, 0.21, 0.05, M.lisere, 16), k * 0.45, b + 1.9, 0.1); } g.userData.rotor = placer(g, boite(0.5, 0.06, 0.06, M.graphite, 0.02), 0, b + 2.1, 0.1); }
    else if (cle === 'pollinisateur') {   // dôme vitré plein de pollen, mât, tête à trois bras-pinceaux qui tourne
      placer(g, new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M_VITRE), 0, b + 1.5, 0.1); placer(g, new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 8), M.pollen), 0, b + 1.52, 0.1);
      placer(g, tube(0.07, 0.09, 1.3, M.graphite), 0.5, b + 2.1, 0.1); placer(g, cylindre(0.12, 0.12, 0.06, M.lisere, 14), 0.5, b + 1.5, 0.1);
      const t = new THREE.Group(); placer(g, t, 0.5, b + 2.78, 0.1); g.userData.rotor = t; placer(t, cylindre(0.2, 0.2, 0.18, M.lisere, 16), 0, 0, 0);
      for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3, br = placer(t, boite(1.0, 0.06, 0.08, M.blanc, 0.02), Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5); br.rotation.y = -a; placer(t, tube(0.025, 0.025, 0.22, M.graphite), Math.cos(a) * 0.98, -0.12, Math.sin(a) * 0.98); placer(t, cylindre(0.09, 0.12, 0.2, M_POILS, 10), Math.cos(a) * 0.98, -0.3, Math.sin(a) * 0.98); }
    } else if (cle === 'raffineur') { placer(g, cylindre(0.38, 0.3, 0.4, M.graphite, 20), 0, b + 1.7, 0.1); placer(g, cylindre(0.39, 0.39, 0.04, M.lisere, 20), 0, b + 1.92, 0.1); g.userData.rotor = placer(g, boite(0.5, 0.05, 0.05, M.blanc, 0.02), 0, b + 2.05, 0.1); }
    else { const pl = new THREE.Group(); pl.position.set(0, b + 1.55, 0.1); g.add(pl); placer(pl, cylindre(0.5, 0.5, 0.06, M.graphite, 24), 0, 0.03, 0); for (let k = 0; k < 3; k++) { const a = k * 2.094; placer(pl, cylindre(0.1, 0.1, 0.2, M.blanc, 12), Math.cos(a) * 0.3, 0.16, Math.sin(a) * 0.3); placer(pl, cylindre(0.105, 0.105, 0.05, M.lisere, 12), Math.cos(a) * 0.3, 0.28, Math.sin(a) * 0.3); } g.userData.rotor = pl; }
  } else if (d.ruche !== undefined) return fabriquerRuche(d.ruche);
  else if (d.prod) {   // mât, cadre charbon, cellule qui reflète le ciel ; le suiveur tourne vers le soleil
    const b = socle(g, 0.6, 0.6); placer(g, tube(0.06, 0.07, 1.1, M.blanc), 0, b + 0.55, 0);
    const p = new THREE.Group(); p.position.y = b + 1.15; g.add(p); if (cle !== 'suiveur') p.rotation.x = -0.5;
    if (cle === 'double') { g.userData.cellule = panneauSolaire(p, 1.7, 0.9); const p2 = new THREE.Group(); p2.position.set(0, b + 1.75, 0.35); p2.rotation.x = -0.5; g.add(p2); g.userData.cellule2 = panneauSolaire(p2, 1.7, 0.9); placer(g, tube(0.05, 0.05, 0.7, M.blanc), 0, b + 1.45, 0.2); }
    else g.userData.cellule = panneauSolaire(p, cle === 'suiveur' ? 2.0 : 1.7, cle === 'suiveur' ? 1.6 : 1.2);
    if (cle === 'suiveur') { g.userData.tete = p; p.userData.garder = true; placer(g, cylindre(0.16, 0.16, 0.16, M.lisere, 16), 0, b + 1.08, 0); }
    placer(g, boite(0.34, 0.5, 0.2, M.blanc, 0.03), 0, b + 0.3, 0.32); pupitre(g, 0, b + 0.72, 0.31, 0);
  } else if (cle === 'batterie') {
    const b = socle(g, 1.2, 0.9); placer(g, boite(1.3, 1.2, 0.9, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.05), 0, b + 0.6, 0); placer(g, boite(1.34, 0.12, 0.94, M.graphite, 0.03), 0, b + 1.22, 0);
    g.userData.barres = [0, 1, 2, 3].map((k) => { const v = placer(g, boite(0.16, 0.5, 0.03, M.graphite, 0.01), -0.45 + k * 0.2, b + 0.45, -0.46); v.userData.garder = true; return v; }); pupitre(g, 0.05, b + 0.95, -0.46);
  } else if (cle === 'poteau') {
    placer(g, cylindre(0.2, 0.26, 0.2, M.graphite, 12), 0, 0.1, 0); placer(g, tube(0.06, 0.08, 4.2, M.blanc), 0, 2.2, 0); placer(g, boite(1.3, 0.08, 0.1, M.graphite, 0.03), 0, 4.1, 0);
    for (const s of [-1, 1]) placer(g, cylindre(0.06, 0.06, 0.16, M.seve, 10), s * 0.55, 4.22, 0); placer(g, cylindre(0.085, 0.085, 0.05, M.lisere, 12), 0, 1.2, 0);
  } else if (cle === 'silo') {
    const b = socle(g, 1.4, 1.4); placer(g, cylindre(0.72, 0.72, 2.6, M.panneau, 24), 0, b + 1.5, 0); placer(g, cylindre(0.4, 0.74, 0.5, M.blanc, 24), 0, b + 3.05, 0); placer(g, cylindre(0.75, 0.75, 0.08, M.lisere, 24), 0, b + 2.7, 0); placer(g, cylindre(0.76, 0.76, 0.3, M.graphite, 24), 0, b + 0.3, 0);
    placer(g, boite(0.7, 0.22, 0.2, M.graphite, 0.03), 0, b + 0.55, -0.7); pupitre(g, 0, b + 1.3, -0.76);
  } else if (cle === 'depot') {
    const b = socle(g, 1.5, 1.4); placer(g, boite(1.6, 0.8, 1.4, [M.panneau, M.panneau, M.graphite, M.blanc, M.panneau, M.panneau], 0.05), 0, b + 0.4, 0); for (const [x, z] of [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]]) placer(g, boite(0.1, 1.3, 0.1, M.graphite, 0.02), x, b + 1.45, z);
    placer(g, boite(1.8, 0.12, 1.6, M.blanc, 0.05), 0, b + 2.15, 0); placer(g, boite(1.82, 0.05, 1.62, M.lisere, 0.02), 0, b + 2.06, 0); placer(g, boite(0.7, 0.22, 0.2, M.graphite, 0.03), 0, b + 0.5, -0.7); pupitre(g, 0, b + 1.05, -0.71);
    const feu = placer(g, new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), M.seve), 0, b + 2.4, 0); feu.userData.garder = true;
  } else if (cle === 'quai') {
    const b = socle(g, 1.5, 1.5); placer(g, boite(1.7, 0.12, 1.7, M.blanc, 0.04), 0, b + 0.06, 0);
    for (let k = 0; k < 3; k++) placer(g, boite(0.5, 0.012, 0.12, M.lisere, 0.005), 0, b + 0.125, -0.4 + k * 0.4, 0.6);
    for (const s of [-1, 1]) placer(g, boite(0.1, 1.4, 0.1, M.graphite, 0.02), s * 0.75, b + 0.8, 0.7); placer(g, boite(1.6, 0.26, 0.1, M.lisere, 0.03), 0, b + 1.5, 0.7); pupitre(g, 0, b + 1.05, 0.64);
  } else if (cle === 'receptionnaire') {
    const b = corpsMachine(g, 1.7); placer(g, boite(1.0, 0.5, 0.1, M.graphite, 0.03), 0, b + 0.5, 0.78); placer(g, boite(1.5, 0.3, 0.1, M.lisere, 0.03), 0, b + 1.9, 0.1); placer(g, cylindre(0.2, 0.2, 0.5, M.blanc, 16), 0.4, b + 1.95, 0.1); g.userData.rotor = placer(g, boite(0.3, 0.05, 0.05, M.pollen, 0.02), 0.4, b + 2.25, 0.1);
  } else if (cle === 'fondation') { placer(g, cylindre(1.17, 1.19, 0.5, M.blanc, 6), 0, 0.05, 0, Math.PI / 6); placer(g, cylindre(1.2, 1.2, 0.05, M.seve, 6), 0, 0.02, 0, Math.PI / 6); placer(g, cylindre(1.0, 1.0, 0.02, M.graphite, 6), 0, 0.305, 0, Math.PI / 6); placer(g, cylindre(1.185, 1.185, 0.04, M.lisere, 6), 0, 0.28, 0, Math.PI / 6); for (let k = 0; k < 6; k++) placer(g, cylindre(0.04, 0.04, 0.03, M_CHROME, 8), Math.cos(k * Math.PI / 3) * 0.85, 0.315, Math.sin(k * Math.PI / 3) * 0.85); }
  else if (cle === 'plancher') { placer(g, cylindre(1.17, 1.19, 0.12, M.blanc, 6), 0, 0.06, 0, Math.PI / 6); placer(g, cylindre(0.9, 0.9, 0.012, M.lisere, 6), 0, 0.122, 0, Math.PI / 6); }
  else if (cle === 'rampe') {   // un coin plein (rien ne flotte) : stries antidérapantes, bords orange, nez cyan au pied
    const L = 2.1, H = 0.31, a = Math.atan2(H, L);
    placer(g, coin(L, H, 1.8, M.blanc), 0, 0, 0);
    for (let k = 0; k < 6; k++) { const z = 0.82 - k * 0.33; placer(g, boite(1.5, 0.025, 0.08, M.graphite, 0.008), 0, H * (L / 2 - z) / L + 0.01, z).rotation.x = a; }
    for (const s of [-1, 1]) placer(g, boite(0.06, 0.04, Math.hypot(L, H), M.lisere, 0.01), s * 0.87, H / 2 + 0.015, 0).rotation.x = a;
    placer(g, boite(1.8, 0.025, 0.06, M.seve, 0.008), 0, 0.012, L / 2 - 0.04); placer(g, boite(1.8, 0.05, 0.06, M.graphite, 0.01), 0, H - 0.025, -L / 2 + 0.03);
  } else if (cle === 'escalier') {   // marches pleines à nez orange, limons charbon, deux mains courantes sur leurs poteaux
    const L = 2.1, H = 0.95, n = 5, a = Math.atan2(H, L), yb = (z) => H * (L / 2 - z) / L;
    for (let k = 0; k < n; k++) { const z = L / 2 - (k + 0.5) * L / n, y = (k + 1) * H / n; placer(g, boite(1.6, y, L / n + 0.01, M.blanc, 0.02), 0, y / 2, z); placer(g, boite(1.62, 0.025, 0.06, M.lisere, 0.008), 0, y - 0.01, z + L / n / 2 - 0.03); placer(g, boite(1.3, 0.012, L / n - 0.12, M.graphite, 0.004), 0, y + 0.006, z - 0.02); }
    for (const s of [-1, 1]) {
      placer(g, coin(L, H + 0.12, 0.08, M.graphite), s * 0.84, 0, 0);
      for (const z of [L / 2 - 0.2, 0, -L / 2 + 0.2]) placer(g, boite(0.05, 0.9, 0.05, M.graphite, 0.012), s * 0.84, yb(z) + 0.12 + 0.45, z);
      placer(g, boite(0.07, 0.06, Math.hypot(L, H), M.lisere, 0.02), s * 0.84, H / 2 + 1.04, 0).rotation.x = a;
    }
  }
  else if (cle === 'gardecorps') { for (const s of [-1, 1]) placer(g, boite(0.08, 1.0, 0.08, M.graphite, 0.02), s * 0.9, 0.5, 0); placer(g, boite(1.9, 0.07, 0.07, M.blanc, 0.025), 0, 1.0, 0); placer(g, boite(1.9, 0.05, 0.05, M.lisere, 0.02), 0, 0.55, 0); }
  else if (cle === 'eclairage') { placer(g, cylindre(0.16, 0.2, 0.16, M.graphite, 12), 0, 0.08, 0); placer(g, tube(0.045, 0.06, 3, M.blanc), 0, 1.6, 0); placer(g, boite(0.6, 0.07, 0.16, M.graphite, 0.03), 0, 3.1, -0.22); placer(g, boite(0.44, 0.04, 0.12, M_LUM, 0.015), 0, 3.05, -0.26); placer(g, cylindre(0.065, 0.065, 0.05, M.lisere, 12), 0, 1.0, 0); }
  for (const o of [g.userData.rotor, g.userData.voyant, g.userData.cellule, g.userData.cellule2]) if (o) o.userData.garder = true;
  return fusionner(g);
}
// --- Les directions : six voisines par tuile. La pièce garde la tuile vers laquelle elle sort. ---
const dirVers = (id, v) => tangent(dirDe(id, _d2), new V3().subVectors(dirDe(v), dirDe(id, _d2)));
function voisineVers(id, vec) { let best = -2, out = id; for (const v of voisinsDe(id)) { const sc = dirVers(id, v).dot(vec); if (sc > best) { best = sc; out = v; } } return out; }   // la voisine la mieux alignée sur un vecteur
const posTuile = (id) => { const d = dirDe(id); return d.multiplyScalar(sol(d)); };
// --- Poser, démonter, améliorer. ---
function raisonRefus(cle, id, avant) {   // pourquoi on ne peut pas poser ici (ou '' si l'on peut)
  const d = PIECES[cle], p = posTuile(id);
  if (GRILLE.has(id)) return 'Emplacement occupé';
  if (S.credits < d.prix) return 'Crédits insuffisants';
  if (d.tapis && !d.pente && Math.abs(sol(dirDe(avant, _d2)) - sol(dirDe(id, _d))) > 0.45) return 'Pente trop forte : convoyeur montant';
  for (const o of OBSTACLES) if (!o.piece && !o.inactif && !o.ruche && p.distanceTo(o.p) < o.r + 1.1 && ecartObstacle(o, p).d < 1.0) return 'Trop près d’un obstacle';
  for (const s of SALLES) { _c.subVectors(p, s.g.position); if (Math.abs(_c.dot(s.g.userData.ax)) < s.W / 2 + 0.8 && Math.abs(_c.dot(s.g.userData.az)) < s.D / 2 + 0.8) return 'Trop près d’un bâtiment'; }
  if (!d.marche && joueur.p.distanceTo(p) < 1.2) return 'Tu es dessus';
  if (d.ruche === 2 && !ciblesRuche(p, 2).length) return 'À poser dans un secteur';
  return '';
}
const RESEAU = { sale: true };
function poserPiece(cle, id, avant, gratuit = false, niveau = 0) {
  const def = PIECES[cle], pos = posTuile(id), dv = dirVers(id, avant).clone(), up = pos.clone().normalize();
  const p = { cle, id, avant, dv, up, pos, niveau, entrees: [], sortie: null, t: 0, duree: 0, anim: 0, travaille: false, tEcran: Math.random(), panne: false, sale: 0, courant: false, paye: gratuit ? 0 : def.prix, stock: [], alterne: 0, p: pos };
  p.gauche = voisineVers(id, dv.clone().applyAxisAngle(up, Math.PI / 3)); p.droite = voisineVers(id, dv.clone().applyAxisAngle(up, -Math.PI / 3));
  if (def.ruche !== undefined) { p.ruche = installerRuche(pos, def.ruche, dv.clone().negate()); p.ruche.obs.ruche = true; p.g = p.ruche.g; }
  else {
    const g = modelePiece(cle); poserSur(g, pos, dv.clone().negate()); scene.add(g); p.g = g; p.ecran = g.userData.ecran;
    if (def.marche) { p.surcote = { p: pos.clone(), ax: g.userData.ax, az: g.userData.az, hw: 1.12, hd: 1.12, h: def.marche + pos.length() - sol(up), bord: cle === 'passerelle' ? 0.5 : 0.22, incline: !!def.incline }; SURCOTES.push(p.surcote); }
    else if (def.tapis) p.obstacle = boiteDe(g, 0.62, 1.0, { piece: p });
    else if (cle === 'gardecorps') p.obstacle = boiteDe(g, 1.0, 0.12, { piece: p });
    else if (cle === 'eclairage' || cle === 'poteau') p.obstacle = { p: pos.clone(), r: 0.3, piece: p };
    else { p.obstacle = boiteDe(g, 1.0, 1.0, { piece: p, machine: !!def.durees }); p.ombre = ombreContact(g, 1.15); }
    if (p.obstacle) OBSTACLES.push(p.obstacle);
    if (def.durees) INTER.push(p.inter = { p: surSol(pos, 1.3), r: 2.6, piece: p, agir() { ameliorer(p); } });
    if (cle === 'depot') INTER.push(p.inter = { p: surSol(pos, 1.2), r: 2.8, piece: p, agir() { deposerDans(p); } });
  }
  GRILLE.set(id, p); RESEAU.sale = true; S.pieces = GRILLE.size;
  if (p.ecran) dessinerEcran(p);
  if (!gratuit) { S.credits -= def.prix; sauverBientot(); }
  return p;
}
function ameliorer(p) {   // E sur une machine : le niveau suivant, tout de suite
  const prix = prixAmelio(p); if (!prix || S.credits < prix) { sons.refus(); return; }
  S.credits -= prix; p.paye += prix; p.niveau++; sons.achat(); dessinerEcran(p); sauverBientot();
}
function demonter(p, rembourser = true) {   // remboursement intégral (achat et améliorations) ; ce qu'elle contenait est rendu en valeur
  if (p.ruche) retirerRuche(p.ruche); else { scene.remove(p.g); if (p.ombre) scene.remove(p.ombre); }
  GRILLE.delete(p.id); RESEAU.sale = true; S.pieces = GRILLE.size;
  if (p.obstacle) OBSTACLES.splice(OBSTACLES.indexOf(p.obstacle), 1);
  if (p.surcote) SURCOTES.splice(SURCOTES.indexOf(p.surcote), 1);
  if (p.inter) INTER.splice(INTER.indexOf(p.inter), 1);
  let contenu = p.stock.reduce((s, c) => s + c.valeur, 0) + p.entrees.reduce((s, c) => s + c.valeur, 0) + (p.sortie ? p.sortie.valeur : 0);
  for (let k = CAPSULES.length - 1; k >= 0; k--) if (CAPSULES[k].p === p) { contenu += CAPSULES[k].valeur; CAPSULES.splice(k, 1); }
  if (rembourser) S.credits += p.paye + Math.round(contenu);
}
// --- Les capsules : { p (tapis), t (0 → 1), type, valeur }. ---
const CAPSULES = [];
const NCAP = 500, capsules = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.13, 0.22, 4, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.1 }), NCAP);
capsules.count = 0; capsules.castShadow = true; capsules.frustumCulled = false; scene.add(capsules);
const _coul = new THREE.Color();
const occupe = (p) => CAPSULES.some((c) => c.p === p && c.t < 0.55);
function expedier(v, type) { const cr = encaisser(v); S.expedie = (S.expedie || 0) + cr; if (type) noter(type); return cr; }   // vendu par un réceptionnaire
function accepter(n, cap) {   // fait entrer une capsule dans une pièce ; dit si elle l'a prise
  if (!n) return false; const def = PIECES[n.cle];
  if (def.tapis) { if (occupe(n)) return false; CAPSULES.push({ p: n, t: 0, type: cap.type, valeur: cap.valeur, bloque: 0 }); return true; }
  if (n.cle === 'receptionnaire') { n.total = (n.total || 0) + expedier(cap.valeur, cap.type); n.anim = 1; return true; }
  if (def.stock) { if (n.stock.length >= def.stock) return false; n.stock.push({ type: cap.type, valeur: cap.valeur }); return true; }
  if (accepte(def, cap.type) && n.entrees.length < def.besoin * 2) { n.entrees.push({ type: cap.type, valeur: cap.valeur }); return true; }
  return false;
}
const RUCHE_TYPES = ['miel', 'cire', 'cru', 'bougie'];   // la trieuse envoie les produits de la ruche à gauche, le reste tout droit
function sorties(p, cap) {
  if (p.cle === 'aiguillage') { p.alterne ^= 1; return p.alterne ? [p.gauche, p.droite] : [p.droite, p.gauche]; }
  if (p.cle === 'trieuse') return [RUCHE_TYPES.includes(cap.type) ? p.gauche : p.avant];
  return [p.avant];
}
function departs() {   // les tapis qui partent du collecteur
  const out = [], C = COLLECTEUR.position;
  for (const p of GRILLE.values()) if (estTapis(p) && p.pos.distanceTo(C) < 4.6 && p.dv.dot(_c.subVectors(p.pos, C)) > 0.3) out.push(p);
  return out;
}
function enCapsules(contenu) { const l = []; for (const t in contenu) { const r = contenu[t]; let kg = r.kg; while (kg > 1e-6) { const part = Math.min(1, kg); l.push({ type: t, valeur: r.v * part / r.kg }); kg -= part; } } return l; }
function deposerDans(p) {   // E sur un dépôt de terrain : le sac (ou le colis porté) y entre
  const contenu = porte ? porte.contenu : S.sac, caps = enCapsules(contenu);
  if (!caps.length || p.stock.length + caps.length > PIECES[p.cle].stock) { sons.refus(); return; }
  p.stock.push(...caps); if (porte) { porte = null; joueur.lent = 1; } else S.sac = sacVide(); sons.achat(); sauverBientot();
}
// --- Les revenus automatiques. Une ruche dépose son miel et sa cire sur un convoyeur qui la touche (celui vers lequel
//     elle regarde d'abord, sinon n'importe quel convoyeur voisin qui s'en éloigne). Le pollinisateur automatique
//     pollinise les parcelles fanées de son rayon (7 m), puis, quand tout a fleuri, récolte le pollen des fleurs à 40 %
//     de leur prix, sans fin ; il pose chaque lot sur la pièce vers laquelle il regarde. Au bout, un réceptionnaire vend. ---
function venteDirecte(p, cap) {   // une machine autonome encaisse elle-même ; le chiffre s'envole au-dessus d'elle
  const cr = expedier(cap.valeur, cap.type); p.total = (p.total || 0) + cr;
  if (cr > 0 && p.pos.distanceTo(joueur.p) < 30 && gt - (p.tFlot || 0) > 0.6) { p.tFlot = gt; flotter(surSol(p.pos, 2.2), `+${cr}`, ''); }
}
function sortieRuche(p) {
  const a = GRILLE.get(p.avant); if (a && (estTapis(a) || a.cle === 'receptionnaire' || PIECES[a.cle].stock)) return a;
  for (const id of voisinsDe(p.id)) { const n = GRILLE.get(id); if (n && estTapis(n) && n.avant !== p.id) return n; }
  return null;
}
function recolteAuto(p) {
  if (!p.cibles) { p.cibles = ciblesRuche(p.pos, 1); p.ic = 0; }
  const c = p.cibles; if (!c.length) return null;
  for (let n = 0; n < c.length; n++) { const k = c[(p.ic + n) % c.length]; if (pollinisable(k)) { p.ic = (p.ic + n + 1) % c.length; const v = polliniser(k, 'machine'); return { type: 'pollen', valeur: v }; } }
  for (let n = 0; n < c.length; n++) { const k = c[(p.ic + n) % c.length]; if (T.vert[k]) { p.ic = (p.ic + n + 1) % c.length; if (p.pos.distanceTo(joueur.p) < 45) bouffee(T.pos[k], 5, CHARTE.pollen); return { type: 'pollen', valeur: prixTuile(k) * 0.4 }; } }
  return null;
}
// --- L'électricité. ---
const ENERGIE = { prod: 0, conso: 0, charge: 0, reserve: 0, arretees: [], bourrages: 0 };
function majReseaux() {   // regroupe les pièces d'énergie reliées, rattache chaque machine au réseau le plus proche
  RESEAU.sale = false; const en = [...GRILLE.values()].filter((p) => PIECES[p.cle].energie); let n = 0;
  for (const p of en) p.reseau = -1;
  for (const p of en) { if (p.reseau >= 0) continue; const file = [p]; p.reseau = n; while (file.length) { const a = file.pop(); for (const b of en) if (b.reseau < 0 && a.pos.distanceTo(b.pos) < PORTEE_RESEAU) { b.reseau = n; file.push(b); } } n++; }
  for (const p of GRILLE.values()) { if (!PIECES[p.cle].conso) continue; p.reseau = -1; let bd = PORTEE_RESEAU; for (const e of en) { const d = e.pos.distanceTo(p.pos); if (d < bd) { bd = d; p.reseau = e.reseau; } } }
  RESEAU.n = n;
}
const ensoleillement = (p, suit) => lisse(-0.05, suit ? 0.08 : 0.3, p.up.dot(SOLEIL));
function majEnergie(dt) {
  if (RESEAU.sale) majReseaux();
  const R = Array.from({ length: RESEAU.n }, () => ({ prod: 0, conso: 0, bats: [] }));
  for (const p of GRILLE.values()) {
    const d = PIECES[p.cle];
    if (d.prod) { p.sale = Math.min(1, p.sale + dt / 180); p.puissance = p.sale >= 1 ? 0 : d.prod * ensoleillement(p, p.cle === 'suiveur'); R[p.reseau].prod += p.puissance; }
    else if (d.reserve) R[p.reseau].bats.push(p);
    else if (d.conso && p.reseau >= 0 && (p.veut || d.tapis)) R[p.reseau].conso += d.conso;
  }
  ENERGIE.prod = ENERGIE.conso = ENERGIE.charge = ENERGIE.reserve = 0;
  for (const r of R) {
    let reste = (r.prod - r.conso) * dt; r.ok = true;
    for (const b of r.bats) { const c0 = b.charge || 0, c1 = clamp(c0 + reste, 0, PIECES.batterie.reserve); reste -= c1 - c0; b.charge = c1; ENERGIE.charge += c1; ENERGIE.reserve += PIECES.batterie.reserve; }
    if (reste < -1e-6) r.ok = false;   // ni soleil ni batterie : le réseau ne suffit pas
    ENERGIE.prod += r.prod; ENERGIE.conso += r.conso;
  }
  for (const p of GRILLE.values()) if (PIECES[p.cle].conso) p.courant = p.reseau >= 0 && R[p.reseau].ok;
  toitureSolaire(dt);   // la toiture du hall comble ce qui manque, vend le reste
}
let tSilo = 0;
MAJ.push((dt) => {
  majEnergie(dt);
  // Le silo du collecteur envoie une capsule par kilo sur les tapis de départ.
  tSilo += dt;
  if (tSilo > 0.7) for (const p of departs()) { const type = Object.keys(S.silo).find((t) => S.silo[t].kg >= 1 - 1e-6); if (!type) break; const r = S.silo[type], v = r.v / r.kg; if (accepter(p, { type, valeur: v })) { r.v -= v; r.kg = +(r.kg - 1).toFixed(3); tSilo = 0; } }
  for (const c of COLIS_ENTREE) if (c.restes.length && accepter(c.p, c.restes[0])) c.restes.shift();   // colis déposés en tête de tapis
  for (let k = COLIS_ENTREE.length - 1; k >= 0; k--) if (!COLIS_ENTREE[k].restes.length) COLIS_ENTREE.splice(k, 1);
  ENERGIE.arretees = [];
  const pres = (p) => p.pos.distanceTo(joueur.p) < 45;
  for (const p of GRILLE.values()) {
    const def = PIECES[p.cle], ud = p.g.userData;
    if (def.prod) { ud.cellule.material = p.sale >= 1 ? M_CELLULE_SALE : M_CELLULE; if (ud.cellule2) ud.cellule2.material = ud.cellule.material; if (ud.tete && pres(p)) { _vp.copy(SOLEIL).applyQuaternion(_q.copy(p.g.quaternion).invert()); ud.tete.rotation.set(-Math.atan2(Math.hypot(_vp.x, _vp.z), Math.max(0.2, _vp.y)), Math.atan2(-_vp.x, -_vp.z), 0, 'YXZ'); } }
    if (ud.barres && pres(p)) ud.barres.forEach((b, k) => { b.material = (p.charge || 0) / def.reserve > k / 4 + 0.02 ? M.seve : M.graphite; });
    if (p.ruche) { p.t += dt; const r = p.ruche, type = r.miel >= 1 ? 'miel' : r.cire >= 1 ? 'cire' : null; if (type && p.t > 0.8) { const n = sortieRuche(p), cap = { type, valeur: type === 'miel' ? PRIX_MIEL : PRIX_CIRE }; if (n ? accepter(n, cap) : (venteDirecte(p, cap), true)) { r[type]--; p.t = 0; noter(type); } } }   // miel et cire partent seuls : par le convoyeur s'il y en a un, sinon vendus sur place
    if (def.emet) { p.t += dt; if (p.t > 0.7 && p.stock.length && accepter(GRILLE.get(p.avant), p.stock[0])) { p.stock.shift(); p.t = 0; } }
    if (def.durees) {
      if (p.sortie && accepter(GRILLE.get(p.avant), p.sortie)) p.sortie = null;
      else if (p.sortie && def.auto && !GRILLE.get(p.avant)) { venteDirecte(p, p.sortie); p.sortie = null; }   // rien devant lui : il vend lui-même
      p.veut = !p.sortie && (def.auto || p.entrees.length >= def.besoin); p.travaille = p.veut && !p.panne;
      const alim = !def.conso || p.courant;   // une machine sans consommation n'a pas besoin du réseau
      if (p.panne || (p.veut && !alim)) ENERGIE.arretees.push(p);
      if (p.panne && pres(p) && Math.random() < dt * 6) bouffee(surSol(p.pos, 1.5), 2, 0x8a8d90);   // elle fume
      if (p.travaille) {
        const v = alim ? 1 : 0.25; p.duree = def.durees[p.niveau]; p.t += dt * v; p.anim += dt * 9 * v;
        if (p.t >= p.duree) { p.t = 0; if (def.auto) { p.sortie = recolteAuto(p); if (p.sortie) noter('pollen'); } else { const lot = p.entrees.splice(0, def.besoin); p.sortie = { type: def.sortie, valeur: lot.reduce((s, c) => s + c.valeur, 0) * def.mult }; noter(def.sortie); } }
      } else p.t = 0;
      if (pres(p)) { if (ud.rotor && p.travaille) ud.rotor.rotation.y += dt * 8 * (alim ? 1 : 0.25); ud.voyant.material = p.panne || (p.veut && !alim) ? (Math.sin(gt * 20) > 0 ? M_ROUGE : M.graphite) : p.travaille ? (Math.sin(gt * 12) > 0 ? M.seve : M.graphite) : p.sortie ? M.lisere : M.graphite; }
    }
    if (p.ecran && pres(p)) { p.tEcran += dt; if (p.tEcran > 0.25) { p.tEcran = 0; dessinerEcran(p); } }
  }
  // Les capsules avancent ; au bout du tapis : la pièce suivante les prend, ou elles attendent (bourrage).
  ENERGIE.bourrages = 0; const bloques = new Set();
  for (let k = CAPSULES.length - 1; k >= 0; k--) {
    const c = CAPSULES[k], d = PIECES[c.p.cle], gene = CAPSULES.some((o) => o !== c && o.p === c.p && o.t > c.t && o.t - c.t < 0.3);
    if (!gene) c.t = Math.min(1, c.t + dt * d.vitesse * (d.conso && !c.p.courant ? 0.25 : 1));
    if (c.t < 1) { c.bloque = 0; continue; }
    let pris = false; for (const id of sorties(c.p, c)) { const n = GRILLE.get(id); if (n && n !== c.p && accepter(n, c)) { pris = true; break; } }
    if (pris) CAPSULES.splice(k, 1); else { c.bloque += dt; if (c.bloque > 3) bloques.add(c.p); }
  }
  ENERGIE.bourrages = bloques.size;
  let i = 0;
  for (const c of CAPSULES) { if (i >= NCAP) break; const p = c.p; if (!pres(p)) continue; _p.copy(p.pos).addScaledVector(p.dv, (c.t - 0.5) * PAS).addScaledVector(p.up, p.cle === 'pied' ? 1.04 : 0.64); _m.compose(_p, p.g.quaternion, _s.set(1, 1, 1)); capsules.setMatrixAt(i, _m); capsules.setColorAt(i, _coul.set(COULEUR_CAPSULE[c.type] || 0xffffff)); i++; }
  capsules.count = i; capsules.instanceMatrix.needsUpdate = true; if (capsules.instanceColor) capsules.instanceColor.needsUpdate = true;
  tapis.offset.y = (tapis.offset.y + dt * 0.6) % 1;
});
// Le collecteur : s'il a un tapis de départ, E y dépose le sac dans le silo ; sinon il le vend.
{ const it = INTER.find((i) => i.vente), a0 = it.agir; it.agir = () => { if (!porte && departs().length && kgSac() > 0) { for (const t in S.sac) ajouter(t, S.sac[t].kg, S.sac[t].v, S.silo); S.sac = sacVide(); sons.achat(); ecrireEcran(ECRAN_COLLECTEUR, `${Math.floor(kgSac(S.silo))} kg`); return; } a0(); }; }
// Un colis déposé au bout d'un tapis part en capsules (une par kilo et par ressource) ; sur un quai ou un dépôt, il est stocké.
const COLIS_ENTREE = [];
DEPOSER_COLIS.push((c) => {
  const p = GRILLE.get(tuileDe(_d.copy(joueur.p).addScaledVector(joueur.f, 1.6).normalize())); if (!p) return false;
  if (PIECES[p.cle].stock) { const caps = enCapsules(c.contenu); if (p.stock.length + caps.length > PIECES[p.cle].stock) return false; p.stock.push(...caps); sons.achat(); return true; }
  if (estTapis(p)) { COLIS_ENTREE.push({ p, restes: enCapsules(c.contenu) }); sons.achat(); return true; }
  return false;
});
// Réparer une machine en panne, brosser un panneau encrassé : on les vise de près et on maintient (2 s, 1,5 s).
const machinesEnPanne = () => [...GRILLE.values()].filter((p) => p.panne);
const panneauxSales = () => [...GRILLE.values()].filter((p) => PIECES[p.cle].prod && p.sale >= 1);
ACTIONS.push({ quand: (v) => !!objetVise(v, machinesEnPanne(), 1.6), duree: 2, objet: (v) => surSol(objetVise(v, machinesEnPanne(), 1.6).pos, 2.4), faire(v) { objetVise(v, machinesEnPanne(), 1.6).panne = false; sons.achat(); } });
ACTIONS.push({ quand: (v) => brosseEnMain() && !!objetVise(v, panneauxSales(), 1.6), duree: 1.5, objet: (v) => surSol(objetVise(v, panneauxSales(), 1.6).pos, 2.1), faire(v) { const p = objetVise(v, panneauxSales(), 1.6); p.sale = 0; sons.pop(); bouffee(surSol(p.pos, 1.4), 20, 0x8a6a3a); } });
// Les pannes : toutes les 4 à 7 minutes, une machine qui tourne s'arrête et fume jusqu'à ce qu'on la répare.
const PANNES = { prochaine: 240 + Math.random() * 180 };
MAJ.push((dt) => { PANNES.prochaine -= dt; if (PANNES.prochaine > 0) return; PANNES.prochaine = 240 + Math.random() * 180; const l = [...GRILLE.values()].filter((p) => PIECES[p.cle].durees && !p.panne); if (l.length) { l[Math.floor(Math.random() * l.length)].panne = true; sons.refus(); } });
REPERES_CARTE.push(() => [...GRILLE.values()].map((p) => p.pos));
VOYAGES.push(() => [...GRILLE.values()].filter((p) => p.cle === 'depot').map((p) => ({ p: surSol(new V3().copy(p.pos).addScaledVector(p.dv, -2.4)), nom: 'Dépôt' })));

// --- Le mode construction. ---
const fantome = new THREE.Group(), M_FANT = new THREE.MeshBasicMaterial({ color: 0x53d17a, transparent: true, opacity: 0.42, depthWrite: false }), M_RAYON = new THREE.MeshBasicMaterial({ color: 0x3b8fe0, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const fleche = placer(fantome, new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 3).rotateX(-Math.PI / 2), M_FANT), 0, 1.3, -0.5);
fantome.visible = false; scene.add(fantome);
// Le mode supprimer : la pièce visée est cernée d'un hexagone rouge qui monte jusqu'à mi-hauteur.
const marqueSuppr = new THREE.Group(), M_SUPPR = new THREE.MeshBasicMaterial({ color: 0xe0452f, transparent: true, opacity: 0.35, depthWrite: false });
placer(marqueSuppr, new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 2.4, 6, 1, true), M_SUPPR), 0, 1.2, 0, Math.PI / 6); placer(marqueSuppr, new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.05, 6), new THREE.MeshBasicMaterial({ color: 0xe0452f })), 0, 0.03, 0, Math.PI / 6);
marqueSuppr.visible = false; scene.add(marqueSuppr);
const CONS = {
  get actif() { return outilEnMain === 'marteau' && !joueur.enVehicule && !CARTE.ouverte; },
  cat: 0, piece: 'convoyeur', rot: 0, verrou: null, suppr: false, cible: null, avant: false, modele: null, raison: '', cercle: null, cercleCle: '', outilAvant: 'pinceau',
  basculer() { if (outilEnMain === 'marteau') changerOutil(S.outils.includes(this.outilAvant) ? this.outilAvant : 'pinceau'); else if (S.outils.includes('marteau') && !joueur.enVehicule) { this.outilAvant = outilEnMain; changerOutil('marteau'); } else sons.refus(); },
  choisir(cle) { this.piece = cle; this.cat = PIECES[cle].cat; majFantome(); majBarre(); },
  categorie(c) { if (c === this.cat) return; this.cat = c; this.choisir(Object.keys(PIECES).find((k) => PIECES[k].cat === c)); },
  suivante() { const l = Object.keys(PIECES).filter((k) => PIECES[k].cat === this.cat); this.choisir(l[(l.indexOf(this.piece) + 1) % l.length]); },
};
function majFantome() {   // le fantôme montre la pièce elle-même, translucide
  if (CONS.modele) fantome.remove(CONS.modele);
  const m = modelePiece(CONS.piece); m.traverse((o) => { if (o.isMesh) { o.material = M_FANT; o.castShadow = o.receiveShadow = false; } }); fantome.add(m); CONS.modele = m;
}
const barre = $('barreCons');
function majBarre() {
  barre.querySelector('.cats').innerHTML = CATEGORIES.map((c, k) => `<button type="button" data-tactile data-cat="${k}" class="${k === CONS.cat ? 'actif' : ''}"><i>${k + 1}</i>${c}</button>`).join('');
  barre.querySelector('.items').innerHTML = Object.keys(PIECES).filter((k) => PIECES[k].cat === CONS.cat).map((k) => `<button type="button" data-tactile data-piece="${k}" class="${k === CONS.piece ? 'actif' : ''}">${PIECES[k].nom}<b>${PIECES[k].prix.toLocaleString('fr-FR')}</b></button>`).join('');
}
barre.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); e.preventDefault();
  if (b.dataset.cat !== undefined) CONS.categorie(+b.dataset.cat); else if (b.dataset.piece) CONS.choisir(b.dataset.piece); else if (b.id === 'consTourner') E.tourner = true; else if (b.id === 'consVerrou') E.verrou = true; else if (b.id === 'consSuppr') E.suppr = true; else if (b.id === 'consFermer') E.construire = true;
});
$('construire').addEventListener('pointerdown', (e) => { E.construire = true; e.stopPropagation(); e.preventDefault(); });
majFantome(); majBarre();
PASTILLE.push(() => CONS.actif ? { nom: PIECES[CONS.piece].nom, texte: `${PIECES[CONS.piece].prix.toLocaleString('fr-FR')} CR` } : null);
function viseeLoin(portee = 12) { camera.getWorldDirection(_dir); const o = camera.position; for (let t = 0.5; t <= portee; t += 0.1) { _vp.copy(o).addScaledVector(_dir, t); const l = _vp.length(); _d.copy(_vp).multiplyScalar(1 / l); if (l <= Math.max(sol(_d), RP + NIVEAU_MER) + surcote(_vp)) return _vp.clone(); } return null; }
function rayonDe(cle) { const d = PIECES[cle]; return d.energie ? PORTEE_RESEAU : d.ruche !== undefined ? RAYONS_RUCHE[d.ruche] : 0; }
function montrerCercle(pos, cle) {   // le rayon d'action (ruche, réseau électrique) : un cercle bleu translucide au sol
  const r = pos ? rayonDe(cle) : 0, c = r ? pos.x.toFixed(1) + pos.y.toFixed(1) + cle : '';
  if (c === CONS.cercleCle) return; CONS.cercleCle = c;
  if (CONS.cercle) { scene.remove(CONS.cercle); CONS.cercle.geometry.dispose(); CONS.cercle = null; }
  if (r) CONS.cercle = disqueSol(pos, r, M_RAYON, 0.35);
}
MAJ.push(() => {
  if (E.construire) { E.construire = false; CONS.basculer(); }
  const actif = CONS.actif;
  if (barre.hidden === actif) { barre.hidden = !actif; SOL_U.uCons.value = actif ? 1 : 0; jeu.classList.toggle('cons', actif); }
  fantome.visible = false; CONS.cible = null;
  marqueSuppr.visible = false;
  if (!actif) { CONS.avant = E.action; montrerCercle(null); E.tourner = E.verrou = E.suppr = false; E.molette = 0; if (CONS.suppr) { CONS.suppr = false; jeu.classList.remove('suppr'); $('consSuppr').classList.remove('actif'); } return; }
  if (E.suppr) { CONS.suppr = !CONS.suppr; jeu.classList.toggle('suppr', CONS.suppr); $('consSuppr').classList.toggle('actif', CONS.suppr); E.suppr = false; }
  if (E.outil >= 0 && E.outil < 5) CONS.categorie(E.outil);
  if (E.tourner) CONS.rot = (CONS.rot + 1) % 6;
  if (E.molette) CONS.rot = (CONS.rot + E.molette + 6) % 6;
  if (E.verrou) CONS.verrou = CONS.verrou ? null : tangent(joueur.p, joueur.f).applyAxisAngle(joueur.haut, -CONS.rot * Math.PI / 3);   // direction figée
  if (E.inter) CONS.suivante();
  E.tourner = E.verrou = false; E.molette = 0;
  $('consVerrou').classList.toggle('actif', !!CONS.verrou);
  const v = viseeLoin(); let raison = '';
  if (v) {
    const id = tuileDe(_d.copy(v).normalize()), p = GRILLE.get(id), vec = CONS.verrou ? tangent(v, CONS.verrou) : tangent(v, joueur.f).applyAxisAngle(_d.copy(v).normalize(), -CONS.rot * Math.PI / 3), avant = voisineVers(id, vec);
    raison = CONS.suppr ? (p ? `Supprimer : ${PIECES[p.cle].nom} (+${fmtCr(p.paye)} cr)` : 'Vise une pièce posée') : p ? 'Emplacement occupé : X pour supprimer' : raisonRefus(CONS.piece, id, avant);
    CONS.cible = { id, p, avant, ok: !p && !raison };
    if (CONS.suppr) { if (p) { marqueSuppr.visible = true; poserSur(marqueSuppr, p.pos, p.dv.clone().negate()); } montrerCercle(null); }
    else if (!p) { fantome.visible = true; poserSur(fantome, posTuile(id), dirVers(id, avant).clone().negate()); M_FANT.color.set(CONS.cible.ok ? 0x53d17a : 0xd9534f); fleche.visible = !!PIECES[CONS.piece].tapis || !!PIECES[CONS.piece].emet || !!PIECES[CONS.piece].durees; montrerCercle(posTuile(id), CONS.piece); }
    else montrerCercle(p.pos, p.cle);   // pièce posée sélectionnée : on voit son rayon
    if (E.presse || (E.action && !CONS.avant)) {
      if (CONS.suppr) { if (p) { bouffee(surSol(p.pos, 0.8), 24, 0x8a8d90); demonter(p); sons.arrache(); sauverBientot(); } else sons.refus(); }   // mode supprimer : la pièce visée part, remboursée
      else if (CONS.cible.ok) { poserPiece(CONS.piece, id, avant); sons.pop(); }
      else sons.refus();
    }
  } else montrerCercle(null);
  if (raison !== CONS.raison) { CONS.raison = raison; $('consRaison').textContent = raison; }
  CONS.avant = E.action;
});

// --- Le tableau de supervision de la station : production par minute et par ressource, électricité (production,
//     consommation, marge), machines à l'arrêt en rouge, bourrages de convoyeur en orange. ---
let tSuperv = 0;
function parMinute(type) { const l = DEBITS[type]; if (!l) return 0; while (l.length && gt - l[0] > 60) l.shift(); return l.length; }
function dessinerSupervision() {
  const e = ECRAN_SUPERVISION, g = e.g; fond(e); g.textAlign = 'left';
  g.fillStyle = '#edeae4'; g.font = '800 34px system-ui'; g.fillText('SUPERVISION', 30, 38); g.fillStyle = '#f08a24'; g.fillRect(30, 62, 964, 4);
  g.font = '800 24px system-ui'; let y = 100;
  for (const t of Object.keys(NOMS_PRODUITS)) { const n = parMinute(t); g.fillStyle = n ? '#edeae4' : '#6c7076'; g.fillText(NOMS_PRODUITS[t], 30, y); g.fillStyle = n ? '#f4b41a' : '#6c7076'; g.fillText(`${n}/min`, 260, y); y += 36; }
  const marge = ENERGIE.prod - ENERGIE.conso; let x = 430; y = 100;
  g.fillStyle = '#4fd6e3'; g.fillText('ÉLECTRICITÉ', x, y); y += 40;
  const ligne = (nom, val, coul) => { g.fillStyle = '#edeae4'; g.fillText(nom, x, y); g.fillStyle = coul; g.fillText(val, x + 250, y); y += 36; };
  const kw = (v) => `${v.toFixed(1).replace('.', ',')} kW`;
  ligne('Production', kw(ENERGIE.prod), '#4fd6e3'); ligne('Consommation', kw(ENERGIE.conso), '#f4b41a'); ligne('Marge', (marge >= 0 ? '+' : '−') + kw(Math.abs(marge)), marge >= 0 ? '#53d17a' : '#e0452f');
  ligne('Batteries', ENERGIE.reserve ? `${Math.round(ENERGIE.charge / ENERGIE.reserve * 100)} %` : '—', '#4fd6e3'); y += 16;
  g.fillStyle = ENERGIE.arretees.length ? '#e0452f' : '#6c7076'; g.fillText(`Machines à l’arrêt : ${ENERGIE.arretees.length}`, x, y); y += 34;
  g.font = '800 20px system-ui'; for (const p of ENERGIE.arretees.slice(0, 3)) { g.fillText(`${PIECES[p.cle].nom} (${p.panne ? 'panne' : 'sans courant'})`, x + 20, y); y += 28; }
  g.font = '800 24px system-ui'; g.fillStyle = ENERGIE.bourrages ? '#f08a24' : '#6c7076'; g.fillText(`Bourrages de convoyeur : ${ENERGIE.bourrages}`, x, y + 6);
  e.maj();
}
MAJ.push((dt) => { tSuperv += dt; if (tSuperv < 1 || DEDANS.salle !== STATION.userData.salle) return; tSuperv = 0; dessinerSupervision(); });
