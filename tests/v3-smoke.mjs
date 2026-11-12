// Test de fumée de la v3 dans Chromium : boucle complète, contraintes de difficulté, tactile.
// Lancer : node tests/v3-smoke.mjs   (Three.js est servi depuis vendor/ à la place du CDN)
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = process.env.SHOTS || join(root, 'tests', 'captures');
const server = createServer(async (req, res) => {
  try { res.writeHead(200, { 'content-type': 'text/html' }); res.end(await readFile(join(root, 'v3', 'index.html'))); } catch { res.writeHead(404).end(); }
}).listen(0);
const url = `http://localhost:${server.address().port}/`;
const three = await readFile(join(root, 'vendor', 'three.module.min.js'));
const fails = [];
const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) fails.push(label); };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function open(ctxOpts, query = '?debug&neuf&herbe=3000') {
  const ctx = await browser.newContext(ctxOpts);
  await ctx.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ body: three, contentType: 'text/javascript' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)));
  await page.goto(url + query);
  await page.waitForFunction(() => window.pollen, null, { timeout: 90000 });
  await page.waitForTimeout(2500);
  return { ctx, page, errors };
}
const snap = (page, name) => page.screenshot({ path: join(shots, `v3-${name}.png`), timeout: 180000 });
const until = (page, fn, arg, ms = 60000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false);

try {
  // ---------- Étape 1 : un seul arbre ----------
  {
    const a = await open({ viewport: { width: 1280, height: 720 } }, '?scene=arbre');
    const info = await a.page.evaluate(() => ({ cards: window.pollen.cards(), boxes: (() => { let n = 0; window.pollen.scene.traverse((o) => { if (o.geometry && o.geometry.type === 'BoxGeometry') n++; }); return n; })() }));
    check(info.cards >= 40 && info.cards <= 80, `un arbre : ${info.cards} plans de feuillage (40 à 80)`);
    await snap(a.page, '1-arbre');
    check(a.errors.length === 0, `aucune erreur (arbre)${a.errors.length ? ' : ' + a.errors.join(' | ') : ''}`);
    await a.ctx.close();
  }

  // ---------- PC : la partie ----------
  const { ctx, page, errors } = await open({ viewport: { width: 1280, height: 720 } });
  const boxes = await page.evaluate(() => { let n = 0; window.pollen.scene.traverse((o) => { if (o.geometry && o.geometry.type === 'BoxGeometry') n++; }); return n; });
  check(boxes === 0, `aucune BoxGeometry dans la scène (${boxes})`);
  await snap(page, '2-depart');
  const ob0 = await page.evaluate(() => window.pollen.objective);
  check(ob0 && ob0.kind === 'source', `dix premières secondes : l'objectif est la fleur source du pommier isolé (${ob0 && ob0.kind})`);
  const open0 = await page.evaluate(() => window.pollen.blossoms.filter((b) => b.state === 1).length);
  check(open0 === 1, `une seule fleur à polliniser au départ (${open0})`);

  // On marche vers le pommier.
  const p0 = await page.evaluate(() => ({ ...window.pollen.player }));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(3000); await page.keyboard.up('KeyW');
  const p1 = await page.evaluate(() => ({ ...window.pollen.player }));
  check(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.2, `Z/W : le personnage avance vers l'arbre (${Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(1)} m)`);
  const go = (sel) => page.evaluate((sel) => {
    const P = window.pollen, b = P.blossoms.find(sel === 'source' ? (x) => x.state === 5 && x.tree === 0 : sel === 'open' ? (x) => x.state === 1 : (x) => x.state === 3);
    if (!b) return false;
    const t = P.trees[b.tree], dx = b.x - t.x, dz = b.z - t.z, d = Math.hypot(dx, dz) || 1;
    P.player.x = b.x + (dx / d) * 0.9; P.player.z = b.z + (dz / d) * 0.9; P.player.face = Math.atan2(-dx, -dz);
    return true;
  }, sel);
  const idle = () => until(page, () => window.pollen.player.act <= 0);
  await go('source');
  check(await until(page, () => window.pollen.target && window.pollen.target.kind === 'charge', null, 20000), 'près de la source, l’action propose « Pollen »');
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.pollen.state.doses)) === 1, 'la tige de coton ne porte qu’une dose');
  await idle();
  await go('open');
  check(await until(page, () => window.pollen.target && window.pollen.target.kind === 'pollinate', null, 20000), 'la fleur blanche devient la cible « Polliniser »');
  await snap(page, '3-polliniser');
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({ doses: window.pollen.state.doses, growing: window.pollen.blossoms.filter((b) => b.state === 2).length, open: window.pollen.blossoms.filter((b) => b.state === 1).length }));
  check(after.doses === 0 && after.growing === 1, 'la fleur se change en fruit, la tige est vide');
  check(after.open === 1, `la fleur suivante s’allume (${after.open} ouverte)`);
  check(await until(page, () => window.pollen.objective && window.pollen.objective.kind === 'source', null, 20000), 'le guidage renvoie à une fleur source pour recharger');

  // Le fruit mûrit, on le cueille.
  await idle();
  await page.evaluate(() => window.pollen.simulate(61));
  await go('ripe');
  check(await until(page, () => window.pollen.target && window.pollen.target.kind === 'pick', null, 20000), 'le fruit mûr devient la cible « Cueillir »');
  await page.keyboard.press('Space');
  await page.waitForTimeout(600);
  check((await page.evaluate(() => window.pollen.state.basket.length)) === 1, 'le fruit va dans le panier');

  // Panier plein : 6 fruits, le personnage ralentit, le guidage bascule sur le marché.
  await page.evaluate(() => { const s = window.pollen.state; while (s.basket.length < 6) s.basket.push({ t: 0 }); });
  check(await until(page, () => window.pollen.objective && window.pollen.objective.kind === 'market', null, 20000), 'panier plein : le marqueur pointe vers le marché');
  await page.evaluate(() => { const P = window.pollen; P.player.x = 10; P.player.z = -8; P.cam.yaw = 0; });
  await page.waitForTimeout(500);
  const s0 = await page.evaluate(() => ({ ...window.pollen.player }));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(3000); await page.keyboard.up('KeyW');
  const s1 = await page.evaluate(() => ({ ...window.pollen.player }));
  const fps = await page.evaluate(() => window.pollen.fps());
  console.log(`info déplacement panier plein : ${Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(2)} m en 3 s réelles à ${fps.toFixed(1)} img/s`);
  await snap(page, '4-panier-plein');

  // Vente : « Vendre : 24 crédits ».
  await page.evaluate(() => { const P = window.pollen; P.player.x = P.MARKET.x - 3; P.player.z = P.MARKET.z + 2; P.cam.yaw = Math.atan2(-3, 2); });
  check(await until(page, () => window.pollen.target && window.pollen.target.kind === 'sell', null, 20000), 'au marché, l’action propose la vente');
  const label = await page.evaluate(() => document.getElementById('keyhint').textContent);
  check(/Vendre : 24 crédits/.test(label), `libellé : « ${label} »`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  const sold = await page.evaluate(() => ({ c: window.pollen.state.credits, b: window.pollen.state.basket.length }));
  check(sold.c === 24 && sold.b === 0, `vente : ${sold.c} crédits, panier vidé`);
  await snap(page, '5-vente');

  // Les fruits s'abîment : après 2 min dans le panier, ils valent moitié moins.
  await page.evaluate(() => { const s = window.pollen.state; s.basket.push({ t: 0 }, { t: 0 }); window.pollen.simulate(121); });
  const v = await page.evaluate(() => document.getElementById('keyhint').textContent);
  await until(page, () => /Vendre : 4 crédits/.test(document.getElementById('keyhint').textContent), null, 15000);
  const v2 = await page.evaluate(() => document.getElementById('keyhint').textContent);
  check(/Vendre : 4 crédits/.test(v2), `fruits abîmés : « ${v2} » au lieu de 8`);
  await page.keyboard.press('Space');

  // Établi : le pinceau à 250 crédits.
  await page.evaluate(() => { const P = window.pollen; P.state.credits = 251; P.player.x = P.BENCH.x - 1.8; P.player.z = P.BENCH.z + 0.6; });
  check(await until(page, () => window.pollen.objective && window.pollen.objective.kind === 'bench', null, 20000), 'avec 250 crédits, le marqueur pointe vers l’établi');
  check(await until(page, () => window.pollen.target && window.pollen.target.kind === 'buy', null, 20000), 'à l’établi, l’action propose le pinceau');
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  const bought = await page.evaluate(() => ({ tool: window.pollen.state.tool, max: window.pollen.TOOLS[window.pollen.state.tool], c: window.pollen.state.credits }));
  check(bought.tool === 1 && bought.max.doses === 8 && bought.max.basket === 20 && bought.c === 1, 'pinceau acheté : 8 fleurs par charge, panier de 20');
  await snap(page, '6-pinceau');

  // Endurance : la course vide la jauge.
  await page.evaluate(() => { const P = window.pollen; P.player.x = 8; P.player.z = -2; P.state.stamina = 1; });
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW'); await page.waitForTimeout(4000);
  const st = await page.evaluate(() => window.pollen.state.stamina);
  await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft');
  check(st < 0.99, `courir vide l'endurance (${st.toFixed(2)})`);
  const saved = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('pollen-v3')); } catch { return null; } });
  check(saved && saved.tool === 1, 'la sauvegarde contient le pinceau');
  check(errors.length === 0, `aucune erreur PC${errors.length ? ' : ' + errors.join(' | ') : ''}`);
  await ctx.close();

  // ---------- Téléphone ----------
  const m = await open({ ...devices['iPhone 13 landscape'] });
  check(await m.page.isVisible('#act'), 'mobile : bouton d’action affiché');
  check(await m.page.isHidden('#rotate'), 'mobile paysage : pas d’écran « tourne ton téléphone »');
  await snap(m.page, '7-mobile');
  const cdp = await m.ctx.newCDPSession(m.page);
  const vp = m.page.viewportSize();
  const L0 = { x: 140, y: vp.height - 110 }, R0 = { x: vp.width - 300, y: vp.height - 80 };
  const b0 = await m.page.evaluate(() => ({ x: window.pollen.player.x, z: window.pollen.player.z, yaw: window.pollen.cam.yaw }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: L0.x, y: L0.y, id: 1 }, { x: R0.x, y: R0.y, id: 2 }] });
  for (let k = 1; k <= 6; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: L0.x, y: L0.y - 10 * k, id: 1 }, { x: R0.x + 8 * k, y: R0.y, id: 2 }] }); await m.page.waitForTimeout(40); }
  await m.page.waitForTimeout(2500);
  const b1 = await m.page.evaluate(() => ({ x: window.pollen.player.x, z: window.pollen.player.z, yaw: window.pollen.cam.yaw }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check(Math.hypot(b1.x - b0.x, b1.z - b0.z) > 0.5, `joystick gauche : le personnage avance (${Math.hypot(b1.x - b0.x, b1.z - b0.z).toFixed(1)} m)`);
  check(Math.abs(b1.yaw - b0.yaw) > 0.1, `joystick droit en même temps : la caméra tourne (${(b1.yaw - b0.yaw).toFixed(2)} rad)`);
  check(m.errors.length === 0, `aucune erreur mobile${m.errors.length ? ' : ' + m.errors.join(' | ') : ''}`);
  await m.ctx.close();
  const pt = await open({ ...devices['iPhone 13'] });
  check(await pt.page.isVisible('#rotate'), 'mobile portrait : « tourne ton téléphone » et pause');
  await pt.ctx.close();
} finally {
  await browser.close();
  server.close();
}
if (fails.length) { console.log(`\n${fails.length} échec(s)`); process.exit(1); }
console.log('\nTout passe.');
