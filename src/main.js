// Rendu, contrôles et interface du jalon 1. Toute la logique de jeu est dans sim.js.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createGame, BUD, OPEN, GROWING, RIPE, WILTED } from './sim.js';
import { initAudio, sfx } from './audio.js';

const params = new URLSearchParams(location.search);
const SPEED = Number(params.get('vitesse')) || 1; // ?vitesse=10 pour tester l'équilibrage
const DEBUG = params.has('debug');

const game = createGame(CONFIG);
const F = game.flowers;
const O = CONFIG.orchard;

// ---------- Scène ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const SKY = 0xcfd8de;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 30, 90);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.03, 200);
scene.add(camera);

scene.add(new THREE.HemisphereLight(0xeef3f6, 0x6d7069, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.7);
sun.position.set(-12, 22, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 70 });
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun);

const lambert = (color) => new THREE.MeshLambertMaterial({ color });

const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), lambert(0x9da096));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// La parcelle : un rectangle un peu plus sombre sous le verger.
const xs = game.trees.map((t) => t.x);
const zs = game.trees.map((t) => t.z);
const plotW = Math.max(...xs) - Math.min(...xs) + 6;
const plotD = Math.max(...zs) - Math.min(...zs) + 6;
const plot = new THREE.Mesh(new THREE.PlaneGeometry(plotW, plotD), lambert(0x8d9187));
plot.rotation.x = -Math.PI / 2;
plot.position.set((Math.max(...xs) + Math.min(...xs)) / 2, 0.01, (Math.max(...zs) + Math.min(...zs)) / 2);
plot.receiveShadow = true;
scene.add(plot);

// Arbres : cubes gris (aucun art au jalon 1).
const treeMeshes = [];
const canopies = [];
const trunkGeo = new THREE.BoxGeometry(0.4, O.canopyY - O.canopyHalf + 0.1, 0.4);
const canopyGeo = new THREE.BoxGeometry(O.canopyHalf * 2, O.canopyHalf * 2, O.canopyHalf * 2);
const trunkMat = lambert(0x76786f);
const canopyMat = lambert(0xb3b6ad);
game.trees.forEach((t, k) => {
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(t.x, (O.canopyY - O.canopyHalf + 0.1) / 2, t.z);
  trunk.castShadow = true;
  trunk.userData.tree = k;
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(t.x, O.canopyY, t.z);
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  canopy.userData.tree = k;
  scene.add(trunk, canopy);
  treeMeshes.push(trunk, canopy);
  canopies.push(canopy);
});

// Point de collecte.
const M = CONFIG.market;
const market = new THREE.Group();
market.position.set(M.x, 0, M.z);
const stall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 1.2), lambert(0x86887f));
stall.position.y = 0.5;
stall.castShadow = true;
const roof = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 1.8), lambert(0x5f6159));
roof.position.y = 2.6;
roof.castShadow = true;
for (const [px, pz] of [[-1.3, -0.7], [1.3, -0.7], [-1.3, 0.7], [1.3, 0.7]]) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.1), lambert(0x5f6159));
  post.position.set(px, 1.3, pz);
  market.add(post);
}
const signCanvas = document.createElement('canvas');
signCanvas.width = 512;
signCanvas.height = 128;
const sctx = signCanvas.getContext('2d');
sctx.fillStyle = '#f4f1e8';
sctx.fillRect(0, 0, 512, 128);
sctx.fillStyle = '#2b2b28';
sctx.font = 'bold 64px system-ui, sans-serif';
sctx.textAlign = 'center';
sctx.textBaseline = 'middle';
sctx.fillText('COLLECTE', 256, 68);
const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) }));
sign.position.set(0, 2.25, 0.91);
const signBack = sign.clone();
signBack.rotation.y = Math.PI;
signBack.position.z = -0.91;
market.add(stall, roof, sign, signBack);
scene.add(market);

// ---------- Fleurs et fruits : rendu instancié, un seul objet pour 100 fleurs ----------
const flowerMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.26, 0.07), lambert(0xffffff), F.n);
const fruitMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lambert(0xffffff), F.n);
const GROUND_MAX = 600;
const groundFruitMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.12, 1), lambert(0xd0402c), GROUND_MAX);
groundFruitMesh.count = 0;
// Les instances bougent et apparaissent : pas de volume englobant figé, donc pas d'élagage.
fruitMesh.frustumCulled = false;
groundFruitMesh.frustumCulled = false;
groundFruitMesh.castShadow = true;
fruitMesh.castShadow = true;
scene.add(flowerMesh, fruitMesh, groundFruitMesh);

const COLORS = {
  bud: new THREE.Color(0x6e8c58),
  open: new THREE.Color(0xfbeaf1),
  source: new THREE.Color(0xf1cf5a), // fleur dont on vient de prendre le pollen
  growing: new THREE.Color(0xa7c878),
  wilted: new THREE.Color(0x87683f),
  fruitYoung: new THREE.Color(0x93bf4c),
  fruitRipe: new THREE.Color(0xd0402c),
};

const tmpM = new THREE.Matrix4();
const tmpP = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();
const Z = new THREE.Vector3(0, 0, 1);
const flowerQuat = [];
for (let i = 0; i < F.n; i++) {
  const nrm = new THREE.Vector3(F.normal[i * 3], F.normal[i * 3 + 1], F.normal[i * 3 + 2]);
  flowerQuat.push(new THREE.Quaternion().setFromUnitVectors(Z, nrm));
}
const flowerPos = (i, out = new THREE.Vector3()) => out.set(F.pos[i * 3], F.pos[i * 3 + 1], F.pos[i * 3 + 2]);

function writeFlowers(time) {
  for (let i = 0; i < F.n; i++) {
    const st = F.state[i];
    flowerPos(i, tmpP);
    let s = 1;
    let col = COLORS.open;
    if (st === BUD) [s, col] = [0.5, COLORS.bud];
    else if (st === OPEN) {
      col = i === game.swab.source ? COLORS.source : COLORS.open;
      // Une fleur qui va faner tremble légèrement : on lit l'urgence sans interface.
      if (F.timer[i] < 12) s = 1 + Math.sin(time * 14 + i) * 0.08;
    } else if (st === GROWING) [s, col] = [0.42, COLORS.growing];
    else if (st === RIPE) s = 0;
    else if (st === WILTED) {
      [s, col] = [0.6, COLORS.wilted];
      tmpP.y -= 0.06;
    }
    tmpS.set(s, s, s);
    flowerMesh.setMatrixAt(i, tmpM.compose(tmpP, flowerQuat[i], tmpS));
    flowerMesh.setColorAt(i, col);

    // Fruit accroché à la fleur.
    if (st === GROWING || st === RIPE) {
      const g = F.growth[i];
      const r = 0.035 + 0.085 * g;
      flowerPos(i, tmpP);
      tmpP.x += F.normal[i * 3] * (r + 0.02);
      tmpP.z += F.normal[i * 3 + 2] * (r + 0.02);
      tmpP.y -= r * 0.6 + (F.normal[i * 3 + 1] < 0 ? r : 0);
      tmpS.set(r, r * 1.05, r);
      fruitMesh.setMatrixAt(i, tmpM.compose(tmpP, tmpQ.identity(), tmpS));
      fruitMesh.setColorAt(i, tmpC.copy(COLORS.fruitYoung).lerp(COLORS.fruitRipe, st === RIPE ? 1 : g * g));
    } else {
      fruitMesh.setMatrixAt(i, tmpM.makeScale(0, 0, 0));
    }
  }
  flowerMesh.instanceMatrix.needsUpdate = true;
  flowerMesh.instanceColor.needsUpdate = true;
  fruitMesh.instanceMatrix.needsUpdate = true;
  if (fruitMesh.instanceColor) fruitMesh.instanceColor.needsUpdate = true;
}

// Toutes les fleurs à l'échelle 1 pour calculer une sphère englobante juste (pour le lancer de rayon).
for (let i = 0; i < F.n; i++) {
  flowerMesh.setMatrixAt(i, tmpM.compose(flowerPos(i, tmpP), flowerQuat[i], tmpS.set(1, 1, 1)));
  fruitMesh.setColorAt(i, COLORS.fruitYoung);
}
flowerMesh.computeBoundingSphere();
writeFlowers(0);

function writeGroundFruits() {
  const n = Math.min(game.fruits.length, GROUND_MAX);
  for (let k = 0; k < n; k++) {
    const fr = game.fruits[k];
    groundFruitMesh.setMatrixAt(k, tmpM.makeTranslation(fr.x, fr.y, fr.z));
  }
  groundFruitMesh.count = n;
  groundFruitMesh.instanceMatrix.needsUpdate = true;
}

// Repères de visée : anneau sur la fleur visée, anneau pulsant sur la toute première fleur.
const ringGeo = new THREE.RingGeometry(0.2, 0.24, 24);
const aimRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false }));
aimRing.renderOrder = 10;
aimRing.visible = false;
const hintRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xf1cf5a, transparent: true, opacity: 0.9, depthTest: false }));
hintRing.renderOrder = 10;
scene.add(aimRing, hintRing);
let hintDone = false;

// Particules de pollen.
const P_MAX = 400;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(P_MAX * 3);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particles = [];
const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xf3cf3c, size: 0.045 }));
points.frustumCulled = false;
scene.add(points);
function burst(pos, count, spread = 1) {
  for (let k = 0; k < count && particles.length < P_MAX; k++) {
    particles.push({
      x: pos.x, y: pos.y, z: pos.z,
      vx: (Math.random() - 0.5) * 1.6 * spread, vy: Math.random() * 1.2 * spread, vz: (Math.random() - 0.5) * 1.6 * spread,
      life: 0.5 + Math.random() * 0.5,
    });
  }
}
function updateParticles(dt) {
  for (let k = particles.length - 1; k >= 0; k--) {
    const p = particles[k];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(k, 1);
      continue;
    }
    p.vy -= 2.5 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
  }
  for (let k = 0; k < particles.length; k++) pPos.set([particles[k].x, particles[k].y, particles[k].z], k * 3);
  pGeo.setDrawRange(0, particles.length);
  pGeo.attributes.position.needsUpdate = true;
}

// L'outil en main : une tige de coton, un bout par dose.
const swabModel = new THREE.Group();
const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 8), new THREE.MeshBasicMaterial({ color: 0xf5f3ee }));
const tipMatOff = new THREE.MeshBasicMaterial({ color: 0xffffff });
const tipA = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), tipMatOff.clone());
const tipB = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), tipMatOff.clone());
tipA.position.y = 0.15;
tipB.position.y = -0.15;
tipA.scale.set(1, 1.5, 1);
tipB.scale.set(1, 1.5, 1);
swabModel.add(stick, tipA, tipB);
const swabRest = new THREE.Vector3(0.2, -0.2, -0.42);
swabModel.position.copy(swabRest);
swabModel.rotation.set(-1.1, 0.25, 0.35);
camera.add(swabModel);
let poke = 0;
const POLLEN = new THREE.Color(0xf1c232);
const COTTON = new THREE.Color(0xffffff);

// ---------- Joueur et contrôles ----------
const player = { x: CONFIG.player.spawn.x, z: CONFIG.player.spawn.z, yaw: 0, pitch: -0.05, bob: 0 };
const keys = {};
let running = false;
let mouseDown = false;
let holdFlower = -1;
let holdT = 0;
let aimFlower = -1;
let aimTree = -1;
let lockless = false; // navigateur qui refuse le verrouillage du pointeur

const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start');

function setRunning(on) {
  running = on;
  overlay.hidden = on;
  if (!on) {
    mouseDown = false;
    holdFlower = -1;
    for (const k in keys) keys[k] = false;
    startBtn.textContent = game.elapsed > 0 ? 'Reprendre' : 'Jouer';
  }
}

startBtn.addEventListener('click', () => {
  initAudio();
  const req = canvas.requestPointerLock?.();
  // Sans verrouillage du pointeur (navigateur qui refuse), on joue quand même.
  const fallback = () => {
    lockless = true;
    setRunning(true);
  };
  if (req && req.catch) req.catch(fallback);
  else if (!canvas.requestPointerLock) fallback();
});
document.addEventListener('pointerlockchange', () => setRunning(document.pointerLockElement === canvas));

document.addEventListener('mousemove', (e) => {
  if (!running || (!lockless && document.pointerLockElement !== canvas)) return;
  player.yaw -= e.movementX * 0.0022;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - e.movementY * 0.0022));
});
document.addEventListener('mousedown', (e) => {
  if (!running || e.button !== 0) return;
  mouseDown = true;
  press();
});
document.addEventListener('mouseup', (e) => {
  if (e.button !== 0) return;
  mouseDown = false;
  holdFlower = -1;
});
document.addEventListener('keydown', (e) => {
  if (!running) return;
  keys[e.code] = true;
  if (e.code === 'KeyE' && !e.repeat) interact();
});
document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function press() {
  if (aimFlower >= 0) {
    const st = F.state[aimFlower];
    if (st === OPEN && game.swab.doses > 0 && aimFlower !== game.swab.source) {
      game.pollinate(aimFlower);
      return;
    }
    if (st === OPEN) {
      holdFlower = aimFlower;
      holdT = 0;
      return;
    }
    if (st === RIPE) {
      game.shakeTree(F.tree[aimFlower]);
      return;
    }
    sfx.denied();
    return;
  }
  if (aimTree >= 0) game.shakeTree(aimTree);
}

function interact() {
  if (game.nearMarket(player.x, player.z)) {
    if (!game.sell(player.x, player.z)) sfx.denied();
    return;
  }
  let t = aimTree >= 0 ? aimTree : aimFlower >= 0 ? F.tree[aimFlower] : -1;
  if (t < 0) {
    let best = 2.8;
    game.trees.forEach((tr, k) => {
      const d = Math.hypot(tr.x - player.x, tr.z - player.z);
      if (d < best) [best, t] = [d, k];
    });
  }
  if (t >= 0) game.shakeTree(t);
  else sfx.denied();
}

// ---------- Visée ----------
const raycaster = new THREE.Raycaster();
raycaster.far = CONFIG.tool.reach;
const CENTER = new THREE.Vector2(0, 0);
const aimTargets = [flowerMesh, ...treeMeshes];
function updateAim() {
  raycaster.setFromCamera(CENTER, camera);
  const hits = raycaster.intersectObjects(aimTargets, false);
  aimFlower = -1;
  aimTree = -1;
  for (const h of hits) {
    if (h.object === flowerMesh) {
      const st = F.state[h.instanceId];
      if (st === RIPE) continue; // fleur invisible : le fruit mûr est visé via l'arbre
      aimFlower = h.instanceId;
    } else aimTree = h.object.userData.tree;
    break;
  }
  // Viser un fruit mûr (pas de boîte de collision propre) revient à viser son arbre.
}

// ---------- Interface ----------
const $ = (id) => document.getElementById(id);
const ui = {
  credits: $('credits'), doses: $('doses'), pockets: $('pockets'), prompt: $('prompt'),
  cross: $('crosshair'), ring: $('charge'), toast: $('toast'), debug: $('debug'),
};
if (DEBUG) ui.debug.hidden = false;
let shownCredits = 0;

function setPrompt(text) {
  if (ui.prompt.textContent !== text) ui.prompt.textContent = text;
}

function updateUI(dt) {
  shownCredits += (game.credits - shownCredits) * Math.min(1, dt * 8);
  if (Math.abs(game.credits - shownCredits) < 0.5) shownCredits = game.credits;
  ui.credits.textContent = `${Math.round(shownCredits).toLocaleString('fr-FR')} cr`;
  ui.doses.innerHTML = Array.from({ length: CONFIG.tool.doses }, (_, k) => `<span class="dose${k < game.swab.doses ? ' on' : ''}"></span>`).join('');
  ui.pockets.textContent = `Poches ${game.pockets}/${CONFIG.pockets.capacity}`;
  ui.pockets.classList.toggle('full', game.pockets >= CONFIG.pockets.capacity);

  let prompt = '';
  let active = false;
  if (aimFlower >= 0) {
    const st = F.state[aimFlower];
    if (st === OPEN && game.swab.doses > 0 && aimFlower !== game.swab.source) [prompt, active] = ['Clic : polliniser', true];
    else if (st === OPEN) [prompt, active] = ['Maintenir le clic : prendre le pollen', true];
    else if (st === GROWING) prompt = `Le fruit pousse · ${Math.floor(F.growth[aimFlower] * 100)} %`;
    else if (st === BUD) prompt = 'Bouton fermé';
    else if (st === WILTED) prompt = 'Fanée';
  } else if (aimTree >= 0 && treeHasRipe(aimTree)) [prompt, active] = ['Clic ou E : secouer l’arbre', true];
  if (game.nearMarket(player.x, player.z) && game.pockets > 0) [prompt, active] = [`E : vendre ${game.pockets} pomme${game.pockets > 1 ? 's' : ''}`, true];
  else if (!prompt && game.pockets >= CONFIG.pockets.capacity) prompt = 'Poches pleines : va au point de collecte';
  setPrompt(prompt);
  ui.cross.classList.toggle('active', active);

  const p = holdFlower >= 0 ? Math.min(1, holdT / CONFIG.tool.chargeHold) : 0;
  ui.ring.style.setProperty('--p', p);
  ui.ring.hidden = p === 0;

  if (DEBUG) {
    ui.debug.textContent = [
      `${fps.toFixed(0)} img/s · ×${SPEED}`,
      `temps ${game.elapsed.toFixed(0)} s`,
      `pollinisées ${game.stats.pollinated} · fanées ${game.stats.wilted}`,
      `récoltées ${game.stats.harvested} · vendues ${game.stats.sold}`,
      `1re vente ${game.stats.firstSaleAt === null ? '—' : game.stats.firstSaleAt.toFixed(0) + ' s'}`,
    ].join('\n');
  }
}

function treeHasRipe(t) {
  const s = t * O.flowersPerTree;
  for (let i = s; i < s + O.flowersPerTree; i++) if (F.state[i] === RIPE) return true;
  return false;
}

let toastTimer = 0;
function toast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.remove('show');
  void ui.toast.offsetWidth;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1400);
}

// ---------- Boucle ----------
const shakeT = new Float32Array(game.trees.length);
let fps = 60;
let last = performance.now();
const fwd = new THREE.Vector3();

function handleEvents() {
  for (const ev of game.events) {
    if (ev.type === 'pollinate') {
      sfx.pollinate();
      burst(flowerPos(ev.flower), 14, 0.7);
      poke = 1;
      hintDone = true;
    } else if (ev.type === 'charge') {
      sfx.charge();
      burst(flowerPos(ev.flower), 22, 1);
      poke = 1;
      hintDone = true;
    } else if (ev.type === 'shake') {
      sfx.shake();
      shakeT[ev.tree] = 0.6;
    } else if (ev.type === 'pickup') {
      sfx.pickup();
    } else if (ev.type === 'sell') {
      sfx.sell();
      toast(`+${ev.earned} cr`);
    }
  }
  game.events.length = 0;
}

function step(dt) {
  // Déplacement.
  const sprint = keys.ShiftLeft || keys.ShiftRight;
  const speed = sprint ? CONFIG.player.sprint : CONFIG.player.walk;
  let mx = 0;
  let mz = 0;
  if (keys.KeyW || keys.ArrowUp) mz -= 1;
  if (keys.KeyS || keys.ArrowDown) mz += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  const len = Math.hypot(mx, mz);
  if (len) {
    mx /= len;
    mz /= len;
    const sin = Math.sin(player.yaw);
    const cos = Math.cos(player.yaw);
    player.x += (mx * cos + mz * sin) * speed * dt;
    player.z += (-mx * sin + mz * cos) * speed * dt;
    game.resolvePlayer(player);
    player.bob += dt * speed * 2.2;
  }

  game.update(dt * SPEED);
  game.pickup(player.x, player.z);

  // Maintien du clic pour charger la tige.
  if (mouseDown && holdFlower >= 0) {
    if (aimFlower !== holdFlower || F.state[holdFlower] !== OPEN) holdFlower = -1;
    else if ((holdT += dt) >= CONFIG.tool.chargeHold) {
      game.chargeFrom(holdFlower);
      holdFlower = -1;
    }
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05;
  if (running) step(dt);
  render(dt, now / 1000);
  requestAnimationFrame(frame);
}

function render(dt, time) {
  camera.position.set(player.x, CONFIG.player.eye + Math.sin(player.bob) * 0.03, player.z);
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  camera.updateMatrixWorld();
  updateAim();
  handleEvents();

  writeFlowers(time);
  writeGroundFruits();
  updateParticles(dt);

  // Arbres secoués.
  for (let k = 0; k < canopies.length; k++) {
    if (shakeT[k] > 0) shakeT[k] = Math.max(0, shakeT[k] - dt);
    const a = shakeT[k];
    canopies[k].rotation.z = Math.sin(a * 45) * 0.07 * a;
    canopies[k].rotation.x = Math.cos(a * 38) * 0.05 * a;
  }

  // Anneau de visée.
  if (aimFlower >= 0 && F.state[aimFlower] !== RIPE) {
    flowerPos(aimFlower, aimRing.position);
    aimRing.position.addScaledVector(fwd.set(F.normal[aimFlower * 3], F.normal[aimFlower * 3 + 1], F.normal[aimFlower * 3 + 2]), 0.05);
    aimRing.quaternion.copy(flowerQuat[aimFlower]);
    aimRing.material.color.set(F.state[aimFlower] === OPEN ? 0xf1cf5a : 0xffffff);
    aimRing.visible = true;
  } else aimRing.visible = false;

  // La seule aide du jeu : la première fleur ouverte est surlignée jusqu'au premier geste.
  hintRing.visible = !hintDone && F.state[game.hintFlower] === OPEN;
  if (hintRing.visible) {
    const i = game.hintFlower;
    flowerPos(i, hintRing.position).addScaledVector(fwd.set(F.normal[i * 3], F.normal[i * 3 + 1], F.normal[i * 3 + 2]), 0.06);
    hintRing.quaternion.copy(flowerQuat[i]);
    const s = 1.3 + Math.sin(time * 4) * 0.25;
    hintRing.scale.set(s, s, s);
  }

  // Tige en main.
  tipA.material.color.copy(game.swab.doses >= 1 ? POLLEN : COTTON);
  tipB.material.color.copy(game.swab.doses >= 2 ? POLLEN : COTTON);
  poke = Math.max(0, poke - dt * 5);
  const charging = holdFlower >= 0 ? Math.sin(time * 40) * 0.006 : 0;
  swabModel.position.set(swabRest.x - poke * 0.05 + charging, swabRest.y + poke * 0.05 + Math.sin(player.bob) * 0.008, swabRest.z - poke * 0.14);

  updateUI(dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(frame);

// Accès pour les tests automatisés et le réglage en console.
window.pollen = {
  game,
  player,
  camera,
  start: () => setRunning(true),
  lookAt(x, y, z) {
    const dx = x - player.x;
    const dy = y - CONFIG.player.eye;
    const dz = z - player.z;
    player.yaw = Math.atan2(-dx, -dz);
    player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  },
  lookAtFlower(i) {
    this.lookAt(F.pos[i * 3], F.pos[i * 3 + 1], F.pos[i * 3 + 2]);
  },
  get aim() {
    return { flower: aimFlower, tree: aimTree };
  },
};
