// =====================================================================
// 5. Les matières et les briques de la charte
// =====================================================================
// Panneaux blancs : rainures sombres fines, vis aux coins et liseré orange, peints sur la texture (aucun polygone en plus).
// La texture couvre 1,2 m de côté ; les boîtes ont des coordonnées de texture à l'échelle du monde, donc toute grande
// surface blanche porte ses rainures et ses liserés à la même taille, jamais une grande surface nue.
const ORANGE = 0xf08a24;
function texPanneaux(colonnes, rangs, liseres) {
  return texture(512, 512, (g, w, h) => {
    g.fillStyle = '#edeae4'; g.fillRect(0, 0, w, h);
    const im = g.getImageData(0, 0, w, h); for (let i = 0; i < im.data.length; i += 4) { const v = (Math.random() - 0.5) * 6; im.data[i] += v; im.data[i + 1] += v; im.data[i + 2] += v; } g.putImageData(im, 0, 0);
    g.strokeStyle = 'rgba(47,51,56,.55)'; g.lineWidth = 3;
    for (let c = 0; c <= colonnes; c++) { g.beginPath(); g.moveTo(c * w / colonnes, 0); g.lineTo(c * w / colonnes, h); g.stroke(); }
    for (let r = 0; r <= rangs; r++) { g.beginPath(); g.moveTo(0, r * h / rangs); g.lineTo(w, r * h / rangs); g.stroke(); }
    g.fillStyle = '#f08a24'; for (const y of liseres) g.fillRect(0, y * h, w, h * 0.026);
    g.fillStyle = 'rgba(47,51,56,.35)'; for (let c = 0; c < colonnes; c++) for (let r = 0; r < rangs; r++) for (const [px, py] of [[0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92]]) { g.beginPath(); g.arc((c + px) * w / colonnes, (r + py) * h / rangs, 2.4, 0, 6.3); g.fill(); }   // vis
  });
}
const M = {
  blanc: new THREE.MeshStandardMaterial({ color: CHARTE.blanc, roughness: 0.6, metalness: 0, map: pixels(64, 64, () => { const v = 247 + (Math.random() - 0.5) * 10; return [v, v, v]; }, true, 2) }),
  panneau: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, map: texPanneaux(2, 2, [0.47]) }),
  graphite: new THREE.MeshStandardMaterial({ color: CHARTE.graphite, roughness: 0.3, metalness: 0.75, map: pixels(128, 8, (x) => { const v = 238 + 17 * bruit(x / 2, 0.5, 64); return [v, v, v]; }, true, 3) }),   // métal brossé, il reflète le ciel
  pollen: new THREE.MeshStandardMaterial({ color: CHARTE.pollen, roughness: 0.45, metalness: 0.05 }),
  lisere: new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.45, metalness: 0.05 }),
  seve: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: CHARTE.seve, emissiveIntensity: 2.2, roughness: 1 }),   // émissif pur
};
M.panneau.map.repeat.set(1, 1);
const machines = [];
// Toute arête fabriquée est chanfreinée : une boîte arrondie, rayon 2 à 4 cm, jamais de cube brut.
// Une surface blanche de plus de 50 cm devient un panneau rainuré, à l'échelle du monde (1,2 m par motif).
function boite(w, h, d, mat, r = 0.03) {
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)); g.type = 'RoundedBoxGeometry';
  const grand = Math.max(w, h, d) >= 0.5, panneau = (x) => (x === M.blanc && grand) ? M.panneau : x;
  mat = Array.isArray(mat) ? mat.map(panneau) : panneau(mat);
  if ([].concat(mat).includes(M.panneau)) {   // coordonnées de texture à l'échelle du monde, face par face
    const uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      const [su, sv] = ax >= ay && ax >= az ? [d, h] : ay >= az ? [w, d] : [w, h];
      uv.setXY(i, uv.getX(i) * su / 1.2, uv.getY(i) * sv / 1.2);
    }
  }
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
}
// Les cylindres fabriqués aussi sont chanfreinés : un profil tourné avec un biseau en haut et en bas.
function cylindre(r1, r2, h, mat, segs = 16) {   // r1 en haut, r2 en bas, comme CylinderGeometry
  const b = Math.min(0.02, h * 0.2, Math.min(r1, r2) * 0.3);
  const pts = [[0, -h / 2], [r2 - b, -h / 2], [r2, -h / 2 + b], [r1, h / 2 - b], [r1 - b, h / 2], [0, h / 2]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, segs), mat); m.castShadow = m.receiveShadow = true; return m;
}
// Ombre de contact : un disque sombre au bord net, posé au sol sous chaque objet.
const TEX_CONTACT = texture(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,.62)'); r.addColorStop(0.62, 'rgba(0,0,0,.5)'); r.addColorStop(0.86, 'rgba(0,0,0,.12)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }, false);
const M_CONTACT = new THREE.MeshBasicMaterial({ map: TEX_CONTACT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const GEO_CONTACT = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
function ombreContact(obj, r, suivre = false) {
  const m = new THREE.Mesh(GEO_CONTACT, M_CONTACT); m.scale.set(r, 1, r); m.renderOrder = 1;
  const p = obj.getWorldPosition ? obj.getWorldPosition(new THREE.Vector3()) : obj.position; m.position.set(p.x, H(p.x, p.z) + 0.02, p.z);
  if (suivre) m.userData.suit = obj;
  scene.add(m); OMBRES.push(m); return m;
}
const OMBRES = [];
// Rien ne flotte : un objet posé prend la hauteur du point le plus bas sous son emprise (il s'enfonce un peu côté amont).
function assise(x, z, r) { let m = H(x, z); for (let k = 0; k < 8; k++) m = Math.min(m, H(x + Math.cos(k * 0.785) * r, z + Math.sin(k * 0.785) * r)); return m; }
// Marquage au sol : un cadre fin qui épouse le relief (zone d'approche des machines, place de stationnement).
function cadreSol(x, z, hw, hd, rot, mat, ep = 0.09) {
  const pos = [], c = Math.cos(rot), s = Math.sin(rot), P = (lx, lz) => { const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c; return [wx, H(wx, wz) + 0.035, wz]; };
  const bande = (ax, az, bx, bz, nx, nz) => { const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5)); for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1; const a = P(x0, z0), b = P(x1, z1), d = P(x1 + nx * ep, z1 + nz * ep), e = P(x0 + nx * ep, z0 + nz * ep); pos.push(...a, ...b, ...d, ...a, ...d, ...e, ...a, ...d, ...b, ...a, ...e, ...d); } };
  bande(-hw, -hd, hw, -hd, 0, 1); bande(hw, hd, -hw, hd, 0, -1); bande(-hw, hd, -hw, -hd, 1, 0); bande(hw, -hd, hw, hd, -1, 0);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const nor = new Float32Array(pos.length); for (let k = 1; k < nor.length; k += 3) nor[k] = 1; g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));   // vers le haut (l'occlusion ambiante en a besoin)
  const m = new THREE.Mesh(g, mat); m.renderOrder = 2; scene.add(m); return m;
}
const M_ZONE = new THREE.MeshBasicMaterial({ color: ORANGE, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
const ZONE_APPROCHE = 2;   // mètres autour de chaque machine : le véhicule y ralentit
MAJ.push(() => { for (const m of OMBRES) { const o = m.userData.suit; if (o) { m.position.set(o.position.x, H(o.position.x, o.position.z) + 0.02, o.position.z); if (m.userData.tourne) m.rotation.y = o.rotation.y; } } });
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
function bouton() {   // gros bouton rond orange en relief, sur une bague graphite
  const g = new THREE.Group();
  placer(g, new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.165, 0.02], [0.165, 0.05], [0.15, 0.06], [0, 0.06]].map(([r, y]) => new THREE.Vector2(r, y)), 32).rotateX(Math.PI / 2), M.graphite), 0, 0, 0);
  placer(g, new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.125, 0], [0.13, 0.03], [0.115, 0.075], [0.07, 0.1], [0, 0.105]].map(([r, y]) => new THREE.Vector2(r, y)), 32).rotateX(Math.PI / 2), M.lisere), 0, 0, 0.05);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

