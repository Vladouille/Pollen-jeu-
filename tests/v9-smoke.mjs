// Test de la v9, étape 1 (décor et charte) : la page se charge sans erreur sur ordinateur et téléphone,
// le terrain hexagonal a ses tuiles sèches et vertes, le collecteur est construit selon la charte :
// aucune boîte à arêtes vives, quatre couleurs de matériel seulement, socle étagé avec bande lumineuse.
// Lancer : node tests/v9-smoke.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const three = await readFile(join(root, 'vendor', 'three.module.min.js')), html = await readFile(join(root, 'v9', 'index.html'));
const fails = []; const check = (ok, l) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${l}`); if (!ok) fails.push(l); };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const srv = createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(0);
try {
  for (const [cible, opts] of [['pc', { viewport: { width: 640, height: 360 } }], ['mobile', { viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true }]]) {
    const ctx = await browser.newContext(opts);
    await ctx.route('https://cdn.jsdelivr.net/**', async (r) => { const m = r.request().url().match(/examples\/jsm\/(.*)$/); if (m) return r.fulfill({ body: await readFile(join(root, 'vendor', 'jsm', m[1])), contentType: 'text/javascript' }); return r.fulfill({ body: three, contentType: 'text/javascript' }); });
    const page = await ctx.newPage(), erreurs = [];
    page.on('pageerror', (e) => erreurs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erreurs.push(m.text().slice(0, 200)); });
    await page.goto(`http://localhost:${srv.address().port}/`);
    await page.waitForFunction(() => window.pollen, null, { timeout: 120000 }); await page.waitForTimeout(3000);
    const r = await page.evaluate(() => {
      const P = window.pollen, C = P.CHARTE, admis = [C.blanc, C.graphite, C.pollen, 0xffffff, 0x000000, 0x0d0f11].map((c) => c);
      let brutes = 0, arrondies = 0, couleurs = new Set(), emissifs = new Set(), dansScene = !!P.COLLECTEUR.parent;
      P.scene.traverse((o) => { if (o.geometry && o.geometry.type === 'BoxGeometry') brutes++; });
      P.COLLECTEUR.traverse((o) => { if (!o.isMesh) return; if (o.geometry.type === 'RoundedBoxGeometry') arrondies++; for (const m of [].concat(o.material)) { couleurs.add(m.color.getHex()); if (m.emissiveIntensity > 1 && m.emissive.getHex() !== 0xffffff) emissifs.add(m.emissive.getHex()); } });
      const hors = [...couleurs].filter((c) => !admis.includes(c));
      return { nom: P.Q.nom, nt: P.NT, vertes: P.T.vert.reduce((s, v) => s + v, 0), brutes, arrondies, hors, emissifs: [...emissifs], seve: C.seve, dansScene };
    });
    check(r.nom === cible, `${cible} : appareil détecté « ${r.nom} »`);
    check(r.nt > 4000 && r.vertes > r.nt * 0.35 && r.vertes < r.nt * 0.65, `${cible} : ${r.nt} tuiles, ${r.vertes} vertes`);
    check(r.dansScene && r.brutes === 0 && r.arrondies >= 15, `${cible} : collecteur en scène, ${r.arrondies} pièces chanfreinées, aucune boîte à arêtes vives`);
    check(r.hors.length === 0 && r.emissifs.length === 1 && r.emissifs[0] === r.seve, `${cible} : matériel en blanc, graphite, jaune pollen et vert sève lumineux uniquement`);
    const shot = await page.screenshot({ timeout: 240000 });
    check(shot.length > 30000, `${cible} : l'image n'est pas vide (${(shot.length / 1024).toFixed(0)} Ko)`);
    check(erreurs.length === 0, `${cible} : console vide${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
    await ctx.close();
  }
} finally { await browser.close(); srv.close(); }
if (fails.length) { console.log(`\n${fails.length} échec(s)`); process.exit(1); }
console.log('\nTout passe.');
