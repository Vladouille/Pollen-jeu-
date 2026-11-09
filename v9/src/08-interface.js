
// =====================================================================
// 12. L'interface : cinq choses, rien d'autre. Ruban de boussole en haut, pourcentage du secteur en haut
//     à droite, outil et charge en bas à gauche, ronds des outils en bas au centre, argent en bas à droite.
//     Aucun texte qui dise quoi faire.
// =====================================================================
const $ = (id) => document.getElementById(id);
if (MOBILE) jeu.classList.add('mobile');
const hud = { bande: $('bande'), secP: $('secP'), nomOutil: $('nomOutil'), charge: $('charge'), slots: $('slots'), cr: $('cr') };
const fmtKg = (v) => v.toFixed(1).replace('.', ',');
const fmtCr = (v) => Math.round(v).toLocaleString('fr-FR');
// Boussole : un ruban de ±90° autour du cap, graduations tous les 15°, lettres cardinales.
const CARD = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
{ let h = ''; for (let d = 0; d < 360; d += 15) h += `<i data-a="${d}" class="${d % 45 ? 'g' : 'c'}">${d % 45 ? '' : CARD[d / 45]}</i>`; hud.bande.innerHTML = h; }
const marques = [...hud.bande.children].map((el) => ({ el, a: +el.dataset.a }));
const angle = (a) => ((a % 360) + 540) % 360 - 180;
const cap = () => (-joueur.yaw * 180 / Math.PI + 360) % 360;   // 0 = nord (-z), 90 = est (+x)
const PASTILLE = [];   // ce que montre la pastille quand ce n'est pas l'outil (le véhicule)
let tSlots = '', dernierHUD = -1;
function majHUD() {
  const c = cap(), L = hud.bande.parentNode.clientWidth || 360, px = L / 180;
  for (const m of marques) { const r = angle(m.a - c); m.el.style.display = Math.abs(r) > 92 ? 'none' : ''; m.el.style.transform = `translateX(${r * px}px)`; }
  const s = secteurs[secteurDe(joueur.x, joueur.z)];
  hud.secP.textContent = `${Math.floor(s.total ? s.vert / s.total * 100 : 0)} %`;
  let pa = { nom: outilDef().nom, charge: S.charge, max: chargeMax() }; for (const f of PASTILLE) { const r = f(); if (r) { pa = r; break; } }
  hud.nomOutil.textContent = pa.nom; hud.charge.textContent = `${fmtKg(pa.charge)} / ${pa.max} KG`;
  const possedes = ORDRE_OUTILS.filter((o) => S.outils.includes(o)), sig = possedes.join() + outilEnMain;
  if (sig !== tSlots) { tSlots = sig; hud.slots.innerHTML = possedes.map((o) => `<button type="button" data-tactile data-outil="${o}" class="${o === outilEnMain ? 'actif' : ''}" aria-label="${OUTILS_DEF[o].nom}">${ICONES[o] || ''}</button>`).join(''); }
  hud.cr.textContent = fmtCr(S.credits);
}
const ICONES = {   // pictogrammes des ronds, dessinés au trait
  pinceau: '<svg viewBox="0 0 24 24"><path d="M5 19l9-9m1-1l3-3 1 1-3 3"/><path d="M4 20c1-3 2-4 3-3s0 2-3 3z"/></svg>',
  brosse: '<svg viewBox="0 0 24 24"><path d="M12 3v10"/><rect x="7" y="13" width="10" height="3" rx="1"/><path d="M8 16v4m2-4v4m2-4v4m2-4v4m2-4v4"/></svg>',
  large: '<svg viewBox="0 0 24 24"><path d="M12 3v9"/><rect x="4" y="12" width="16" height="3" rx="1"/><path d="M5 15v4m3-4v4m3-4v4m3-4v4m3-4v4m2-4v4"/></svg>',
  xl: '<svg viewBox="0 0 24 24"><path d="M12 3v8"/><rect x="2" y="11" width="20" height="3" rx="1"/><path d="M3 14v5m3-5v5m3-5v5m3-5v5m3-5v5m3-5v5m3-5v5"/></svg>',
  souffleur: '<svg viewBox="0 0 24 24"><path d="M4 17l10-10"/><path d="M14 7l2-2 3 3-2 2z"/><path d="M18 12c2 0 3 1 3 3m-5-1c1 0 2 1 2 2"/></svg>',
  tuyau: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M18 12h4"/></svg>',
  marteau: '<svg viewBox="0 0 24 24"><path d="M6 20l8-8"/><rect x="11" y="4" width="9" height="5" rx="1" transform="rotate(45 15 7)"/></svg>',
};
// Toucher ou cliquer un rond prend l'outil ; toucher le rond de l'outil déjà en main le fait « tourner »
// (utile à l'outil de construction sur téléphone, qui n'a pas de touche R).
hud.slots.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-outil]'); if (!b) return; if (b.dataset.outil === outilEnMain) E.tourner = true; else changerOutil(b.dataset.outil); e.stopPropagation(); e.preventDefault(); });
MAJ.push(() => { if (gt - dernierHUD > 1 / 30 || (window.pollen && window.pollen.figer)) { dernierHUD = gt; majHUD(); } });
