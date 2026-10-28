/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — SFX Engine
   High-end UI sounds synthesized with the Web Audio API (no assets needed).
   ══════════════════════════════════════════════════════════════════════════ */

type Ctx = AudioContext & { __glassMaster?: GainNode };

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let enabled = true;
let volume = 0.6;
let unlocked = false;

function ac(): Ctx | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC() as Ctx;
    master = ctx.createGain();
    master.gain.value = volume * 0.9;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** Unlock audio on first user gesture (browser autoplay policy). */
export function unlockAudio() {
  const c = ac();
  if (!c || unlocked) return;
  if (c.state === 'suspended') void c.resume();
  unlocked = true;
}

export function configureSfx(on: boolean, vol: number) {
  enabled = on;
  volume = vol;
  if (master && ctx) master.gain.setTargetAtTime(vol * 0.9, ctx.currentTime, 0.02);
}

/** Create a fresh context lazily after a gesture so sounds always work. */
function ensure(): { c: Ctx; out: GainNode } | null {
  if (!enabled || !unlocked) return null;
  const c = ac();
  if (!c || !master) return null;
  if (c.state === 'suspended') void c.resume();
  return { c, out: master };
}

function env(
  c: AudioContext,
  out: GainNode,
  type: OscillatorType,
  freq: number,
  t0: number,
  attack: number,
  decay: number,
  peak: number,
  detune = 0,
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.detune.setValueAtTime(detune, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + attack + decay + 0.02);
}

function noise(
  c: AudioContext,
  out: GainNode,
  t0: number,
  dur: number,
  peak: number,
  filterType: BiquadFilterType,
  f0: number,
  f1?: number,
) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const flt = c.createBiquadFilter();
  flt.type = filterType;
  flt.frequency.setValueAtTime(f0, t0);
  if (f1 !== undefined) flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(flt).connect(g).connect(out);
  src.start(t0);
  src.stop(t0 + dur);
}

export const sfx = {
  /** Soft glassy tap for buttons & generic clicks. */
  click() {
    const e = ensure();
    if (!e) return;
    const { c, out } = e;
    const t = c.currentTime;
    env(c, out, 'sine', 1900, t, 0.004, 0.05, 0.14);
    env(c, out, 'sine', 2850, t, 0.003, 0.03, 0.05);
    noise(c, out, t, 0.02, 0.03, 'highpass', 4200);
  },
  /** Deeper pop for launching apps / opening windows. */
  pop() {
    const e = ensure();
    if (!e) return;
    const { c, out } = e;
    const t = c.currentTime;
    env(c, out, 'sine', 520, t, 0.005, 0.12, 0.22);
    env(c, out, 'sine', 780, t + 0.012, 0.004, 0.1, 0.12);
    env(c, out, 'sine', 1560, t + 0.02, 0.003, 0.08, 0.06);
  },
  /** Airy whoosh for window open / spotlight. */
  open() {
    const e = ensure();
    if (!e) return;
    const { c, out } = e;
    const t = c.currentTime;
    noise(c, out, t, 0.28, 0.09, 'bandpass', 700, 3800);
    env(c, out, 'sine', 660, t + 0.05, 0.02, 0.18, 0.08);
    env(c, out, 'sine', 990, t + 0.09, 0.02, 0.16, 0.05);
  },
  /** Reverse whoosh for close / minimize. */
  close() {
    const e = ensure();
    if (!e) return;
    const { c, out } = e;
    const t = c.currentTime;
    noise(c, out, t, 0.22, 0.08, 'bandpass', 3200, 600);
    env(c, out, 'sine', 440, t, 0.01, 0.14, 0.07);
  },
  /** Toggle on. */
  toggleOn() {
    const e = ensure();
    if (!e) return;
    const { c, out } = e;
    const t = c.currentTime;
    env(c, out, 'triangle', 880, t, 0.004, 0.07, 0.16);
    env(c, out, 'triangle', 1320, t + 0.03, 0.004, 0.07, 0.1);
  },
  /** Toggle off. */
  toggleOff() {
    const e = ensure();
    if (!e) return;
    const { c, out } = e;
    const t = c.currentTime;
    env(c, out, 'triangle', 1320, t, 0.004, 0.06, 0.12);
    env(c, out, 'triangle', 880, t + 0.03, 0.004, 0.08, 0.12);
  },
  /** Two-tone notification chime. */
  notify() {
    const e = ensure();
    if (!e) return;
    const { c, out } = e;
    const t = c.currentTime;
    env(c, out, 'sine', 987.77, t, 0.008, 0.22, 0.16); // B5
    env(c, out, 'sine', 1318.5, t + 0.09, 0.008, 0.3, 0.14); // E6
    noise(c, out, t, 0.04, 0.015, 'highpass', 6000);
  },
  /** Error / destructive buzz — still pleasant. */
  error() {
    const e = ensure();
    if (!e) return;
    const { c, out } = e;
    const t = c.currentTime;
    env(c, out, 'sawtooth', 220, t, 0.005, 0.16, 0.08, -8);
    env(c, out, 'sawtooth', 233, t, 0.005, 0.16, 0.06, 8);
  },
  /** Tick for timers. */
  tick() {
    const e = ensure();
    if (!e) return;
    const { c, out } = e;
    const t = c.currentTime;
    noise(c, out, t, 0.015, 0.05, 'bandpass', 2400);
  },
};
