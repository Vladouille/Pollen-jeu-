
// =====================================================================
// 16. Le monde qui vit : jour et nuit, écrans des bâtiments, succès, lit ; et la sauvegarde locale.
//     Sauvegarde : tout reste dans le localStorage de ce navigateur. Aucun serveur, aucun compte.
//     - Quand : toutes les 30 s ; juste après un achat, une vente, une machine posée, un secteur fini (sauverBientot) ;
//       quand l'onglet passe en arrière-plan ou se ferme.
//     - Où : trois emplacements ; chacun garde aussi la sauvegarde précédente en copie de secours.
//     - Quoi : format 8 (parcelles de 2 m, secteurs en disques). Les parcelles sont un tableau d'octets en base64. Une
//       sauvegarde plus ancienne (formats 2 à 7 : terrain plat, puis planètes à d'autres tuiles) ne se repose pas sur ce
//       monde : on en garde l'argent, les outils encore vendus et le temps de jeu, le monde repart de zéro.
//       Illisible : copie de secours, sinon partie neuve, avec un message clair.
//     - Export / import : un fichier .json.
// =====================================================================
// --- Les succès : huit médaillons sur le mur de la station. ---
const SUCCES = [
  ['Première vente', () => S.ventes >= 1], ['100 tuiles', () => S.tuiles >= 100], ['1 000 tuiles', () => S.tuiles >= 1000], ['Premier secteur', () => OUVERTS.value >= 2],
  ['Six secteurs', () => OUVERTS.value >= 7], ['Au volant', () => ORDRE_VEHICULES.some((c) => FLOTTE[c].possede)], ['Dix machines', () => (S.pieces || 0) >= 10], ['La planète', () => secteurs.every((s) => s.vert >= s.total)],
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
  const pct = secteurs.map((s) => Math.floor(s.vert / s.total * 100)), sig = pct.join() + OUVERTS.value; if (sig === sigEcrans) return; sigEcrans = sig;
  { const e = ECRAN_SECTEUR, g = e.g; fond(e); g.textAlign = 'left'; g.fillStyle = '#edeae4'; g.font = '800 30px system-ui'; g.fillText('SECTEURS', 24, 34); g.fillStyle = '#f08a24'; g.fillRect(24, 56, 720, 4);
    pct.forEach((p, k) => { const x = 24 + (k >> 2 >= 0 ? (k % 2) * 372 : 0), y = 88 + (k >> 1) * 38, ouvert = k < OUVERTS.value; g.font = '800 19px system-ui'; g.fillStyle = ouvert ? '#edeae4' : '#6c7076'; g.fillText(`${k + 1}`, x, y); g.fillStyle = '#3a3f45'; g.fillRect(x + 34, y - 8, 220, 16); g.fillStyle = p >= 100 ? '#4fd6e3' : '#3b6fd4'; g.fillRect(x + 34, y - 8, 2.2 * p, 16); g.fillStyle = ouvert ? '#f08a24' : '#6c7076'; g.fillText(ouvert ? `${p} %` : 'fermé', x + 264, y); });
    e.maj(); }
  { const e = ECRAN_VARIETES, g = e.g; fond(e); g.textAlign = 'left'; g.fillStyle = '#edeae4'; g.font = '800 34px system-ui'; g.fillText('VARIÉTÉS D’AZURELLE', 30, 40); g.fillStyle = '#f08a24'; g.fillRect(30, 64, 964, 4);
    VARIETES.forEach((v, k) => { const x = 30 + (k % 3) * 330, y = 110 + Math.floor(k / 3) * 200, s1 = 2 * k, ouvert = s1 < OUVERTS.value, pv = Math.round((pct[s1] + pct[s1 + 1]) / 2);
      g.fillStyle = ouvert ? '#1b2330' : '#1a1c1f'; g.fillRect(x, y, 304, 176); g.strokeStyle = ouvert ? '#4fd6e3' : '#3a3f45'; g.lineWidth = 3; g.strokeRect(x, y, 304, 176);
      for (let n = 0; n < v.petales; n++) { const a = n / v.petales * 6.283; g.fillStyle = ouvert ? '#3b6fd4' : '#4a4e55'; g.beginPath(); g.ellipse(x + 56 + Math.cos(a) * 20, y + 62 + Math.sin(a) * 20, 14, 8, a, 0, 6.3); g.fill(); } g.fillStyle = ouvert ? '#f5c518' : '#6c7076'; g.beginPath(); g.arc(x + 56, y + 62, 9, 0, 6.3); g.fill();
      g.font = '800 21px system-ui'; g.fillStyle = ouvert ? '#edeae4' : '#6c7076'; g.fillText(v.nom, x + 14, y + 128); g.font = '800 30px system-ui'; g.fillStyle = ouvert ? '#f08a24' : '#6c7076'; g.fillText(`${SECTEURS[s1].prix}–${SECTEURS[s1 + 1].prix} cr`, x + 110, y + 50);
      g.font = '800 18px system-ui'; g.fillStyle = ouvert ? '#4fd6e3' : '#f08a24'; g.fillText(ouvert ? (pv >= 100 ? 'TERMINÉE' : `DÉBLOQUÉE · ${pv} %`) : 'VERROUILLÉE', x + 110, y + 86); g.fillStyle = '#c9c3b6'; g.fillText(`${v.petales} pétales · secteurs ${s1 + 1} et ${s1 + 2}`, x + 14, y + 156); });
    e.maj(); }
});

const VERSION_SAUVE = 8, NB_EMPL = 3;
const cleEmpl = (n) => `pollen-v13-emplacement-${n}`, cleSecours = (n) => `pollen-v13-emplacement-${n}-secours`;
const stock = {   // le localStorage peut être refusé (navigation privée, stockage plein) : on joue alors sans sauvegarde
  lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  ecrire(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  effacer(k) { try { localStorage.removeItem(k); } catch (e) { /* rien à faire */ } },
};
let EMPL = clamp(parseInt(stock.lire('pollen-v13-actif') || '1', 10) || 1, 1, NB_EMPL);   // l'emplacement en cours

// --- Les tuiles en octets : bit 0 en fleurs, bits 1-3 sorte, bit 4 irriguée, bit 5 nectar pris. ---
const versBase64 = (o) => { let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000)); return btoa(s); };
const depuisBase64 = (b) => { const s = atob(b), o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; };
function tuilesEnOctets() { const o = new Uint8Array(NT); for (let i = 0; i < NT; i++) o[i] = T.vert[i] | (T.sorte[i] << 1) | (T.nectar[i] << 5); return versBase64(o); }
const v3 = (p) => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], dev3 = (a) => new V3(a[0], a[1], a[2]);
const capsVers = (l) => l.map((c) => [c.type, +c.valeur.toFixed(2), +(c.kg || 10).toFixed(2)]), capsDepuis = (l) => (l || []).map(([type, valeur, kg]) => ({ type, valeur, kg: kg || 10 }));

function etatSauve() {
  const v = joueur.enVehicule, p = v ? surSol(new V3().copy(v.p).addScaledVector(new V3().crossVectors(v.f, joueur.haut), -(v.D.hw + 0.9))) : joueur.p;   // au volant : on reprendra à côté du véhicule
  return {
    v: VERSION_SAUVE, date: Date.now(), temps: Math.round(S.temps || 0), nt: NT,
    S: { credits: S.credits, sac: S.sac, outils: S.outils, tuiles: S.tuiles, ventes: S.ventes, silo: S.silo, expedie: S.expedie, amelio: S.amelio, succes: S.succes, recolte: Math.round(S.recolte) },
    outil: outilEnMain === 'marteau' ? CONS.outilAvant : outilEnMain, ouverts: OUVERTS.value, tuiles: tuilesEnOctets(), jour: +JOUR.angle.toFixed(3),
    pieces: [...GRILLE.values()].map((q) => [q.cle, q.id, q.avant, q.niveau, q.paye, Math.round(q.charge || 0), capsVers(q.stock), capsVers(q.entrees), q.filtre]),
    capsules: CAPSULES.map((c) => [c.p.id, +c.t.toFixed(2), c.type, +c.valeur.toFixed(2), +c.kg.toFixed(2)]), paliers: secteurs.map((x) => x.palier || 0),
    flotte: Object.fromEntries(ORDRE_VEHICULES.map((c) => { const w = FLOTTE[c]; return [c, { possede: w.possede, p: v3(w.p), f: v3(w.f), charge: w.charge, valeur: +w.valeur.toFixed(2), niv: w.niv, attelee: w.attelee ? w.attelee.cle : undefined }]; })),
    colis: [...COLIS.map((c) => ({ p: v3(c.p), contenu: c.contenu })), ...(porte ? [{ p: v3(joueur.p), contenu: porte.contenu }] : [])],
    joueur: { p: v3(p), f: v3(joueur.f) },
  };
}

// --- Conversion des anciens formats. Les formats 2 à 5 sont ceux du terrain plat de la v9 : le monde ne se transpose
//     pas sur la planète. On en garde ce qui appartient au joueur (argent, outils, temps de jeu, ventes). ---
const CONVERSIONS = {};
for (const f of [2, 3, 4, 5, 6, 7]) CONVERSIONS[f] = (d) => ({ v: 8, date: d.date, temps: d.temps || (d.S && d.S.temps) || 0, monde: 'neuf', S: { credits: (d.S && d.S.credits) || 0, outils: ((d.S && d.S.outils) || ['pinceau']).filter((o) => OUTILS_DEF[o]), ventes: (d.S && d.S.ventes) || 0, tuiles: 0 }, ouverts: 1, tuiles: '' });
function convertir(d) {
  if (!d || typeof d !== 'object' || typeof d.v !== 'number') throw new Error('pas une sauvegarde POLLEN');
  while (d.v < VERSION_SAUVE) { const f = CONVERSIONS[d.v]; if (!f) throw new Error(`format ${d.v} trop ancien`); d = f(d); }
  if (d.v > VERSION_SAUVE) throw new Error(`format ${d.v} plus récent que ce jeu`);
  if (typeof d.tuiles !== 'string' || !d.S || typeof d.S.credits !== 'number') throw new Error('sauvegarde incomplète');
  depuisBase64(d.tuiles);   // lève une erreur si les tuiles sont abîmées
  return d;
}

// --- Appliquer une sauvegarde à la partie qui vient de se construire (au démarrage seulement). ---
function charger(d) {
  d = convertir(d);
  const sac = sacVide(), silo = sacVide(); for (const k in sac) { if (d.S.sac && d.S.sac[k]) Object.assign(sac[k], d.S.sac[k]); if (d.S.silo && d.S.silo[k]) Object.assign(silo[k], d.S.silo[k]); }
  Object.assign(S, d.S, { sac, silo, temps: d.temps || 0, amelio: { ...S.amelio, ...(d.S.amelio || {}) }, succes: d.S.succes || {}, recolte: d.S.recolte || 0 }); OUVERTS.value = clamp(d.ouverts || 1, 1, NSECT);
  if (!S.outils.includes('pinceau')) S.outils.unshift('pinceau');
  if (typeof d.jour === 'number') { JOUR.angle = d.jour; placerSoleil(); }
  const o = depuisBase64(d.tuiles);
  for (let i = 0; i < NT && i < o.length; i++) {
    const c = o[i], vert = c & 1, sorte = (c >> 1) & 7;
    T.sorte[i] = sorte === 4 ? 4 : 0; T.nectar[i] = (c >> 5) & 1;
    if (vert && !T.vert[i]) fleurirTuile(i, -1000); else if (!vert && T.vert[i]) fanerTuile(i); else ecrireTuile(i);
  }
  for (const s of secteurs) s.vert = 0; for (let i = 0; i < NT; i++) secteurs[T.sect[i]].vert += T.vert[i]; majProgres();
  (d.paliers || []).forEach((n, k) => { if (secteurs[k]) secteurs[k].palier = Math.max(secteurs[k].palier || 0, n); });
  for (const [cle, id, avant, niveau, paye, charge, st, ent, filtre] of d.pieces || []) if (PIECES[cle] && !GRILLE.has(id)) { const q = poserPiece(cle, id, avant, true, niveau || 0); q.paye = paye || PIECES[cle].prix; q.charge = charge || 0; q.stock = capsDepuis(st); q.entrees = capsDepuis(ent); if (filtre) q.filtre = filtre; }
  for (const [id, t, type, valeur, kg] of d.capsules || []) { const q = GRILLE.get(id); if (q && estTapis(q)) CAPSULES.push({ p: q, t, type, valeur, kg: kg || 10, bloque: 0 }); }
  for (const c of ORDRE_VEHICULES) { const w = FLOTTE[c], e = d.flotte && d.flotte[c]; if (!e || !e.possede) continue; w.possede = true; w.p.copy(dev3(e.p)); w.f.copy(dev3(e.f)); w.charge = e.charge || 0; w.valeur = e.valeur || 0; Object.assign(w.niv, e.niv || {}); refaireVehicule(w); }
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
  const avant = stock.lire(cleEmpl(EMPL)); if (avant && avant !== texte) stock.ecrire(cleSecours(EMPL), avant);
  return stock.ecrire(cleEmpl(EMPL), texte);   // l'emplacement actif ne s'écrit qu'au moment où on le choisit
}
let aSauver = false; const SUPPRIME = { v: false };
function sauverBientot() { aSauver = true; }   // achat, vente, machine posée, secteur fini : écrit à l'image suivante (une fois)
FIN_SECTEUR.push(() => sauverBientot());
let tSauve = 0;
MAJ.push((dt) => {
  S.temps = (S.temps || 0) + dt;
  tSauve += dt; if (tSauve >= 30 || aSauver) { tSauve = 0; aSauver = false; sauver(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) sauver(); });
addEventListener('pagehide', sauver);
addEventListener('beforeunload', sauver);

// --- Au démarrage : on reprend l'emplacement en cours. Sans partie v10, une partie de la v9 est reprise (argent, outils, temps). ---
const ANNONCE = { texte: '' };
{
  if (!params.has('neuf')) {
    const essayer = (cle) => { const t = stock.lire(cle); if (!t) return 'vide'; try { const d = charger(JSON.parse(t)); return d.monde === 'neuf' ? 'ancien' : 'ok'; } catch (e) { return e.message || 'illisible'; } };
    let r = essayer(cleEmpl(EMPL));
    if (r === 'vide') { const a = essayer(`pollen-v11-emplacement-${EMPL}`); if (a === 'ancien') ANNONCE.texte = 'Partie de la version précédente reprise : ton argent, tes outils et ton temps de jeu sont là. Le monde est une planète neuve.'; }
    else if (r !== 'ok') {
      stock.ecrire(cleEmpl(EMPL) + '-illisible', stock.lire(cleEmpl(EMPL)) || '');   // on garde la sauvegarde abîmée de côté, sans l'écraser
      const r2 = essayer(cleSecours(EMPL));
      ANNONCE.texte = r2 === 'ok' ? `La dernière sauvegarde de l'emplacement ${EMPL} était illisible (${r}). La copie de secours a été reprise.`
        : `La sauvegarde de l'emplacement ${EMPL} est illisible (${r}). Nouvelle partie.`;
      if (r2 !== 'ok') stock.effacer(cleEmpl(EMPL));
    }
  }
}

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
  if (b.dataset.jouer) { sauver(); stock.ecrire('pollen-v13-actif', b.dataset.jouer); location.reload(); return; }
  if (b.dataset.suppr) {
    const n = +b.dataset.suppr;
    if (confirmer !== n) { confirmer = n; afficherEmplacements(); return; }   // second clic : on supprime
    stock.effacer(cleEmpl(n)); stock.effacer(cleSecours(n)); confirmer = 0;
    if (n === EMPL) { SUPPRIME.v = true; location.reload(); return; }   // l'emplacement en cours repart de zéro
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
  stock.ecrire(cleEmpl(EMPL), JSON.stringify(d)); location.reload(); return true;
}
document.getElementById('fichierSauve').addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; f.text().then(importer); e.target.value = ''; });
function montrerAnnonce(t) { annonce.textContent = t; annonce.hidden = false; clearTimeout(montrerAnnonce.t); montrerAnnonce.t = setTimeout(() => { annonce.hidden = true; }, 9000); }
if (ANNONCE.texte) montrerAnnonce(ANNONCE.texte);
