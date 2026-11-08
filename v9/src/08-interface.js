
// =====================================================================
// 12. L'interface, composée à la manière de POLLEN : plaques graphite translucides aux coins chanfreinés,
//     chiffres jaune pollen, voyants vert sève. Sept éléments :
//     boussole avec distance à l'objectif, anneau de progression du secteur, pastille de l'outil avec sa charge,
//     emplacements d'outils, crédits, liste des raccourcis, badges de touche en contexte et étiquettes flottantes.
// =====================================================================
const $ = (id) => document.getElementById(id);
if (MOBILE) jeu.classList.add('mobile');
const hud = { bande: $('bande'), cible: $('cible'), secN: $('secN'), secP: $('secP'), arc: $('arc'), nomOutil: $('nomOutil'), charge: $('charge'), jauge: $('jauge'),
  slots: $('slots'), cr: $('cr'), raccourcis: $('raccourcis'), contexte: $('contexte'), etiquettes: $('etiquettes'), messages: $('messages'), gains: $('gains') };
const fmtKg = (v) => v.toFixed(1).replace('.', ',');
const fmtCr = (v) => Math.round(v).toLocaleString('fr-FR');
// Boussole : un ruban de ±90° autour du cap, graduations tous les 15°, lettres cardinales, chevron de l'objectif.
const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
{
  let h = ''; for (let d = 0; d < 360; d += 15) h += `<i data-a="${d}" class="${d % 45 ? 'g' : 'c'}">${d % 45 ? '' : CARD[d / 45]}</i>`;
  hud.bande.innerHTML = h;
}
const marques = [...hud.bande.children].map((el) => ({ el, a: +el.dataset.a }));
const angle = (a) => ((a % 360) + 540) % 360 - 180;   // ramené entre -180 et 180
function cap() { return (-joueur.yaw * 180 / Math.PI + 360) % 360; }   // 0 = nord (-z), 90 = est (+x)
function relatif(x, z) { return angle(Math.atan2(x - joueur.x, -(z - joueur.z)) * 180 / Math.PI - cap()); }
const MARQUEURS = [];   // marqueurs secondaires de la boussole (balises, essaims) : { x, z, cls, actif() }
const marqueursEl = [];
let dernierHUD = 0, tSlots = '', tRacc = '';
const etiquettes = []; for (let k = 0; k < 6; k++) { const d = document.createElement('div'); d.className = 'etiq'; d.hidden = true; d.innerHTML = '<kbd>E</kbd><span></span>'; hud.etiquettes.appendChild(d); etiquettes.push(d); }
const _v = new THREE.Vector3();
function majHUD() {
  // Boussole.
  const c = cap(), L = hud.bande.parentNode.clientWidth || 360, px = L / 180;
  for (const m of marques) { const r = angle(m.a - c); m.el.style.display = Math.abs(r) > 92 ? 'none' : ''; m.el.style.transform = `translateX(${r * px}px)`; }
  const ob = objectif();
  if (ob) { const r = relatif(ob.x, ob.z), d = Math.hypot(ob.x - joueur.x, ob.z - joueur.z); hud.cible.hidden = false; hud.cible.style.transform = `translateX(${clamp(r, -88, 88) * px}px)`; hud.cible.classList.toggle('bord', Math.abs(r) > 88); hud.cible.lastChild.textContent = `${ob.nom} · ${d < 10 ? d.toFixed(1).replace('.', ',') : Math.round(d)} m`; }
  else hud.cible.hidden = true;
  MARQUEURS.forEach((m, k) => {
    if (!marqueursEl[k]) { const el = document.createElement('b'); el.className = 'marq ' + (m.cls || ''); hud.bande.parentNode.appendChild(el); marqueursEl[k] = el; }
    const el = marqueursEl[k], vis = !m.actif || m.actif(); el.hidden = !vis; if (vis) { const r = relatif(m.x, m.z); el.style.transform = `translateX(${clamp(r, -90, 90) * px}px)`; el.style.opacity = Math.abs(r) > 90 ? 0.35 : 1; }
  });
  // Secteur.
  const s = secteurDe(joueur.x, joueur.z), sec = secteurs[s], p = sec.total ? sec.vert / sec.total : 0;
  hud.secN.textContent = s + 1; hud.secP.textContent = `${Math.floor(p * 100)} %`; hud.arc.style.strokeDashoffset = `${(1 - p) * 113.1}`;
  // Outil et charge.
  const def = outilDef(), max = chargeMax();
  hud.nomOutil.textContent = def.nom;
  hud.charge.textContent = `${fmtKg(S.charge)} / ${max} KG`;
  hud.jauge.style.transform = `scaleY(${max ? S.charge / max : 0})`; hud.jauge.parentNode.classList.toggle('plein', S.charge >= max - 1e-6);
  // Emplacements.
  const possedes = ORDRE_OUTILS.filter((o) => S.outils.includes(o)), sig = possedes.join() + outilEnMain;
  if (sig !== tSlots) { tSlots = sig; hud.slots.innerHTML = possedes.map((o) => `<button type="button" data-tactile data-outil="${o}" class="${o === outilEnMain ? 'actif' : ''}" aria-label="${OUTILS_DEF[o].nom}"><kbd>${ORDRE_OUTILS.indexOf(o) + 1}</kbd>${ICONES[o] || ''}</button>`).join(''); }
  // Crédits.
  hud.cr.textContent = fmtCr(S.credits);
  // Raccourcis (seulement ce qui sert déjà).
  const R = RACCOURCIS.filter((r) => !r.si || r.si()), sigR = R.map((r) => r.t).join();
  if (sigR !== tRacc) { tRacc = sigR; hud.raccourcis.innerHTML = R.map((r) => `<li${r.tap ? ` data-tactile data-tap="${r.tap}"` : ''}><kbd>${MOBILE ? (r.m || r.k) : r.k}</kbd>${r.t}</li>`).join(''); }
  // Badge de contexte sous le réticule.
  const st = majAction.etat || {};
  let ctx = '';
  const btnA = MOBILE ? '●' : 'Clic', btnE = 'E';
  if (interVise) ctx = `<kbd class="${interVise.actif && !interVise.actif() ? 'off' : ''}">${btnE}</kbd>${interVise.texte()}`;
  else if (st.cibleAction) ctx = `<kbd>${btnA}</kbd>${st.cibleAction.texte}`;
  else if (st.plein && visee) ctx = '<kbd class="off">!</kbd>Réservoir plein · collecteur';
  else if (st.groupe && st.groupe.length) ctx = `<kbd>${btnA}</kbd>Maintenir · polliniser${st.groupe.length > 1 ? ` ${st.groupe.length} tuiles` : ''}`;
  else if (visee && visee.i >= 0 && T.sorte[visee.i] === 1) ctx = '<kbd class="off">✕</kbd>Chardons · à arracher d’abord';
  else if (visee && visee.i >= 0 && T.sorte[visee.i] === 2 && !T.irrigue[visee.i]) ctx = '<kbd class="off">✕</kbd>Tuile aride · à irriguer d’abord';
  for (const f of CONTEXTES) { const t = f(); if (t) { ctx = t; break; } }
  if (hud.contexte.innerHTML !== ctx) hud.contexte.innerHTML = ctx;
  hud.contexte.hidden = !ctx;
  hud.contexte.style.setProperty('--p', majAction.progres || 0);
  if (MOBILE) { $('agir').classList.toggle('pret', !!(st.peut && (st.groupe && st.groupe.length || st.cibleAction))); $('inter').classList.toggle('pret', !!(interVise && (!interVise.actif || interVise.actif()))); }
  // Étiquettes flottantes près des machines (dans les 14 m, devant soi).
  const proches = INTER.filter((it) => !it.presentoir && !(it.cache && it.cache())).map((it) => ({ it, d: Math.hypot(it.x - joueur.x, it.z - joueur.z) })).filter((o) => o.d < 14).sort((a, b) => a.d - b.d);
  if (proches.length < etiquettes.length) { const pr = INTER.filter((it) => it.presentoir).map((it) => ({ it, d: Math.hypot(it.x - joueur.x, it.z - joueur.z) })).filter((o) => o.d < 4).sort((a, b) => a.d - b.d); proches.push(...pr); }
  etiquettes.forEach((el, k) => {
    const o = proches[k]; if (!o || joueur.enVehicule) { el.hidden = true; return; }
    _v.set(o.it.x, H(o.it.x, o.it.z) + o.it.y, o.it.z).project(camera);
    if (_v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) { el.hidden = true; return; }
    el.hidden = false; el.classList.toggle('vise', o.it === interVise); el.classList.toggle('off', !!(o.it.actif && !o.it.actif()));
    el.style.transform = `translate(${(_v.x * 0.5 + 0.5) * LARG}px, ${(-_v.y * 0.5 + 0.5) * HAUT}px) translate(-50%, -100%) scale(${clamp(1.25 - o.d / 18, 0.6, 1)})`;
    const t = o.it === interVise ? o.it.texte() : o.it.nom; if (el.lastChild.textContent !== t) el.lastChild.textContent = t;
  });
  // Messages et gains.
  const m = MESSAGES.filter((x) => gt - x.t < 4.5), sigM = m.map((x) => x.texte + x.t).join();
  if (hud.messages.dataset.s !== sigM) { hud.messages.dataset.s = sigM; hud.messages.innerHTML = m.map((x) => `<p class="${x.type}">${x.texte}</p>`).join(''); }
  const g = gainsFlottants.filter((x) => gt - x.t < 1.6); hud.gains.innerHTML = g.map((x) => `<p style="opacity:${1 - (gt - x.t) / 1.6};transform:translateY(${-(gt - x.t) * 30}px)">+${fmtCr(x.cr)}</p>`).join('');
}
const CONTEXTES = [];   // badges de contexte prioritaires ajoutés par les étapes suivantes
const RACCOURCIS = [
  { k: 'ZQSD', m: '◐', t: 'Se déplacer' },
  { k: 'Clic', m: '●', t: 'Polliniser' },
  { k: 'E', t: 'Utiliser' },
  { k: '1-7', m: '⇆', t: 'Outils', si: () => S.outils.length > 1 },
];
const ICONES = {   // pictogrammes des emplacements, dessinés au trait
  pinceau: '<svg viewBox="0 0 24 24"><path d="M5 19l9-9m1-1l3-3 1 1-3 3"/><path d="M4 20c1-3 2-4 3-3s0 2-3 3z"/></svg>',
  brosse: '<svg viewBox="0 0 24 24"><path d="M12 3v10"/><rect x="7" y="13" width="10" height="3" rx="1"/><path d="M8 16v4m2-4v4m2-4v4m2-4v4m2-4v4"/></svg>',
  large: '<svg viewBox="0 0 24 24"><path d="M12 3v9"/><rect x="4" y="12" width="16" height="3" rx="1"/><path d="M5 15v4m3-4v4m3-4v4m3-4v4m3-4v4m2-4v4"/></svg>',
  xl: '<svg viewBox="0 0 24 24"><path d="M12 3v8"/><rect x="2" y="11" width="20" height="3" rx="1"/><path d="M3 14v5m3-5v5m3-5v5m3-5v5m3-5v5m3-5v5m3-5v5"/></svg>',
  souffleur: '<svg viewBox="0 0 24 24"><path d="M4 17l10-10"/><path d="M14 7l2-2 3 3-2 2z"/><path d="M18 12c2 0 3 1 3 3m-5-1c1 0 2 1 2 2"/></svg>',
  tuyau: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M18 12h4"/></svg>',
  marteau: '<svg viewBox="0 0 24 24"><path d="M6 20l8-8"/><rect x="11" y="4" width="9" height="5" rx="1" transform="rotate(45 15 7)"/></svg>',
};
// Les emplacements et les raccourcis se touchent sur téléphone ; ils se cliquent aussi sur ordinateur.
hud.slots.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-outil]'); if (b) { changerOutil(b.dataset.outil); e.stopPropagation(); e.preventDefault(); } });
hud.raccourcis.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-tap]'); if (b) { E[b.dataset.tap] = true; e.stopPropagation(); e.preventDefault(); } });
MAJ.push(() => { if (gt - dernierHUD > 1 / 30 || window.pollen && window.pollen.figer) { dernierHUD = gt; majHUD(); } });
