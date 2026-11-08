import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// =====================================================================
// 1. Appareil, qualité, outils
// =====================================================================
const params = new URLSearchParams(location.search);
const MOBILE = params.has('mode') ? params.get('mode') === 'mobile'
  : (matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0) || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const Q = MOBILE ? { nom: 'mobile', dpr: 1.5, msaa: 2, ombres: 1024, fleurs: 4, vignette: false } : { nom: 'pc', dpr: 2, msaa: 4, ombres: 2048, fleurs: 7, vignette: true };
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
// 2. La charte : quatre couleurs pour tout le matériel, deux pour le sol, trois pour les fleurs
// =====================================================================
const CHARTE = {
  blanc: 0xece8df,     // corps des machines, bâtiments, outils : la couleur dominante
  graphite: 0x2f3338,  // socles, bandeaux, cadres d'écran, poignées
  pollen: 0xf4b41a,    // liserés, boutons, chiffres : l'accent, à doser
  seve: 0x53d17a,      // bandes lumineuses des socles, voyants
  sec: 0xbfb49a,       // sol des tuiles sèches
  prairie: 0x6fa03c,   // sol des tuiles pollinisées
};
const FLEURS = [{ nom: 'lavande', c: 0x8b6fc4 }, { nom: 'colza', c: 0xf2c53d }, { nom: 'trèfle', c: 0xe48bb0 }];

// =====================================================================
// 3. Rendu, lumière dure, ciel de jour, brume légère
// =====================================================================
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;   // ombres nettes
let dpr = Math.min(devicePixelRatio || 1, Q.dpr);
const scene = new THREE.Scene();
const HORIZON = new THREE.Color(0xd3e8f5);
scene.fog = new THREE.FogExp2(HORIZON, 0.0065);
const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 1500);   // œil à 1,7 m, champ de vision 70°
let gt = 0;   // horloge du jeu (s)
const MAJ = [];   // fonctions de mise à jour ajoutées par les modules (étapes 3 à 6), appelées à chaque image
const SOLEIL = new THREE.Vector3(Math.cos(0.65) * Math.cos(35 * Math.PI / 180), Math.sin(35 * Math.PI / 180), Math.sin(0.65) * Math.cos(35 * Math.PI / 180)).normalize();
const sun = new THREE.DirectionalLight(0xfff3e2, 2.5);
sun.castShadow = true; sun.shadow.mapSize.set(Q.ombres, Q.ombres); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 140 }); sun.shadow.camera.updateProjectionMatrix();
sun.position.copy(SOLEIL).multiplyScalar(60); scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0xbfdcff, 0xb9ac8c, 0.5));
const ciel = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uZen: { value: new THREE.Color(0x2c66c8) }, uHor: { value: HORIZON }, uSol: { value: SOLEIL } },
  vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
  fragmentShader: `uniform vec3 uZen, uHor, uSol; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float h = max(d.y, 0.0);
      vec3 c = mix(uHor, uZen, pow(smoothstep(0.0, 0.85, h), 0.7));   // bleu profond au zénith, bleu pâle lumineux à l'horizon
      float s = max(dot(d, uSol), 0.0); c += vec3(1.0, 0.95, 0.85) * (pow(s, 600.0) * 8.0 + pow(s, 30.0) * 0.25);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
ciel.frustumCulled = false; ciel.renderOrder = -10; scene.add(ciel);

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
function normales(w, h, hf, k, rep = 1) {   // carte de normales tirée du même relief que la texture
  const H = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) H[y * w + x] = hf(x, y);
  return pixels(w, h, (x, y) => { const nx = (H[y * w + (x + w - 1) % w] - H[y * w + (x + 1) % w]) * k, ny = (H[((y + h - 1) % h) * w + x] - H[((y + 1) % h) * w + x]) * k, L = Math.hypot(nx, ny, 1); return [(nx / L * 0.5 + 0.5) * 255, (ny / L * 0.5 + 0.5) * 255, (1 / L * 0.5 + 0.5) * 255]; }, false, rep);
}

