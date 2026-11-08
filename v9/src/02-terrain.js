// =====================================================================
// 4. Le terrain : relief léger, tuiles hexagonales de 2 m, beige sec ou vert pollinisé
// =====================================================================
const RAYON = 70;
const H = (x, z) => 0.6 * Math.sin(x * 0.045 + 1.1) * Math.cos(z * 0.038 - 0.5) + 0.25 * Math.sin((x + z) * 0.09) + Math.max(0, Math.hypot(x, z) - RAYON) * 0.08;
const SQ3 = Math.sqrt(3), HS = 2 / SQ3;   // 2 m entre côtés opposés
const hexCentre = (q, r) => [HS * SQ3 * (q + r / 2), HS * 1.5 * r];
const frontiere = (x, z) => x * 0.8 - z * 0.6 + 3.5 + 4 * Math.sin(z * 0.12) + 2.2 * Math.sin(x * 0.19 + 1);   // > 0 : pollinisé
const OFF = 48, NTEX = 96;
const T = { q: [], r: [], x: [], z: [], vert: [] };
const etat = new Uint8Array(NTEX * NTEX * 4);
for (let r = -OFF; r < OFF; r++) for (let q = -OFF; q < OFF; q++) {
  const [x, z] = hexCentre(q, r); if (Math.hypot(x, z) > RAYON - 1.2) continue;
  const v = frontiere(x, z) > 0 && Math.hypot(x - 2, z + 1) > 6 ? 1 : 0;   // le collecteur est posé sur du sec
  T.q.push(q); T.r.push(r); T.x.push(x); T.z.push(z); T.vert.push(v);
  const k = ((r + OFF) * NTEX + (q + OFF)) * 4; etat[k] = v * 255; etat[k + 3] = 255;
}
const NT = T.q.length;
const etatTex = new THREE.DataTexture(etat, NTEX, NTEX, THREE.RGBAFormat); etatTex.magFilter = etatTex.minFilter = THREE.NearestFilter; etatTex.needsUpdate = true;
{
  const grainH = (x, y) => fbm(x / 16, y / 16, 4, 16) * 0.6 + bruit(x / 3, y / 3, 85) * 0.3 + (bruit(x / 1.4, y / 1.4, 183) > 0.8 ? 0.4 : 0);
  const grain = pixels(256, 256, (x, y) => { const v = 0.86 + 0.14 * grainH(x, y) + (Math.random() - 0.5) * 0.05; return [255 * v, 252 * v, 246 * v]; }, true, 80);
  const g = new THREE.PlaneGeometry(220, 220, MOBILE ? 110 : 180, MOBILE ? 110 : 180).rotateX(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i))); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: grain, normalMap: normales(256, 256, grainH, 1.4, 80), normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.95 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uEtat: { value: etatTex }, uSec: { value: new THREE.Color(CHARTE.sec) }, uVert: { value: new THREE.Color(CHARTE.prairie) } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMonde;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vMonde; uniform sampler2D uEtat; uniform vec3 uSec, uVert;
      vec2 hexOf(vec2 p) { float qf = (0.5773503 * p.x - 0.3333333 * p.y) / ${HS.toFixed(7)}, rf = (0.6666667 * p.y) / ${HS.toFixed(7)};
        vec3 c = vec3(qf, -qf - rf, rf); vec3 rc = floor(c + 0.5); vec3 d = abs(rc - c);
        if (d.x > d.y && d.x > d.z) rc.x = -rc.y - rc.z; else if (d.y > d.z) rc.y = -rc.x - rc.z; else rc.z = -rc.x - rc.y; return vec2(rc.x, rc.z); }
      vec2 hexC(vec2 h) { return vec2(${(HS * SQ3).toFixed(7)} * (h.x + 0.5 * h.y), ${(HS * 1.5).toFixed(7)} * h.y); }
      float hexBord(vec2 d) { return max(abs(d.x), max(abs(0.5 * d.x + 0.8660254 * d.y), abs(-0.5 * d.x + 0.8660254 * d.y))); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      vec2 hq = hexOf(vMonde.xz); vec4 st = texture2D(uEtat, (hq + ${OFF}.0 + 0.5) / ${NTEX}.0);
      float bord = hexBord(vMonde.xz - hexC(hq));
      float dans = st.a * step(length(vMonde.xz), ${RAYON - 1.2});
      vec3 base = mix(uSec, uVert, st.r * dans);
      vec3 dehors = uSec * 1.04;
      diffuseColor.rgb *= mix(dehors, base, dans);
      diffuseColor.rgb *= 1.0 - dans * (0.22 * smoothstep(0.93, 0.985, bord) - 0.06 * (1.0 - smoothstep(0.0, 0.9, bord)) * st.r);   // rainure nette entre les tuiles`);
  };
  const sol = new THREE.Mesh(g, mat); sol.receiveShadow = true; scene.add(sol);
}

// Fleurs des tuiles pollinisées (couleurs franches) et touffes sèches des tuiles beiges, en instances.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function fleurGeo(type) {
  const tige = new THREE.CylinderGeometry(0.008, 0.011, 0.34, 5).translate(0, 0.17, 0);
  let tete;
  if (type === 0) tete = new THREE.LatheGeometry([[0.0001, 0], [0.026, 0.03], [0.028, 0.1], [0.018, 0.15], [0.0001, 0.17]].map(([r, y]) => new THREE.Vector2(r, y)), 6).translate(0, 0.32, 0);   // épi de lavande
  else if (type === 1) tete = new THREE.IcosahedronGeometry(0.05, 0).scale(1.2, 0.8, 1.2).translate(0, 0.37, 0);   // grappe de colza
  else tete = new THREE.IcosahedronGeometry(0.045, 1).translate(0, 0.36, 0);   // pompon de trèfle
  const feuille = new THREE.ConeGeometry(0.035, 0.14, 4).rotateZ(1.1).translate(0.06, 0.08, 0);
  const g = [tige, feuille, tete].map((x) => (x.index ? x.toNonIndexed() : x));
  const couleurs = [new THREE.Color(0x4f7d2e), new THREE.Color(0x5f8f34), new THREE.Color(FLEURS[type].c)];
  g.forEach((x, i) => { const n = x.attributes.position.count, c = new Float32Array(n * 3); for (let k = 0; k < n; k++) couleurs[i].toArray(c, k * 3); x.setAttribute('color', new THREE.BufferAttribute(c, 3)); x.deleteAttribute('uv'); });
  const pos = [], nor = [], col = []; g.forEach((x) => { pos.push(...x.attributes.position.array); nor.push(...x.attributes.normal.array); col.push(...x.attributes.color.array); });
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); r.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return r;
}
const touffeGeo = (() => {   // touffe sèche : quelques brins plats en éventail
  const pos = [];
  for (let k = 0; k < 6; k++) { const a = k * 1.05, l = 0.22 + (k % 3) * 0.05, dx = Math.cos(a), dz = Math.sin(a); pos.push(-0.012 * dz, 0, 0.012 * dx, 0.012 * dz, 0, -0.012 * dx, dx * l * 0.5, l, dz * l * 0.5); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
})();
const matFleur = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, flatShading: true });
const fleurs = FLEURS.map((_, t) => new THREE.InstancedMesh(fleurGeo(t), matFleur, NT * Q.fleurs));
const touffes = new THREE.InstancedMesh(touffeGeo, new THREE.MeshStandardMaterial({ color: 0x9c9077, roughness: 1, side: THREE.DoubleSide }), NT * 4);
{
  const n = [0, 0, 0]; let nt = 0;
  for (let i = 0; i < NT; i++) {
    const R = mulberry(i * 131 + 7), espece = Math.floor(fbm(T.x[i] / 22 + 5, T.z[i] / 22, 2) * 3.6) % 3;
    if (T.vert[i]) for (let k = 0; k < Q.fleurs; k++) {
      const a = R() * 6.283, d = Math.sqrt(R()) * 0.85, x = T.x[i] + Math.cos(a) * d, z = T.z[i] + Math.sin(a) * d, sc = 0.8 + R() * 0.4;
      _q.setFromEuler(_e.set((R() - 0.5) * 0.25, R() * 6.283, (R() - 0.5) * 0.25));
      fleurs[espece].setMatrixAt(n[espece]++, _m.compose(_p.set(x, H(x, z), z), _q, _s.set(sc, sc, sc)));
    } else for (let k = 0; k < 3; k++) {
      const a = R() * 6.283, d = Math.sqrt(R()) * 0.8, x = T.x[i] + Math.cos(a) * d, z = T.z[i] + Math.sin(a) * d, sc = 0.7 + R() * 0.6;
      _q.setFromEuler(_e.set(0, R() * 6.283, 0)); touffes.setMatrixAt(nt++, _m.compose(_p.set(x, H(x, z), z), _q, _s.set(sc, sc, sc)));
    }
  }
  fleurs.forEach((m, t) => { m.count = n[t]; m.castShadow = false; m.receiveShadow = true; scene.add(m); });
  touffes.count = nt; touffes.castShadow = true; scene.add(touffes);
}

