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
const _nuit = new THREE.Color(0x0b1220);
function majMonde(dt) {
  gt += dt;
  JOUR.angle += dt * Math.PI * 2 / DUREE_JOUR; placerSoleil();   // le soleil tourne vraiment : le jour et la nuit se déplacent sur la planète
  majJoueur(dt); majCamera(); majCorps(); majVue(dt);
  for (const f of MAJ) f(dt);
  E.inter = false; E.presse = false; E.outil = -1; E.construire = false; E.tourner = false; E.carte = false; E.verrou = false; E.molette = 0;   // impulsions consommées
  const haut = CARTE.ouverte ? CARTE.dir : joueur.haut, ici = CARTE.ouverte ? 1 : lisse(-0.12, 0.22, haut.dot(SOLEIL)); JOUR.ici = ici;
  const centre = CARTE.ouverte ? _av.set(0, 0, 0) : joueur.p;   // l'ombre suit le joueur
  sun.target.position.copy(centre); sun.position.copy(centre).addScaledVector(SOLEIL, CARTE.ouverte ? 2000 : 60); sun.target.updateMatrixWorld();
  sun.intensity = 2.6 * (CARTE.ouverte ? 1 : lisse(-0.05, 0.15, haut.dot(SOLEIL))); sun.castShadow = !CARTE.ouverte;
  hemi.position.copy(haut); hemi.intensity = CARTE.ouverte ? 0.3 : 0.09 + 0.33 * ici;
  CIEL_U.uHaut.value.copy(haut); CIEL_U.uJour.value = CARTE.ouverte ? 0 : ici; scene.fog.color.copy(_nuit).lerp(HORIZON, ici);
  ciel.position.copy(camera.position);
  lampe.intensity = CARTE.ouverte || DEDANS.salle ? 0 : (1 - ici) * (joueur.enVehicule ? 8 + joueur.enVehicule.niv.phares * 9 : 7);   // lampe frontale, phares
  camera.getWorldDirection(_av);   // contre-jour rasant : il frôle le sol et accroche les arêtes
  contreJour.intensity = 0.7 * ici; contreJour.position.copy(camera.position).addScaledVector(_av, 40).addScaledVector(haut, 7);
  contreJour.target.position.copy(camera.position); contreJour.target.updateMatrixWorld();
}
let dernier = performance.now();
function image(now) {
  requestAnimationFrame(image);
  const raw = (now - dernier) / 1000; dernier = now;
  if (!window.pollen.figer) majMonde(Math.min(0.05, Math.max(0, raw)));
  renderer.info.reset(); composer.render();
  if (DEBUG) dbg.textContent = `${Q.nom} · triangles ${(renderer.info.render.triangles / 1000).toFixed(0)} k · appels ${renderer.info.render.calls}\njour ${JOUR.ici.toFixed(2)} · altitude ${altitude(joueur.p).toFixed(1)} m`;
}
window.pollen = {
  figer: false, Q, T, NT, IDX, CHARTE, scene, camera, renderer, machines, COLLECTEUR, joueur, E, OBSTACLES, SURCOTES, vue, corps, RP, PAS, SECTEURS, BASE, QUAI, poserVehicule, refaireVehicule, local, sol, surSol, altitude, repere, tangent, tuileDe, tuileA, dirDe, voisinsDe, deplacer, V3,
  get outil() { return outilEnMain; }, prendre, S, INTER, ETAL, AMELIOS, TERMINAL_ATELIER, COMPTOIR, STATION, ATELIER, LABO, CONCESSION, HALL, placeParvis, SALLES, DEDANS, secteurs, polliniser, vendre, acheter, changerOutil, pollinisable, chargeMax, VARIETES, OUVERTS, PIECES, CATEGORIES, ameliorer, demonter, raisonRefus, SEL, kgSac, valeurSac, ajouter, sacVide, COLIS, emballer, ESSAIM, echapperEssaim, PANNES, VAGUE, FIN_SECTEUR, MATS_FLEUR, FLEUR_GEOS, contreJour, sun, hemi, lampe, lampeSalle, ao, secousseMax: () => secousse, parkingVert: () => M_PARK.color.getHex() === 0x3fd35a, ecartObstacle, repousser, penetre, surcote, PARKING, bienGare, M, composer, sons, porteColis: () => porte, PAQUETS, majFleurs,
  GRILLE, poserPiece, CAPSULES, FLOTTE, VEHICULES, acheterVehicule, monter, descendre, SORTIE, sauver, charger, etatSauve, CONS, CARTE, departs, RUCHES, BALISES, ACTIONS, ENERGIE, JOUR, SOLEIL, placerSoleil, dormir, SUCCES, MEDAILLONS, DEBITS, SOL_U, HALO, PLANETE, posTuile, voisineVers, accepter, amelio, viser, MAJ,
  get visee() { return visee; }, get interVise() { return interVise; }, get groupe() { return groupe; },
  step(dt, n = 1) { for (let k = 0; k < n; k++) majMonde(dt); return { p: joueur.p.toArray(), f: joueur.f.toArray(), pitch: joueur.pitch, vitesse: joueur.vitesse }; },
};

refleter(); majMonde(0);
majFleurs(1000);   // tous les paquets de fleurs autour du point de départ, avant la première image
requestAnimationFrame(image);
