// Joueur simulé : il marche à vitesse réelle, tient le clic pour charger, pollinise,
// secoue, ramasse et vend. Sert à vérifier la règle de rythme du brief.
import { CONFIG } from '../src/config.js';
import { createGame, mulberry32, OPEN, RIPE } from '../src/sim.js';

const openFlowers = (g) => [...Array(g.flowers.n).keys()].filter((i) => g.flowers.state[i] === OPEN);

export function simulateFirstSale(seed, log = null) {
  const g = createGame(CONFIG, mulberry32(seed));
  const say = (m) => log && log.push(`${g.elapsed.toFixed(0)}s ${m}`);
  const C = CONFIG;
  const me = { x: C.player.spawn.x, z: C.player.spawn.z };
  const step = 1 / 20;
  const tick = (sec) => {
    for (let t = 0; t < sec; t += step) {
      g.update(step);
      g.pickup(me.x, me.z);
    }
  };
  const walkTo = (x, z, stopAt = 1) => {
    for (let guard = 0; guard < 20 * 8; guard++) {
      const d = Math.hypot(x - me.x, z - me.z);
      if (d <= stopAt) return;
      const s = Math.min(C.player.walk * step, d - stopAt);
      me.x += ((x - me.x) / d) * s;
      me.z += ((z - me.z) / d) * s;
      g.resolvePlayer(me);
      tick(step);
    }
  };
  const flowerXZ = (i) => [g.flowers.pos[i * 3], g.flowers.pos[i * 3 + 2]];
  const nearest = (list) => list.sort((a, b) => Math.hypot(flowerXZ(a)[0] - me.x, flowerXZ(a)[1] - me.z) - Math.hypot(flowerXZ(b)[0] - me.x, flowerXZ(b)[1] - me.z))[0];

  while (g.elapsed < 600 && g.stats.firstSaleAt === null) {
    const ripe = [...Array(g.flowers.n).keys()].filter((i) => g.flowers.state[i] === RIPE);
    if (ripe.length) {
      const t = g.flowers.tree[nearest(ripe)];
      walkTo(g.trees[t].x, g.trees[t].z, 1.5);
      say(`secoue arbre ${t} (${g.shakeTree(t)} fruits)`);
      tick(1.2);
      for (const fr of [...g.fruits]) if (g.fruits.includes(fr)) walkTo(fr.x, fr.z, 1);
      walkTo(C.market.x, C.market.z, 2.5);
      say(`vend ${g.sell(me.x, me.z)} cr`);
      continue;
    }
    const open = openFlowers(g).filter((i) => i !== g.swab.source);
    if (!open.length) {
      tick(1);
      continue;
    }
    const target = nearest(open);
    const [fx, fz] = flowerXZ(target);
    walkTo(fx, fz, 2); // la tige porte à 3,2 m depuis les yeux
    if (g.flowers.state[target] !== OPEN) continue;
    if (g.swab.doses === 0) {
      tick(C.tool.chargeHold);
      if (g.chargeFrom(target)) say(`charge sur ${target}`);
    } else {
      tick(0.3);
      if (g.pollinate(target)) say(`pollinise ${target}`);
    }
  }
  return g.stats.firstSaleAt;
}
