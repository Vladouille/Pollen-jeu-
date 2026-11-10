
// =====================================================================
// 4. La planète : une sphère de 500 m de rayon (environ 3 km de tour). « Haut » = du centre vers soi.
//    Les tuiles sont celles d'un icosaèdre subdivisé 256 fois par arête : des hexagones d'environ 2 m (et douze
//    pentagones aux sommets). Une tuile = (face, i, j) ; la même fonction de repérage tourne ici et dans le shader du sol.
//    Le relief est un bruit appliqué au rayon : océan, continents, collines, montagnes ; plat autour de la base.
//    Les six secteurs sont des disques de la planète, cernés d'un liseré lumineux ; le reste est sauvage.
// =====================================================================
const RP = 500, NSUB = 256, N1 = NSUB + 1, NIVEAU_MER = -0.5, POLE = new V3(0, 1, 0);
const NM = MOBILE ? 80 : 128;   // finesse du maillage du sol, par arête de face
const ICO = (() => {
  const t = (1 + Math.sqrt(5)) / 2, v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((a) => new V3(...a).normalize());
  const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  return f.map(([a, b, c]) => { const A = v[a], B = v[b], C = v[c], M = new THREE.Matrix3().set(A.x, B.x, C.x, A.y, B.y, C.y, A.z, B.z, C.z); return { A, B, C, inv: M.clone().invert(), cen: A.clone().add(B).add(C).normalize() }; });
})();
const _w = new V3(), _d = new V3(), _d2 = new V3();
function faceDe(d) { let m = -2, f = 0; for (let k = 0; k < 20; k++) { const t = d.dot(ICO[k].cen); if (t > m) { m = t; f = k; } } return f; }
function treillis(f, d, n = NSUB) { _w.copy(d).applyMatrix3(ICO[f].inv); const s = _w.x + _w.y + _w.z; return [_w.y / s * n, _w.z / s * n]; }   // coordonnées (u, v) dans la face
function arrondir(u, v) {   // le sommet du treillis le plus proche (arrondi « cube », comme pour toute grille hexagonale)
  const y = -u - v; let rx = Math.round(u), ry = Math.round(y), rz = Math.round(v); const dx = Math.abs(rx - u), dy = Math.abs(ry - y), dz = Math.abs(rz - v);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  return [rx, rz];
}
const idDe = (f, i, j) => (f * N1 + i) * N1 + j;
const decoder = (id) => [Math.floor(id / (N1 * N1)), Math.floor(id / N1) % N1, id % N1];
function dirTuile(f, i, j, out) { const F = ICO[f]; return out.set(0, 0, 0).addScaledVector(F.A, (NSUB - i - j) / NSUB).addScaledVector(F.B, i / NSUB).addScaledVector(F.C, j / NSUB).normalize(); }
const dirDe = (id, out = new V3()) => { const [f, i, j] = decoder(id); return dirTuile(f, i, j, out); };
// Une tuile posée sur une arête appartient à deux faces (cinq à un sommet) : son nom canonique est celui de la plus petite face.
const CANON = new Map();
function alias(f, i, j) {   // tous les noms (face, i, j) de cette tuile
  if (i > 0 && j > 0 && i + j < NSUB) return [[f, i, j]];
  const d = dirTuile(f, i, j, new V3()), out = [];
  for (let g = 0; g < 20; g++) { const [u, v] = treillis(g, d); if (u > -1e-4 && v > -1e-4 && u + v < NSUB + 1e-4) { const [a, b] = arrondir(u, v); out.push([g, a, b]); } }
  return out.length ? out : [[f, i, j]];
}
function canon(f, i, j) {
  if (i > 0 && j > 0 && i + j < NSUB) return idDe(f, i, j);
  const k = idDe(f, i, j); let c = CANON.get(k);
  if (c === undefined) { const a = alias(f, i, j)[0]; c = idDe(a[0], a[1], a[2]); CANON.set(k, c); }
  return c;
}
function tuileDe(d) { const f = faceDe(d), [u, v] = treillis(f, d), [i, j] = arrondir(u, v); return canon(f, i, j); }   // d : direction unitaire
function voisinsDe(id) {   // les six tuiles voisines (cinq autour d'un pentagone)
  const [f, i, j] = decoder(id), out = [];
  for (const [a, b] of [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]) {
    const ni = i + a, nj = j + b; let v;
    if (ni >= 0 && nj >= 0 && ni + nj <= NSUB) v = canon(f, ni, nj); else v = tuileDe(dirTuile(f, ni, nj, _d));   // hors de la face : on retombe sur la face voisine
    if (v !== id && !out.includes(v)) out.push(v);
  }
  return out;
}
const PAS = ICO[0].A.distanceTo(ICO[0].B) / NSUB * RP;   // pas du treillis dans le plan d'une face : environ 2,05 m

// --- Repères locaux. ---
function repere(p) { const up = new V3().copy(p).normalize(), est = new V3().crossVectors(POLE, up); if (est.lengthSq() < 1e-8) est.set(1, 0, 0); est.normalize(); return { up, est, nord: new V3().crossVectors(up, est) }; }
function tangent(p, v, out = new V3()) { _d.copy(p).normalize(); return out.copy(v).addScaledVector(_d, -v.dot(_d)).normalize(); }   // v ramené dans le plan du sol en p
const _mb = new THREE.Matrix4(), _x = new V3(), _y = new V3();
function poserSur(obj, p, face) {   // pose un objet debout en p, sa face avant (+z) tournée vers le vecteur « face »
  _y.copy(p).normalize(); const z = tangent(p, face, new V3()); _x.crossVectors(_y, z);
  obj.position.copy(p); obj.quaternion.setFromRotationMatrix(_mb.makeBasis(_x, _y, z)); obj.updateMatrixWorld(true);
  obj.userData.ax = _x.clone(); obj.userData.az = z; return obj;
}
const qHaut = (dir, out = new THREE.Quaternion()) => out.setFromUnitVectors(POLE, dir);

// --- Les zones : la base et les six secteurs. Chaque secteur est un disque, sa variété d'Azurelle vaut plus que la précédente. ---
const AZUR = { petale: 0x3b6fd4, coeur: 0xf5c518, tige: 0x4a7a3c };
const VARIETES = [   // pétales, hauteur de tige (m), rayon des pointes, profondeur de la coupe, prix de la tuile
  { nom: 'Azurelle commune', petales: 5, h: 0.25, rr: 0.07, pf: 0.12, prix: 3 },
  { nom: 'Azurelle des champs', petales: 6, h: 0.35, rr: 0.075, pf: 0.13, prix: 7 },
  { nom: 'Azurelle double', petales: 10, h: 0.4, rr: 0.085, pf: 0.12, prix: 15 },
  { nom: 'Azurelle royale', petales: 7, h: 0.4, rr: 0.13, pf: 0.06, prix: 32 },
  { nom: 'Azurelle de nuit', petales: 6, h: 0.35, rr: 0.09, pf: 0.1, prix: 70, ferme: true },
  { nom: 'Azurelle mère', petales: 8, h: 0.5, rr: 0.15, pf: 0.1, prix: 150 },
];
const NSECT = 6, RB = 34;   // rayon de l'esplanade de la base (sans tuiles)
const BASE_DIR = new V3(0.45, 0.35, 0.82).normalize();
function deplacer(dir, capDeg, dist) {   // la direction atteinte en partant de dir, au cap donné (0 = nord, 90 = est), après dist mètres
  const { up, est, nord } = repere(dir), a = capDeg * Math.PI / 180, t = new V3().addScaledVector(nord, Math.cos(a)).addScaledVector(est, Math.sin(a)), w = dist / RP;
  return up.multiplyScalar(Math.cos(w)).addScaledVector(t, Math.sin(w)).normalize();
}
const SECTEURS = [[0, 0, 50], [80, 150, 38], [55, 340, 45], [115, 620, 52], [70, 980, 60], [95, 1500, 70]].map(([cap, dist, r], k) => ({ c: k ? deplacer(BASE_DIR, cap, dist) : BASE_DIR.clone(), r, r0: k ? 0 : RB }));
const OUVERTS = { value: 1 };   // nombre de secteurs ouverts
const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function relief(d) {   // hauteur du sol au-dessus du rayon de référence, en mètres (négatif : sous la mer)
  const x = d.x, y = d.y, z = d.z, s = (fbm3(x * 1.7 + 3.1, y * 1.7 + 1.3, z * 1.7 + 7.7, 4) - 0.47) * 2.2;
  let h;
  if (s < 0) h = s * 55;
  else { const terre = Math.min(1, s / 0.08); h = s * 8 + ((fbm3(x * 9, y * 9, z * 9, 2) - 0.5) * 9 + Math.pow(Math.max(0, fbm3(x * 4.3 + 7, y * 4.3, z * 4.3, 2) - 0.58) / 0.42, 1.5) * 60) * terre; }
  for (let k = 0; k < NSECT; k++) {   // autour de la base et des secteurs : terre ferme, relief doux
    const S = SECTEURS[k], a = RP * Math.sqrt(Math.max(0, 2 - 2 * d.dot(S.c))); if (a > S.r + 45) continue;
    const doux = 1.2 + (bruit3(x * 12 + k, y * 12, z * 12) - 0.5) * 2.4 * (k ? 1 : lisse(RB + 1, RB + 12, a));
    h = lerp(h, doux, 1 - lisse(S.r + 5, S.r + 45, a));
  }
  return h;
}
// Les hauteurs sont calculées une fois sur le maillage du sol ; « sol » interpole ce maillage : un objet posé touche donc
// exactement la surface dessinée, rien ne flotte.
const ixM = (i, j) => i * (NM + 1) - (i * (i - 1) >> 1) + j;
const HAUTEURS = ICO.map((F, f) => { const a = new Float32Array((NM + 1) * (NM + 2) / 2); for (let i = 0; i <= NM; i++) for (let j = 0; j <= NM - i; j++) { _d2.set(0, 0, 0).addScaledVector(F.A, (NM - i - j) / NM).addScaledVector(F.B, i / NM).addScaledVector(F.C, j / NM).normalize(); a[ixM(i, j)] = RP + relief(_d2); } return a; });
function sol(d) {   // rayon du sol dans la direction unitaire d
  const f = faceDe(d), Hf = HAUTEURS[f]; let [u, v] = treillis(f, d, NM); u = clamp(u, 0, NM); v = clamp(v, 0, NM - u);
  let i = Math.floor(u), j = Math.floor(v); if (i + j >= NM) { if (i > 0) i--; else j--; }
  const fu = u - i, fv = v - j;
  if (fu + fv <= 1 || i + j >= NM - 1) return Hf[ixM(i, j)] * (1 - fu - fv) + Hf[ixM(i + 1, j)] * fu + Hf[ixM(i, j + 1)] * fv;
  return Hf[ixM(i + 1, j + 1)] * (fu + fv - 1) + Hf[ixM(i + 1, j)] * (1 - fv) + Hf[ixM(i, j + 1)] * (1 - fu);
}
function surSol(p, h = 0, out = new V3()) { out.copy(p).normalize(); return out.multiplyScalar(sol(out) + h); }   // le point du sol sous (ou au-dessus de) p
const altitude = (p) => { _d.copy(p).normalize(); return sol(_d) - RP; };
const BASE = surSol(BASE_DIR), REP_BASE = repere(BASE);
const local = (x, z, h = 0) => surSol(new V3().copy(BASE).addScaledVector(REP_BASE.est, x).addScaledVector(REP_BASE.nord, -z), h);   // un point de la base : x vers l'est, z vers le sud
const versBase = (p) => tangent(p, new V3().subVectors(BASE, p));   // le vecteur « face à la place » pour un bâtiment posé en p

// --- Les tuiles des secteurs (les seules qui portent des fleurs). Sortes : 0 normale, 1 chardons, 2 aride, 3 mère sauvage, 4 nue. ---
const T = { n: 0, id: [], sect: [], vert: [], sorte: [], irrigue: [], nectar: [], t0: [], pos: [], dir: [] };
const IDX = new Map();   // id canonique → rang dans T
for (let k = 0; k < NSECT; k++) {
  const S = SECTEURS[k], vu = new Set(), file = [tuileDe(k ? S.c : deplacer(S.c, 0, RB + 4))], liste = []; vu.add(file[0]);
  while (file.length) {
    const id = file.pop(), d = dirDe(id, new V3()), a = RP * d.distanceTo(S.c);
    if (a > S.r) continue;
    if (a >= S.r0) liste.push([id, d, a]);
    for (const v of voisinsDe(id)) if (!vu.has(v)) { vu.add(v); file.push(v); }
  }
  liste.sort((u, v) => u[0] - v[0]);   // ordre stable : c'est celui de la sauvegarde
  for (const [id, d, a] of liste) {
    if (IDX.has(id)) continue;
    const R = mulberry(id * 7 + 13), aride = (k === 3 || k === 4) && bruit3(d.x * 60 + 3, d.y * 60, d.z * 60) > 0.55;
    const jardin = k === 0 && a < RB + 3.5, sorte = jardin ? 0 : aride ? 2 : R() < 0.1 ? 1 : (R() < 0.007 && k > 0) ? 3 : 0;
    IDX.set(id, T.n++); T.id.push(id); T.sect.push(k); T.vert.push(jardin ? 1 : 0); T.sorte.push(sorte); T.irrigue.push(0); T.nectar.push(0); T.t0.push(jardin ? -1000 : 1e6);
    T.dir.push(d); T.pos.push(new V3().copy(d).multiplyScalar(sol(d)));
  }
}
const NT = T.n;
const tuileA = (p) => { _d2.copy(p).normalize(); const k = IDX.get(tuileDe(_d2)); return k === undefined ? -1 : k; };   // la tuile de secteur sous le point p, ou -1

// --- L'état des tuiles, lu par le shader du sol : une texture à 20 couches (une par face), un texel par tuile.
//     R en fleurs, G sorte, B irriguée, A tuile de secteur. Seule la couche touchée est renvoyée à la carte graphique. ---
const etatSol = new Uint8Array(20 * N1 * N1 * 4);
const etatTex = new THREE.DataArrayTexture(etatSol, N1, N1, 20); etatTex.format = THREE.RGBAFormat; etatTex.type = THREE.UnsignedByteType; etatTex.magFilter = etatTex.minFilter = THREE.NearestFilter; etatTex.generateMipmaps = false; etatTex.needsUpdate = true;
const ALIAS = T.id.map((id) => alias(...decoder(id)));
function ecrireTuile(k) {
  for (const [f, i, j] of ALIAS[k]) { const o = ((f * N1 + j) * N1 + i) * 4; etatSol[o] = T.vert[k] * 255; etatSol[o + 1] = T.sorte[k] * 50; etatSol[o + 2] = T.irrigue[k] * 255; etatSol[o + 3] = 255; etatTex.addLayerUpdate(f); }
  etatTex.needsUpdate = true;
}
for (let k = 0; k < NT; k++) ecrireTuile(k);
etatTex.clearLayerUpdates();   // premier envoi : la texture entière
const R_FLEURS = MOBILE ? 16 : 22;
const SOL_U = {
  uCen: { value: ICO.map((F) => F.cen) }, uInv: { value: ICO.map((F) => F.inv) }, uEtat: { value: etatTex },
  uSect: { value: SECTEURS.map((S) => new THREE.Vector4(S.c.x, S.c.y, S.c.z, S.r)) }, uProg: { value: [0, 0, 0, 0, 0, 0] }, uOuverts: OUVERTS, uBase: { value: BASE_DIR },
  uSel: { value: [0, 1, 2, 3, 4].map(() => new V3(-1, 0, 0)) }, uSelI: { value: 0 }, uCarte: { value: 0 }, uCons: { value: 0 },
  uSec: { value: new THREE.Color(CHARTE.sec) }, uVert: { value: new THREE.Color(CHARTE.prairie) }, uBleu: { value: new THREE.Color(AZUR.petale) },
};
const SEL = { tuiles: [], y: 0 };   // tuiles visées et avancement de la jauge
function selectionner(liste) { SEL.tuiles = liste; for (let s = 0; s < 5; s++) { const k = liste[s]; if (k === undefined) SOL_U.uSel.value[s].set(-1, 0, 0); else { const [f, i, j] = decoder(T.id[k]); SOL_U.uSel.value[s].set(f, i, j); } } }
const GLSL_TUILE = `
  uniform vec3 uCen[20]; uniform mat3 uInv[20];
  void tuileDe(vec3 d, out int f, out vec2 uv) { float m = -2.0; f = 0; for (int k = 0; k < 20; k++) { float t = dot(d, uCen[k]); if (t > m) { m = t; f = k; } } vec3 w = uInv[f] * d; uv = w.yz / (w.x + w.y + w.z) * ${NSUB}.0; }
  vec2 arrondir(vec2 uv) { vec3 c = vec3(uv.x, -uv.x - uv.y, uv.y); vec3 r = floor(c + 0.5); vec3 e = abs(r - c); if (e.x > e.y && e.x > e.z) r.x = -r.y - r.z; else if (e.y > e.z) r.y = -r.x - r.z; else r.z = -r.x - r.y; return r.xz; }
  float bordHex(vec2 d) { return 2.0 * max(abs(d.x + 0.5 * d.y), max(abs(d.y + 0.5 * d.x), 0.5 * abs(d.x - d.y))); }`;
const M_SOL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }); M_SOL.userData.sansReflet = true;
M_SOL.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, SOL_U);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMonde;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
    precision highp sampler2DArray;
    varying vec3 vMonde; uniform sampler2DArray uEtat; uniform vec4 uSect[6]; uniform float uProg[6]; uniform float uOuverts, uSelI, uCarte, uCons; uniform vec3 uBase, uSel[5], uSec, uVert, uBleu;
    float gLis, gSel, gGrille;` + GLSL_TUILE)
    .replace('#include <color_fragment>', `#include <color_fragment>
    vec3 dir = normalize(vMonde); float aBase = ${RP}.0 * distance(dir, uBase), dcam = distance(vMonde, cameraPosition);
    int sk = -1; float lisD = 1e3;
    for (int k = 0; k < 6; k++) { float a = ${RP}.0 * distance(dir, uSect[k].xyz); lisD = min(lisD, abs(a - uSect[k].w)); if (a < uSect[k].w) sk = k; }
    bool grille = uCons > 0.5 && dcam < 34.0;
    float bord = 0.0; vec4 st = vec4(0.0); int tf = 0; vec2 tij = vec2(0.0), uv = vec2(0.0);
    if (sk >= 0 || grille || aBase < ${RB}.0) { tuileDe(dir, tf, uv); tij = arrondir(uv); bord = bordHex(uv - tij); if (sk >= 0) st = texelFetch(uEtat, ivec3(int(tij.x), int(tij.y), tf), 0); }
    vec3 solc = diffuseColor.rgb;
    if (st.a > 0.5) {
      float sorte = st.g * 255.0 / 50.0, aride = (abs(sorte - 2.0) < 0.5 ? 1.0 : 0.0) * (1.0 - st.b);
      vec3 sec = mix(uSec, uSec * vec3(0.84, 0.8, 0.72), aride); sec = mix(sec, sec * 0.8, st.b * (1.0 - st.r)); sec = abs(sorte - 4.0) < 0.5 ? vec3(0.42, 0.33, 0.24) : sec;
      if (float(sk) >= uOuverts) sec = mix(sec, vec3(0.55, 0.56, 0.58), 0.45);                                  // secteur encore fermé : en friche
      solc = mix(sec, mix(uVert, uBleu, smoothstep(${R_FLEURS - 6}.0, ${R_FLEURS - 1}.0, dcam) * 0.8), st.r);     // de loin, le bleu des Azurelles
      solc *= 1.0 - 0.22 * smoothstep(0.93, 0.985, bord);                                                        // rainure entre les tuiles
    }
    if (aBase < ${RB}.0) { vec2 u2 = uv * 0.5; solc = vec3(0.86, 0.85, 0.82) * (1.0 - 0.09 * smoothstep(0.93, 0.97, bordHex(u2 - arrondir(u2)))); }   // dalles claires de la base
    if (uCarte > 0.5 && sk >= 0) solc = float(sk) < uOuverts ? mix(vec3(0.78, 0.72, 0.58), uBleu, uProg[sk]) : vec3(0.5, 0.52, 0.55);   // sur le globe : l'avancement
    if (uCons > 0.5) solc *= vec3(0.82, 0.92, 1.12);                                                             // mode construction : le monde bleuit
    diffuseColor.rgb = solc;
    gSel = 0.0; for (int s = 0; s < 5; s++) if (float(tf) == uSel[s].x && tij == uSel[s].yz) gSel = uSelI * smoothstep(0.86, 0.95, bord);
    gLis = smoothstep(uCarte > 0.5 ? 4.0 : 0.16, uCarte > 0.5 ? 1.0 : 0.05, lisD);
    gGrille = grille ? smoothstep(0.93, 0.985, bord) * (1.0 - dcam / 34.0) : 0.0;`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    totalEmissiveRadiance += gSel * vec3(0.96, 0.7, 0.1) * 0.7 + vec3(0.31, 0.84, 0.89) * (gLis * 0.9 + gGrille * 0.55);`);
};
// --- Le maillage du sol : vingt faces (chacune écartée par la caméra quand elle est hors champ), couleurs par sommet :
//     océans sableux sous l'eau, continents verts et beiges, roche en altitude, calottes blanches aux pôles. ---
const PLANETE = new THREE.Group(); scene.add(PLANETE);
{
  const bord = new Map(), faces = [], cl = new THREE.Color(), vert = new THREE.Color(0x7c9c52), beige = new THREE.Color(0xb7ab8c), roche = new THREE.Color(0x8d8a84), sable = new THREE.Color(0xc9bd98), blanc = new THREE.Color(0xf2f4f6);
  ICO.forEach((F, f) => {
    const n = (NM + 1) * (NM + 2) / 2, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), idx = [];
    for (let i = 0; i <= NM; i++) for (let j = 0; j <= NM - i; j++) {
      const k = ixM(i, j); _d2.set(0, 0, 0).addScaledVector(F.A, (NM - i - j) / NM).addScaledVector(F.B, i / NM).addScaledVector(F.C, j / NM).normalize();
      const r = HAUTEURS[f][k], h = r - RP; pos.set([_d2.x * r, _d2.y * r, _d2.z * r], k * 3);
      cl.copy(beige).lerp(vert, lisse(0.42, 0.58, fbm3(_d2.x * 6 + 9, _d2.y * 6, _d2.z * 6, 2)));
      if (h < 0.3) cl.lerp(sable, lisse(0.3, -0.8, h)); if (h > 22) cl.lerp(roche, lisse(22, 34, h)); if (h > 44) cl.lerp(blanc, lisse(44, 52, h));
      if (Math.abs(_d2.y) > 0.9) cl.lerp(blanc, lisse(0.9, 0.93, Math.abs(_d2.y)));
      col.set([cl.r, cl.g, cl.b], k * 3);
    }
    for (let i = 0; i < NM; i++) for (let j = 0; j < NM - i; j++) { idx.push(ixM(i, j), ixM(i + 1, j), ixM(i, j + 1)); if (i + j < NM - 1) idx.push(ixM(i + 1, j), ixM(i + 1, j + 1), ixM(i, j + 1)); }
    if (new V3().subVectors(F.B, F.A).cross(new V3().subVectors(F.C, F.A)).dot(F.cen) < 0) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }   // faces tournées vers l'extérieur
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const nor = g.attributes.normal;   // les sommets partagés entre deux faces prennent la même normale : pas de couture visible
    const noter = (i, j) => { const k = ixM(i, j), c = Math.round(pos[k * 3] * 20) + ',' + Math.round(pos[k * 3 + 1] * 20) + ',' + Math.round(pos[k * 3 + 2] * 20); if (!bord.has(c)) bord.set(c, { n: new V3(), l: [] }); const e = bord.get(c); e.n.x += nor.getX(k); e.n.y += nor.getY(k); e.n.z += nor.getZ(k); e.l.push([nor, k]); };
    for (let i = 0; i <= NM; i++) { noter(i, 0); if (i < NM) noter(0, NM - i); if (i > 0 && i < NM) noter(i, NM - i); }
    faces.push(g);
  });
  for (const e of bord.values()) { e.n.normalize(); for (const [nor, k] of e.l) nor.setXYZ(k, e.n.x, e.n.y, e.n.z); }
  for (const g of faces) { const m = new THREE.Mesh(g, M_SOL); m.receiveShadow = true; PLANETE.add(m); }
}
// La mer, les calottes de glace sur l'eau, quelques nuages qui dérivent, et le halo d'atmosphère (visible depuis l'espace).
const MER = new THREE.Mesh(new THREE.SphereGeometry(RP + NIVEAU_MER, 96, 64), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.1 }));
{ const p = MER.geometry.attributes.position, c = new Float32Array(p.count * 3), cl = new THREE.Color(); for (let k = 0; k < p.count; k++) { const y = Math.abs(p.getY(k)) / (RP + NIVEAU_MER); cl.set(0x2f6fb8).lerp(new THREE.Color(0xf2f4f6), lisse(0.9, 0.93, y)); c.set([cl.r, cl.g, cl.b], k * 3); } MER.geometry.setAttribute('color', new THREE.BufferAttribute(c, 3)); MER.receiveShadow = true; scene.add(MER); }
const NUAGES = new THREE.Group(); scene.add(NUAGES);
{ const R = mulberry(77), m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), 240), q = new THREE.Quaternion(), s = new V3(), p = new V3(), M4 = new THREE.Matrix4(); m.material.userData.sansReflet = true;
  let n = 0; for (let k = 0; k < 80; k++) { const d = new V3(R() * 2 - 1, (R() * 2 - 1) * 0.8, R() * 2 - 1).normalize(), h = 38 + R() * 20; for (let b = 0; b < 3; b++) { const e = deplacer(d, R() * 360, b * (6 + R() * 6)), w = 7 + R() * 9; M4.compose(p.copy(e).multiplyScalar(RP + h), qHaut(e, q), s.set(w, w * 0.32, w * 0.7)); m.setMatrixAt(n++, M4); } }
  m.frustumCulled = false; NUAGES.add(m); }
MAJ.push((dt) => { NUAGES.rotation.y += dt * 0.0016; });
const HALO = new THREE.Mesh(new THREE.SphereGeometry(RP + 45, 64, 40), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uSol: { value: SOLEIL } },
  vertexShader: 'varying vec3 vN, vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(w.xyz); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: 'varying vec3 vN, vV; uniform vec3 uSol; void main(){ float f = pow(clamp(1.0 + dot(vN, vV), 0.0, 1.0), 3.0); gl_FragColor = vec4(vec3(0.3, 0.6, 1.0) * f * (0.25 + 0.75 * smoothstep(-0.3, 0.4, dot(vN, uSol))), 1.0); }' }));
HALO.visible = false; scene.add(HALO);

// =====================================================================
// L'Azurelle : coupe de pétales arrondis (5 à 10 selon la variété), cœur jaune, tige droite, deux feuilles. Une seule
// couleur, ±8 % de luminosité par fleur. Plantée en rangs réguliers (environ 70 par tuile) ; fanée : beige-gris, penchée.
// =====================================================================
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3();
function fleurGeo(v) {
  const pos = [], nor = [], part = [];   // part : 0 tige et feuilles, 1 pétales (1,5 au bord), 2 cœur
  const tri = (a, b, c, na, nb, nc, k, kb, kc) => { pos.push(...a, ...b, ...c); nor.push(...na, ...nb, ...nc); part.push(k, kb === undefined ? k : kb, kc === undefined ? k : kc); };
  const y0 = v.h - 0.03;
  for (let k = 0; k < 3; k++) { const a0 = k / 3 * 6.283, a1 = (k + 1) / 3 * 6.283, r = 0.013, n0 = [Math.cos(a0), 0, Math.sin(a0)], n1 = [Math.cos(a1), 0, Math.sin(a1)], p0 = [n0[0] * r, 0, n0[2] * r], p1 = [n1[0] * r, 0, n1[2] * r], h0 = [p0[0], y0, p0[2]], h1 = [p1[0], y0, p1[2]]; tri(p0, h0, h1, n0, n0, n1, 0); tri(p0, h1, p1, n0, n1, n1, 0); }
  for (const s of [-1, 1]) { const b = [0, 0.02, 0], m1 = [s * 0.06, 0.09, 0.025], m2 = [s * 0.06, 0.09, -0.025], t = [s * 0.11, 0.15, 0], n = [s * 0.5, 0.85, 0]; tri(b, m1, t, n, n, n, 0); tri(b, t, m2, n, n, n, 0); }
  const N = v.petales * 2, fond = [0, y0, 0], milieu = [], bordP = [];
  for (let k = 0; k < N; k++) { const a = k / N * 6.283, pointe = k % 2 === 0, rb = pointe ? v.rr : v.rr * 0.8; milieu.push([Math.cos(a) * v.rr * 0.7, y0 + v.pf * 0.4, Math.sin(a) * v.rr * 0.7]); bordP.push([Math.cos(a) * rb, y0 + (pointe ? v.pf : v.pf * 0.75), Math.sin(a) * rb]); }
  const nb = (p, ny) => { const l = Math.hypot(p[0], ny, p[2]); return [p[0] / l, ny / l, p[2] / l]; };
  for (let k = 0; k < N; k++) {
    const m0 = milieu[k], m1 = milieu[(k + 1) % N], b0 = bordP[k], b1 = bordP[(k + 1) % N];
    if (MOBILE) { tri(fond, b1, b0, [0, -0.3, 0], nb(b1, 0.7), nb(b0, 0.7), 1, 1.5, 1.5); continue; }
    tri(fond, m1, m0, [0, -0.3, 0], nb(m1, 0.25), nb(m0, 0.25), 1); tri(m0, m1, b1, nb(m0, 0.25), nb(m1, 0.25), nb(b1, 0.7), 1, 1, 1.5); tri(m0, b1, b0, nb(m0, 0.25), nb(b1, 0.7), nb(b0, 0.7), 1, 1.5, 1.5);
  }
  const c = [0, y0 + v.pf * 0.6, 0], cp = [0, 1, 0], rc = v.rr * 0.3;
  for (let k = 0; k < 4; k++) { const a0 = k / 4 * 6.283, a1 = (k + 1) / 4 * 6.283; tri([Math.cos(a0) * rc, y0 + 0.02, Math.sin(a0) * rc], c, [Math.cos(a1) * rc, y0 + 0.02, Math.sin(a1) * rc], cp, cp, cp, 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  return g;
}
const FLEUR_GEOS = VARIETES.map(fleurGeo), UTEMPS = { value: 0 }, VAGUE = { value: new THREE.Vector4(0, 0, 0, -100) }, VAGUE_S = { value: -1 };   // vague de fin de secteur : centre, instant ; secteur
const glc = (hex) => new THREE.Color(hex).toArray().map((c) => c.toFixed(4)).join(', ');
const MATS_FLEUR = VARIETES.map((v, k) => {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, side: THREE.DoubleSide }); m.userData.sansReflet = true; m.userData.variete = k;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTemps: UTEMPS, uVague: VAGUE, uVagueS: VAGUE_S });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute float aPart, aT0, aAlea, aCache; uniform float uTemps, uVagueS; uniform vec4 uVague; varying vec3 vCouleur; varying float vLueur, vVie;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float t = clamp((uTemps - aT0) / 0.45, 0.0, 1.0), e = 1.0 - pow(1.0 - t, 3.0) * cos(t * 6.0);   // se redresse avec un rebond
        ${v.ferme ? 'if (aPart > 1.2) transformed.xz *= mix(0.25, 1.0, t);' : ''}
        float a = (1.0 - e) * (0.7 + aAlea * 0.3), cy = cos(a), sy = sin(a);                             // fanée : penchée vers le sol
        transformed = vec3(transformed.x, transformed.y * cy - transformed.z * sy, transformed.y * sy + transformed.z * cy);
        vec3 ici = instanceMatrix[3].xyz; transformed *= (1.0 - smoothstep(${R_FLEURS - 5}.0, ${R_FLEURS}.0, distance(ici, cameraPosition))) * (1.0 - aCache);
        vLueur = uVagueS == ${k}.0 ? exp(-pow((distance(ici, uVague.xyz) - (uTemps - uVague.w) * 14.0) / 2.5, 2.0)) : 0.0;   // la vague de fin de secteur
        transformed *= 1.0 + vLueur * 0.45;
        vec3 c = aPart > 1.8 ? vec3(${glc(AZUR.coeur)}) : aPart > 0.5 ? vec3(${glc(AZUR.petale)}) * (aPart > 1.2 ? 1.12 : 1.0) : vec3(${glc(AZUR.tige)});
        vCouleur = mix(aPart > 0.5 ? vec3(0.62, 0.58, 0.5) : vec3(0.5, 0.48, 0.38), c * (0.92 + aAlea * 0.16), t); vVie = t;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCouleur; varying float vLueur, vVie;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = vCouleur;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vCouleur * (0.16 + 0.08 * vVie + vLueur * 1.5);');
  };
  return m;
});
// Les fleurs sont construites par paquets de tuiles voisines, seulement près du joueur. Rangs : 18 cm entre les fleurs,
// 20 cm entre les rangs, en quinconce, alignés d'une tuile à l'autre.
const PAQUETS = new Map(), PAQUET_DE = [];
for (let k = 0; k < NT; k++) { const [f, i, j] = decoder(T.id[k]), c = f + ',' + (i >> 3) + ',' + (j >> 3); if (!PAQUETS.has(c)) PAQUETS.set(c, { tuiles: [], c: new V3(), mesh: null, plage: new Map() }); const P = PAQUETS.get(c); P.tuiles.push(k); P.c.add(T.pos[k]); PAQUET_DE.push(P); }
for (const P of PAQUETS.values()) P.c.multiplyScalar(1 / P.tuiles.length);
function construirePaquet(P) {
  const k0 = P.tuiles[0], f = decoder(T.id[k0])[0], F = ICO[f], e1 = new V3().subVectors(F.B, F.A).normalize(), e2 = new V3().subVectors(F.C, F.A); e2.addScaledVector(e1, -e2.dot(e1)).normalize();
  const s = PAS / RP, px = 0.18 / RP, pz = 0.2 / RP, pts = [];
  for (const k of P.tuiles) {
    const [, i, j] = decoder(T.id[k]), X0 = (i + j / 2) * s, Y0 = j * 0.8660254 * s, R = mulberry(T.id[k]), debut = pts.length / 5;
    for (let m = Math.ceil((Y0 - s * 0.7) / pz); m * pz <= Y0 + s * 0.7; m++) {
      const Y = m * pz, dx = (m & 1) * px / 2, v = Y / (0.8660254 * s) - j;
      for (let c = Math.ceil((X0 - s * 0.7 - dx) / px); c * px + dx <= X0 + s * 0.7; c++) {
        const X = c * px + dx, u = X / s - (v + j) / 2 - i;
        if (2 * Math.max(Math.abs(u + v / 2), Math.abs(v + u / 2), Math.abs(u - v) / 2) > 0.84) continue;   // un liseré nu entre les tuiles
        _d.copy(F.A).addScaledVector(e1, X).addScaledVector(e2, Y).normalize(); const r = sol(_d);
        pts.push(_d.x * r, _d.y * r, _d.z * r, R(), k);
      }
    }
    P.plage.set(k, [debut, pts.length / 5 - debut]);
  }
  const n = pts.length / 5, v = T.sect[k0], g = FLEUR_GEOS[v].clone(), m = new THREE.InstancedMesh(g, MATS_FLEUR[v], n), t0 = new Float32Array(n), alea = new Float32Array(n), cache = new Float32Array(n);
  for (let c = 0; c < n; c++) {
    const al = pts[c * 5 + 3], k = pts[c * 5 + 4]; _p.set(pts[c * 5], pts[c * 5 + 1], pts[c * 5 + 2]); _d.copy(_p).normalize();
    qHaut(_d, _q).multiply(_q2.setFromEuler(_e.set((al - 0.5) * 0.16, al * 6.283, (((al * 97) % 1) - 0.5) * 0.16)));   // seule l'inclinaison varie
    m.setMatrixAt(c, _m.compose(_p, _q, _s.set(1, 1, 1))); t0[c] = T.t0[k]; alea[c] = al; cache[c] = T.sorte[k] === 4 ? 1 : 0;
  }
  g.setAttribute('aT0', new THREE.InstancedBufferAttribute(t0, 1)); g.setAttribute('aAlea', new THREE.InstancedBufferAttribute(alea, 1)); g.setAttribute('aCache', new THREE.InstancedBufferAttribute(cache, 1));
  m.computeBoundingSphere(); m.receiveShadow = true; m.userData.paquet = true; scene.add(m); P.mesh = m;
}
function majFleurs(budget = 2) {   // construit les paquets qui entrent dans le rayon, libère ceux qui en sortent
  const c = camera.position, aFaire = [];
  for (const P of PAQUETS.values()) {
    const d = P.c.distanceTo(c);
    if (P.mesh) { if (d > R_FLEURS + 34) { scene.remove(P.mesh); P.mesh.geometry.dispose(); P.mesh.dispose(); P.mesh = null; P.plage.clear(); } } else if (d < R_FLEURS + 16) aFaire.push([d, P]);
  }
  aFaire.sort((u, v) => u[0] - v[0]);
  for (const [, P] of aFaire.slice(0, budget)) construirePaquet(P);
}
function majTuileFleurs(k) {   // reporte l'état d'une tuile sur ses fleurs, si elles sont construites
  const P = PAQUET_DE[k]; if (!P.mesh) return; const pl = P.plage.get(k); if (!pl) return;
  const a = P.mesh.geometry.attributes.aT0, c = P.mesh.geometry.attributes.aCache;
  for (let n = pl[0]; n < pl[0] + pl[1]; n++) { a.array[n] = T.t0[k]; c.array[n] = T.sorte[k] === 4 ? 1 : 0; }
  a.needsUpdate = true; c.needsUpdate = true;
}
function fleurirTuile(k, t) { T.vert[k] = 1; T.t0[k] = t; ecrireTuile(k); majTuileFleurs(k); }
function fanerTuile(k) { T.vert[k] = 0; T.t0[k] = 1e6; ecrireTuile(k); majTuileFleurs(k); }
function changerSorte(k, s) { T.sorte[k] = s; ecrireTuile(k); majTuileFleurs(k); }
// Chardons gris (à arracher) et Azurelles mères sauvages : isolées, très grandes, luisantes, une colonne de lumière les signale.
const chardonGeo = (() => { const parts = []; for (let k = 0; k < 7; k++) { const c = new THREE.ConeGeometry(0.03, 0.42 + (k % 3) * 0.1, 4).translate(0, 0.2, 0).rotateZ(0.35).rotateY(k * 0.9); parts.push(c.index ? c.toNonIndexed() : c); } parts.push(new THREE.IcosahedronGeometry(0.07, 0).translate(0, 0.5, 0)); const pos = [], nor = []; parts.forEach((p) => { pos.push(...p.attributes.position.array); nor.push(...p.attributes.normal.array); }); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g; })();
const chardons = new THREE.InstancedMesh(chardonGeo, new THREE.MeshStandardMaterial({ color: 0x8c8794, roughness: 0.9, flatShading: true }), NT * 2 + 2); chardons.material.userData.sansReflet = true;
const slotsChardon = new Map();
{ let n = 0; for (let k = 0; k < NT; k++) if (T.sorte[k] === 1) { const R = mulberry(k * 17 + 3), l = [], { est, nord } = repere(T.pos[k]); for (let c = 0; c < 2; c++) { const a = R() * 6.28, d = R() * 0.6, sc = 0.9 + R() * 0.5; surSol(_p.copy(T.pos[k]).addScaledVector(est, Math.cos(a) * d).addScaledVector(nord, Math.sin(a) * d), 0, _p); chardons.setMatrixAt(n, _m.compose(_p, qHaut(T.dir[k], _q).multiply(_q2.setFromEuler(_e.set(0, R() * 6, 0))), _s.set(sc, sc, sc))); l.push(n++); } slotsChardon.set(k, l); } chardons.count = n; chardons.frustumCulled = false; scene.add(chardons); }
function desherber(k) { for (const j of slotsChardon.get(k) || []) chardons.setMatrixAt(j, _m.makeScale(0, 0, 0)); chardons.instanceMatrix.needsUpdate = true; changerSorte(k, 0); }
const mereGeo = fleurGeo({ petales: 8, h: 0.75, rr: 0.26, pf: 0.16 });
const meres = new THREE.InstancedMesh(mereGeo, new THREE.MeshStandardMaterial({ color: 0x6f9cf0, emissive: 0x5b8cff, emissiveIntensity: 1.2, roughness: 0.4, side: THREE.DoubleSide }), 200);
const rayons = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.22, 14, 8, 1, true).translate(0, 7, 0), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT: UTEMPS },
  vertexShader: 'varying float vY; void main(){ vY = position.y / 14.0; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }',
  fragmentShader: 'varying float vY; uniform float uT; void main(){ gl_FragColor = vec4(vec3(0.25, 0.45, 1.0) * pow(1.0 - vY, 2.0) * (0.28 + 0.08 * sin(uT * 2.0)), 1.0); }' }), 200);
const slotsMere = new Map();
{ let n = 0; for (let k = 0; k < NT && n < 200; k++) if (T.sorte[k] === 3) { _m.compose(T.pos[k], qHaut(T.dir[k], _q), _s.set(1, 1, 1)); meres.setMatrixAt(n, _m); rayons.setMatrixAt(n, _m); slotsMere.set(k, n++); } meres.count = rayons.count = n; meres.frustumCulled = rayons.frustumCulled = false; scene.add(meres, rayons); }
function cueillirMere(k) { const j = slotsMere.get(k); if (j === undefined) return; meres.setMatrixAt(j, _m.makeScale(0, 0, 0)); rayons.setMatrixAt(j, _m.makeScale(0, 0, 0)); meres.instanceMatrix.needsUpdate = rayons.instanceMatrix.needsUpdate = true; changerSorte(k, 0); }
