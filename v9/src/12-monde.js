
// =====================================================================
// 16. La sauvegarde : dans le navigateur, toutes les 30 s et en quittant la page. ?neuf repart de zéro.
//     Format 4 (Azurelles, sac à six ressources, colis posés) ; une sauvegarde d'un autre format est ignorée.
// =====================================================================
const CLE_SAUVEGARDE = 'pollen-v9-sauvegarde';
function etatSauve() {
  let tuiles = ''; for (let i = 0; i < NT; i++) tuiles += (T.vert[i] | (T.sorte[i] << 1) | (T.irrigue[i] << 4) | (T.nectar[i] << 5)).toString(36);
  return { v: 4, colis: [...COLIS.map((c) => ({ x: c.x, z: c.z, contenu: c.contenu })), ...(porte ? [{ x: joueur.x, z: joueur.z, contenu: porte.contenu }] : [])], ouverts: OUVERTS.value, S: { ...S }, outil: outilEnMain, tuiles, tuyaux: TUYAUX.map((t) => t.pts.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)])),
    ruches: EMPL_RUCHE.map((e) => e.ruche ? e.ruche.niveau : -1), balises: BALISES.map((b) => b.active),
    pieces: [...GRILLE.values()].map((p) => [p.cle, p.cx, p.cz, p.dir, p.niveau]),
    vehicule: { possede: V.possede, x: V.x, z: V.z, yaw: V.yaw, charge: V.charge, valeur: V.valeur },
    joueur: { x: joueur.x, z: joueur.z, yaw: joueur.yaw } };
}
function sauver() { if (joueur.enVehicule) return; try { localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(etatSauve())); } catch (e) { /* stockage refusé : on joue sans sauvegarde */ } }
function charger(d) {
  if (!d || d.v !== 4) return false;
  Object.assign(S, d.S); OUVERTS.value = d.ouverts || 1;
  for (let i = 0; i < NT && i < d.tuiles.length; i++) {
    const c = parseInt(d.tuiles[i], 36), vert = c & 1, sorte = (c >> 1) & 7, irr = (c >> 4) & 1;
    if (T.sorte[i] === 1 && sorte !== 1) desherber(i);
    if (T.sorte[i] === 3 && sorte !== 3) cueillirMere(i);
    T.sorte[i] = sorte; T.irrigue[i] = irr; T.nectar[i] = (c >> 5) & 1;
    if (vert && !T.vert[i]) fleurirTuile(i, -1000); else if (!vert && T.vert[i]) fanerTuile(i); else ecrireTuile(i);
  }
  for (const s of secteurs) s.vert = 0; for (let i = 0; i < NT; i++) secteurs[T.secteur[i]].vert += T.vert[i];
  for (const pts of d.tuyaux) { const t = { pts: [pts[0]] }; for (let k = 1; k < pts.length; k++) { segment(pts[k - 1], pts[k]); t.pts.push(pts[k]); } TUYAUX.push(t); }
  d.ruches.forEach((n, k) => { if (n >= 0) installerRuche(EMPL_RUCHE[k], n); });
  d.balises.forEach((a, k) => { if (a) activerBalise(BALISES[k], false); });
  for (const [cle, cx, cz, dir, niveau] of d.pieces) if (PIECES[cle]) poserPiece(cle, cx, cz, dir, true, niveau || 0);
  Object.assign(V, d.vehicule);
  for (const c of d.colis || []) { const o = { contenu: c.contenu, x: c.x, z: c.z, vx: 0, vz: 0, g: fabriquerColis() }; o.g.position.set(c.x, H(c.x, c.z), c.z); scene.add(o.g); o.ombre = ombreContact(o.g, 0.45, true); COLIS.push(o); }
  Object.assign(joueur, d.joueur); joueur.y = H(joueur.x, joueur.z);
  if (S.outils.includes(d.outil)) prendre(d.outil);
  return true;
}
if (!params.has('neuf')) { try { charger(JSON.parse(localStorage.getItem(CLE_SAUVEGARDE) || 'null')); } catch (e) { /* sauvegarde illisible : nouvelle partie */ } }
let tSauve = 0;
MAJ.push((dt) => { tSauve += dt; if (tSauve >= 30) { tSauve = 0; sauver(); } });
addEventListener('pagehide', sauver);
document.addEventListener('visibilitychange', () => { if (document.hidden) sauver(); });
