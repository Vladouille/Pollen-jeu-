
// =====================================================================
// 16. La sauvegarde : dans le navigateur, toutes les 30 s et en quittant la page. ?neuf repart de zéro.
//     Format 3 (secteurs à une espèce, machines à niveaux) ; une sauvegarde d'un autre format est ignorée.
// =====================================================================
const CLE_SAUVEGARDE = 'pollen-v9-sauvegarde';
function etatSauve() {
  let tuiles = ''; for (let i = 0; i < NT; i++) tuiles += (T.vert[i] | (T.sorte[i] << 1) | (T.irrigue[i] << 3)).toString(16);
  return { v: 3, ouverts: OUVERTS.value, S: { ...S }, outil: outilEnMain, tuiles, tuyaux: TUYAUX.map((t) => t.pts.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)])),
    ruches: EMPL_RUCHE.map((e) => e.ruche ? e.ruche.niveau : -1), balises: BALISES.map((b) => b.active),
    pieces: [...GRILLE.values()].map((p) => [p.cle, p.cx, p.cz, p.dir, p.niveau]),
    vehicule: { possede: V.possede, x: V.x, z: V.z, yaw: V.yaw, charge: V.charge, valeur: V.valeur },
    joueur: { x: joueur.x, z: joueur.z, yaw: joueur.yaw } };
}
function sauver() { if (joueur.enVehicule) return; try { localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(etatSauve())); } catch (e) { /* stockage refusé : on joue sans sauvegarde */ } }
function charger(d) {
  if (!d || d.v !== 3) return false;
  Object.assign(S, d.S); OUVERTS.value = d.ouverts || 1;
  for (let i = 0; i < NT && i < d.tuiles.length; i++) {
    const c = parseInt(d.tuiles[i], 16), vert = c & 1, sorte = (c >> 1) & 3, irr = (c >> 3) & 1;
    if (T.sorte[i] === 1 && sorte === 0) desherber(i);
    if (T.sorte[i] === 3 && sorte === 0) cueillirDoree(i);
    T.sorte[i] = sorte; T.irrigue[i] = irr;
    if (vert && !T.vert[i]) fleurirTuile(i, -1000); else if (!vert && T.vert[i]) fanerTuile(i); else ecrireTuile(i);
  }
  for (const s of secteurs) s.vert = 0; for (let i = 0; i < NT; i++) secteurs[T.secteur[i]].vert += T.vert[i];
  for (const pts of d.tuyaux) { const t = { pts: [pts[0]] }; for (let k = 1; k < pts.length; k++) { segment(pts[k - 1], pts[k]); t.pts.push(pts[k]); } TUYAUX.push(t); }
  d.ruches.forEach((n, k) => { if (n >= 0) installerRuche(EMPL_RUCHE[k], n); });
  d.balises.forEach((a, k) => { if (a) activerBalise(BALISES[k], false); });
  for (const [cle, cx, cz, dir, niveau] of d.pieces) if (PIECES[cle]) poserPiece(cle, cx, cz, dir, true, niveau || 0);
  Object.assign(V, d.vehicule);
  Object.assign(joueur, d.joueur); joueur.y = H(joueur.x, joueur.z);
  if (S.outils.includes(d.outil)) prendre(d.outil);
  return true;
}
if (!params.has('neuf')) { try { charger(JSON.parse(localStorage.getItem(CLE_SAUVEGARDE) || 'null')); } catch (e) { /* sauvegarde illisible : nouvelle partie */ } }
let tSauve = 0;
MAJ.push((dt) => { tSauve += dt; if (tSauve >= 30) { tSauve = 0; sauver(); } });
addEventListener('pagehide', sauver);
document.addEventListener('visibilitychange', () => { if (document.hidden) sauver(); });
