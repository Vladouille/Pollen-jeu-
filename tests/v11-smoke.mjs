// Test de la v11 : la planète-prairie (39 961 tuiles, douze secteurs, ciel noir et halo), les dix règles de forme
// vérifiables dans le code, la boucle et les huit outils, l'interface à cinq éléments et ses étiquettes, les paliers,
// les machines chiffrées en kg/s et kW, la construction, la carte, la sauvegarde au format 7. Lancer : node tests/v11-smoke.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const three = await readFile(join(root, 'vendor', 'three.module.min.js')), html = await readFile(join(root, 'v11', 'index.html'));
const fails = []; const check = (ok, l) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${l}`); if (!ok) fails.push(l); };
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const srv = createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(0);
const OUTILS = `window.U = (() => { const P = window.pollen, V3 = P.V3;
  const aller = (p, face) => { P.figer = true; if (P.joueur.enVehicule) P.descendre(); P.surSol(p, 0, P.joueur.p); P.joueur.haut.copy(P.joueur.p).normalize(); if (face) P.tangent(P.joueur.p, new V3().subVectors(face, P.joueur.p), P.joueur.f); P.joueur.v.set(0, 0, 0); P.step(0.05, 8); };
  const regarder = (cible) => { P.tangent(P.joueur.p, new V3().subVectors(cible, P.joueur.p), P.joueur.f); const o = P.joueur.p.clone().addScaledVector(P.joueur.haut, 1.7), d = new V3().subVectors(cible, o).normalize(); P.joueur.pitch = Math.asin(d.dot(P.joueur.haut)); P.step(0.016, 2); };
  const dans = (g, x, y, z) => new V3(x, y, z).applyMatrix4(g.matrixWorld);
  const utiliser = (it) => { regarder(it.p); const vu = P.interVise === it; P.E.inter = true; P.step(0.016, 1); return vu; };
  const interPres = (p, filtre) => P.INTER.filter((i) => !filtre || filtre(i)).sort((a, b) => a.p.distanceTo(p) - b.p.distanceTo(p))[0];
  return { aller, regarder, dans, utiliser, interPres }; })();`;
async function ouvrir(ctx, q) {
  await ctx.route('https://cdn.jsdelivr.net/**', async (r) => { const m = r.request().url().match(/examples\/jsm\/(.*)$/); if (m) return r.fulfill({ body: await readFile(join(root, 'vendor', 'jsm', m[1])), contentType: 'text/javascript' }); return r.fulfill({ body: three, contentType: 'text/javascript' }); });
  const page = await ctx.newPage(), erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erreurs.push(m.text().slice(0, 200)); });
  await page.goto(`http://localhost:${srv.address().port}/${q}`, { timeout: 180000 });
  await page.waitForFunction(() => window.pollen, null, { timeout: 180000 }); await page.waitForTimeout(2500);
  await page.evaluate(OUTILS);
  return { page, erreurs };
}
try {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const { page, erreurs } = await ouvrir(ctx, '?mode=pc&neuf');
  // --- 1. La planète-prairie ---
  const pl = await page.evaluate(() => {
    const P = pollen, V3 = P.V3, j = P.joueur; P.figer = true;
    let hmin = 1e9, hmax = -1e9; for (let k = 0; k < 4000; k++) { const d = new V3(Math.sin(k * 1.3), Math.cos(k * 0.7), Math.sin(k * 2.1 + 1)).normalize(); const h = P.sol(d) - P.RP; hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); }
    let allers = 0; for (let k = 0; k < 400; k++) { const id = P.T.id[(k * 97) % P.NT]; if (P.GROS.tuileDe(P.GROS.dirDe(id)) === id) allers++; }
    // la lecture du shader (face, i, j) retombe toujours sur l'état de la bonne tuile
    let faux = 0; for (let n = 0; n < 6000; n++) { const d = new V3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize(); let m = -2, f = 0; for (let k = 0; k < 20; k++) { const t = d.dot(P.ICO[k].cen); if (t > m) { m = t; f = k; } } const w = d.clone().applyMatrix3(P.ICO[f].inv), s = w.x + w.y + w.z, [i, jj] = P.arrondir(w.y / s * 64, w.z / s * 64), k = P.tuileA(d.clone().multiplyScalar(500)); if (k < 0) continue; if (!P.ALIAS[k].some(([a, b, c]) => a === f && b === i && c === jj)) faux++; }
    const r0 = j.p.length(), h0 = j.haut.clone(); U.aller(P.local(0, 40), P.local(0, 80)); P.E.mz = 1; P.step(0.05, 400); P.E.mz = 0; P.step(0.05, 3);
    const colle = Math.abs(j.p.length() - P.sol(j.p.clone().normalize())), angle = h0.angleTo(j.haut);
    return { nt: P.NT, tot: P.secteurs.map((s) => s.total), hmin, hmax, allers, faux, colle, angle, camHaut: P.camera.up.angleTo(j.haut), ouverts: P.OUVERTS.value, mer: !!P.scene.getObjectByName('mer') };
  });
  check(pl.nt > 39000 && pl.nt < 41000 && pl.tot.length === 12 && pl.tot.every((t) => t > 3000), `planète-prairie : ${pl.nt} tuiles, douze secteurs de ${Math.min(...pl.tot)} à ${Math.max(...pl.tot)} tuiles`);
  check(pl.hmin > -2.5 && pl.hmax < 2.5, `relief : de simples ondulations (${pl.hmin.toFixed(1)} à ${pl.hmax.toFixed(1)} m), ni mer ni montagne`);
  check(pl.allers === 400 && pl.faux === 0, 'repérage des tuiles cohérent, et le shader lit toujours l’état de la bonne tuile (aucune face opposée)');
  check(pl.colle < 0.01 && pl.angle > 0.1 && pl.camHaut < 0.01 && pl.ouverts === 1, `marche sur la sphère : verticale tournée de ${(pl.angle * 57.3).toFixed(1)}°, pieds au sol, un secteur ouvert`);
  // --- 2. Les règles de forme (vérifiables dans le code) ---
  const fo = await page.evaluate(() => {
    const P = pollen; let vives = 0, mats = new Set(); const palette = [0xedeae4, 0x2e343a, 0xf08a24, 0x4fd6e3, 0xffffff, 0x000000, 0x0d0f11];
    P.scene.traverse((o) => { if (o.geometry && o.geometry.type === 'BoxGeometry') vives++; });
    P.COLLECTEUR.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) mats.add(m.color.getHex()); });
    const hors = [...mats].filter((c) => !palette.includes(c));
    return { vives, hors: hors.map((c) => c.toString(16)), expo: P.renderer.toneMappingExposure, env: !!P.M.graphite.envMap, ao: P.composer.passes.some((x) => x.constructor.name === 'GTAOPass'), ombre: P.corps.children.filter((c) => c.castShadow).length, outilBas: P.vue.children.length === 1 };
  });
  check(fo.vives === 0 && fo.hors.length === 0, `aucune boîte à arêtes vives ; le collecteur n'a que blanc cassé, charbon, orange et cyan${fo.hors.length ? ' (hors : ' + fo.hors.join(', ') + ')' : ''}`);
  check(fo.expo === 1.1 && fo.env && fo.ao && fo.ombre >= 6 && fo.outilBas, 'rendu : ACES à 1,1, reflets du ciel, occlusion ambiante, ombre du joueur, outil en main');
  // --- 3. La boucle : jauge maintenue, vente, achat ---
  const b = await page.evaluate(() => {
    const P = pollen; U.aller(P.local(0, 46), P.local(0, 80)); P.joueur.pitch = -0.5; P.step(0.016, 3);
    const vise = P.visee && P.visee.k; P.E.action = true; P.step(0.05, 30); const mi = P.SEL.y; P.E.action = false; P.step(0.05, 2); const lache = P.S.tuiles;
    P.E.action = true; P.step(0.05, 52); const fait = P.S.tuiles, kg = P.kgSac(); P.step(0.05, 52); P.E.action = false; P.step(0.05, 2); const deux = P.S.tuiles;
    const charge = document.getElementById('charge').textContent, serie = P.sons.serie;
    const g = P.COMPTOIR; U.aller(U.dans(g, 0, 0, 2.3)); const it = P.INTER.find((i) => i.vente && i.p.distanceTo(P.joueur.p) < 4); U.regarder(it.p); P.step(0.016, 2);
    const etiquette = document.getElementById('etiquette').hidden ? '' : document.getElementById('etTexte').textContent; const vu = U.utiliser(it);
    return { vise, mi, lache, fait, kg, deux, charge, vu, etiquette, cr: P.S.credits };
  });
  check(b.vise >= 0 && b.mi > 0.4 && b.mi < 0.8 && b.lache === 0 && b.fait === 1 && b.kg === 0.5 && b.deux === 2, `pinceau : jauge à ${(b.mi * 100).toFixed(0)} % à mi-course, relâcher annule, 2,5 s par tuile de 8 m`);
  check(b.charge === '1.00 / 12 KG', `charge affichée « ${b.charge} »`);
  check(b.vu && b.etiquette === 'Vendre' && b.cr === 16, `étiquette flottante « E · ${b.etiquette} » et vente à la borne (${b.cr} cr)`);
  const ou = await page.evaluate(() => {
    const P = pollen, out = {}, g = P.COMPTOIR; P.S.credits = 0; P.step(0.05, 10); out.etal = P.ETAL.map((e) => e.etat);
    out.liste = P.ETAL.map((e) => e.cle + ':' + e.prix).join(' ');
    P.S.credits = 3000; P.step(0.05, 10); const e = P.ETAL.find((x) => x.cle === 'large'); U.aller(U.dans(g, e.objet.position.x, 0, -1.3)); const it = P.INTER.filter((i) => i.p.distanceTo(U.dans(g, e.objet.position.x, 1.35 + g.userData.salle.F, -2.85)) < 0.05)[0];
    out.et = it && it.etiquette; out.vu = U.utiliser(it); out.outil = P.outil; out.cr = P.S.credits; out.charge = P.chargeMax();
    U.aller(P.local(10, 46), P.local(10, 80)); P.joueur.pitch = -0.5; P.step(0.016, 3); const t0 = P.S.tuiles; P.E.action = true; P.step(0.05, 25); P.E.action = false; P.step(0.05, 1); out.parGeste = P.S.tuiles - t0;
    for (const o of ['souffleur', 'diffuseur']) P.S.outils.push(o); P.changerOutil('diffuseur'); P.step(0.05, 2); out.groupeDiff = P.groupe.length; P.E.action = true; P.step(0.05, 4); P.E.action = false; P.step(0.05, 1); out.diff = P.S.tuiles - t0 - out.parGeste;
    out.ronds = document.querySelectorAll('#slots button').length; out.actif = document.querySelector('#slots button.actif').dataset.outil;
    return out;
  });
  check(ou.etal.length === 12 && ou.etal[0] === 'acquis' && ou.etal.slice(1).every((x) => x === 'cher'), `établi du comptoir : douze outils exposés, gris translucides sans argent (${ou.liste})`);
  check(/Brosse large · 2 ?500|Brosse large · 2.500/.test(ou.et || '') && ou.vu && ou.outil === 'large' && ou.cr === 500 && ou.charge === 80, `achat immédiat de la brosse large (2 500) : en main, réservoir de ${ou.charge} kg`);
  check(ou.parGeste === 2 && ou.groupeDiff === 20 && ou.diff === 20, `tuiles par geste : 2 à la brosse large, ${ou.diff} au diffuseur en 0,15 s`);
  check(ou.ronds === 4 && ou.actif === 'diffuseur', 'ronds des outils possédés, l’actif cerclé d’orange');
  // --- 4. Les paliers et l'enchaînement ---
  const pa = await page.evaluate(() => {
    const P = pollen, s0 = P.secteurs[0], fetes = []; P.PALIERS.push((s, n) => fetes.push(n));
    let k = 0; while (s0.vert / s0.total < 0.26 && k < P.NT) { if (P.T.sect[k] === 0) P.polliniser(k, 'test'); k++; }
    P.step(0.05, 2); const pulse = document.getElementById('secteur').classList.contains('fin'), pct = document.getElementById('secP').textContent, anneau = +document.querySelector('#anneau .plein').style.strokeDashoffset;
    U.aller(P.local(3, 14)); P.step(0.05, 14); const dist = document.getElementById('dist').textContent;
    P.sons.dernier = -10; P.sons.serie = 0; for (let n = 0; n < 15; n++) { P.sons.pop(); } P.step(0.05, 1); const serie = P.sons.serie, pouls = document.getElementById('charge').classList.contains('serie');
    return { fetes, pulse, pct, anneau, dist, serie, pouls, vague: P.VAGUE_S.value };
  });
  check(pa.fetes.join() === '25' && pa.pulse && pa.vague === 0 && pa.pct === '26 %' && pa.anneau < 90, `palier à 25 % : vague de floraison, nuée, le chiffre pulse (${pa.pct}), l'anneau avance`);
  check(/^\d+ m$/.test(pa.dist), `boussole : distance vers l'objectif (${pa.dist})`);
  check(pa.serie === 12 && pa.pouls, 'enchaînement : le son monte jusqu’à l’octave (12 demi-tons), le compteur de charge pulse');
  // --- 5. Les machines chiffrées et la construction ---
  const co = await page.evaluate(() => {
    const P = pollen, C = P.COLLECTEUR, out = {}, V3 = P.V3;
    U.aller(P.local(8, 12), C.position); P.S.credits = 200000; P.S.outils.push('marteau'); P.changerOutil('pinceau');
    P.E.construire = true; P.step(0.05, 2); out.actif = P.CONS.actif; out.parCat = P.CATEGORIES.map((c, k) => Object.keys(P.PIECES).filter((p) => P.PIECES[p].cat === k).length);
    out.debits = ['collecteur', 'extracteur', 'maturateur', 'raffineur', 'couveuse', 'germoir', 'empoteuse', 'trieuse', 'compacteur', 'convoyeur', 'solaire', 'suiveur', 'batterie'].map((c) => { const d = P.PIECES[c]; return [c, d.debit || d.prod || d.reserve, d.conso || 0, d.prix]; });
    P.E.construire = true; P.step(0.05, 2);
    const az = C.userData.az, id0 = P.tuileDe(C.position.clone().addScaledVector(az, 3.3).normalize()), suite = [id0]; for (let k = 0; k < 7; k++) suite.push(P.voisineVers(suite[k], az));
    for (let k = 0; k < 3; k++) P.poserPiece('convoyeur', suite[k], suite[k + 1]); const ex = P.poserPiece('extracteur', suite[3], suite[4]); P.poserPiece('convoyeur', suite[4], suite[5]); const rec = P.poserPiece('receptionnaire', suite[5], suite[6]);
    out.ecran = (() => { const c = ex.ecran.emissiveMap.image; return c.width; })();
    P.ajouter('pollen', 60, 960); U.aller(U.dans(C, 0, 0, 2.6)); const iv = P.INTER.find((i) => i.vente && i.p.distanceTo(P.joueur.p) < 5); U.regarder(iv.p); P.step(0.016, 1); out.etColl = document.getElementById('etTexte').textContent; U.utiliser(iv);
    for (let a = 0; a < 6.3; a += 0.02) { P.JOUR.angle = a; P.placerSoleil(); if (P.joueur.haut.dot(P.SOLEIL) > 0.8) break; }
    const e0 = P.S.expedie || 0; P.step(0.05, 600); out.sans = ex.courant; out.exp1 = (P.S.expedie || 0) - e0; out.miel1 = (P.DEBITS.miel || []).length;
    const cote = P.voisineVers(P.voisineVers(suite[3], new V3().crossVectors(az, P.joueur.haut)), new V3().crossVectors(az, P.joueur.haut)); const so = P.poserPiece('solaire', cote, P.voisinsDe(cote)[0]);
    P.ajouter('pollen', 60, 960); P.ajouter('pollen', 0, 0); for (const t in P.S.sac) P.ajouter(t, P.S.sac[t].kg, P.S.sac[t].v, P.S.silo); P.S.sac = P.sacVide();
    const e1 = P.S.expedie; P.step(0.05, 300); out.avec = ex.courant; out.prod = P.ENERGIE.prod; out.conso = P.ENERGIE.conso; out.exp2 = P.S.expedie - e1; out.miel = (P.DEBITS.miel || []).length; out.vendu = rec.total;
    // vente au collecteur de la base : un tapis qui y aboutit vend
    const cr = P.S.credits; P.ameliorer(ex); out.niveau = ex.niveau; out.debit2 = P.debitDe(ex); out.paye = cr - P.S.credits; const r0 = P.S.credits; P.demonter(ex); out.rembourse = P.S.credits - r0;
    const bord = P.tuileDe(P.local(0, 50).normalize()), ru = P.poserPiece('ruche0', bord, P.voisinsDe(bord)[0]); out.cibles = ru.ruche.cibles.length;
    const champ = P.poserPiece('collecteur', P.tuileDe(P.local(6, 26).normalize()), P.tuileDe(P.local(6, 30).normalize())); P.ajouter('pollen', 10, 160); U.aller(P.local(6, 23), champ.pos); const ic = champ.inter; U.regarder(ic.p); P.step(0.016, 1); out.etChamp = document.getElementById('etTexte').textContent; U.utiliser(ic); out.stock = champ.stock.reduce((t, c) => t + c.kg, 0);
    return out;
  });
  check(co.actif && co.parCat.join() === '7,12,4,3,5', `mode construction : cinq catégories (${co.parCat.join(' + ')} pièces)`);
  check(co.debits.find((d) => d[0] === 'extracteur').join() === 'extracteur,20,10,1500' && co.debits.find((d) => d[0] === 'batterie')[1] === 400 && co.debits.find((d) => d[0] === 'suiveur')[1] === 60, `machines chiffrées comme le brief : ${co.debits.map((d) => `${d[0]} ${d[1]}`).join(', ')}`);
  check(co.etColl === 'Verser au silo' && co.sans === false && co.exp1 > 0, `sans courant l'extracteur tourne au quart (${co.exp1} cr de miel vendus en 30 s)`);
  check(co.avec && co.prod > 10 && co.conso > 0 && co.exp2 / 15 > co.exp1 / 30 && co.miel > 0 && co.vendu > 0, `avec un poste solaire : ${co.prod.toFixed(0)} kW pour ${co.conso.toFixed(1)} kW, ${co.exp2} cr vendus au dépôt en 15 s, contre ${co.exp1} en 30 s sans courant`);
  check(co.niveau === 1 && co.debit2 === 40 && co.paye === 2250 && co.rembourse === 3750, 'niveau 2 : débit doublé (40 kg/s) ; démonter rembourse achat et amélioration');
  check(co.cibles >= 5 && co.cibles <= 9, `ruche simple : ${co.cibles} tuiles de 8 m dans son rayon`);
  check(co.etChamp === 'Déposer' && co.stock === 10, 'collecteur de champ : « E · Déposer » verse le sac (10 kg)');
  // --- 6. La carte : le globe ---
  const ca = await page.evaluate(() => { const P = pollen; U.aller(P.local(8, 20)); P.E.carte = true; P.step(0.05, 2); const o = { ouverte: P.CARTE.ouverte, dist: P.camera.position.length(), halo: P.HALO.visible, points: P.CARTE.points.length }; P.E.carte = true; P.step(0.05, 2); o.ferme = !P.CARTE.ouverte; return o; });
  check(ca.ouverte && ca.dist > 1200 && ca.halo && ca.points >= 2 && ca.ferme, `carte : le globe vu de ${Math.round(ca.dist)} m, halo d'atmosphère, ${ca.points} points de voyage`);
  // --- 7. La sauvegarde (format 7) ---
  const sv = await page.evaluate(() => { const P = pollen; P.S.credits = 4321; const e = P.etatSauve(); const ok = P.sauver(); return { v: e.v, ok, pieces: e.pieces.length, octets: JSON.stringify(e).length, tuiles: P.T.vert.reduce((a, b) => a + b, 0) }; });
  await page.goto(`http://localhost:${srv.address().port}/?mode=pc`, { timeout: 180000 }); await page.waitForFunction(() => window.pollen, null, { timeout: 180000 }); await page.waitForTimeout(1500);
  const rs = await page.evaluate(() => { const P = pollen; return { cr: P.S.credits, pieces: P.GRILLE.size, vertes: P.T.vert.reduce((a, b) => a + b, 0), palier: P.secteurs[0].palier, outils: P.S.outils.length, stock: [...P.GRILLE.values()].find((p) => p.cle === 'collecteur').stock.reduce((t, c) => t + c.kg, 0) }; });
  check(sv.v === 7 && sv.ok && sv.octets < 80000, `sauvegarde au format ${sv.v} (${(sv.octets / 1024).toFixed(1)} Ko pour ${sv.tuiles} tuiles en fleurs)`);
  check(rs.cr === 4321 && rs.pieces === sv.pieces && rs.vertes === sv.tuiles && rs.palier === 1 && rs.stock === 10, `rechargée : argent, ${rs.pieces} pièces, tuiles, palier et stock du collecteur retrouvés`);
  const perf = await page.evaluate(() => { const P = pollen; P.figer = false; return new Promise((res) => setTimeout(() => res({ tri: P.renderer.info.render.triangles, appels: P.renderer.info.render.calls }), 1500)); });
  console.log(`     (pc : ${(perf.tri / 1000).toFixed(0)} k triangles, ${perf.appels} appels de dessin par image, toutes passes comprises)`);
  check(erreurs.length === 0, `pc : console sans erreur${erreurs.length ? ' : ' + erreurs.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
  // --- 8. Téléphone ---
  const ctxM = await browser.newContext({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true });
  const m = await ouvrir(ctxM, '?mode=mobile&neuf');
  const mo = await m.page.evaluate(() => { const P = pollen; P.S.outils.push('marteau'); return { nom: P.Q.nom, agir: !document.getElementById('agir').hidden }; });
  await m.page.tap('#construire'); await m.page.waitForTimeout(1500);
  const mo2 = await m.page.evaluate(() => ({ actif: pollen.CONS.actif, barre: !document.getElementById('barreCons').hidden }));
  await m.page.tap('#consFermer'); await m.page.waitForTimeout(1200);
  const mo4 = await m.page.evaluate(() => ({ cons: pollen.CONS.actif, tri: pollen.renderer.info.render.triangles, appels: pollen.renderer.info.render.calls }));
  check(mo.nom === 'mobile' && mo.agir && mo2.actif && mo2.barre && !mo4.cons, 'téléphone : bouton d’action, mode construction au doigt');
  console.log(`     (mobile : ${(mo4.tri / 1000).toFixed(0)} k triangles, ${mo4.appels} appels)`);
  check(m.erreurs.length === 0, `mobile : console sans erreur${m.erreurs.length ? ' : ' + m.erreurs.slice(0, 3).join(' | ') : ''}`);
} catch (e) { console.log('ERREUR DU TEST :', e.message); fails.push(e.message); }
await browser.close(); srv.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nv11 : tout passe');
process.exit(fails.length ? 1 : 0);
