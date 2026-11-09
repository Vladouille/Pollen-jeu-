
// =====================================================================
// 10. Les bâtiments, en façades modulaires : un bâtiment est une rangée de modules de 2 m
//     (porte, vitrine, panneau à grille, volet roulant, écran) sous une corniche blanche et un bandeau graphite,
//     posée sur le même socle étagé que les machines. Les trois bâtiments partagent les mêmes modules.
// =====================================================================
const MODULE = 2;
const M_VITRE = new THREE.MeshStandardMaterial({ color: 0x1d2a33, roughness: 0.08, metalness: 0.6, envMapIntensity: 1 });
const M_GRIS = new THREE.MeshStandardMaterial({ color: 0x8a8d90, roughness: 0.8 });   // présentoir hors de prix : grisé
function texteTex(lignes, w = 512, h = 128, fond = '#ece8df', encre = '#2f3338') {
  return texture(w, h, (g) => {
    g.fillStyle = fond; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    lignes.forEach(([t, taille, couleur], k) => { g.fillStyle = couleur || encre; let f = taille; do { g.font = `800 ${f}px system-ui, sans-serif`; f -= 2; } while (g.measureText(t).width > w * 0.9 && f > 10); g.fillText(t, w / 2, h * (k + 0.5) / lignes.length + 2); });
    g.fillStyle = '#f4b41a'; g.fillRect(w * 0.1, h - 10, w * 0.8, 5);
  });
}
function moduleFacade(type, haut) {   // un module de 2 m de large, face vers +z, posé à y = 0
  const g = new THREE.Group();
  if (type === 'porte') {
    placer(g, boite(1.3, 2.3, 0.1, M.graphite, 0.03), 0, 1.15, 0.03);
    placer(g, boite(1.1, 2.15, 0.06, M_VITRE, 0.02), 0, 1.1, 0.07);
    placer(g, boite(0.04, 0.5, 0.06, M.pollen, 0.015), 0.42, 1.1, 0.12);                  // poignée jaune
    placer(g, boite(1.4, 0.05, 0.05, M.seve, 0.015), 0, 2.4, 0.07);                        // bande lumineuse au-dessus
  } else if (type === 'vitrine') {
    placer(g, boite(1.7, 1.5, 0.1, M.graphite, 0.03), 0, 1.45, 0.03);
    placer(g, boite(1.55, 1.36, 0.05, M_VITRE, 0.02), 0, 1.45, 0.07);
    placer(g, boite(1.8, 0.08, 0.25, M.blanc, 0.03), 0, 0.68, 0.12);                       // appui de fenêtre
  } else if (type === 'grille') {
    for (let k = 0; k < 7; k++) placer(g, boite(1.2, 0.05, 0.08, M.graphite, 0.02), 0, 1.0 + k * 0.16, 0.04);   // lames d'aération
    placer(g, boite(0.3, 0.3, 0.06, M.pollen, 0.02), 0.65, 2.3, 0.03);                     // plaque signalétique
  } else if (type === 'volet') {
    placer(g, boite(1.9, 2.6, 0.1, M.graphite, 0.03), 0, 1.3, 0.03);
    for (let k = 0; k < 12; k++) placer(g, boite(1.72, 0.17, 0.05, M.blanc, 0.02), 0, 0.2 + k * 0.2, 0.08);   // volet roulant blanc à lames
    placer(g, boite(1.9, 0.06, 0.06, M.pollen, 0.02), 0, 2.62, 0.09);
  }
  return g;
}
function batiment(modules, prof, haut, enseigne) {
  const g = new THREE.Group(), W = modules.length * MODULE, base = socle(g, W, prof);
  placer(g, boite(W, haut, prof, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.05), 0, base + haut / 2, 0);
  placer(g, boite(W + 0.06, 0.26, prof + 0.06, M.graphite, 0.04), 0, base + 0.13, 0);       // plinthe graphite
  placer(g, boite(W + 0.4, 0.3, prof + 0.4, M.blanc, 0.05), 0, base + haut + 0.15, 0);      // corniche débordante
  placer(g, boite(W + 0.44, 0.06, prof + 0.44, M.pollen, 0.02), 0, base + haut + 0.02, 0);   // liseré jaune sous la corniche
  placer(g, boite(W - 0.6, 0.4, prof - 0.6, M.blanc, 0.05), 0, base + haut + 0.5, 0);       // édicule de toit
  modules.forEach((m, k) => placer(g, moduleFacade(m, haut), -W / 2 + MODULE * (k + 0.5), base, prof / 2));
  if (enseigne) {
    const e = placer(g, boite(Math.min(W - 0.4, 4.2), 0.7, 0.12, M.graphite, 0.03), 0, base + haut - 0.45, prof / 2 + 0.08);
    placer(g, new THREE.Mesh(new THREE.PlaneGeometry(Math.min(W - 0.4, 4.2) - 0.12, 0.58), new THREE.MeshStandardMaterial({ map: texteTex([[enseigne, 76]]), roughness: 0.5 })), 0, base + haut - 0.45, prof / 2 + 0.145);
    e.userData.enseigne = enseigne;
  }
  g.userData.W = W; g.userData.D = prof; g.userData.base = base;
  return g;
}
const INTER = [];   // tout ce qu'on peut utiliser avec E : { x, z, y, r, texte() (null = rien à faire), agir() }
function poser(g, x, z) {   // pose un bâtiment face à la place centrale et le rend infranchissable
  g.position.set(x, H(x, z), z); g.rotation.y = Math.atan2(-x, -z); scene.add(g);
  const ombre = ombreContact(g, 1); ombre.scale.set(g.userData.W / 2 + 0.8, 1, g.userData.D / 2 + 0.8); ombre.rotation.y = g.rotation.y;   // ombre de contact rectangulaire
  const W = g.userData.W + 0.7, D = g.userData.D + 0.7, n = Math.max(1, Math.round(W / D));
  for (let k = 0; k < n; k++) { const lx = -W / 2 + W * (k + 0.5) / n, c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y); OBSTACLES.push({ x: x + lx * c, z: z - lx * s, r: Math.max(D / 2, W / n / 2) * 0.98 }); }
  return g;
}

// Le comptoir : vitrine, porte, vitrine. Devant, un auvent et une rangée de présentoirs, chacun portant un outil debout.
const COMPTOIR = poser(batiment(['vitrine', 'porte', 'vitrine'], 3.2, 3.2, 'COMPTOIR'), -9, -4);
{
  const g = COMPTOIR, base = g.userData.base;
  placer(g, boite(6.4, 0.12, 1.8, M.blanc, 0.04), 0, base + 3.0, 2.4);                       // auvent
  for (let k = -3; k <= 3; k++) placer(g, boite(0.9, 0.02, 1.7, k % 2 ? M.pollen : M.blanc, 0.008), k * 0.9, base + 2.93, 2.4);   // bandes de l'auvent
  for (const s of [-1, 1]) placer(g, tube(0.05, 0.05, 2.5, M.graphite), s * 3.0, base + 1.75, 3.2);
  fusionner(g);
}
const PRESENTOIRS = [];
function presentoir(cle, prix, k, n) {
  const g = new THREE.Group();
  placer(g, boite(0.7, 0.14, 0.7, M.graphite, 0.03), 0, 0.07, 0);
  placer(g, boite(0.74, 0.03, 0.74, M.seve, 0.012), 0, 0.15, 0).userData.voyant = true;
  placer(g, boite(0.56, 0.75, 0.56, M.blanc, 0.04), 0, 0.53, 0);
  placer(g, boite(0.62, 0.06, 0.62, M.graphite, 0.02), 0, 0.93, 0);
  const plaque = placer(g, new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), new THREE.MeshStandardMaterial({ roughness: 0.5 })), 0, 0.62, 0.285);
  let objet;
  if (OUTILS_DEF[cle]) { objet = fusionner(fabriquerOutil(cle)); const l = { pinceau: 0.42, brosse: 1.05, large: 1.2, xl: 1.35 }[cle]; objet.scale.setScalar(l ? Math.min(1, 0.9 / l) * (cle === 'xl' ? 0.8 : 1) : 1); objet.position.y = 0.96; }
  else objet = new THREE.Group();
  g.add(objet);
  const rang = k < 6 ? 0 : 1, n2 = rang ? n - 6 : Math.min(6, n), v = (rang ? k - 6 : k) - (n2 - 1) / 2;   // deux rangées de présentoirs
  const x = COMPTOIR.position.x, z = COMPTOIR.position.z, yaw = COMPTOIR.rotation.y, a = v * 0.1;
  const lx = v * 1.25, lz = 4.6 + rang * 1.9 + v * v * 0.1;   // en arc léger devant le comptoir
  const wx = x + lx * Math.cos(yaw) + lz * Math.sin(yaw), wz = z - lx * Math.sin(yaw) + lz * Math.cos(yaw);
  g.position.set(wx, H(wx, wz), wz); g.rotation.y = yaw - a; scene.add(g); ombreContact(g, 0.6);
  OBSTACLES.push({ x: wx, z: wz, r: 0.45 });
  plaque.userData.garder = true; objet.userData.garder = true; g.traverse((o) => { if (o.userData.voyant) o.userData.garder = true; }); fusionner(g);
  const p = { cle, prix, g, objet, plaque, x: wx, z: wz, etat: '' };
  objet.traverse((o) => { if (o.isMesh) o.userData.matOrigine = o.material; });
  PRESENTOIRS.push(p); return p;
}
function majPresentoir(p, etat) {   // 'acquis' | 'abordable' | 'cher'
  if (p.etat === etat) return; p.etat = etat;
  p.objet.traverse((o) => { if (o.isMesh) o.material = etat === 'cher' ? M_GRIS : o.userData.matOrigine; });
  p.g.traverse((o) => { if (o.userData.voyant) o.material = etat === 'acquis' ? M.seve : etat === 'abordable' ? M.pollen : M.graphite; });
  const def = OUTILS_DEF[p.cle] || OBJETS_DEF[p.cle];
  const txt = etat === 'acquis' ? [[def.court || def.nom, 40], ['ACQUIS', 34, '#2f8f52']] : [[def.court || def.nom, 40], [`${p.prix.toLocaleString('fr-FR')} cr`, 40, etat === 'cher' ? '#8a8d90' : '#b07d00']];
  if (p.plaque.material.map) p.plaque.material.map.dispose();
  p.plaque.material.map = texteTex(txt, 256, 112); p.plaque.material.needsUpdate = true;
}

// La station : le bâtiment principal, avec le tableau des contrats en façade (étape 6).
const STATION = fusionner(poser(batiment(['grille', 'vitrine', 'porte', 'vitrine', 'grille'], 4, 4.2, 'STATION POLLEN'), 1, -12));
// Le garage : deux volets roulants. La pollinisatrice y dort (étape 6).
const GARAGE = fusionner(poser(batiment(['volet', 'volet', 'grille'], 4.4, 3.6, 'GARAGE'), 11, -6));
// Le point d'eau : une pompe blanche sur socle, réservoir à hublot, robinet jaune (étape 5).
const POMPE = (() => {
  const g = new THREE.Group(), base = socle(g, 1.2, 1.2);
  placer(g, tube(0.55, 0.6, 1.6, M.panneau, 24), 0, base + 0.8, 0);
  placer(g, tube(0.62, 0.62, 0.12, M.graphite, 24), 0, base + 1.66, 0);
  placer(g, tube(0.4, 0.5, 0.3, M.blanc, 24), 0, base + 1.86, 0);
  placer(g, new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshStandardMaterial({ color: 0x3a8fd0, emissive: 0x2a6fb0, emissiveIntensity: 0.4, roughness: 0.1 })), 0, base + 1.0, 0.585);   // hublot : on voit l'eau
  placer(g, new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.035, 8, 24), M.graphite), 0, base + 1.0, 0.59);
  placer(g, tube(0.06, 0.06, 0.5, M.graphite), 0.55, base + 0.5, 0.3).rotation.z = Math.PI / 2;
  placer(g, bouton(), 0.82, base + 0.5, 0.3).rotation.y = Math.PI / 2;
  g.position.set(-11, H(-11, 6), 6); g.rotation.y = Math.atan2(11, -6); scene.add(g); ombreContact(g, 1.3);
  OBSTACLES.push({ x: -11, z: 6, r: 1.1 });
  return fusionner(g);
})();
