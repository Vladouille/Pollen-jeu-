// Test de la v7 (une scène, un fichier) : les cinq conditions du brief, sur ordinateur et sur téléphone.
//   1. déplacement (clavier, joystick tactile), relief suivi, bords du champ
//   2. regard (souris ; pouce droit en même temps que le gauche, en vraies touches multipoint CDP)
//   3. visée (rayon du centre de l'écran vers le sol, tuile surlignée)
//   4. pollinisation (maintien 2 s, jauge, floraison, trois abeilles, son ; relâcher annule)
//   5. aucune erreur dans la console
// Le rendu logiciel tourne à ~1 img/s : la simulation avance avec pollen.step(dt, n).
// Lancer : node tests/v7-smoke.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const three = await readFile(join(root, 'vendor', 'three.module.min.js'));
const html = await readFile(join(root, 'v7', 'index.html'), 'utf8');
const fails = [];
const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) fails.push(label); };
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const server = createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(0);
const url = `http://localhost:${server.address().port}/?auto=0`;

async function ouvrir(options) {
  const ctx = await browser.newContext(options);
  await ctx.route('https://cdn.jsdelivr.net/**', async (r) => { const m = r.request().url().match(/examples\/jsm\/(.*)$/); if (m) return r.fulfill({ body: await readFile(join(root, 'vendor', 'jsm', m[1])), contentType: 'text/javascript' }); return r.fulfill({ body: three, contentType: 'text/javascript' }); });
  const page = await ctx.newPage(); const erreurs = [], avertissements = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text().slice(0, 300)); if (m.type() === 'warning') avertissements.push(m.text().slice(0, 200)); });
  await page.goto(url);
  await page.waitForFunction(() => window.pollen, null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  return { ctx, page, erreurs, avertissements };
}
// Vérifications communes : la scène, la visée, la pollinisation pilotée par l'objet d'entrée, les bords.
async function communs(page, cible) {
  const s = await page.evaluate(() => {
    const P = window.pollen; let boites = 0, tours = 0, instances = 0;
    P.scene.traverse((o) => { if (o.geometry && o.geometry.type === 'BoxGeometry') boites++; if (o.isInstancedMesh) instances++; });
    const st = P.stats(), parTuile = []; for (let i = 0; i < P.T.q.length; i++) parTuile.push(P.brinsTuile(i));
    return { ...st, boites, instances, min: Math.min(...parTuile), max: Math.max(...parTuile), fleurs: P.VARIANTES.map((v) => v.fleurs), passes: P.composer.passes.length,
      ton: P.renderer.toneMapping, expo: P.renderer.toneMappingExposure, espace: P.renderer.outputColorSpace, brume: P.scene.fog && P.scene.fog.isFogExp2, soleil: Math.asin(P.SUN_DIR.y) * 180 / Math.PI };
  });
  check(s.tuiles > 900 && s.fleuries > s.tuiles * 0.4 && s.fleuries < s.tuiles * 0.6, `${cible} : champ de ${s.tuiles} tuiles, ${s.fleuries} fleuries`);
  check(s.min >= 30 && s.max <= 60 && s.brins > 30000, `${cible} : ${s.brins} brins de lavande, ${s.min} à ${s.max} par tuile`);
  check(s.fleurs.every((n) => n >= 20 && n <= 30) && s.fleurs.length === 5, `${cible} : cinq formes d'épi, ${s.fleurs.join(', ')} fleurs`);
  check(s.boites === 0 && s.instances >= 11, `${cible} : aucune BoxGeometry, ${s.instances} InstancedMesh`);
  check(s.ton === 4 && Math.abs(s.expo - 1.1) < 1e-6 && s.espace === 'srgb' && s.brume && Math.abs(s.soleil - 25) < 0.01, `${cible} : ACES 1,1, sRGB, brume FogExp2, soleil à ${f2(s.soleil)}°`);
  check(s.passes === (cible === 'pc' ? 4 : 3), `${cible} : post-traitement (${s.passes} passes : ${cible === 'pc' ? 'rendu, bloom, vignette, sortie' : 'rendu, bloom, sortie'})`);
  // Visée : un rayon indépendant, tiré ici depuis la caméra, doit tomber sur la même tuile.
  const v = await page.evaluate(() => {
    const P = window.pollen; P.step(0.016);
    const o = P.camera.position, d = P.camera.getWorldDirection(o.clone()); let t = 0.15;
    while (t < 8 && o.y + d.y * t > P.H(o.x + d.x * t, o.z + d.z * t) + 0.3) t += 0.01;
    const [q, r] = P.toHex(o.x + d.x * t, o.z + d.z * t), i = P.idxOf(q, r);
    return { cible: P.cible, attendu: i, fanee: i >= 0 && !P.T.bloom[i], sel: P.U.uSel.value.toArray(), q, r, dist: t };
  });
  check(v.cible >= 0 && v.cible === v.attendu && v.fanee, `${cible} : visée au départ sur une tuile fanée à ${f2(v.dist)} m (tuile ${v.cible})`);
  check(v.sel[0] === v.q && v.sel[1] === v.r && v.sel[2] > 0.5, `${cible} : la tuile visée est surlignée (${v.sel.map(f2).join(', ')})`);
  // Bords du champ : on fonce vers un coin.
  const b = await page.evaluate(() => { const P = window.pollen, J = P.joueur, s = { x: J.x, z: J.z, yaw: J.yaw, pitch: J.pitch };
    Object.assign(J, { x: 27, z: 27, yaw: -Math.PI * 0.75, vx: 0, vz: 0 }); P.E.mz = 1; P.step(0.05, 80); P.E.mz = 0; const r = { x: J.x, z: J.z };
    Object.assign(J, s, { vx: 0, vz: 0 }); P.step(0.05, 2); return r; });
  check(Math.abs(b.x) <= 29.61 && Math.abs(b.z) <= 29.61, `${cible} : on ne sort pas du champ (arrêt à ${f2(b.x)}, ${f2(b.z)})`);
}

try {
  // ------------------------------------------------------------------ ordinateur
  {
    const { ctx, page, erreurs, avertissements } = await ouvrir({ viewport: { width: 640, height: 360 } });
    const nom = await page.evaluate(() => window.pollen.Q.nom);
    check(nom === 'pc', `pc : appareil détecté « ${nom} » (souris)`);
    const shot = await page.screenshot({ timeout: 240000 });
    check(shot.length > 30000, `pc : l'image n'est pas vide (${(shot.length / 1024).toFixed(0)} Ko)`);
    await communs(page, 'pc');
    // Déplacement au clavier (touches physiques : ZQSD sur AZERTY = WASD sur QWERTY).
    const dep = async (touche) => {
      await page.keyboard.down(touche);
      const r = await page.evaluate(() => { const P = window.pollen, J = P.joueur, x0 = J.x, z0 = J.z, fx = -Math.sin(J.yaw), fz = -Math.cos(J.yaw);
        const s = P.step(0.05, 20), dx = s.x - x0, dz = s.z - z0; let err = Math.abs(J.y - P.H(J.x, J.z));
        return { av: dx * fx + dz * fz, cote: dx * -fz + dz * fx, err }; });
      await page.keyboard.up(touche);
      await page.evaluate(() => window.pollen.step(0.05, 20));
      return r;
    };
    const w = await dep('KeyW'), s = await dep('KeyS'), a = await dep('KeyA'), d = await dep('KeyD');
    check(w.av > 2.5 && s.av < -2.5 && a.cote < -2.5 && d.cote > 2.5, `pc : Z/W avance (${f2(w.av)} m), S recule (${f2(s.av)}), Q/A et D vont de côté (${f2(a.cote)}, ${f2(d.cote)})`);
    check(Math.max(w.err, s.err, a.err, d.err) < 0.06, `pc : les pieds suivent le relief (écart ${f2(Math.max(w.err, s.err, a.err, d.err))} m)`);
    // Premier clic : il verrouille le pointeur et n'agit pas.
    await page.mouse.move(320, 180); await page.mouse.down();
    const premier = await page.evaluate(() => window.pollen.E.action);
    await page.mouse.up(); await page.waitForTimeout(300);
    const verrou = await page.evaluate(() => document.pointerLockElement === document.getElementById('c'));
    check(premier === false, `pc : le premier clic verrouille le pointeur sans agir (verrou ${verrou ? 'obtenu' : 'refusé par le navigateur de test'})`);
    // Pollinisation : clic gauche maintenu deux secondes sur la tuile visée (on revient au point de départ).
    await page.evaluate(() => { const P = window.pollen, D = P.DEPART; Object.assign(P.joueur, { x: D.x, z: D.z, yaw: D.yaw, pitch: D.pitch, vx: 0, vz: 0 }); P.step(0.016, 2); });
    const avant = await page.evaluate(() => ({ i: window.pollen.cible, sons: window.pollen.son.n }));
    await page.mouse.down();
    const mi = await page.evaluate(() => { const P = window.pollen; P.step(0.05, 20); return { action: P.E.action, p: P.jauge.p, vis: P.jauge.tuile, fleurie: P.T.bloom[P.cible] }; });
    await page.mouse.up();
    const annule = await page.evaluate(() => { const P = window.pollen; P.step(0.05, 2); return { p: P.jauge.p, fleurie: P.T.bloom[P.cible] }; });
    check(mi.action && mi.p > 0.4 && mi.p < 0.9 && mi.vis === avant.i && !mi.fleurie, `pc : la jauge se remplit pendant le clic maintenu (${f2(mi.p * 100)} % à 1 s)`);
    check(annule.p === 0 && !annule.fleurie, 'pc : relâcher avant la fin annule et vide la jauge');
    await page.mouse.down();
    const fin = await page.evaluate((i) => { const P = window.pollen; P.step(0.05, 41); const t0 = P.gt; P.step(0.05, 16);
      const k = ((P.T.r[i] + 32) * 64 + (P.T.q[i] + 32)) * 4, tex = P.U.uState.value.image.data;
      return { fleurie: P.T.bloom[i], joueur: P.T.joueur[i], abeilles: P.abeillesSur(i), sons: P.son.n, texR: tex[k], texG: tex[k + 1], t0, jauge: P.jauge.p }; }, avant.i);
    await page.mouse.up();
    check(fin.fleurie === 1 && fin.joueur === 1 && fin.texG === 1, `pc : au bout de deux secondes, la tuile ${avant.i} fleurit`);
    check(fin.abeilles === 3, `pc : trois abeilles arrivent sur la tuile (${fin.abeilles})`);
    check(fin.sons === avant.sons + 1, `pc : un son court part (${fin.sons - avant.sons})`);
    // Regard à la souris, comme quand la page est dans un cadre qui refuse le verrouillage : on glisse.
    await page.evaluate(() => { if (document.exitPointerLock) document.exitPointerLock(); HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('refusé')); });
    await page.waitForTimeout(300);
    const y0 = await page.evaluate(() => ({ yaw: window.pollen.joueur.yaw, pitch: window.pollen.joueur.pitch }));
    await page.mouse.move(320, 180); await page.mouse.down(); await page.mouse.move(400, 160, { steps: 6 });
    const reg = await page.evaluate(() => { window.pollen.step(0.016); return { yaw: window.pollen.joueur.yaw, pitch: window.pollen.joueur.pitch }; });
    await page.mouse.up();
    check(reg.yaw < y0.yaw - 0.1 && reg.pitch > y0.pitch + 0.02, `pc : la souris tourne le regard (lacet ${f2(reg.yaw - y0.yaw)}, tangage ${f2(reg.pitch - y0.pitch)})`);
    // La vraie boucle d'affichage fait aussi marcher le joueur.
    const p0 = await page.evaluate(() => [window.pollen.joueur.x, window.pollen.joueur.z]);
    await page.keyboard.down('KeyW');
    await page.waitForFunction((p0) => Math.hypot(window.pollen.joueur.x - p0[0], window.pollen.joueur.z - p0[1]) > 0.05, p0, { timeout: 60000 }).catch(() => {});
    const p1 = await page.evaluate(() => [window.pollen.joueur.x, window.pollen.joueur.z]);
    await page.keyboard.up('KeyW');
    check(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.05, `pc : la boucle de jeu fait marcher le joueur (${f2(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]))} m)`);
    check(erreurs.length === 0, `pc : console sans erreur${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}${avertissements.length ? ` (${avertissements.length} avertissement(s) : ${avertissements[0]})` : ''}`);
    await ctx.close();
  }
  // ------------------------------------------------------------------ téléphone
  {
    const { ctx, page, erreurs, avertissements } = await ouvrir({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true });
    const nom = await page.evaluate(() => window.pollen.Q.nom);
    check(nom === 'mobile', `mobile : appareil détecté « ${nom} » (écran tactile)`);
    const shot = await page.screenshot({ timeout: 240000 });
    check(shot.length > 30000, `mobile : l'image n'est pas vide (${(shot.length / 1024).toFixed(0)} Ko)`);
    await communs(page, 'mobile');
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 1 })) });
    // Deux pouces en même temps : joystick à gauche, regard à droite.
    const y0 = await page.evaluate(() => window.pollen.joueur.yaw);
    await touch('touchStart', [[150, 260, 1]]);
    await touch('touchStart', [[150, 260, 1], [520, 170, 2]]);
    await touch('touchMove', [[150, 220, 1], [560, 170, 2]]);
    await touch('touchMove', [[150, 215, 1], [600, 170, 2]]);
    const st = await page.evaluate(() => { const P = window.pollen, E = { mx: P.E.mx, mz: P.E.mz }, x0 = P.joueur.x, z0 = P.joueur.z; const s = P.step(0.05, 40); return { ...E, bouge: Math.hypot(s.x - x0, s.z - z0), yaw: s.yaw, stick: !document.querySelector('.stick').hidden, err: Math.abs(P.joueur.y - P.H(P.joueur.x, P.joueur.z)) }; });
    check(st.mz > 0.3 && st.bouge > 3 && st.stick && st.err < 0.06, `mobile : pouce gauche = joystick (avance ${f2(st.mz)}, ${f2(st.bouge)} m en 2 s, relief suivi)`);
    check(st.yaw < y0 - 0.3, `mobile : pouce droit tourne le regard en même temps (lacet ${f2(st.yaw - y0)})`);
    await touch('touchEnd', []);
    const arret = await page.evaluate(() => { const P = window.pollen; return { mz: P.E.mz, v: P.step(0.05, 30).vitesse, stick: !document.querySelector('.stick').hidden }; });
    check(arret.mz === 0 && arret.v < 0.05 && !arret.stick, `mobile : lever les pouces arrête tout (${f2(arret.v)} m/s)`);
    // Pollinisation au bouton, pouce gauche toujours posé sur le joystick.
    await page.evaluate(() => { const P = window.pollen, D = P.DEPART; Object.assign(P.joueur, { x: D.x, z: D.z, yaw: D.yaw, pitch: D.pitch, vx: 0, vz: 0 }); P.step(0.016, 2); });
    const bt = await page.evaluate(() => { const r = document.getElementById('agir').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, i: window.pollen.cible, pret: document.getElementById('agir').classList.contains('pret') }; });
    check(bt.i >= 0 && bt.pret, `mobile : le bouton s'allume quand une tuile fanée est visée (tuile ${bt.i})`);
    await touch('touchStart', [[150, 260, 5]]);
    await touch('touchStart', [[150, 260, 5], [bt.x, bt.y, 6]]);
    const mi = await page.evaluate(() => { const P = window.pollen; P.step(0.05, 20); return { action: P.E.action, p: P.jauge.p }; });
    await touch('touchEnd', []);   // CDP ne lève qu'ensemble les doigts posés : on lève les deux
    const annule = await page.evaluate((i) => { const P = window.pollen; P.step(0.05, 2); return { p: P.jauge.p, fleurie: P.T.bloom[i], action: P.E.action }; }, bt.i);
    check(mi.action && mi.p > 0.4 && annule.p === 0 && !annule.action && !annule.fleurie, `mobile : bouton maintenu (pouce gauche posé) = jauge (${f2(mi.p * 100)} % à 1 s), relâché = annulé`);
    const sons0 = await page.evaluate(() => window.pollen.son.n);
    await touch('touchStart', [[bt.x, bt.y, 7]]);
    const fin = await page.evaluate((i) => { const P = window.pollen; P.step(0.05, 41); P.step(0.05, 16); return { fleurie: P.T.bloom[i], abeilles: P.abeillesSur(i), sons: P.son.n }; }, bt.i);
    await touch('touchEnd', []);
    check(fin.fleurie === 1 && fin.abeilles === 3 && fin.sons === sons0 + 1, `mobile : deux secondes au bouton, la tuile fleurit, trois abeilles, un son`);
    // Portrait : la scène tourne d'un quart de tour (paysage forcé), le joystick suit la rotation.
    await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()); await page.waitForTimeout(300);   // le premier toucher a demandé le plein écran
    await page.setViewportSize({ width: 360, height: 740 }); await page.waitForTimeout(800);
    const por = await page.evaluate(() => ({ tr: document.getElementById('jeu').style.transform, w: document.getElementById('jeu').style.width, cw: window.pollen.renderer.domElement.width, ch: window.pollen.renderer.domElement.height }));
    check(por.tr.includes('rotate(90deg)') && por.w === '740px' && por.cw > por.ch, `mobile : tenu en portrait, la scène est tournée en paysage (${por.tr}, ${por.cw}×${por.ch})`);
    // Dans ce sens, « en avant » pour le pouce, c'est vers le bord droit de l'écran (le haut de la scène).
    await touch('touchStart', [[180, 200, 9]]);
    await touch('touchMove', [[220, 200, 9]]);
    const pmz = await page.evaluate(() => window.pollen.E.mz);
    await touch('touchEnd', []);
    check(pmz > 0.3, `mobile : en portrait tourné, le joystick avance toujours dans le bon sens (${f2(pmz)})`);
    await page.setViewportSize({ width: 740, height: 360 }); await page.waitForTimeout(800);
    const pay = await page.evaluate(() => document.getElementById('jeu').style.transform);
    check(pay === 'none', 'mobile : retour en paysage, la scène ne tourne plus');
    check(erreurs.length === 0, `mobile : console sans erreur${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}${avertissements.length ? ` (${avertissements.length} avertissement(s) : ${avertissements[0]})` : ''}`);
    await ctx.close();
  }
} finally { await browser.close(); server.close(); }
if (fails.length) { console.log(`\n${fails.length} échec(s)`); process.exit(1); }
console.log('\nTout passe.');
