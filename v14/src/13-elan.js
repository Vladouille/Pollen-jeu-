// =====================================================================
// 15. L'élan : ce qui donne envie de continuer. Des récompenses fréquentes, lisibles et parfois surprenantes, sans
//     piège : rien ne se perd si l'on s'arrête, aucune fausse urgence, aucun achat réel.
//     - Élan : des parcelles enchaînées sans pause font monter un multiplicateur (×1 à ×3) ; une pause le fait redescendre.
//     - Fleurs dorées : une parcelle sur 90 environ vaut douze fois plus (récompense variable).
//     - Bourrasque de pollen : toutes les 2 à 4 minutes de jeu, 30 s où tout vaut double et l'or sort trois fois plus.
//     - Niveaux : chaque parcelle et chaque vente donnent de l'expérience ; chaque niveau paie une prime.
//     - Contrats : toujours trois petits objectifs à l'écran ; dès qu'un est rempli, un autre le remplace.
//     - Prochain achat : la barre de l'objet suivant qu'on peut s'offrir (outil ou véhicule).
//     - Retour : les ruches ont travaillé pendant l'absence (deux heures au plus) ; on le dit à l'arrivée.
// =====================================================================
const ELAN = { n: 0, t: -10, mult: 1, max: 0, off: false };   // off : coupé par les tests qui comptent les crédits au centime
const BOURRASQUE = { fin: -1, prochaine: 150 + Math.random() * 90 };
const CHANCE_OR = 1 / 90, MULT_OR = 12;
const enBourrasque = () => gt < BOURRASQUE.fin;
const multElan = (n) => 1 + Math.min(n, 50) / 25;   // ×1 au départ, ×3 à 50 parcelles enchaînées
// --- Les nombres qui s'envolent : « +3 », « ★ +45 », au-dessus de la parcelle, puis s'effacent. ---
const FLOT = $('flottants'), POOL_FLOT = Array.from({ length: 14 }, () => { const el = document.createElement('span'); FLOT.appendChild(el); return { el, t: -10, p: new V3() }; });
let flotI = 0, tFlotVeh = 0;
function flotter(p, texte, classe = '') { const f = POOL_FLOT[flotI++ % POOL_FLOT.length]; f.el.textContent = texte; f.el.className = classe; f.t = gt; f.p.copy(p); }
const _pf = new V3();
MAJ.push(() => {
  const W = jeu.clientWidth, H = jeu.clientHeight;
  for (const f of POOL_FLOT) {
    const age = gt - f.t; if (age > 1.1) { if (f.el.style.opacity !== '0') f.el.style.opacity = '0'; continue; }
    _pf.copy(f.p).addScaledVector(_d.copy(f.p).normalize(), 0.6 + age * 1.1).project(camera);
    if (_pf.z > 1) { f.el.style.opacity = '0'; continue; }
    f.el.style.transform = `translate(${(_pf.x + 1) / 2 * W}px, ${(1 - _pf.y) / 2 * H}px) translate(-50%, -50%) scale(${age < 0.12 ? 0.6 + age * 4 : 1})`;
    f.el.style.opacity = String(age < 0.8 ? 1 : (1.1 - age) / 0.3);
  }
});

// --- Pollinisation : l'élan, l'or, la bourrasque multiplient la valeur ; chaque parcelle compte pour les contrats. ---
APRES_POLLEN.push((k, par, v) => {
  if (par === 'ruche' || ELAN.off) return v;
  if (gt - ELAN.t > 3) ELAN.n = 0;   // plus de trois secondes sans rien : l'élan repart de zéro
  ELAN.n += par === 'vehicule' ? 0.5 : 1; ELAN.t = gt; ELAN.max = Math.max(ELAN.max, ELAN.n);
  const palier = [10, 25, 50].find((p) => ELAN.n >= p && ELAN.n - (par === 'vehicule' ? 0.5 : 1) < p);
  if (palier) { sons.palier(palier); $('elan').classList.remove('palier'); void $('elan').offsetWidth; $('elan').classList.add('palier'); }
  let m = multElan(ELAN.n) * (enBourrasque() ? 2 : 1);
  const dore = Math.random() < CHANCE_OR * (enBourrasque() ? 3 : 1);
  if (dore) { m *= MULT_OR; S.dorees = (S.dorees || 0) + 1; sons.or(); bouffee(T.pos[k], 40, 0xffd23a); progresser('doree', 1); gagnerXp(10); }
  const val = v * m;
  progresser('polliniser', 1); progresser('elan', ELAN.n, true); gagnerXp(par === 'vehicule' ? 0.5 : 1);
  if (dore) flotter(T.pos[k], `★ +${Math.round(val)}`, 'or');
  else if (par === 'joueur') flotter(T.pos[k], `+${Math.round(val)}`, m >= 2 ? 'fort' : '');
  else if (gt - tFlotVeh > 0.35) { tFlotVeh = gt; flotter(T.pos[k], `+${Math.round(val)}`, m >= 2 ? 'fort' : ''); }
  return val;
});
APRES_VENTE.push((cr) => { if (ELAN.off) return; progresser('gagner', cr); gagnerXp(cr / 20); });

// --- Les niveaux. ---
const xpPour = (n) => Math.round(20 * Math.pow(1.3, n - 1));   // 20, 26, 34… 212 au niveau 10
const primeNiveau = (n) => Math.round(15 * Math.pow(n, 1.5) / 5) * 5;   // 40 cr au niveau 2, 170 au 5, 475 au 10, 1 340 au 20
S.niveau = S.niveau || 1; S.xp = S.xp || 0;
function gagnerXp(x) {
  S.xp += x;
  while (S.xp >= xpPour(S.niveau)) {
    S.xp -= xpPour(S.niveau); S.niveau++; const prime = primeNiveau(S.niveau); S.credits += prime;
    sons.niveau(); bouffee(joueur.p, 50, CHARTE.pollen); montrerBandeau(`Niveau ${S.niveau}`, `+${fmtCr(prime)} cr`); sauverBientot();
  }
}

// --- Les contrats : trois à la fois, jamais deux du même genre ; l'effort demandé suit le niveau. ---
const GENRES = {
  polliniser: (L) => { const n = Math.min(400, 15 + 6 * L); return { but: n, cr: Math.round(n * 2 / 5) * 5, texte: `Pollinise ${n} parcelles` }; },
  elan: (L) => { const n = Math.min(60, 8 + 3 * L); return { but: n, cr: 20 + 10 * L, texte: `Enchaîne ${n} parcelles sans pause` }; },
  gagner: (L) => { const n = Math.round(120 * Math.pow(1.35, L - 1) / 10) * 10; return { but: n, cr: Math.round(n * 0.2 / 5) * 5, texte: `Gagne ${fmtCr(n)} cr` }; },
  doree: (L) => ({ but: 1, cr: 40 + 15 * L, texte: 'Trouve une fleur dorée' }),
};
function nouveauContrat(exclus) {
  const libres = Object.keys(GENRES).filter((g) => !exclus.includes(g)), g = libres[Math.floor(Math.random() * libres.length)];
  return { g, prog: 0, ...GENRES[g](S.niveau) };
}
if (!Array.isArray(S.contrats) || S.contrats.length !== 3) { S.contrats = []; for (let k = 0; k < 3; k++) S.contrats.push(nouveauContrat(S.contrats.map((c) => c.g))); }
let tContrats = '';
function progresser(g, n, max = false) {
  S.contrats.forEach((c, k) => {
    if (c.g !== g || c.fait) return;
    c.prog = max ? Math.max(c.prog, n) : c.prog + n;
    if (c.prog >= c.but) {
      c.fait = gt; S.credits += c.cr; gagnerXp(5 + S.niveau); sons.contrat(); sauverBientot();
    }
  });
}

// --- Le prochain achat : l'outil ou le véhicule le moins cher qu'on n'a pas encore. ---
function prochainAchat() {
  let best = null;
  for (const [cle, prix] of VENTE_COMPTOIR) if (prix && !S.outils.includes(cle) && (!best || prix < best.prix)) best = { nom: OUTILS_DEF[cle].nom, prix, ou: 'au comptoir' };
  for (const cle of ORDRE_VEHICULES) { const v = FLOTTE[cle]; if (!v.possede && (!best || v.D.prix < best.prix)) best = { nom: v.D.nom, prix: v.D.prix, ou: 'au garage' }; }
  return best;
}

// --- La bourrasque de pollen. ---
MAJ.push((dt) => {
  if (CARTE.ouverte) return;
  BOURRASQUE.prochaine -= dt;
  if (BOURRASQUE.prochaine <= 0 && !ELAN.off) { BOURRASQUE.prochaine = 120 + Math.random() * 120; BOURRASQUE.fin = gt + 30; sons.bourrasque(); montrerBandeau('Bourrasque de pollen', 'tout vaut double pendant 30 s'); }
  jeu.classList.toggle('bourrasque', enBourrasque());
});

// --- Le bandeau (niveau, bourrasque) : quelques secondes au centre, puis il s'efface. ---
function montrerBandeau(titre, sous) { const b = $('bandeau'); b.innerHTML = `<b></b><small></small>`; b.firstChild.textContent = titre; b.lastChild.textContent = sous; b.hidden = false; b.classList.remove('vu'); void b.offsetWidth; b.classList.add('vu'); clearTimeout(montrerBandeau.t); montrerBandeau.t = setTimeout(() => { b.hidden = true; }, 3200); }

// --- L'affichage : niveau et barre d'expérience, contrats, prochain achat, élan. ---
let tElan = 0;
MAJ.push((dt) => {
  if (gt - ELAN.t > 3 && ELAN.n > 0) ELAN.n = 0;
  S.contrats.forEach((c, k) => { if (c.fait && (gt - c.fait > 1.6 || gt < c.fait)) { S.contrats[k] = nouveauContrat(S.contrats.map((x) => x.g)); tContrats = ''; } });   // un contrat rempli laisse place au suivant
  const cache = CONS.actif || CARTE.ouverte;
  $('progression').hidden = cache;
  ELAN.mult = multElan(ELAN.n) * (enBourrasque() ? 2 : 1);
  const el = $('elan'), actif = ELAN.n >= 3 || enBourrasque();
  el.classList.toggle('actif', actif && !cache);
  tElan += dt; if (tElan < 0.1) return; tElan = 0;
  $('elanX').textContent = `×${ELAN.mult.toFixed(1).replace('.', ',')}`;
  $('elanBar').style.transform = `scaleX(${enBourrasque() && ELAN.n < 3 ? (BOURRASQUE.fin - gt) / 30 : Math.max(0, 1 - (gt - ELAN.t) / 3)})`;
  $('niv').textContent = S.niveau; $('xpBar').style.transform = `scaleX(${Math.min(1, S.xp / xpPour(S.niveau))})`;
  const pa = prochainAchat(), sig = S.contrats.map((c) => `${c.g}${Math.floor(c.prog)}${c.fait ? 'f' : ''}`).join() + (pa ? pa.nom + Math.floor(Math.min(S.credits, pa.prix) / Math.max(1, pa.prix) * 50) : '');
  if (sig === tContrats) return; tContrats = sig;
  const lignes = S.contrats.map((c) => `<li class="${c.fait ? 'fait' : ''}"><span>${c.texte}</span><em>+${fmtCr(c.cr)}</em><i style="transform:scaleX(${Math.min(1, c.prog / c.but)})"></i></li>`);
  if (pa) { const ok = S.credits >= pa.prix; lignes.push(`<li class="achat ${ok ? 'pret' : ''}"><span>${ok ? `${pa.nom} : à prendre ${pa.ou}` : pa.nom}</span><em>${ok ? '✓' : `${fmtCr(S.credits)} / ${fmtCr(pa.prix)}`}</em><i style="transform:scaleX(${Math.min(1, S.credits / pa.prix)})"></i></li>`); }
  $('contrats').innerHTML = lignes.join('');
});

// --- Le retour : ce que les ruches ont fait pendant l'absence (deux heures au plus). ---
function retourAbsence(date) {
  if (!date || !RUCHES.length) return;
  const s = Math.min(7200, (Date.now() - date) / 1000); if (s < 300) return;
  let cr = 0; for (const r of RUCHES) cr += s * (3 * 0.5 / DUREES_RUCHE[r.niveau] + PRIX_MIEL * 0.5 / 20);
  cr = Math.round(cr); if (cr <= 0) return; S.credits += cr;
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  montrerAnnonce(`Pendant ton absence (${h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`}), tes ${RUCHES.length} ruche${RUCHES.length > 1 ? 's ont' : ' a'} rapporté ${fmtCr(cr)} cr.`);
}
if (DEMARRAGE.repris) retourAbsence(DEMARRAGE.date);

// --- Les sons de l'élan : paliers, or, niveau, contrat, bourrasque. ---
Object.assign(sons, {
  palier(n) { const b = n >= 50 ? 784 : n >= 25 ? 659 : 523; [b, b * 1.25, b * 1.5].forEach((f, k) => this.note(f, k * 0.05, 0.18, 'triangle', 0.18)); },
  or() { [1047, 1319, 1568, 2093].forEach((f, k) => this.note(f, k * 0.06, 0.3, 'sine', 0.2)); this.note(2637, 0.26, 0.5, 'triangle', 0.08); },
  niveau() { [523, 659, 784, 1047, 1319].forEach((f, k) => this.note(f, k * 0.09, 0.4, 'triangle', 0.22)); },
  contrat() { [784, 988, 1175].forEach((f, k) => this.note(f, k * 0.07, 0.25, 'square', 0.07)); },
  bourrasque() { for (let k = 0; k < 8; k++) this.note(330 * Math.pow(2, k / 6), k * 0.05, 0.2, 'sine', 0.12); },
});
