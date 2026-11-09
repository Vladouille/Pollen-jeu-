
// =====================================================================
// 15. La pollinisatrice : cabine blanche, deux cuves, tuyaux annelés, tête de brosse à l'avant,
//     six roues. Elle pollinise une bande de 3 m en roulant (0,25 s par tuile) et garde 150 kg dans ses cuves.
//     Achetée au garage ; E pour monter et descendre ; E près du collecteur vide les cuves.
// =====================================================================
const PRIX_VEHICULE = 6000, CUVES = 150, DUREE_VEHICULE = 0.25;
const V = { possede: false, x: 0, z: 0, yaw: 0, v: 0, charge: 0, valeur: 0, contact: new Map() };
const VEHICULE = new THREE.Group();
{
  const g = VEHICULE, c = new THREE.Group(); g.add(c); g.userData.caisse = c;
  placer(c, boite(2.3, 0.35, 5.2, M.graphite, 0.06), 0, 0.75, 0);                                 // châssis
  placer(c, boite(2.36, 0.05, 5.26, M.seve, 0.02), 0, 0.58, 0);                                   // bande lumineuse
  // Cabine à l'avant (-z), vitrée sur trois côtés : montants graphite, toit blanc.
  placer(c, boite(2.2, 0.55, 1.7, M.blanc, 0.06), 0, 1.2, -1.45);
  for (const [x, z] of [[-1.05, -2.25], [1.05, -2.25], [-1.05, -0.65], [1.05, -0.65]]) placer(c, boite(0.1, 1.15, 0.1, M.graphite, 0.03), x, 2.05, z);
  placer(c, boite(2.3, 0.14, 1.8, M.blanc, 0.05), 0, 2.68, -1.45);
  placer(c, boite(2.32, 0.04, 1.82, M.pollen, 0.015), 0, 2.59, -1.45);
  placer(c, boite(1.9, 0.18, 0.4, M.graphite, 0.04), 0, 1.6, -2.05);                              // tableau de bord
  g.userData.ecran = placer(c, new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.14), ecran('0 / 150 kg')), 0.45, 1.7, -1.84).material; c.children[c.children.length - 1].rotation.x = -0.6;
  placer(c, new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 24), M.graphite), -0.45, 1.75, -1.8).rotation.x = -0.9;   // volant
  // Deux cuves cylindriques blanches à bagues jaunes, reliées par des tuyaux annelés à la tête de brosse.
  for (const s of [-1, 1]) {
    const cuve = placer(c, new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.6, 6, 18).rotateX(Math.PI / 2), M.blanc), s * 0.58, 1.5, 1.2); cuve.castShadow = true;
    for (const z of [0.5, 1.9]) placer(c, new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.04, 8, 24), M.pollen), s * 0.58, 1.5, z);
    for (let k = 0; k < 16; k++) { const t = k / 15, z = lerp(0.3, -3.0, t), y = 1.55 + Math.sin(t * Math.PI) * 0.35 - t * 1.1; placer(c, new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12), M.graphite), s * 1.2, y, z); }   // tuyau annelé
  }
  // Tête de brosse : carter blanc, rouleau de poils jaune pollen, sur deux bras.
  const tete = new THREE.Group(); tete.position.set(0, 0.45, -3.15); c.add(tete);
  placer(tete, boite(3.3, 0.35, 0.55, M.blanc, 0.06), 0, 0.25, 0);
  placer(tete, boite(3.34, 0.05, 0.58, M.pollen, 0.02), 0, 0.42, 0);
  const rouleau = placer(tete, new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.1, 18).rotateZ(Math.PI / 2), M_POILS), 0, -0.05, 0); g.userData.rouleau = rouleau;
  for (const s of [-1, 1]) placer(c, boite(0.12, 0.12, 0.9, M.graphite, 0.03), s * 0.9, 0.7, -2.7);
  // Six roues graphite à moyeu jaune.
  g.userData.roues = [];
  for (const z of [-1.7, 0, 1.7]) for (const s of [-1, 1]) {
    const r = new THREE.Group(); r.position.set(s * 1.2, 0.45, z); g.add(r);
    placer(r, new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.36, 22).rotateZ(Math.PI / 2), M.graphite), 0, 0, 0);
    placer(r, new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.38, 12).rotateZ(Math.PI / 2), M.pollen), 0, 0, 0);
    g.userData.roues.push(r);
  }
  c.children.find((o) => o.material === g.userData.ecran).userData.garder = true; rouleau.userData.garder = true;
  fusionner(c); for (const r of g.userData.roues) fusionner(r);
  const gx = GARAGE.position.x, gz = GARAGE.position.z, l = Math.hypot(gx, gz);
  V.x = gx - gx / l * 6.5; V.z = gz - gz / l * 6.5; V.yaw = Math.atan2(gx, gz);   // garée devant le garage, nez vers la place
  scene.add(g);
}
const obstVehicule = { x: V.x, z: V.z, r: 2.2 }; OBSTACLES.push(obstVehicule);
const eclairVehicule = () => { const f = [-Math.sin(V.yaw), -Math.cos(V.yaw)]; return { fx: f[0], fz: f[1], rx: Math.cos(V.yaw), rz: -Math.sin(V.yaw) }; };
function majVehicule(dt) {
  const { fx, fz, rx, rz } = eclairVehicule();
  if (joueur.enVehicule) {
    const cible = E.mz * (E.mz > 0 ? 7 : 3);
    V.v = lerp(V.v, cible, 1 - Math.exp(-dt * (Math.abs(cible) > Math.abs(V.v) ? 1.2 : 2.5)));
    const dyaw = -E.mx * 0.8 * clamp(V.v / 4, -1, 1) * dt; V.yaw += dyaw; joueur.yaw += dyaw;   // le regard suit le virage
    let nx = V.x + fx * V.v * dt, nz = V.z + fz * V.v * dt;
    for (const o of OBSTACLES) { if (o === obstVehicule) continue; const dx = nx - o.x, dz = nz - o.z, d = Math.hypot(dx, dz), min = o.r + 2.0; if (d < min && d > 1e-5) { nx = o.x + dx / d * min; nz = o.z + dz / d * min; } }
    const d0 = Math.hypot(nx, nz); if (d0 > RAYON - 3) { nx *= (RAYON - 3) / d0; nz *= (RAYON - 3) / d0; V.v *= 0.5; }
    V.x = nx; V.z = nz;
    // Pollinise la bande de 3 m sous la tête de brosse : chaque tuile doit rester 0,25 s sous la brosse.
    const vues = new Set();
    for (let k = -2; k <= 2; k++) {
      const x = V.x + fx * 3.15 + rx * k * 0.75, z = V.z + fz * 3.15 + rz * k * 0.75, [q, r] = versHex(x, z), i = idxDe(q, r);
      if (!pollinisable(i) || vues.has(i)) continue; vues.add(i);
      const t = (V.contact.get(i) || 0) + dt; V.contact.set(i, t);
      if (t >= DUREE_VEHICULE && V.charge < CUVES) { const v = polliniser(i, 'vehicule'); if (v > 0) { V.charge += KG_TUILE; V.valeur += v; sons.pop(); } }
    }
    for (const i of V.contact.keys()) if (!vues.has(i)) V.contact.delete(i);   // sortie de sous la brosse : on recommence
    // L'œil du conducteur, dans la cabine.
    joueur.x = V.x + fx * 0.85; joueur.z = V.z + fz * 0.85; joueur.y = H(V.x, V.z) + 0.75; joueur.vitesse = 0;
  }
  VEHICULE.position.set(V.x, H(V.x, V.z), V.z); VEHICULE.rotation.y = V.yaw;
  const av = H(V.x + fx * 2, V.z + fz * 2), ar = H(V.x - fx * 2, V.z - fz * 2); VEHICULE.userData.caisse.rotation.x = Math.atan2(av - ar, 4) * -1;
  for (const r of VEHICULE.userData.roues) r.rotation.x -= V.v * dt / 0.45;
  VEHICULE.userData.rouleau.rotation.x -= dt * (Math.abs(V.v) > 0.6 ? 14 : 0);
  obstVehicule.x = V.x; obstVehicule.z = V.z;
  if (V.affiche !== V.charge) { V.affiche = V.charge; ecrireEcran(VEHICULE.userData.ecran, `${Math.round(V.charge)} / ${CUVES} kg`); }   // l'écran du tableau de bord
}
MAJ.push(majVehicule);
// Après le véhicule, la caméra se recale sur l'œil du conducteur (sans balancement de marche).
MAJ.push(() => { if (joueur.enVehicule) majCamera(); });
function monter() { joueur.enVehicule = true; obstVehicule.r = 0; }
function descendre() {
  const { rx, rz } = eclairVehicule(); joueur.enVehicule = false; V.v = 0; obstVehicule.r = 2.2;
  joueur.x = V.x - rx * 2.4; joueur.z = V.z - rz * 2.4; joueur.y = H(joueur.x, joueur.z);
}
const presDuCollecteur = () => Math.hypot(V.x - COLLECTEUR.position.x, V.z - COLLECTEUR.position.z) < 8;
function viderCuves() { if (V.valeur <= 0) return false; const cr = Math.round(V.valeur); S.credits += cr; S.ventes++; sons.vente(); ecrireEcran(ECRAN_COLLECTEUR, `+${cr} cr`); V.charge = 0; V.valeur = 0; return true; }
INTER_HORS.unshift(() => { if (!joueur.enVehicule) return false; if (presDuCollecteur() && viderCuves()) return true; descendre(); return true; });
INTER.push({ get x() { return V.x; }, get z() { return V.z; }, r: 3.6,   // à vendre au garage, tout de suite ; E pour monter
  agir() {
    if (V.possede) { monter(); return; }
    if (S.credits < PRIX_VEHICULE) { sons.refus(); return; }
    S.credits -= PRIX_VEHICULE; V.possede = true; sons.achat();
  } });
PASTILLE.push(() => joueur.enVehicule ? { nom: 'Pollinisatrice', charge: V.charge, max: CUVES } : null);
