// =====================================================================
// Contrôles mobiles : deux zones tactiles multipoint. Moitié gauche : un joystick
// qui naît là où le pouce se pose (zone morte 10 %, réponse quadratique, poussé à
// fond il fait courir). Moitié droite : on glisse le pouce pour regarder.
// Paysage obligatoire : à la verticale, écran « tourne ton téléphone » et pause.
// =====================================================================
function installerControles(E, canvas, demarrerAudio) {
  const style = document.createElement('style');
  style.textContent = `
    .pol-stick { position: fixed; width: 124px; height: 124px; margin: -62px 0 0 -62px; border-radius: 50%; border: 2px solid rgba(255,250,240,.55); background: rgba(30,26,16,.16); pointer-events: none; }
    .pol-stick b { position: absolute; left: 50%; top: 50%; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; background: rgba(255,250,240,.78); box-shadow: 0 2px 8px rgba(0,0,0,.25); }
    .pol-rotate { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; background: #3a3424; color: #fffaf0; text-align: center; padding: 24px; font: 700 20px/1.3 "Trebuchet MS", system-ui, sans-serif; }
    .pol-rotate i { display: block; width: 46px; height: 78px; margin: 0 auto 20px; border: 4px solid #fffaf0; border-radius: 10px; animation: polTurn 2s ease-in-out infinite; }
    @keyframes polTurn { 0%, 30% { transform: rotate(0); } 60%, 100% { transform: rotate(-90deg); } }
    @media (prefers-reduced-motion: reduce) { .pol-rotate i { animation: none; transform: rotate(-90deg); } }`;
  document.head.appendChild(style);
  const stickEl = document.createElement('div'); stickEl.className = 'pol-stick'; stickEl.hidden = true; stickEl.innerHTML = '<b></b>';
  const rot = document.createElement('div'); rot.className = 'pol-rotate'; rot.hidden = true; rot.innerHTML = '<div><i></i>Tourne ton téléphone</div>';
  document.body.append(stickEl, rot);

  const R = 56;            // rayon du joystick, en pixels
  const SENS = 0.0058;     // regard : radians par pixel glissé
  let stick = null, regard = null, verrouTente = false;

  function majStick(x, y) {
    const len = Math.hypot(x, y);
    if (len < 0.1) { E.mx = 0; E.mz = 0; E.course = false; return; }
    const m = Math.pow((Math.min(len, 1) - 0.1) / 0.9, 2);
    E.mx = (x / len) * Math.max(0.2, m); E.mz = (-y / len) * Math.max(0.2, m);
    E.course = len > 0.95;
  }
  addEventListener('touchstart', (e) => {
    demarrerAudio();
    if (!verrouTente) { // Tentative de plein écran et de verrouillage en paysage ; refusée par certains navigateurs, sans gravité.
      verrouTente = true;
      const p = document.documentElement.requestFullscreen?.(); if (p && p.then) p.then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
    }
    if (E.pause) return;
    for (const t of e.changedTouches) {
      if (t.target.closest && t.target.closest('button')) continue; // les boutons d'action gèrent leurs propres touches
      if (t.clientX < innerWidth / 2 && !stick) {
        stick = { id: t.identifier, ox: t.clientX, oy: t.clientY };
        stickEl.hidden = false; stickEl.style.left = t.clientX + 'px'; stickEl.style.top = t.clientY + 'px'; stickEl.firstChild.style.transform = '';
      } else if (t.clientX >= innerWidth / 2 && !regard) {
        regard = { id: t.identifier, x: t.clientX, y: t.clientY };
      }
    }
    if (e.target === canvas) e.preventDefault();
  }, { passive: false });
  addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (stick && t.identifier === stick.id) {
        let x = (t.clientX - stick.ox) / R, y = (t.clientY - stick.oy) / R;
        const len = Math.hypot(x, y); if (len > 1) { x /= len; y /= len; }
        stickEl.firstChild.style.transform = `translate(${x * R}px, ${y * R}px)`;
        majStick(x, y);
      } else if (regard && t.identifier === regard.id) {
        const dx = t.clientX - regard.x, dy = t.clientY - regard.y;
        const acc = 1 + Math.min(Math.hypot(dx, dy), 30) / 30 * 0.5; // un geste vif tourne un peu plus
        E.dYaw += dx * SENS * acc; E.dPitch += dy * SENS * acc;
        regard.x = t.clientX; regard.y = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  function fin(e) {
    for (const t of e.changedTouches) {
      if (stick && t.identifier === stick.id) { stick = null; stickEl.hidden = true; majStick(0, 0); }
      if (regard && t.identifier === regard.id) regard = null;
    }
  }
  addEventListener('touchend', fin); addEventListener('touchcancel', fin);

  function orientation() {
    const portrait = innerHeight > innerWidth;
    rot.hidden = !portrait; E.pause = portrait;
    if (portrait) { stick = regard = null; stickEl.hidden = true; majStick(0, 0); }
  }
  addEventListener('resize', orientation);
  addEventListener('orientationchange', () => setTimeout(orientation, 200));
  orientation();
}
