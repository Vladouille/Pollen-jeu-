// Test de la v14 (la v10 avec une planète entièrement couverte de parcelles, bâtiments rapprochés, outils et véhicules animés) : la planète (sphère de 500 m, tuiles d'icosaèdre, gravité vers le centre, jour et nuit), les quatre
// intérieurs, le concessionnaire et ses véhicules, le mode construction (cinq catégories, électricité, remboursement),
// la carte-globe et la sauvegarde au format 6. Lancer : node tests/v10-smoke.mjs
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const three = await readFile(join(root, 'vendor', 'three.module.min.js')), html = await readFile(join(root, 'v14', 'index.html'));
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
  await page.evaluate(() => { window.pollen.ELAN.off = true; });   // les vérifications de crédits au centime se font sans élan ; la section « élan » le rallume
  return { page, erreurs };
}
try {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  const { page, erreurs } = await ouvrir(ctx, '?mode=pc&neuf');
  // --- 1. La planète ---
  const pl = await page.evaluate(() => {
    const P = pollen, V3 = P.V3, j = P.joueur; P.figer = true;
    const r0 = j.p.length(), h0 = j.haut.clone(); P.E.mz = 1; U.aller(P.local(0, 61), P.local(0, 100)); P.step(0.05, 400); P.E.mz = 0; P.step(0.05, 5);
    const colle = Math.abs(j.p.length() - P.sol(j.p.clone().normalize())), angle = h0.angleTo(j.haut), camHaut = P.camera.up.angleTo(j.haut);
    let allers = 0; for (let k = 0; k < 300; k++) { const id = P.T.id[(k * 29) % P.NT]; if (P.tuileDe(P.dirDe(id)) === id) allers++; }
    const sommet = P.tuileDe(new V3(-1, (1 + Math.sqrt(5)) / 2, 0).normalize()), penta = P.voisinsDe(sommet).length, hexa = P.voisinsDe(P.T.id[10]).length;
    let couvert = 0; for (let k = 0; k < 4000; k++) { const d = new V3(Math.sin(k), Math.cos(k * 1.7), Math.sin(k * 2.3 + 1)).normalize(); if (P.RP * d.distanceTo(P.BASE.clone().normalize()) < 30 || P.tuileA(d.clone().multiplyScalar(P.RP)) >= 0) couvert++; }   // toute la planète porte des parcelles
    let secteurVide = 0; for (const x of P.secteurs) if (!x.total) secteurVide++;
    const auBord = couvert / 4000;
    const anti = P.BASE.clone().negate(); let sec = null; for (let k = 0; k < 2000 && !sec; k++) { const d = P.deplacer(anti.clone().normalize(), k * 37, k * 0.4); if (P.sol(d) - P.RP > 1) sec = d; }
    U.aller(sec.clone().multiplyScalar(P.RP)); const a0 = j.p.clone(); P.E.mz = 1; P.step(0.05, 60); P.E.mz = 0; const antipode = j.p.distanceTo(a0);
    return { RP: P.RP, r0, colle, angle, camHaut, allers, penta, hexa, auBord, secteurVide, antipode, tour: 2 * Math.PI * P.RP, ouverts: P.OUVERTS.value, nsect: P.SECTEURS.length, nt: P.NT, faces: P.PLANETE.children.length, halo: P.HALO.visible };
  });
  check(pl.RP === 500 && Math.abs(pl.r0 - 500) < 60 && pl.faces === 20, `planète de ${pl.RP} m de rayon (${Math.round(pl.tour)} m de tour), sol en 20 faces d'icosaèdre`);
  check(pl.colle < 0.01 && pl.angle > 0.1 && pl.camHaut < 0.01, `on marche sur la sphère : pieds au sol, verticale tournée de ${(pl.angle * 57.3).toFixed(1)}° après la marche, caméra redressée`);
  check(pl.allers === 300 && pl.penta === 5 && pl.hexa === 6, `tuiles : repérage cohérent (${pl.allers}/300), hexagones à 6 voisines, pentagone à ${pl.penta}`);
  check(pl.auBord === 1 && pl.secteurVide === 0 && pl.antipode > 5, `toute la planète est couverte de parcelles, sans vide ni mer ; on marche aussi aux antipodes (${pl.antipode.toFixed(1)} m)`);
  check(pl.ouverts === pl.nsect && pl.nt > 600000, `plus de secteurs à débloquer : les ${pl.nt} parcelles de la planète sont ouvertes dès le départ`);
  const jn = await page.evaluate(() => {
    const P = pollen; U.aller(P.local(3, 14));
    const regler = (cible) => { for (let a = 0; a < 6.3; a += 0.02) { P.JOUR.angle = a; P.placerSoleil(); if (Math.abs(P.joueur.haut.dot(P.SOLEIL) - cible) < 0.03) break; } P.step(0.016, 2); return { ici: P.JOUR.ici, sun: P.sun.intensity, lampe: P.lampe.intensity, hemi: P.hemi.intensity }; };
    const nuit = regler(-0.6), dodo0 = P.JOUR.ici; const dormi = P.dormir(); P.step(0.016, 2); const matin = P.JOUR.ici; const a0 = P.JOUR.angle; P.step(0.05, 20);
    const jour = regler(0.8); return { nuit, jour, dormi, dodo0, matin, tourne: P.JOUR.angle > a0 || true, refus: P.dormir() };
  });
  check(jn.nuit.ici < 0.05 && jn.nuit.sun < 0.05 && jn.nuit.lampe > 5 && jn.jour.ici > 0.95 && jn.jour.sun > 2 && jn.jour.lampe === 0, `jour et nuit : soleil ${jn.jour.sun.toFixed(1)} le jour, ${jn.nuit.sun.toFixed(2)} la nuit, lampe frontale la nuit`);
  check(jn.dormi && jn.matin > 0.9 && jn.refus === false, 'le lit fait passer la nuit (et refuse en plein jour)');
  // --- 2. La boucle : jauge maintenue, vente à la borne ---
  const b = await page.evaluate(() => {
    const P = pollen; U.aller(P.local(0, 59), P.local(0, 90)); P.joueur.pitch = -0.6; P.step(0.016, 3);
    const vise = P.visee && P.visee.k; P.E.action = true; P.step(0.05, 30); const mi = P.SEL.y; P.E.action = false; P.step(0.05, 2); const lache = P.S.tuiles;
    P.E.action = true; P.step(0.05, 56); P.E.action = false; P.step(0.05, 2); const fait = P.S.tuiles, kg = P.kgSac();
    const g = P.COMPTOIR, F = g.userData.salle.F; U.aller(U.dans(g, 0, 0, 2.3)); const it = P.INTER.find((i) => i.vente && i.p.distanceTo(P.joueur.p) < 4), vu = U.utiliser(it);
    return { vise, mi, lache, fait, kg, vu, cr: P.S.credits, ventes: P.S.ventes, dedans: !!P.DEDANS.salle, lampe: P.lampeSalle.intensity, F };
  });
  check(b.vise >= 0 && b.mi > 0.4 && b.mi < 0.8 && b.lache === 0 && b.fait === 1 && b.kg === 0.5, `pollinisation maintenue : jauge à ${(b.mi * 100).toFixed(0)} % à mi-course, relâcher annule, 2,5 s font une tuile (0,5 kg)`);
  check(b.vu && b.cr === 3 && b.ventes === 1 && b.dedans, `on entre dans le comptoir et la borne de vente paie (${b.cr} cr)`);
  // --- 3. Les intérieurs ---
  const it = await page.evaluate(() => {
    const P = pollen, out = {};
    out.salles = ['STATION', 'COMPTOIR', 'ATELIER', 'LABO'].map((n) => { const g = P[n], S = g.userData.salle; U.aller(U.dans(g, 0.3, 0, S.D / 2 + 1.5)); P.step(0.05, 30); const porte = S.ouverture; U.aller(U.dans(g, 0.3, 0, S.D / 2 - 1.2)); P.step(0.05, 30); return { n, porte, dedans: P.DEDANS.salle === S, lampe: P.lampeSalle.intensity, decor: S.decor, sur: P.joueur.sur }; });
    // l'établi du comptoir : neuf outils (le tuyau d'irrigation a disparu avec l'eau), gris translucides quand on ne peut pas se les offrir
    const g = P.COMPTOIR; U.aller(U.dans(g, -3.9, 0, -1.4)); P.S.credits = 0; P.step(0.05, 10);
    out.etal = P.ETAL.map((e) => e.etat); P.S.credits = 300; P.step(0.05, 10); out.etal2 = P.ETAL.map((e) => e.etat);
    const brosse = P.ETAL.find((e) => e.cle === 'brosse'), ib = U.interPres(U.dans(g, brosse.objet.position.x, 1.4, -2.85)); out.vuBrosse = U.utiliser(ib); out.outils = P.S.outils.slice(); out.crApres = P.S.credits; out.enMain = P.outil;
    // l'atelier : cinq catégories
    const a = P.ATELIER; U.aller(U.dans(a, 2.5, 0, -1.7)); P.S.credits = 1000; P.step(0.05, 10); const ia = U.interPres(U.dans(a, 4.1, 1.5, -1.7)); out.vuAtelier = U.utiliser(ia); out.sac = P.chargeMax(); out.crAtelier = P.S.credits; out.terminaux = P.TERMINAL_ATELIER.length; out.cats = Object.keys(P.AMELIOS);
    P.step(0.05, 30); out.medaillons = P.MEDAILLONS.length; out.succes = Object.keys(P.S.succes).length;
    return out;
  });
  check(it.salles.every((s) => s.dedans && s.porte > 0.8 && s.lampe > 5 && s.decor >= 6 && s.sur > 0.1), `quatre bâtiments où l'on entre : portes ouvertes à l'approche, pièce éclairée, ${it.salles.map((s) => s.decor).join('/')} objets de décor`);
  check(it.etal.length === 9 && it.etal[0] === 'acquis' && it.etal.slice(1).every((e) => e === 'cher') && it.etal2.filter((e) => e === 'abordable').length === 3, `établi du comptoir : neuf outils exposés, gris translucides sans argent, ${it.etal2.filter((e) => e === 'abordable').length} abordables à 300 cr`);
  check(it.vuBrosse && it.outils.includes('brosse') && it.crApres === 50 && it.enMain === 'brosse', 'achat immédiat de la brosse sur l’établi (250 cr), elle est en main');
  check(it.vuAtelier && it.terminaux === 5 && it.sac === 18 && it.crAtelier === 600, `atelier : cinq catégories (${it.cats.join(', ')}), le sac passe à ${it.sac} kg`);
  check(it.medaillons === 8 && it.succes >= 1, `station : huit médaillons, ${it.succes} succès obtenu(s)`);
  // --- 3 bis. Dans le hall, on marche (vraie physique) jusqu'à chaque pièce, et entre les plateformes du garage ---
  const mh = await page.evaluate(() => {
    const P = pollen, H = P.HALL, V3 = P.V3, pt = (x, z) => U.dans(H, x, 0, z);
    const marcher = (chemin) => { U.aller(pt(...chemin[0])); P.figer = false; let k = 1, n = 0; while (k < chemin.length && n++ < 1500) { const c = pt(...chemin[k]); P.tangent(P.joueur.p, new V3().subVectors(c, P.joueur.p), P.joueur.f); P.E.mz = 1; P.step(0.05, 1); const d = P.joueur.p.clone().sub(c); d.addScaledVector(P.joueur.haut, -d.dot(P.joueur.haut)); if (d.length() < 0.5) k++; } P.E.mz = 0; P.step(0.05, 2); return k >= chemin.length; };
    const pieces = [['ATELIER', 6.5, -1.7], ['LABO', 15.5, -1.7], ['STATION', -3.5, -0.7], ['COMPTOIR', -14.5, -1.7]].map(([nom, x, zp]) => marcher([[-3, 11], [-3, 6.5], [-3, 1.3], [x, 1.3], [x, zp + 0.6], [x, zp - 2.2]]) && P.DEDANS.salle === P[nom].userData.salle);
    const passages = [0, 1, 2, 3].map((n) => { const x = 10.4 - 4.6 + n * 3.3 + 1.65; return marcher([[x, 7], [x, 4], [x, 1.2], [x, 0.9]]); });
    return { pieces, passages };
  });
  check(mh.pieces.every(Boolean) && mh.passages.every(Boolean), `à pied depuis la porte du hall : les quatre pièces atteintes (${mh.pieces}) ; on passe entre les plateformes du garage (${mh.passages})`);
  // --- 3 ter. L'élan : multiplicateur, niveaux, contrats, bourrasque, nombres qui s'envolent ---
  const el = await page.evaluate(() => {
    const P = pollen, out = {}; P.ELAN.off = false; P.ELAN.n = 0; P.figer = true;
    const ks = []; for (let k = 0; ks.length < 40; k++) { const i = (k * 7919 + 13) % P.NT; if (P.pollinisable(i)) ks.push(i); }
    const prix = (k) => P.VARIETES[P.SECTEURS[P.T.sect[k]].variete].prix;
    const n0 = P.S.niveau, cr0 = P.S.credits;
    out.v1 = P.polliniser(ks[0], 'joueur') / prix(ks[0]);
    for (let n = 1; n < 25; n++) P.polliniser(ks[n], 'joueur');
    out.v26 = P.polliniser(ks[25], 'joueur') / prix(ks[25]); out.n = P.ELAN.n;
    out.niveau = P.S.niveau - n0; out.prime = P.S.credits - cr0;
    P.step(0.05, 4); out.flottants = [...document.querySelectorAll('#flottants span')].filter((e) => +e.style.opacity > 0).length;
    out.hud = !document.getElementById('progression').hidden && document.querySelectorAll('#contrats li').length; out.elanVisible = document.getElementById('elan').classList.contains('actif');
    P.step(0.05, 70); out.retombe = P.ELAN.n;
    out.genres = P.S.contrats.map((c) => c.g); const c0 = P.S.contrats[0], crc = P.S.credits; P.progresser(c0.g, c0.but, c0.g === 'elan'); out.paye = P.S.credits - crc >= c0.cr; P.step(0.05, 40); out.remplace = P.S.contrats[0] !== c0 && !P.S.contrats[0].fait;
    P.BOURRASQUE.prochaine = 0; P.step(0.05, 2); out.bourrasque = P.BOURRASQUE.fin > 0 && !document.getElementById('bandeau').hidden; P.ELAN.n = 0; P.ELAN.t = -10;
    out.vB = P.polliniser(ks[30], 'joueur') / prix(ks[30]); P.BOURRASQUE.fin = -1;
    out.achat = P.prochainAchat(); P.ELAN.off = true; return out;
  });
  check(el.v1 >= 1 && el.v1 < 1.1 && el.v26 >= 1.9 && el.retombe === 0, `élan : ×${el.v1.toFixed(2)} à la première parcelle, ×${el.v26.toFixed(2)} à la 26e enchaînée, retombe à 0 après une pause`);
  check(el.niveau >= 1 && el.prime > 0 && el.flottants > 0 && el.hud === 4 && el.elanVisible, `niveau +${el.niveau} (prime ${el.prime} cr), ${el.flottants} nombres qui s'envolent, trois contrats et le prochain achat à l'écran`);
  check(new Set(el.genres).size === 3 && el.paye && el.remplace, `contrats : trois genres différents (${el.genres.join(', ')}), un contrat rempli paie et un nouveau le remplace`);
  check(el.bourrasque && el.vB >= 2, `bourrasque de pollen : bandeau, la parcelle vaut ×${el.vB.toFixed(2)} ; prochain achat : ${el.achat && el.achat.nom}`);
  // --- 4. Le concessionnaire et les véhicules ---
  const ve = await page.evaluate(() => {
    const P = pollen, g = P.CONCESSION, S = g.userData.salle, out = {};
    U.aller(U.dans(g, 0.3, 0, S.D / 2 - 1.5)); P.step(0.05, 20); out.dedans = P.DEDANS.salle === S; out.modeles = Object.keys(P.VEHICULES); out.prix = out.modeles.map((c) => P.VEHICULES[c].prix);
    P.S.credits = 100; out.refus = P.acheterVehicule('chariot');
    P.S.credits = 5000; const ib = U.interPres(U.dans(g, -4.6, 1.4, 2.35), (i) => !i.cache); U.aller(U.dans(g, -4.6, 0, 3.9)); out.vuBorne = U.utiliser(ib); out.possede = P.FLOTTE.chariot.possede; out.cr = P.S.credits;
    let porte = 0, n = 0; while (P.SORTIE.v && n++ < 900) { P.step(0.05, 1); porte = Math.max(porte, S.porte); }
    out.porte = porte; out.sorti = !P.SORTIE.v; out.auVolant = P.joueur.enVehicule === P.FLOTTE.chariot; out.distParvis = P.FLOTTE.chariot.p.distanceTo(g.position); P.step(0.05, 60); out.referme = S.porte;
    // améliorer le moteur : le modèle change
    const v = P.FLOTTE.chariot, compte = () => { let c = 0; v.g.traverse((o) => { if (o.isMesh) c += o.geometry.attributes.position.count; }); return c; }; P.descendre(); P.step(0.05, 1); const avant = compte();   // sans le pilote, qui descend avec nous
   
    const im = P.INTER.filter((i) => i.cache && i.p.distanceTo(U.dans(g, -4.9, 0.66, 2.39)) < 0.05)[0]; U.aller(U.dans(g, -4.6, 0, 3.6)); out.vuAmelio = U.utiliser(im); out.moteur = v.niv.moteur; out.plus = compte() > avant; out.crAmelio = P.S.credits;
    // au volant du chariot : il pollinise la tuile qu'il pousse
    v.p.copy(P.local(0, 58)); v.f.copy(P.tangent(v.p, new P.V3().subVectors(P.local(0, 90), v.p))); P.monter(v); const t0 = P.S.tuiles; P.E.mz = 1; P.step(0.05, 240); P.E.mz = 0; P.step(0.05, 10);
    out.tuiles = P.S.tuiles - t0; out.charge = v.charge; out.avance = v.p.distanceTo(P.local(0, 58)); out.pastille = document.getElementById('nomOutil').textContent;
    // retour au collecteur : garé sur le repère, E vide les cuves
    v.p.copy(P.PARKING.p); P.step(0.05, 2); const cr0 = P.S.credits; out.vert = P.parkingVert(); P.E.inter = true; P.step(0.05, 1); out.vendu = P.S.credits - cr0; P.E.inter = true; P.step(0.05, 1); out.descendu = !P.joueur.enVehicule;
    return out;
  });
  check(ve.dedans && ve.modeles.length === 7 && ve.prix.join() === '900,4000,18000,35000,90000,250000,750000', `concessionnaire : sept véhicules (${ve.prix.join(', ')} cr)`);
  check(ve.refus === false && ve.vuBorne && ve.possede && ve.cr === 4100, 'achat à la borne : refusé sans argent, immédiat avec');
  check(ve.porte > 0.85 && ve.sorti && ve.auVolant && ve.distParvis < 16 && ve.referme < 0.2, `la porte sectionnelle s'ouvre, le véhicule sort se garer sur le parvis, on est au volant, la porte se referme`);
  check(ve.vuAmelio && ve.moteur === 1 && ve.plus && ve.crAmelio === 4100 - 135, 'amélioration du moteur : achetée à la borne, visible sur le véhicule');
  check(ve.tuiles >= 3 && ve.charge >= 1.5 && ve.avance > 8 && ve.pastille === 'Chariot pousseur', `le chariot pollinise en roulant (${ve.tuiles} tuiles, ${ve.charge} kg)`);
  check(ve.vert && ve.vendu > 0 && ve.descendu, `garé au collecteur : repère vert, E vide les cuves (+${ve.vendu} cr), E encore fait descendre`);
  // --- 4 bis. Le haut de gamme et la vue extérieure au volant ---
  const hg = await page.evaluate(() => {
    const P = pollen, V3 = P.V3, out = {}; P.S.credits = 1e6; P.figer = false;
    out.achat = P.acheterVehicule('aeroglisseur'); let n = 0; while (P.SORTIE.v && n++ < 1200) P.step(0.05, 1);
    const v = P.FLOTTE.aeroglisseur; out.auVolant = P.joueur.enVehicule === v; out.parc = v.p.distanceTo(P.placeParvis('aeroglisseur'));
    v.p.copy(P.surSol(P.local(30, 80))); v.f.copy(P.tangent(v.p, new V3().subVectors(P.local(30, 140), v.p))); P.joueur.f.copy(v.f); P.poserVehicule(v); P.step(0.05, 20);
    const up = v.p.clone().normalize(), d = P.camera.position.clone().sub(v.p); out.derriere = d.dot(v.f); out.hauteur = d.dot(up);
    out.pilote = v.g.userData.caisse.children.some((o) => o.children.length > 8); out.ext = document.getElementById('jeu').classList.contains('ext');
    P.E.vueVeh = true; P.step(0.05, 2); out.cabine = P.camera.position.distanceTo(P.joueur.p) < 2.2; P.E.vueVeh = true; P.step(0.05, 2);
    const t0 = P.S.tuiles; P.E.mz = 1; P.step(0.05, 200); P.E.mz = 0; P.step(0.05, 10); out.tuiles = P.S.tuiles - t0;
    P.descendre(); P.step(0.05, 2); out.sortiExt = !document.getElementById('jeu').classList.contains('ext'); return out;
  });
  check(hg.achat && hg.auVolant && hg.parc < 1, `aéroglisseur à rampe (750 000 cr) : il sort se garer à son parc, on est au volant`);
  check(hg.derriere < -3 && hg.hauteur > 2 && hg.pilote && hg.ext && hg.cabine && hg.sortiExt, `vue extérieure au volant : caméra ${(-hg.derriere).toFixed(1)} m derrière et ${hg.hauteur.toFixed(1)} m au-dessus, pilote visible ; C passe en vue cabine`);
  check(hg.tuiles > 200, `l'aéroglisseur pollinise ${hg.tuiles} parcelles en 10 s`);
  // --- 4 ter. Pleine vitesse, rappel, véhicule perdu ---
  const pv = await page.evaluate(() => {
    const P = pollen, V3 = P.V3, out = {}; P.S.credits = 1e6; P.figer = false;
    P.acheterVehicule('pollinisatrice'); let n = 0; while (P.SORTIE.v && n++ < 1200) P.step(0.05, 1);
    const v = P.FLOTTE.pollinisatrice; v.niv.moteur = 3; P.refaireVehicule(v);
    v.p.copy(P.surSol(P.local(-40, 60))); v.f.copy(P.tangent(v.p, new V3().subVectors(P.local(-40, 160), v.p))); P.joueur.f.copy(v.f); P.poserVehicule(v);
    const t0 = P.S.tuiles, p0 = v.p.clone(); let vmax = 0; P.E.mz = 1; for (let k = 0; k < 240; k++) { P.step(0.05, 1); vmax = Math.max(vmax, v.v); } P.E.mz = 0; P.step(0.05, 10);
    out.vmax = vmax; out.parMetre = (P.S.tuiles - t0) / v.p.distanceTo(p0);
    P.descendre(); U.aller(P.local(60, 40)); P.step(0.05, 2); out.loin = v.p.distanceTo(P.joueur.p); P.E.rappel = true; P.step(0.05, 2); out.pres = v.p.distanceTo(P.joueur.p);
    v.p.copy(P.joueur.p).addScaledVector(P.joueur.haut, 200); P.step(0.05, 50); out.garde = Math.abs(v.p.length() - P.sol(v.p.clone().normalize()));
    return out;
  });
  check(pv.vmax > 10 && pv.parMetre > 0.8, `à pleine vitesse (${pv.vmax.toFixed(1)} m/s), la pollinisatrice pollinise toujours : ${pv.parMetre.toFixed(2)} parcelle par mètre`);
  check(pv.loin > 100 && pv.pres < 12 && pv.garde < 0.5, `jamais perdu : V fait venir le véhicule (${Math.round(pv.loin)} m → ${pv.pres.toFixed(1)} m), un véhicule hors du sol revient seul`);
  // --- 4 quater. Le camion, le grand garage, la boussole, la toiture, les robots, les pilotes, la recherche, les saisons ---
  const eq = await page.evaluate(() => {
    const P = pollen, V3 = P.V3, out = {}; P.S.credits = 5e7; P.figer = false;
    const it = (re) => P.INTER.find((i) => { try { return re.test(i.etiquette || ''); } catch (e) { return false; } });
    // le camion : on monte dedans et il pollinise avec sa rampe arrière
    P.acheterVehicule('transporteur'); let n = 0; while (P.SORTIE.v && n++ < 1200) P.step(0.05, 1); const ca = P.FLOTTE.transporteur; out.camion = P.joueur.enVehicule === ca;
    ca.p.copy(P.surSol(P.local(-60, 90))); ca.f.copy(P.tangent(ca.p, new V3().subVectors(P.local(-60, 180), ca.p))); P.joueur.f.copy(ca.f); P.poserVehicule(ca);
    const t0 = P.S.tuiles; P.E.mz = 1; P.step(0.05, 160); P.E.mz = 0; P.step(0.05, 4); out.camionTuiles = P.S.tuiles - t0;
    // le grand garage : la borne « Rappeler » le gare dans sa baie, sous le toit
    P.descendre(); P.rappeler(ca, false); const dh = ca.p.clone().sub(P.HANGAR.position); out.baie = Math.abs(dh.dot(P.HANGAR.userData.ax)) < 15 && Math.abs(dh.dot(P.HANGAR.userData.az)) < 6.5;
    // la boussole montre la base quand on est loin
    U.aller(P.local(0, 120)); P.step(0.05, 3); out.boussole = getComputedStyle(document.getElementById('repBase')).display !== 'none' && /Base \d+/.test(document.getElementById('distBase').textContent);
    // la toiture : trois niveaux, des panneaux sur les toits, le surplus vendu
    for (let k = 0; k < 3; k++) it(/^Panneaux/).agir(); out.toit = P.S.toit; for (let a = 0; a < 6.3; a += 0.02) { P.JOUR.angle = a; P.placerSoleil(); if (P.BASE.clone().normalize().dot(P.SOLEIL) > 0.8) break; }
    const e0 = P.S.expedie || 0; P.step(0.05, 100); out.toitProd = P.TOIT.prod; out.toitVendu = (P.S.expedie || 0) - e0;
    // les robots : ils sortent du hall et vendent ce qu'ils pollinisent
    for (let k = 0; k < 5; k++) it(/^Robot \(/).agir(); out.robots = P.S.robots; const rv0 = P.S.robotVendu || 0; P.step(0.05, 900); out.robotVendu = (P.S.robotVendu || 0) - rv0; out.robotsLoin = P.ROBOTS.filter((r) => r.p.distanceTo(P.BASE) > P.RB).length;
    // le pilote automatique : la pollinisatrice part seule et vend
    const po = P.FLOTTE.pollinisatrice; if (!po.possede) { P.acheterVehicule('pollinisatrice'); n = 0; while (P.SORTIE.v && n++ < 1200) P.step(0.05, 1); } if (P.joueur.enVehicule) P.descendre();
    const pi = P.INTER.find((i) => i.cache && !i.cache() && /Pilote auto/.test(i.etiquette || '') && i.p.distanceTo(P.CONCESSION.position) < 30 && Math.abs(i.p.distanceTo(P.monde(P.CONCESSION, -4.6 + 2 * 3.3, 0, 0))) < 4);
    pi.agir(); out.pilote = !!(po.pilote && po.pilote.actif); const pt0 = P.S.tuiles; U.aller(P.local(-20, 5)); P.step(0.05, 1200); out.piloteTuiles = P.S.tuiles - pt0; out.piloteLoin = po.p.distanceTo(P.BASE) > P.RB;
    // la recherche : le prix double à chaque niveau, la valeur des parcelles monte
    const m0 = P.multSaison(), pr0 = P.prixRobot(0); it(/^Parcelles \+5/).agir(); out.rech = P.S.rech.valeur === 1 && Math.abs(P.multSaison() / m0 - 1.05) < 1e-6 && /100 000/.test(it(/^Parcelles \+5/).etiquette);
    // les saisons : refusée sous le seuil ; au-dessus, la planète fane et les parcelles valent 50 % de plus
    P.S.saison = 0; const vert = P.PLANETE_PROG.vert, seuil = P.seuilSaison(); out.refus = vert / P.NT >= seuil || !P.cloreSaison();
    for (let i = 0, k = 0; P.PLANETE_PROG.vert / P.NT < seuil && k < P.NT; k++) if (P.pollinisable(k)) P.polliniser(k, 'test');
    out.saison = P.cloreSaison() && P.S.saison === 1 && P.PLANETE_PROG.vert === 0 && P.T.vert.every((x) => x === 0) && Math.abs(P.multSaison() / m0 - 1.5 * 1.05) < 1e-6;
    // une sauvegarde au format 8 (esplanade de 28 m) : ses parcelles retrouvent leur place
    const anciens = P.listeIds(28), i8 = anciens.length - 7, o8 = new Uint8Array(anciens.length); o8[i8] = 1; const d9 = P.convertir({ v: 8, date: 1, temps: 0, S: { credits: 5 }, tuiles: P.octetsEnTexte(o8) });
    out.conversion = d9.v === 9 && P.octetsDesTuiles(d9.tuiles)[P.IDX.get(anciens[i8])] === 1 && anciens.length > P.NT;
    return out;
  });
  check(eq.conversion, 'sauvegarde au format 8 convertie : les parcelles gardent leur état sur la nouvelle esplanade de 50 m');
  check(eq.camion && eq.camionTuiles > 20, `le camion : on monte dedans, sa rampe arrière pollinise (${eq.camionTuiles} parcelles en 8 s)`);
  check(eq.baie && eq.boussole, 'grand garage : « Rappeler » gare le véhicule dans sa baie ; la boussole montre la base et sa distance');
  check(eq.toit === 3 && eq.toitProd > 100 && eq.toitVendu > 0, `toiture solaire : trois niveaux, ${Math.round(eq.toitProd)} kW au soleil, ${eq.toitVendu} cr de surplus vendus en 5 s`);
  check(eq.robots === 5 && eq.robotVendu > 0 && eq.robotsLoin > 0, `robots ouvriers : ${eq.robots} sortis du hall, ${eq.robotVendu} cr récoltés en 45 s`);
  check(eq.pilote && eq.piloteTuiles > 50 && eq.piloteLoin, `pilote automatique : la pollinisatrice part seule (${eq.piloteTuiles} parcelles en 1 min)`);
  check(eq.rech && eq.refus && eq.saison, 'recherche : +5 % par niveau, prix doublé ; saison close au seuil : la planète fane, ×1,5 pour toujours');
  // --- 5. Le mode construction ---
  const co = await page.evaluate(() => {
    const P = pollen, C = P.COLLECTEUR, out = {}, V3 = P.V3;
    U.aller(P.local(-6, 20), P.local(-6, 30)); P.S.credits = 20000;
    P.E.construire = true; P.step(0.05, 2); out.sansMarteau = P.CONS.actif; P.S.outils.push('marteau'); P.E.construire = true; P.step(0.05, 2);
    out.actif = P.CONS.actif; out.barre = !document.getElementById('barreCons').hidden; out.bleu = P.SOL_U.uCons.value; out.cats = P.CATEGORIES; out.parCat = P.CATEGORIES.map((c, k) => Object.keys(P.PIECES).filter((p) => P.PIECES[p].cat === k).length);
    P.E.outil = 2; P.step(0.05, 1); out.cat3 = P.CONS.cat; P.E.inter = true; P.step(0.05, 1); out.suivante = P.CONS.piece; P.E.outil = 0; P.step(0.05, 1);
    // fantôme : vert sur une tuile libre, rouge avec sa raison sinon
    P.joueur.pitch = -0.5; P.step(0.05, 2); out.cible = !!P.CONS.cible && P.CONS.cible.ok; const r0 = P.CONS.rot; P.E.molette = 1; P.step(0.05, 1); out.tourne = P.CONS.rot !== r0;
    P.E.presse = true; P.step(0.05, 1); out.pose = P.GRILLE.size; out.cr1 = P.S.credits; P.step(0.05, 1); P.E.presse = true; P.step(0.05, 1); out.resteSansSuppr = P.GRILLE.size; P.E.suppr = true; P.step(0.05, 1); out.modeSuppr = P.CONS.suppr; P.E.presse = true; P.step(0.05, 1); out.demonte = P.GRILLE.size; out.cr2 = P.S.credits; P.E.suppr = true; P.step(0.05, 1);
    // raisons de refus
    const az = C.userData.az, id0 = P.tuileDe(C.position.clone().addScaledVector(az, 3.3).normalize()), suite = [id0]; for (let k = 0; k < 7; k++) suite.push(P.voisineVers(suite[k], az));
    const mer = suite[2];   // plus de mer : toute la planète est en parcelles
    out.raisons = { batiment: P.raisonRefus('convoyeur', P.tuileDe(U.dans(P.HALL, -12, 0, 0.5).normalize()), suite[1]) };
    P.S.credits = 5; out.raisons.argent = P.raisonRefus('convoyeur', suite[0], suite[1]); P.S.credits = 20000;
    P.E.construire = true; P.step(0.05, 2); out.ferme = !P.CONS.actif && document.getElementById('barreCons').hidden && P.SOL_U.uCons.value === 0;
    // une ligne : collecteur → 3 convoyeurs → extracteur → convoyeur → réceptionnaire
    for (let k = 0; k < 3; k++) P.poserPiece('convoyeur', suite[k], suite[k + 1]); const ex = P.poserPiece('extracteur', suite[3], suite[4]); P.poserPiece('convoyeur', suite[4], suite[5]); const rec = P.poserPiece('receptionnaire', suite[5], suite[6]);
    out.raisons.occupe = P.raisonRefus('convoyeur', suite[0], suite[1]); out.departs = P.departs().length;
    P.ajouter('pollen', 6, 60); U.aller(U.dans(C, 0, 0, 2.6)); const iv = P.INTER.find((i) => i.vente && i.p.distanceTo(P.joueur.p) < 5); out.vuColl = U.utiliser(iv); out.silo = P.kgSac(P.S.silo); out.sacVide = P.kgSac();
    for (let a = 0; a < 6.3; a += 0.02) { P.JOUR.angle = a; P.placerSoleil(); if (P.joueur.haut.dot(P.SOLEIL) > 0.8) break; }
    const e0 = P.S.expedie || 0; P.step(0.05, 500); out.sansCourant = ex.courant; out.arretees = P.ENERGIE.arretees.length; out.capsules = P.CAPSULES.length; out.exp1 = (P.S.expedie || 0) - e0;
    // l'électricité : un poste solaire à côté
    const cote = P.voisineVers(P.voisineVers(suite[3], new V3().crossVectors(az, P.joueur.haut)), new V3().crossVectors(az, P.joueur.haut)); P.poserPiece('solaire', cote, P.voisinsDe(cote)[0]); P.step(0.05, 700);
    out.courant = ex.courant; out.prod = P.ENERGIE.prod; out.conso = P.ENERGIE.conso; out.exp2 = (P.S.expedie || 0) - e0; out.total = rec.total; out.debit = (P.DEBITS.extrait || []).length;
    // démonter rembourse tout (achat et amélioration)
    const cr = P.S.credits; P.ameliorer(ex); const paye = cr - P.S.credits; P.demonter(ex); out.rembourse = P.S.credits - cr; out.paye = paye;
    // ruche simple : rayon d'une tuile ; elle pollinise seule
    const bord = P.tuileDe(P.local(0, 60).normalize()), ru = P.poserPiece('ruche0', bord, P.voisinsDe(bord)[0]); out.cibles = ru.ruche.cibles.length; const t0 = P.S.tuiles; P.step(0.05, 400); out.parRuche = P.S.tuiles - t0;
    const mere = P.poserPiece('ruche2', P.tuileDe(P.local(4, 61).normalize()), bord); out.ciblesMere = mere.ruche.cibles.length; P.demonter(mere);
    // revenus automatiques : ruche → convoyeurs → réceptionnaire ; pollinisateur → convoyeur → réceptionnaire
    const ligne = (x0, z0, n) => { const vec = P.tangent(P.local(x0, z0), new V3().subVectors(P.local(x0, z0 + 30), P.local(x0, z0))), t = [P.tuileDe(P.local(x0, z0).normalize())]; for (let k = 1; k <= n; k++) t.push(P.voisineVers(t[k - 1], vec)); return t; };
    const la = ligne(-14, 67, 5), ru2 = P.poserPiece('ruche1', la[0], la[1]); P.poserPiece('convoyeur', la[1], la[2]); P.poserPiece('convoyeur', la[2], la[3]); const re1 = P.poserPiece('receptionnaire', la[3], la[4]); ru2.ruche.miel = 6; ru2.ruche.cire = 2;
    const lb = ligne(14, 67, 4), po = P.poserPiece('pollinisateur', lb[0], lb[1]); P.poserPiece('convoyeur', lb[1], lb[2]); const re2 = P.poserPiece('receptionnaire', lb[2], lb[3]);
    P.step(0.05, 1200); out.venteRuche = Math.round(re1.total || 0); out.ventePoll = Math.round(re2.total || 0); out.mielReste = ru2.ruche.miel;
    const lc = ligne(30, 67, 1), seul = P.poserPiece('pollinisateur', lc[0], lc[1]), cs = P.S.credits; P.step(0.05, 400); out.seul = Math.round(seul.total || 0); out.gainSeul = P.S.credits - cs;
    return out;
  });
  check(co.sansMarteau === false && co.actif && co.barre && co.bleu === 1, 'mode construction : une touche (B), le monde bleuit, la barre apparaît (il faut l’outil de construction)');
  check(co.cats.length === 5 && co.parCat.join() === '7,9,5,4,6', `cinq catégories (${co.cats.join(', ')}) : ${co.parCat.join(' + ')} pièces`);
  check(co.cat3 === 2 && co.suivante === 'double' && co.cible && co.tourne, 'chiffres pour la catégorie, E pour la pièce suivante, molette pour tourner, fantôme vert sur une tuile libre');
  check(co.pose === 1 && co.resteSansSuppr === 1 && co.modeSuppr && co.demonte === 0 && co.cr1 === 19980 && co.cr2 === 20000, 'clic : pose (−20 cr) ; un clic sur une pièce posée ne la casse plus ; mode Supprimer (X) : elle part, remboursée entièrement');
  check(/bâtiment/.test(co.raisons.batiment) && /Crédits/.test(co.raisons.argent) && /occupé/.test(co.raisons.occupe), `raisons du refus : « ${co.raisons.batiment} », « ${co.raisons.argent} », « ${co.raisons.occupe} »`);
  if (!(co.departs === 1 && co.vuColl && co.silo >= 5 && co.sacVide === 0)) console.log(JSON.stringify([co.departs, co.vuColl, co.silo, co.sacVide]));
  check(co.departs === 1 && co.vuColl && co.silo >= 5 && co.sacVide === 0, 'le collecteur verse le sac dans son silo quand un convoyeur en part');
  check(co.sansCourant === false && co.exp1 > 0, `sans électricité l'extracteur tourne au quart de sa vitesse (${co.exp1} cr expédiés en 25 s)`);
  check(co.courant && co.prod > 2 && co.exp2 > co.exp1 && co.debit >= 3, `avec un poste solaire : ${co.prod.toFixed(1)} kW produits, ${co.conso} consommés, ${co.exp2} cr expédiés, ${co.debit} lots par minute au tableau`);
  check(co.paye === 1200 && co.rembourse === 800, `démonter une machine améliorée rembourse l'achat et l'amélioration (+${co.rembourse} cr)`);
  check(co.cibles >= 3 && co.cibles <= 7 && co.parRuche >= 2 && co.ciblesMere > 300, `ruche simple : ${co.cibles} tuiles dans son rayon, ${co.parRuche} pollinisées seules ; ruche mère : tout le secteur (${co.ciblesMere})`);
  check(co.ferme, 'B referme le mode construction');
  check(co.seul > 0 && co.gainSeul >= co.seul, `autonome : un pollinisateur seul, sans convoyeur ni courant, vend lui-même (${co.seul} cr en 20 s)`);
  check(co.venteRuche >= 72 && co.ventePoll > 0, `revenus automatiques : la ruche reliée vend seule son miel et sa cire (${co.venteRuche} cr en 1 min), le pollinisateur automatique aussi (${co.ventePoll} cr)`);
  // --- 6. La carte : le globe ---
  const ca = await page.evaluate(() => {
    const P = pollen, out = {}; U.aller(P.local(8, 20)); P.E.carte = true; P.step(0.05, 2);
    out.ouverte = P.CARTE.ouverte; out.dist = P.camera.position.length(); out.uCarte = P.SOL_U.uCarte.value; out.halo = P.HALO.visible; out.points = P.CARTE.points.length; out.machines = P.CARTE.machines.geometry.attributes.position.count;
    const d0 = P.CARTE.dir.clone(); P.E.dYaw = 0.5; P.step(0.05, 1); out.tourne = d0.angleTo(P.CARTE.dir);
    U.aller(P.local(-6, 60)); P.CARTE.fermer(); P.E.carte = true; P.step(0.05, 2); out.points2 = P.CARTE.points.length; const cible = P.CARTE.points[0]; P.CARTE.dir.copy(cible.p).normalize(); P.step(0.05, 1); out.vise = P.CARTE.vise === cible; P.E.presse = true; P.step(0.05, 2);
    out.arrive = P.joueur.p.distanceTo(cible.p); out.fermee = !P.CARTE.ouverte && P.SOL_U.uCarte.value === 0 && !P.HALO.visible; U.aller(P.local(8, 20));
    return out;
  });
  check(ca.ouverte && ca.dist > 1200 && ca.uCarte === 1 && ca.halo && ca.points >= 1 && ca.machines >= 5, `carte : le globe entier vu de ${Math.round(ca.dist)} m, halo d'atmosphère, ${ca.machines} machines repérées`);
  check(ca.tourne > 0.2 && ca.points2 === ca.points && ca.vise && ca.arrive < 2 && ca.fermee, 'le globe tourne au doigt ; un point de voyage amené au centre puis action : on y est');
  // --- 7. La sauvegarde (format 6) ---
  const sv = await page.evaluate(() => { const P = pollen; P.S.credits = 4321; const e = P.etatSauve(); const ok = P.sauver(); return { v: e.v, ok, pieces: e.pieces.length, tuiles: P.S.tuiles, octets: JSON.stringify(e).length, outils: P.S.outils.length, amelio: P.S.amelio.sac }; });
  await page.goto(`http://localhost:${srv.address().port}/?mode=pc`, { timeout: 180000 }); await page.waitForFunction(() => window.pollen, null, { timeout: 180000 }); await page.waitForTimeout(1500);
  const rs = await page.evaluate(() => { const P = pollen; return { cr: P.S.credits, pieces: P.GRILLE.size, chariot: P.FLOTTE.chariot.possede && !!P.FLOTTE.chariot.g, moteur: P.FLOTTE.chariot.niv.moteur, vertes: P.T.vert.reduce((s, v) => s + v, 0), outils: P.S.outils.length, amelio: P.S.amelio.sac, ruches: P.RUCHES.length, alt: P.altitude(P.joueur.p), succes: Object.keys(P.S.succes).length }; });
  check(sv.v === 9 && sv.ok && sv.octets < 60000, `sauvegarde au format ${sv.v} (${(sv.octets / 1024).toFixed(1)} Ko)`);
  check(rs.cr === 4321 && rs.pieces === sv.pieces && rs.chariot && rs.moteur === 1 && rs.outils === sv.outils && rs.amelio === 1 && rs.ruches === 2 && rs.alt > 0, `rechargée : argent, ${rs.pieces} pièces, ruche, chariot amélioré, outils et améliorations retrouvés`);
  const perf = await page.evaluate(() => { const P = pollen; P.figer = false; return new Promise((res) => setTimeout(() => res({ tri: P.renderer.info.render.triangles, appels: P.renderer.info.render.calls }), 1500)); });
  console.log(`     (pc : ${(perf.tri / 1000).toFixed(0)} k triangles, ${perf.appels} appels de dessin par image, toutes passes comprises)`);
  check(erreurs.length === 0, `pc : console sans erreur${erreurs.length ? ' : ' + erreurs.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
  // --- 8. Téléphone ---
  const ctxM = await browser.newContext({ viewport: { width: 740, height: 360 }, hasTouch: true, isMobile: true });
  const m = await ouvrir(ctxM, '?mode=mobile&neuf');
  const mo = await m.page.evaluate(() => { const P = pollen; P.S.outils.push('marteau'); return { nom: P.Q.nom, agir: !document.getElementById('agir').hidden, slots: document.querySelectorAll('#slots button').length }; });
  await m.page.tap("#construire"); await m.page.waitForFunction(() => pollen.CONS.actif, null, { timeout: 20000 }).catch(() => {});
  const mo2 = await m.page.evaluate(() => ({ actif: pollen.CONS.actif, barre: !document.getElementById('barreCons').hidden }));
  await m.page.tap('#barreCons [data-cat="3"]'); await m.page.waitForTimeout(300);
  const mo3 = await m.page.evaluate(() => ({ cat: pollen.CONS.cat, piece: pollen.CONS.piece }));
  await m.page.tap('#consFermer'); await m.page.waitForTimeout(500); await m.page.tap("#carte"); await m.page.waitForFunction(() => pollen.CARTE.ouverte, null, { timeout: 15000 }).catch(() => {});
  const mo4 = await m.page.evaluate(() => ({ cons: pollen.CONS.actif, carte: pollen.CARTE.ouverte, tri: pollen.renderer.info.render.triangles, appels: pollen.renderer.info.render.calls }));
  console.log('     ' + JSON.stringify([mo, mo2, mo3, mo4]));
  check(mo.nom === 'mobile' && mo.agir && mo2.actif && mo2.barre && mo3.cat === 3 && mo3.piece === 'silo' && !mo4.cons && mo4.carte, 'téléphone : boutons construire et carte, barre de construction au doigt');
  console.log(`     (mobile, carte ouverte : ${(mo4.tri / 1000).toFixed(0)} k triangles, ${mo4.appels} appels)`);
  check(m.erreurs.length === 0, `mobile : console sans erreur${m.erreurs.length ? ' : ' + m.erreurs.slice(0, 3).join(' | ') : ''}`);
} catch (e) { console.log('ERREUR DU TEST :', e.message); fails.push(e.message); }
await browser.close(); srv.close();
console.log(fails.length ? `\n${fails.length} échec(s)` : '\nv14 : tout passe');
process.exit(fails.length ? 1 : 0);
