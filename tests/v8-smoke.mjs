// Test de la v8 : les six conditions du brief, avec les fichiers de test (tests/fixtures/v8) à la place
// des vrais modèles CC0, puis sans aucun fichier (formes de substitution et message d'absence).
//   1. chargement  2. déplacement  3. regard (multipoint)  4. visée  5. pollinisation et panier  6. marché et atelier
// Le rendu logiciel tourne à ~1 img/s : la simulation avance avec pollen.step(dt, n).
// Lancer : node tests/v8-fixtures.mjs (une fois) puis node tests/v8-smoke.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const three = await readFile(join(root, 'vendor', 'three.module.min.js'));
const html = await readFile(join(root, 'v8', 'index.html'), 'utf8');
const fails = [];
const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) fails.push(label); };
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
function serveur(avecFichiers) {
  const srv = createServer(async (q, r) => {
    const u = q.url.split('?')[0];
    if (u === '/') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(html); }
    if (avecFichiers) { try { const d = await readFile(join(root, 'tests', 'fixtures', 'v8', u)); r.writeHead(200, { 'content-type': 'application/octet-stream' }); return r.end(d); } catch { /* absent */ } }
    r.writeHead(404); r.end('absent');
  }).listen(0);
  return srv;
}
async function ouvrir(avecFichiers, options) {
  const srv = serveur(avecFichiers), ctx = await browser.newContext(options);
  await ctx.route('https://cdn.jsdelivr.net/**', async (r) => { const m = r.request().url().match(/examples\/jsm\/(.*)$/); if (m) return r.fulfill({ body: await readFile(join(root, 'vendor', 'jsm', m[1])), contentType: 'text/javascript' }); return r.fulfill({ body: three, contentType: 'text/javascript' }); });
  const page = await ctx.newPage(), erreurs = [], absents = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() !== 'error') return; if (m.text().includes('404')) absents.push(m.text()); else erreurs.push(m.text().slice(0, 300)); });
  await page.goto(`http://localhost:${srv.address().port}/?auto=0`);
  await page.waitForFunction(() => window.pollen && document.getElementById('chargement').hidden, null, { timeout: 180000 });
  await page.waitForTimeout(2500);
  return { ctx, page, erreurs, absents, srv };
}
const auDepart = (page) => page.evaluate(() => { const P = window.pollen, D = P.DEPART; Object.assign(P.joueur, { x: D.x, z: D.z, y: P.H(D.x, D.z), yaw: D.yaw, pitch: D.pitch, vx: 0, vz: 0 }); P.step(0.016, 2); });
// Au départ, tourner un peu le regard jusqu'à viser une tuile encore fanée.
const viserFanee = (page) => page.evaluate(() => { const P = window.pollen, D = P.DEPART;
  for (let k = 0; k < 40; k++) { const yaw = D.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.12; Object.assign(P.joueur, { x: D.x, z: D.z, y: P.H(D.x, D.z), yaw, pitch: D.pitch, vx: 0, vz: 0 }); P.step(0.016, 1); if (P.cible >= 0 && !P.T.bloom[P.cible]) return P.cible; }
  return -1; });
// Se placer devant un bâtiment, à deux mètres de son bord, le regard vers lui.
const devant = (page, cle) => page.evaluate((cle) => { const P = window.pollen, b = P.BATS[cle], d = b.rayon + 2;
  const x = b.x + b.avant[0] * d, z = b.z + b.avant[1] * d; Object.assign(P.joueur, { x, z, y: P.H(x, z), yaw: Math.atan2(x - b.x, z - b.z), pitch: -0.2, vx: 0, vz: 0 }); P.step(0.016, 2); return P.zone; }, cle);

try {
  // ------------------------------------------------------------------ ordinateur, avec les fichiers
  {
    const { ctx, page, erreurs, absents, srv } = await ouvrir(true, { viewport: { width: 640, height: 360 } });
    const ch = await page.evaluate(() => { const P = window.pollen; let subst = 0; P.scene.traverse((o) => { if (o.userData.substitut) subst++; });
      return { nom: P.Q.nom, manquants: P.MANQUANTS.length, glb: !!P.PROCHE_GLB, env: !!P.scene.environment, subst, outilSubst: !!P.OUTILS.coton.userData.substitut, barre: document.querySelector('#chargement .barre i').style.width, notice: !document.getElementById('notice').hidden, actifs: Object.keys(P.ACTIFS).sort().join(',') }; });
    check(ch.nom === 'pc', `pc : appareil détecté « ${ch.nom} »`);
    check(ch.manquants === 0 && ch.barre === '100%' && !ch.notice && absents.length === 0, `pc : chargement complet, barre à ${ch.barre} (${ch.actifs})`);
    check(ch.glb && ch.env && ch.subst === 0 && !ch.outilSubst, 'pc : fleurs en instances du modèle chargé, ciel HDRI en éclairage, aucune forme de substitution');
    // 2. Déplacement
    await auDepart(page);
    const dep = async (touche) => { await page.keyboard.down(touche);
      const r = await page.evaluate(() => { const P = window.pollen, J = P.joueur, x0 = J.x, z0 = J.z, fx = -Math.sin(J.yaw), fz = -Math.cos(J.yaw); const s = P.step(0.05, 20), dx = s.x - x0, dz = s.z - z0; return { av: dx * fx + dz * fz, cote: dx * -fz + dz * fx, err: Math.abs(J.y - P.H(J.x, J.z)) }; });
      await page.keyboard.up(touche); await page.evaluate(() => window.pollen.step(0.05, 20)); return r; };
    const w = await dep('KeyW'), s = await dep('KeyS'), a = await dep('KeyA'), d = await dep('KeyD');
    check(w.av > 2.5 && s.av < -2.5 && a.cote < -2.5 && d.cote > 2.5 && Math.max(w.err, s.err, a.err, d.err) < 0.06, `pc : ZQSD/WASD avance (${f2(w.av)} m), recule, va de côté, relief suivi`);
    const bord = await page.evaluate(() => { const P = window.pollen, J = P.joueur; Object.assign(J, { x: 37, z: 37, yaw: -Math.PI * 0.75, vx: 0, vz: 0 }); P.E.mz = 1; P.step(0.05, 80); P.E.mz = 0; return [J.x, J.z]; });
    check(Math.abs(bord[0]) <= 39.61 && Math.abs(bord[1]) <= 39.61, `pc : on ne sort pas du champ (${f2(bord[0])}, ${f2(bord[1])})`);
    const mur = await page.evaluate(() => { const P = window.pollen, b = P.BATS.marche, J = P.joueur, x = b.x + b.avant[0] * (b.rayon + 3), z = b.z + b.avant[1] * (b.rayon + 3);
      Object.assign(J, { x, z, yaw: Math.atan2(x - b.x, z - b.z), vx: 0, vz: 0 }); P.E.mz = 1; P.step(0.05, 60); P.E.mz = 0; return { d: Math.hypot(J.x - b.x, J.z - b.z), r: b.rayon }; });
    check(mur.d >= mur.r + 0.39, `pc : on ne traverse pas le marché (arrêt à ${f2(mur.d)} m du centre, rayon ${f2(mur.r)})`);
    // 3. Regard : premier clic = verrouillage sans action ; puis glisser comme dans un cadre qui refuse le verrouillage.
    await auDepart(page);
    await page.mouse.move(320, 180); await page.mouse.down();
    const premier = await page.evaluate(() => window.pollen.E.action);
    await page.mouse.up(); await page.waitForTimeout(300);
    check(premier === false, 'pc : le premier clic verrouille le pointeur sans agir');
    await page.evaluate(() => { if (document.exitPointerLock) document.exitPointerLock(); }); await page.waitForTimeout(300);
    // 4 et 5. Visée et pollinisation à la tige de coton (trois secondes).
    await auDepart(page);
    await page.evaluate(() => { HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('refusé')); });
    const v = await page.evaluate(() => { const P = window.pollen, o = P.camera.position, d = P.camera.getWorldDirection(o.clone()); let t = 0.15;
      while (t < 8 && o.y + d.y * t > P.H(o.x + d.x * t, o.z + d.z * t) + 0.3) t += 0.01; const [q, r] = P.toHex(o.x + d.x * t, o.z + d.z * t);
      return { cible: P.cible, attendu: P.idxOf(q, r), sel: P.U.uSel.value.toArray(), q, r, fanee: !P.T.bloom[P.cible] }; });
    check(v.cible >= 0 && v.cible === v.attendu && v.fanee && v.sel[0] === v.q && v.sel[1] === v.r && v.sel[2] > 0.5, `pc : visée par rayon sur une tuile fanée (${v.cible}), surlignée`);
    await page.mouse.move(320, 180); await page.mouse.down();
    const deux = await page.evaluate(() => { const P = window.pollen; P.step(0.05, 40); return { p: P.jauge.p, fleurie: P.T.bloom[P.cible] }; });
    const fin = await page.evaluate((i) => { const P = window.pollen; P.step(0.05, 21); P.step(0.05, 16); return { fleurie: P.T.bloom[i], panier: P.eco.panier, abeilles: P.abeillesSur(i), sons: P.son.n }; }, v.cible);
    await page.mouse.up();
    check(deux.p > 0.6 && deux.p < 0.7 && !deux.fleurie, `pc : tige de coton, la jauge est à ${f2(deux.p * 100)} % après deux secondes`);
    check(fin.fleurie === 1 && fin.panier === 1 && fin.abeilles === 3 && fin.sons === 1, `pc : après trois secondes, la tuile fleurit, une fleur au panier, trois abeilles, un son`);
    // 6. Panier plein : plus lent, plus de pollinisation, le marqueur montre le marché.
    const plein = await page.evaluate(() => { const P = window.pollen; P.eco.panier = 14; P.step(0.05, 2); P.E.mz = 1; const v = P.step(0.05, 30).vitesse; P.E.mz = 0; P.step(0.05, 30);
      const o = document.getElementById('objectif'); return { v, marque: !o.hidden && o.textContent.includes('Marché'), panier: document.getElementById('panierN').textContent }; });
    check(Math.abs(plein.v - 3.4 * 0.8) < 0.05 && plein.marque, `pc : panier plein (${plein.panier}), 20 % plus lent (${f2(plein.v)} m/s), le marqueur montre le marché`);
    await viserFanee(page);
    const bloque = await page.evaluate(() => { const P = window.pollen; P.E.action = true; P.step(0.05, 10); const r = { p: P.jauge.p, invite: document.getElementById('invite').textContent }; P.E.action = false; P.step(0.05, 1); return r; });
    check(bloque.p === 0 && bloque.invite.includes('Panier plein'), `pc : panier plein, on ne pollinise plus (« ${bloque.invite} »)`);
    // Le marché.
    const zm = await devant(page, 'marche');
    const avantVente = await page.evaluate(() => document.getElementById('invite').textContent);
    check(zm === 'marche' && avantVente === 'Clic : Vendre 14 fleurs — 42 crédits', `pc : devant le marché, « ${avantVente} »`);
    await page.mouse.down(); await page.evaluate(() => window.pollen.step(0.05, 1)); await page.mouse.up();
    const vente = await page.evaluate(() => { const P = window.pollen; const g = !document.getElementById('gain').hidden && document.getElementById('gain').textContent; P.step(0.05, 30);
      return { credits: P.eco.credits, panier: P.eco.panier, sons: P.son.ventes, pile: P.pile.ms[0].count, gain: g, gainCache: document.getElementById('gain').hidden, credTxt: document.getElementById('credits').textContent }; });
    check(vente.credits === 42 && vente.panier === 0 && vente.sons === 1 && vente.gain === '+42' && vente.gainCache, `pc : vente — ${vente.credTxt}, « ${vente.gain} » affiché puis effacé, pièces qui tintent`);
    check(vente.pile === 14, `pc : les cageots se remplissent (${vente.pile} fleurs posées)`);
    const vide = await page.evaluate(() => document.getElementById('invite').textContent);
    check(vide === 'Panier vide', `pc : panier vide, « ${vide} » en gris`);
    // L'atelier.
    const za = await devant(page, 'atelier');
    const pauvre = await page.evaluate(() => { const P = window.pollen; let gris = true; P.vitrine.traverse((o) => { if (o.isMesh && !o.material.transparent) gris = false; });
      return { inv: document.getElementById('invite').textContent, panneau: document.getElementById('panneau').textContent, gris, visible: P.vitrine.visible }; });
    check(za === 'atelier' && pauvre.inv === 'Il manque 208 crédits' && pauvre.gris && pauvre.visible, `pc : à l'atelier, le pinceau est sur l'établi, gris (« ${pauvre.inv} »)`);
    check(pauvre.panneau.includes('Pinceau à pollen') && pauvre.panneau.includes('250 crédits') && pauvre.panneau.includes('panier doublé'), `pc : panneau « ${pauvre.panneau} »`);
    const riche = await page.evaluate(() => { const P = window.pollen; P.eco.credits = 300; P.step(0.05, 2); let gris = false; P.vitrine.traverse((o) => { if (o.isMesh && o.material.transparent) gris = true; }); return { inv: document.getElementById('invite').textContent, gris }; });
    check(riche.inv === 'Clic : Acheter le pinceau — 250 crédits' && !riche.gris, `pc : assez de crédits, le pinceau reprend ses couleurs (« ${riche.inv} »)`);
    await page.mouse.down(); await page.evaluate(() => window.pollen.step(0.05, 1)); await page.mouse.up();
    const achat = await page.evaluate(() => { const P = window.pollen; P.step(0.05, 2); return { outil: P.eco.outil, credits: P.eco.credits, enMain: P.outilVue.children[0] === P.OUTILS.pinceau, vitrine: P.vitrine.visible, nom: document.getElementById('outilNom').textContent, panier: document.getElementById('panierN').textContent, sons: P.son.achats }; });
    check(achat.outil === 'pinceau' && achat.credits === 50 && achat.enMain && !achat.vitrine && achat.sons === 1, `pc : achat — le pinceau quitte l'établi et passe en main (${achat.nom}, ${achat.panier})`);
    await viserFanee(page);
    const vite = await page.evaluate(() => { const P = window.pollen; let i = P.cible; if (i < 0 || P.T.bloom[i]) return { ok: false, i };
      P.E.action = true; P.step(0.05, 21); P.E.action = false; P.step(0.05, 2); return { ok: true, fleurie: P.T.bloom[i], panier: P.eco.panier }; });
    check(vite.ok && vite.fleurie === 1, `pc : au pinceau, une tuile fleurit en une seconde (panier ${vite.panier})`);
    check(erreurs.length === 0, `pc : console sans erreur${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
    await ctx.close(); srv.close();
  }
  // ------------------------------------------------------------------ téléphone, avec les fichiers
  {
    const { ctx, page, erreurs, srv } = await ouvrir(true, { viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true });
    const nom = await page.evaluate(() => window.pollen.Q.nom);
    check(nom === 'mobile', `mobile : appareil détecté « ${nom} »`);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 1 })) });
    await auDepart(page);
    const y0 = await page.evaluate(() => window.pollen.joueur.yaw);
    await touch('touchStart', [[150, 260, 1]]); await touch('touchStart', [[150, 260, 1], [520, 170, 2]]);
    await touch('touchMove', [[150, 220, 1], [560, 170, 2]]); await touch('touchMove', [[150, 215, 1], [600, 170, 2]]);
    const st = await page.evaluate(() => { const P = window.pollen, x0 = P.joueur.x, z0 = P.joueur.z, mz = P.E.mz; const s = P.step(0.05, 40); return { mz, bouge: Math.hypot(s.x - x0, s.z - z0), yaw: s.yaw }; });
    await touch('touchEnd', []);
    check(st.mz > 0.3 && st.bouge > 3 && st.yaw < y0 - 0.3, `mobile : joystick (${f2(st.bouge)} m) et regard (lacet ${f2(st.yaw - y0)}) en même temps`);
    await auDepart(page);
    const bt = await page.evaluate(() => { const r = document.getElementById('agir').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, i: window.pollen.cible }; });
    await touch('touchStart', [[bt.x, bt.y, 3]]);
    const pol = await page.evaluate((i) => { const P = window.pollen; P.step(0.05, 61); P.step(0.05, 16); return { fleurie: P.T.bloom[i], panier: P.eco.panier }; }, bt.i);
    await touch('touchEnd', []);
    check(pol.fleurie === 1 && pol.panier === 1, `mobile : bouton maintenu trois secondes, la tuile fleurit, une fleur au panier`);
    await devant(page, 'marche');
    const lib = await page.evaluate(() => ({ t: document.querySelector('#agir .libelle').textContent, texte: document.getElementById('agir').classList.contains('texte') }));
    check(lib.texte && lib.t === 'Vendre 1 fleur — 3 crédits', `mobile : devant le marché, le bouton affiche « ${lib.t} »`);
    const bt2 = await page.evaluate(() => { const r = document.getElementById('agir').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await touch('touchStart', [[bt2.x, bt2.y, 4]]); await page.evaluate(() => window.pollen.step(0.05, 1)); await touch('touchEnd', []);
    const v = await page.evaluate(() => { window.pollen.step(0.05, 2); return window.pollen.eco.credits; });
    check(v === 3, `mobile : un appui sur le bouton vend (${v} crédits)`);
    await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()); await page.waitForTimeout(300);
    await page.setViewportSize({ width: 360, height: 740 }); await page.waitForTimeout(800);
    const por = await page.evaluate(() => document.getElementById('jeu').style.transform);
    check(por.includes('rotate(90deg)'), 'mobile : tenu en portrait, la scène tourne en paysage');
    check(erreurs.length === 0, `mobile : console sans erreur${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
    await ctx.close(); srv.close();
  }
  // ------------------------------------------------------------------ sans aucun fichier
  {
    const { ctx, page, erreurs, absents, srv } = await ouvrir(false, { viewport: { width: 640, height: 360 } });
    const r = await page.evaluate(() => { const P = window.pollen; let subst = 0; P.scene.traverse((o) => { if (o.userData.substitut) subst++; });
      return { manquants: P.MANQUANTS.length, notice: !document.getElementById('notice').hidden && document.querySelector('#notice p').textContent, subst, outilSubst: !!P.OUTILS.coton.userData.substitut }; });
    check(r.manquants === 6 && r.notice && r.notice.includes('models/fleur_lavande.glb') && r.notice.includes('hdri/ciel.hdr'), `sans fichiers : message lisible (« ${(r.notice || '').slice(0, 90)}… »)`);
    check(r.subst >= 2 && r.outilSubst, `sans fichiers : le jeu tourne avec des formes de substitution (${r.subst} objets de substitution)`);
    const pol = await page.evaluate(() => { const P = window.pollen, D = P.DEPART; Object.assign(P.joueur, { x: D.x, z: D.z, y: P.H(D.x, D.z), yaw: D.yaw, pitch: D.pitch, vx: 0, vz: 0 }); P.step(0.016, 2); const i = P.cible; P.E.action = true; P.step(0.05, 61); P.E.action = false; P.step(0.05, 2); return P.T.bloom[i]; });
    check(pol === 1, 'sans fichiers : la pollinisation marche quand même');
    check(erreurs.length === 0 && absents.length === 6, `sans fichiers : aucune erreur de script (seulement les ${absents.length} fichiers 404 signalés)`);
    await ctx.close(); srv.close();
  }
} finally { await browser.close(); }
if (fails.length) { console.log(`\n${fails.length} échec(s)`); process.exit(1); }
console.log('\nTout passe.');
