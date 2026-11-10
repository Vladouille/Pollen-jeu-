
// =====================================================================
// 7. Les outils, construits selon la charte : manches métalliques, têtes blanches,
//    poils jaune pollen, bagues graphite. Ils servent en main et sur le présentoir du comptoir.
// =====================================================================
const M_CHROME = new THREE.MeshStandardMaterial({ color: 0xd9dde0, roughness: 0.22, metalness: 0.95, map: M.graphite.map });
const M_POILS = new THREE.MeshStandardMaterial({ color: CHARTE.pollen, roughness: 0.85, map: pixels(64, 16, (x) => { const v = 0.78 + 0.22 * ((x * 7919) % 13) / 13; return [255 * v, 255 * v, 255 * v]; }, true, 1) });
function tube(r1, r2, l, mat, segs = 14) { const m = cylindre(r1, r2, l, mat, segs); m.castShadow = true; return m; }   // cylindre chanfreiné (voir la charte)
// Chaque outil est construit le long de +Y : le manche part de l'origine, la tête est au bout.
const OUTILS_DEF = {
  pinceau: { nom: 'Pinceau à main', prix: 0, largeur: 1, duree: 2.5 },
  brosse: { nom: 'Brosse à pollen', prix: 250, largeur: 1, duree: 1.8 },
  large: { nom: 'Brosse large', prix: 1200, largeur: 2, duree: 1.2 },
  xl: { nom: 'Brosse extra-large', prix: 3200, largeur: 3, duree: 0.8 },
  souffleur: { nom: 'Souffleur à dos', prix: 8000, largeur: 5, duree: 0.5 },
  rateau: { nom: 'Râteau à graines', prix: 200, special: true },      // graines sur les tuiles fanées, ou replanter une tuile nue
  collecteur: { nom: 'Collecteur à main', prix: 400, special: true },  // nectar sur les fleurs déjà ouvertes
  enfumoir: { nom: 'Enfumoir', prix: 300, special: true },             // miel et cire aux ruches
  tuyau: { nom: 'Tuyau d’irrigation', prix: 150, special: true },
  marteau: { nom: 'Outil de construction', prix: 600, special: true },
};
function fabriquerOutil(cle) {
  const g = new THREE.Group(); g.userData.outil = cle;
  const bague = (y, r = 0.021) => placer(g, tube(r, r, 0.025, M.pollen), 0, y, 0);
  if (cle === 'pinceau' || cle === 'brosse' || cle === 'large' || cle === 'xl') {
    const L = { pinceau: 0.42, brosse: 1.05, large: 1.2, xl: 1.35 }[cle], W = { pinceau: 0.13, brosse: 0.4, large: 1.2, xl: 2.0 }[cle];
    placer(g, tube(0.016, 0.016, L, M_CHROME), 0, L / 2, 0);                                   // manche chromé
    placer(g, tube(0.021, 0.021, 0.16, M.graphite), 0, 0.1, 0);                                 // poignée graphite
    if (cle !== 'pinceau') { placer(g, tube(0.02, 0.02, L * 0.45, M_CHROME), 0, L * 0.25, 0); bague(L * 0.48, 0.024); }   // manche télescopique, bague à la jonction
    bague(0.19);
    const tete = new THREE.Group(); tete.position.y = L; g.add(tete);
    placer(tete, boite(W, 0.07, 0.11, M.blanc, 0.025), 0, 0.03, 0);                           // corps blanc de la tête
    placer(tete, boite(W * 0.96, 0.08, 0.09, M_POILS, 0.02), 0, -0.04, 0);                    // poils jaune pollen
    placer(tete, boite(0.08, 0.06, 0.07, M.graphite, 0.02), 0, 0.075, 0);                     // raccord du manche
    if (cle === 'large' || cle === 'xl') for (let k = -3; k <= 3; k++) placer(tete, boite(W * 0.07, 0.012, 0.03, M.pollen, 0.005), k * W * 0.13, 0.068, 0);   // tirets jaunes sur le dessus
    if (cle === 'xl') { placer(tete, boite(W * 0.96, 0.06, 0.06, M_POILS, 0.02), 0, -0.04, 0.07); placer(tete, cylindre(0.05, 0.05, 0.04, M.graphite, 20), W / 2 + 0.04, 0.0, 0).rotation.z = Math.PI / 2; }   // deuxième rangée, roulette
    g.userData.tete = tete;
  } else if (cle === 'souffleur') {
    placer(g, tube(0.022, 0.022, 0.25, M.graphite), 0, 0.12, 0);                               // poignée
    placer(g, tube(0.05, 0.035, 0.55, M.blanc), 0, 0.5, 0);                                    // buse blanche
    placer(g, tube(0.052, 0.052, 0.03, M.pollen), 0, 0.3, 0);
    placer(g, tube(0.037, 0.037, 0.03, M.pollen), 0, 0.76, 0);
    for (let k = 0; k < 8; k++) placer(g, new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 14), M.graphite), 0.05, 0.02 - k * 0.045, 0.02).rotation.x = Math.PI / 2;   // tuyau annelé
    g.userData.tete = new THREE.Group(); g.userData.tete.position.y = 0.8; g.add(g.userData.tete);
  } else if (cle === 'marteau') {
    placer(g, tube(0.018, 0.018, 0.4, M.graphite), 0, 0.2, 0);
    placer(g, boite(0.2, 0.08, 0.08, M.blanc, 0.02), 0, 0.42, 0);
    placer(g, boite(0.05, 0.085, 0.085, M.pollen, 0.015), 0.1, 0.42, 0);
    placer(g, boite(0.05, 0.085, 0.085, M.pollen, 0.015), -0.1, 0.42, 0);
  } else if (cle === 'rateau') {   // manche chromé, traverse blanche, dents graphite
    placer(g, tube(0.016, 0.016, 1.0, M_CHROME), 0, 0.5, 0); placer(g, tube(0.021, 0.021, 0.16, M.graphite), 0, 0.1, 0); bague(0.19);
    placer(g, boite(0.45, 0.05, 0.06, M.blanc, 0.02), 0, 1.0, 0);
    for (let k = -4; k <= 4; k++) placer(g, boite(0.018, 0.12, 0.018, M.graphite, 0.006), k * 0.05, 1.07, 0);
  } else if (cle === 'collecteur') {   // un petit aspirateur : corps blanc, embout jaune, réservoir vitré
    placer(g, tube(0.022, 0.022, 0.2, M.graphite), 0, 0.1, 0);
    placer(g, boite(0.12, 0.26, 0.12, M.panneau, 0.03), 0, 0.33, 0);
    placer(g, tube(0.045, 0.045, 0.12, M_VITRE, 16), 0, 0.33, 0.07).rotation.x = Math.PI / 2;
    placer(g, tube(0.02, 0.03, 0.4, M.blanc), 0, 0.66, 0); placer(g, tube(0.032, 0.032, 0.05, M.pollen), 0, 0.87, 0);
  } else if (cle === 'enfumoir') {   // un pot cylindrique blanc à bec, soufflet graphite
    placer(g, tube(0.022, 0.022, 0.18, M.graphite), 0, 0.09, 0);
    placer(g, tube(0.08, 0.08, 0.24, M.blanc, 16), 0, 0.32, 0); placer(g, tube(0.082, 0.082, 0.03, M.pollen, 16), 0, 0.42, 0);
    placer(g, tube(0.03, 0.06, 0.1, M.graphite, 12), 0, 0.49, 0);
    placer(g, boite(0.1, 0.18, 0.03, M.graphite, 0.01), 0.1, 0.3, 0);
  } else if (cle === 'tuyau') {
    placer(g, tube(0.02, 0.02, 0.3, M.graphite), 0, 0.15, 0);
    const rouleau = placer(g, cylindre(0.11, 0.11, 0.09, M.blanc, 24), 0, 0.36, 0); rouleau.rotation.z = Math.PI / 2;
    rouleau.castShadow = true;
    for (let k = 0; k < 4; k++) placer(g, new THREE.Mesh(new THREE.TorusGeometry(0.085 - k * 0.012, 0.008, 6, 24).rotateY(Math.PI / 2), M.graphite), 0, 0.36, 0);
    placer(g, tube(0.112, 0.112, 0.012, M.pollen, 24).rotateZ(Math.PI / 2), 0.05, 0.36, 0);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// =====================================================================
// 8. Les commandes : objet d'entrée E. Ordinateur : ZQSD/WASD, souris au pointeur verrouillé
//    (premier clic), clic gauche pour agir, E pour interagir, 1-7 pour l'outil. Téléphone : joystick
//    au pouce gauche, regard au pouce droit en même temps, boutons action et E, paysage forcé.
// =====================================================================
const jeu = document.getElementById('jeu');
const E = { mx: 0, mz: 0, dYaw: 0, dPitch: 0, action: false, presse: false, inter: false, outil: -1, construire: false, tourner: false, carte: false, verrou: false, molette: 0 };   // presse : une pression, même brève, entre deux images
let tourne = false;   // téléphone tenu en portrait : la scène tourne d'un quart de tour
const versJeu = (cx, cy) => tourne ? [cy, innerWidth - cx] : [cx, cy];
const sons = { init() {} };   // remplacé par le module du son
if (!MOBILE) {
  const touches = {}; let verrou = false, refus = false, glisse = false, souris = false;
  const maj = () => {
    E.mz = (touches.KeyW || touches.ArrowUp ? 1 : 0) - (touches.KeyS || touches.ArrowDown ? 1 : 0);
    E.mx = (touches.KeyD || touches.ArrowRight ? 1 : 0) - (touches.KeyA || touches.ArrowLeft ? 1 : 0);
    E.action = souris || !!touches.Space;
  };
  addEventListener('keydown', (e) => {
    if (['Space'].includes(e.code) || e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;
    touches[e.code] = true; sons.init(); maj();
    if (e.code === 'KeyE' || e.code === 'KeyF') E.inter = true;
    if (/^Digit[0-9]$/.test(e.code)) E.outil = (+e.code.slice(5) + 9) % 10;
    if (e.code === 'Space') E.presse = true;
    if (e.code === 'KeyB') E.construire = true;
    if (e.code === 'KeyR') E.tourner = true;
    if (e.code === 'KeyM') E.carte = true;
    if (e.code === 'KeyG') E.verrou = true;
  });
  addEventListener('keyup', (e) => { touches[e.code] = false; maj(); });
  const echec = () => { refus = true; if (glisse) { souris = true; maj(); } };
  canvas.addEventListener('mousedown', (e) => {
    sons.init(); if (e.button !== 0) return;
    if (verrou || refus) { souris = true; glisse = !verrou; E.presse = true; maj(); return; }
    glisse = true;   // premier clic : il verrouille le pointeur, il n'agit pas
    try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(echec); } catch (err) { echec(); }
  });
  document.addEventListener('pointerlockerror', echec);
  document.addEventListener('pointerlockchange', () => { verrou = document.pointerLockElement === canvas; if (verrou) glisse = false; else { souris = false; maj(); } });
  addEventListener('mouseup', (e) => { if (e.button === 0) { glisse = false; souris = false; maj(); } });
  addEventListener('mousemove', (e) => {
    if (!verrou && !glisse) return;
    if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return;   // saut parasite au verrouillage
    E.dYaw += e.movementX * 0.0022; E.dPitch += e.movementY * 0.0022;
  });
  canvas.addEventListener('wheel', (e) => { E.outil = -2 - (e.deltaY > 0 ? 1 : 0); E.molette = e.deltaY > 0 ? 1 : -1; e.preventDefault(); }, { passive: false });   // -2 : précédent, -3 : suivant
  addEventListener('blur', () => { for (const k in touches) touches[k] = false; souris = false; glisse = false; maj(); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
} else {
  const agir = document.getElementById('agir'), inter = document.getElementById('inter'), stickEl = document.querySelector('.stick');
  agir.hidden = false; inter.hidden = false;
  const R = 56, SENS = 0.0056; let stick = null, regard = null, agirId = null, agirPos = null, essai = false;
  const majStick = (x, y) => { const l = Math.hypot(x, y); if (l < 0.12) { E.mx = 0; E.mz = 0; return; } const m = Math.max(0.18, Math.pow((Math.min(l, 1) - 0.12) / 0.88, 1.5)); E.mx = x / l * m; E.mz = -y / l * m; };
  const premier = () => { sons.init(); if (essai) return; essai = true; try { const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen({ navigationUI: 'hide' }); if (p && p.then) p.then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => {}); } catch (err) { /* refusé : la scène tourne */ } };
  agir.addEventListener('touchstart', (e) => { premier(); const t = e.changedTouches[0]; agirId = t.identifier; agirPos = versJeu(t.clientX, t.clientY); E.action = true; E.presse = true; agir.classList.add('appui'); e.preventDefault(); e.stopPropagation(); }, { passive: false });
  inter.addEventListener('touchstart', (e) => { premier(); E.inter = true; e.preventDefault(); e.stopPropagation(); }, { passive: false });
  addEventListener('touchstart', (e) => {
    premier();
    const larg = tourne ? innerHeight : innerWidth;
    for (const t of e.changedTouches) {
      if (t.identifier === agirId || (t.target && t.target.closest && t.target.closest('button, [data-tactile]'))) continue;   // les boutons gardent leurs touches
      const [x, y] = versJeu(t.clientX, t.clientY);
      if (x < larg * 0.45 && !stick) { stick = { id: t.identifier, ox: x, oy: y }; stickEl.hidden = false; stickEl.style.left = x + 'px'; stickEl.style.top = y + 'px'; stickEl.firstChild.style.transform = ''; }
      else if (!regard) regard = { id: t.identifier, x, y };
    }
    if (!(e.target && e.target.closest && e.target.closest('button, [data-tactile]'))) e.preventDefault();
  }, { passive: false });
  addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      const [x, y] = versJeu(t.clientX, t.clientY);
      if (stick && t.identifier === stick.id) { let dx = (x - stick.ox) / R, dy = (y - stick.oy) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } stickEl.firstChild.style.transform = `translate(${dx * R}px, ${dy * R}px)`; majStick(dx, dy); }
      else if (regard && t.identifier === regard.id) { const dx = x - regard.x, dy = y - regard.y, acc = 1 + Math.min(Math.hypot(dx, dy), 30) / 30 * 0.5; E.dYaw += dx * SENS * acc; E.dPitch += dy * SENS * acc; regard.x = x; regard.y = y; }
      else if (t.identifier === agirId && agirPos) { E.dYaw += (x - agirPos[0]) * SENS * 0.6; E.dPitch += (y - agirPos[1]) * SENS * 0.6; agirPos = [x, y]; }
    }
    e.preventDefault();
  }, { passive: false });
  const fin = (e) => { sons.init(); for (const t of e.changedTouches) { if (stick && t.identifier === stick.id) { stick = null; stickEl.hidden = true; majStick(0, 0); } if (regard && t.identifier === regard.id) regard = null; if (t.identifier === agirId) { agirId = null; agirPos = null; E.action = false; agir.classList.remove('appui'); } } };
  addEventListener('touchend', fin); addEventListener('touchcancel', fin);
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}

// =====================================================================
// 9. Le joueur, sur la sphère : première personne, œil à 1,7 m. Sa verticale est le vecteur centre → position ; son
//    regard est un vecteur tangent qu'on redresse à chaque image (la caméra tourne donc doucement avec la courbure).
//    Pas de modèle visible, mais un corps invisible projette son ombre.
// =====================================================================
const OEIL = 1.7, VIT = 4.2;
// Les collisions. Un obstacle est un cercle { p, r } ou une boîte orientée { p, ax, az, hw, hd, r } posée sur le sol
// (ax, az : ses axes ; r : rayon englobant), un peu plus grande que le modèle visible. Rien ne se traverse.
const OBSTACLES = [];
function boiteCollision(p, ax, az, hw, hd, extra = {}) { return { p: p.clone(), ax: ax.clone(), az: az.clone(), hw, hd, r: Math.hypot(hw, hd), ...extra }; }
const boiteDe = (obj, hw, hd, extra, lx = 0, lz = 0) => boiteCollision(new V3().copy(obj.position).addScaledVector(obj.userData.ax, lx).addScaledVector(obj.userData.az, lz), obj.userData.ax, obj.userData.az, hw, hd, extra);   // boîte dans le repère d'un objet posé
const _c = new V3();
function ecartObstacle(o, pos) {   // distance du point au bord de l'obstacle (0 dedans) et, pour une boîte, ses coordonnées locales
  _c.subVectors(pos, o.p);
  if (o.hw === undefined) return { d: Math.max(0, _c.length() - o.r) };
  const lx = _c.dot(o.ax), lz = _c.dot(o.az), nx = clamp(lx, -o.hw, o.hw), nz = clamp(lz, -o.hd, o.hd);
  return { d: Math.hypot(lx - nx, lz - nz), lx, lz, nx, nz };
}
function repousser(pos, rayon, sauf) {   // sort un disque de tous les obstacles ; dit s'il en a touché un
  const p = pos.clone(); let touche = false;
  for (const o of OBSTACLES) {
    if (o === sauf || o.inactif) continue;
    const dist = p.distanceTo(o.p); if (dist > o.r + rayon) continue;
    if (o.hw === undefined) { if (dist > 1e-5) { p.sub(o.p).multiplyScalar((o.r + rayon) / dist).add(o.p); touche = true; } continue; }
    const e = ecartObstacle(o, p); if (e.d >= rayon) continue;
    let lx = e.lx, lz = e.lz;
    if (e.d > 1e-6) { lx = e.nx + (e.lx - e.nx) / e.d * rayon; lz = e.nz + (e.lz - e.nz) / e.d * rayon; }
    else if (o.hw - Math.abs(lx) < o.hd - Math.abs(lz)) lx = (lx < 0 ? -1 : 1) * (o.hw + rayon); else lz = (lz < 0 ? -1 : 1) * (o.hd + rayon);   // dedans : par le côté le plus proche
    p.addScaledVector(o.ax, lx - e.lx).addScaledVector(o.az, lz - e.lz); touche = true;
  }
  return { p, touche };
}
const penetre = (pos, rayon, sauf) => OBSTACLES.some((o) => o !== sauf && !o.inactif && pos.distanceTo(o.p) < o.r + rayon + 0.01 && ecartObstacle(o, pos).d < rayon);
// Les surcotes : là où le sol praticable est plus haut que le terrain (plancher d'un bâtiment, passerelle, rampe).
const SURCOTES = [];   // { p, ax, az, hw, hd, h, bord }
function surcote(pos) { let h = 0; for (const s of SURCOTES) { _c.subVectors(pos, s.p); if (_c.lengthSq() > (s.hw + s.hd) ** 2) continue; const dx = s.hw - Math.abs(_c.dot(s.ax)), dz = s.hd - Math.abs(_c.dot(s.az)); if (dx > 0 && dz > 0) h = Math.max(h, s.h * lisse(0, s.bord || 0.5, Math.min(dx, dz))); } return h; }
let secousse = 0;   // petite secousse de caméra (choc du véhicule)
const joueur = { p: local(3, 14), f: new V3(), haut: new V3(), v: new V3(), pitch: -0.18, pas: 0, vitesse: 0, lent: 1, sur: 0, enVehicule: null };
joueur.f.copy(versBase(joueur.p));
let retardRegard = 0, retardRegardV = 0;
const _dr = new V3(), _cb = new V3(), _np = new V3();
function majJoueur(dt) {
  const up = joueur.haut.copy(joueur.p).normalize(); tangent(joueur.p, joueur.f, joueur.f);
  const dY = E.dYaw, dP = E.dPitch; E.dYaw = 0; E.dPitch = 0;
  if (CARTE.ouverte) { CARTE.glisser(dY, dP); return; }
  joueur.f.applyAxisAngle(up, -dY); joueur.pitch = clamp(joueur.pitch - dP, -1.35, 1.2);
  retardRegard = lerp(retardRegard, clamp(dY * 4, -0.1, 0.1), 1 - Math.exp(-dt * 12)); retardRegardV = lerp(retardRegardV, clamp(dP * 4, -0.08, 0.08), 1 - Math.exp(-dt * 12));
  if (joueur.enVehicule) return;
  _dr.crossVectors(joueur.f, up);
  let mx = E.mx, mz = E.mz; const m = Math.hypot(mx, mz); if (m > 1) { mx /= m; mz /= m; }
  _cb.set(0, 0, 0).addScaledVector(joueur.f, mz).addScaledVector(_dr, mx).multiplyScalar(VIT * joueur.lent);
  joueur.v.lerp(_cb, 1 - Math.exp(-dt * 10)); joueur.v.addScaledVector(up, -joueur.v.dot(up));
  _np.copy(joueur.p).addScaledVector(joueur.v, dt);
  for (let k = 0; k < 2; k++) { const r = repousser(_np, 0.35); _np.copy(r.p); if (!r.touche) break; }   // deux passes : les coins entre deux obstacles
  if (altitude(_np) < NIVEAU_MER + 0.2 && surcote(_np) <= 0) { _np.copy(joueur.p); joueur.v.set(0, 0, 0); }   // on n'entre pas dans la mer
  joueur.sur = lerp(joueur.sur, surcote(_np), 1 - Math.exp(-dt * 14));
  surSol(_np, joueur.sur, joueur.p);
  joueur.vitesse = joueur.v.length();
  if (joueur.vitesse > 0.25) joueur.pas += dt * joueur.vitesse * 1.7; else joueur.pas = lerp(joueur.pas, Math.round(joueur.pas / Math.PI) * Math.PI, 1 - Math.exp(-dt * 6));
}
const _oe = new V3(), _lk = new V3();
function majCamera() {
  if (CARTE.ouverte) return;
  const up = joueur.haut.copy(joueur.p).normalize(), a = clamp(joueur.vitesse / VIT, 0, 1.3), sb = Math.sin(joueur.pas);
  _oe.copy(joueur.p).addScaledVector(up, OEIL + Math.abs(sb) * 0.045 * a - 0.02 * a).addScaledVector(_dr.crossVectors(joueur.f, up), sb * 0.02 * a);
  if (secousse > 0.001) { _oe.addScaledVector(_dr, (Math.random() - 0.5) * secousse * 0.12).addScaledVector(up, (Math.random() - 0.5) * secousse * 0.12); secousse *= 0.86; }
  camera.position.copy(_oe); camera.up.copy(up);
  camera.lookAt(_lk.copy(_oe).addScaledVector(joueur.f, Math.cos(joueur.pitch)).addScaledVector(up, Math.sin(joueur.pitch)));
  camera.updateMatrixWorld();
}
// Le corps invisible : il n'écrit ni couleur ni profondeur, mais projette son ombre.
const corps = new THREE.Group();
{
  const invisible = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const p = (geo, x, y, z, rz = 0) => { const m = new THREE.Mesh(geo, invisible); m.position.set(x, y, z); m.rotation.z = rz; m.castShadow = true; corps.add(m); return m; };
  p(new THREE.CapsuleGeometry(0.2, 0.62, 4, 12), 0, 1.05, 0);
  p(new THREE.SphereGeometry(0.13, 12, 10), 0, 1.6, 0);
  p(new THREE.CapsuleGeometry(0.08, 0.7, 3, 8), -0.12, 0.42, 0);
  p(new THREE.CapsuleGeometry(0.08, 0.7, 3, 8), 0.12, 0.42, 0);
  p(new THREE.CapsuleGeometry(0.06, 0.5, 3, 8), -0.27, 1.12, 0, 0.12);
  p(new THREE.CapsuleGeometry(0.06, 0.5, 3, 8), 0.3, 1.15, -0.15, -0.5);
  p(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), 0.45, 0.85, -0.5, -0.9);   // l'outil aussi a son ombre
}
scene.add(corps);
function majCorps() {
  const sb = Math.sin(joueur.pas), a = clamp(joueur.vitesse / VIT, 0, 1);
  corps.visible = !joueur.enVehicule && !CARTE.ouverte;
  poserSur(corps, joueur.p, _lk.copy(joueur.f).negate());   // le corps regarde vers -z
  corps.children[2].rotation.x = sb * 0.5 * a; corps.children[3].rotation.x = -sb * 0.5 * a;
}

// L'outil en main occupe le bas de l'écran, en diagonale : le manche part du coin inférieur droit vers le centre gauche.
const vue = new THREE.Group(); vue.rotation.order = 'YXZ'; camera.add(vue); scene.add(camera);
const POSE_OUTIL = {   // position et orientation de chaque outil dans la caméra
  pinceau: { p: [0.26, -0.4, -0.52], r: [-1.05, 0.95, 0.15], s: 0.85 },
  brosse: { p: [0.36, -0.62, -0.6], r: [-1.2, 1.05, 0.12], s: 1.0 },
  large: { p: [0.42, -0.72, -0.65], r: [-1.25, 1.05, 0.1], s: 0.85 },
  xl: { p: [0.45, -0.8, -0.7], r: [-1.28, 1.05, 0.1], s: 0.72 },
  souffleur: { p: [0.26, -0.42, -0.55], r: [-1.25, 0.7, 0.1], s: 0.85 },
  marteau: { p: [0.24, -0.34, -0.5], r: [-0.7, 0.4, 0.2], s: 1.1 },
  tuyau: { p: [0.22, -0.32, -0.5], r: [-0.5, 0.3, 0.1], s: 1.0 },
  rateau: { p: [0.36, -0.62, -0.6], r: [-1.2, 1.05, 0.12], s: 0.9 },
  collecteur: { p: [0.24, -0.36, -0.5], r: [-1.1, 0.5, 0.1], s: 1.1 },
  enfumoir: { p: [0.24, -0.34, -0.5], r: [-0.6, 0.4, 0.1], s: 1.1 },
};
const ENMAIN = {};
let outilEnMain = 'pinceau';
function prendre(cle) {
  outilEnMain = cle; vue.clear();
  if (!ENMAIN[cle]) { const o = fusionner(fabriquerOutil(cle)); o.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } }); ENMAIN[cle] = o; }
  vue.add(ENMAIN[cle]);
  const P = POSE_OUTIL[cle]; ENMAIN[cle].scale.setScalar(P.s);
}
prendre('pinceau');
let geste = 0, gesteType = 'brosser', gesteActif = false;
function majVue(dt) {
  const P = POSE_OUTIL[outilEnMain], a = clamp(joueur.vitesse / VIT, 0, 1.3), sb = Math.sin(joueur.pas), cb = Math.abs(Math.cos(joueur.pas));
  geste = lerp(geste, E.action && gesteActif ? 1 : 0, 1 - Math.exp(-dt * 10));   // l'outil frotte tant qu'on travaille
  const t = gt * (gesteType === 'arracher' ? 16 : 8), balai = Math.sin(t) * 0.06 * geste, souffle = Math.sin(gt * 1.3) * 0.004;
  vue.visible = !joueur.enVehicule && !CARTE.ouverte;
  vue.position.set(P.p[0] + sb * 0.016 * a - retardRegard * 0.3 + balai, P.p[1] - cb * 0.014 * a + souffle + retardRegardV * 0.25 + 0.03 * geste, P.p[2] - 0.05 * geste);
  vue.rotation.set(P.r[0] + sb * 0.03 * a + 0.12 * geste, P.r[1] + retardRegard + balai * 2, P.r[2] + (gesteType === 'arracher' ? Math.sin(t) * 0.15 * geste : 0));
}
