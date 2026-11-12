
// =====================================================================
// 99. Mise en page (paysage forcé sur téléphone), boucle de jeu
// =====================================================================
let dpr = Math.min(devicePixelRatio || 1, Q.dpr), LARG = innerWidth, HAUT = innerHeight;
function disposer() {
  tourne = MOBILE && innerHeight > innerWidth;
  LARG = tourne ? innerHeight : innerWidth; HAUT = tourne ? innerWidth : innerHeight;
  jeu.style.width = LARG + 'px'; jeu.style.height = HAUT + 'px';
  jeu.style.transform = tourne ? `translate(${innerWidth}px, 0) rotate(90deg)` : 'none';
  renderer.setPixelRatio(dpr); renderer.setSize(LARG, HAUT, false);
  camera.aspect = LARG / HAUT; camera.fov = 70; camera.updateProjectionMatrix();
}
disposer(); addEventListener('resize', disposer); addEventListener('orientationchange', () => setTimeout(disposer, 250));
const dbg = document.getElementById('debug'); if (DEBUG) dbg.hidden = false;
renderer.info.autoReset = false;
const _ici = new V3();
function majMonde(dt) {
  gt += dt;
  JOUR.angle += dt * Math.PI * 2 / DUREE_JOUR; placerSoleil();   // le soleil tourne vraiment : la ligne du jour avance sur la planète
  majJoueur(dt); majCamera(); majCorps();
  for (const f of MAJ) f(dt);
  E.inter = false; E.presse = false; E.outil = -1; E.construire = false; E.tourner = false; E.carte = false; E.verrou = false; E.molette = 0;
  const haut = joueur.haut, ici = lisse(-0.12, 0.22, haut.dot(SOLEIL)); JOUR.ici = ici;
  // Le soleil éclaire depuis sa vraie direction ; sa caméra d'ombre suit le joueur (ombre nette autour de lui).
  sun.target.position.copy(joueur.p); sun.position.copy(joueur.p).addScaledVector(SOLEIL, 60); sun.target.updateMatrixWorld();
  sun.intensity = 2.5 * lisse(-0.05, 0.15, haut.dot(SOLEIL));
  hemi.position.copy(haut); hemi.intensity = 0.12 + 0.38 * ici;   // 0,5 en plein jour
  CIEL_U.uHaut.value.copy(haut); CIEL_U.uJour.value = ici; scene.fog.color.setHex(0x0b1220).lerp(HORIZON, ici);
  ciel.position.copy(camera.position);
}
// Si l'image ralentit sous 50 img/s, la résolution baisse d'elle-même (et remonte quand ça va mieux).
const CADENCE = { n: 0, t: 0, ips: 60 };
function adapter(raw) {
  CADENCE.n++; CADENCE.t += raw; if (CADENCE.t < 2) return;
  CADENCE.ips = CADENCE.n / CADENCE.t; CADENCE.n = 0; CADENCE.t = 0;
  const avant = dpr;
  if (CADENCE.ips < 50 && dpr > 0.75) dpr = Math.max(0.75, dpr - 0.25); else if (CADENCE.ips > 58 && dpr < Math.min(devicePixelRatio || 1, Q.dpr)) dpr = Math.min(Q.dpr, dpr + 0.25);
  if (dpr !== avant) disposer();
}
let dernier = performance.now();
function image(now) {
  requestAnimationFrame(image);
  const raw = (now - dernier) / 1000; dernier = now;
  if (!window.pollen.figer) { majMonde(Math.min(0.05, Math.max(0, raw))); if (!params.has('fixe')) adapter(raw); }
  renderer.info.reset(); renderer.render(scene, camera);
  if (DEBUG) dbg.textContent = `${Q.nom} · ${CADENCE.ips.toFixed(0)} img/s · résolution ×${dpr} · triangles ${(renderer.info.render.triangles / 1000).toFixed(0)} k · appels ${renderer.info.render.calls}\ntuiles ${NT} · altitude ${altitude(joueur.p).toFixed(2)} m`;
}
window.pollen = {
  figer: false, Q, scene, camera, renderer, joueur, E, RP, NT, GROS, ICO, sol, surSol, altitude, repere, tangent, corps, sun, hemi, SOLEIL, JOUR, placerSoleil, CIEL_U, M_SOL, V3,
  step(dt, n = 1) { for (let k = 0; k < n; k++) majMonde(dt); return { p: joueur.p.toArray(), pitch: joueur.pitch, vitesse: joueur.vitesse }; },
};
majMonde(0);
requestAnimationFrame(image);
