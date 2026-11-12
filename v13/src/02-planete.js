
// =====================================================================
// 4. La planète-prairie : une sphère de 500 m de rayon (3,1 km de tour), couverte de fleurs d'un pôle à l'autre.
//    Ni mer, ni montagne : un relief de simples ondulations. « Haut » = du centre vers soi.
//    Un treillis d'icosaèdre subdivisé 256 fois par arête : des parcelles hexagonales d'environ 2 m, repérées par la
//    même fonction ici et dans le shader du sol. Les machines se posent sur ces mêmes parcelles.
//    Douze secteurs en disques, en spirale autour de la base, cernés d'un liseré lumineux ; entre eux, la friche.
// =====================================================================
const RP = 500, NIVEAU_MER = -1e6, POLE = new V3(0, 1, 0);   // pas de mer : NIVEAU_MER reste pour les tests de bord
const NM = MOBILE ? 80 : 128;   // finesse du maillage du sol, par arête de face
const ICO = (() => {
  const t = (1 + Math.sqrt(5)) / 2, v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((a) => new V3(...a).normalize());
  const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const faces = f.map(([a, b, c]) => { const A = v[a], B = v[b], C = v[c], M = new THREE.Matrix3().set(A.x, B.x, C.x, A.y, B.y, C.y, A.z, B.z, C.z); return { A, B, C, inv: M.clone().invert(), cen: A.clone().add(B).add(C).normalize() }; });
  faces.sommets = v; return faces;
})();
const _w = new V3(), _d = new V3(), _d2 = new V3();
function faceDe(d) { let m = -2, f = 0; for (let k = 0; k < 20; k++) { const t = d.dot(ICO[k].cen); if (t > m) { m = t; f = k; } } return f; }
function treillis(f, d, n) { _w.copy(d).applyMatrix3(ICO[f].inv); const s = _w.x + _w.y + _w.z; return [_w.y / s * n, _w.z / s * n]; }   // coordonnées (u, v) dans la face
function arrondir(u, v) {   // le sommet du treillis le plus proche (arrondi « cube », comme pour toute grille hexagonale)
  const y = -u - v; let rx = Math.round(u), ry = Math.round(y), rz = Math.round(v); const dx = Math.abs(rx - u), dy = Math.abs(ry - y), dz = Math.abs(rz - v);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  return [rx, rz];
}
// Un treillis de N subdivisions : repérage, voisins, nom canonique (une tuile sur une arête appartient à deux faces).
function treillisN(N) {
  const N1 = N + 1, CANON = new Map(), _t = new V3();
  const idDe = (f, i, j) => (f * N1 + i) * N1 + j;
  const decoder = (id) => [Math.floor(id / (N1 * N1)), Math.floor(id / N1) % N1, id % N1];
  const dirTuile = (f, i, j, out) => { const F = ICO[f]; return out.set(0, 0, 0).addScaledVector(F.A, (N - i - j) / N).addScaledVector(F.B, i / N).addScaledVector(F.C, j / N).normalize(); };
  const dirDe = (id, out = new V3()) => { const [f, i, j] = decoder(id); return dirTuile(f, i, j, out); };
  function alias(f, i, j) {   // tous les noms (face, i, j) de cette tuile
    if (i > 0 && j > 0 && i + j < N) return [[f, i, j]];
    const d = dirTuile(f, i, j, new V3()), out = [];
    for (let g = 0; g < 20; g++) { if (d.dot(ICO[g].cen) < 0.5) continue; const [u, v] = treillis(g, d, N); if (u > -1e-4 && v > -1e-4 && u + v < N + 1e-4) { const [a, b] = arrondir(u, v); out.push([g, a, b]); } }
    return out.length ? out : [[f, i, j]];
  }
  function canon(f, i, j) {
    if (i > 0 && j > 0 && i + j < N) return idDe(f, i, j);
    const k = idDe(f, i, j); let c = CANON.get(k);
    if (c === undefined) { const a = alias(f, i, j)[0]; c = idDe(a[0], a[1], a[2]); CANON.set(k, c); }
    return c;
  }
  function tuileDe(d) { const f = faceDe(d), [u, v] = treillis(f, d, N), [i, j] = arrondir(u, v); return canon(f, i, j); }   // d : direction unitaire
  function voisinsDe(id) {   // les six tuiles voisines (cinq autour d'un pentagone)
    const [f, i, j] = decoder(id), out = [], noms = (i > 0 && j > 0 && i + j < N) ? [[f, i, j]] : alias(f, i, j);
    for (const [g, a0, b0] of noms) for (const [a, b] of [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]) {   // sur une arête ou un sommet : les voisines de chaque face qui la porte
      const ni = a0 + a, nj = b0 + b; if (ni < 0 || nj < 0 || ni + nj > N) continue;
      const v = canon(g, ni, nj); if (v !== id && !out.includes(v)) out.push(v);
    }
    return out;
  }
  return { N, N1, idDe, decoder, dirTuile, dirDe, alias, canon, tuileDe, voisinsDe, PAS: ICO[0].A.distanceTo(ICO[0].B) / N * RP };
}
const FIN = treillisN(256), GROS = FIN;   // une seule grille : parcelles de fleurs et cases de construction
// La grille de construction garde les noms courts (les machines et convoyeurs s'y posent).
const { tuileDe, voisinsDe, dirDe, decoder, PAS } = FIN;   // PAS : environ 2,05 m
const PAS_T = GROS.PAS;                                       // largeur d'une parcelle : environ 2 m

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

// --- La fleur et ses six variétés. Douze secteurs : deux par variété, chaque secteur vaut plus que le précédent. ---
const AZUR = { petale: 0x3b6fd4, coeur: 0xf5c518, tige: 0x4a7a3c };
const VARIETES = [   // pétales, hauteur de tige (m), rayon des pointes, profondeur de la coupe
  { nom: 'Azurelle commune', petales: 5, h: 0.25, rr: 0.07, pf: 0.12 },
  { nom: 'Azurelle des champs', petales: 6, h: 0.35, rr: 0.075, pf: 0.13 },
  { nom: 'Azurelle double', petales: 10, h: 0.4, rr: 0.085, pf: 0.12 },
  { nom: 'Azurelle royale', petales: 7, h: 0.4, rr: 0.13, pf: 0.06 },
  { nom: 'Azurelle de nuit', petales: 6, h: 0.35, rr: 0.09, pf: 0.1, ferme: true },
  { nom: 'Azurelle mère', petales: 8, h: 0.5, rr: 0.15, pf: 0.1 },
];
const NSECT = 12, RB = 34;   // RB : rayon de l'esplanade de la base (sans fleurs)
const PRIX_SECT = [5, 7, 10, 14, 20, 28, 40, 56, 80, 115, 160, 230];   // crédits par parcelle, secteur par secteur
const RAYONS_SECT = [70, 38, 42, 46, 50, 54, 58, 62, 66, 70, 74, 78];   // mètres
const varieteDe = (s) => Math.min(5, s >> 1);
// La base est sur un sommet de l'icosaèdre, à l'équateur ; les secteurs s'ouvrent du plus proche au plus lointain.
const BASE_DIR = ICO.sommets[8].clone();
function deplacer(dir, capDeg, dist) {   // la direction atteinte en partant de dir, au cap donné (0 = nord, 90 = est), après dist mètres
  const { up, est, nord } = repere(dir), a = capDeg * Math.PI / 180, t = new V3().addScaledVector(nord, Math.cos(a)).addScaledVector(est, Math.sin(a)), w = dist / RP;
  return up.multiplyScalar(Math.cos(w)).addScaledVector(t, Math.sin(w)).normalize();
}
// En spirale : le secteur k est à 130 + 105 (k − 1) m de la base, tourné de 137,5° par rapport au précédent.
const SECTEURS = RAYONS_SECT.map((r, k) => ({ c: k ? deplacer(BASE_DIR, 20 + k * 137.5, 130 + 105 * (k - 1)) : BASE_DIR.clone(), r, r0: k ? 0 : RB, prix: PRIX_SECT[k], variete: varieteDe(k) }));
function secteurDe(d) { let m = 1e9, s = -1; for (let k = 0; k < NSECT; k++) { const a = RP * d.distanceTo(SECTEURS[k].c) - SECTEURS[k].r; if (a < m) { m = a; s = k; } } return s; }   // le secteur dont on est le plus près du bord
const OUVERTS = { value: 1 };   // nombre de secteurs ouverts
const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function relief(d) {   // de simples ondulations (±1,5 m), à plat sous la base
  const h = (fbm3(d.x * 5 + 3.1, d.y * 5 + 1.3, d.z * 5 + 7.7, 3) - 0.5) * 3.2 + (bruit3(d.x * 22, d.y * 22, d.z * 22) - 0.5) * 0.5;
  const a = RP * d.distanceTo(BASE_DIR); return h * lisse(RB + 2, RB + 30, a);
}
// Les hauteurs sont calculées une fois sur le maillage du sol ; « sol » interpole ce maillage : rien ne flotte.
const ixM = (i, j) => i * (NM + 1) - (i * (i - 1) >> 1) + j;
const HAUTEURS = ICO.map((F) => { const a = new Float32Array((NM + 1) * (NM + 2) / 2); for (let i = 0; i <= NM; i++) for (let j = 0; j <= NM - i; j++) { _d2.set(0, 0, 0).addScaledVector(F.A, (NM - i - j) / NM).addScaledVector(F.B, i / NM).addScaledVector(F.C, j / NM).normalize(); a[ixM(i, j)] = RP + relief(_d2); } return a; });
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

// --- Les tuiles de fleurs : toute la planète, sauf l'esplanade. Sortes : 0 en terre, 4 nue (graines ramassées). ---
const T = { n: 0, id: [], sect: [], vert: [], sorte: [], irrigue: [], nectar: [], t0: [], pos: [], dir: [] };
const IDX = new Map();   // id canonique → rang dans T
for (let k = 0; k < NSECT; k++) {   // chaque secteur : les parcelles de son disque (une couronne autour de l'esplanade pour le premier)
  const S = SECTEURS[k], vu = new Set(), file = [GROS.tuileDe(k ? S.c : deplacer(S.c, 0, RB + 4))], liste = []; vu.add(file[0]);
  while (file.length) {
    const id = file.pop(), d = GROS.dirDe(id), a = RP * d.distanceTo(S.c);
    if (a > S.r) continue;
    if (a >= S.r0) liste.push([id, d, a]);
    for (const v of GROS.voisinsDe(id)) if (!vu.has(v)) { vu.add(v); file.push(v); }
  }
  liste.sort((u, v) => u[0] - v[0]);   // ordre stable : c'est celui de la sauvegarde
  for (const [id, d, a] of liste) {
    if (IDX.has(id)) continue;
    const jardin = k === 0 && a < RB + 3.5 ? 1 : 0;
    IDX.set(id, T.n++); T.id.push(id); T.sect.push(k); T.vert.push(jardin); T.sorte.push(0); T.irrigue.push(0); T.nectar.push(0); T.t0.push(jardin ? -1000 : 1e6);
    T.dir.push(d); T.pos.push(new V3().copy(d).multiplyScalar(sol(d)));
  }
}
const NT = T.n;
const tuileA = (p) => { _d2.copy(p).normalize(); const k = IDX.get(GROS.tuileDe(_d2)); return k === undefined ? -1 : k; };   // la tuile de fleurs sous le point p, ou -1
const voisinesT = (k) => GROS.voisinsDe(T.id[k]).map((id) => IDX.get(id)).filter((v) => v !== undefined);

// --- L'état des tuiles, lu par le shader du sol : une texture à 20 couches (une par face), un texel par tuile.
//     R en fleurs, G sorte, B (libre), A tuile de fleurs. Seule la couche touchée est renvoyée à la carte graphique. ---
const N1T = GROS.N1, etatSol = new Uint8Array(20 * N1T * N1T * 4);
const etatTex = new THREE.DataArrayTexture(etatSol, N1T, N1T, 20); etatTex.format = THREE.RGBAFormat; etatTex.type = THREE.UnsignedByteType; etatTex.magFilter = etatTex.minFilter = THREE.NearestFilter; etatTex.generateMipmaps = false; etatTex.needsUpdate = true;
const ALIAS = T.id.map((id) => GROS.alias(...GROS.decoder(id)));
function ecrireTuile(k) {
  for (const [f, i, j] of ALIAS[k]) { const o = ((f * N1T + j) * N1T + i) * 4; etatSol[o] = T.vert[k] * 255; etatSol[o + 1] = T.sorte[k] * 50; etatSol[o + 2] = 0; etatSol[o + 3] = 255; etatTex.addLayerUpdate(f); }
  etatTex.needsUpdate = true;
}
for (let k = 0; k < NT; k++) ecrireTuile(k);
etatTex.clearLayerUpdates();   // premier envoi : la texture entière
const R_FLEURS = MOBILE ? 22 : 28;   // au-delà, la tuile est un aplat coloré (vert puis bleu de loin)
const SOL_U = {
  uCen: { value: ICO.map((F) => F.cen) }, uInv: { value: ICO.map((F) => F.inv) }, uEtat: { value: etatTex },
  uSect: { value: SECTEURS.map((S) => new THREE.Vector4(S.c.x, S.c.y, S.c.z, S.r)) }, uProg: { value: new Array(NSECT).fill(0) }, uOuverts: OUVERTS, uBase: { value: BASE_DIR },
  uSel: { value: Array.from({ length: 24 }, () => new V3(-1, 0, 0)) }, uSelI: { value: 0 }, uCarte: { value: 0 }, uCons: { value: 0 },
  uSec: { value: new THREE.Color(CHARTE.sec) }, uVert: { value: new THREE.Color(CHARTE.prairie) }, uBleu: { value: new THREE.Color(AZUR.petale) },
};
const SEL = { tuiles: [], y: 0 };   // tuiles visées et avancement de la jauge
function selectionner(liste) { SEL.tuiles = liste; for (let s = 0; s < 24; s++) { const k = liste[s]; if (k === undefined) SOL_U.uSel.value[s].set(-1, 0, 0); else { const [f, i, j] = GROS.decoder(T.id[k]); SOL_U.uSel.value[s].set(f, i, j); } } }
const GLSL_TUILE = `
  uniform vec3 uCen[20]; uniform mat3 uInv[20];
  void tuileDe(vec3 d, out int f, out vec2 uv) { float m = -2.0; f = 0; for (int k = 0; k < 20; k++) { float t = dot(d, uCen[k]); if (t > m) { m = t; f = k; } } vec3 w = uInv[f] * d; uv = w.yz / (w.x + w.y + w.z) * ${GROS.N}.0; }
  vec2 arrondir(vec2 uv) { vec3 c = vec3(uv.x, -uv.x - uv.y, uv.y); vec3 r = floor(c + 0.5); vec3 e = abs(r - c); if (e.x > e.y && e.x > e.z) r.x = -r.y - r.z; else if (e.y > e.z) r.y = -r.x - r.z; else r.z = -r.x - r.y; return r.xz; }
  float bordHex(vec2 d) { return 2.0 * max(abs(d.x + 0.5 * d.y), max(abs(d.y + 0.5 * d.x), 0.5 * abs(d.x - d.y))); }`;
const M_SOL = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }); M_SOL.userData.sansReflet = true;
M_SOL.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, SOL_U);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMonde;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
    precision highp sampler2DArray;
    varying vec3 vMonde; uniform sampler2DArray uEtat; uniform vec4 uSect[12]; uniform float uProg[12]; uniform float uOuverts, uSelI, uCarte, uCons; uniform vec3 uBase, uSel[24], uSec, uVert, uBleu;
    float gLis, gSel, gGrille;` + GLSL_TUILE)
    .replace('#include <color_fragment>', `#include <color_fragment>
    vec3 dir = normalize(vMonde); float aBase = ${RP}.0 * distance(dir, uBase), dcam = distance(vMonde, cameraPosition);
    int sk = -1; float lisD = 1e3;   // le secteur dont on est dans le disque, et la distance au bord le plus proche : le liseré
    for (int k = 0; k < 12; k++) { float a = ${RP}.0 * distance(dir, uSect[k].xyz); lisD = min(lisD, abs(a - uSect[k].w)); if (a < uSect[k].w) sk = k; }
    int tf = 0; vec2 uv = vec2(0.0); tuileDe(dir, tf, uv); vec2 tij = arrondir(uv); float bord = bordHex(uv - tij);
    vec4 st = texelFetch(uEtat, ivec3(int(tij.x), int(tij.y), tf), 0);
    float sorte = st.g * 255.0 / 50.0;
    vec3 sec = abs(sorte - 4.0) < 0.5 ? vec3(0.42, 0.33, 0.24) : uSec;
    if (st.a < 0.5) sec = uSec * vec3(0.86, 0.84, 0.8);                                                           // la friche, entre les secteurs
    else if (float(sk) >= uOuverts) sec = mix(sec, vec3(0.55, 0.56, 0.58), 0.4);                                     // secteur encore fermé : en friche
    vec3 solc = mix(sec, mix(uVert, uBleu, smoothstep(${R_FLEURS - 10}.0, ${R_FLEURS - 1}.0, dcam) * 0.85), st.r);   // de loin, le bleu des Azurelles
    solc *= 1.0 - 0.2 * st.a * smoothstep(0.93, 0.985, bord) * (1.0 - smoothstep(20.0, 60.0, dcam));                  // rainure entre les tuiles
    if (aBase < ${RB}.0) { vec2 u2 = uv * 0.5; solc = vec3(0.86, 0.85, 0.82) * (1.0 - 0.09 * smoothstep(0.93, 0.97, bordHex(u2 - arrondir(u2)))); }   // dalles claires de la base
    if (uCarte > 0.5 && sk >= 0) solc = float(sk) < uOuverts ? mix(solc, mix(vec3(0.78, 0.72, 0.58), uBleu, uProg[sk]), 0.35) : vec3(0.5, 0.52, 0.55);   // sur le globe : l'avancement
    if (uCons > 0.5) solc *= vec3(0.82, 0.92, 1.12);                                                             // mode construction : le monde bleuit
    diffuseColor.rgb = solc;
    gSel = 0.0; for (int s = 0; s < 24; s++) if (float(tf) == uSel[s].x && tij == uSel[s].yz) gSel = uSelI * smoothstep(0.88, 0.96, bord);
    gLis = smoothstep(uCarte > 0.5 ? 6.0 : 0.5, uCarte > 0.5 ? 1.5 : 0.12, lisD);
    gGrille = uCons > 0.5 && dcam < 34.0 ? smoothstep(0.93, 0.985, bord) * (1.0 - dcam / 34.0) : 0.0;`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    totalEmissiveRadiance += gSel * vec3(0.94, 0.54, 0.14) * 0.8 + vec3(0.31, 0.84, 0.89) * (gLis * 0.9 + gGrille * 0.55);`);
};
// --- Le maillage du sol : vingt faces (chacune écartée par la caméra quand elle est hors champ). ---
const PLANETE = new THREE.Group(); scene.add(PLANETE);
{
  const bord = new Map(), faces = [];
  ICO.forEach((F, f) => {
    const n = (NM + 1) * (NM + 2) / 2, pos = new Float32Array(n * 3), idx = [];
    for (let i = 0; i <= NM; i++) for (let j = 0; j <= NM - i; j++) {
      const k = ixM(i, j); _d2.set(0, 0, 0).addScaledVector(F.A, (NM - i - j) / NM).addScaledVector(F.B, i / NM).addScaledVector(F.C, j / NM).normalize();
      const r = HAUTEURS[f][k]; pos.set([_d2.x * r, _d2.y * r, _d2.z * r], k * 3);
    }
    for (let i = 0; i < NM; i++) for (let j = 0; j < NM - i; j++) { idx.push(ixM(i, j), ixM(i + 1, j), ixM(i, j + 1)); if (i + j < NM - 1) idx.push(ixM(i + 1, j), ixM(i + 1, j + 1), ixM(i, j + 1)); }
    if (new V3().subVectors(F.B, F.A).cross(new V3().subVectors(F.C, F.A)).dot(F.cen) < 0) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }   // faces tournées vers l'extérieur
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const nor = g.attributes.normal;   // les sommets partagés entre deux faces prennent la même normale : pas de couture visible
    const noter = (i, j) => { const k = ixM(i, j), c = Math.round(pos[k * 3] * 20) + ',' + Math.round(pos[k * 3 + 1] * 20) + ',' + Math.round(pos[k * 3 + 2] * 20); if (!bord.has(c)) bord.set(c, { n: new V3(), l: [] }); const e = bord.get(c); e.n.x += nor.getX(k); e.n.y += nor.getY(k); e.n.z += nor.getZ(k); e.l.push([nor, k]); };
    for (let i = 0; i <= NM; i++) { noter(i, 0); if (i < NM) noter(0, NM - i); if (i > 0 && i < NM) noter(i, NM - i); }
    faces.push(g);
  });
  for (const e of bord.values()) { e.n.normalize(); for (const [nor, k] of e.l) nor.setXYZ(k, e.n.x, e.n.y, e.n.z); }
  for (const g of faces) { const m = new THREE.Mesh(g, M_SOL); m.receiveShadow = true; PLANETE.add(m); }
}
// Quelques nuages blancs qui dérivent, et le halo d'atmosphère bleuté tout autour de la planète.
const NUAGES = new THREE.Group(); scene.add(NUAGES);
{ const R = mulberry(77), m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), 180), q = new THREE.Quaternion(), s = new V3(), p = new V3(), M4 = new THREE.Matrix4(); m.material.userData.sansReflet = true;
  let n = 0; for (let k = 0; k < 60; k++) { const d = new V3(R() * 2 - 1, (R() * 2 - 1) * 0.8, R() * 2 - 1).normalize(), h = 42 + R() * 18; for (let b = 0; b < 3; b++) { const e = deplacer(d, R() * 360, b * (6 + R() * 6)), w = 7 + R() * 9; M4.compose(p.copy(e).multiplyScalar(RP + h), qHaut(e, q), s.set(w, w * 0.3, w * 0.7)); m.setMatrixAt(n++, M4); } }
  m.count = n; m.frustumCulled = false; NUAGES.add(m); }
MAJ.push((dt) => { NUAGES.rotation.y += dt * 0.0016; });
const HALO = new THREE.Mesh(new THREE.SphereGeometry(RP + 38, 64, 40), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uSol: { value: SOLEIL } },
  vertexShader: 'varying vec3 vN, vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(w.xyz); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: 'varying vec3 vN, vV; uniform vec3 uSol; void main(){ float f = pow(clamp(1.0 + dot(vN, vV), 0.0, 1.0), 3.0); gl_FragColor = vec4(vec3(0.31, 0.6, 1.0) * f * (0.2 + 0.8 * smoothstep(-0.3, 0.4, dot(vN, uSol))), 1.0); }' }));
HALO.visible = false; scene.add(HALO);   // vu de l'espace (la carte) ; depuis le sol, le ciel dessine le même halo

// =====================================================================
// L'Azurelle : coupe de pétales arrondis (5 à 10 selon la variété), cœur jaune, tige droite, deux feuilles.
// Une instance = une touffe de cinq fleurs ; une quinzaine de touffes de quatre par parcelle (60 fleurs), en rangs de 0,5 × 0,45 m,
// seule l'inclinaison varie. Une seule couleur, ±8 % de luminosité. Fanée : beige-gris, penchée.
// =====================================================================
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new V3(), _s = new V3();
function fleurGeo(v) {
  const pos = [], nor = [], part = [];   // part : 0 tige et feuilles, 1 pétales (1,5 au bord), 2 cœur
  const tri = (a, b, c, na, nb, nc, k, kb, kc) => { pos.push(...a, ...b, ...c); nor.push(...na, ...nb, ...nc); part.push(k, kb === undefined ? k : kb, kc === undefined ? k : kc); };
  const y0 = v.h - 0.03;
  for (let k = 0; k < 3; k++) { const a0 = k / 3 * 6.283, a1 = (k + 1) / 3 * 6.283, r = 0.014, n0 = [Math.cos(a0), 0, Math.sin(a0)], n1 = [Math.cos(a1), 0, Math.sin(a1)], p0 = [n0[0] * r, 0, n0[2] * r], p1 = [n1[0] * r, 0, n1[2] * r], h0 = [p0[0], y0, p0[2]], h1 = [p1[0], y0, p1[2]]; tri(p0, h0, h1, n0, n0, n1, 0); tri(p0, h1, p1, n0, n1, n1, 0); }
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
function touffeGeo(v, n = 4) {   // n fleurs autour d'un point, tailles et orientations variées
  const R = mulberry(31 + v.petales), parts = [];
  for (let k = 0; k < n; k++) { const g = fleurGeo(v), a = k / n * 6.283 + R(), r = k ? 0.08 + R() * 0.1 : 0, s = 0.85 + R() * 0.35; g.scale(s, s, s); g.rotateY(R() * 6.283); g.translate(Math.cos(a) * r, 0, Math.sin(a) * r); parts.push(g); }
  return mergeGeometries(parts);
}
const FLEUR_GEOS = VARIETES.map((v) => touffeGeo(v)), UTEMPS = { value: 0 }, VAGUE = { value: new THREE.Vector4(0, 0, 0, -100) }, VAGUE_S = { value: -1 };   // vague de floraison : centre, instant ; secteur
const glc = (hex) => new THREE.Color(hex).toArray().map((c) => c.toFixed(4)).join(', ');
const MATS_FLEUR = VARIETES.map((v, k) => {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, side: THREE.DoubleSide }); m.userData.sansReflet = true; m.userData.variete = k;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTemps: UTEMPS, uVague: VAGUE, uVagueS: VAGUE_S });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute float aPart, aT0, aAlea, aCache, aSect; uniform float uTemps, uVagueS; uniform vec4 uVague; varying vec3 vCouleur; varying float vLueur, vVie;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float t = clamp((uTemps - aT0) / 0.45, 0.0, 1.0), e = 1.0 - pow(1.0 - t, 3.0) * cos(t * 6.0);   // se redresse avec un rebond
        ${v.ferme ? 'if (aPart > 1.2) transformed.xz *= mix(0.25, 1.0, t);' : ''}
        float a = (1.0 - e) * (0.7 + aAlea * 0.3), cy = cos(a), sy = sin(a);                             // fanée : penchée vers le sol
        transformed = vec3(transformed.x, transformed.y * cy - transformed.z * sy, transformed.y * sy + transformed.z * cy);
        vec3 ici = instanceMatrix[3].xyz; transformed *= (1.0 - smoothstep(${R_FLEURS - 8}.0, ${R_FLEURS}.0, distance(ici, cameraPosition))) * (1.0 - aCache);
        vLueur = abs(uVagueS - aSect) < 0.5 ? exp(-pow((distance(ici, uVague.xyz) - (uTemps - uVague.w) * 40.0) / 4.0, 2.0)) : 0.0;   // la vague de floraison
        transformed *= 1.0 + vLueur * 0.45;
        vec3 c = aPart > 1.8 ? vec3(${glc(AZUR.coeur)}) : aPart > 0.5 ? vec3(${glc(AZUR.petale)}) * (aPart > 1.2 ? 1.12 : 1.0) : vec3(${glc(AZUR.tige)});
        vCouleur = mix(aPart > 0.5 ? vec3(0.62, 0.58, 0.5) : vec3(0.5, 0.48, 0.38), c * (0.92 + aAlea * 0.16), t); vVie = t;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCouleur; varying float vLueur, vVie;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = vCouleur;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vCouleur * (0.14 + 0.08 * vVie + vLueur * 1.5);');
  };
  return m;
});
// Les fleurs sont construites par paquets de 8 × 8 parcelles, seulement près du joueur.
const PAQUETS = new Map(), PAQUET_DE = [];
for (let k = 0; k < NT; k++) { const [f, i, j] = GROS.decoder(T.id[k]), c = f + ',' + (i >> 3) + ',' + (j >> 3); if (!PAQUETS.has(c)) PAQUETS.set(c, { tuiles: [], c: new V3(), mesh: null, plage: new Map() }); const P = PAQUETS.get(c); P.tuiles.push(k); P.c.add(T.pos[k]); PAQUET_DE.push(P); }
for (const P of PAQUETS.values()) P.c.multiplyScalar(1 / P.tuiles.length);
const PAQ = [...PAQUETS.values()];
function construirePaquet(P) {
  const k0 = P.tuiles[0], f = GROS.decoder(T.id[k0])[0], F = ICO[f], e1 = new V3().subVectors(F.B, F.A).normalize(), e2 = new V3().subVectors(F.C, F.A); e2.addScaledVector(e1, -e2.dot(e1)).normalize();
  const s = PAS_T / RP, px = 0.5 / RP, pz = 0.45 / RP, pts = [], N = GROS.N;
  for (const k of P.tuiles) {
    const [, i, j] = GROS.decoder(T.id[k]), X0 = (i + j / 2) * s, Y0 = j * 0.8660254 * s, R = mulberry(T.id[k]), debut = pts.length / 5;
    for (let m = Math.ceil((Y0 - s * 0.7) / pz); m * pz <= Y0 + s * 0.7; m++) {
      const Y = m * pz, dx = (m & 1) * px / 2, v = Y / (0.8660254 * s) - j;
      for (let c = Math.ceil((X0 - s * 0.7 - dx) / px); c * px + dx <= X0 + s * 0.7; c++) {
        const X = c * px + dx, u = X / s - (v + j) / 2 - i;
        if (2 * Math.max(Math.abs(u + v / 2), Math.abs(v + u / 2), Math.abs(u - v) / 2) > 0.86) continue;   // un liseré nu entre les parcelles
        _d.copy(F.A).addScaledVector(e1, X).addScaledVector(e2, Y).normalize(); if (GROS.tuileDe(_d) !== T.id[k] && i + j > 0 && i + j < N) continue;
        const r = sol(_d); pts.push(_d.x * r, _d.y * r, _d.z * r, R(), k);
      }
    }
    P.plage.set(k, [debut, pts.length / 5 - debut]);
  }
  const n = pts.length / 5, v = SECTEURS[T.sect[k0]].variete, g = FLEUR_GEOS[v].clone(), m = new THREE.InstancedMesh(g, MATS_FLEUR[v], n), t0 = new Float32Array(n), alea = new Float32Array(n), cache = new Float32Array(n), sect = new Float32Array(n);
  for (let c = 0; c < n; c++) {
    const al = pts[c * 5 + 3], k = pts[c * 5 + 4]; _p.set(pts[c * 5], pts[c * 5 + 1], pts[c * 5 + 2]); _d.copy(_p).normalize();
    qHaut(_d, _q).multiply(_q2.setFromEuler(_e.set((al - 0.5) * 0.16, al * 6.283, (((al * 97) % 1) - 0.5) * 0.16)));   // seule l'inclinaison varie
    m.setMatrixAt(c, _m.compose(_p, _q, _s.set(1, 1, 1))); t0[c] = T.t0[k]; alea[c] = al; cache[c] = T.sorte[k] === 4 ? 1 : 0; sect[c] = T.sect[k];
  }
  g.setAttribute('aT0', new THREE.InstancedBufferAttribute(t0, 1)); g.setAttribute('aAlea', new THREE.InstancedBufferAttribute(alea, 1)); g.setAttribute('aCache', new THREE.InstancedBufferAttribute(cache, 1)); g.setAttribute('aSect', new THREE.InstancedBufferAttribute(sect, 1));
  m.computeBoundingSphere(); m.receiveShadow = true; m.userData.paquet = true; scene.add(m); P.mesh = m;
}
let paqI = 0;
function majFleurs(budget = 2) {   // construit les paquets qui entrent dans le rayon, libère ceux qui en sortent (une part de la liste par image)
  const c = camera.position, aFaire = [], tout = budget > 50, n = tout ? PAQ.length : Math.ceil(PAQ.length / 6);
  for (let q = 0; q < n; q++) {
    const P = PAQ[(paqI + q) % PAQ.length], d = P.c.distanceTo(c);
    if (P.mesh) { if (d > R_FLEURS + 30) { scene.remove(P.mesh); P.mesh.geometry.dispose(); P.mesh.dispose(); P.mesh = null; P.plage.clear(); } } else if (d < R_FLEURS + 14) aFaire.push([d, P]);
  }
  paqI = (paqI + n) % PAQ.length;
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
