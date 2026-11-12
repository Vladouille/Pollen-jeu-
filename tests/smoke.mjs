// Test de fumée dans un vrai navigateur : la boucle complète avec la souris et le clavier.
// Lancer : node tests/smoke.mjs   (sert le dossier sur un port libre, puis ouvre Chromium)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = process.env.SHOTS || join(root, 'tests', 'captures');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  try {
    const body = await readFile(join(root, path || 'index.html'));
    res.writeHead(200, { 'content-type': TYPES[extname(path || '.html')] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const url = `http://localhost:${server.address().port}/index.html?debug`;

const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures.push(label);
};

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

try {
  await page.goto(url);
  await page.waitForFunction(() => window.pollen);
  await page.screenshot({ path: join(shots, '1-accueil.png') });

  // Le navigateur sans écran ne verrouille pas le pointeur : on lance la partie par le crochet de test,
  // et la caméra est orientée par code (les mouvements de souris de Playwright ne la touchent pas).
  await page.evaluate(() => window.pollen.start());
  await page.mouse.move(640, 360);
  await page.waitForTimeout(300);
  check(await page.isHidden('#overlay'), 'le bouton Jouer lance la partie');

  // Déplacement au clavier (après une seconde de chauffe : les premières images compilent les shaders).
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => ({ ...window.pollen.player }));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1000);
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(() => ({ ...window.pollen.player }));
  check(before.z - after.z > 1.5, `Z/W fait avancer (${(before.z - after.z).toFixed(2)} m en 1 s)`);

  // On s'approche de la fleur surlignée et on la vise.
  const hint = await page.evaluate(() => {
    const p = window.pollen;
    const i = p.game.hintFlower;
    const f = p.game.flowers.pos;
    p.player.x = f[i * 3];
    p.player.z = f[i * 3 + 2] + 1.6;
    p.lookAtFlower(i);
    return i;
  });
  await page.waitForTimeout(150);
  check((await page.evaluate(() => window.pollen.aim.flower)) === hint, 'le viseur désigne la fleur surlignée');
  await page.screenshot({ path: join(shots, '2-visee.png') });

  // Clic bref : pas de charge. Clic maintenu : la tige se charge.
  await page.mouse.click(640, 360);
  check((await page.evaluate(() => window.pollen.game.swab.doses)) === 0, 'un clic bref ne charge pas la tige');
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(shots, '3-charge-en-cours.png') });
  await page.waitForTimeout(450);
  await page.mouse.up();
  check((await page.evaluate(() => window.pollen.game.swab.doses)) === 2, 'le clic maintenu charge deux doses');

  // On vise une autre fleur ouverte à portée et on clique.
  const target = await page.evaluate(() => {
    const p = window.pollen;
    const g = p.game;
    const f = g.flowers;
    for (let i = 0; i < f.n; i++) {
      if (i === g.swab.source || f.state[i] !== 1 || f.tree[i] !== f.tree[g.hintFlower] || f.normal[i * 3 + 2] !== 1) continue;
      p.lookAtFlower(i);
      return i;
    }
    return -1;
  });
  await page.waitForTimeout(150);
  check(target >= 0 && (await page.evaluate(() => window.pollen.aim.flower)) === target, 'une deuxième fleur ouverte est visée');
  await page.mouse.click(640, 360);
  const st = await page.evaluate((i) => ({ state: window.pollen.game.flowers.state[i], doses: window.pollen.game.swab.doses }), target);
  check(st.state === 2 && st.doses === 1, 'le clic pollinise la fleur et consomme une dose');
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(shots, '4-pollinisee.png') });

  // On laisse pousser (avance rapide de la simulation), puis on secoue avec E.
  await page.evaluate(() => {
    for (let k = 0; k < 125; k++) window.pollen.game.update(1);
  });
  await page.waitForTimeout(100);
  check((await page.evaluate((i) => window.pollen.game.flowers.state[i], target)) === 3, 'le fruit est mûr après 110 s');
  await page.screenshot({ path: join(shots, '5-fruit-mur.png') });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(1500);
  const fallen = await page.evaluate(() => window.pollen.game.fruits.length + window.pollen.game.pockets);
  check(fallen >= 1, `E secoue l'arbre : ${fallen} fruit(s) tombé(s)`);
  await page.screenshot({ path: join(shots, '6-fruits-au-sol.png') });

  // On marche sur les fruits pour les ramasser.
  for (let k = 0; k < 20; k++) {
    const left = await page.evaluate(() => {
      const p = window.pollen;
      const fr = p.game.fruits[0];
      if (!fr) return 0;
      p.player.x = fr.x + 0.4;
      p.player.z = fr.z;
      return p.game.fruits.length;
    });
    if (!left) break;
    await page.waitForTimeout(60);
  }
  const pockets = await page.evaluate(() => window.pollen.game.pockets);
  check(pockets >= 1, `les fruits ramassés vont dans les poches (${pockets})`);

  // Vente au point de collecte.
  await page.evaluate(() => {
    const p = window.pollen;
    const m = p.game.config.market;
    p.player.x = m.x - 0.5;
    p.player.z = m.z + 2.4;
    p.lookAt(m.x, 1.4, m.z);
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(shots, '7-point-de-collecte.png') });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);
  const sale = await page.evaluate(() => ({ credits: window.pollen.game.credits, pockets: window.pollen.game.pockets }));
  check(sale.credits === pockets * 3 && sale.pockets === 0, `E vend la récolte : ${sale.credits} crédits`);
  await page.screenshot({ path: join(shots, '8-vente.png') });

  // Vue d'ensemble du verger.
  await page.evaluate(() => {
    const p = window.pollen;
    p.player.x = -4;
    p.player.z = 3;
    p.lookAt(0, 1.6, -10);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(shots, '9-verger.png') });

  // Pause avec la perte du pointeur.
  const fps = await page.evaluate(() => document.getElementById('debug').textContent.split(' ')[0]);
  console.log(`info images/s (rendu logiciel, sans carte graphique) : ${fps}`);
} finally {
  check(errors.length === 0, `aucune erreur dans la console${errors.length ? ' : ' + errors.join(' | ') : ''}`);
  await browser.close();
  server.close();
}

if (failures.length) {
  console.log(`\n${failures.length} échec(s)`);
  process.exit(1);
}
console.log('\nTout passe.');
