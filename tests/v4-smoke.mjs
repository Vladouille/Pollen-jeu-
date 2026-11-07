// Test de fumée de la v4 dans Chromium : grille, première personne, pollinisation, boucle économique, tactile.
// Lancer : node tests/v4-smoke.mjs   (Three.js est servi depuis vendor/ à la place du CDN)
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = process.env.SHOTS || join(root, 'tests', 'captures');
const server = createServer(async (req, res) => { try { res.writeHead(200, { 'content-type': 'text/html' }); res.end(await readFile(join(root, 'v4', 'index.html'))); } catch { res.writeHead(404).end(); } }).listen(0);
const url = `http://localhost:${server.address().port}/`;
const three = await readFile(join(root, 'vendor', 'three.module.min.js'));
const fails = [];
const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) fails.push(label); };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function open(ctxOpts, query = '?debug&neuf&rayon=12') {
  const ctx = await browser.newContext(ctxOpts);
  await ctx.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ body: three, contentType: 'text/javascript' }));
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)));
  await page.goto(url + query);
  await page.waitForFunction(() => window.pollen, null, { timeout: 90000 });
  await page.waitForTimeout(2000);
  return { ctx, page, errors };
}
const snap = (page, name) => page.screenshot({ path: join(shots, `v4-${name}.png`), timeout: 180000 });
const until = (page, fn, arg, ms = 60000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false);
const boxes = (page) => page.evaluate(() => { let n = 0; window.pollen.scene.traverse((o) => { if (o.geometry && o.geometry.type === 'BoxGeometry') n++; }); return n; });
const label = (page) => page.evaluate(() => document.getElementById('label').textContent);

try {
  // ---------- Étape 1 : la grille ----------
  {
    const g = await open({ viewport: { width: 1280, height: 720 } }, '?scene=grille');
    const n = await g.page.evaluate(() => ({ tiles: window.pollen.tiles.q.length, bloomed: window.pollen.tiles.bloom.filter(Boolean).length, flowers: window.pollen.flowers() }));
    check(n.tiles > 7000 && n.tiles < 9000, `vallée de ${n.tiles} tuiles hexagonales`);
    check(n.bloomed > n.tiles * 0.3 && n.bloomed < n.tiles * 0.7, `moitié fleurie (${n.bloomed}), moitié fanée`);
    check(n.flowers > 15000, `${n.flowers} fleurs instanciées autour de la caméra`);
    check((await boxes(g.page)) === 0, 'aucune BoxGeometry');
    check(g.errors.length === 0, `aucune erreur (grille)${g.errors.length ? ' : ' + g.errors.join(' | ') : ''}`);
    await g.ctx.close();
  }

  // ---------- PC ----------
  const { ctx, page, errors } = await open({ viewport: { width: 1280, height: 720 } });
  check((await boxes(page)) === 0, 'aucune BoxGeometry dans la base');
  await until(page, () => /Polliniser/.test(document.getElementById('label').textContent), null, 20000);
  check(/Polliniser/.test(await label(page)), `au départ, le réticule vise une tuile fanée : « ${await label(page)} »`);
  // Déplacement et regard.
  const p0 = await page.evaluate(() => ({ ...window.pollen.player }));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(3000); await page.keyboard.up('KeyW');
  const p1 = await page.evaluate(() => ({ ...window.pollen.player }));
  check(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.3, `Z/W : on avance (${Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(1)} m)`);
  // Pollinisation : maintien, jauge, floraison, réservoir.
  const tile = await page.evaluate(() => { const P = window.pollen, a = P.aim; return a && a.kind === 'tile' ? a.i : -1; });
  check(tile >= 0, 'une tuile est visée');
  const bees0 = await page.evaluate(() => window.pollen.bees());
  await page.keyboard.down('Space');
  check(await until(page, () => window.pollen.gauge.p > 0.15, null, 60000), 'maintenir : la jauge circulaire se remplit');
  await snap(page, '1-jauge');
  check(await until(page, (i) => window.pollen.tiles.bloom[i] === 1, tile, 120000), 'jauge pleine : la tuile fleurit');
  await page.keyboard.up('Space');
  const after = await page.evaluate(() => ({ tank: window.pollen.state.tank }));
  check(after.tank === 1, `le pollen s'ajoute au réservoir (${after.tank})`);
  await page.waitForTimeout(1500);
  await snap(page, '2-floraison');
  check((await page.evaluate(() => window.pollen.bees())) > bees0, 'des abeilles arrivent sur la tuile');
  // Réservoir plein : on ne pollinise plus.
  await page.evaluate(() => { const P = window.pollen; P.state.tank = 12; P.player.pitch = -0.5; P.player.yaw += 0.6; });
  await until(page, () => /Réservoir plein/.test(document.getElementById('label').textContent), null, 20000);
  check(/Réservoir plein/.test(await label(page)), 'réservoir plein : le réticule le dit');
  // Comptoir : vider puis vendre.
  const goTo = (x, z, tx, ty, tz) => page.evaluate(([x, z, tx, ty, tz]) => { const P = window.pollen; P.player.x = x; P.player.z = z; P.lookAt(tx, ty, tz); }, [x, z, tx, ty, tz]);
  const B = await page.evaluate(() => window.pollen.BASE);
  const cy = await page.evaluate(([x, z]) => window.pollen.H(x, z) + 1.1, [B.counter.x, B.counter.z]);
  await goTo(B.counter.x - 2.6, B.counter.z + 1.2, B.counter.x, cy, B.counter.z);
  check(await until(page, () => /Vider 12 pollen/.test(document.getElementById('label').textContent), null, 20000), `au comptoir : « ${await label(page)} »`);
  await page.keyboard.press('KeyE');
  await until(page, () => /Vendre : 12 crédits/.test(document.getElementById('label').textContent), null, 20000);
  check(/Vendre : 12 crédits/.test(await label(page)), `puis « ${await label(page)} »`);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);
  check((await page.evaluate(() => window.pollen.state.credits)) === 12, 'vente : 12 crédits');
  // Hangar : acheter une ruchette, la poser.
  await page.evaluate(() => { window.pollen.state.credits = 340; });
  const hy = await page.evaluate(([x, z]) => window.pollen.H(x, z) + 1.3, [B.hangar.x, B.hangar.z]);
  await goTo(B.hangar.x + 2.2, B.hangar.z + 2.6, B.hangar.x, hy, B.hangar.z);
  check(await until(page, () => /Ouvrir/.test(document.getElementById('label').textContent), null, 20000), `au hangar : « ${await label(page)} »`);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(300);
  check(await page.isVisible('#panel'), 'E ouvre le panneau du hangar');
  await snap(page, '3-hangar');
  const locked = await page.evaluate(() => document.querySelectorAll('#panelList li.locked').length);
  check(locked === 4, `les outils pas encore accessibles sont visibles (${locked})`);
  await page.click('button[data-ruchette]');
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.pollen.state.carrying)) && (await page.isHidden('#panel')), 'ruchette achetée, en main');
  await goTo(0, 14, 0, await page.evaluate(() => window.pollen.H(0, 17.5)), 17.5);
  check(await until(page, () => window.pollen.placeOk, null, 20000), 'aperçu de la ruchette : emplacement valide');
  await page.evaluate(() => window.pollen.tryPlace());
  await page.waitForTimeout(300);
  const nr = await page.evaluate(() => window.pollen.ruchettes.length);
  check(nr === 1, 'la ruchette est posée au sol');
  // Vider dans la ruchette : le contenu part seul vers la base.
  await page.evaluate(() => { window.pollen.state.tank = 10; });
  const r = await page.evaluate(() => { const r = window.pollen.ruchettes[0]; return { x: r.x, y: r.y + 0.5, z: r.z }; });
  await goTo(r.x, r.z - 2, r.x, r.y, r.z);
  check(await until(page, () => /Vider 10 pollen/.test(document.getElementById('label').textContent), null, 20000), `devant la ruchette : « ${await label(page)} »`);
  const stock0 = await page.evaluate(() => window.pollen.state.stock);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(300);
  await snap(page, '4-ruchette');
  check(await until(page, (s0) => window.pollen.state.stock > s0 + 0.5, stock0, 60000), 'la ruchette envoie le pollen vers la base');
  // Pinceau.
  await goTo(B.hangar.x + 2.2, B.hangar.z + 2.6, B.hangar.x, hy, B.hangar.z);
  await until(page, () => /Ouvrir/.test(document.getElementById('label').textContent), null, 20000);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(300);
  await page.click('button[data-buy="1"]');
  await page.waitForTimeout(300);
  const t = await page.evaluate(() => ({ tool: window.pollen.state.tool, cap: window.pollen.TOOLS[window.pollen.state.tool].tank }));
  check(t.tool === 1 && t.cap === 30, 'pinceau acheté : 1 s par tuile, réservoir de 30');
  await page.evaluate(() => { const P = window.pollen; P.player.x = 0; P.player.z = 10; P.player.yaw = Math.PI; P.player.pitch = -0.6; });
  await page.waitForTimeout(1500);
  await snap(page, '5-pinceau');
  // Sauvegarde.
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const saved = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('pollen-v4')); } catch { return null; } });
  check(saved && saved.tool === 1 && saved.ruchettes.length === 1 && /[1-9a-o]/.test(saved.bloom), 'la sauvegarde contient outil, ruchette et tuiles fleuries');
  check(errors.length === 0, `aucune erreur PC${errors.length ? ' : ' + errors.join(' | ') : ''}`);
  await ctx.close();

  // ---------- Téléphone ----------
  const m = await open({ ...devices['iPhone 13 landscape'] });
  check(await m.page.isVisible('#act'), 'mobile : bouton Polliniser affiché');
  await snap(m.page, '6-mobile');
  const cdp = await m.ctx.newCDPSession(m.page);
  const vp = m.page.viewportSize();
  const L0 = { x: 140, y: vp.height - 110 }, R0 = { x: vp.width - 320, y: 120 };
  const b0 = await m.page.evaluate(() => ({ x: window.pollen.player.x, z: window.pollen.player.z, yaw: window.pollen.player.yaw }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: L0.x, y: L0.y, id: 1 }, { x: R0.x, y: R0.y, id: 2 }] });
  for (let k = 1; k <= 8; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: L0.x, y: L0.y - 9 * k, id: 1 }, { x: R0.x + 10 * k, y: R0.y, id: 2 }] }); await m.page.waitForTimeout(40); }
  await m.page.waitForTimeout(2500);
  const b1 = await m.page.evaluate(() => ({ x: window.pollen.player.x, z: window.pollen.player.z, yaw: window.pollen.player.yaw }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check(Math.hypot(b1.x - b0.x, b1.z - b0.z) > 0.3, `joystick gauche : on avance (${Math.hypot(b1.x - b0.x, b1.z - b0.z).toFixed(1)} m)`);
  check(Math.abs(b1.yaw - b0.yaw) > 0.2, `pouce droit en même temps : le regard tourne (${(b1.yaw - b0.yaw).toFixed(2)} rad)`);
  check(m.errors.length === 0, `aucune erreur mobile${m.errors.length ? ' : ' + m.errors.join(' | ') : ''}`);
  await m.ctx.close();
  const pt = await open({ ...devices['iPhone 13'] });
  check(await pt.page.isVisible('#rotate'), 'mobile portrait : « tourne ton téléphone » et pause');
  await pt.ctx.close();
} finally { await browser.close(); server.close(); }
if (fails.length) { console.log(`\n${fails.length} échec(s)`); process.exit(1); }
console.log('\nTout passe.');
