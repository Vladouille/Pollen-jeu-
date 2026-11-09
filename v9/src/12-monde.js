
// =====================================================================
// 16. La sauvegarde locale : tout reste dans le localStorage de ce navigateur. Aucun serveur, aucun compte.
//     - Quand : toutes les 30 s ; juste après un achat, une vente, une machine posée, un secteur fini (sauverBientot) ;
//       quand l'onglet passe en arrière-plan ou se ferme (visibilitychange, pagehide, beforeunload).
//     - Où : trois emplacements ; chacun garde aussi la sauvegarde précédente en copie de secours.
//     - Quoi : format 5. Les tuiles sont un tableau d'octets (un octet par tuile, en base64), pas un objet par tuile.
//       Un format plus ancien est converti (2 → 3 → 4 → 5) ; une sauvegarde illisible fait repartir de la copie
//       de secours, sinon d'une partie neuve, avec un message clair.
//     - Export / import : un fichier .json, pour passer d'un appareil à l'autre.
// =====================================================================
const VERSION_SAUVE = 5, NB_EMPL = 3;
const cleEmpl = (n) => `pollen-v9-emplacement-${n}`, cleSecours = (n) => `pollen-v9-emplacement-${n}-secours`;
const stock = {   // le localStorage peut être refusé (navigation privée, stockage plein) : on joue alors sans sauvegarde
  lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  ecrire(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  effacer(k) { try { localStorage.removeItem(k); } catch (e) { /* rien à faire */ } },
};
let EMPL = clamp(parseInt(stock.lire('pollen-v9-actif') || '1', 10) || 1, 1, NB_EMPL);   // l'emplacement en cours

// --- Les tuiles en octets : bit 0 en fleurs, bits 1-3 sorte, bit 4 irriguée, bit 5 nectar pris. ---
const versBase64 = (o) => { let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000)); return btoa(s); };
const depuisBase64 = (b) => { const s = atob(b), o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; };
function tuilesEnOctets() { const o = new Uint8Array(NT); for (let i = 0; i < NT; i++) o[i] = T.vert[i] | (T.sorte[i] << 1) | (T.irrigue[i] << 4) | (T.nectar[i] << 5); return versBase64(o); }

function etatSauve() {
  const p = joueur.enVehicule ? { x: V.x, z: V.z } : joueur;   // au volant : on reprendra à côté de la pollinisatrice
  return {
    v: VERSION_SAUVE, date: Date.now(), temps: Math.round(S.temps || 0),
    S: { credits: S.credits, sac: S.sac, outils: S.outils, tuiles: S.tuiles, ventes: S.ventes, silo: S.silo, expedie: S.expedie },
    outil: outilEnMain, ouverts: OUVERTS.value, tuiles: tuilesEnOctets(),
    tuyaux: TUYAUX.map((t) => t.pts.map((q) => [+q[0].toFixed(2), +q[1].toFixed(2)])),
    ruches: EMPL_RUCHE.map((e) => e.ruche ? e.ruche.niveau : -1), balises: BALISES.map((b) => b.active),
    pieces: [...GRILLE.values()].map((q) => [q.cle, q.cx, q.cz, q.dir, q.niveau]),
    vehicule: { possede: V.possede, x: V.x, z: V.z, yaw: V.yaw, charge: V.charge, valeur: V.valeur },
    colis: [...COLIS.map((c) => ({ x: c.x, z: c.z, contenu: c.contenu })), ...(porte ? [{ x: joueur.x, z: joueur.z, contenu: porte.contenu }] : [])],
    joueur: { x: p.x, z: p.z, yaw: joueur.yaw },
  };
}

// --- Conversion des anciens formats, une marche à la fois. ---
const sacDepuis = (kg, v) => { const s = sacVide(); s.pollen.kg = kg || 0; s.pollen.v = v || 0; return s; };
const CONVERSIONS = {
  2: (d) => ({ ...d, v: 3, ouverts: 1, ruches: (d.ruches || []).map((r) => r ? 0 : -1) }),   // format 2 : ruches oui/non, pas de secteurs
  3: (d) => {   // format 3 : tuiles en hexadécimal (bit 3 irriguée), réservoir de pollen seul
    let t = ''; for (const ch of d.tuiles || '') { const c = parseInt(ch, 16); t += ((c & 1) | (((c >> 1) & 3) << 1) | (((c >> 3) & 1) << 4)).toString(36); }
    return { ...d, v: 4, tuiles: t, S: { ...d.S, sac: sacDepuis(d.S && d.S.charge, d.S && d.S.valeur), silo: sacDepuis(d.S && d.S.silo, d.S && d.S.siloValeur) }, colis: [] };
  },
  4: (d) => {   // format 4 : tuiles en base 36, un caractère par tuile
    const o = new Uint8Array(NT); for (let i = 0; i < NT && i < (d.tuiles || '').length; i++) o[i] = parseInt(d.tuiles[i], 36) || 0;
    return { ...d, v: 5, tuiles: versBase64(o), temps: (d.S && d.S.temps) || 0 };
  },
};
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
  Object.assign(S, d.S, { sac, silo, temps: d.temps || 0 }); OUVERTS.value = clamp(d.ouverts || 1, 1, NSECT);
  const o = depuisBase64(d.tuiles);
  for (let i = 0; i < NT && i < o.length; i++) {
    const c = o[i], vert = c & 1, sorte = (c >> 1) & 7, irr = (c >> 4) & 1;
    if (T.sorte[i] === 1 && sorte !== 1) desherber(i);
    if (T.sorte[i] === 3 && sorte !== 3) cueillirMere(i);
    T.sorte[i] = sorte; T.irrigue[i] = irr; T.nectar[i] = (c >> 5) & 1;
    if (vert && !T.vert[i]) fleurirTuile(i, -1000); else if (!vert && T.vert[i]) fanerTuile(i); else ecrireTuile(i);
  }
  for (const s of secteurs) s.vert = 0; for (let i = 0; i < NT; i++) secteurs[T.secteur[i]].vert += T.vert[i];
  for (const pts of d.tuyaux || []) { const t = { pts: [pts[0]] }; for (let k = 1; k < pts.length; k++) { segment(pts[k - 1], pts[k]); t.pts.push(pts[k]); } TUYAUX.push(t); }
  (d.ruches || []).forEach((n, k) => { if (n >= 0 && EMPL_RUCHE[k]) installerRuche(EMPL_RUCHE[k], n); });
  (d.balises || []).forEach((a, k) => { if (a && BALISES[k]) activerBalise(BALISES[k], false); });
  for (const [cle, cx, cz, dir, niveau] of d.pieces || []) if (PIECES[cle]) poserPiece(cle, cx, cz, dir, true, niveau || 0);
  if (d.vehicule) Object.assign(V, d.vehicule);
  for (const c of d.colis || []) { const g = { contenu: c.contenu, x: c.x, z: c.z, vx: 0, vz: 0, g: fabriquerColis() }; g.g.position.set(c.x, H(c.x, c.z), c.z); scene.add(g.g); g.ombre = ombreContact(g.g, 0.45, true); COLIS.push(g); }
  if (d.joueur) { Object.assign(joueur, { x: d.joueur.x, z: d.joueur.z, yaw: d.joueur.yaw }); for (const ob of OBSTACLES) { const dx = joueur.x - ob.x, dz = joueur.z - ob.z, l = Math.hypot(dx, dz); if (l < ob.r + 0.4) { joueur.x = ob.x + (dx / (l || 1)) * (ob.r + 0.5); joueur.z = ob.z + (dz / (l || 1)) * (ob.r + 0.5); } } joueur.y = H(joueur.x, joueur.z); }
  if (S.outils.includes(d.outil)) prendre(d.outil);
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

// --- Au démarrage : on reprend l'emplacement en cours. L'ancienne clé unique devient l'emplacement 1. ---
const ANNONCE = { texte: '' };
{
  const ancienne = stock.lire('pollen-v9-sauvegarde'); if (ancienne && !stock.lire(cleEmpl(1))) { stock.ecrire(cleEmpl(1), ancienne); stock.effacer('pollen-v9-sauvegarde'); }
  if (!params.has('neuf')) {
    const essayer = (cle) => { const t = stock.lire(cle); if (!t) return 'vide'; try { charger(JSON.parse(t)); return 'ok'; } catch (e) { return e.message || 'illisible'; } };
    const r = essayer(cleEmpl(EMPL));
    if (r !== 'ok' && r !== 'vide') {
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
  if (b.dataset.jouer) { sauver(); stock.ecrire('pollen-v9-actif', b.dataset.jouer); location.reload(); return; }
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
