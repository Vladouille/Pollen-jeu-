// =====================================================================
// 5. Les matières et les briques de la charte
// =====================================================================
// Panneaux blancs : rainures sombres fines et liseré jaune pollen horizontal, peints sur la texture (aucun polygone en plus).
function texPanneaux(colonnes, rangs, liseres) {
  return texture(512, 512, (g, w, h) => {
    g.fillStyle = '#ece8df'; g.fillRect(0, 0, w, h);
    const im = g.getImageData(0, 0, w, h); for (let i = 0; i < im.data.length; i += 4) { const v = (Math.random() - 0.5) * 6; im.data[i] += v; im.data[i + 1] += v; im.data[i + 2] += v; } g.putImageData(im, 0, 0);
    g.strokeStyle = 'rgba(47,51,56,.55)'; g.lineWidth = 2.5;
    for (let c = 1; c < colonnes; c++) { g.beginPath(); g.moveTo(c * w / colonnes, 0); g.lineTo(c * w / colonnes, h); g.stroke(); }
    for (let r = 1; r < rangs; r++) { g.beginPath(); g.moveTo(0, r * h / rangs); g.lineTo(w, r * h / rangs); g.stroke(); }
    g.fillStyle = '#f4b41a'; for (const y of liseres) g.fillRect(0, y * h, w, h * 0.022);
    g.fillStyle = 'rgba(47,51,56,.35)'; for (let c = 0; c < colonnes; c++) for (const [px, py] of [[0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92]]) { g.beginPath(); g.arc((c + px) * w / colonnes, py * h, 2.4, 0, 6.3); g.fill(); }   // vis
  });
}
const M = {
  blanc: new THREE.MeshStandardMaterial({ color: CHARTE.blanc, roughness: 0.6, metalness: 0, map: pixels(64, 64, () => { const v = 247 + (Math.random() - 0.5) * 10; return [v, v, v]; }, true, 2) }),
  panneau: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, map: texPanneaux(3, 2, [0.72]) }),
  graphite: new THREE.MeshStandardMaterial({ color: CHARTE.graphite, roughness: 0.35, metalness: 0.7, map: pixels(128, 8, (x) => { const v = 238 + 17 * bruit(x / 2, 0.5, 64); return [v, v, v]; }, true, 3) }),   // métal brossé
  pollen: new THREE.MeshStandardMaterial({ color: CHARTE.pollen, roughness: 0.45, metalness: 0.05 }),
  seve: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: CHARTE.seve, emissiveIntensity: 2.2, roughness: 1 }),   // émissif pur
};
const machines = [];
// Toute arête fabriquée est chanfreinée : une boîte arrondie, rayon 2 à 4 cm, jamais de cube brut.
function boite(w, h, d, mat, r = 0.03) { const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)); g.type = 'RoundedBoxGeometry'; const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m; }
function placer(parent, o, x, y, z, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; parent.add(o); return o; }
// Socle étagé : trois gradins plus larges que le corps, bande vert sève lumineuse au premier gradin.
function socle(parent, w, d) {
  placer(parent, boite(w + 0.7, 0.16, d + 0.7, M.graphite, 0.04), 0, 0.08, 0);
  placer(parent, boite(w + 0.74, 0.035, d + 0.74, M.seve, 0.015), 0, 0.17, 0);
  placer(parent, boite(w + 0.4, 0.2, d + 0.4, M.blanc, 0.04), 0, 0.29, 0);
  placer(parent, boite(w + 0.16, 0.1, d + 0.16, M.graphite, 0.03), 0, 0.44, 0);
  return 0.49;   // hauteur du dessus du socle
}
// Fusion : toutes les pièces fixes d'un objet qui partagent une matière deviennent un seul maillage
// (un appel de dessin par matière au lieu d'un par pièce). Ce qui bouge ou change de matière porte userData.garder.
function fusionner(g) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), parMat = new Map(), retirer = [];
  const garde = (o) => { for (let p = o; p && p !== g; p = p.parent) if (p.userData.garder) return true; return false; };
  g.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || garde(o)) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!parMat.has(o.material)) parMat.set(o.material, []); parMat.get(o.material).push(geo); retirer.push(o);
  });
  for (const o of retirer) o.parent.remove(o);
  for (const [mat, geos] of parMat) { const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = m.receiveShadow = true; m.userData.fusion = geos.length; g.add(m); }
  return g;
}
function ecran(texte) {   // verre sombre, chiffre en jaune pollen
  const t = texture(256, 128, (g, w, h) => { g.fillStyle = '#121518'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(244,180,26,.25)'; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#f4b41a'; g.font = '800 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texte, w / 2, h / 2 + 4); });
  return new THREE.MeshStandardMaterial({ color: 0x0d0f11, roughness: 0.1, metalness: 0.2, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.3 });
}
function bouton() {   // gros bouton rond jaune pollen en relief, sur une bague graphite
  const g = new THREE.Group();
  placer(g, new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.165, 0.02], [0.165, 0.05], [0.15, 0.06], [0, 0.06]].map(([r, y]) => new THREE.Vector2(r, y)), 32).rotateX(Math.PI / 2), M.graphite), 0, 0, 0);
  placer(g, new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.125, 0], [0.13, 0.03], [0.115, 0.075], [0.07, 0.1], [0, 0.105]].map(([r, y]) => new THREE.Vector2(r, y)), 32).rotateX(Math.PI / 2), M.pollen), 0, 0, 0.05);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

