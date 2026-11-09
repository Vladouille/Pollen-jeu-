// =====================================================================
// 4. Le terrain : relief léger, tuiles hexagonales de 2 m autour d'une esplanade (la base).
//    Une tuile sèche est beige ; pollinisée, ses fleurs se redressent et prennent leur couleur franche.
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
// Six secteurs, chacun planté d'une seule espèce, donc d'une seule couleur, sur toute sa surface.
// Chaque espèce rapporte plus que la précédente ; un secteur s'ouvre quand le précédent est pollinisé à 100 %.
const ESPECES = [
  { nom: 'Tulipe rouge', c: 0xe23b2e, prix: 3 }, { nom: 'Tulipe jaune', c: 0xf5c518, prix: 7 }, { nom: 'Jacinthe violette', c: 0x8b4fc4, prix: 15 },
  { nom: 'Anémone rose', c: 0xe85c9a, prix: 32 }, { nom: 'Lys blanc', c: 0xf7f4ee, prix: 70 }, { nom: 'Souci orange', c: 0xf08a24, prix: 150 },
];
const COULEURS = ESPECES.map((e) => e.c);
const OUVERTS = { value: 1 };   // nombre de secteurs ouverts (le secteur 1 au départ)
const T = { q: [], r: [], x: [], z: [], vert: [], sorte: [], irrigue: [], t0: [], secteur: [], couleur: [] };
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
    const vert = d < 18.5 ? 1 : 0;   // le jardin de la station est déjà en fleurs ; tout le reste est à rendre à la vie
    T.q.push(q); T.r.push(r); T.x.push(x); T.z.push(z); T.vert.push(vert); T.sorte.push(sorte); T.irrigue.push(0); T.t0.push(vert ? -1000 : 1e6); T.secteur.push(s);
    T.couleur.push(s);
  }
}
const NT = T.q.length;
// État des tuiles, lu par les shaders : R vert, G sorte, B irriguée, A tuile existante (200 = visée).
// Une deuxième texture garde l'instant de floraison de chaque tuile : les fleurs s'animent seules.
let selFlag = null;
const etatSol = new Uint8Array(NTEX * NTEX * 4), t0Sol = new Float32Array(NTEX * NTEX * 4).fill(1e6);
const etatTex = new THREE.DataTexture(etatSol, NTEX, NTEX, THREE.RGBAFormat); etatTex.magFilter = etatTex.minFilter = THREE.NearestFilter;
const t0Tex = new THREE.DataTexture(t0Sol, NTEX, NTEX, THREE.RGBAFormat, THREE.FloatType); t0Tex.magFilter = t0Tex.minFilter = THREE.NearestFilter;
function ecrireTuile(i) {
  const c = (T.r[i] + OFF) * NTEX + (T.q[i] + OFF), k = c * 4;
  etatSol[k] = T.vert[i] * 255; etatSol[k + 1] = T.sorte[i] * 60; etatSol[k + 2] = T.irrigue[i] * 255; etatSol[k + 3] = selFlag && selFlag[i] ? 200 : 255; etatTex.needsUpdate = true;
  if (t0Sol[k] !== T.t0[i]) { t0Sol[k] = T.t0[i]; t0Tex.needsUpdate = true; }
}
for (let i = 0; i < NT; i++) ecrireTuile(i);
const SEL = { value: new THREE.Vector3(0, 0, 0) };   // y : avancement de la jauge circulaire, z : intensité du liseré des tuiles visées
selFlag = new Uint8Array(NT); let selListe = [];
function selectionner(liste) {
  if (liste.length === selListe.length && liste.every((i, k) => i === selListe[k])) return;
  for (const i of selListe) { selFlag[i] = 0; ecrireTuile(i); }
  selListe = liste; for (const i of liste) { selFlag[i] = 1; ecrireTuile(i); }
}
const R_FLEURS = MOBILE ? 16 : 22;   // au-delà, le sol prend la couleur des fleurs : on lit les bandes jusqu'à l'horizon
const UPAL = { value: COULEURS.map((c) => new THREE.Color(c)) };
const GLSL_HEX = `
  vec2 hexOf(vec2 p) { float qf = (0.5773503 * p.x - 0.3333333 * p.y) / ${HS.toFixed(7)}, rf = (0.6666667 * p.y) / ${HS.toFixed(7)};
    vec3 c = vec3(qf, -qf - rf, rf); vec3 rc = floor(c + 0.5); vec3 d = abs(rc - c);
    if (d.x > d.y && d.x > d.z) rc.x = -rc.y - rc.z; else if (d.y > d.z) rc.y = -rc.x - rc.z; else rc.z = -rc.x - rc.y; return vec2(rc.x, rc.z); }
  vec2 hexC(vec2 h) { return vec2(${(HS * SQ3).toFixed(7)} * (h.x + 0.5 * h.y), ${(HS * 1.5).toFixed(7)} * h.y); }
  float hexBord(vec2 d) { return max(abs(d.x), max(abs(0.5 * d.x + 0.8660254 * d.y), abs(-0.5 * d.x + 0.8660254 * d.y))); }
  vec3 palette(float r) { int k = int(mod(r, 6.0) + 0.5); k = k > 5 ? 0 : k; return uPal[k]; }
  float secteurOf(vec2 c) { return floor(mod(atan(c.y, c.x) + 6.2831853, 6.2831853) / 6.2831853 * 6.0); }`;
// Le sol : couleurs pleines, mat, sans texture de détail. Rainure entre les tuiles, liseré jaune sur la tuile visée.
{
  const g = new THREE.PlaneGeometry(220, 220, MOBILE ? 110 : 180, MOBILE ? 110 : 180).rotateX(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i))); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ roughness: 1 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uEtat: { value: etatTex }, uSec: { value: new THREE.Color(CHARTE.sec) }, uVert: { value: new THREE.Color(CHARTE.prairie) }, uSel: SEL, uPal: UPAL, uOuverts: OUVERTS });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMonde;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vMonde; uniform sampler2D uEtat; uniform vec3 uSec, uVert, uSel; uniform vec3 uPal[6]; uniform float uOuverts;` + GLSL_HEX)
      .replace('#include <map_fragment>', `#include <map_fragment>
      vec2 hq = hexOf(vMonde.xz); vec4 st = texture2D(uEtat, (hq + ${OFF}.0 + 0.5) / ${NTEX}.0);
      float bord = hexBord(vMonde.xz - hexC(hq)), dist = length(vMonde.xz);
      float dans = step(0.5, st.a) * step(dist, ${RAYON - 1.2}) * step(${BASE}.0, dist);
      float aride = (abs(st.g * 255.0 / 60.0 - 2.0) < 0.5 ? 1.0 : 0.0) * (1.0 - st.b);
      vec3 sec = mix(uSec, uSec * vec3(0.84, 0.8, 0.72), aride);                       // aride : terre plus sombre
      sec = mix(sec, sec * 0.8, st.b * (1.0 - st.r));                                   // irriguée : terre humide
      float loin = smoothstep(${R_FLEURS - 6}.0, ${R_FLEURS - 1}.0, length(vMonde.xz - cameraPosition.xz));
      float sect = secteurOf(hexC(hq));
      vec3 fleuri = mix(uVert, palette(sect), loin * 0.85);                             // de loin, la couleur du secteur
      sec = sect < uOuverts ? sec : mix(sec, vec3(0.55, 0.56, 0.58), 0.45);            // secteur encore fermé : terre grise, en friche
      vec3 base = mix(sec, fleuri, st.r * dans);
      vec3 esplanade = vec3(0.86, 0.85, 0.82) * (1.0 - 0.07 * step(0.94, hexBord((vMonde.xz - hexC(hexOf(vMonde.xz * 0.5)) * 2.0) * 0.5)));   // dalles claires de la base
      diffuseColor.rgb *= dist < ${BASE}.0 ? esplanade : mix(uSec * 1.04, base, dans);
      diffuseColor.rgb *= 1.0 - dans * 0.22 * smoothstep(0.93, 0.985, bord);          // rainure entre les tuiles
      float sel = step(0.5, st.a) * step(st.a, 0.9) * uSel.z;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      vec2 dc = vMonde.xz - hexC(hq); float ang = fract(atan(dc.x, -dc.y) / 6.2831853 + 1.0);      // angle autour du centre, depuis le haut
      float anneau = smoothstep(0.62, 0.66, bord) * (1.0 - smoothstep(0.78, 0.82, bord));          // la jauge circulaire
      float rempli = step(ang, uSel.y);
      totalEmissiveRadiance += sel * vec3(0.96, 0.7, 0.1) * (smoothstep(0.86, 0.95, bord) * 0.7 + anneau * (0.15 + rempli * 1.6));`);
  };
  const sol = new THREE.Mesh(g, mat); sol.receiveShadow = true; scene.add(sol);
}

// =====================================================================
// Les fleurs : coupe de cinq pétales arrondis, tige droite et épaisse, deux feuilles à la base, 35 cm.
// 43 triangles sur ordinateur, 23 sur téléphone (une quinzaine de faces : tige, deux feuilles, cinq pétales). Plantées en rangs réguliers sur tout le champ (espacement constant,
// seule l'inclinaison varie), environ 65 par tuile. Fanées : beige-gris, tiges penchées vers le sol.
// Au pollen, elles se redressent avec un petit rebond et prennent la couleur de leur tuile, d'un coup.
// =====================================================================
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const FLEUR_GEO = (() => {
  const pos = [], nor = [], part = [];   // part : 0 tige et feuilles, 1 pétales, 2 cœur
  const tri = (a, b, c, na, nb, nc, k) => { pos.push(...a, ...b, ...c); nor.push(...na, ...nb, ...nc); part.push(k, k, k); };
  // Tige : prisme à trois pans, ouvert, rayon 1,4 cm.
  for (let k = 0; k < 3; k++) {
    const a0 = k / 3 * 6.283, a1 = (k + 1) / 3 * 6.283, r = 0.014, n0 = [Math.cos(a0), 0, Math.sin(a0)], n1 = [Math.cos(a1), 0, Math.sin(a1)];
    const p0 = [Math.cos(a0) * r, 0, Math.sin(a0) * r], p1 = [Math.cos(a1) * r, 0, Math.sin(a1) * r], h0 = [p0[0], 0.3, p0[2]], h1 = [p1[0], 0.3, p1[2]];
    tri(p0, h0, h1, n0, n0, n1, 0); tri(p0, h1, p1, n0, n1, n1, 0);
  }
  // Deux feuilles en losange, de part et d'autre de la base.
  for (const s of [-1, 1]) {
    const b = [0, 0.02, 0], m1 = [s * 0.06, 0.1, 0.025], m2 = [s * 0.06, 0.1, -0.025], t = [s * 0.11, 0.17, 0], n = [s * 0.5, 0.85, 0];
    tri(b, m1, t, n, n, n, 0); tri(b, t, m2, n, n, n, 0);
  }
  // Coupe en tulipe : un fond, un renflement, puis un bord à cinq pétales arrondis (creux peu marqués). Normales adoucies.
  const fond = [0, 0.255, 0], milieu = [], bordP = [];
  for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, pointe = k % 2 === 0; milieu.push([Math.cos(a) * 0.058, 0.305, Math.sin(a) * 0.058]); bordP.push([Math.cos(a) * (pointe ? 0.082 : 0.066), pointe ? 0.41 : 0.375, Math.sin(a) * (pointe ? 0.082 : 0.066)]); }
  const nb = (p, ny) => { const l = Math.hypot(p[0], ny, p[2]); return [p[0] / l, ny / l, p[2] / l]; };
  for (let k = 0; k < 10; k++) {
    const m0 = milieu[k], m1 = milieu[(k + 1) % 10], b0 = bordP[k], b1 = bordP[(k + 1) % 10];
    if (MOBILE) { tri(fond, b1, b0, [0, -0.3, 0], nb(b1, 0.7), nb(b0, 0.7), 1); continue; }   // téléphone : coupe sans renflement, moitié moins de triangles
    tri(fond, m1, m0, [0, -0.3, 0], nb(m1, 0.25), nb(m0, 0.25), 1);
    tri(m0, m1, b1, nb(m0, 0.25), nb(m1, 0.25), nb(b1, 0.7), 1); tri(m0, b1, b0, nb(m0, 0.25), nb(b1, 0.7), nb(b0, 0.7), 1);
  }
  // Cœur : petite pyramide au centre de la coupe.
  const c = [0, 0.345, 0], cp = [0, 1, 0];
  for (let k = 0; k < 3; k++) { const a0 = k / 3 * 6.283, a1 = (k + 1) / 3 * 6.283; tri([Math.cos(a0) * 0.02, 0.3, Math.sin(a0) * 0.02], c, [Math.cos(a1) * 0.02, 0.3, Math.sin(a1) * 0.02], cp, cp, cp, 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  return g;
})();
const UTEMPS = { value: 0 };
const M_FLEUR = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
M_FLEUR.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, { uTemps: UTEMPS, uT0: { value: t0Tex }, uPal: UPAL });
  sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
    attribute float aPart; attribute vec4 aTuile; uniform float uTemps; uniform sampler2D uT0; uniform vec3 uPal[6]; varying vec3 vCouleur;
    vec3 palette(float r) { int k = int(mod(r, 6.0) + 0.5); k = k > 5 ? 0 : k; return uPal[k]; }`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      float t0 = texture2D(uT0, (aTuile.xy + ${OFF}.0 + 0.5) / ${NTEX}.0).r;
      float t = clamp((uTemps - t0) / 0.45, 0.0, 1.0), e = 1.0 - pow(1.0 - t, 3.0) * cos(t * 6.0);   // se redresse avec un rebond
      float a = (1.0 - e) * (0.7 + aTuile.z * 0.3);                                                  // fanée : penchée vers le sol
      float cy = cos(a), sy = sin(a); transformed = vec3(transformed.x, transformed.y * cy - transformed.z * sy, transformed.y * sy + transformed.z * cy);
      float d = length(instanceMatrix[3].xz - cameraPosition.xz); transformed *= 1.0 - smoothstep(${R_FLEURS - 5}.0, ${R_FLEURS}.0, d);   // disparaît en douceur au bord du rayon
      vec3 vive = palette(aTuile.w), tige = vec3(0.24, 0.55, 0.18);
      vec3 c = aPart > 1.5 ? vive * 0.55 + vec3(0.25, 0.2, 0.0) : aPart > 0.5 ? vive : tige;
      vec3 fane = aPart > 0.5 ? vec3(0.62, 0.58, 0.5) : vec3(0.5, 0.48, 0.38);
      vCouleur = mix(fane, c, t);`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCouleur;').replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = vCouleur;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vCouleur * 0.22;');   // couleur franche même à l'ombre
};
// Le champ est découpé en carrés de 8 m ; seuls ceux proches du joueur ont leurs fleurs (un InstancedMesh chacun,
// écarté par la caméra quand il est hors champ). Rangs : 18 cm entre les fleurs, 20 cm entre les rangs, en quinconce.
const CARRE = 8, PAS_X = 0.18, PAS_Z = 0.2, CARRES = new Map();
function construireCarre(a, b) {
  const pts = [], R = mulberry((a * 7919 + b * 104729) >>> 0);
  const j0 = Math.ceil(b * CARRE / PAS_Z), j1 = Math.floor(((b + 1) * CARRE - 1e-4) / PAS_Z);
  for (let j = j0; j <= j1; j++) {
    const z = j * PAS_Z, dx = (j & 1) * PAS_X / 2, i0 = Math.ceil((a * CARRE - dx) / PAS_X), i1 = Math.floor(((a + 1) * CARRE - 1e-4 - dx) / PAS_X);
    for (let i = i0; i <= i1; i++) {
      const x = i * PAS_X + dx, [q, r] = versHex(x, z), t = idxDe(q, r); if (t < 0) continue;
      const [cx, cz] = hexCentre(q, r), ex = x - cx, ez = z - cz;
      if (Math.max(Math.abs(ex), Math.abs(0.5 * ex + 0.866 * ez), Math.abs(-0.5 * ex + 0.866 * ez)) > 0.84) continue;   // un liseré nu entre les tuiles
      pts.push(x, z, q, r, R(), T.couleur[t]);
    }
  }
  const n = pts.length / 6; if (!n) return null;
  const g = FLEUR_GEO.clone(), tuile = new Float32Array(n * 4);
  const m = new THREE.InstancedMesh(g, M_FLEUR, n);
  for (let k = 0; k < n; k++) {
    const x = pts[k * 6], z = pts[k * 6 + 1], al = pts[k * 6 + 4];
    _q.setFromEuler(_e.set((al - 0.5) * 0.16, al * 6.283, (((al * 97) % 1) - 0.5) * 0.16));   // seule l'inclinaison varie
    m.setMatrixAt(k, _m.compose(_p.set(x, H(x, z), z), _q, _s.set(1, 1, 1)));
    tuile[k * 4] = pts[k * 6 + 2]; tuile[k * 4 + 1] = pts[k * 6 + 3]; tuile[k * 4 + 2] = al; tuile[k * 4 + 3] = pts[k * 6 + 5];
  }
  g.setAttribute('aTuile', new THREE.InstancedBufferAttribute(tuile, 4));
  m.computeBoundingSphere(); m.receiveShadow = true; m.castShadow = false;   // l'ombre de 50 000 fleurs coûterait autant que les fleurs m.userData.carre = true;
  scene.add(m); return m;
}
function majFleurs(budget = 2) {   // construit les carrés qui entrent dans le rayon, libère ceux qui en sortent
  const px = camera.position.x, pz = camera.position.z, rc = Math.ceil((R_FLEURS + CARRE) / CARRE), a0 = Math.floor(px / CARRE), b0 = Math.floor(pz / CARRE);
  for (const [k, m] of CARRES) { const [a, b] = k.split(',').map(Number); if (Math.hypot((a + 0.5) * CARRE - px, (b + 0.5) * CARRE - pz) > R_FLEURS + CARRE * 2) { if (m) { scene.remove(m); m.geometry.dispose(); m.dispose(); } CARRES.delete(k); } }
  const aFaire = [];
  for (let a = a0 - rc; a <= a0 + rc; a++) for (let b = b0 - rc; b <= b0 + rc; b++) { const k = a + ',' + b; if (CARRES.has(k)) continue; const d = Math.hypot((a + 0.5) * CARRE - px, (b + 0.5) * CARRE - pz); if (d < R_FLEURS + CARRE * 0.75) aFaire.push([d, a, b, k]); }
  aFaire.sort((u, v) => u[0] - v[0]);
  for (const [, a, b, k] of aFaire.slice(0, budget)) CARRES.set(k, construireCarre(a, b));
}
function fleurirTuile(i, t) { T.vert[i] = 1; T.t0[i] = t; ecrireTuile(i); }   // la tuile passe en couleur, ses fleurs se redressent
function fanerTuile(i) { T.vert[i] = 0; T.t0[i] = 1e6; ecrireTuile(i); }
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
