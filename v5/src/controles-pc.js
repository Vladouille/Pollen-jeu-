// =====================================================================
// Contrôles PC : ZQSD/WASD (touches physiques, donc AZERTY et QWERTY),
// souris avec pointeur verrouillé, Maj pour courir, molette et 1-6 pour l'outil,
// E pour interagir, M pour la carte. Remplit l'objet d'entrée lu par le jeu.
// =====================================================================
function installerControles(E, canvas, demarrerAudio) {
  const touches = {};
  const SENS = 0.0022;
  const majMouvement = () => {
    E.mz = (touches.KeyW || touches.ArrowUp ? 1 : 0) - (touches.KeyS || touches.ArrowDown ? 1 : 0);
    E.mx = (touches.KeyD || touches.ArrowRight ? 1 : 0) - (touches.KeyA || touches.ArrowLeft ? 1 : 0);
    E.course = !!(touches.ShiftLeft || touches.ShiftRight);
  };
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    touches[e.code] = true; demarrerAudio(); majMouvement();
    if (/^Digit[1-6]$/.test(e.code)) E.outil = +e.code.slice(5) - 1;
    if (e.code === 'KeyE') E.interagir = true;
    if (e.code === 'KeyM') E.carte = !E.carte;
    if (e.code === 'Space') { E.action = true; e.preventDefault(); }
    cacherAide();
  });
  addEventListener('keyup', (e) => { touches[e.code] = false; majMouvement(); if (e.code === 'Space') E.action = false; });
  addEventListener('blur', () => { for (const k in touches) touches[k] = false; majMouvement(); E.action = false; });

  // Souris : un clic verrouille le pointeur ; avant ça, on peut regarder en glissant.
  let glisse = false;
  canvas.addEventListener('mousedown', (e) => {
    demarrerAudio();
    if (document.pointerLockElement === canvas) { if (e.button === 0) E.action = true; return; }
    glisse = true;
    const p = canvas.requestPointerLock?.(); if (p && p.catch) p.catch(() => {});
  });
  addEventListener('mouseup', (e) => { glisse = false; if (e.button === 0) E.action = false; });
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas && !glisse) return;
    // Certains navigateurs envoient un saut parasite de plusieurs centaines de pixels au moment
    // du verrouillage du pointeur : on l'ignore, sinon la vue fait un demi-tour toute seule.
    if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return;
    E.dYaw += e.movementX * SENS; E.dPitch += e.movementY * SENS;
  });
  document.addEventListener('pointerlockchange', () => { canvas.style.cursor = document.pointerLockElement === canvas ? 'none' : 'grab'; if (document.pointerLockElement === canvas) cacherAide(); });
  canvas.addEventListener('wheel', (e) => { E.outil = (E.outil + (e.deltaY > 0 ? 1 : 5)) % 6; e.preventDefault(); }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Une seule ligne d'aide, discrète, qui disparaît au premier geste.
  const aide = document.createElement('div');
  aide.textContent = 'Clic pour regarder à la souris · ZQSD pour marcher · Maj pour courir';
  aide.style.cssText = 'position:fixed;left:50%;top:calc(16px + env(safe-area-inset-top,0px));transform:translateX(-50%);padding:7px 14px;border-radius:999px;background:rgba(34,30,20,.45);color:#fffaf0;font:600 14px/1.2 "Trebuchet MS",system-ui,sans-serif;pointer-events:none;transition:opacity .6s;white-space:nowrap';
  document.body.appendChild(aide);
  let aideVue = false;
  function cacherAide() { if (aideVue) return; aideVue = true; setTimeout(() => { aide.style.opacity = '0'; }, 2500); }
}
