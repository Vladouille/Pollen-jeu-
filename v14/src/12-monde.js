
// =====================================================================
// 16. Le monde qui vit : jour et nuit, écrans des bâtiments, succès, lit ; et la sauvegarde locale.
//     Sauvegarde : tout reste dans le localStorage de ce navigateur. Aucun serveur, aucun compte.
//     - Quand : toutes les 30 s ; juste après un achat, une vente, une machine posée, un secteur fini (sauverBientot) ;
//       quand l'onglet passe en arrière-plan ou se ferme.
//     - Où : trois emplacements ; chacun garde aussi la sauvegarde précédente en copie de secours.
//     - Quoi : format 8 (toute la planète en parcelles, codées par plages). Les formats 2 à 7 repartent d'un monde neuf. Les tuiles sont un tableau d'octets en base64. Une sauvegarde de la v9 (format 5
//       et avant, terrain plat) ne peut pas être reposée sur la planète : on en garde l'argent, les outils et le temps
//       de jeu, le monde repart de zéro. Illisible : copie de secours, sinon partie neuve, avec un message clair.
//     - Export / import : un fichier .json.
// =====================================================================
// --- Les succès : huit médaillons sur le mur de la station. ---
const SUCCES = [
  ['Première vente', () => S.ventes >= 1], ['100 tuiles', () => S.tuiles >= 100], ['1 000 tuiles', () => S.tuiles >= 1000], ['10 000 parcelles', () => S.tuiles >= 10000],
  ['1 % de la planète', () => PLANETE_PROG.vert >= NT / 100], ['Au volant', () => ORDRE_VEHICULES.some((c) => FLOTTE[c].possede)], ['Dix machines', () => (S.pieces || 0) >= 10], ['La planète', () => secteurs.every((s) => s.vert >= s.total)],
];
let tSucces = 0;
function majSucces(silence) { SUCCES.forEach(([, f], k) => { if (!S.succes[k] && f()) { S.succes[k] = 1; if (!silence) { sons.vente(); sauverBientot(); } } MEDAILLONS[k].material = S.succes[k] ? M.pollen : M_GRIS; }); }
MAJ.push((dt) => { tSucces += dt; if (tSucces > 1) { tSucces = 0; majSucces(); } });
// --- Le lit : passer la nuit. Le soleil saute jusqu'au matin, là où l'on est. ---
function dormir() {
  if (JOUR.ici > 0.6) { sons.refus(); return false; }
  const up = joueur.haut; for (let k = 0; k < 400; k++) { JOUR.angle += Math.PI / 200; placerSoleil(); if (up.dot(SOLEIL) > 0.3) break; }
  sons.achat(); sauverBientot(); return true;
}
// --- Les écrans : progression des secteurs (station), tableau des variétés (laboratoire). ---
let tEcrans = 0, sigEcrans = '';
MAJ.push((dt) => {
  tEcrans += dt; if (tEcrans < 1 || !DEDANS.salle) return; tEcrans = 0;
  const pp = PLANETE_PROG.vert / NT * 100, sig = PLANETE_PROG.vert + '';   // la station affiche l'avancement de toute la planète
  if (sig === sigEcrans) return; sigEcrans = sig;
  const pv = VARIETES.map((v, n) => { let a = 0, b = 0; SECTEURS.forEach((S, k) => { if (S.variete === n) { a += secteurs[k].vert; b += secteurs[k].total; } }); return b ? Math.floor(a / b * 100) : -1; });   // par variété
  { const e = ECRAN_SECTEUR, g = e.g; fond(e); g.textAlign = 'left'; g.fillStyle = '#edeae4'; g.font = '800 30px system-ui'; g.fillText('LA PLANÈTE', 24, 34); g.fillStyle = '#f08a24'; g.fillRect(24, 56, 720, 4);
    g.font = '800 64px system-ui'; g.fillStyle = '#e8458b'; g.fillText(`${pp.toFixed(2).replace('.', ',')} %`, 24, 130);
    g.fillStyle = '#3a3f45'; g.fillRect(24, 180, 720, 26); g.fillStyle = '#e8458b'; g.fillRect(24, 180, Math.max(2, 7.2 * pp), 26);
    g.font = '800 24px system-ui'; g.fillStyle = '#c9c3b6'; g.fillText(`${PLANETE_PROG.vert.toLocaleString('fr-FR')} parcelles sur ${NT.toLocaleString('fr-FR')}`, 24, 250);
    e.maj(); }
  { const e = ECRAN_VARIETES, g = e.g; fond(e); g.textAlign = 'left'; g.fillStyle = '#edeae4'; g.font = '800 34px system-ui'; g.fillText('VARIÉTÉS D’AZURELLE', 30, 40); g.fillStyle = '#f08a24'; g.fillRect(30, 64, 964, 4);
    VARIETES.forEach((v, k) => { const x = 30 + (k % 3) * 330, y = 110 + Math.floor(k / 3) * 200, ouvert = true;
      g.fillStyle = ouvert ? '#1b2330' : '#1a1c1f'; g.fillRect(x, y, 304, 176); g.strokeStyle = ouvert ? '#4fd6e3' : '#3a3f45'; g.lineWidth = 3; g.strokeRect(x, y, 304, 176);
      for (let n = 0; n < v.petales; n++) { const a = n / v.petales * 6.283; g.fillStyle = ouvert ? '#e8458b' : '#4a4e55'; g.beginPath(); g.ellipse(x + 56 + Math.cos(a) * 20, y + 62 + Math.sin(a) * 20, 14, 8, a, 0, 6.3); g.fill(); } g.fillStyle = ouvert ? '#f5c518' : '#6c7076'; g.beginPath(); g.arc(x + 56, y + 62, 9, 0, 6.3); g.fill();
      g.font = '800 21px system-ui'; g.fillStyle = ouvert ? '#edeae4' : '#6c7076'; g.fillText(v.nom, x + 14, y + 128); g.font = '800 30px system-ui'; g.fillStyle = ouvert ? '#f4b41a' : '#6c7076'; g.fillText(`${v.prix} cr`, x + 110, y + 50);
      g.font = '800 18px system-ui'; g.fillStyle = ouvert ? '#4fd6e3' : '#e0452f'; g.fillText(ouvert ? `DÉBLOQUÉE · ${pv[k]} %` : 'VERROUILLÉE', x + 110, y + 86); g.fillStyle = '#c9c3b6'; g.fillText(`${v.petales} pétales · secteur ${k + 1}`, x + 14, y + 156); });
    e.maj(); }
});

const VERSION_SAUVE = 10, NB_EMPL = 3;   // 9 : esplanade de 50 m ; 10 : de 72 m
const cleEmpl = (n) => `pollen-v14-emplacement-${n}`, cleSecours = (n) => `pollen-v14-emplacement-${n}-secours`;
const stock = {   // le localStorage peut être refusé (navigation privée, stockage plein) : on joue alors sans sauvegarde
  lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  ecrire(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  effacer(k) { try { localStorage.removeItem(k); } catch (e) { /* rien à faire */ } },
};
let EMPL = clamp(parseInt(stock.lire('pollen-v14-actif') || '1', 10) || 1, 1, NB_EMPL);   // l'emplacement en cours

// --- Les tuiles en octets : bit 0 en fleurs, bits 1-3 sorte, bit 4 irriguée, bit 5 nectar pris. ---
const versBase64 = (o) => { let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000)); return btoa(s); };
const depuisBase64 = (b) => { const s = atob(b), o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; };
// 655 000 parcelles : on code par plages (valeur, longueur), la planète fanée tient en quelques kilo-octets.
function octetsEnTexte(octets) {   // codage par plages (valeur, longueur)
  const out = []; let v0 = -1, n = 0; const pousser = () => { if (n) { out.push(v0); let x = n; while (x >= 128) { out.push((x & 127) | 128); x >>= 7; } out.push(x); } };
  for (let i = 0; i < octets.length; i++) { const v = octets[i]; if (v === v0) n++; else { pousser(); v0 = v; n = 1; } }
  pousser(); return 'P' + versBase64(Uint8Array.from(out));
}
function tuilesEnOctets() { const o = new Uint8Array(NT); for (let i = 0; i < NT; i++) o[i] = T.vert[i] | (T.sorte[i] << 1) | (T.irrigue[i] << 4) | (T.nectar[i] << 5); return octetsEnTexte(o); }
function octetsDesTuiles(t, nt = NT) {   // l'inverse ; une chaîne sans « P » est l'ancien codage, un octet par parcelle
  const b = depuisBase64(t[0] === 'P' ? t.slice(1) : t); if (t[0] !== 'P') return b;
  const o = new Uint8Array(nt); let i = 0, p = 0;
  while (p < b.length && i < nt) { const v = b[p++]; let n = 0, sh = 0, x; do { x = b[p++]; n |= (x & 127) << sh; sh += 7; } while (x & 128); o.fill(v, i, Math.min(nt, i + n)); i += n; }
  return o;
}
const v3 = (p) => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], dev3 = (a) => new V3(a[0], a[1], a[2]);
const capsVers = (l) => l.map((c) => [c.type, +c.valeur.toFixed(2)]), capsDepuis = (l) => (l || []).map(([type, valeur]) => ({ type, valeur }));

function etatSauve() {
  const v = joueur.enVehicule, p = v ? surSol(new V3().copy(v.p).addScaledVector(new V3().crossVectors(v.f, joueur.haut), -(v.D.hw + 0.9))) : joueur.p;   // au volant : on reprendra à côté du véhicule
  return {
    v: VERSION_SAUVE, date: Date.now(), temps: Math.round(S.temps || 0), nt: NT,
    S: { credits: S.credits, sac: S.sac, outils: S.outils, tuiles: S.tuiles, ventes: S.ventes, silo: S.silo, expedie: S.expedie, amelio: S.amelio, succes: S.succes, recolte: Math.round(S.recolte), niveau: S.niveau, xp: +(S.xp || 0).toFixed(1), contrats: S.contrats, dorees: S.dorees || 0, dernierVeh: S.dernierVeh, toit: S.toit || 0, robots: S.robots || 0, robotVendu: Math.round(S.robotVendu || 0), saison: S.saison || 0, rech: S.rech, stock: S.stock, ouvriers: S.ouvriers || 0, desherbeurs: S.desherbeurs || 0, finis: S.finis || [], rares: S.rares || 0, ville: !!S.ville, robots2: S.robots2 || 0 },
    outil: outilEnMain === 'marteau' ? CONS.outilAvant : outilEnMain, ouverts: OUVERTS.value, tuiles: tuilesEnOctets(), jour: +JOUR.angle.toFixed(3),
    balises: BALISES.map((b) => b.active),
    pieces: [...GRILLE.values()].map((q) => [q.cle, q.id, q.avant, q.niveau, q.paye, Math.round(q.charge || 0), capsVers(q.stock), capsVers(q.entrees)]),
    capsules: CAPSULES.map((c) => [c.p.id, +c.t.toFixed(2), c.type, +c.valeur.toFixed(2)]),
    flotte: Object.fromEntries(ORDRE_VEHICULES.map((c) => { const w = FLOTTE[c]; return [c, { possede: w.possede, p: v3(w.p), f: v3(w.f), charge: w.charge, valeur: +w.valeur.toFixed(2), niv: w.niv, attelee: w.attelee ? w.attelee.cle : undefined, pilote: w.pilote ? { achete: !!w.pilote.achete, actif: !!w.pilote.actif } : undefined }]; })),
    colis: [...COLIS.map((c) => ({ p: v3(c.p), contenu: c.contenu })), ...(porte ? [{ p: v3(joueur.p), contenu: porte.contenu }] : [])],
    joueur: { p: v3(p), f: v3(joueur.f) },
  };
}

// --- Conversion des anciens formats. Les formats 2 à 5 sont ceux du terrain plat de la v9 : le monde ne se transpose
//     pas sur la planète. On en garde ce qui appartient au joueur (argent, outils, temps de jeu, ventes). ---
const CONVERSIONS = {};
// Formats 8 et 9 → 10 : l'esplanade est passée de 28 puis 50 m à 72 m de rayon ; les parcelles gardent leur état, rangées
// dans le nouvel ordre (celles qui sont maintenant sous la base disparaissent).
for (const f of [8, 9]) CONVERSIONS[f] = (d) => {
  if (!d.tuiles) return { ...d, v: VERSION_SAUVE };
  const anciens = listeIds(RB_FORMAT[f]), o = octetsDesTuiles(d.tuiles, anciens.length), n = new Uint8Array(NT);
  for (let i = 0; i < anciens.length; i++) { const k = IDX.get(anciens[i]); if (k !== undefined) n[k] = o[i]; }
  return { ...d, v: VERSION_SAUVE, nt: NT, tuiles: octetsEnTexte(n) };
};
for (const f of [2, 3, 4, 5, 6, 7]) CONVERSIONS[f] = (d) => ({ v: 10, date: d.date, temps: d.temps || (d.S && d.S.temps) || 0, monde: 'neuf', S: { credits: (d.S && d.S.credits) || 0, outils: ((d.S && d.S.outils) || ['pinceau']).filter((o) => OUTILS_DEF[o]), ventes: (d.S && d.S.ventes) || 0, tuiles: 0 }, ouverts: 1, tuiles: '' });
function convertir(d) {
  if (!d || typeof d !== 'object' || typeof d.v !== 'number') throw new Error('pas une sauvegarde POLLEN');
  while (d.v < VERSION_SAUVE) { const f = CONVERSIONS[d.v]; if (!f) throw new Error(`format ${d.v} trop ancien`); d = f(d); }
  if (d.v > VERSION_SAUVE) throw new Error(`format ${d.v} plus récent que ce jeu`);
  if (typeof d.tuiles !== 'string' || !d.S || typeof d.S.credits !== 'number') throw new Error('sauvegarde incomplète');
  octetsDesTuiles(d.tuiles);   // lève une erreur si les parcelles sont abîmées
  return d;
}

// --- Appliquer une sauvegarde à la partie qui vient de se construire (au démarrage seulement). ---
function charger(d) {
  d = convertir(d);
  const sac = sacVide(), silo = sacVide(); for (const k in sac) { if (d.S.sac && d.S.sac[k]) Object.assign(sac[k], d.S.sac[k]); if (d.S.silo && d.S.silo[k]) Object.assign(silo[k], d.S.silo[k]); }
  PLANETE_PROG.vert = 0; Object.assign(S, d.S, { sac, silo, temps: d.temps || 0, amelio: { ...S.amelio, ...(d.S.amelio || {}) }, succes: d.S.succes || {}, recolte: d.S.recolte || 0 }); OUVERTS.value = clamp(d.ouverts || 1, 1, NSECT);
  S.outils = (S.outils || []).filter((o) => OUTILS_DEF[o]); if (!S.outils.includes('pinceau')) S.outils.unshift('pinceau');
  if (typeof d.jour === 'number') { JOUR.angle = d.jour; placerSoleil(); }
  const o = octetsDesTuiles(d.tuiles);
  for (let i = 0; i < NT && i < o.length; i++) {
    const c = o[i], vert = c & 1, sorte = (c >> 1) & 7;
    if (T.sorte[i] === 1 && sorte !== 1) desherber(i);
    if (T.sorte[i] === 3 && sorte !== 3) cueillirMere(i);
    T.sorte[i] = sorte === 2 ? 0 : sorte; T.irrigue[i] = 0; T.nectar[i] = (c >> 5) & 1;
    if (vert && !T.vert[i]) fleurirTuile(i, -1000); else if (!vert && T.vert[i]) fanerTuile(i); else ecrireTuile(i);
  }
  for (const s of secteurs) s.vert = 0; PLANETE_PROG.vert = 0; for (let i = 0; i < NT; i++) { secteurs[T.sect[i]].vert += T.vert[i]; PLANETE_PROG.vert += T.vert[i]; } majProgres(); OUVERTS.value = NSECT;
  (d.balises || []).forEach((a, k) => { if (a && BALISES[k]) activerBalise(BALISES[k], false); });
  for (const [cle, id, avant, niveau, paye, charge, st, ent] of d.pieces || []) if (PIECES[cle] && !GRILLE.has(id)) { const q = poserPiece(cle, id, avant, true, niveau || 0); q.paye = paye || PIECES[cle].prix; q.charge = charge || 0; q.stock = capsDepuis(st); q.entrees = capsDepuis(ent); }
  for (const [id, t, type, valeur] of d.capsules || []) { const q = GRILLE.get(id); if (q && estTapis(q)) CAPSULES.push({ p: q, t, type, valeur, bloque: 0 }); }
  for (const c of ORDRE_VEHICULES) { const w = FLOTTE[c], e = d.flotte && d.flotte[c]; if (!e || !e.possede) continue; w.possede = true; w.p.copy(dev3(e.p)); w.f.copy(dev3(e.f)); w.charge = e.charge || 0; w.valeur = e.valeur || 0; if (e.pilote) w.pilote = { ...e.pilote, etat: 'travail', t: 0, bloque: 0 }; Object.assign(w.niv, e.niv || {}); refaireVehicule(w); }
  for (const c of ORDRE_VEHICULES) { const e = d.flotte && d.flotte[c]; if (e && e.attelee && FLOTTE[e.attelee]) FLOTTE[c].attelee = FLOTTE[e.attelee]; }
  for (const c of d.colis || []) creerColis(c.contenu, surSol(dev3(c.p)));
  if (d.joueur) { surSol(repousser(surSol(dev3(d.joueur.p)), 0.4).p, 0, joueur.p); joueur.haut.copy(joueur.p).normalize(); tangent(joueur.p, dev3(d.joueur.f), joueur.f); }
  if (S.outils.includes(d.outil)) prendre(d.outil);
  majSucces(true);
  return d;
}

// --- Écrire : la sauvegarde en place passe d'abord en copie de secours. ---
function sauver() {
  if (SUPPRIME.v) return false;   // emplacement effacé ou partie importée : rien à réécrire avant le rechargement
  let texte; try { texte = JSON.stringify(etatSauve()); } catch (e) { return false; }
  DERNIER.texte = texte; DERNIER.empl = EMPL;   // la copie en mémoire part aussi vers la sauvegarde en ligne
  const avant = stock.lire(cleEmpl(EMPL)); if (avant && avant !== texte) stock.ecrire(cleSecours(EMPL), avant);
  return stock.ecrire(cleEmpl(EMPL), texte);   // l'emplacement actif ne s'écrit qu'au moment où on le choisit
}
let aSauver = false; const SUPPRIME = { v: false }, DERNIER = { texte: '', empl: 0 }, DEMARRAGE = { date: 0, repris: false };
function sauverBientot() { aSauver = true; }   // achat, vente, machine posée, secteur fini : écrit à l'image suivante (une fois)
FIN_SECTEUR.push(() => sauverBientot());
let tSauve = 0;
MAJ.push((dt) => {
  S.temps = (S.temps || 0) + dt;
  tSauve += dt; if (tSauve >= 30 || aSauver) { tSauve = 0; aSauver = false; sauver(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { sauver(); envoyerNuage(); } });   // on quitte l'onglet : tout part, en local et en ligne
addEventListener('pagehide', () => { sauver(); envoyerNuage(); });
addEventListener('beforeunload', () => { sauver(); envoyerNuage(); });

// --- Au démarrage : on reprend l'emplacement en cours. Sans partie v10, une partie de la v9 est reprise (argent, outils, temps). ---
const ANNONCE = { texte: '' };
{
  if (!params.has('neuf')) {
    const essayer = (cle) => { const t = stock.lire(cle); if (!t) return 'vide'; try { const d = charger(JSON.parse(t)); DEMARRAGE.date = d.date || 1; DEMARRAGE.repris = true; return d.monde === 'neuf' ? 'ancien' : 'ok'; } catch (e) { return e.message || 'illisible'; } };
    let r = essayer(cleEmpl(EMPL));
    if (r === 'vide') { const a = essayer(`pollen-v10-emplacement-${EMPL}`); if (a === 'ancien') ANNONCE.texte = 'Partie de la version précédente reprise : ton argent, tes outils et ton temps de jeu sont là. Le monde est une planète neuve.'; }
    else if (r !== 'ok') {
      stock.ecrire(cleEmpl(EMPL) + '-illisible', stock.lire(cleEmpl(EMPL)) || '');   // on garde la sauvegarde abîmée de côté, sans l'écraser
      const r2 = essayer(cleSecours(EMPL));
      ANNONCE.texte = r2 === 'ok' ? `La dernière sauvegarde de l'emplacement ${EMPL} était illisible (${r}). La copie de secours a été reprise.`
        : `La sauvegarde de l'emplacement ${EMPL} est illisible (${r}). Nouvelle partie.`;
      if (r2 !== 'ok') stock.effacer(cleEmpl(EMPL));
    }
  }
}

// --- La sauvegarde en ligne. Dans la page publiée sur claude.ai, le stockage local n'est pas sûr : la visionneuse peut
//     le vider entre deux visites. Chaque emplacement est donc aussi copié dans la base privée du joueur
//     (data/users/<id>/…, que lui seul peut lire), toutes les minutes et dès qu'on quitte la page. Au démarrage on lit
//     la copie en ligne : si elle est plus récente que la partie locale (ou s'il n'y a rien en local), on la reprend.
//     Hors de claude.ai (fichier ouvert tel quel), use() répond null et rien ne change. ---
const NUAGE = { db: null, uid: null, pret: false, occupe: false, envoye: '', t: 0, echecs: 0, pause: 0, etat: 'local' };
const TRANCHE = 200000;   // un document fait 256 Kio au plus : une très longue sauvegarde est coupée en tranches
const refNuage = (n, k) => NUAGE.db.doc(`data/users/${NUAGE.uid}/pollen-v14-emplacement-${n}${k === undefined ? '' : `-p${k}`}`);
async function lireNuage(n) {
  const s = await refNuage(n).get(); if (!s.exists) return null; const m = s.data();
  if (typeof m.texte === 'string') return m;
  const parts = []; for (let k = 0; k < (m.tranches || 0); k++) { const p = await refNuage(n, k).get(); if (!p.exists) return null; parts.push(p.data().texte); }
  return { ...m, texte: parts.join('') };
}
async function envoyerNuage() {
  if (!NUAGE.pret || NUAGE.occupe || SUPPRIME.v || performance.now() < NUAGE.pause) return false;
  if (!DERNIER.texte) sauver();
  const texte = DERNIER.texte, n = DERNIER.empl; if (!texte || texte === NUAGE.envoye) return false;
  NUAGE.occupe = true;
  try {
    const d = JSON.parse(texte), tete = { date: d.date, temps: d.temps || 0, credits: d.S.credits, v: d.v };
    if (texte.length <= TRANCHE) await refNuage(n).set({ ...tete, texte });
    else { const k = Math.ceil(texte.length / TRANCHE); for (let i = 0; i < k; i++) await refNuage(n, i).set({ texte: texte.slice(i * TRANCHE, (i + 1) * TRANCHE) }); await refNuage(n).set({ ...tete, tranches: k }); }
    NUAGE.envoye = texte; NUAGE.echecs = 0; NUAGE.etat = 'en ligne';
  } catch (e) {
    const code = e && e.code; NUAGE.echecs++;
    if (['revoked', 'not_granted', 'capability_disabled', 'capability_removed', 'quota_exceeded', 'invalid_argument'].includes(code)) { NUAGE.pret = false; NUAGE.etat = 'local'; }
    else NUAGE.pause = performance.now() + Math.min(300000, 5000 * 2 ** NUAGE.echecs);   // trop d'appels, panne passagère : on attend, de plus en plus
  }
  NUAGE.occupe = false; return true;
}
MAJ.push((dt) => { NUAGE.t += dt; if (NUAGE.t >= 60) { NUAGE.t = 0; envoyerNuage(); } });
(async () => {
  if (!window.claude || !window.claude.use || params.has('neuf') || params.has('horsligne')) return;
  try {
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    const uid = user && await user.id(); if (!db || !uid) return;
    NUAGE.db = db; NUAGE.uid = uid;
    const m = await lireNuage(EMPL).catch(() => null);
    if (m && m.texte && (m.date || 0) > DEMARRAGE.date) {   // la copie en ligne est plus récente : on la reprend
      let d; try { d = convertir(JSON.parse(m.texte)); } catch (e) { d = null; }
      if (d) {
        const ecrit = stock.ecrire(cleEmpl(EMPL), m.texte) && stock.lire(cleEmpl(EMPL)) === m.texte;
        if (DEMARRAGE.repris && ecrit) { SUPPRIME.v = true; location.reload(); return; }   // une partie locale tourne déjà : on recharge sur la copie en ligne
        if (!DEMARRAGE.repris) { charger(d); DEMARRAGE.repris = true; DEMARRAGE.date = d.date || 1; NUAGE.envoye = m.texte; montrerAnnonce('Partie reprise là où tu l’avais laissée.'); retourAbsence(d.date); absenceEquipe(d.date); chargesAbsence(d.date); reconcilierHerbes(); reconcilierRares(); }
      }
    }
    NUAGE.pret = true; NUAGE.etat = 'en ligne'; envoyerNuage();
  } catch (e) { NUAGE.etat = 'local'; }
})();

// --- La petite icône en haut à droite : trois emplacements, exporter, importer. ---
function resume(texte) {   // { temps, credits, secteur } d'une sauvegarde, ou null
  if (!texte) return null;
  try { const d = convertir(JSON.parse(texte)); return { temps: d.temps || 0, credits: d.S.credits, secteur: d.ouverts || 1, date: d.date }; } catch (e) { return { illisible: true }; }
}
const fmtTemps = (s) => { const m = Math.floor(s / 60), h = Math.floor(m / 60); return h ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };
const btnSauve = document.getElementById('sauvegardes'), panneauSauve = document.getElementById('panneauSauve'), annonce = document.getElementById('annonce');
let confirmer = 0;
function afficherEmplacements() {
  sauver();   // l'emplacement en cours affiche son état du moment
  const lignes = [];
  for (let n = 1; n <= NB_EMPL; n++) {
    const r = resume(stock.lire(cleEmpl(n))), actif = n === EMPL;
    const info = !r ? '<span class="vide">Vide</span>' : r.illisible ? '<span class="vide">Illisible</span>' : `<span>${fmtTemps(r.temps)}</span><span>${fmtCr(r.credits)} cr</span><span>Secteur ${r.secteur}</span>`;
    const boutons = (actif ? '<b class="actif">En cours</b>' : `<button type="button" data-jouer="${n}">${r ? 'Reprendre' : 'Commencer'}</button>`)
      + (r ? `<button type="button" class="suppr" data-suppr="${n}">${confirmer === n ? 'Confirmer ?' : 'Supprimer'}</button>` : '');
    lignes.push(`<li class="${actif ? 'actif' : ''}"><strong>${n}</strong><div class="info">${info}</div><div class="actions">${boutons}</div></li>`);
  }
  panneauSauve.querySelector('ul').innerHTML = lignes.join('');
}
function ouvrirSauve(oui) {
  panneauSauve.hidden = !oui; confirmer = 0;
  if (oui) { if (document.exitPointerLock) document.exitPointerLock(); afficherEmplacements(); }
}
btnSauve.addEventListener('click', (e) => { e.stopPropagation(); ouvrirSauve(panneauSauve.hidden); });
panneauSauve.addEventListener('click', (e) => {
  e.stopPropagation();
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.jouer) { sauver(); stock.ecrire('pollen-v14-actif', b.dataset.jouer); location.reload(); return; }
  if (b.dataset.suppr) {
    const n = +b.dataset.suppr;
    if (confirmer !== n) { confirmer = n; afficherEmplacements(); return; }   // second clic : on supprime
    stock.effacer(cleEmpl(n)); stock.effacer(cleSecours(n)); confirmer = 0;
    const effaceEnLigne = NUAGE.db ? refNuage(n).delete().catch(() => {}) : Promise.resolve();   // sinon la copie en ligne reviendrait au démarrage
    if (n === EMPL) { SUPPRIME.v = true; effaceEnLigne.finally(() => location.reload()); return; }   // l'emplacement en cours repart de zéro
    afficherEmplacements(); return;
  }
  if (b.id === 'exporter') exporter();
  if (b.id === 'importer') document.getElementById('fichierSauve').click();
  if (b.id === 'fermerSauve') ouvrirSauve(false);
});
for (const ev of ['pointerdown', 'touchstart', 'mousedown']) { btnSauve.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }); panneauSauve.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }); }
async function exporter() {   // télécharge l'emplacement en cours en .json
  sauver();
  const texte = stock.lire(cleEmpl(EMPL)) || JSON.stringify(etatSauve()), nom = `pollen-emplacement-${EMPL}-${new Date().toISOString().slice(0, 10)}.json`;
  // Dans la visionneuse d'artefacts de claude.ai, un lien de téléchargement ne fait rien : on passe par sa capacité « downloads ».
  const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) { try { await dl.save({ filename: nom, data: texte }); } catch (e) { if (e && e.code !== 'declined') montrerAnnonce(`Export impossible ici (${e.code || 'indisponible'}).`); } return; }
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([texte], { type: 'application/json' }));
  a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function importer(texte) {   // vérifie, garde l'ancien en secours, écrit dans l'emplacement en cours, recharge
  let d; try { d = convertir(JSON.parse(texte)); } catch (e) { montrerAnnonce(`Fichier refusé : ${e.message || 'illisible'}. La partie en cours n'a pas changé.`); return false; }
  const avant = stock.lire(cleEmpl(EMPL)); if (avant) stock.ecrire(cleSecours(EMPL), avant);
  SUPPRIME.v = true;   // plus aucune écriture avant le rechargement : la partie en cours écraserait l'import en partant
  d.date = Date.now(); const neuf = JSON.stringify(d); stock.ecrire(cleEmpl(EMPL), neuf);   // daté de maintenant : il l'emporte sur la copie en ligne
  const envoi = NUAGE.pret ? refNuage(EMPL).set({ date: d.date, temps: d.temps || 0, credits: d.S.credits, v: d.v, texte: neuf }).catch(() => {}) : Promise.resolve();
  envoi.finally(() => location.reload()); return true;
}
document.getElementById('fichierSauve').addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; f.text().then(importer); e.target.value = ''; });
function montrerAnnonce(t) { annonce.textContent = t; annonce.hidden = false; clearTimeout(montrerAnnonce.t); montrerAnnonce.t = setTimeout(() => { annonce.hidden = true; }, 9000); }
if (ANNONCE.texte) montrerAnnonce(ANNONCE.texte);
