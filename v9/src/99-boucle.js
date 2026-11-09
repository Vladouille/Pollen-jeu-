// =====================================================================
// 99. Post-traitement, mise en page (paysage forcé sur téléphone), boucle de jeu
// =====================================================================
const cible = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Q.msaa });
const composer = new EffectComposer(renderer, cible);
composer.addPass(new RenderPass(scene, camera));
// Occlusion ambiante en espace écran (GTAO) : elle creuse les jointures des machines et le pied des fleurs.
const ao = new GTAOPass(scene, camera, 1, 1, undefined, { radius: 0.55, distanceExponent: 1.6, thickness: 1.2, scale: 1.25, samples: MOBILE ? 8 : 16, distanceFallOff: 1 }, { lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: MOBILE ? 4 : 7, rings: 2, samples: MOBILE ? 8 : 16 });
ao.output = GTAOPass.OUTPUT.Default; ao.blendIntensity = 1.0;
const AO = params.has('ao') ? params.get('ao') !== '0' : !MOBILE;   // sur téléphone, seulement avec ?ao : elle double le coût de chaque image
if (AO) composer.addPass(ao);
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.35, 0.92); composer.addPass(bloom);   // discret : seuls le vert sève et le jaune ressortent
if (Q.vignette) composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec2 c = vUv - 0.5; gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb * (1.0 - smoothstep(0.3, 0.8, dot(c, c) * 1.4) * 0.14), 1.0); }' }));
composer.addPass(new OutputPass());
let LARG = innerWidth, HAUT = innerHeight;
const _av = new THREE.Vector3();
// Les reflets du ciel : chaque matière fabriquée (pas le sol, pas les fleurs) reçoit la carte d'environnement ;
// le métal et les vitres en plein, les surfaces peintes à 35 %. Les matières créées en jeu sont prises à la seconde suivante.
function refleter() { scene.traverse((o) => { if (!o.isMesh) return; for (const m of [].concat(o.material)) { if (!m.isMeshStandardMaterial || m.envMap || m.userData.sansReflet) continue; m.envMap = ENV.tex; m.envMapIntensity = m.metalness > 0.3 || m.roughness < 0.2 ? 1.0 : 0.35; m.needsUpdate = true; } }); }
let tReflet = 0; MAJ.push((dt) => { tReflet += dt; if (tReflet > 1) { tReflet = 0; refleter(); } });
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
  camera.getWorldDirection(_av); contreJour.position.set(camera.position.x + _av.x * 40, camera.position.y + 7, camera.position.z + _av.z * 40);   // rasant : il frôle le sol et accroche les arêtes contreJour.target.position.copy(camera.position); contreJour.target.updateMatrixWorld();
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
  get outil() { return outilEnMain; }, prendre, S, INTER, PRESENTOIRS, COMPTOIR, STATION, GARAGE, POMPE, secteurs, polliniser, vendre, acheter, changerOutil, pollinisable, chargeMax, versHex, idxDe, VARIETES, OUVERTS, PIECES, ameliorer, SEL, kgSac, valeurSac, ajouter, sacVide, COLIS, emballer, get porte() { return porte; }, ESSAIM, echapperEssaim, PANNES, VAGUE, FIN_SECTEUR, MATS_FLEUR, FLEUR_GEOS, contreJour, ao, secousseMax: () => secousse, parkingVert: () => M_PARK.color.getHex() === 0x3fd35a, ecartObstacle, repousser, penetre, PARKING, bienGare, TERMINAL_GARAGE, TERMINAL_STATION, libre, M, composer, sons, PANNES, porteColis: () => porte, CARRES, majFleurs, M_FLEUR, FLEUR_GEO,
  GRILLE, poserPiece, CAPSULES, V, sauver, charger, etatSauve, CONS, departs, EMPL_RUCHE, BALISES, TUYAUX, ACTIONS, installerRuche,
  get visee() { return visee; }, get interVise() { return interVise; }, get groupe() { return groupe; },
  step(dt, n = 1) { for (let k = 0; k < n; k++) majMonde(dt); return { x: joueur.x, z: joueur.z, y: joueur.y, yaw: joueur.yaw, pitch: joueur.pitch, vitesse: joueur.vitesse }; },
};

refleter(); majMonde(0);
majFleurs(1000);   // tous les carrés de fleurs autour du point de départ, avant la première image
requestAnimationFrame(image);
