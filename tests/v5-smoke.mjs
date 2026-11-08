// Test de fumée de la v5 (étape 1) : les deux fichiers se chargent sans erreur et montrent la grille.
// Lancer : node v5/construire.mjs && node tests/v5-smoke.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const three = await readFile(join(root, 'vendor', 'three.module.min.js'));
const fails = [];
const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) fails.push(label); };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const cible of ['pc', 'mobile']) {
    const html = await readFile(join(root, 'v5', `pollen-${cible}.html`), 'utf8');
    const server = createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(0);
    const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
    await ctx.route('https://cdn.jsdelivr.net/**', async (r) => { const m = r.request().url().match(/examples\/jsm\/(.*)$/); if (m) return r.fulfill({ body: await readFile(join(root, 'vendor', 'jsm', m[1])), contentType: 'text/javascript' }); return r.fulfill({ body: three, contentType: 'text/javascript' }); });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
    await page.goto(`http://localhost:${server.address().port}/?herbe=5000&rayon=12`);
    await page.waitForFunction(() => window.pollen, null, { timeout: 120000 });
    await page.waitForTimeout(4000);
    const r = await page.evaluate(() => { const P = window.pollen; let boxes = 0; P.scene.traverse((o) => { if (o.geometry && o.geometry.type === 'BoxGeometry') boxes++; }); return { nom: P.Q.nom, tiles: P.T.q.length, bloomed: P.T.bloom.reduce((s, b) => s + b, 0), flowers: P.flowers(), boxes, ombres: P.Q.ombres, post: P.Q.postComplet }; });
    check(r.nom === cible, `${cible} : configuration « ${r.nom} » (ombres ${r.ombres}, post complet ${r.post})`);
    check(r.tiles > 15000 && r.bloomed > r.tiles * 0.3 && r.bloomed < r.tiles * 0.7, `${cible} : ${r.tiles} tuiles, ${r.bloomed} fleuries`);
    check(r.flowers > 1000, `${cible} : ${r.flowers} fleurs instanciées`);
    check(r.boxes === 0, `${cible} : aucune BoxGeometry`);
    const shot = await page.screenshot({ timeout: 240000 });
    check(shot.length > 20000, `${cible} : l'image n'est pas noire (${(shot.length / 1024).toFixed(0)} Ko)`);
    check(errors.length === 0, `${cible} : aucune erreur${errors.length ? ' : ' + errors.join(' | ') : ''}`);
    await ctx.close(); server.close();
  }
} finally { await browser.close(); }
if (fails.length) { console.log(`\n${fails.length} échec(s)`); process.exit(1); }
console.log('\nTout passe.');
