// =====================================================================
// 4. Le terrain : relief léger, tuiles hexagonales de 2 m autour d'une esplanade (la base).
//    Une tuile sèche est beige et poussiéreuse ; pollinisée, elle devient verte et ses fleurs se redressent.
//    Sortes de tuiles : 0 normale, 1 envahie de chardons (à désherber), 2 aride (à irriguer), 3 fleur dorée (rare).
// =====================================================================
const RAYON = 70, BASE = 15;   // rayon du terrain, rayon de l'esplanade sans tuiles
const H = (x, z) => { const d = Math.hypot(x, z); return (0.6 * Math.sin(x * 0.045 + 1.1) * Math.cos(z * 0.038 - 0.5) + 0.25 * Math.sin((x + z) * 0.09)) * Math.min(1, Math.max(0, d - BASE + 4) / 8) + Math.max(0, d - RAYON) * 0.08; };
const SQ3 = Math.sqrt(3), HS = 2 / SQ3;   // 2 m entre côtés opposés
const hexCentre = (q, r) => [HS * SQ3 * (q + r / 2), HS * 1.5 * r];
function versHex(x, z) {
  const qf = (SQ3 / 3 * x - z / 3) / HS, rf = (2 / 3 * z) / HS, yf = -qf - rf;
  let q = Math.round(qf), r = Math.round(rf); const y = Math.round(yf);
  const dq = Math.abs(q - qf), dr = Math.abs(r - rf), dy = Math.abs(y - yf);
  if (dq > dr && dq > dy) q = -r - y; else if (dy <= dr) r = -q - y;
  return [q, r];
}
const OFF = 48, NTEX = 96, NSECT = 6;
const secteurDe = (x, z) => Math.floor(((Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * NSECT);
const T = { q: [], r: [], x: [], z: [], vert: [], sorte: [], irrigue: [], t0: [], secteur: [], espece: [] };
const tuileIdx = new Int32Array(NTEX * NTEX).fill(-1);
const idxDe = (q, r) => (q < -OFF || q >= OFF || r < -OFF || r >= OFF) ? -1 : tuileIdx[(r + OFF) * NTEX + (q + OFF)];
{
  const R = mulberry(4242);
  for (let r = -OFF; r < OFF; r++) for (let q = -OFF; q < OFF; q++) {
    const [x, z] = hexCentre(q, r), d = Math.hypot(x, z);
    if (d > RAYON - 1.2 || d < BASE) continue;
    const s = secteurDe(x, z), aride = (s === 3 || s === 4) && fbm(x / 14 + 3, z / 14, 2) > 0.52 && d > 26;
    const sorte = d < 19 ? 0 : aride ? 2 : R() < 0.1 ? 1 : R() < 0.012 ? 3 : 0;
    tuileIdx[(r + OFF) * NTEX + (q + OFF)] = T.q.length;
    const vert = d < 18.5 ? 1 : 0;   // le jardin de la station est déjà pollinisé ; tout le reste est à rendre à la vie
    T.q.push(q); T.r.push(r); T.x.push(x); T.z.push(z); T.vert.push(vert); T.sorte.push(sorte); T.irrigue.push(0); T.t0.push(vert ? -1000 : 1e6); T.secteur.push(s);
    T.espece.push(Math.floor(fbm(x / 22 + 5, z / 22, 2) * 3.6) % 3);
  }
}
const NT = T.q.length;
const voisins = (i) => { const out = []; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]) { const j = idxDe(T.q[i] + a, T.r[i] + b); if (j >= 0) out.push(j); } return out; };
// État lu par le shader du sol : R vert, G sorte, B irriguée, A tuile existante.
let selFlag = null;
const etatSol = new Uint8Array(NTEX * NTEX * 4);
const etatTex = new THREE.DataTexture(etatSol, NTEX, NTEX, THREE.RGBAFormat); etatTex.magFilter = etatTex.minFilter = THREE.NearestFilter;
function ecrireTuile(i) { const k = ((T.r[i] + OFF) * NTEX + (T.q[i] + OFF)) * 4; etatSol[k] = T.vert[i] * 255; etatSol[k + 1] = T.sorte[i] * 60; etatSol[k + 2] = T.irrigue[i] * 255; etatSol[k + 3] = selFlag && selFlag[i] ? 200 : 255; etatTex.needsUpdate = true; }
for (let i = 0; i < NT; i++) ecrireTuile(i);
const SEL = { value: new THREE.Vector3(0, 0, 0) };   // z : intensité du liseré des tuiles visées
selFlag = new Uint8Array(NT); let selListe = [];
function selectionner(liste) {   // tuiles visées : alpha 200 dans la texture d'état (255 = tuile simple)
  for (const i of selListe) { selFlag[i] = 0; ecrireTuile(i); }
  selListe = liste; for (const i of liste) { selFlag[i] = 1; ecrireTuile(i); }
}
{
  const grainH = (x, y) => fbm(x / 16, y / 16, 4, 16) * 0.6 + bruit(x / 3, y / 3, 85) * 0.3 + (bruit(x / 1.4, y / 1.4, 183) > 0.8 ? 0.4 : 0);
  const grain = pixels(256, 256, (x, y) => { const v = 0.86 + 0.14 * grainH(x, y) + (Math.random() - 0.5) * 0.05; return [255 * v, 252 * v, 246 * v]; }, true, 80);
  const g = new THREE.PlaneGeometry(220, 220, MOBILE ? 110 : 180, MOBILE ? 110 : 180).rotateX(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i))); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: grain, normalMap: normales(256, 256, grainH, 1.4, 80), normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.95 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uEtat: { value: etatTex }, uSec: { value: new THREE.Color(CHARTE.sec) }, uVert: { value: new THREE.Color(CHARTE.prairie) }, uSel: SEL });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMonde;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vMonde; uniform sampler2D uEtat; uniform vec3 uSec, uVert, uSel;
      vec2 hexOf(vec2 p) { float qf = (0.5773503 * p.x - 0.3333333 * p.y) / ${HS.toFixed(7)}, rf = (0.6666667 * p.y) / ${HS.toFixed(7)};
        vec3 c = vec3(qf, -qf - rf, rf); vec3 rc = floor(c + 0.5); vec3 d = abs(rc - c);
        if (d.x > d.y && d.x > d.z) rc.x = -rc.y - rc.z; else if (d.y > d.z) rc.y = -rc.x - rc.z; else rc.z = -rc.x - rc.y; return vec2(rc.x, rc.z); }
      vec2 hexC(vec2 h) { return vec2(${(HS * SQ3).toFixed(7)} * (h.x + 0.5 * h.y), ${(HS * 1.5).toFixed(7)} * h.y); }
      float hexBord(vec2 d) { return max(abs(d.x), max(abs(0.5 * d.x + 0.8660254 * d.y), abs(-0.5 * d.x + 0.8660254 * d.y))); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      vec2 hq = hexOf(vMonde.xz); vec4 st = texture2D(uEtat, (hq + ${OFF}.0 + 0.5) / ${NTEX}.0);
      float bord = hexBord(vMonde.xz - hexC(hq)), dist = length(vMonde.xz);
      float dans = step(0.5, st.a) * step(dist, ${RAYON - 1.2}) * step(${BASE}.0, dist);
      float aride = (abs(st.g * 255.0 / 60.0 - 2.0) < 0.5 ? 1.0 : 0.0) * (1.0 - st.b);
      vec3 sec = mix(uSec, uSec * vec3(0.86, 0.82, 0.74), aride);                    // aride : plus sombre, craquelé
      sec *= 1.0 - aride * 0.25 * step(0.82, fract(sin(dot(floor(vMonde.xz * 3.0), vec2(12.9, 78.2))) * 437.5));
      sec = mix(sec, sec * 0.82, st.b * (1.0 - st.r));                               // irriguée : terre humide
      vec3 base = mix(sec, uVert, st.r * dans);
      vec3 esplanade = vec3(0.86, 0.85, 0.82) * (1.0 - 0.07 * step(0.94, hexBord((vMonde.xz - hexC(hexOf(vMonde.xz * 0.5)) * 2.0) * 0.5)));   // dalles claires de la base
      diffuseColor.rgb *= dist < ${BASE}.0 ? esplanade : mix(uSec * 1.04, base, dans);
      diffuseColor.rgb *= 1.0 - dans * (0.22 * smoothstep(0.93, 0.985, bord) - 0.06 * (1.0 - smoothstep(0.0, 0.9, bord)) * st.r);   // rainure entre les tuiles
      float sel = step(0.5, st.a) * step(st.a, 0.9) * uSel.z;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += sel * vec3(0.96, 0.7, 0.1) * (smoothstep(0.82, 0.93, bord) * 0.9 + 0.06);   // tuile visée : liseré jaune pollen`);
  };
  const sol = new THREE.Mesh(g, mat); sol.receiveShadow = true; scene.add(sol);
}

// Les fleurs : chaque tuile porte ses fleurs dès le départ. Sèches, elles sont grises et couchées ;
// à la pollinisation, elles se redressent et prennent leur couleur franche (dans le shader, par l'instant t0).
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function fleurGeo(type) {
  const tige = new THREE.CylinderGeometry(0.008, 0.011, 0.34, 3, 1, true).translate(0, 0.17, 0);
  let tete;
  if (type === 0) tete = new THREE.LatheGeometry([[0.0001, 0], [0.026, 0.03], [0.028, 0.1], [0.0001, 0.17]].map(([r, y]) => new THREE.Vector2(r, y)), 4).translate(0, 0.32, 0);   // épi de lavande
  else if (type === 1) tete = new THREE.IcosahedronGeometry(0.05, 0).scale(1.2, 0.8, 1.2).translate(0, 0.37, 0);   // grappe de colza
  else tete = new THREE.IcosahedronGeometry(0.045, 0).translate(0, 0.36, 0);   // pompon de trèfle
  const feuille = new THREE.ConeGeometry(0.035, 0.14, 3).rotateZ(1.1).translate(0.06, 0.08, 0);
  const g = [tige, feuille, tete].map((x) => (x.index ? x.toNonIndexed() : x));
  const couleurs = [new THREE.Color(0x4f7d2e), new THREE.Color(0x5f8f34), new THREE.Color(FLEURS[type].c)];
  const pos = [], nor = [], col = [], tete01 = [];
  g.forEach((x, i) => { pos.push(...x.attributes.position.array); nor.push(...x.attributes.normal.array); for (let k = 0; k < x.attributes.position.count; k++) { col.push(couleurs[i].r, couleurs[i].g, couleurs[i].b); tete01.push(i === 2 ? 1 : 0); } });
  const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); r.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); r.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); r.setAttribute('aTete', new THREE.Float32BufferAttribute(tete01, 1));
  return r;
}
const UTEMPS = { value: 0 };
function matPlante(base) {
  base.onBeforeCompile = (sh) => {
    sh.uniforms.uTemps = UTEMPS;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aT0; attribute float aTete; uniform float uTemps; varying float vVie;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float t = clamp((uTemps - aT0) / 0.6, 0.0, 1.0); float e = 1.0 - pow(1.0 - t, 3.0) * cos(t * 5.0);   // se redresse avec un rebond
        float couche = (1.0 - e) * 1.15, ph = uTemps * 1.8 + instanceMatrix[3].x * 0.3 + instanceMatrix[3].z * 0.2;
        float a = couche + sin(ph) * 0.06 * t, cy = cos(a), sy = sin(a);   // fanée : couchée vers le sol ; fleurie : ondule au vent
        transformed = vec3(transformed.x, transformed.y * cy - transformed.z * sy, transformed.y * sy + transformed.z * cy);
        vVie = t;`)
      .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_COLOR\n vColor = mix(vec3(0.62, 0.58, 0.5) * (0.85 + 0.15 * aTete), vColor, clamp((uTemps - aT0) / 0.6, 0.0, 1.0));\n#endif');
  };
  return base;
}
const NF = Q.fleurs;
const fleurs = FLEURS.map((_, t) => {
  const geo = fleurGeo(t), m = new THREE.InstancedMesh(geo, matPlante(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, flatShading: true })), NT * NF);
  geo.setAttribute('aT0', new THREE.InstancedBufferAttribute(new Float32Array(NT * NF).fill(1e6), 1)); m.userData.n = 0; return m;
});
const slotsFleur = new Int32Array(NT * NF * 2).fill(-1);   // tuile → (espèce, index) de chacune de ses fleurs
for (let i = 0; i < NT; i++) {
  const R = mulberry(i * 131 + 7), esp = T.espece[i], m = fleurs[esp];
  for (let k = 0; k < NF; k++) {
    const a = R() * 6.283, d = Math.sqrt(R()) * 0.85, x = T.x[i] + Math.cos(a) * d, z = T.z[i] + Math.sin(a) * d, sc = 0.8 + R() * 0.4;
    _q.setFromEuler(_e.set(0, R() * 6.283, 0));
    const j = m.userData.n++; m.setMatrixAt(j, _m.compose(_p.set(x, H(x, z), z), _q, _s.set(sc, sc, sc)));
    m.geometry.attributes.aT0.array[j] = T.t0[i]; slotsFleur[(i * NF + k) * 2] = esp; slotsFleur[(i * NF + k) * 2 + 1] = j;
  }
}
fleurs.forEach((m) => { m.count = m.userData.n; m.receiveShadow = true; scene.add(m); });
function fleurirTuile(i, t) {   // la tuile passe au vert, ses fleurs se redressent en 0,6 s
  T.vert[i] = 1; T.t0[i] = t; ecrireTuile(i);
  for (let k = 0; k < NF; k++) { const esp = slotsFleur[(i * NF + k) * 2], j = slotsFleur[(i * NF + k) * 2 + 1], a = fleurs[esp].geometry.attributes.aT0; a.array[j] = t; a.addUpdateRange(j, 1); a.needsUpdate = true; }
}
function fanerTuile(i) {   // l'orage fane une tuile déjà traitée
  T.vert[i] = 0; T.t0[i] = 1e6; ecrireTuile(i);
  for (let k = 0; k < NF; k++) { const esp = slotsFleur[(i * NF + k) * 2], j = slotsFleur[(i * NF + k) * 2 + 1], a = fleurs[esp].geometry.attributes.aT0; a.array[j] = 1e6; a.addUpdateRange(j, 1); a.needsUpdate = true; }
}
// Chardons gris (à arracher) et fleurs dorées rares (qui luisent faiblement).
const chardonGeo = (() => { const parts = []; for (let k = 0; k < 7; k++) { const a = k * 0.9, c = new THREE.ConeGeometry(0.03, 0.42 + (k % 3) * 0.1, 4).translate(0, 0.2, 0).rotateZ(0.35).rotateY(a); parts.push(c.index ? c.toNonIndexed() : c); } parts.push(new THREE.IcosahedronGeometry(0.07, 0).translate(0, 0.5, 0)); const pos = [], nor = []; parts.forEach((p) => { pos.push(...p.attributes.position.array); nor.push(...p.attributes.normal.array); }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g; })();
const chardons = new THREE.InstancedMesh(chardonGeo, new THREE.MeshStandardMaterial({ color: 0x8c8794, roughness: 0.9, flatShading: true }), NT * 3);
const slotsChardon = new Map();
{ let n = 0; for (let i = 0; i < NT; i++) if (T.sorte[i] === 1) { const R = mulberry(i * 17 + 3), l = []; for (let k = 0; k < 3; k++) { const a = R() * 6.28, d = R() * 0.6, x = T.x[i] + Math.cos(a) * d, z = T.z[i] + Math.sin(a) * d, sc = 0.9 + R() * 0.5; chardons.setMatrixAt(n, _m.compose(_p.set(x, H(x, z), z), _q.setFromEuler(_e.set(0, R() * 6, 0)), _s.set(sc, sc, sc))); l.push(n++); } slotsChardon.set(i, l); } chardons.count = n; chardons.castShadow = true; scene.add(chardons); }
function desherber(i) { T.sorte[i] = 0; ecrireTuile(i); for (const j of slotsChardon.get(i) || []) chardons.setMatrixAt(j, _m.makeScale(0, 0, 0)); chardons.instanceMatrix.needsUpdate = true; }
const doreGeo = new THREE.LatheGeometry([[0.0001, 0], [0.09, 0.05], [0.13, 0.12], [0.07, 0.2], [0.0001, 0.22]].map(([r, y]) => new THREE.Vector2(r, y)), 8).translate(0, 0.45, 0);
const dorees = new THREE.InstancedMesh(doreGeo, new THREE.MeshStandardMaterial({ color: CHARTE.pollen, emissive: CHARTE.pollen, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.4 }), 128);
const slotsDore = new Map();
{ let n = 0; for (let i = 0; i < NT && n < 128; i++) if (T.sorte[i] === 3) { dorees.setMatrixAt(n, _m.compose(_p.set(T.x[i], H(T.x[i], T.z[i]), T.z[i]), _q.identity(), _s.set(1, 1, 1))); slotsDore.set(i, n++); } dorees.count = n; scene.add(dorees); }
function cueillirDoree(i) { const j = slotsDore.get(i); if (j === undefined) return; dorees.setMatrixAt(j, _m.makeScale(0, 0, 0)); dorees.instanceMatrix.needsUpdate = true; T.sorte[i] = 0; ecrireTuile(i); }
