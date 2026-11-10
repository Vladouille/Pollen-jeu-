// =====================================================================
// 6. Le collecteur : on y videra le pollen. Socle étagé, corps à panneaux,
//    bandeau graphite, écran au chiffre jaune, gros bouton, fente d'insertion.
// =====================================================================
function collecteur() {
  const g = new THREE.Group(); g.userData.machine = 'collecteur';
  const W = 2.2, D = 1.6, base = socle(g, W, D);
  const corps = placer(g, boite(W, 1.9, D, [M.panneau, M.panneau, M.blanc, M.blanc, M.panneau, M.panneau], 0.04), 0, base + 0.95, 0);
  corps.userData.corps = true;
  placer(g, boite(W + 0.05, 0.24, D + 0.05, M.graphite, 0.035), 0, base + 0.2, 0);                // bandeau bas
  placer(g, boite(W - 0.25, 0.14, D - 0.25, M.blanc, 0.04), 0, base + 1.97, 0);                    // couvercle en retrait
  placer(g, boite(W - 0.18, 0.03, D - 0.18, M.graphite, 0.012), 0, base + 1.91, 0);                // joint du couvercle
  // Façade (+z) : écran, bouton, fente, voyants.
  const f = D / 2 + 0.005;
  placer(g, boite(0.9, 0.52, 0.06, M.graphite, 0.025), -0.35, base + 1.35, f + 0.02);              // cadre de l'écran
  placer(g, new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.42), ecran('0,0 kg')), -0.35, base + 1.35, f + 0.052);
  placer(g, bouton(), 0.6, base + 1.35, f + 0.01);
  placer(g, boite(1.3, 0.16, 0.05, M.graphite, 0.02), 0, base + 0.62, f + 0.015);                  // fente d'insertion
  placer(g, boite(1.24, 0.03, 0.03, M.seve, 0.01), 0, base + 0.74, f + 0.03);
  for (let k = 0; k < 3; k++) placer(g, boite(0.06, 0.06, 0.03, k === 0 ? M.seve : M.graphite, 0.012), 0.42 + k * 0.1, base + 1.67, f + 0.01);   // voyants
  // Poignées latérales graphite et pattes de fixation.
  for (const s of [-1, 1]) { placer(g, boite(0.06, 0.5, 0.08, M.graphite, 0.025), s * (W / 2 + 0.04), base + 1.2, 0.35); placer(g, boite(0.06, 0.5, 0.08, M.graphite, 0.025), s * (W / 2 + 0.04), base + 1.2, -0.35); }
  return g;
}
const COLLECTEUR = collecteur();
poserSur(COLLECTEUR, local(2, 3), new V3().subVectors(local(6, 12), local(2, 3))); scene.add(COLLECTEUR);   // façade tournée vers l'arrivée du joueur
machines.push(COLLECTEUR); ombreContact(COLLECTEUR, 1.9);

