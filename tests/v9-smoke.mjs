// Test de la v9 : décor, commandes, fleurs en rangs (un secteur = une espèce), interface à cinq éléments, pollinisation
// maintenue avec jauge, secteurs ouverts à 100 %, achats immédiats, activités et machines à durées améliorables. Étape 1 (décor et charte) : la page se charge sans erreur sur ordinateur et téléphone,
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
    check(r.nt > 4000 && r.vertes > 50 && r.vertes < r.nt * 0.1, `${cible} : ${r.nt} tuiles, ${r.vertes} en fleurs autour de la station, le reste fané`);
    check(r.dansScene && r.brutes === 0 && r.arrondies >= 15, `${cible} : collecteur en scène, ${r.arrondies} pièces chanfreinées, aucune boîte à arêtes vives`);
    check(r.hors.length === 0 && r.emissifs.length === 1 && r.emissifs[0] === r.seve, `${cible} : matériel en blanc, graphite, jaune pollen et vert sève lumineux uniquement`);
    // --- Étape 2 : la vue et les contrôles ---
    const v = await page.evaluate(() => { const P = window.pollen; let ombre = 0, visibles = 0; P.corps.traverse((o) => { if (o.isMesh) { if (o.castShadow) ombre++; if (o.material.colorWrite) visibles++; } });
      return { fov: P.camera.fov, oeil: P.camera.position.y - P.joueur.y, ombre, visibles, outil: P.outil, enCamera: P.vue.parent === P.camera && P.vue.children.length === 1 }; });
    check(Math.abs(v.oeil - 1.7) < 0.05 && v.fov >= 58 && v.fov <= 70.01, `${cible} : première personne, œil à ${v.oeil.toFixed(2)} m, champ ${v.fov.toFixed(0)}°`);
    check(v.ombre >= 6 && v.visibles === 0, `${cible} : le corps est invisible mais projette son ombre (${v.ombre} pièces)`);
    check(v.enCamera && v.outil === 'pinceau', `${cible} : le pinceau est en main, en bas de l'écran`);
    const place = (x, z, yaw) => page.evaluate(([x, z, yaw]) => { const P = window.pollen; Object.assign(P.joueur, { x, z, y: P.H(x, z), yaw, pitch: -0.1, vx: 0, vz: 0 }); P.step(0.016); }, [x, z, yaw]);
    if (cible === 'pc') {
      await place(10, 12, 0.3);
      const dep = async (t) => { await page.keyboard.down(t); const r = await page.evaluate(() => { const P = window.pollen, J = P.joueur, x0 = J.x, z0 = J.z, fx = -Math.sin(J.yaw), fz = -Math.cos(J.yaw); const s = P.step(0.05, 20); const dx = s.x - x0, dz = s.z - z0; return { av: dx * fx + dz * fz, co: dx * -fz + dz * fx, err: Math.abs(J.y - P.H(J.x, J.z)) }; }); await page.keyboard.up(t); await page.evaluate(() => window.pollen.step(0.05, 20)); return r; };
      const w = await dep('KeyW'), s2 = await dep('KeyS'), a = await dep('KeyA'), d = await dep('KeyD');
      check(w.av > 3 && s2.av < -3 && a.co < -3 && d.co > 3 && Math.max(w.err, s2.err, a.err, d.err) < 0.06, `pc : ZQSD/WASD (avance ${w.av.toFixed(2)} m en 1 s), relief suivi`);
      await page.mouse.move(320, 180); await page.mouse.down(); const prem = await page.evaluate(() => window.pollen.E.action); await page.mouse.up();
      await page.evaluate(() => { if (document.exitPointerLock) document.exitPointerLock(); HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('refusé')); }); await page.waitForTimeout(300);
      const y0 = await page.evaluate(() => window.pollen.joueur.yaw);
      await page.mouse.move(320, 180); await page.mouse.down(); await page.mouse.move(400, 160, { steps: 6 }); await page.mouse.up();
      const y1 = await page.evaluate(() => { window.pollen.step(0.016); return window.pollen.joueur.yaw; });
      check(prem === false && y1 < y0 - 0.1, `pc : premier clic sans action, la souris tourne le regard (${(y1 - y0).toFixed(2)})`);
    } else {
      await place(10, 12, 0.3);
      const cdp = await ctx.newCDPSession(page);
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 1 })) });
      const y0 = await page.evaluate(() => window.pollen.joueur.yaw);
      await touch('touchStart', [[150, 260, 1]]); await touch('touchStart', [[150, 260, 1], [480, 150, 2]]);
      await touch('touchMove', [[150, 215, 1], [530, 150, 2]]); await touch('touchMove', [[150, 210, 1], [580, 150, 2]]);
      const st = await page.evaluate(() => { const P = window.pollen, x0 = P.joueur.x, z0 = P.joueur.z; const s = P.step(0.05, 40); return { bouge: Math.hypot(s.x - x0, s.z - z0), yaw: s.yaw }; });
      await touch('touchEnd', []);
      check(st.bouge > 3 && st.yaw < y0 - 0.3, `mobile : joystick (${st.bouge.toFixed(1)} m) et regard (${(st.yaw - y0).toFixed(2)}) en même temps`);
      await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()); await page.waitForTimeout(300);
      await page.setViewportSize({ width: 360, height: 740 }); await page.waitForTimeout(800);
      const tr = await page.evaluate(() => document.getElementById('jeu').style.transform);
      await page.setViewportSize({ width: 740, height: 360 }); await page.waitForTimeout(800);
      check(tr.includes('rotate(90deg)'), 'mobile : tenu en portrait, la scène tourne en paysage');
    }
    const bord = await page.evaluate(() => { const P = window.pollen, J = P.joueur; Object.assign(J, { x: 60, z: 30, yaw: -2.0, vx: 0, vz: 0 }); P.E.mz = 1; P.step(0.05, 80); P.E.mz = 0; return Math.hypot(J.x, J.z); });
    const obst = await page.evaluate(() => { const P = window.pollen, J = P.joueur, o = P.OBSTACLES.find((o) => o.x === P.COLLECTEUR.position.x && o.z === P.COLLECTEUR.position.z); Object.assign(J, { x: o.x + 5, z: o.z, yaw: Math.PI / 2, vx: 0, vz: 0 }); P.E.mz = 1; P.step(0.05, 60); P.E.mz = 0; return { d: Math.hypot(J.x - o.x, J.z - o.z), r: o.r }; });
    check(bord <= 69.51 && obst.d >= obst.r + 0.34, `${cible} : bord du terrain (${bord.toFixed(1)} m) et collecteur infranchissable`);
    // --- Les fleurs : rangs réguliers, 60 à 90 par tuile ; un secteur = une espèce = une couleur ---
    const f = await page.evaluate(() => {
      const P = window.pollen, parTuile = new Map(), xs = new Map(); let mauvaiseCouleur = 0, n = 0, tri = P.FLEUR_GEO.attributes.position.count / 3;
      for (const m of P.CARRES.values()) { if (!m) continue; const a = m.geometry.attributes.aTuile, e = new Float32Array(16);
        for (let k = 0; k < m.count; k++) { n++; const key = a.array[k * 4] + ',' + a.array[k * 4 + 1]; const t = P.idxDe(a.array[k * 4], a.array[k * 4 + 1]); if (a.array[k * 4 + 3] !== P.T.secteur[t]) mauvaiseCouleur++; parTuile.set(key, (parTuile.get(key) || 0) + 1); m.instanceMatrix.array.slice(k * 16, k * 16 + 16).forEach((v, j) => { e[j] = v; }); const z = Math.round(e[14] / 0.2); if (!xs.has(z)) xs.set(z, []); xs.get(z).push(e[12]); } }
      // dans un même rang, l'écart entre voisines est un multiple de 18 cm
      let regulier = 0, total = 0; for (const l of xs.values()) { l.sort((u, v) => u - v); for (let k = 1; k < l.length; k++) { const d = l[k] - l[k - 1]; total++; if (Math.abs(d / 0.18 - Math.round(d / 0.18)) < 0.02) regulier++; } }
      const pleines = [...parTuile.values()].filter((v) => v > 40), moy = pleines.reduce((s, v) => s + v, 0) / pleines.length;
      let unie = true; for (let i = 0; i < P.NT; i++) if (P.T.couleur[i] !== P.T.secteur[i]) unie = false;
      return { n, moy, tri, regulier: regulier / total, unie: unie && mauvaiseCouleur === 0, palette: P.COULEURS.map((c) => c.toString(16)), prix: P.ESPECES.map((e) => e.prix).join(), instanced: [...P.CARRES.values()].every((m) => !m || m.isInstancedMesh) };
    });
    check(f.moy >= 60 && f.moy <= 90 && f.instanced, `${cible} : ${f.n} fleurs en InstancedMesh, ${f.moy.toFixed(0)} par tuile`);
    check(f.regulier > 0.99, `${cible} : fleurs en rangs réguliers (${(f.regulier * 100).toFixed(1)} % des écarts sur la grille)`);
    check(f.unie && f.palette.join() === 'e23b2e,f5c518,8b4fc4,e85c9a,f7f4ee,f08a24' && f.prix === '3,7,15,32,70,150', `${cible} : un secteur = une espèce, une couleur unie ; 3 à 150 cr la tuile`);
    check(f.tri <= 44, `${cible} : ${f.tri} triangles par fleur`);
    // --- L'interface : cinq éléments, aucun texte qui dise quoi faire ---
    const ui = await page.evaluate(() => { const vis = (id) => { const e = document.getElementById(id); if (!e || e.hidden) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const visibles = [...document.querySelectorAll('#hud > *')].filter((e) => { const r = e.getBoundingClientRect(); return !e.hidden && r.width > 0; }).map((e) => e.id);
      const sp = document.getElementById('secteur').getBoundingClientRect(), cr = document.getElementById('credits').getBoundingClientRect();
      return { visibles, boussole: vis('boussole'), secteurHautDroite: sp.left > innerWidth / 2 && sp.top < innerHeight / 3 && /^\d+ %$/.test(document.getElementById('secP').textContent),
        pastille: /^\d+,\d \/ \d+ KG$/.test(document.getElementById('charge').textContent), argentBasDroite: cr.left > innerWidth / 2 && cr.top > innerHeight / 2 }; });
    check(ui.visibles.join() === 'boussole,secteur,pastille,slots,credits' && ui.boussole && ui.secteurHautDroite && ui.pastille && ui.argentBasDroite, `${cible} : cinq éléments à l'écran (${ui.visibles.join(', ')})`);
    // --- La boucle : maintenir, jauge sur la tuile, relâcher annule ; vente ; achat immédiat ; secteurs verrouillés ---
    const b = await page.evaluate(() => {
      const P = window.pollen, out = {}; P.figer = true;
      const viser = (i) => { const x = P.T.x[i], z = P.T.z[i] + 2.2; Object.assign(P.joueur, { x, z, y: P.H(x, z), yaw: 0, pitch: -0.62, vx: 0, vz: 0 }); P.step(0.016, 2); };
      const libres = []; for (let k = 0; k < P.NT; k++) if (P.pollinisable(k) && Math.hypot(P.T.x[k], P.T.z[k]) > 21 && P.T.sorte[k] === 0 && P.T.secteur[k] === 0) libres.push(k);
      const i = libres[0], j = libres.find((k) => Math.hypot(P.T.x[k] - P.T.x[i], P.T.z[k] - P.T.z[i]) > 8);
      viser(i); out.vise = P.groupe.includes(i);
      P.E.action = true; P.step(0.1, 12); out.jaugeMi = P.SEL.value.y; P.E.action = false; P.step(0.016);
      out.annule = P.T.vert[i] === 0 && P.SEL.value.y === 0;
      P.E.action = true; P.step(0.1, 24); out.avant = P.T.vert[i]; P.step(0.1, 2); P.E.action = false; P.step(0.016);
      out.vert = P.T.vert[i]; out.charge = P.S.charge; out.valeur = P.S.valeur; out.jauge = document.getElementById('charge').textContent;
      // Secteur fermé : pas pollinisable ; secteur 1 fini à 100 % : le 2 s'ouvre.
      let f = -1; for (let k = 0; k < P.NT; k++) if (P.T.secteur[k] === 1 && P.T.sorte[k] === 0 && !P.T.vert[k]) { f = k; break; }
      out.ferme = !P.pollinisable(f) && P.OUVERTS.value === 1;
      for (let k = 0; k < P.NT; k++) if (P.T.secteur[k] === 0 && !P.T.vert[k]) { P.T.sorte[k] = 0; P.T.irrigue[k] = 1; P.polliniser(k); }
      out.ouvre = P.OUVERTS.value === 2 && P.pollinisable(f);
      const C = P.COLLECTEUR; Object.assign(P.joueur, { x: C.position.x + 2.6 * Math.sin(C.rotation.y), z: C.position.z + 2.6 * Math.cos(C.rotation.y), vx: 0, vz: 0, pitch: 0 }); P.joueur.yaw = Math.atan2(P.joueur.x - C.position.x, P.joueur.z - C.position.z); P.step(0.016, 2);
      P.E.inter = true; P.step(0.016); out.credits = P.S.credits; out.vide = P.S.charge === 0;
      const pr = P.PRESENTOIRS.find((p) => p.cle === 'brosse'); out.grise = pr.etat === 'cher';
      const xl = P.PRESENTOIRS.find((p) => p.cle === 'souffleur'); P.S.credits = 8000; P.step(0.016); out.souffleurEnVente = xl.etat === 'abordable';
      P.S.credits = 350; P.step(0.016); out.abordable = pr.etat === 'abordable';
      Object.assign(P.joueur, { x: pr.x + Math.sin(pr.g.rotation.y), z: pr.z + Math.cos(pr.g.rotation.y), vx: 0, vz: 0 }); P.joueur.yaw = Math.atan2(P.joueur.x - pr.x, P.joueur.z - pr.z); P.step(0.016, 2);
      P.E.inter = true; P.step(0.016); out.outil = P.outil; out.reste = P.S.credits; out.slots = document.querySelectorAll('#slots button').length;
      // La brosse : 1,8 s par tuile.
      let j2 = -1; for (let k = 0; k < P.NT; k++) if (P.pollinisable(k) && P.T.sorte[k] === 0 && Math.hypot(P.T.x[k], P.T.z[k]) > 21) { j2 = k; break; }
      viser(j2); P.E.action = true; P.step(0.1, 17); out.brosse17 = P.T.vert[j2]; P.step(0.1, 2); out.brosse19 = P.T.vert[j2]; P.E.action = false; P.step(0.016);
      P.figer = false; return out;
    });
    check(b.vise && b.jaugeMi > 0.4 && b.jaugeMi < 0.55 && b.annule, `${cible} : maintenir remplit la jauge sur la tuile (${(b.jaugeMi * 100).toFixed(0)} % à 1,2 s), relâcher annule`);
    check(b.avant === 0 && b.vert === 1 && b.charge === 0.5 && b.valeur === 3 && b.jauge.startsWith('0,5'), `${cible} : 2,5 s au pinceau, la tuile fleurit, tulipe rouge à 3 cr, charge ${b.jauge}`);
    check(b.brosse17 === 0 && b.brosse19 === 1, `${cible} : 1,8 s à la brosse`);
    check(b.ferme && b.ouvre, `${cible} : le secteur 2 reste fermé tant que le 1 n'est pas à 100 %, puis s'ouvre`);
    check(b.credits === 3 && b.vide, `${cible} : E au collecteur vend la charge (${b.credits} cr)`);
    check(b.grise && b.abordable && b.souffleurEnVente && b.outil === 'brosse' && b.reste === 50 && b.slots === 2, `${cible} : tout est en vente dès le départ ; brosse achetée et en main tout de suite`);
    if (cible === 'pc') {
      const a = await page.evaluate(await readFile(join(root, 'tests', 'v9-activites.js'), 'utf8'));
      check(a.desherbe0 && a.desherbe, 'pc : maintenir arrache les chardons, pas avant la fin du geste');
      check(!a.pollAvant && a.irrigue === 1 && a.pollApres && a.tuyau > 5, `pc : tuyau branché à la pompe et déroulé (${a.tuyau} points), la tuile aride devient pollinisable`);
      check(a.ruche && a.ruche29 === 0 && a.ruche31 === 1 && a.niveau === 1 && a.ruche2 === 1, 'pc : ruche achetée et posée tout de suite ; une tuile toutes les 3 s, puis toutes les 2 s une fois améliorée');
      check(a.baliseGain === 100 && a.revelees > 0 && a.doree === a.prixDoree, `pc : balise activée, ${a.revelees} fleurs dorées allumées, une dorée vaut ${a.doree} cr`);
      const o = await page.evaluate(await readFile(join(root, 'tests', 'v9-automatisation.js'), 'utf8'));
      check(o.pose && o.demonte && o.piece === 'rapide', 'pc : outil de construction : pose, démontage, E change de pièce');
      check(o.depart === 1 && o.enCours && o.ecran && o.ligne === 64, `pc : ligne collecteur → extracteur (4 s par lot, écran animé) → quai : +${o.ligne} cr`);
      check(o.niveau === 1 && o.duree === 2.5 && o.niveau3 === 1.5, 'pc : extracteur amélioré : 4 s, puis 2,5 s, puis 1,5 s');
      check(o.borne > 0, `pc : la borne pollinise seule et expédie (+${o.borne} cr)`);
      check(o.possede && o.roule > 20 && o.parVehicule > 10 && o.vide && o.descendu, `pc : pollinisatrice achetée tout de suite, ${o.parVehicule} tuiles en roulant (0,25 s chacune), cuves vidées`);
      check(o.sauve, 'pc : sauvegarde écrite');
      await page.reload(); await page.waitForFunction(() => window.pollen, null, { timeout: 120000 }); await page.waitForTimeout(1500);
      const re = await page.evaluate(() => { const P = window.pollen; return { credits: Math.round(P.S.credits), pieces: P.GRILLE.size, vehicule: P.V.possede, vertes: P.T.vert.reduce((s, v) => s + v, 0), ouverts: P.OUVERTS.value, niveau: [...P.GRILLE.values()].find((p) => p.cle === 'extracteur').niveau }; });
      check(re.credits >= o.credits && re.pieces === o.pieces && re.vehicule && re.vertes >= o.vertes && re.ouverts === 6 && re.niveau === 2, `pc : partie reprise après rechargement (${re.credits} cr, ${re.pieces} pièces, ${re.vertes} tuiles en fleurs)`);
    }
    const shot = await page.screenshot({ timeout: 240000 });
    check(shot.length > 30000, `${cible} : l'image n'est pas vide (${(shot.length / 1024).toFixed(0)} Ko)`);
    check(erreurs.length === 0, `${cible} : console vide${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
    await ctx.close();
  }
} finally { await browser.close(); srv.close(); }
if (fails.length) { console.log(`\n${fails.length} échec(s)`); process.exit(1); }
console.log('\nTout passe.');
