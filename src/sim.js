// Simulation pure du jalon 1 : aucune dépendance au rendu, testable sous Node.
//
// Les fleurs ne sont PAS des objets : ce sont des index dans des tableaux typés
// (état, minuteur, croissance, position). C'est la structure qui tiendra
// des dizaines de milliers de fleurs au jalon 2.

export const BUD = 0; // bouton fermé
export const OPEN = 1; // ouverte, pollinisable
export const GROWING = 2; // pollinisée, le fruit pousse
export const RIPE = 3; // fruit mûr, à secouer
export const WILTED = 4; // fanée faute de pollinisation, repousse plus tard

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rng, [a, b]) => a + (b - a) * rng();

export function createGame(config, rng = Math.random) {
  const C = config;
  const O = C.orchard;

  const trees = [];
  for (let r = 0; r < O.rows; r++) {
    for (let c = 0; c < O.cols; c++) {
      trees.push({ x: (c - (O.cols - 1) / 2) * O.spacing, z: O.originZ - r * O.spacing });
    }
  }

  const n = trees.length * O.flowersPerTree;
  const flowers = {
    n,
    state: new Uint8Array(n),
    timer: new Float32Array(n),
    growth: new Float32Array(n),
    tree: new Uint16Array(n),
    pos: new Float32Array(n * 3),
    normal: new Float32Array(n * 3), // face du feuillage qui porte la fleur
  };

  // Placement : les fleurs sont posées sur les quatre faces latérales et la face
  // du dessous du cube de feuillage, avec un écart minimal entre elles.
  const h = O.canopyHalf;
  const faces = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
    [0, -1, 0],
  ];
  for (let t = 0; t < trees.length; t++) {
    const tr = trees[t];
    const placed = [];
    for (let k = 0; k < O.flowersPerTree; k++) {
      const i = t * O.flowersPerTree + k;
      const face = faces[k === 8 ? 4 : k % 4]; // 9 fleurs sur les côtés, 1 dessous
      let p;
      for (let attempt = 0; attempt < 40; attempt++) {
        const u = (rng() * 2 - 1) * h * 0.8;
        const v = (rng() * 2 - 1) * h * 0.8;
        const off = h + 0.07;
        let x, y, z;
        if (face[0]) [x, y, z] = [face[0] * off, v, u];
        else if (face[2]) [x, y, z] = [u, v, face[2] * off];
        else [x, y, z] = [u, -off, v];
        p = [tr.x + x, O.canopyY + y, tr.z + z];
        if (placed.every((q) => (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2 > 0.38 ** 2)) break;
      }
      placed.push(p);
      flowers.tree[i] = t;
      flowers.pos.set(p, i * 3);
      flowers.normal.set(face, i * 3);
      if (rng() < C.flower.startOpenRatio) {
        flowers.state[i] = OPEN;
        flowers.timer[i] = between(rng, C.flower.bloomWindow) * (0.4 + 0.6 * rng());
      } else {
        flowers.state[i] = BUD;
        flowers.timer[i] = between(rng, C.flower.budTime);
      }
    }
  }

  // La première fleur du premier arbre est ouverte au lancement, avec toute sa fenêtre :
  // c'est elle que le jeu surligne (seul « tutoriel » du jeu).
  const firstTree = trees.reduce(
    (best, tr, t) => (Math.hypot(tr.x - C.player.spawn.x, tr.z - C.player.spawn.z) < Math.hypot(trees[best].x - C.player.spawn.x, trees[best].z - C.player.spawn.z) ? t : best),
    0,
  );
  // On choisit la fleur de cet arbre tournée vers le joueur.
  let hint = firstTree * O.flowersPerTree;
  for (let k = 0; k < O.flowersPerTree; k++) {
    const i = firstTree * O.flowersPerTree + k;
    if (flowers.normal[i * 3 + 2] === 1) {
      hint = i;
      break;
    }
  }
  flowers.state[hint] = OPEN;
  flowers.timer[hint] = C.flower.bloomWindow[1] * 2;
  // Et au moins une voisine ouverte, pour que la toute première charge serve tout de suite.
  for (let k = 0; k < O.flowersPerTree; k++) {
    const i = firstTree * O.flowersPerTree + k;
    if (i !== hint && flowers.normal[i * 3 + 2] === 1) {
      flowers.state[i] = OPEN;
      flowers.timer[i] = C.flower.bloomWindow[1] * 2;
      break;
    }
  }

  const game = {
    config: C,
    trees,
    flowers,
    fruits: [], // fruits tombés au sol : {x, y, z, vx, vy, vz}
    swab: { doses: 0, source: -1 },
    pockets: 0,
    credits: 0,
    elapsed: 0,
    hintFlower: hint,
    stats: { pollinated: 0, wilted: 0, harvested: 0, sold: 0, firstSaleAt: null },
    events: [], // vidés par le rendu à chaque image : sons, particules, textes
  };

  game.update = (dt) => update(game, dt, rng);
  game.chargeFrom = (i) => chargeFrom(game, i);
  game.pollinate = (i) => pollinate(game, i);
  game.shakeTree = (t) => shakeTree(game, t, rng);
  game.pickup = (x, z) => pickup(game, x, z);
  game.sell = (x, z) => sell(game, x, z);
  game.nearMarket = (x, z) => Math.hypot(x - C.market.x, z - C.market.z) <= C.market.sellRadius;
  game.resolvePlayer = (p) => resolvePlayer(game, p);
  return game;
}

function update(game, dt, rng) {
  const C = game.config;
  const f = game.flowers;
  game.elapsed += dt;

  for (let i = 0; i < f.n; i++) {
    switch (f.state[i]) {
      case BUD:
        if ((f.timer[i] -= dt) <= 0) {
          f.state[i] = OPEN;
          f.timer[i] = between(rng, C.flower.bloomWindow);
        }
        break;
      case OPEN:
        if ((f.timer[i] -= dt) <= 0) {
          f.state[i] = WILTED;
          f.timer[i] = C.flower.wiltTime;
          game.stats.wilted++;
          if (game.swab.source === i) game.swab.source = -1;
        }
        break;
      case WILTED:
        if ((f.timer[i] -= dt) <= 0) {
          f.state[i] = BUD;
          f.timer[i] = between(rng, C.flower.budTime);
        }
        break;
      case GROWING:
        f.growth[i] += dt / C.apple.growTime;
        if (f.growth[i] >= 1) {
          f.growth[i] = 1;
          f.state[i] = RIPE;
        }
        break;
    }
  }

  // Fruits au sol : chute, rebond, glissade. Rien ne disparaît, tout reste ramassable.
  const P = C.physics;
  const r = 0.12;
  for (const fr of game.fruits) {
    if (fr.rest) continue;
    fr.vy -= P.gravity * dt;
    fr.x += fr.vx * dt;
    fr.y += fr.vy * dt;
    fr.z += fr.vz * dt;
    if (fr.y <= r) {
      fr.y = r;
      if (Math.abs(fr.vy) > 1) {
        fr.vy = -fr.vy * P.bounce;
      } else {
        fr.vy = 0;
      }
      const k = Math.max(0, 1 - P.friction * dt);
      fr.vx *= k;
      fr.vz *= k;
      if (fr.vy === 0 && Math.hypot(fr.vx, fr.vz) < 0.05) fr.rest = true;
    }
    // Un fruit ne finit jamais coincé dans un tronc : il en est repoussé.
    if (fr.y < C.orchard.trunkHeight) {
      for (const tr of game.trees) {
        const dx = fr.x - tr.x;
        const dz = fr.z - tr.z;
        const d = Math.hypot(dx, dz);
        const min = C.orchard.trunkRadius * 0.6 + r;
        if (d < min) {
          const ux = d > 1e-6 ? dx / d : 1;
          const uz = d > 1e-6 ? dz / d : 0;
          fr.x = tr.x + ux * min;
          fr.z = tr.z + uz * min;
        }
      }
    }
  }
}

function chargeFrom(game, i) {
  if (game.flowers.state[i] !== OPEN) return false;
  game.swab.doses = game.config.tool.doses;
  game.swab.source = i;
  game.events.push({ type: 'charge', flower: i });
  return true;
}

function pollinate(game, i) {
  const f = game.flowers;
  const s = game.swab;
  if (s.doses <= 0 || f.state[i] !== OPEN || i === s.source) return false;
  f.state[i] = GROWING;
  f.growth[i] = 0;
  s.doses--;
  if (s.doses === 0) s.source = -1;
  game.stats.pollinated++;
  game.events.push({ type: 'pollinate', flower: i });
  return true;
}

function shakeTree(game, t, rng) {
  const C = game.config;
  const f = game.flowers;
  const tr = game.trees[t];
  let count = 0;
  const start = t * C.orchard.flowersPerTree;
  for (let i = start; i < start + C.orchard.flowersPerTree; i++) {
    if (f.state[i] !== RIPE) continue;
    const x = f.pos[i * 3];
    const y = f.pos[i * 3 + 1];
    const z = f.pos[i * 3 + 2];
    // Le fruit part vers l'extérieur de l'arbre.
    const dx = x - tr.x;
    const dz = z - tr.z;
    const d = Math.hypot(dx, dz) || 1;
    const speed = 0.8 + rng() * 1.4;
    game.fruits.push({ x, y, z, vx: (dx / d) * speed, vy: rng() * 1.5, vz: (dz / d) * speed, rest: false });
    f.state[i] = BUD;
    f.growth[i] = 0;
    f.timer[i] = between(rng, C.flower.regrowTime);
    count++;
  }
  game.stats.harvested += count;
  game.events.push({ type: 'shake', tree: t, count });
  return count;
}

function pickup(game, x, z) {
  const C = game.config;
  let got = 0;
  for (let k = game.fruits.length - 1; k >= 0; k--) {
    if (game.pockets >= C.pockets.capacity) break;
    const fr = game.fruits[k];
    if (fr.y > 1.2) continue; // encore en train de tomber
    if (Math.hypot(fr.x - x, fr.z - z) > C.pockets.pickupRadius) continue;
    game.fruits.splice(k, 1);
    game.pockets++;
    got++;
  }
  if (got) game.events.push({ type: 'pickup', count: got });
  return got;
}

function sell(game, x, z) {
  if (!game.nearMarket(x, z) || game.pockets === 0) return 0;
  const earned = game.pockets * game.config.apple.price;
  game.stats.sold += game.pockets;
  game.credits += earned;
  game.pockets = 0;
  if (game.stats.firstSaleAt === null) game.stats.firstSaleAt = game.elapsed;
  game.events.push({ type: 'sell', earned });
  return earned;
}

// Collisions du joueur : troncs (cercles), étal du marché (boîte), limites du terrain.
// Modifie p = {x, z} sur place.
function resolvePlayer(game, p) {
  const C = game.config;
  const pr = C.player.radius;
  for (const tr of game.trees) {
    const dx = p.x - tr.x;
    const dz = p.z - tr.z;
    const d = Math.hypot(dx, dz);
    const min = C.orchard.trunkRadius + pr;
    if (d < min && d > 1e-6) {
      p.x = tr.x + (dx / d) * min;
      p.z = tr.z + (dz / d) * min;
    }
  }
  // Étal : boîte de 2,4 × 1,2 m centrée sur le marché.
  const m = C.market;
  const hx = 1.2 + pr;
  const hz = 0.6 + pr;
  const lx = p.x - m.x;
  const lz = p.z - m.z;
  if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
    if (hx - Math.abs(lx) < hz - Math.abs(lz)) p.x = m.x + Math.sign(lx || 1) * hx;
    else p.z = m.z + Math.sign(lz || 1) * hz;
  }
  const b = C.player.bounds;
  p.x = Math.max(-b, Math.min(b, p.x));
  p.z = Math.max(-b, Math.min(b, p.z));
  return p;
}
