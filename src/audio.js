// Sons synthétisés (aucun fichier audio) : courts, légèrement variés à chaque fois
// pour ne pas lasser sur des milliers de répétitions.

let ctx = null;
let master = null;
const PENTA = [0, 2, 4, 7, 9, 12, 14];

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);
  startWind();
}

function noiseBuffer(seconds) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(freq, start, dur, { type = 'sine', gain = 0.25, slide = 0 } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function noise(start, dur, { freq = 1200, q = 0.8, gain = 0.2, type = 'bandpass' } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(dur + 0.05);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(master);
  src.start(start);
}

function startWind() {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(4);
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 420;
  const g = ctx.createGain();
  g.gain.value = 0.05;
  // Le vent souffle par vagues lentes.
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.09;
  lfoGain.gain.value = 0.03;
  lfo.connect(lfoGain).connect(g.gain);
  src.connect(f).connect(g).connect(master);
  src.start();
  lfo.start();
}

let pollinateCount = 0;

export const sfx = {
  charge() {
    if (!ctx) return;
    const t = ctx.currentTime;
    noise(t, 0.25, { freq: 3000, q: 1.5, gain: 0.12 });
    tone(520, t, 0.18, { type: 'triangle', gain: 0.08, slide: 1.5 });
  },
  pollinate() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const step = PENTA[(pollinateCount++ + Math.floor(Math.random() * 3)) % PENTA.length];
    const f = 660 * 2 ** (step / 12) * (0.99 + Math.random() * 0.02);
    tone(f, t, 0.22, { gain: 0.2 });
    tone(f * 2, t, 0.12, { gain: 0.05 });
  },
  denied() {
    if (!ctx) return;
    tone(180, ctx.currentTime, 0.1, { type: 'square', gain: 0.04 });
  },
  shake() {
    if (!ctx) return;
    const t = ctx.currentTime;
    noise(t, 0.5, { freq: 900, q: 0.5, gain: 0.25 });
    tone(90, t, 0.25, { gain: 0.3, slide: 0.6 });
  },
  pickup() {
    if (!ctx) return;
    tone(880 + Math.random() * 120, ctx.currentTime, 0.07, { type: 'triangle', gain: 0.1 });
  },
  sell() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [0, 4, 7, 12].forEach((s, k) => tone(523 * 2 ** (s / 12), t + k * 0.09, 0.3, { type: 'triangle', gain: 0.18 }));
    tone(523 * 2, t + 0.36, 0.5, { gain: 0.12 });
  },
};
