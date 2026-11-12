import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

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
// 2. La charte : huit couleurs dans tout le jeu. Matériel : blanc cassé, charbon, orange signal, cyan. Sol : beige sec,
//    vert prairie. Fleur : bleu Azurelle, cœur jaune.
// =====================================================================
const CHARTE = {
  blanc: 0xedeae4,     // corps des machines, bâtiments, outils : la couleur dominante
  graphite: 0x2e343a,  // socles, bandeaux, cadres d'écran, poignées
  pollen: 0xf5c518,    // le cœur de l'Azurelle : poussière et grains de pollen (jamais sur le matériel)
  seve: 0x4fd6e3,      // cyan : bandes lumineuses des socles, voyants
  sec: 0xbfb49a,       // sol des tuiles sèches
  prairie: 0x6fa03c,   // sol des tuiles pollinisées
};

// =====================================================================
// 3. Rendu. On est sur une petite planète, dans l'espace : ciel noir étoilé, fin halo bleu d'atmosphère à l'horizon,
//    soleil qui tourne réellement autour de la planète (le jour et la nuit se déplacent sur la surface).
// =====================================================================
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;   // ombres nettes
let dpr = Math.min(devicePixelRatio || 1, Q.dpr);
const scene = new THREE.Scene();
const HORIZON = new THREE.Color(0x6f9fd8);
scene.fog = new THREE.FogExp2(HORIZON.clone(), 0.0022);
const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.06, 6000);   // œil à 1,7 m, champ de vision 70° ; loin : le globe entier
let gt = 0;   // horloge du jeu (s)
const MAJ = [];   // fonctions de mise à jour ajoutées par les modules, appelées à chaque image
const V3 = THREE.Vector3;
const DUREE_JOUR = 960;   // un tour de soleil en 16 minutes
const SOLEIL = new V3(1, 0.25, 0).normalize(), JOUR = { angle: 0, ici: 1 };   // direction du soleil ; ici : 1 en plein jour là où est le joueur, 0 la nuit
function placerSoleil() { SOLEIL.set(Math.cos(JOUR.angle) * 0.97, 0.24, Math.sin(JOUR.angle) * 0.97).normalize(); }
const sun = new THREE.DirectionalLight(0xfff3e2, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(Q.ombres, Q.ombres); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 140 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbfdcff, 0xb9ac8c, 0.42); scene.add(hemi);   // son « haut » suit la verticale locale du joueur
// Contre-jour discret : il souligne le bord supérieur des machines et détache les silhouettes du fond (réglé à chaque image).
const contreJour = new THREE.DirectionalLight(0xfff0d8, 0.7); scene.add(contreJour, contreJour.target);
// Lampe frontale (la nuit) et lampe d'intérieur (une seule, qui se place dans le bâtiment où l'on entre) : toujours présentes,
// éteintes par leur intensité, pour que le nombre de lumières ne change jamais.
const lampe = new THREE.SpotLight(0xfff1d6, 0, 30, 0.55, 0.6, 1.3); lampe.position.set(0, 0.1, 0); lampe.target.position.set(0, -0.2, -1); camera.add(lampe, lampe.target);
const lampeSalle = new THREE.PointLight(0xfff6ea, 0, 22, 1.4); scene.add(lampeSalle);
const CIEL_U = { uSol: { value: SOLEIL }, uHaut: { value: new V3(0, 1, 0) }, uJour: { value: 1 } };
const ciel = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: CIEL_U,
  vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 uSol, uHaut; uniform float uJour; varying vec3 vD;
    void main(){ vec3 d = normalize(vD);
      vec3 g = floor(d * 190.0) + 0.5; float h = fract(sin(dot(g, vec3(12.9898, 78.233, 37.719))) * 43758.5453);   // étoiles : une par case tirée au sort
      float etoile = step(0.992, h) * smoothstep(0.0034, 0.0008, length(d - normalize(g))) * (0.5 + 0.5 * fract(h * 71.0));
      float e = dot(d, uHaut);                                                                                       // ciel noir étoilé, même de jour ; fin halo bleuté au ras de l'horizon
      float halo = exp(-max(e + 0.02, 0.0) * 14.0) * (0.25 + 0.75 * uJour);
      vec3 c = vec3(etoile) * (1.0 - smoothstep(0.0, 0.5, halo)) * 1.3 + vec3(0.31, 0.6, 1.0) * halo * 0.9 + vec3(0.95, 0.5, 0.22) * uJour * (1.0 - uJour) * exp(-abs(e) * 10.0) * 1.2;
      float s = max(dot(d, uSol), 0.0); c += vec3(1.0, 0.95, 0.85) * (pow(s, 900.0) * 9.0 + pow(s, 40.0) * 0.2);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
ciel.frustumCulled = false; ciel.renderOrder = -10; scene.add(ciel);
// Environnement en carte d'image : le ciel de jour (et un sol clair) rendu une fois dans un cube filtré ; le métal, les vitres
// et les écrans y prennent leurs reflets. Il ne sert qu'aux matières fabriquées (voir refleter).
const ENV = { tex: null };
{
  const pmrem = new THREE.PMREMGenerator(renderer), sc = new THREE.Scene();
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(800, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'varying vec3 vD; void main(){ float h = normalize(vD).y; gl_FragColor = vec4(mix(vec3(0.75, 0.86, 1.0), vec3(0.18, 0.36, 0.75), smoothstep(0.0, 0.8, h)) * step(-0.02, h) + vec3(0.6, 0.57, 0.48) * step(h, -0.02), 1.0); }' })));
  ENV.tex = pmrem.fromScene(sc, 0.03).texture; pmrem.dispose();
}
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

