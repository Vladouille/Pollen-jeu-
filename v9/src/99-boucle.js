// =====================================================================
// 99. Post-traitement, mise en page (paysage forcé sur téléphone), boucle de jeu
// =====================================================================
const cible = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Q.msaa });
const composer = new EffectComposer(renderer, cible);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.35, 0.92); composer.addPass(bloom);   // discret : seuls le vert sève et le jaune ressortent
if (Q.vignette) composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec2 c = vUv - 0.5; gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb * (1.0 - smoothstep(0.3, 0.8, dot(c, c) * 1.4) * 0.14), 1.0); }' }));
composer.addPass(new OutputPass());
let LARG = innerWidth, HAUT = innerHeight;
function disposer() {
  tourne = MOBILE && innerHeight > innerWidth;
  LARG = tourne ? innerHeight : innerWidth; HAUT = tourne ? innerWidth : innerHeight;
  jeu.style.width = LARG + 'px'; jeu.style.height = HAUT + 'px';
  jeu.style.transform = tourne ? `translate(${innerWidth}px, 0) rotate(90deg)` : 'none';
  renderer.setPixelRatio(dpr); renderer.setSize(LARG, HAUT, false); composer.setPixelRatio(dpr); composer.setSize(LARG, HAUT);
  camera.aspect = LARG / HAUT; camera.fov = clamp(70 * Math.min(1, 1.78 / camera.aspect) ** 0.5, 58, 70); camera.updateProjectionMatrix();
}
disposer(); addEventListener('resize', disposer); addEventListener('orientationchange', () => setTimeout(disposer, 250));
const dbg = document.getElementById('debug'); if (DEBUG) dbg.hidden = false;
renderer.info.autoReset = false;
function majMonde(dt) {
  gt += dt;
  majJoueur(dt); majCamera(); majCorps(); majVue(dt);
  for (const f of MAJ) f(dt);
  E.inter = false; E.presse = false; E.outil = -1; E.construire = false; E.tourner = false;   // impulsions consommées
  const st = 0.03, sx = Math.round(joueur.x / st) * st, sz = Math.round(joueur.z / st) * st;   // l'ombre suit le joueur
  sun.target.position.set(sx, joueur.y, sz); sun.position.set(sx + SOLEIL.x * 60, joueur.y + SOLEIL.y * 60, sz + SOLEIL.z * 60); sun.target.updateMatrixWorld();
  ciel.position.copy(camera.position);
}
let dernier = performance.now();
function image(now) {
  requestAnimationFrame(image);
  const raw = (now - dernier) / 1000; dernier = now;
  if (!window.pollen.figer) majMonde(Math.min(0.05, Math.max(0, raw)));
  renderer.info.reset(); composer.render();
  if (DEBUG) dbg.textContent = `${Q.nom} · triangles ${(renderer.info.render.triangles / 1000).toFixed(0)} k · appels ${renderer.info.render.calls}\njoueur ${joueur.x.toFixed(1)} ${joueur.z.toFixed(1)}`;
}
window.pollen = {
  figer: false, Q, T, NT, CHARTE, scene, camera, renderer, machines, COLLECTEUR, joueur, E, OBSTACLES, vue, corps, H,
  get outil() { return outilEnMain; }, prendre, S, INTER, PRESENTOIRS, COMPTOIR, STATION, GARAGE, POMPE, secteurs, polliniser, vendre, acheter, changerOutil, pollinisable, chargeMax, versHex, idxDe, COULEURS, ESPECES, OUVERTS, PIECES, ameliorer, SEL, CARRES, majFleurs, M_FLEUR, FLEUR_GEO,
  GRILLE, poserPiece, CAPSULES, V, sauver, charger, etatSauve, CONS, departs, EMPL_RUCHE, BALISES, TUYAUX, doreesRevelees, ACTIONS, installerRuche,
  get visee() { return visee; }, get interVise() { return interVise; }, get groupe() { return groupe; },
  step(dt, n = 1) { for (let k = 0; k < n; k++) majMonde(dt); return { x: joueur.x, z: joueur.z, y: joueur.y, yaw: joueur.yaw, pitch: joueur.pitch, vitesse: joueur.vitesse }; },
};
OBSTACLES.push({ x: COLLECTEUR.position.x, z: COLLECTEUR.position.z, r: 1.7 });
majMonde(0);
majFleurs(1000);   // tous les carrés de fleurs autour du point de départ, avant la première image
requestAnimationFrame(image);
