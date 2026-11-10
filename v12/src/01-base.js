import * as THREE from 'three';

// =====================================================================
// 1. Appareil, qualité, outils
// =====================================================================
const params = new URLSearchParams(location.search);
const MOBILE = params.has('mode') ? params.get('mode') === 'mobile'
  : (matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0) || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const Q = MOBILE ? { nom: 'mobile', dpr: 1.5, msaa: 2, ombres: 1024, vignette: false } : { nom: 'pc', dpr: 2, msaa: 4, ombres: 2048, vignette: true };
const DEBUG = params.has('debug');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mulberry = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const PERM = new Uint8Array(512), VAL = new Float32Array(256);
{ const R = mulberry(17); for (let i = 0; i < 256; i++) { PERM[i] = i; VAL[i] = R(); } for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [PERM[i], PERM[j]] = [PERM[j], PERM[i]]; } for (let i = 0; i < 256; i++) PERM[i + 256] = PERM[i]; }
function bruit(x, y, p = 256) {   // bruit de valeur, périodique de période p (textures sans couture)
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const v = (a, b) => VAL[PERM[((a % p) + p) % p + PERM[((b % p) + p) % p]]];
  const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
  return lerp(lerp(v(xi, yi), v(xi + 1, yi), u), lerp(v(xi, yi + 1), v(xi + 1, yi + 1), u), w);
}
const fbm = (x, y, o = 4, p = 256) => { let a = 0.5, f = 1, s = 0, n = 0; for (let k = 0; k < o; k++) { s += a * bruit(x * f, y * f, Math.min(256, p * f)); n += a; a *= 0.5; f *= 2; } return s / n; };


// =====================================================================
// 2. La charte de la brique 1 : un seul sol, beige sec.
// =====================================================================
const SEC = 0xbfb49a;
const V3 = THREE.Vector3;

// =====================================================================
// 3. Rendu : ciel noir étoilé, fin halo bleuté d'atmosphère, un soleil chaud (2,5) qui tourne vraiment autour de la
//    planète, ombres douces, lumière d'hémisphère à 0,5 pour que les ombres ne soient jamais noires.
// =====================================================================
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // ombres douces
const scene = new THREE.Scene();
const HORIZON = new THREE.Color(0x6f9fd8);
scene.fog = new THREE.FogExp2(HORIZON.clone(), 0.0018);
const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.06, 6000);   // œil à 1,7 m, champ de vision 70°
let gt = 0;   // horloge du jeu (s)
const MAJ = [];   // fonctions de mise à jour, appelées à chaque image
const DUREE_JOUR = 960;   // un tour de soleil en 16 minutes
const SOLEIL = new V3(1, 0.25, 0).normalize(), JOUR = { angle: 0.6, ici: 1 };
function placerSoleil() { SOLEIL.set(Math.cos(JOUR.angle) * 0.97, 0.24, Math.sin(JOUR.angle) * 0.97).normalize(); }
placerSoleil();
const sun = new THREE.DirectionalLight(0xffe7c4, 2.5);
sun.castShadow = true; sun.shadow.mapSize.set(Q.ombres, Q.ombres); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3; sun.shadow.intensity = 0.72;   // une ombre nette, jamais noire
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 140 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0xb9ac8c, 0.5); scene.add(hemi);   // son « haut » suit la verticale du joueur
const CIEL_U = { uSol: { value: SOLEIL }, uHaut: { value: new V3(0, 1, 0) }, uJour: { value: 1 } };
const ciel = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: CIEL_U,
  vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 uSol, uHaut; uniform float uJour; varying vec3 vD;
    void main(){ vec3 d = normalize(vD);
      vec3 g = floor(d * 190.0) + 0.5; float h = fract(sin(dot(g, vec3(12.9898, 78.233, 37.719))) * 43758.5453);   // étoiles : une par case tirée au sort
      float etoile = step(0.992, h) * smoothstep(0.0034, 0.0008, length(d - normalize(g))) * (0.5 + 0.5 * fract(h * 71.0));
      float e = dot(d, uHaut), halo = exp(-max(e + 0.02, 0.0) * 14.0) * (0.25 + 0.75 * uJour);           // noir même de jour ; halo au ras de l'horizon
      vec3 c = vec3(etoile) * (1.0 - smoothstep(0.0, 0.5, halo)) * 1.3 + vec3(0.31, 0.6, 1.0) * halo * 0.9 + vec3(0.95, 0.5, 0.22) * uJour * (1.0 - uJour) * exp(-abs(e) * 10.0) * 1.2;
      float s = max(dot(d, uSol), 0.0); c += vec3(1.0, 0.92, 0.78) * (pow(s, 900.0) * 9.0 + pow(s, 40.0) * 0.2);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
ciel.frustumCulled = false; ciel.renderOrder = -10; scene.add(ciel);
// Bruit de valeur à trois dimensions : le relief de la planète (continents, collines, montagnes).
function bruit3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const h = (a, b, c) => VAL[PERM[(a & 255) + PERM[(b & 255) + PERM[c & 255]]]];
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  return lerp(lerp(lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u), lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    lerp(lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}
const fbm3 = (x, y, z, o = 4) => { let a = 0.5, f = 1, s = 0, n = 0; for (let k = 0; k < o; k++) { s += a * bruit3(x * f + k * 17.3, y * f, z * f); n += a; a *= 0.5; f *= 2; } return s / n; };

function texture(w, h, fn, srgb = true, rep = 1) {   // texture générée sur canvas
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); fn(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function pixels(w, h, fn, srgb = true, rep = 1) {
  return texture(w, h, (g) => { const im = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y), i = (y * w + x) * 4; im.data[i] = c[0]; im.data[i + 1] = c[1]; im.data[i + 2] = c[2]; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); }, srgb, rep);
}


