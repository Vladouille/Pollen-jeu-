// Test de fumée de la v5 (étapes 1 et 2).
// Étape 1 : les deux fichiers se chargent sans erreur et montrent la grille.
// Étape 2 : le joueur. PC : ZQSD, Maj, souris, molette, 1-6, M. Mobile : deux pouces en même
// temps (joystick + regard) via de vraies touches tactiles CDP, écran « tourne ton téléphone » en portrait.
// Communs : collision avec les rochers, relief suivi, bord de la carte, mains dans la caméra.
// Le rendu logiciel tourne à ~1 img/s : on fait avancer la simulation avec pollen.step(dt, n).
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
const f2 = (v) => v.toFixed(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

// Remet le joueur à un endroit donné, immobile, et vide les entrées.
const placer = (page, x, z, yaw) => page.evaluate(([x, z, yaw]) => { const { player: p, H, E } = window.pollen; Object.assign(p, { x, z, y: H(x, z), yaw, pitch: 0, vx: 0, vz: 0 }); E.dYaw = E.dPitch = 0; }, [x, z, yaw]);
// Vérifications communes aux deux fichiers, à entrée forcée (le code de déplacement est partagé).
async function communs(page, cible) {
  // Collision : on fonce sur le premier rocher.
  const c = await page.evaluate(() => window.pollen.colliders[0]);
  await placer(page, c.x + c.r + 3, c.z, Math.PI / 2); // regard vers -x, droit sur le rocher
  const col = await page.evaluate(([cx, cz]) => { const P = window.pollen; P.E.mz = 1; P.E.mx = 0; P.E.course = false; let dmin = 1e9; for (let k = 0; k < 60; k++) { const s = P.step(0.05); dmin = Math.min(dmin, Math.hypot(s.x - cx, s.z - cz)); } P.E.mz = 0; return dmin; }, [c.x, c.z]);
  check(col >= c.r + 0.35 - 0.02, `${cible} : collision, on reste à ${f2(col)} m du centre d'un rocher de rayon ${f2(c.r)}`);
  // Relief suivi : les pieds collent au sol, l'œil à 1,65 m.
  await placer(page, 30, -40, 2.2);
  const rel = await page.evaluate(() => { const P = window.pollen; P.E.mz = 1; let err = 0, dy = 0; const y0 = P.player.y; for (let k = 0; k < 100; k++) { const s = P.step(0.05); err = Math.max(err, Math.abs(s.y - P.H(s.x, s.z))); } dy = P.player.y - y0; P.E.mz = 0; P.step(0.05, 20); return { err, dy, eye: P.camera.position.y - P.player.y }; });
  check(rel.err < 0.12 && Math.abs(rel.eye - 1.65) < 0.08, `${cible} : relief suivi (écart max ${f2(rel.err)} m, dénivelé ${f2(rel.dy)} m, œil à ${f2(rel.eye)} m)`);
  // Bord de la carte.
  await placer(page, 238, 0, -Math.PI / 2); // regard vers +x
  const bord = await page.evaluate(() => { const P = window.pollen; P.E.mz = 1; P.step(0.05, 80); P.E.mz = 0; return Math.hypot(P.player.x, P.player.z); });
  check(bord <= 244.01, `${cible} : bord de la carte respecté (${f2(bord)} m du centre)`);
  // Mains : dans la caméra, gauche plus basse et plus en retrait que la droite.
  const m = await page.evaluate(() => { const P = window.pollen; return { cam: P.handR.parent.parent === P.camera && P.handL.parent.parent === P.camera, r: P.handR.position.toArray(), l: P.handL.position.toArray() }; });
  check(m.cam && m.l[1] < m.r[1] && m.l[2] < m.r[2], `${cible} : mains gantées dans la caméra (droite y ${f2(m.r[1])} z ${f2(m.r[2])}, gauche y ${f2(m.l[1])} z ${f2(m.l[2])})`);
  await placer(page, 6.4, 4.8, 0.93);
}

try {
  for (const cible of ['pc', 'mobile']) {
    const html = await readFile(join(root, 'v5', `pollen-${cible}.html`), 'utf8');
    const server = createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(0);
    const ctx = await browser.newContext(cible === 'pc' ? { viewport: { width: 640, height: 360 } } : { viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true });
    await ctx.route('https://cdn.jsdelivr.net/**', async (r) => { const m = r.request().url().match(/examples\/jsm\/(.*)$/); if (m) return r.fulfill({ body: await readFile(join(root, 'vendor', 'jsm', m[1])), contentType: 'text/javascript' }); return r.fulfill({ body: three, contentType: 'text/javascript' }); });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
    await page.goto(`http://localhost:${server.address().port}/?herbe=5000&rayon=12`);
    await page.waitForFunction(() => window.pollen, null, { timeout: 120000 });
    await page.waitForTimeout(4000);

    // --- Étape 1 : la vallée ---
    const r = await page.evaluate(() => { const P = window.pollen; let boxes = 0; P.scene.traverse((o) => { if (o.geometry && o.geometry.type === 'BoxGeometry') boxes++; }); return { nom: P.Q.nom, tiles: P.T.q.length, bloomed: P.T.bloom.reduce((s, b) => s + b, 0), flowers: P.flowers(), boxes, ombres: P.Q.ombres, post: P.Q.postComplet }; });
    check(r.nom === cible, `${cible} : configuration « ${r.nom} » (ombres ${r.ombres}, post complet ${r.post})`);
    check(r.tiles > 15000 && r.bloomed > r.tiles * 0.3 && r.bloomed < r.tiles * 0.7, `${cible} : ${r.tiles} tuiles, ${r.bloomed} fleuries`);
    check(r.flowers > 1000, `${cible} : ${r.flowers} fleurs instanciées`);
    check(r.boxes === 0, `${cible} : aucune BoxGeometry`);
    const shot = await page.screenshot({ timeout: 240000 });
    check(shot.length > 20000, `${cible} : l'image n'est pas noire (${(shot.length / 1024).toFixed(0)} Ko)`);

    // --- Étape 2 : le joueur ---
    await placer(page, 6.4, 4.8, 0.93);
    if (cible === 'pc') {
      await page.keyboard.down('KeyW');
      const a = await page.evaluate(() => { const P = window.pollen, x0 = P.player.x, z0 = P.player.z, fx = -Math.sin(P.player.yaw), fz = -Math.cos(P.player.yaw); const s = P.step(0.05, 60); const dx = s.x - x0, dz = s.z - z0; return { fwd: dx * fx + dz * fz, lat: Math.abs(dx * -fz + dz * fx), mz: P.E.mz, speed: s.speed }; });
      check(a.mz === 1 && a.fwd > 9 && a.lat < 0.5, `pc : Z/W fait avancer (${f2(a.fwd)} m en 3 s, écart latéral ${f2(a.lat)} m)`);
      await page.keyboard.down('Shift');
      const run = await page.evaluate(() => window.pollen.step(0.05, 30).speed);
      await page.keyboard.up('Shift'); await page.keyboard.up('KeyW');
      check(run > 6, `pc : Maj fait courir (${f2(run)} m/s)`);
      await page.keyboard.down('KeyA');
      const mx = await page.evaluate(() => window.pollen.E.mx); await page.keyboard.up('KeyA');
      check(mx === -1, `pc : Q/A fait aller à gauche (E.mx = ${mx})`);
      const stop = await page.evaluate(() => window.pollen.step(0.05, 30).speed);
      check(stop < 0.05, `pc : relâcher arrête le joueur (${f2(stop)} m/s)`);
      // Regard à la souris en glissant, comme quand le navigateur refuse le verrouillage du pointeur
      // (page dans un cadre sans permission). Le chemin « pointeur verrouillé » n'est pas fidèle sans écran réel.
      await page.evaluate(() => { HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('refusé')); });
      const y0 = await page.evaluate(() => window.pollen.player.yaw);
      await page.mouse.move(320, 180); await page.mouse.down(); await page.mouse.move(420, 150, { steps: 5 }); await page.mouse.up();
      const look = await page.evaluate(() => { window.pollen.step(0.016); return { yaw: window.pollen.player.yaw, pitch: window.pollen.player.pitch }; });
      check(look.yaw < y0 - 0.15 && look.pitch > 0.03, `pc : la souris tourne le regard (lacet ${f2(look.yaw - y0)}, tangage ${f2(look.pitch)})`);
      await page.keyboard.press('Digit3'); const o3 = await page.evaluate(() => window.pollen.E.outil);
      await page.mouse.move(320, 180); await page.mouse.wheel(0, 100); await page.waitForTimeout(300); const o4 = await page.evaluate(() => window.pollen.E.outil);
      await page.keyboard.press('KeyM'); const carte = await page.evaluate(() => window.pollen.E.carte);
      check(o3 === 2 && o4 === 3 && carte === true, `pc : touche 3 puis molette choisissent l'outil (${o3} puis ${o4}), M ouvre la carte`);
      await page.keyboard.press('KeyM');
    } else {
      // Deux pouces posés en même temps : gauche = joystick, droite = regard.
      const cdp = await ctx.newCDPSession(page);
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 1 })) });
      const y0 = await page.evaluate(() => window.pollen.player.yaw);
      await touch('touchStart', [[180, 250, 1]]);
      await touch('touchStart', [[180, 250, 1], [560, 180, 2]]);
      await touch('touchMove', [[180, 210, 1], [600, 180, 2]]);
      await touch('touchMove', [[180, 210, 1], [640, 180, 2]]);
      const st = await page.evaluate(() => { const P = window.pollen; const E = { mx: P.E.mx, mz: P.E.mz, course: P.E.course }; const x0 = P.player.x, z0 = P.player.z; const s = P.step(0.05, 60); const stick = document.querySelector('.pol-stick'); return { ...E, moved: Math.hypot(s.x - x0, s.z - z0), yaw: s.yaw, stick: !stick.hidden }; });
      check(st.mz > 0.3 && st.mz < 0.8 && !st.course && st.moved > 4 && st.stick, `mobile : pouce gauche = joystick (avance ${f2(st.mz)}, ${f2(st.moved)} m en 3 s, sans courir)`);
      check(st.yaw < y0 - 0.3, `mobile : pouce droit tourne le regard en même temps (lacet ${f2(st.yaw - y0)})`);
      await touch('touchMove', [[180, 180, 1], [640, 180, 2]]);
      const run = await page.evaluate(() => { const P = window.pollen; return { course: P.E.course, speed: P.step(0.05, 30).speed }; });
      check(run.course && run.speed > 6, `mobile : pousser le joystick à fond fait courir (${f2(run.speed)} m/s)`);
      await touch('touchEnd', []);
      const fin = await page.evaluate(() => { const P = window.pollen; return { mz: P.E.mz, speed: P.step(0.05, 30).speed, stick: !document.querySelector('.pol-stick').hidden }; });
      check(fin.mz === 0 && fin.speed < 0.05 && !fin.stick, `mobile : lever les pouces arrête tout (${f2(fin.speed)} m/s)`);
      // Petit tremblement du pouce : la zone morte l'absorbe.
      await touch('touchStart', [[180, 250, 3]]); await touch('touchMove', [[183, 248, 3]]);
      const dz = await page.evaluate(() => [window.pollen.E.mx, window.pollen.E.mz]); await touch('touchEnd', []);
      check(dz[0] === 0 && dz[1] === 0, 'mobile : zone morte (un tremblement de 3 px ne bouge pas)');
      // Portrait : écran « tourne ton téléphone » et pause. (Le premier toucher a demandé le plein écran : on en sort pour redimensionner.)
      await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()); await page.waitForTimeout(300);
      await page.setViewportSize({ width: 360, height: 740 }); await page.waitForTimeout(600);
      const por = await page.evaluate(() => { const P = window.pollen; const x0 = P.player.x; P.E.mz = 1; P.step(0.05, 20); P.E.mz = 0; return { pause: P.E.pause, overlay: !document.querySelector('.pol-rotate').hidden, moved: Math.abs(P.player.x - x0) }; });
      check(por.pause && por.overlay && por.moved === 0, 'mobile : en portrait, « Tourne ton téléphone » et jeu en pause');
      await page.setViewportSize({ width: 740, height: 360 }); await page.waitForTimeout(600);
      const pay = await page.evaluate(() => ({ pause: window.pollen.E.pause, overlay: !document.querySelector('.pol-rotate').hidden }));
      check(!pay.pause && !pay.overlay, 'mobile : retour en paysage, le jeu reprend');
    }
    await communs(page, cible);
    // La vraie boucle d'affichage déplace aussi le joueur (pas seulement step).
    const x0 = await page.evaluate(() => { window.pollen.E.mz = 1; return window.pollen.player.x; });
    await page.waitForFunction((x0) => Math.abs(window.pollen.player.x - x0) > 0.05, x0, { timeout: 60000 }).catch(() => {});
    const moved = await page.evaluate((x0) => { window.pollen.E.mz = 0; return Math.abs(window.pollen.player.x - x0); }, x0);
    check(moved > 0.05, `${cible} : la boucle de jeu fait marcher le joueur (${f2(moved)} m)`);
    check(errors.length === 0, `${cible} : aucune erreur${errors.length ? ' : ' + errors.join(' | ') : ''}`);
    await ctx.close(); server.close();
  }
} finally { await browser.close(); }
if (fails.length) { console.log(`\n${fails.length} échec(s)`); process.exit(1); }
console.log('\nTout passe.');
