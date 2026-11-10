
// =====================================================================
// 13. Les activités et les six ressources. Chaque geste se maintient, jauge au-dessus de la cible :
//     - chardons : arrachés avec une brosse (2 cr) ;
//     - graines : au râteau, sur une tuile fanée AVANT de la polliniser ; la tuile devient nue, il faudra la replanter
//       (râteau encore, 0,5 kg de graines) pour finir le secteur : vitesse ou valeur, un choix à chaque tuile ;
//     - nectar : au collecteur à main, sur une tuile déjà en fleurs (une fois par tuile) ;
//     - miel et cire : à l'enfumoir, sur une ruche (la cire seulement à partir de la ruche renforcée) ;
//     - Azurelles mères : isolées et luisantes, cueillies avec une brosse en 3 s ;
//     - irrigation : tuyau déroulé depuis la pompe. Balises : E, +100 cr.
// =====================================================================
const brosseEnMain = () => !!OUTILS_DEF[outilEnMain].largeur;
const PRIX_RES = { nectar: 1.2, graines: 0.6 };   // en multiples du prix de la tuile
const pres = (v) => v && v.k >= 0 && v.dist < amelio('portee');
const au = (k, h = 0) => new V3().copy(T.pos[k]).addScaledVector(T.dir[k], h);
ACTIONS.push({   // arracher les chardons
  quand: (v) => brosseEnMain() && pres(v) && T.sorte[v.k] === 1 && ouvert(v.k), geste: 'arracher',
  get duree() { return outilDef().duree * 0.7; },
  faire(v) { desherber(v.k); sons.arrache(); bouffee(T.pos[v.k], 14, 0x8c8794); S.credits += 2; },
});
ACTIONS.push({   // cueillir une Azurelle mère
  quand: (v) => brosseEnMain() && pres(v) && T.sorte[v.k] === 3 && place() >= 1, duree: 3, geste: 'arracher',
  faire(v) { ajouter('mere', 1, 120 * (T.sect[v.k] + 1)); cueillirMere(v.k); sons.vente(); bouffee(au(v.k, 0.4), 30, 0x8fb4ff); },
});
ACTIONS.push({   // ramasser les graines d'une tuile fanée
  quand: (v) => outilEnMain === 'rateau' && pres(v) && ouvert(v.k) && !T.vert[v.k] && T.sorte[v.k] === 0 && place() >= 0.5, duree: 1.2, geste: 'arracher',
  faire(v) { ajouter('graines', 0.5, prixTuile(v.k) * PRIX_RES.graines); changerSorte(v.k, 4); sons.arrache(); bouffee(T.pos[v.k], 12, 0x8a6a3a); },
});
ACTIONS.push({   // replanter une tuile nue (0,5 kg de graines)
  quand: (v) => outilEnMain === 'rateau' && pres(v) && T.sorte[v.k] === 4 && S.sac.graines.kg >= 0.5, duree: 1.2, geste: 'arracher',
  faire(v) { retirer('graines', 0.5); changerSorte(v.k, 0); sons.pop(); },
});
ACTIONS.push({   // aspirer le nectar d'une tuile en fleurs
  quand: (v) => outilEnMain === 'collecteur' && pres(v) && T.vert[v.k] && !T.nectar[v.k] && place() >= 0.25, duree: 1.0,
  faire(v) { ajouter('nectar', 0.25, prixTuile(v.k) * PRIX_RES.nectar); T.nectar[v.k] = 1; sons.pop(); bouffee(au(v.k, 0.2), 10, 0x9fd0ff); },
});
// Une cible « objet » : ce qu'on vise de près (ruche, panneau, machine, essaim), à moins de 1,6 m du point visé.
function objetVise(v, liste, r = 1.6) { if (!v) return null; let best = null, bd = r; for (const o of liste) { const d = o.p.distanceTo(v.p); if (d < bd && o.p.distanceTo(joueur.p) < 4.5) { bd = d; best = o; } } return best; }

// --- Irriguer : tuyau en main, E à la pompe le branche ; on marche et il se déroule derrière soi (45 m au plus),
//     arrosant les tuiles arides qu'il longe. E ailleurs le coupe ; il reste posé. ---
const SEG_MAX = 600, LONG_TUYAU = 45;
const segTuyau = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.055, 1, 8).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: CHARTE.graphite, roughness: 0.6 }), SEG_MAX);
segTuyau.count = 0; segTuyau.receiveShadow = true; segTuyau.frustumCulled = false; scene.add(segTuyau);
const bagues = new THREE.InstancedMesh(new THREE.TorusGeometry(0.065, 0.018, 6, 12).rotateY(Math.PI / 2), M.pollen, SEG_MAX); bagues.count = 0; bagues.frustumCulled = false; scene.add(bagues);
const TUYAUX = [];   // { pts: [V3...] } : les tuyaux posés (sauvegardés)
let tuyauCourant = null;
const SORTIE_POMPE = surSol(monde(POMPE, 0.82, 0, 0.3), 0.06);
const _bx = new V3(), _by = new V3(), _bz = new V3();
function segment(a, b) {   // un tronçon posé au sol entre deux points, bague jaune à chaque jonction
  if (segTuyau.count >= SEG_MAX) return;
  _bx.subVectors(b, a); const l = _bx.length(); _bx.multiplyScalar(1 / l); _by.copy(a).normalize(); _bz.crossVectors(_bx, _by).normalize(); _by.crossVectors(_bz, _bx);
  _q.setFromRotationMatrix(_m.makeBasis(_bx, _by, _bz));
  _m.compose(_p.addVectors(a, b).multiplyScalar(0.5), _q, _s.set(l, 1, 1)); segTuyau.setMatrixAt(segTuyau.count++, _m); segTuyau.instanceMatrix.needsUpdate = true;
  _m.compose(b, _q, _s.set(1, 1, 1)); bagues.setMatrixAt(bagues.count++, _m); bagues.instanceMatrix.needsUpdate = true;
}
function arroser(p) {   // les tuiles arides à moins de 1,8 m du tuyau deviennent humides et pollinisables
  const k0 = tuileA(p); if (k0 < 0) return;
  for (const id of [T.id[k0], ...voisinsDe(T.id[k0])]) { const k = IDX.get(id); if (k === undefined || T.irrigue[k] || T.sorte[k] !== 2 || T.pos[k].distanceTo(p) > 1.8) continue; T.irrigue[k] = 1; ecrireTuile(k); bouffee(T.pos[k], 10, 0x6fb6ea); }
}
const longueur = (t) => { let l = 0; for (let k = 1; k < t.pts.length; k++) l += t.pts[k].distanceTo(t.pts[k - 1]); return l; };
INTER.push({ p: monde(POMPE, 0.82, 1.0, 0.3), r: 3.2,
  agir() { if (outilEnMain !== 'tuyau') { sons.refus(); return; } if (tuyauCourant) { tuyauCourant = null; return; } tuyauCourant = { pts: [SORTIE_POMPE.clone()] }; TUYAUX.push(tuyauCourant); sons.achat(); } });
INTER_HORS.push(() => { if (!tuyauCourant) return false; tuyauCourant = null; return true; });
MAJ.push(() => {
  if (!tuyauCourant) return;
  if (outilEnMain !== 'tuyau') { tuyauCourant = null; return; }
  const t = tuyauCourant, d = t.pts[t.pts.length - 1], l = joueur.p.distanceTo(d);
  if (l < 1) return;
  if (longueur(t) + l > LONG_TUYAU) { tuyauCourant = null; sons.refus(); return; }
  const p = surSol(joueur.p, 0.06); segment(d, p); t.pts.push(p); arroser(p); arroser(new V3().addVectors(p, d).multiplyScalar(0.5));
});

// --- Les ruches autonomes (posées en mode construction, déplaçables). Trois niveaux : simple (rayon d'une tuile),
//     renforcée (trois tuiles), mère (tout le secteur). Une ruche pollinise seule une tuile de son rayon toutes les
//     3 s (2 s, 1,2 s), le pollen est payé aussitôt ; elle fait un pot de miel toutes les 20 s et, à partir de la
//     renforcée, un pain de cire toutes les 40 s. On les prend à l'enfumoir.
//     Accident : de temps en temps un essaim s'échappe ; la ruche s'arrête tant qu'on ne l'a pas ramené. ---
const RUCHES = [], RAYONS_RUCHE = [PAS * 1.3, PAS * 3.3, 0], DUREES_RUCHE = [3, 2, 1.2], PRIX_MIEL = 12, PRIX_CIRE = 18;
function fabriquerRuche(niveau = 0) {   // corps à panneaux en hausses (une de plus par niveau), toit charbon à liseré, planche d'envol
  const g = new THREE.Group(), base = socle(g, 0.7, 0.7), n = 2 + niveau;
  for (let k = 0; k < n; k++) placer(g, boite(0.7, 0.3, 0.7, M.panneau, 0.03), 0, base + 0.15 + k * 0.32, 0);
  for (let k = 0; k < n - 1; k++) placer(g, boite(0.74, 0.025, 0.74, M.graphite, 0.01), 0, base + 0.31 + k * 0.32, 0);
  placer(g, boite(0.86, 0.1, 0.86, M.graphite, 0.03), 0, base + n * 0.32 + 0.06, 0);
  placer(g, boite(0.88, 0.03, 0.88, M.lisere, 0.012), 0, base + n * 0.32, 0);
  placer(g, boite(0.4, 0.03, 0.14, M.pollen, 0.01), 0, base + 0.05, 0.42);
  placer(g, boite(0.3, 0.04, 0.02, M.graphite, 0.01), 0, base + 0.09, 0.355);
  for (let k = 0; k <= niveau; k++) placer(g, boite(0.07, 0.07, 0.02, M.seve, 0.01), -0.12 + k * 0.12, base + 0.5, 0.355);
  if (niveau === 2) placer(g, cylindre(0.12, 0.2, 0.3, M.pollen, 12), 0, base + n * 0.32 + 0.26, 0);
  return fusionner(g);
}
function ciblesRuche(p, niveau) {   // les tuiles du rayon ; la ruche mère couvre tout le secteur où elle est posée
  const out = [];
  if (niveau === 2) { let s = -1, bd = 1e9; for (let k = 0; k < NSECT; k++) { const d = RP * _d.copy(p).normalize().distanceTo(SECTEURS[k].c) - SECTEURS[k].r; if (d < bd) { bd = d; s = k; } } if (bd > 12) return out; for (let k = 0; k < NT; k++) if (T.sect[k] === s) out.push(k); return out; }
  const r = RAYONS_RUCHE[niveau] + 0.3; for (let k = 0; k < NT; k++) if (Math.abs(T.pos[k].x - p.x) < r && T.pos[k].distanceTo(p) < r) out.push(k);
  return out;
}
function installerRuche(p, niveau, face) {
  const g = fabriquerRuche(niveau); poserSur(g, assise(p, 0.5), face || versBase(p)); scene.add(g);
  const r = { p: g.position.clone(), g, niveau, t: 0, miel: 0, cire: 0, tMiel: 0, tCire: 0, partie: false, cibles: ciblesRuche(g.position, niveau), ombre: ombreContact(g, 0.9), obs: { p: g.position.clone(), r: 0.6 } };
  OBSTACLES.push(r.obs); RUCHES.push(r); return r;
}
function retirerRuche(r) { scene.remove(r.g); scene.remove(r.ombre); OBSTACLES.splice(OBSTACLES.indexOf(r.obs), 1); RUCHES.splice(RUCHES.indexOf(r), 1); if (ESSAIM.e === r) ESSAIM.actif = false; }
function tuileRuche(r) { const c = r.cibles; for (let n = 0; n < 16; n++) { const k = c[Math.floor(Math.random() * c.length)]; if (pollinisable(k)) return k; } if (c.length < 400) for (const k of c) if (pollinisable(k)) return k; return -1; }
const ABEILLES = 12, RUCHES_VUES = 12, abeillesGeo = new THREE.BufferGeometry(), abeillesPos = new Float32Array(RUCHES_VUES * ABEILLES * 3);
abeillesGeo.setAttribute('position', new THREE.BufferAttribute(abeillesPos, 3));
const abeilles = new THREE.Points(abeillesGeo, new THREE.PointsMaterial({ color: 0x3b2f12, size: 0.05 })); abeilles.frustumCulled = false; scene.add(abeilles);
ACTIONS.push({   // enfumer une ruche : on prend son miel et sa cire
  quand: (v) => { if (outilEnMain !== 'enfumoir') return false; const r = objetVise(v, RUCHES); return !!r && r.miel + r.cire > 0; },
  duree: 1.5, objet: (v) => surSol(objetVise(v, RUCHES).p, 1.9),
  faire(v) {
    const r = objetVise(v, RUCHES);
    while (r.miel > 0 && place() >= 0.5) { r.miel--; ajouter('miel', 0.5, PRIX_MIEL); }
    while (r.cire > 0 && place() >= 0.25) { r.cire--; ajouter('cire', 0.25, PRIX_CIRE); }
    sons.vente(); bouffee(surSol(r.p, 0.8), 30, 0xd8d8d8);
  },
});
// L'essaim échappé : un nuage qui va se poser plus loin. On le ramène en le visant (enfumoir ou brosse), 1,5 s.
const ESSAIM = { actif: false, e: null, p: new V3(), cible: new V3(), prochain: 360 + Math.random() * 180 };
const NESS = 90, essaimPos = new Float32Array(NESS * 3), essaimGeo = new THREE.BufferGeometry(); essaimGeo.setAttribute('position', new THREE.BufferAttribute(essaimPos, 3));
const nuage = new THREE.Points(essaimGeo, new THREE.PointsMaterial({ color: 0x2b220c, size: 0.07 })); nuage.frustumCulled = false; nuage.visible = false; scene.add(nuage);
function echapperEssaim() {
  const l = RUCHES.filter((r) => !r.partie); if (!l.length) return false;
  const e = l[Math.floor(Math.random() * l.length)];
  ESSAIM.actif = true; ESSAIM.e = e; ESSAIM.p.copy(e.p); surSol(deplacer(e.p.clone().normalize(), Math.random() * 360, 14 + Math.random() * 10), 0, ESSAIM.cible); e.partie = true; return true;
}
ACTIONS.push({
  quand: (v) => ESSAIM.actif && (outilEnMain === 'enfumoir' || brosseEnMain()) && !!objetVise(v, [ESSAIM], 2.2), duree: 1.5,
  objet: () => surSol(ESSAIM.p, 1.5),
  faire() { ESSAIM.e.partie = false; ESSAIM.actif = false; sons.achat(); },
});
MAJ.push((dt) => {
  let n = 0; const proches = RUCHES.filter((r) => r.p.distanceTo(joueur.p) < 60).slice(0, RUCHES_VUES);
  for (const r of proches) {
    const { up, est, nord } = repere(r.p);
    for (let b = 0; b < ABEILLES; b++, n++) {
      if (r.partie) { abeillesPos.set([0, 0, 0], n * 3); continue; }
      const a = gt * (1.2 + (b % 5) * 0.3) * (1 + r.niveau * 0.4) + b * 2.1, rr = 0.8 + (b % 4) * 0.5 + Math.sin(gt * 0.7 + b) * 0.3;
      _vp.copy(r.p).addScaledVector(est, Math.cos(a) * rr).addScaledVector(nord, Math.sin(a) * rr).addScaledVector(up, 0.7 + Math.sin(a * 1.7 + b) * 0.4 + (b % 3) * 0.25); abeillesPos.set([_vp.x, _vp.y, _vp.z], n * 3);
    }
  }
  for (; n < RUCHES_VUES * ABEILLES; n++) abeillesPos.set([0, 0, 0], n * 3);
  abeillesGeo.attributes.position.needsUpdate = true;
  for (const r of RUCHES) {
    if (r.partie) continue;
    r.t += dt; if (r.t >= DUREES_RUCHE[r.niveau]) { r.t = 0; const k = tuileRuche(r); if (k >= 0) { S.credits += polliniser(k, 'ruche'); noter('pollen', KG_TUILE); } }
    r.tMiel += dt; if (r.tMiel >= 20) { r.tMiel = 0; r.miel = Math.min(6, r.miel + 1); }
    if (r.niveau >= 1) { r.tCire += dt; if (r.tCire >= 40) { r.tCire = 0; r.cire = Math.min(4, r.cire + 1); } }
  }
  // L'essaim : il s'envole vers son point de chute, puis tourne en boule.
  if (!ESSAIM.actif) { ESSAIM.prochain -= dt; if (ESSAIM.prochain <= 0) { ESSAIM.prochain = 360 + Math.random() * 180; echapperEssaim(); } nuage.visible = false; return; }
  ESSAIM.p.lerp(ESSAIM.cible, 1 - Math.exp(-dt * 0.4)); surSol(ESSAIM.p, 0, ESSAIM.p);
  nuage.visible = true; const { up, est, nord } = repere(ESSAIM.p);
  for (let k = 0; k < NESS; k++) { const a = gt * (2 + (k % 7) * 0.4) + k, rr = 0.3 + (k % 9) * 0.09 + Math.sin(gt * 3 + k) * 0.1; _vp.copy(ESSAIM.p).addScaledVector(est, Math.cos(a) * rr).addScaledVector(nord, Math.sin(a) * rr).addScaledVector(up, 1.4 + Math.sin(a * 1.3 + k) * 0.45); essaimPos.set([_vp.x, _vp.y, _vp.z], k * 3); }
  essaimGeo.attributes.position.needsUpdate = true;
});

// --- L'exploration : une balise au-delà de chaque secteur. E : +100 cr, le feu passe au cyan. ---
const BALISES = [];
for (let s = 0; s < NSECT; s++) {
  const p = surSol(deplacer(SECTEURS[s].c, 40 + s * 67, SECTEURS[s].r + 9)), g = new THREE.Group(), base = socle(g, 0.6, 0.6);
  placer(g, tube(0.06, 0.08, 3.2, M.blanc), 0, base + 1.6, 0);
  for (let k = 0; k < 3; k++) placer(g, tube(0.085, 0.085, 0.06, M.graphite), 0, base + 0.6 + k * 1, 0);
  const feu = placer(g, new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: CHARTE.pollen, emissiveIntensity: 2.5 })), 0, base + 3.35, 0); feu.userData.garder = true;
  placer(g, boite(0.5, 0.35, 0.06, M.graphite, 0.02), 0, base + 1.2, 0.1);
  fusionner(g); poserSur(g, assise(p, 0.65), tangent(p, new V3().subVectors(SECTEURS[s].c, p))); scene.add(g); ombreContact(g, 0.8); OBSTACLES.push({ p: g.position.clone(), r: 0.6 });
  BALISES.push({ p: g.position.clone(), s, g, feu, active: false });
}
function activerBalise(b, payer = true) { b.active = true; b.feu.material.emissive.set(CHARTE.seve); if (payer) { S.credits += 100; sons.vente(); } }
for (const b of BALISES) INTER.push({ p: surSol(b.p, 1.3), r: 3, agir() { if (!b.active) activerBalise(b); } });

// --- Les colis : sac plein, E (sans rien à utiliser devant soi) l'emballe et le pose au sol devant soi.
//     E près d'un colis le prend à bras-le-corps (on ne peut plus travailler, on marche moins vite) ;
//     E à la borne ou au collecteur le vend, E au bout d'un tapis ou sur un quai l'y dépose, E ailleurs le repose.
//     Accident : posé sur une pente, un colis dévale jusqu'au replat. ---
const COLIS = [], M_COLIS = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, map: texPanneaux(2, 1, [0.45]) });
let porte = null;
function fabriquerColis() { const g = new THREE.Group(); placer(g, boite(0.5, 0.42, 0.5, M_COLIS, 0.05), 0, 0.21, 0); placer(g, boite(0.52, 0.06, 0.52, M.lisere, 0.02), 0, 0.3, 0); placer(g, boite(0.2, 0.05, 0.08, M.graphite, 0.02), 0, 0.44, 0); return g; }
const devant = (d = 1.2) => surSol(new V3().copy(joueur.p).addScaledVector(joueur.f, d), surcote(_vp.copy(joueur.p).addScaledVector(joueur.f, d)));
function creerColis(contenu, p) { const c = { contenu, p: p.clone(), v: new V3(), g: fabriquerColis() }; poserSur(c.g, c.p, joueur.f); scene.add(c.g); c.ombre = ombreContact(c.g, 0.45, true); COLIS.push(c); return c; }
function emballer() { if (kgSac() <= 0) return false; creerColis(S.sac, devant()); S.sac = sacVide(); sons.achat(); return true; }
function prendreColis(c) { porte = c; scene.remove(c.g); c.ombre.visible = false; COLIS.splice(COLIS.indexOf(c), 1); joueur.lent = 0.75; sons.pop(); }
function poserColis() { const c = porte; porte = null; joueur.lent = 1; c.p.copy(devant()); c.v.set(0, 0, 0); poserSur(c.g, c.p, joueur.f); scene.add(c.g); c.ombre.visible = true; COLIS.push(c); }
INTER_HORS.push(() => {   // E sans cible : poser le colis porté, ou en prendre un proche, ou emballer le sac
  if (porte) { if (DEPOSER_COLIS.some((f) => f(porte))) { porte = null; joueur.lent = 1; return true; } poserColis(); return true; }
  const proche = COLIS.filter((c) => c.p.distanceTo(joueur.p) < 2.2).sort((a, b) => a.p.distanceTo(joueur.p) - b.p.distanceTo(joueur.p))[0];
  if (proche) { prendreColis(proche); return true; }
  return emballer();
});
const DEPOSER_COLIS = [];   // l'automatisation y ajoute : déposer sur un tapis ou un quai
for (const it of INTER.filter((i) => i.vente)) { const a0 = it.agir; it.agir = () => { if (porte) { const v = valeurSac(porte.contenu); porte = null; joueur.lent = 1; vendre(v); return; } a0(); }; }
MAJ.push((dt) => {
  if (porte) vue.visible = false;
  for (const c of COLIS) {   // la pente fait rouler les colis
    const { up, est, nord } = repere(c.p), e = 0.3, h = (a, b) => { _vp.copy(c.p).addScaledVector(est, a).addScaledVector(nord, b).normalize(); return sol(_vp); };
    const gx = (h(e, 0) - h(-e, 0)) / (2 * e), gz = (h(0, e) - h(0, -e)) / (2 * e), pente = Math.hypot(gx, gz), plat = pente <= 0.05 || surcote(c.p) > 0;
    if (!plat) c.v.addScaledVector(est, -gx * 9 * dt).addScaledVector(nord, -gz * 9 * dt);
    c.v.multiplyScalar(Math.exp(-dt * 0.8)); c.v.addScaledVector(up, -c.v.dot(up));
    if (c.v.length() < 0.05 && plat) { c.v.set(0, 0, 0); continue; }
    _np.copy(c.p).addScaledVector(c.v, dt); const r = repousser(_np, 0.3); if (r.touche) { _np.copy(r.p); c.v.multiplyScalar(-0.4); }
    if (altitude(_np) < NIVEAU_MER + 0.3) { c.v.set(0, 0, 0); continue; }   // s'arrête au bord de l'eau
    surSol(_np, 0, c.p); c.g.position.copy(c.p); c.g.rotateX(c.v.length() * dt * 2);
  }
});
