// Tests de la simulation du jalon 1. Lancer : node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createGame, mulberry32, BUD, OPEN, GROWING, RIPE, WILTED } from '../src/sim.js';
import { simulateFirstSale } from './bot.mjs';

const newGame = (seed = 1) => createGame(CONFIG, mulberry32(seed));
const openFlowers = (g) => [...Array(g.flowers.n).keys()].filter((i) => g.flowers.state[i] === OPEN);

test('le verger compte 100 fleurs et la fleur surlignée est ouverte', () => {
  const g = newGame();
  assert.equal(g.flowers.n, 100);
  assert.equal(g.flowers.state[g.hintFlower], OPEN);
  assert.ok(openFlowers(g).length >= 2);
});

test('les fleurs sont à portée de main depuis le sol', () => {
  const g = newGame();
  const eye = CONFIG.player.eye;
  for (let i = 0; i < g.flowers.n; i++) {
    const y = g.flowers.pos[i * 3 + 1];
    // Le joueur se tient à 1 m du feuillage : la fleur doit rester dans la portée de l'outil.
    const horizontal = CONFIG.orchard.canopyHalf * 0.8 + 1;
    assert.ok(Math.hypot(y - eye, horizontal) < CONFIG.tool.reach + 0.3, `fleur ${i} trop haute (${y.toFixed(2)} m)`);
  }
});

test('une charge pollinise deux fleurs, jamais la fleur source', () => {
  const g = newGame();
  const [a, b, c, d] = openFlowers(g);
  assert.equal(g.pollinate(b), false, 'sans pollen, rien ne se passe');
  assert.equal(g.chargeFrom(a), true);
  assert.equal(g.swab.doses, 2);
  assert.equal(g.pollinate(a), false, 'on ne pollinise pas une fleur avec son propre pollen');
  assert.equal(g.pollinate(b), true);
  assert.equal(g.pollinate(c), true);
  assert.equal(g.swab.doses, 0);
  assert.equal(g.pollinate(d), false);
  assert.equal(g.flowers.state[b], GROWING);
  assert.equal(g.stats.pollinated, 2);
});

test('on ne charge pas sur une fleur fermée', () => {
  const g = newGame();
  const bud = [...Array(g.flowers.n).keys()].find((i) => g.flowers.state[i] === BUD);
  assert.equal(g.chargeFrom(bud), false);
});

test('une fleur ouverte non pollinisée fane, puis redevient un bouton', () => {
  const g = newGame();
  const i = openFlowers(g).find((k) => k !== g.hintFlower);
  g.flowers.timer[i] = 0.5;
  g.update(1);
  assert.equal(g.flowers.state[i], WILTED);
  g.update(CONFIG.flower.wiltTime + 0.1);
  assert.equal(g.flowers.state[i], BUD);
});

test('le fruit mûrit en growTime secondes, tombe à la secousse et se vend', () => {
  const g = newGame();
  const [a, b] = openFlowers(g);
  g.chargeFrom(a);
  g.pollinate(b);
  for (let t = 0; t < CONFIG.apple.growTime - 1; t++) g.update(1);
  assert.equal(g.flowers.state[b], GROWING);
  g.update(2);
  assert.equal(g.flowers.state[b], RIPE);

  const tree = g.flowers.tree[b];
  assert.equal(g.shakeTree(tree), 1);
  assert.equal(g.flowers.state[b], BUD);
  assert.equal(g.fruits.length, 1);
  for (let t = 0; t < 120; t++) g.update(1 / 60);
  const fr = g.fruits[0];
  assert.ok(fr.rest && fr.y < 0.2, 'le fruit repose au sol');

  assert.equal(g.pickup(fr.x + 0.5, fr.z), 1);
  assert.equal(g.pockets, 1);
  assert.equal(g.sell(0, 0), 0, 'loin du marché, on ne vend pas');
  assert.equal(g.sell(CONFIG.market.x, CONFIG.market.z + 2), CONFIG.apple.price);
  assert.equal(g.credits, CONFIG.apple.price);
  assert.equal(g.pockets, 0);
  assert.notEqual(g.stats.firstSaleAt, null);
});

test('les poches sont limitées', () => {
  const g = newGame();
  for (let k = 0; k < 20; k++) g.fruits.push({ x: 0, y: 0.12, z: 0, vx: 0, vy: 0, vz: 0, rest: true });
  assert.equal(g.pickup(0, 0), CONFIG.pockets.capacity);
  assert.equal(g.fruits.length, 20 - CONFIG.pockets.capacity);
});

test('le joueur ne traverse ni les troncs ni l’étal', () => {
  const g = newGame();
  const tr = g.trees[0];
  const p = g.resolvePlayer({ x: tr.x + 0.1, z: tr.z });
  assert.ok(Math.hypot(p.x - tr.x, p.z - tr.z) >= CONFIG.orchard.trunkRadius + CONFIG.player.radius - 1e-6);
  const m = g.resolvePlayer({ x: CONFIG.market.x, z: CONFIG.market.z + 0.1 });
  assert.ok(Math.abs(m.z - CONFIG.market.z) >= 0.6 + CONFIG.player.radius - 1e-6);
});

// Règle de rythme du brief : la première vente doit tomber dans les trois premières minutes.
// Un joueur simulé marche à vitesse réelle (pas de téléportation), charge en tenant le clic,
// pollinise, attend en pollinisant ailleurs, secoue, ramasse et vend.
test('un joueur appliqué fait sa première vente en moins de 3 minutes', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const at = simulateFirstSale(seed);
    assert.ok(at !== null && at < 180, `graine ${seed} : première vente à ${at === null ? 'jamais' : at.toFixed(0) + ' s'}`);
  }
});
