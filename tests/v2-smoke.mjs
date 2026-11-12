// Test de fumée de la v2 dans Chromium : rendu, déplacement, boucle, tactile.
// Lancer : node tests/v2-smoke.mjs   (Three.js est servi depuis vendor/ à la place du CDN)
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const shots = process.env.SHOTS || join(root, 'tests', 'captures');
const server = createServer(async (req, res) => {
  try { res.writeHead(200, { 'content-type': 'text/html' }); res.end(await readFile(join(root, 'v2', 'index.html'))); } catch { res.writeHead(404).end(); }
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
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url + query);
  await page.waitForFunction(() => window.pollen, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  return { ctx, page, errors };
}
const snap = (page, name) => page.screenshot({ path: join(shots, `v2-${name}.png`), timeout: 120000 });

try {
  // ---------- PC ----------
  const { ctx, page, errors } = await open({ viewport: { width: 1280, height: 720 } });
  await snap(page, '1-arrivee');
  const p0 = await page.evaluate(() => ({ ...window.pollen.player }));
  await page.keyboard.down('KeyW'); await page.waitForTimeout(4000); await page.keyboard.up('KeyW');
  const p1 = await page.evaluate(() => ({ ...window.pollen.player }));
  check(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 1.0, `ZQSD/WASD : le personnage marche (${Math.hypot(p1.x - p0.x, p1.z - p0.z).toFixed(1)} m)`);
  check(Math.abs(p1.y - (await page.evaluate(({ x, z }) => window.pollen.H(x, z), p1))) < 0.2, 'le personnage suit le relief');
  await snap(page, '2-marche');

  // Aller à la fleur surlignée et agir.
  await page.evaluate(() => {
    const P = window.pollen, i = P.hintFlower();
    const x = P.F.pos[i * 3], z = P.F.pos[i * 3 + 2], nx = P.F.nrm[i * 3], nz = P.F.nrm[i * 3 + 2], d = Math.hypot(nx, nz) || 1;
    P.player.x = x + (nx / d) * 1.3; P.player.z = z + (nz / d) * 1.3; P.player.face = Math.atan2(-nx, -nz);
    P.cam.yaw = Math.atan2(nx, nz);
  });
  await page.waitForFunction(() => window.pollen.target && window.pollen.target.kind === 'flower', null, { timeout: 15000 }).catch(() => {});
  const tgt = await page.evaluate(() => window.pollen.target);
  check(tgt && tgt.kind === 'flower', 'une fleur ouverte à portée est ciblée');
  await snap(page, '3-cible');
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  check((await page.evaluate(() => window.pollen.state.doses)) === 2, 'Espace : la tige prend le pollen (2 doses)');
  const idle = () => page.waitForFunction(() => window.pollen.player.act <= 0, null, { timeout: 60000 });
  await idle();
  // On agit et on lit la cible dans le même tour, pour qu'elle ne change pas entre les deux.
  const t2 = await page.evaluate(() => { const t = window.pollen.target; window.pollen.doAction(); return t; });
  check(t2 && t2.kind === 'flower', 'une deuxième fleur est ciblée');
  await page.waitForTimeout(150);
  const st = await page.evaluate((i) => ({ s: window.pollen.F.state[i], d: window.pollen.state.doses }), t2.i);
  check(st.s === 2 && st.d === 1, 'la fleur est pollinisée, une dose consommée');
  await snap(page, '4-pollinisation');

  // Pousse accélérée, secousse, ramassage, vente.
  await page.evaluate((i) => { const P = window.pollen; P.F.growth[i] = 0.999; P.simulate(1); }, t2.i);
  await page.waitForTimeout(500);
  await snap(page, '5-pomme-mure');
  await page.waitForFunction(() => window.pollen.target && window.pollen.target.kind === 'tree', null, { timeout: 15000 }).catch(() => {});
  const tt = await page.evaluate(() => window.pollen.target);
  check(tt && tt.kind === 'tree', `l'arbre mûr devient la cible (${tt && tt.kind})`);
  await idle();
  await page.keyboard.press('Space');
  await page.waitForTimeout(1500);
  await page.waitForFunction(() => window.pollen.fruits.every((f) => f.rest), null, { timeout: 60000 });
  const n = await page.evaluate(() => window.pollen.fruits.length + window.pollen.state.pockets);
  check(n >= 1, `secouer fait tomber ${n} pomme(s)`);
  await snap(page, '6-secousse');
  for (let k = 0; k < 15; k++) {
    const left = await page.evaluate(() => { const P = window.pollen, f = P.fruits[0]; if (!f) return 0; P.player.x = f.x + 0.5; P.player.z = f.z; return P.fruits.length; });
    if (!left) break;
    await page.waitForTimeout(120);
  }
  const pockets = await page.evaluate(() => window.pollen.state.pockets);
  check(pockets >= 1, `les pommes vont dans les poches (${pockets})`);
  await page.evaluate(() => { const P = window.pollen; P.player.x = P.MARKET.x - 3; P.player.z = P.MARKET.z; P.cam.yaw = -Math.PI / 2; });
  await page.waitForTimeout(500);
  await snap(page, '7-marche');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);
  const cr = await page.evaluate(() => window.pollen.state.credits);
  check(cr === pockets * 3, `E vend la récolte : ${cr} crédits`);

  // Achat de la parcelle voisine.
  await page.evaluate(() => { const P = window.pollen; P.state.credits = 200; P.player.x = P.SIGN.x - 2; P.player.z = P.SIGN.z; P.cam.yaw = -Math.PI / 2 - 0.4; P.cam.pitch = 0.45; P.cam.dist = 6; });
  await page.waitForTimeout(500);
  await snap(page, '8-a-vendre');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(1200);
  await snap(page, '9-achat-en-cours');
  await page.waitForTimeout(2500);
  const owned = await page.evaluate(() => window.pollen.PLOTS[1].owned);
  check(owned, 'E achète la parcelle : clôture tombée, brume levée');
  await snap(page, '10-parcelle-achetee');

  // Lumière : lever et coucher du soleil, nuit.
  for (const [t, name] of [[0.262, '11-lever'], [0.5, '12-midi'], [0.742, '13-coucher'], [0.9, '14-nuit']]) {
    await page.evaluate((t) => { const P = window.pollen; P.dayT = t; P.player.x = 0; P.player.z = 21; P.cam.yaw = 0; P.cam.pitch = 0.18; P.cam.dist = 5; }, t);
    await page.waitForTimeout(700);
    await snap(page, name);
  }
  const saved = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('pollen-v2')); } catch { return null; } });
  check(saved && saved.owned.includes(1), 'la sauvegarde contient la parcelle achetée');
  console.log('info', await page.evaluate(() => document.getElementById('debug').textContent.split('\n')[0]));
  check(errors.length === 0, `aucune erreur PC${errors.length ? ' : ' + errors.join(' | ') : ''}`);
  await ctx.close();

  // ---------- Téléphone ----------
  const phone = devices['iPhone 13 landscape'];
  const m = await open({ ...phone });
  await snap(m.page, '15-mobile');
  check(await m.page.isVisible('#act'), 'mobile : le bouton Agir est affiché');
  check(await m.page.isHidden('#rotate'), 'mobile paysage : pas d’écran « tourne ton téléphone »');
  // Deux pouces en même temps : joystick gauche vers le haut, droit vers la droite.
  const cdp = await m.ctx.newCDPSession(m.page);
  const vp = m.page.viewportSize();
  const L0 = { x: 140, y: vp.height - 110 }, R0 = { x: vp.width - 260, y: vp.height - 90 };
  const before = await m.page.evaluate(() => ({ x: window.pollen.player.x, z: window.pollen.player.z, yaw: window.pollen.cam.yaw }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: L0.x, y: L0.y, id: 1 }, { x: R0.x, y: R0.y, id: 2 }] });
  for (let k = 1; k <= 6; k++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: L0.x, y: L0.y - 10 * k, id: 1 }, { x: R0.x + 8 * k, y: R0.y, id: 2 }] });
    await m.page.waitForTimeout(40);
  }
  await m.page.waitForTimeout(150);
  await snap(m.page, '16-mobile-joysticks');
  await m.page.waitForTimeout(900);
  const after = await m.page.evaluate(() => ({ x: window.pollen.player.x, z: window.pollen.player.z, yaw: window.pollen.cam.yaw }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check(Math.hypot(after.x - before.x, after.z - before.z) > 1, `joystick gauche : le personnage avance (${Math.hypot(after.x - before.x, after.z - before.z).toFixed(1)} m)`);
  check(Math.abs(after.yaw - before.yaw) > 0.2, `joystick droit en même temps : la caméra tourne (${(after.yaw - before.yaw).toFixed(2)} rad)`);
  check(m.errors.length === 0, `aucune erreur mobile${m.errors.length ? ' : ' + m.errors.join(' | ') : ''}`);
  await m.ctx.close();

  const portrait = await open({ ...devices['iPhone 13'] });
  check(await portrait.page.isVisible('#rotate'), 'mobile portrait : écran « tourne ton téléphone » et pause');
  await snap(portrait.page, '17-portrait');
  await portrait.ctx.close();
} finally {
  await browser.close();
  server.close();
}
if (fails.length) { console.log(`\n${fails.length} échec(s)`); process.exit(1); }
console.log('\nTout passe.');
