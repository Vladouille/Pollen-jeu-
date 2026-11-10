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
  // brique 1 : pas encore de bouton d’action
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
// 9. Le joueur, sur la sphère : première personne, œil à 1,7 m. Sa verticale est le vecteur centre → position.
//    À chaque image, son orientation est un quaternion qui aligne son axe vertical sur ce vecteur ; la caméra le
//    rejoint par une interpolation sphérique lissée : elle ne tourne jamais brutalement.
//    Pas de modèle visible, mais un corps invisible projette une ombre nette au sol, devant lui.
// =====================================================================
const OEIL = 1.7, VIT = 4.2;
const joueur = { p: surSol(ICO.sommets[8].clone().multiplyScalar(RP)), q: new THREE.Quaternion(), yaw: 0, pitch: -0.12, v: new V3(), haut: new V3(), f: new V3(), pas: 0, vitesse: 0 };
const _up = new V3(), _cible = new THREE.Quaternion(), _qy = new THREE.Quaternion(), _qx = new THREE.Quaternion(), _qr = new THREE.Quaternion(), _np = new V3(), _dr = new V3(), _cb = new V3();
// Le repère du joueur : on garde un « avant » tangent, qu'on transporte d'une position à l'autre (aucune torsion au pôle).
joueur.haut.copy(joueur.p).normalize(); tangent(joueur.p, new V3(0, 1, 0.3), joueur.f);
function repereJoueur(out) {   // quaternion qui envoie (x droite, y haut, -z avant) sur le repère local du joueur
  const up = joueur.haut, f = joueur.f, r = _dr.crossVectors(f, up).normalize();
  return out.setFromRotationMatrix(_mb.makeBasis(r, up, _cb.copy(f).negate()));
}
repereJoueur(joueur.q);
function majJoueur(dt) {
  const dY = E.dYaw, dP = E.dPitch; E.dYaw = 0; E.dPitch = 0;
  joueur.haut.copy(joueur.p).normalize(); tangent(joueur.p, joueur.f, joueur.f);   // l'avant suit la courbure
  joueur.f.applyAxisAngle(joueur.haut, -dY); joueur.pitch = clamp(joueur.pitch - dP, -1.35, 1.25);
  _dr.crossVectors(joueur.f, joueur.haut);
  let mx = E.mx, mz = E.mz; const m = Math.hypot(mx, mz); if (m > 1) { mx /= m; mz /= m; }
  _cb.set(0, 0, 0).addScaledVector(joueur.f, mz).addScaledVector(_dr, mx).multiplyScalar(VIT);
  joueur.v.lerp(_cb, 1 - Math.exp(-dt * 10)); joueur.v.addScaledVector(joueur.haut, -joueur.v.dot(joueur.haut));
  _np.copy(joueur.p).addScaledVector(joueur.v, dt); surSol(_np, 0, joueur.p);   // gravité vers le centre : toujours collé au sol
  joueur.vitesse = joueur.v.length();
  if (joueur.vitesse > 0.25) joueur.pas += dt * joueur.vitesse * 1.7; else joueur.pas = lerp(joueur.pas, Math.round(joueur.pas / Math.PI) * Math.PI, 1 - Math.exp(-dt * 6));
  // Orientation cible = repère local × regard vertical ; la caméra la rejoint en douceur.
  repereJoueur(_cible).multiply(_qx.setFromAxisAngle(_c1.set(1, 0, 0), joueur.pitch));
  joueur.q.slerp(_cible, 1 - Math.exp(-dt * 18));
}
const _c1 = new V3(), _oe = new V3();
function majCamera() {
  const up = joueur.haut, a = clamp(joueur.vitesse / VIT, 0, 1.3), sb = Math.sin(joueur.pas);
  _oe.copy(joueur.p).addScaledVector(up, OEIL + Math.abs(sb) * 0.045 * a - 0.02 * a).addScaledVector(_dr.crossVectors(joueur.f, up), sb * 0.02 * a);   // léger balancement à la marche
  camera.position.copy(_oe); camera.quaternion.copy(joueur.q); camera.updateMatrixWorld();
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
}
scene.add(corps);
function majCorps() {
  const sb = Math.sin(joueur.pas), a = clamp(joueur.vitesse / VIT, 0, 1);
  poserSur(corps, joueur.p, _c1.copy(joueur.f).negate());   // le corps regarde vers -z
  corps.children[2].rotation.x = sb * 0.5 * a; corps.children[3].rotation.x = -sb * 0.5 * a;
}
