
// =====================================================================
// 4. La planète : une sphère de 500 m de rayon (3,1 km de tour). « Haut » = du centre vers soi.
//    Pavage par subdivision d'icosaèdre (64 par arête) : des hexagones d'environ 8 m et douze pentagones ;
//    la même fonction de repérage tourne ici et dans le shader du sol. Relief très léger : un bruit sur le rayon.
// =====================================================================
const RP = 500, POLE = new V3(0, 1, 0);
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
const GROS = treillisN(64);   // les tuiles : 40 962 (40 950 hexagones et douze pentagones), d'environ 8,2 m
let NT = 0; { const vus = new Set(); for (let f = 0; f < 20; f++) for (let i = 0; i <= 64; i++) for (let j = 0; j <= 64 - i; j++) vus.add(GROS.canon(f, i, j)); NT = vus.size; }

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

function relief(d) {   // de simples ondulations, ±1,5 m
  return (fbm3(d.x * 5 + 3.1, d.y * 5 + 1.3, d.z * 5 + 7.7, 3) - 0.5) * 3.2 + (bruit3(d.x * 22, d.y * 22, d.z * 22) - 0.5) * 0.5;
}
const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
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
function surSol(p, h = 0, out = new V3()) { out.copy(p).normalize(); return out.multiplyScalar(sol(out) + h); }
const altitude = (p) => { _d.copy(p).normalize(); return sol(_d) - RP; };

// --- Le sol : vingt faces de maillage. Jamais une surface unie : un grain peint sur canvas (couleur) et une carte de
//     normales tirée du même bruit, à 2,5 m par motif ; les tuiles se lisent par une rainure fine sur leur contour. ---
const GRAIN = 256, HG = new Float32Array(GRAIN * GRAIN);
for (let y = 0; y < GRAIN; y++) for (let x = 0; x < GRAIN; x++) HG[y * GRAIN + x] = 0.55 * bruit(x / 8, y / 8, 32) + 0.3 * bruit(x / 4, y / 4, 64) + 0.15 * Math.random();
const TEX_GRAIN = pixels(GRAIN, GRAIN, (x, y) => { const v = 1 + 0.22 * (HG[y * GRAIN + x] - 0.5), r = SEC >> 16 & 255, g = SEC >> 8 & 255, b = SEC & 255; return [Math.min(255, r * v), Math.min(255, g * v), Math.min(255, b * v)]; });   // beige sec #BFB49A, ±11 %
const TEX_NORMALES = pixels(GRAIN, GRAIN, (x, y) => {   // pente du grain → normale, encodée en couleur
  const h = (a, b) => HG[((b + GRAIN) % GRAIN) * GRAIN + ((a + GRAIN) % GRAIN)], dx = (h(x + 1, y) - h(x - 1, y)) * 2.2, dy = (h(x, y + 1) - h(x, y - 1)) * 2.2, l = Math.hypot(dx, dy, 1);
  return [(-dx / l * 0.5 + 0.5) * 255, (-dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];
}, false);
const M_SOL = new THREE.MeshStandardMaterial({ color: 0xffffff, map: TEX_GRAIN, normalMap: TEX_NORMALES, normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.95 });
const SOL_U = { uCen: { value: ICO.map((F) => F.cen) }, uInv: { value: ICO.map((F) => F.inv) } };
M_SOL.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, SOL_U);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMonde;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMonde = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
    varying vec3 vMonde; uniform vec3 uCen[20]; uniform mat3 uInv[20];
    vec2 arrondir(vec2 uv) { vec3 c = vec3(uv.x, -uv.x - uv.y, uv.y); vec3 r = floor(c + 0.5); vec3 e = abs(r - c); if (e.x > e.y && e.x > e.z) r.x = -r.y - r.z; else if (e.y > e.z) r.y = -r.x - r.z; else r.z = -r.x - r.y; return r.xz; }
    float bordHex(vec2 d) { return 2.0 * max(abs(d.x + 0.5 * d.y), max(abs(d.y + 0.5 * d.x), 0.5 * abs(d.x - d.y))); }`)
    .replace('#include <map_fragment>', `#include <map_fragment>
    { vec3 dir = normalize(vMonde); float m = -2.0; int f = 0; for (int k = 0; k < 20; k++) { float t = dot(dir, uCen[k]); if (t > m) { m = t; f = k; } }
      vec3 w = uInv[f] * dir; vec2 uv = w.yz / (w.x + w.y + w.z) * ${GROS.N}.0; float bord = bordHex(uv - arrondir(uv)), dcam = distance(vMonde, cameraPosition);
      diffuseColor.rgb *= 1.0 - 0.16 * smoothstep(0.95, 0.99, bord) * (1.0 - smoothstep(25.0, 80.0, dcam)); }`);
};
const PLANETE = new THREE.Group(); scene.add(PLANETE);
{
  const bord = new Map(), faces = [];
  ICO.forEach((F, f) => {
    const n = (NM + 1) * (NM + 2) / 2, pos = new Float32Array(n * 3), uvs = new Float32Array(n * 2), idx = [];
    const e1 = new V3().subVectors(F.B, F.A).normalize(), e2 = new V3().subVectors(F.C, F.A); e2.addScaledVector(e1, -e2.dot(e1)).normalize();
    for (let i = 0; i <= NM; i++) for (let j = 0; j <= NM - i; j++) {
      const k = ixM(i, j); _d2.set(0, 0, 0).addScaledVector(F.A, (NM - i - j) / NM).addScaledVector(F.B, i / NM).addScaledVector(F.C, j / NM).normalize();
      const r = HAUTEURS[f][k]; pos.set([_d2.x * r, _d2.y * r, _d2.z * r], k * 3);
      uvs.set([_d2.dot(e1) * RP / 2.5, _d2.dot(e2) * RP / 2.5], k * 2);   // coordonnées de texture à l'échelle du monde : 2,5 m par motif
    }
    for (let i = 0; i < NM; i++) for (let j = 0; j < NM - i; j++) { idx.push(ixM(i, j), ixM(i + 1, j), ixM(i, j + 1)); if (i + j < NM - 1) idx.push(ixM(i + 1, j), ixM(i + 1, j + 1), ixM(i, j + 1)); }
    if (new V3().subVectors(F.B, F.A).cross(new V3().subVectors(F.C, F.A)).dot(F.cen) < 0) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals();
    const nor = g.attributes.normal;   // les sommets partagés entre deux faces prennent la même normale : pas de couture visible
    const noter = (i, j) => { const k = ixM(i, j), c = Math.round(pos[k * 3] * 20) + ',' + Math.round(pos[k * 3 + 1] * 20) + ',' + Math.round(pos[k * 3 + 2] * 20); if (!bord.has(c)) bord.set(c, { n: new V3(), l: [] }); const e = bord.get(c); e.n.x += nor.getX(k); e.n.y += nor.getY(k); e.n.z += nor.getZ(k); e.l.push([nor, k]); };
    for (let i = 0; i <= NM; i++) { noter(i, 0); if (i < NM) noter(0, NM - i); if (i > 0 && i < NM) noter(i, NM - i); }
    faces.push(g);
  });
  for (const e of bord.values()) { e.n.normalize(); for (const [nor, k] of e.l) nor.setXYZ(k, e.n.x, e.n.y, e.n.z); }
  for (const g of faces) { const m = new THREE.Mesh(g, M_SOL); m.receiveShadow = true; PLANETE.add(m); }
}
