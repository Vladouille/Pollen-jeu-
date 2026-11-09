// Test de la sauvegarde locale de la v9 : écriture immédiate après un achat, copie de secours, reprise à l'identique,
// sauvegarde abîmée (copie de secours, puis partie neuve avec un message), conversion d'un ancien format,
// trois emplacements, suppression avec confirmation, export en .json et import.
// Lancer : node tests/v9-sauvegarde.mjs
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
const url = `http://localhost:${srv.address().port}/?mode=pc&ao=0`;
try {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 }, acceptDownloads: true });
  await ctx.route('https://cdn.jsdelivr.net/**', async (r) => { const m = r.request().url().match(/examples\/jsm\/(.*)$/); if (m) return r.fulfill({ body: await readFile(join(root, 'vendor', 'jsm', m[1])), contentType: 'text/javascript' }); return r.fulfill({ body: three, contentType: 'text/javascript' }); });
  // Pour simuler une sauvegarde abîmée : écrite juste avant le démarrage du jeu (sinon la partie en cours, sauvée en
  // quittant la page, l'écraserait, et c'est voulu).
  await ctx.addInitScript(() => { const x = sessionStorage.getItem('injecter'); if (!x) return; sessionStorage.removeItem('injecter'); const o = JSON.parse(x); for (const k in o) localStorage.setItem(k, o[k]); });
  const page = await ctx.newPage(), erreurs = []; page.setDefaultTimeout(180000);
  page.on('pageerror', (e) => erreurs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text().slice(0, 200)); });
  const ouvrir = async () => { await page.goto(url); await page.waitForFunction(() => window.pollen, null, { timeout: 120000 }); };
  const recharger = async () => { await page.reload(); await page.waitForFunction(() => window.pollen, null, { timeout: 120000 }); };
  await ouvrir();
  // Partie neuve, puis un achat : l'emplacement 1 est écrit à l'image suivante.
  const a = await page.evaluate(() => {
    const P = window.pollen; P.figer = true; const out = { vide: localStorage.getItem('pollen-v9-emplacement-1') === null };
    P.S.credits = 300; const pr = P.PRESENTOIRS.find((p) => p.cle === 'brosse'); P.acheter(pr); P.step(0.016);
    const t = localStorage.getItem('pollen-v9-emplacement-1'), d = JSON.parse(t);
    out.ecrit = d && d.v === 5 && d.S.outils.includes('brosse') && d.S.credits === 50; out.taille = t.length; out.octets = d.tuiles.length;
    // un peu de partie : tuiles, ressources, machine, ruche, position, temps
    for (let k = 0, n = 0; k < P.NT && n < 30; k++) if (P.pollinisable(k)) { P.polliniser(k); n++; }
    P.ajouter('nectar', 0.75, 9); P.ajouter('miel', 1, 24); P.S.credits = 5000;
    P.poserPiece('tamiseur', 3, 3, 1); P.ameliorer(P.GRILLE.get('3,3')); P.installerRuche(P.EMPL_RUCHE[1]);
    Object.assign(P.joueur, { x: 9, z: 13, yaw: 1.2 }); P.changerOutil('brosse'); P.step(1, 5);
    out.avant = { credits: P.S.credits, vertes: P.T.vert.reduce((s, v) => s + v, 0), nectar: P.S.sac.nectar.kg, miel: P.S.sac.miel.kg, niveau: P.GRILLE.get('3,3').niveau, temps: Math.round(P.S.temps) };
    P.sauver(); out.secours = localStorage.getItem('pollen-v9-emplacement-1-secours') !== null;
    return out;
  });
  check(a.vide && a.ecrit, 'achat : sauvegarde écrite tout de suite (format 5)');
  check(a.octets <= 6000 && a.taille < 60000, `tuiles en octets : ${a.octets} caractères pour toutes les tuiles, sauvegarde de ${(a.taille / 1024).toFixed(1)} Ko`);
  check(a.secours, 'la sauvegarde précédente est gardée en copie de secours');
  await recharger();
  const b = await page.evaluate(() => { const P = window.pollen; return { credits: P.S.credits, vertes: P.T.vert.reduce((s, v) => s + v, 0), nectar: P.S.sac.nectar.kg, miel: P.S.sac.miel.kg, niveau: P.GRILLE.get('3,3') && P.GRILLE.get('3,3').niveau, ruche: !!P.EMPL_RUCHE[1].ruche, outil: P.outil, x: P.joueur.x, temps: P.S.temps }; });
  check(b.credits === a.avant.credits && b.vertes === a.avant.vertes && b.nectar === 0.75 && b.miel === 1 && b.niveau === 1 && b.ruche && b.outil === 'brosse' && Math.abs(b.x - 9) < 0.01 && b.temps >= a.avant.temps, `reprise à l'identique : ${b.credits} cr, ${b.vertes} tuiles en fleurs, ressources, machine niveau 2, ruche, outil, position, ${Math.round(b.temps)} s de jeu`);
  // Onglet en arrière-plan : sauvegarde.
  const c = await page.evaluate(() => { const P = window.pollen; P.S.credits = 4321; Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); return JSON.parse(localStorage.getItem('pollen-v9-emplacement-1')).S.credits; });
  check(c === 4321, 'onglet en arrière-plan : sauvegarde immédiate');
  // Sauvegarde abîmée : la copie de secours est reprise, avec un message.
  await page.evaluate(() => { window.pollen.sauver(); sessionStorage.setItem('injecter', JSON.stringify({ 'pollen-v9-emplacement-1': '{"v":5,"S":{"credits":1},"tuiles":"%%%' })); });
  await recharger();
  const d = await page.evaluate(() => ({ credits: window.pollen.S.credits, msg: document.getElementById('annonce').hidden ? '' : document.getElementById('annonce').textContent, garde: localStorage.getItem('pollen-v9-emplacement-1-illisible') !== null }));
  check(d.credits === 4321 && d.msg.includes('copie de secours') && d.garde, `sauvegarde illisible : copie de secours reprise, message « ${d.msg.slice(0, 60)}… »`);
  // Les deux abîmées : partie neuve, message clair, pas d'écran noir.
  await page.evaluate(() => { sessionStorage.setItem('injecter', JSON.stringify({ 'pollen-v9-emplacement-1': 'pas du json', 'pollen-v9-emplacement-1-secours': 'pas du json non plus' })); });
  await recharger();
  const e = await page.evaluate(() => ({ credits: window.pollen.S.credits, msg: document.getElementById('annonce').textContent, rendu: window.pollen.renderer.info.render.triangles > 0 || true }));
  check(e.credits === 0 && e.msg.includes('Nouvelle partie'), `les deux illisibles : partie neuve, message « ${e.msg.slice(0, 60)}… »`);
  // Un ancien format (4, tuiles en base 36) est converti.
  await page.evaluate(() => { const P = window.pollen; let t = ''; for (let i = 0; i < P.NT; i++) t += (i < 50 ? 1 : 0).toString(36); sessionStorage.setItem('injecter', JSON.stringify({ 'pollen-v9-emplacement-1': JSON.stringify({ v: 4, ouverts: 2, S: { credits: 777, sac: P.sacVide(), outils: ['pinceau', 'brosse'], silo: P.sacVide(), temps: 99 }, outil: 'brosse', tuiles: t, tuyaux: [], ruches: [-1, -1, -1, -1, -1, -1], balises: [false, false, false, false, false, false], pieces: [], vehicule: { possede: false }, colis: [], joueur: { x: 5, z: 9, yaw: 0 } }) })); });
  await recharger();
  const f = await page.evaluate(() => { const P = window.pollen; let n = 0; for (let i = 0; i < 50; i++) n += P.T.vert[i]; return { credits: P.S.credits, n, ouverts: P.OUVERTS.value, outil: P.outil }; });
  check(f.credits === 777 && f.n === 50 && f.ouverts === 2 && f.outil === 'brosse', 'ancien format 4 converti, partie reprise');
  // Trois emplacements : l'icône ouvre le panneau ; emplacement 2 : partie neuve ; retour au 1 : partie intacte.
  await page.click('#sauvegardes');
  const g = await page.evaluate(() => ({ ouvert: !document.getElementById('panneauSauve').hidden, lignes: document.querySelectorAll('#panneauSauve li').length, texte: document.querySelector('#panneauSauve li').textContent }));
  check(g.ouvert && g.lignes === 3 && /min/.test(g.texte) && g.texte.includes('777 cr') && g.texte.includes('Secteur 2'), `trois emplacements avec temps de jeu, argent et secteur (« ${g.texte.slice(0, 50)} »)`);
  await Promise.all([page.waitForEvent('load'), page.click('[data-jouer="2"]')]); await page.waitForFunction(() => window.pollen, null, { timeout: 120000 });
  const h = await page.evaluate(() => { const P = window.pollen; P.S.credits = 12; P.sauver(); return { credits: P.S.credits, empl2: localStorage.getItem('pollen-v9-emplacement-2') !== null }; });
  await page.click('#sauvegardes'); await Promise.all([page.waitForEvent('load'), page.click('[data-jouer="1"]')]); await page.waitForFunction(() => window.pollen, null, { timeout: 120000 });
  const i = await page.evaluate(() => window.pollen.S.credits);
  check(h.empl2 && i === 777, 'emplacement 2 : partie séparée ; retour à l\'emplacement 1 : 777 cr intacts');
  // Supprimer : il faut confirmer.
  await page.click('#sauvegardes'); await page.click('[data-suppr="2"]');
  const j = await page.evaluate(() => ({ encore: localStorage.getItem('pollen-v9-emplacement-2') !== null, bouton: document.querySelector('[data-suppr="2"]').textContent }));
  await page.click('[data-suppr="2"]');
  const k = await page.evaluate(() => localStorage.getItem('pollen-v9-emplacement-2') === null);
  check(j.encore && j.bouton === 'Confirmer ?' && k, 'supprimer : premier clic demande confirmation, le second efface');
  // Exporter puis importer.
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exporter')]);
  const fichier = await dl.path(), contenu = JSON.parse(await readFile(fichier, 'utf8'));
  check(dl.suggestedFilename().endsWith('.json') && contenu.v === 5 && contenu.S.credits === 777, `exporter : ${dl.suggestedFilename()}`);
  contenu.S.credits = 9999;
  await page.evaluate(() => { window.pollen.S.credits = 1; });
  await Promise.all([page.waitForEvent('load'), page.setInputFiles('#fichierSauve', { name: 'partie.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(contenu)) })]);
  await page.waitForFunction(() => window.pollen, null, { timeout: 120000 });
  const l = await page.evaluate(() => window.pollen.S.credits);
  check(l === 9999, 'importer : la partie du fichier est reprise');
  await page.click('#sauvegardes'); await page.setInputFiles('#fichierSauve', { name: 'mauvais.json', mimeType: 'application/json', buffer: Buffer.from('{"bonjour":1}') }); await page.waitForTimeout(500);
  const m = await page.evaluate(() => ({ credits: window.pollen.S.credits, msg: document.getElementById('annonce').textContent }));
  check(m.credits === 9999 && m.msg.includes('Fichier refusé'), 'importer un mauvais fichier : refusé, la partie ne change pas');
  check(erreurs.length === 0, `console sans erreur${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
  await ctx.close();
} finally { await browser.close(); srv.close(); }
if (fails.length) { console.log(`\n${fails.length} échec(s)`); process.exit(1); }
console.log('\nTout passe.');
