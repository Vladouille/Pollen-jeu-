// Test de la v12, brique 1 (le socle) : planète pavée, gravité vers le centre, caméra lissée, ombre du joueur, ciel,
// sol à grain, deux pouces en même temps sur téléphone. Lancer : node tests/v12-smoke.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const three = await readFile(join(root, 'vendor', 'three.module.min.js')), html = await readFile(join(root, 'v12', 'index.html'));
const fails = []; const check = (ok, l) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${l}`); if (!ok) fails.push(l); };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const srv = createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(0);
async function ouvrir(opts, q) {
  const ctx = await browser.newContext(opts);
  await ctx.route('https://cdn.jsdelivr.net/**', async (r) => r.fulfill({ body: three, contentType: 'text/javascript' }));
  const page = await ctx.newPage(), erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erreurs.push(m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${srv.address().port}/${q}`, { timeout: 120000 });
  await page.waitForFunction(() => window.pollen, null, { timeout: 120000 }); await page.waitForTimeout(1500);
  return { ctx, page, erreurs };
}
try {
  const { ctx, page, erreurs } = await ouvrir({ viewport: { width: 640, height: 360 } }, '?mode=pc&fixe');
  const r = await page.evaluate(() => {
    const P = pollen, j = P.joueur, V3 = P.V3; P.figer = true; const p0 = j.p.clone(), h0 = j.haut.clone();
    let hmin = 1e9, hmax = -1e9; for (let k = 0; k < 3000; k++) { const d = new V3(Math.sin(k * 1.3), Math.cos(k * 0.7), Math.sin(k * 2.1 + 1)).normalize(); const h = P.sol(d) - P.RP; hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); }
    const penta = [0, 1, 2, 3].map((k) => P.GROS.voisinsDe(P.GROS.tuileDe(P.ICO.sommets[k])).length), hexa = P.GROS.voisinsDe(P.GROS.tuileDe(new V3(0.3, 0.5, 0.81).normalize())).length;
    P.E.mz = 1; P.step(0.05, 200); P.E.mz = 0; P.step(0.05, 20);
    const colle = Math.abs(j.p.length() - P.sol(j.p.clone().normalize())), ang = h0.angleTo(j.haut) * 57.3, marche = p0.distanceTo(j.p);
    j.pitch = 0; P.step(0.05, 30); const camUp = new V3(0, 1, 0).applyQuaternion(P.camera.quaternion).angleTo(j.haut), oeil = P.camera.position.distanceTo(j.p);
    P.E.dYaw = 1.2; P.step(0.016, 1); const f1 = new V3(0, 0, -1).applyQuaternion(P.camera.quaternion); P.step(0.016, 40); const f2 = new V3(0, 0, -1).applyQuaternion(P.camera.quaternion);
    let ombre = 0, visibles = 0; P.corps.traverse((o) => { if (o.isMesh) { if (o.castShadow) ombre++; if (o.material.colorWrite) visibles++; } });
    for (let a = 0; a < 6.3; a += 0.02) { P.JOUR.angle = a; P.placerSoleil(); if (j.haut.dot(P.SOLEIL) < -0.5) break; } P.step(0.05, 2); const nuit = P.sun.intensity;
    const a0 = P.JOUR.angle; P.step(0.05, 20); const tourne = P.JOUR.angle > a0;
    for (let a = 0; a < 6.3; a += 0.02) { P.JOUR.angle = a; P.placerSoleil(); if (j.haut.dot(P.SOLEIL) > 0.8) break; } P.step(0.05, 2);
    return { nt: P.NT, hmin, hmax, penta, hexa, colle, ang, marche, camUp, oeil, apres1: f1.angleTo(f2) * 57.3, ombre, visibles, nuit, jour: P.sun.intensity, hemi: P.hemi.intensity, tourne, expo: P.renderer.toneMappingExposure, ace: P.renderer.toneMapping, fov: P.camera.fov, grain: !!P.M_SOL.map && !!P.M_SOL.normalMap, ombresDouces: P.renderer.shadowMap.type, soleilOmbre: P.sun.castShadow };
  });
  check(r.nt === 40962 && r.penta.every((n) => n === 5) && r.hexa === 6, `planète pavée : ${r.nt} tuiles, douze pentagones à 5 voisines, hexagones à 6`);
  check(r.hmin > -2.5 && r.hmax < 2.5, `relief très léger (${r.hmin.toFixed(1)} à ${r.hmax.toFixed(1)} m)`);
  check(r.colle < 0.01 && r.ang > 3 && r.marche > 30, `gravité vers le centre : ${r.marche.toFixed(0)} m parcourus, verticale tournée de ${r.ang.toFixed(1)}°, pieds au sol`);
  check(r.camUp < 0.01 && Math.abs(r.oeil - 1.7) < 0.06 && r.fov === 70, `caméra alignée sur la verticale locale, œil à ${r.oeil.toFixed(2)} m, champ 70°`);
  check(r.apres1 > 30, `un coup de souris brutal : la caméra le rejoint en douceur (${r.apres1.toFixed(0)}° encore à faire après une image)`);
  check(r.ombre >= 6 && r.visibles === 0 && r.soleilOmbre && r.ombresDouces === 2, 'aucun modèle de personnage, mais un corps qui projette son ombre (ombres douces)');
  check(r.jour === 2.5 && r.hemi === 0.5 && r.nuit < 0.05 && r.tourne, 'soleil à 2,5 qui tourne autour de la planète (nuit sans soleil), hémisphère à 0,5');
  check(r.expo === 1.1 && r.ace === 4 && r.grain, 'ACES, exposition 1,1 ; sol à grain peint et carte de normales');
  check(erreurs.length === 0, `pc : console sans erreur${erreurs.length ? ' : ' + erreurs.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
  const m = await ouvrir({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true }, '?mode=mobile&fixe');
  const c = await m.ctx.newCDPSession(m.page), pt = (x, y, id) => ({ x, y, id, radiusX: 5, radiusY: 5, force: 1 });
  const avant = await m.page.evaluate(() => ({ p: pollen.joueur.p.toArray(), f: pollen.joueur.f.toArray() }));
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(150, 280, 1), pt(600, 200, 2)] });
  for (let k = 1; k <= 15; k++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(150, 280 - k * 4, 1), pt(600 + k * 6, 200, 2)] }); await m.page.waitForTimeout(120); }
  await m.page.waitForTimeout(1500);
  const apres = await m.page.evaluate(() => ({ p: pollen.joueur.p.toArray(), f: pollen.joueur.f.toArray() }));
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const d = Math.hypot(...avant.p.map((v, i) => v - apres.p[i])), a = Math.acos(Math.min(1, avant.f.reduce((s, v, i) => s + v * apres.f[i], 0))) * 57.3;
  check(d > 3 && a > 10, `téléphone : les deux pouces en même temps (${d.toFixed(1)} m de marche et ${a.toFixed(0)}° de rotation)`);
  check(m.erreurs.length === 0, `mobile : console sans erreur${m.erreurs.length ? ' : ' + m.erreurs.slice(0, 3).join(' | ') : ''}`);
  await m.ctx.close();
} catch (e) { console.log('ERREUR DU TEST :', e.message); fails.push(e.message); }
await browser.close(); srv.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nv12 : tout passe');
process.exit(fails.length ? 1 : 0);
