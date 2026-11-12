// =====================================================================
// 18. La mini-ville, les fermes solaires, les robots avancés.
//     - La mini-ville (100 000 000 cr), au nord de la base : dix maisons, une mairie à horloge, une fontaine, des arbres,
//       des réverbères. Ses 24 habitants ne travaillent qu'à l'usine (ligne B, moitié moins payés : ils sont logés) ;
//       on les voit flâner sur la place et faire le trajet jusqu'à l'usine.
//     - Les panneaux solaires sont sur les toits ou derrière les bâtiments : niveaux 4 et 5 de la toiture = deux fermes
//       solaires au sol, derrière l'usine puis derrière le garage.
//     - Les robots avancés : sur roues, trois bras-pinceaux ; deux fois plus rapides, ils pollinisent trois parcelles à la
//       fois et usent moitié moins de brosses.
// =====================================================================
const PRIX_VILLE = 100000000;
const VILLE = (() => { const g = new THREE.Group(), p = local(0, -52); poserSur(g, p, versBase(p)); scene.add(g); return g; })();
const yS = (x, z) => -(x * x + z * z) / (2 * RP) - 0.03;   // le sol sous (x, z) dans le repère plat de la ville : la planète est courbe
const ARBRE = (g, x, z, h = 2.4) => { const y = yS(x, z); placer(g, tube(0.12, 0.16, h, M.graphite), x, y + h / 2, z); placer(g, new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 0), M_FEUILLE), x, y + h + 0.6, z).castShadow = true; };
// Avant l'achat : un terrain clôturé, un panneau, une borne.
const CHANTIER = (() => {
  const g = new THREE.Group(); VILLE.add(g);
  for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) > 0) continue; const y = yS(17, 0); placer(g, boite(0.1, 1.0, 0.1, M.graphite, 0.02), Math.sin(a) * 17, y + 0.5, Math.cos(a) * 17); placer(g, boite(2.7, 0.06, 0.06, M.lisere, 0.01), Math.sin(a + 0.08) * 17, y + 0.85, Math.cos(a + 0.08) * 17, a + Math.PI / 2); }
  const ys = yS(0, 15.5); placer(g, boite(0.16, 3.2, 0.16, M.graphite, 0.03), -2.2, ys + 1.6, 15.5); placer(g, boite(0.16, 3.2, 0.16, M.graphite, 0.03), 2.2, ys + 1.6, 15.5);
  placer(g, boite(5.0, 1.6, 0.1, new THREE.MeshStandardMaterial({ map: texteTex([['MINI-VILLE', 70], ['100 000 000 cr', 54, '#f08a24']], 1024, 320, '#edeae4', '#2e343a'), roughness: 0.5 }), 0.02), 0, ys + 2.6, 15.55);
  fusionner(g); return g;
})();
// Les maisons : dix, en arc autour de la place ; l'allée qui descend vers la base (au sud, +z) reste libre.
const MAISONS = Array.from({ length: 10 }, (_, k) => { const a = Math.PI * 0.22 + (k / 9) * Math.PI * 1.56; return [k, a, Math.sin(a) * 13, Math.cos(a) * 13]; });
// Après l'achat : maisons autour de la place, mairie au fond, fontaine au centre.
const QUARTIER = (() => {
  const g = new THREE.Group(); VILLE.add(g);
  const facades = [0xedeae4, 0xf3d9b1, 0xcfe3e8, 0xe8c9c9, 0xdfe8cf].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })), toits = [M.lisere, M.graphite, new THREE.MeshStandardMaterial({ color: 0xb5482c, roughness: 0.7 })];
  const toit = (larg, prof) => { const s = new THREE.Shape(); s.moveTo(-larg / 2 - 0.25, 0); s.lineTo(larg / 2 + 0.25, 0); s.lineTo(0, larg * 0.42); s.lineTo(-larg / 2 - 0.25, 0); const geo = new THREE.ExtrudeGeometry(s, { depth: prof + 0.4, bevelEnabled: false }); geo.translate(0, 0, -(prof + 0.4) / 2); return geo; };
  for (const [k, a, x, z] of MAISONS) {
    const m = new THREE.Group(); placer(g, m, x, yS(x, z) - 0.15, z, a + Math.PI);
    const w = 3.2 + (k % 3) * 0.4, d = 3.0, h = 2.6 + (k % 2) * 0.6;
    placer(m, boite(w, h + 0.3, d, facades[k % facades.length], 0.05), 0, (h - 0.3) / 2, 0); placer(m, new THREE.Mesh(toit(w, d), toits[k % toits.length]), 0, h, 0).castShadow = true;
    placer(m, boite(0.8, 1.6, 0.06, M.graphite, 0.02), 0, 0.8, d / 2 + 0.01); placer(m, boite(0.1, 0.1, 0.04, M.lisere, 0.01), 0.25, 0.85, d / 2 + 0.05);
    for (const s of [-1, 1]) { placer(m, boite(0.7, 0.7, 0.05, M.seve, 0.02), s * (w / 2 - 0.75), h * 0.62, d / 2 + 0.01); placer(m, boite(0.82, 0.06, 0.1, M.blanc, 0.02), s * (w / 2 - 0.75), h * 0.62 - 0.4, d / 2 + 0.04); }
    placer(m, boite(0.5, 0.9, 0.5, M.graphite, 0.03), w / 2 - 0.6, h + 0.6, -0.4);   // cheminée
  }
  // la mairie, au nord de la place, et sa tour d'horloge
  const gm = new THREE.Group(); placer(g, gm, 0, yS(0, -13.5) - 0.1, 0); g.add(gm);
  { const g = gm;
  placer(g, boite(8, 4.2, 5, facades[0], 0.06), 0, 2.1, -13.5); placer(g, new THREE.Mesh(toit(8, 5), M.graphite), 0, 4.2, -13.5).castShadow = true; placer(g, boite(8.1, 0.12, 5.1, M.lisere, 0.03), 0, 4.15, -13.5);
  placer(g, boite(2.0, 3.6, 2.0, facades[0], 0.05), 0, 6.0, -13.5); placer(g, new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.8, 4), M.lisere), 0, 8.7, -13.5, Math.PI / 4).castShadow = true;
  placer(g, cylindre(0.65, 0.65, 0.08, M.blanc, 24), 0, 6.4, -12.48).rotation.x = Math.PI / 2; for (const r of [0, 1.2]) placer(g, boite(0.06, 0.5, 0.03, M.graphite, 0.01), 0, 6.55, -12.42, 0).rotation.z = r;
  placer(g, boite(1.6, 2.4, 0.06, M.graphite, 0.02), 0, 1.2, -10.99); for (const s of [-1, 1]) for (const x of [2.4, 3.4]) placer(g, boite(0.6, 1.4, 0.05, M.seve, 0.02), s * x, 2.4, -10.99);
  placer(g, boite(3.2, 0.5, 0.1, new THREE.MeshStandardMaterial({ map: texteTex([['MAIRIE', 70]], 512, 96, '#2e343a', '#fffdf7'), roughness: 0.5 }), 0.02), 0, 3.5, -10.95);
  }
  // la fontaine
  placer(g, cylindre(2.2, 2.4, 0.5, M.blanc, 32), 0, 0.25, 0); placer(g, cylindre(1.95, 1.95, 0.08, new THREE.MeshStandardMaterial({ color: 0x4fb6e3, emissive: 0x1a5f7a, emissiveIntensity: 0.4, roughness: 0.05, metalness: 0.2 }), 32), 0, 0.46, 0);
  placer(g, tube(0.2, 0.3, 1.6, M.blanc), 0, 1.2, 0); placer(g, cylindre(0.7, 0.4, 0.2, M.blanc, 20), 0, 2.0, 0);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ARBRE(g, Math.sin(a) * 7.5, Math.cos(a) * 7.5, 2.2 + (k % 3) * 0.3); }
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3, x = Math.sin(a) * 10, z = Math.cos(a) * 10, y = yS(x, z); placer(g, tube(0.05, 0.07, 3.2, M.graphite), x, y + 1.6, z); placer(g, boite(0.4, 0.12, 0.4, M_LUM, 0.03), x, y + 3.25, z); }
  for (let z = 2.5; z < 18; z += 2) placer(g, boite(2.6, 0.06, 2.1, M_BETON, 0.005), 0, yS(0, z) + 0.03, z);   // l'allée vers la base, en dalles qui suivent la courbure
  fusionner(g); g.visible = false; return g;
})();
VILLE.updateMatrixWorld(true);
S.ville = !!S.ville;
let OBS_VILLE = [];
const majVille = () => { QUARTIER.visible = S.ville; CHANTIER.visible = !S.ville; for (const o of OBS_VILLE) o.inactif = !S.ville; };
OBS_VILLE = [boiteDe(VILLE, 4.1, 2.6, {}, 0, -13.5), { p: surSol(monde(VILLE, 0, 0, 0)), r: 2.4 }];
for (const [k, a, x, z] of MAISONS) { const m = new THREE.Object3D(); poserDans(m, VILLE, x, z, a + Math.PI); OBS_VILLE.push(boiteDe(m, (3.2 + (k % 3) * 0.4) / 2 + 0.1, 1.6, {})); }
for (const o of OBS_VILLE) OBSTACLES.push(o);
majVille();
const BORNE_VILLE = borneDans(VILLE, 3.6, 17.5, 'MINI-VILLE');
function dessinerVille() {
  const e = BORNE_VILLE.e, g = e.g; fond(e); g.textAlign = 'center';
  g.fillStyle = '#c9c3b6'; g.font = '800 22px system-ui'; g.fillText('MINI-VILLE', 160, 30);
  if (S.ville) { g.fillStyle = '#4fd6e3'; g.font = '800 30px system-ui'; g.fillText(`${POPULATION} habitants`, 160, 90); g.fillStyle = '#edeae4'; g.font = '800 19px system-ui'; g.fillText('tous à l’usine, ligne B', 160, 130); g.fillText(`${fmtCr(parMin(POPULATION * SALAIRE_VILLE))} cr/min de salaires`, 160, 165); }
  else { g.fillStyle = '#edeae4'; g.font = '800 19px system-ui'; g.fillText(`${POPULATION} habitants pour l’usine`, 160, 80); g.fillText('dix maisons, mairie, fontaine', 160, 112); g.font = '800 28px system-ui'; g.fillStyle = S.credits >= PRIX_VILLE ? '#f08a24' : '#e0452f'; g.fillText(`${fmtCr(PRIX_VILLE)} cr`, 160, 190); }
  e.maj();
}
INTER.push({ p: BORNE_VILLE.p, r: 2.4, get etiquette() { return S.ville ? null : `Bâtir la ville (${fmtCr(PRIX_VILLE)} cr)`; },
  agir() { if (S.ville || S.credits < PRIX_VILLE) { sons.refus(); return; } S.credits -= PRIX_VILLE; S.ville = true; majVille(); sons.niveau(); montrerBandeau('La mini-ville est bâtie', `${POPULATION} habitants rejoignent l'usine`); dessinerVille(); sauverBientot(); } });
// Les habitants : huit flânent sur la place, six font la navette entre la ville et l'usine.
const CHEMIN_USINE = [surSol(monde(VILLE, 0, 0, 17))].concat([[-6, -33], [-20, -29], [-34, -18]].map(([x, z]) => local(x, z)));
CHEMIN_USINE.push(surSol(monde(USINE, 0, 0, UD / 2 + 0.6)));
const HABITANTS = Array.from({ length: 14 }, (_, k) => { const o = fabriquerOuvrier(PEAUX[(k + 2) % PEAUX.length]); o.visible = false; scene.add(o); return { o, k, t: Math.random() * 40, p: new V3(), but: new V3(), f: new V3() }; });
const _hv = new V3();
MAJ.push((dt) => {
  majVille();
  const pres = S.ville && joueur.p.distanceTo(VILLE.position) < 140;
  for (const h of HABITANTS) {
    h.o.visible = pres; if (!pres) continue;
    h.t += dt; let marche = true;
    if (h.k < 8) {   // flâneurs : de la fontaine à une maison, une pause, et ainsi de suite
      if (!h.init || h.p.distanceTo(h.but) < 0.6) { if (h.init && h.t < 3) marche = false; else { const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 7; h.but.copy(surSol(monde(VILLE, Math.sin(a) * r, 0, Math.cos(a) * r))); if (!h.init) h.p.copy(h.but); h.init = true; h.t = 0; } }
    } else {   // navetteurs : le long du chemin, aller et retour
      const n = CHEMIN_USINE.length - 1, s = ((h.t * 0.025 + h.k * 0.17) % 2), u = s < 1 ? s : 2 - s, i = Math.min(n - 1, Math.floor(u * n)); h.but.copy(CHEMIN_USINE[i]).lerp(CHEMIN_USINE[i + 1], u * n - i); if (!h.init) { h.p.copy(h.but); h.init = true; }
    }
    if (marche) { tangent(h.p, _hv.subVectors(h.but, h.p), _hv); if (_hv.lengthSq() > 0) h.f.lerp(_hv, 1 - Math.exp(-dt * 5)).normalize(); surSol(h.p.addScaledVector(_hv, Math.min(h.p.distanceTo(h.but), 1.3 * dt)), 0, h.p); }
    if (h.f.lengthSq() < 0.5) h.f.copy(versBase(h.p));
    poserSur(h.o, h.p, h.f); const { bras, jambes } = h.o.userData, pas = marche ? Math.sin(h.t * 8 + h.k) : 0;
    jambes[0].rotation.x = pas * 0.5; jambes[1].rotation.x = -pas * 0.5; bras[0].rotation.x = -pas * 0.35; bras[1].rotation.x = pas * 0.35;
  }
});

// --- Les fermes solaires (niveaux 4 et 5 de la toiture) : des rangées au sol derrière l'usine, puis derrière le garage. ---
TOIT.niveaux.push({ prix: 600000, kw: 150 }, { prix: 2500000, kw: 250 });
const FERMES = (() => {
  const cel = [], ajoute = (parent, x, z, niv) => cel.push({ parent, x, z, niv });
  for (let z = -UD / 2 - 2.6; z >= -UD / 2 - 9.2; z -= 2.2) for (let x = -8.8; x <= 8.9; x += 2.2) ajoute(USINE, x, z, 4);
  for (let z = -HANGAR.userData.D / 2 - 2.4; z >= -HANGAR.userData.D / 2 - 8.8; z -= 2.2) for (let x = -14.3; x <= 14.4; x += 2.2) ajoute(HANGAR, x, z, 5);
  const n = cel.length, mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.castShadow = true; m.frustumCulled = false; scene.add(m); return m; };
  const cadre = mk(new THREE.BoxGeometry(2.0, 0.07, 1.2), M.graphite), verre = mk(new THREE.BoxGeometry(1.9, 0.03, 1.1), M_CELLULE), pied = mk(new THREE.BoxGeometry(0.1, 1.4, 0.1), M.graphite);
  const _mm = new THREE.Matrix4(), qt = new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), -0.45), q0 = new THREE.Quaternion(), u = new V3(1, 1, 1), pp = new V3();
  cel.forEach((c, k) => {   // les panneaux regardent vers l'arrière du bâtiment (loin de la base), inclinés ; la hauteur suit le vrai sol
    const g = c.parent; g.updateMatrixWorld(true); const w = monde(g, c.x, 0, c.z), y = surSol(w.clone()).length() - w.length();
    _mm.compose(pp.set(c.x, y + 1.2, c.z), qt, u).premultiply(g.matrixWorld); cadre.setMatrixAt(k, _mm);
    _mm.compose(pp.set(c.x, y + 1.24, c.z), qt, u).premultiply(g.matrixWorld); verre.setMatrixAt(k, _mm);
    _mm.compose(pp.set(c.x, y + 0.6, c.z), q0, u).premultiply(g.matrixWorld); pied.setMatrixAt(k, _mm);
  });
  const maj = () => { const m = cel.filter((c) => S.toit >= c.niv).length; for (const o of [cadre, verre, pied]) { o.count = m; o.instanceMatrix.needsUpdate = true; } };
  maj(); return { maj, n };
})();
let nivFermes = S.toit;
MAJ.push(() => { if (nivFermes !== S.toit) { nivFermes = S.toit; FERMES.maj(); } });

// --- Les robots avancés. ---
const ROBOTS2 = [], MAX_ROBOTS2 = 20, prixRobot2 = (n) => Math.round(60000 * Math.pow(1.3, n) / 100) * 100;
S.robots2 = S.robots2 || 0;
function fabriquerRobot2() {   // sur une roue carénée, corps cyan, tête graphite à visière, trois bras-pinceaux qui tournent
  const g = new THREE.Group(), c = new THREE.Group(); g.add(c);
  placer(c, cylindre(0.28, 0.32, 0.22, M.graphite, 16), 0, 0.12, 0); placer(c, cylindre(0.33, 0.33, 0.04, M.lisere, 16), 0, 0.24, 0);
  placer(c, new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 12), M.seve), 0, 0.75, 0); placer(c, new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), M.graphite), 0, 1.3, 0); placer(c, boite(0.26, 0.06, 0.06, M.lisere, 0.02), 0, 1.33, -0.16);
  const rot = new THREE.Group(); rot.position.set(0, 0.95, 0); rot.userData.garder = true; c.add(rot);
  for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; placer(rot, tube(0.025, 0.025, 0.55, M.graphite), Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3).rotation.set(0, -a, Math.PI / 2); placer(rot, cylindre(0.07, 0.09, 0.16, M_POILS, 10), Math.cos(a) * 0.58, -0.12, Math.sin(a) * 0.58); }
  g.userData.corps = c; g.userData.rot = rot; fusionner(c); g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return g;
}
MAJ.push((dt) => {
  while (ROBOTS2.length < Math.min(S.robots2, MAX_ROBOTS2)) { const p = SORTIE_HALL(); ROBOTS2.push({ g: fabriquerRobot2(), p: p.clone(), f: versBase(p).negate(), k: -1, t: 0, etat: 'cherche', phase: Math.random() * 6 }); scene.add(ROBOTS2[ROBOTS2.length - 1].g); }
  for (const r of ROBOTS2) {
    r.phase += dt;
    if (r.k >= 0 && !pollinisable(r.k)) { RESERVEES.delete(r.k); r.k = -1; r.etat = 'cherche'; }
    if (r.etat === 'cherche' && !brosseOk()) continue;
    if (r.etat === 'cherche') { r.t += dt; if (r.t > 0.3) { r.t = 0; const k = chercherTuile(r.p); if (k >= 0) { r.k = k; RESERVEES.add(k); r.etat = 'va'; } else { r.etat = 'explore'; r.but = surSol(new V3().copy(r.p).addScaledVector(tangent(r.p, _rd.subVectors(r.p, BASE)), 60)); } } }
    const but = r.etat === 'va' ? T.pos[r.k] : r.etat === 'explore' ? r.but : null;
    if (but) {
      const d = r.p.distanceTo(but);
      if (r.etat === 'va' && d < 1.0) { r.etat = 'travaille'; r.t = 0; } else if (r.etat === 'explore' && d < 2) r.etat = 'cherche';
      else { tangent(r.p, _rd.subVectors(but, r.p), _rd); r.f.lerp(_rd, 1 - Math.exp(-dt * 7)).normalize(); surSol(_vp.copy(r.p).addScaledVector(_rd, Math.min(d, 3.2 * (1 + 0.05 * S.rech.robots) * dt)), 0, r.p); const rp = repousser(r.p, 0.35); surSol(rp.p, 0, r.p); debloquer(r, d, but, dt); }
    }
    if (r.etat === 'travaille') {
      r.t += dt;
      if (r.t >= 1.2 / (1 + 0.05 * S.rech.robots)) {   // la parcelle visée et jusqu'à deux voisines
        const lot = [r.k, ...voisinsDe(T.id[r.k]).map((id) => IDX.get(id)).filter((k) => k !== undefined && pollinisable(k) && !RESERVEES.has(k)).slice(0, 2)];
        let v = 0; for (const k of lot) v += polliniser(k, 'bot2'); RESERVEES.delete(r.k); r.k = -1; r.etat = 'cherche'; r.t = 0.3;
        if (v > 0) { consommer('brosses', lot.length / 60); const cr = expedier(v, 'pollen'); S.robotVendu = (S.robotVendu || 0) + cr; if (r.p.distanceTo(joueur.p) < 30) flotter(_vp.copy(r.p).addScaledVector(_d.copy(r.p).normalize(), 0.8), `+${cr}`, 'fort'); }
      }
    }
    if (r.p.distanceTo(joueur.p) < 120) { poserSur(r.g, r.p, r.f); r.g.userData.rot.rotation.y += dt * (r.etat === 'travaille' ? 14 : 3); r.g.userData.corps.rotation.z = (r.etat === 'va' || r.etat === 'explore') ? Math.sin(r.phase * 6) * 0.04 : 0; r.g.visible = true; } else r.g.visible = false;
  }
});
const BORNE_ROBOTS2 = borneDans(USINE, 10, UD / 2 + 2.2, 'ROBOTS AVANCÉS');
function dessinerRobots2() {
  const e = BORNE_ROBOTS2.e, g = e.g; fond(e); g.textAlign = 'center';
  g.fillStyle = '#c9c3b6'; g.font = '800 20px system-ui'; g.fillText('ROBOTS AVANCÉS', 160, 28);
  g.fillStyle = '#edeae4'; g.font = '800 42px system-ui'; g.fillText(`${S.robots2} / ${MAX_ROBOTS2}`, 160, 80);
  g.fillStyle = '#c9c3b6'; g.font = '800 17px system-ui'; g.fillText('2× plus vite, 3 parcelles à la fois', 160, 122);
  const prix = prixRobot2(S.robots2); g.font = '800 22px system-ui'; g.fillStyle = S.robots2 >= MAX_ROBOTS2 ? '#4fd6e3' : S.credits >= prix ? '#f08a24' : '#e0452f';
  g.fillText(S.robots2 >= MAX_ROBOTS2 ? 'COMPLET' : `+1 : ${fmtCr(prix)} cr`, 160, 200); e.maj();
}
INTER.push({ p: BORNE_ROBOTS2.p, r: 2.2, get etiquette() { return S.robots2 < MAX_ROBOTS2 ? `Robot avancé (${fmtCr(prixRobot2(S.robots2))} cr)` : null; },
  agir() { const prix = prixRobot2(S.robots2); if (S.robots2 >= MAX_ROBOTS2 || S.credits < prix) { sons.refus(); return; } S.credits -= prix; S.robots2++; sons.achat(); dessinerRobots2(); sauverBientot(); } });
let tBornesV = 0;
MAJ.push((dt) => { tBornesV += dt; if (tBornesV < 0.5) return; tBornesV = 0; if (joueur.p.distanceTo(VILLE.position) < 45) dessinerVille(); if (joueur.p.distanceTo(USINE.position) < 45) dessinerRobots2(); });
dessinerVille(); dessinerRobots2();
