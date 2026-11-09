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
// Une seule fleur pousse dans la vallée : l'Azurelle, bleue. Chaque secteur en porte une variété ; la variété change
// la taille, le nombre de pétales et la valeur. Un secteur s'ouvre quand le précédent est pollinisé à 100 %.
const AZUR = { petale: 0x3b6fd4, coeur: 0xf5c518, tige: 0x4a7a3c };
const VARIETES = [   // petales, hauteur de tige (m), rayon des pointes, profondeur de la coupe, prix de la tuile
  { nom: 'Azurelle commune', petales: 5, h: 0.25, rr: 0.07, pf: 0.12, prix: 3 },
  { nom: 'Azurelle des champs', petales: 6, h: 0.35, rr: 0.075, pf: 0.13, prix: 7 },
  { nom: 'Azurelle double', petales: 10, h: 0.4, rr: 0.085, pf: 0.12, prix: 15 },
  { nom: 'Azurelle royale', petales: 7, h: 0.4, rr: 0.13, pf: 0.06, prix: 32 },               // grande corolle ouverte
  { nom: 'Azurelle de nuit', petales: 6, h: 0.35, rr: 0.09, pf: 0.1, prix: 70, ferme: true },   // fermée tant qu'elle n'est pas au soleil du pollen
  { nom: 'Azurelle mère', petales: 8, h: 0.5, rr: 0.15, pf: 0.1, prix: 150 },                 // très grande
];
const OUVERTS = { value: 1 };   // nombre de secteurs ouverts (le secteur 1 au départ)
// Sortes de tuiles : 0 normale, 1 chardons, 2 aride, 3 azurelle mère sauvage (luisante, rare), 4 nue (graines ramassées).
const T = { q: [], r: [], x: [], z: [], vert: [], sorte: [], irrigue: [], t0: [], secteur: [], variete: [], nectar: [] };
const tuileIdx = new Int32Array(NTEX * NTEX).fill(-1);
const idxDe = (q, r) => (q < -OFF || q >= OFF || r < -OFF || r >= OFF) ? -1 : tuileIdx[(r + OFF) * NTEX + (q + OFF)];
{
  const R = mulberry(4242);
  for (let r = -OFF; r < OFF; r++) for (let q = -OFF; q < OFF; q++) {
    const [x, z] = hexCentre(q, r), d = Math.hypot(x, z);
    if (d > RAYON - 1.2 || d < BASE) continue;
    const s = secteurDe(x, z), aride = (s === 3 || s === 4) && fbm(x / 14 + 3, z / 14, 2) > 0.52 && d > 26;
    const sorte = d < 19 ? 0 : aride ? 2 : R() < 0.1 ? 1 : R() < 0.007 && d > 30 ? 3 : 0;
    tuileIdx[(r + OFF) * NTEX + (q + OFF)] = T.q.length;
    const vert = d < 18.5 ? 1 : 0;   // le jardin de la station est déjà en fleurs ; tout le reste est à rendre à la vie
    T.q.push(q); T.r.push(r); T.x.push(x); T.z.push(z); T.vert.push(vert); T.sorte.push(sorte); T.irrigue.push(0); T.t0.push(vert ? -1000 : 1e6); T.secteur.push(s);
    T.variete.push(s); T.nectar.push(0);
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
  etatSol[k] = T.vert[i] * 255; etatSol[k + 1] = T.sorte[i] * 50; etatSol[k + 2] = T.irrigue[i] * 255; etatSol[k + 3] = selFlag && selFlag[i] ? 200 : 255; etatTex.needsUpdate = true;
  if (t0Sol[k] !== T.t0[i]) { t0Sol[k] = T.t0[i]; t0Tex.needsUpdate = true; }
}
for (let i = 0; i < NT; i++) ecrireTuile(i);
const SEL = { value: new THREE.Vector3(0, 0, 0) };   // y : avancement de la jauge, z : intensité du liseré des tuiles visées
selFlag = new Uint8Array(NT); let selListe = [];
function selectionner(liste) {
  if (liste.length === selListe.length && liste.every((i, k) => i === selListe[k])) return;
  for (const i of selListe) { selFlag[i] = 0; ecrireTuile(i); }
  selListe = liste; for (const i of liste) { selFlag[i] = 1; ecrireTuile(i); }
}
const R_FLEURS = MOBILE ? 16 : 22;   // au-delà, le sol prend le bleu des fleurs : on lit l'avancement jusqu'à l'horizon
const VAGUE = { value: new THREE.Vector2(-100, -1) };   // vague de floraison de fin de secteur : instant de départ, secteur
const GLSL_HEX = `
  vec2 hexOf(vec2 p) { float qf = (0.5773503 * p.x - 0.3333333 * p.y) / ${HS.toFixed(7)}, rf = (0.6666667 * p.y) / ${HS.toFixed(7)};
    vec3 c = vec3(qf, -qf - rf, rf); vec3 rc = floor(c + 0.5); vec3 d = abs(rc - c);
    if (d.x > d.y && d.x > d.z) rc.x = -rc.y - rc.z; else if (d.y > d.z) rc.y = -rc.x - rc.z; else rc.z = -rc.x - rc.y; return vec2(rc.x, rc.z); }
  vec2 hexC(vec2 h) { return vec2(${(HS * SQ3).toFixed(7)} * (h.x + 0.5 * h.y), ${(HS * 1.5).toFixed(7)} * h.y); }
  float hexBord(vec2 d) { return max(abs(d.x), max(abs(0.5 * d.x + 0.8660254 * d.y), abs(-0.5 * d.x + 0.8660254 * d.y))); }
  float secteurOf(vec2 c) { return floor(mod(atan(c.y, c.x) + 6.2831853, 6.2831853) / 6.2831853 * 6.0); }`;
// Le sol : couleurs pleines, mat, sans texture de détail. Rainure entre les tuiles, liseré jaune sur la tuile visée.
{
  const g = new THREE.PlaneGeometry(220, 220, MOBILE ? 110 : 180, MOBILE ? 110 : 180).rotateX(-Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, H(p.getX(i), p.getZ(i))); g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ roughness: 1 }); mat.userData.sansReflet = true;   // le sol ne prend pas les reflets du ciel
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uEtat: { value: etatTex }, uSec: { value: new THREE.Color(CHARTE.sec) }, uVert: { value: new THREE.Color(CHARTE.prairie) }, uSel: SEL, uBleu: { value: new THREE.Color(AZUR.petale) }, uOuverts: OUVERTS });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMonde;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vMonde; uniform sampler2D uEtat; uniform vec3 uSec, uVert, uSel, uBleu; uniform float uOuverts;` + GLSL_HEX)
      .replace('#include <map_fragment>', `#include <map_fragment>
      vec2 hq = hexOf(vMonde.xz); vec4 st = texture2D(uEtat, (hq + ${OFF}.0 + 0.5) / ${NTEX}.0);
      float bord = hexBord(vMonde.xz - hexC(hq)), dist = length(vMonde.xz);
      float dans = step(0.5, st.a) * step(dist, ${RAYON - 1.2}) * step(${BASE}.0, dist);
      float sorte = st.g * 255.0 / 50.0;
      float aride = (abs(sorte - 2.0) < 0.5 ? 1.0 : 0.0) * (1.0 - st.b);
      vec3 sec = mix(uSec, uSec * vec3(0.84, 0.8, 0.72), aride);                       // aride : terre plus sombre
      sec = mix(sec, sec * 0.8, st.b * (1.0 - st.r));                                   // irriguée : terre humide
      sec = abs(sorte - 4.0) < 0.5 ? vec3(0.42, 0.33, 0.24) : sec;                      // nue : graines ramassées, terre brune
      float loin = smoothstep(${R_FLEURS - 6}.0, ${R_FLEURS - 1}.0, length(vMonde.xz - cameraPosition.xz));
      vec3 fleuri = mix(uVert, uBleu, loin * 0.8);                                       // de loin, le bleu des Azurelles
      sec = secteurOf(hexC(hq)) < uOuverts ? sec : mix(sec, vec3(0.55, 0.56, 0.58), 0.45);   // secteur encore fermé : en friche
      vec3 base = mix(sec, fleuri, st.r * dans);
      vec3 esplanade = vec3(0.86, 0.85, 0.82) * (1.0 - 0.07 * step(0.94, hexBord((vMonde.xz - hexC(hexOf(vMonde.xz * 0.5)) * 2.0) * 0.5)));   // dalles claires de la base
      diffuseColor.rgb *= dist < ${BASE}.0 ? esplanade : mix(uSec * 1.04, base, dans);
      diffuseColor.rgb *= 1.0 - dans * 0.22 * smoothstep(0.93, 0.985, bord);          // rainure entre les tuiles
      float sel = step(0.5, st.a) * step(st.a, 0.9) * uSel.z;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += sel * vec3(0.96, 0.7, 0.1) * smoothstep(0.86, 0.95, bord) * 0.7;`);
  };
  const sol = new THREE.Mesh(g, mat); sol.receiveShadow = true; scene.add(sol);
}

// =====================================================================
// L'Azurelle : coupe de pétales arrondis (5 à 10 selon la variété), cœur jaune, tige droite et épaisse, deux feuilles.
// Plantée en rangs réguliers sur tout le champ (espacement constant, seule l'inclinaison varie), environ 68 par tuile.
// Une seule couleur, ±8 % de luminosité par fleur. Fanée : beige-gris, penchée. Au pollen, elle se redresse et bleuit.
// =====================================================================
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function fleurGeo(v) {
  const pos = [], nor = [], part = [];   // part : 0 tige et feuilles, 1 pétales (1,5 au bord), 2 cœur
  const tri = (a, b, c, na, nb, nc, k, kb, kc) => { pos.push(...a, ...b, ...c); nor.push(...na, ...nb, ...nc); part.push(k, kb === undefined ? k : kb, kc === undefined ? k : kc); };
  const h = v.h, y0 = h - 0.03;
  for (let k = 0; k < 3; k++) {   // tige : prisme à trois pans, ouvert
    const a0 = k / 3 * 6.283, a1 = (k + 1) / 3 * 6.283, r = 0.013, n0 = [Math.cos(a0), 0, Math.sin(a0)], n1 = [Math.cos(a1), 0, Math.sin(a1)];
    const p0 = [Math.cos(a0) * r, 0, Math.sin(a0) * r], p1 = [Math.cos(a1) * r, 0, Math.sin(a1) * r], h0 = [p0[0], y0, p0[2]], h1 = [p1[0], y0, p1[2]];
    tri(p0, h0, h1, n0, n0, n1, 0); tri(p0, h1, p1, n0, n1, n1, 0);
  }
  for (const s of [-1, 1]) { const b = [0, 0.02, 0], m1 = [s * 0.06, 0.09, 0.025], m2 = [s * 0.06, 0.09, -0.025], t = [s * 0.11, 0.15, 0], n = [s * 0.5, 0.85, 0]; tri(b, m1, t, n, n, n, 0); tri(b, t, m2, n, n, n, 0); }
  const N = v.petales * 2, fond = [0, y0, 0], milieu = [], bordP = [];
  for (let k = 0; k < N; k++) {
    const a = k / N * 6.283, pointe = k % 2 === 0, rb = pointe ? v.rr : v.rr * 0.8;
    milieu.push([Math.cos(a) * v.rr * 0.7, y0 + v.pf * 0.4, Math.sin(a) * v.rr * 0.7]);
    bordP.push([Math.cos(a) * rb, y0 + (pointe ? v.pf : v.pf * 0.75), Math.sin(a) * rb]);
  }
  const nb = (p, ny) => { const l = Math.hypot(p[0], ny, p[2]); return [p[0] / l, ny / l, p[2] / l]; };
  for (let k = 0; k < N; k++) {
    const m0 = milieu[k], m1 = milieu[(k + 1) % N], b0 = bordP[k], b1 = bordP[(k + 1) % N];
    if (MOBILE) { tri(fond, b1, b0, [0, -0.3, 0], nb(b1, 0.7), nb(b0, 0.7), 1, 1.5, 1.5); continue; }   // téléphone : coupe simple
    tri(fond, m1, m0, [0, -0.3, 0], nb(m1, 0.25), nb(m0, 0.25), 1);
    tri(m0, m1, b1, nb(m0, 0.25), nb(m1, 0.25), nb(b1, 0.7), 1, 1, 1.5); tri(m0, b1, b0, nb(m0, 0.25), nb(b1, 0.7), nb(b0, 0.7), 1, 1.5, 1.5);
  }
  const c = [0, y0 + v.pf * 0.6, 0], cp = [0, 1, 0], rc = v.rr * 0.3;
  for (let k = 0; k < 4; k++) { const a0 = k / 4 * 6.283, a1 = (k + 1) / 4 * 6.283; tri([Math.cos(a0) * rc, y0 + 0.02, Math.sin(a0) * rc], c, [Math.cos(a1) * rc, y0 + 0.02, Math.sin(a1) * rc], cp, cp, cp, 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.userData.y0 = y0;
  return g;
}
const FLEUR_GEOS = VARIETES.map(fleurGeo), FLEUR_GEO = FLEUR_GEOS[0];
const UTEMPS = { value: 0 };
const MATS_FLEUR = VARIETES.map((v, k) => {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, side: THREE.DoubleSide }); m.userData.sansReflet = true;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTemps: UTEMPS, uT0: { value: t0Tex }, uEtat: { value: etatTex }, uVague: VAGUE });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute float aPart; attribute vec4 aTuile; uniform float uTemps; uniform sampler2D uT0, uEtat; uniform vec2 uVague; varying vec3 vCouleur; varying float vLueur, vVie;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec2 uvT = (aTuile.xy + ${OFF}.0 + 0.5) / ${NTEX}.0;
        float t0 = texture2D(uT0, uvT).r, sorte = texture2D(uEtat, uvT).g * 255.0 / 50.0;
        float t = clamp((uTemps - t0) / 0.45, 0.0, 1.0), e = 1.0 - pow(1.0 - t, 3.0) * cos(t * 6.0);   // se redresse avec un rebond
        ${v.ferme ? 'if (aPart > 1.2) transformed.xz *= mix(0.25, 1.0, t);   // l\'Azurelle de nuit reste fermée jusqu\'au pollen' : ''}
        float a = (1.0 - e) * (0.7 + aTuile.z * 0.3);                                                     // fanée : penchée vers le sol
        float cy = cos(a), sy = sin(a); transformed = vec3(transformed.x, transformed.y * cy - transformed.z * sy, transformed.y * sy + transformed.z * cy);
        float d = length(instanceMatrix[3].xz - cameraPosition.xz); transformed *= 1.0 - smoothstep(${R_FLEURS - 5}.0, ${R_FLEURS}.0, d);
        transformed *= abs(sorte - 4.0) < 0.5 ? 0.0 : 1.0;                                                // tuile nue : plus de fleurs
        float rayonVague = (uTemps - uVague.x) * 14.0 + ${BASE}.0, dv = length(instanceMatrix[3].xz);   // la vague de fin de secteur
        vLueur = abs(aTuile.w - uVague.y) < 0.5 ? exp(-pow((dv - rayonVague) / 2.5, 2.0)) : 0.0;
        transformed *= 1.0 + vLueur * 0.45;
        float lum = 0.92 + aTuile.z * 0.16;                                                               // ±8 % de luminosité
        vec3 bleu = vec3(${new THREE.Color(AZUR.petale).toArray().map((c) => c.toFixed(4)).join(', ')}), coeur = vec3(${new THREE.Color(AZUR.coeur).toArray().map((c) => c.toFixed(4)).join(', ')}), tige = vec3(${new THREE.Color(AZUR.tige).toArray().map((c) => c.toFixed(4)).join(', ')});
        vec3 c = aPart > 1.8 ? coeur : aPart > 0.5 ? bleu * (aPart > 1.2 ? 1.12 : 1.0) : tige;
        vec3 fane = aPart > 0.5 ? vec3(0.62, 0.58, 0.5) : vec3(0.5, 0.48, 0.38);
        vCouleur = mix(fane, c * lum, t); vVie = t;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCouleur; varying float vLueur, vVie;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = vCouleur;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vCouleur * (0.16 + 0.08 * vVie + vLueur * 1.5);');
  };
  m.userData.variete = k;
  return m;
});
const M_FLEUR = MATS_FLEUR[0];
// Le champ est découpé en carrés de 8 m ; seuls ceux proches du joueur ont leurs fleurs (un InstancedMesh par variété
// présente dans le carré, écarté par la caméra quand il est hors champ). Rangs : 18 cm entre les fleurs, 20 cm entre les rangs.
const CARRE = 8, PAS_X = 0.18, PAS_Z = 0.2, CARRES = new Map();
function construireCarre(a, b) {
  const parVar = VARIETES.map(() => []), R = mulberry((a * 7919 + b * 104729) >>> 0);
  const j0 = Math.ceil(b * CARRE / PAS_Z), j1 = Math.floor(((b + 1) * CARRE - 1e-4) / PAS_Z);
  for (let j = j0; j <= j1; j++) {
    const z = j * PAS_Z, dx = (j & 1) * PAS_X / 2, i0 = Math.ceil((a * CARRE - dx) / PAS_X), i1 = Math.floor(((a + 1) * CARRE - 1e-4 - dx) / PAS_X);
    for (let i = i0; i <= i1; i++) {
      const x = i * PAS_X + dx, [q, r] = versHex(x, z), t = idxDe(q, r); if (t < 0) continue;
      const [cx, cz] = hexCentre(q, r), ex = x - cx, ez = z - cz;
      if (Math.max(Math.abs(ex), Math.abs(0.5 * ex + 0.866 * ez), Math.abs(-0.5 * ex + 0.866 * ez)) > 0.84) continue;   // un liseré nu entre les tuiles
      parVar[T.variete[t]].push(x, z, q, r, R(), T.secteur[t]);
    }
  }
  const meshes = [];
  parVar.forEach((pts, v) => {
    const n = pts.length / 6; if (!n) return;
    const g = FLEUR_GEOS[v].clone(), tuile = new Float32Array(n * 4), m = new THREE.InstancedMesh(g, MATS_FLEUR[v], n);
    for (let k = 0; k < n; k++) {
      const x = pts[k * 6], z = pts[k * 6 + 1], al = pts[k * 6 + 4];
      _q.setFromEuler(_e.set((al - 0.5) * 0.16, al * 6.283, (((al * 97) % 1) - 0.5) * 0.16));   // seule l'inclinaison varie
      m.setMatrixAt(k, _m.compose(_p.set(x, H(x, z), z), _q, _s.set(1, 1, 1)));
      tuile[k * 4] = pts[k * 6 + 2]; tuile[k * 4 + 1] = pts[k * 6 + 3]; tuile[k * 4 + 2] = al; tuile[k * 4 + 3] = pts[k * 6 + 5];
    }
    g.setAttribute('aTuile', new THREE.InstancedBufferAttribute(tuile, 4));
    m.computeBoundingSphere(); m.receiveShadow = true; m.castShadow = false; m.userData.carre = true;
    scene.add(m); meshes.push(m);
  });
  return meshes;
}
function majFleurs(budget = 2) {   // construit les carrés qui entrent dans le rayon, libère ceux qui en sortent
  const px = camera.position.x, pz = camera.position.z, rc = Math.ceil((R_FLEURS + CARRE) / CARRE), a0 = Math.floor(px / CARRE), b0 = Math.floor(pz / CARRE);
  for (const [k, l] of CARRES) { const [a, b] = k.split(',').map(Number); if (Math.hypot((a + 0.5) * CARRE - px, (b + 0.5) * CARRE - pz) > R_FLEURS + CARRE * 2) { for (const m of l) { scene.remove(m); m.geometry.dispose(); m.dispose(); } CARRES.delete(k); } }
  const aFaire = [];
  for (let a = a0 - rc; a <= a0 + rc; a++) for (let b = b0 - rc; b <= b0 + rc; b++) { const k = a + ',' + b; if (CARRES.has(k)) continue; const d = Math.hypot((a + 0.5) * CARRE - px, (b + 0.5) * CARRE - pz); if (d < R_FLEURS + CARRE * 0.75) aFaire.push([d, a, b, k]); }
  aFaire.sort((u, v) => u[0] - v[0]);
  for (const [, a, b, k] of aFaire.slice(0, budget)) CARRES.set(k, construireCarre(a, b));
}
function fleurirTuile(i, t) { T.vert[i] = 1; T.t0[i] = t; ecrireTuile(i); }   // la tuile bleuit, ses fleurs se redressent
function fanerTuile(i) { T.vert[i] = 0; T.t0[i] = 1e6; ecrireTuile(i); }
// Chardons gris (à arracher).
const chardonGeo = (() => { const parts = []; for (let k = 0; k < 7; k++) { const a = k * 0.9, c = new THREE.ConeGeometry(0.03, 0.42 + (k % 3) * 0.1, 4).translate(0, 0.2, 0).rotateZ(0.35).rotateY(a); parts.push(c.index ? c.toNonIndexed() : c); } parts.push(new THREE.IcosahedronGeometry(0.07, 0).translate(0, 0.5, 0)); const pos = [], nor = []; parts.forEach((p) => { pos.push(...p.attributes.position.array); nor.push(...p.attributes.normal.array); }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g; })();
const chardons = new THREE.InstancedMesh(chardonGeo, new THREE.MeshStandardMaterial({ color: 0x8c8794, roughness: 0.9, flatShading: true }), NT * 3);
const slotsChardon = new Map();
{ let n = 0; for (let i = 0; i < NT; i++) if (T.sorte[i] === 1) { const R = mulberry(i * 17 + 3), l = []; for (let k = 0; k < 3; k++) { const a = R() * 6.28, d = R() * 0.6, x = T.x[i] + Math.cos(a) * d, z = T.z[i] + Math.sin(a) * d, sc = 0.9 + R() * 0.5; chardons.setMatrixAt(n, _m.compose(_p.set(x, H(x, z), z), _q.setFromEuler(_e.set(0, R() * 6, 0)), _s.set(sc, sc, sc))); l.push(n++); } slotsChardon.set(i, l); } chardons.count = n; chardons.castShadow = true; scene.add(chardons); }
function desherber(i) { T.sorte[i] = 0; ecrireTuile(i); for (const j of slotsChardon.get(i) || []) chardons.setMatrixAt(j, _m.makeScale(0, 0, 0)); chardons.instanceMatrix.needsUpdate = true; }
// Les Azurelles mères sauvages : isolées, très grandes, luisantes, avec une colonne de lumière qu'on repère de loin.
const mereGeo = fleurGeo({ petales: 8, h: 0.75, rr: 0.26, pf: 0.16 });
const M_MERE = new THREE.MeshStandardMaterial({ color: 0x6f9cf0, emissive: 0x5b8cff, emissiveIntensity: 1.2, roughness: 0.4, side: THREE.DoubleSide });
const meres = new THREE.InstancedMesh(mereGeo, M_MERE, 160);
const M_RAYON = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: UTEMPS },
  vertexShader: 'varying float vY; void main(){ vY = position.y / 14.0; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
  fragmentShader: 'varying float vY; uniform float uT; void main(){ gl_FragColor = vec4(vec3(0.25, 0.45, 1.0) * pow(1.0 - vY, 2.0) * (0.28 + 0.08 * sin(uT * 2.0)), 1.0); }' });
const rayons = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.22, 14, 8, 1, true).translate(0, 7, 0), M_RAYON, 160);
const slotsMere = new Map();
{ let n = 0; for (let i = 0; i < NT && n < 160; i++) if (T.sorte[i] === 3) { _m.compose(_p.set(T.x[i], H(T.x[i], T.z[i]), T.z[i]), _q.identity(), _s.set(1, 1, 1)); meres.setMatrixAt(n, _m); rayons.setMatrixAt(n, _m); slotsMere.set(i, n++); } meres.count = rayons.count = n; meres.castShadow = true; scene.add(meres, rayons); }
function cueillirMere(i) { const j = slotsMere.get(i); if (j === undefined) return; meres.setMatrixAt(j, _m.makeScale(0, 0, 0)); rayons.setMatrixAt(j, _m.makeScale(0, 0, 0)); meres.instanceMatrix.needsUpdate = rayons.instanceMatrix.needsUpdate = true; T.sorte[i] = 0; ecrireTuile(i); }
