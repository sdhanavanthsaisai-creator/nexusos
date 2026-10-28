/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — Music Engine
   Procedural ambient music synthesized live with the Web Audio API.
   Every track is a real, audible, generative composition (pads, bass, arp,
   soft percussion) with a real analyser for visualizers.
   ══════════════════════════════════════════════════════════════════════════ */

import type { Track } from './types';

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export const TRACKS: Track[] = [
  {
    id: 'aurora-drift',
    title: 'Aurora Drift',
    artist: 'Nebula Coast',
    album: 'Polar Glow',
    art: 'linear-gradient(135deg,#34d399 0%,#0ea5e9 55%,#a78bfa 100%)',
    cover: '/covers/aurora-drift.jpg',
    duration: 164,
    bpm: 72,
    root: 57, // A3
    chords: [
      [0, 7, 12, 16],
      [-4, 3, 10, 15],
      [-7, 0, 7, 14],
      [-2, 5, 9, 12],
    ],
    mood: 'ethereal',
  },
  {
    id: 'glass-ribbons',
    title: 'Glass Ribbons',
    artist: 'Kyoto Fog',
    album: 'Frostline',
    art: 'linear-gradient(135deg,#f0abfc 0%,#a78bfa 50%,#38bdf8 100%)',
    cover: '/covers/glass-ribbons.jpg',
    duration: 148,
    bpm: 84,
    root: 55, // G3
    chords: [
      [0, 4, 9, 14],
      [-3, 4, 7, 12],
      [-5, 2, 7, 11],
      [-1, 4, 6, 11],
    ],
    mood: 'dreamy',
  },
  {
    id: 'midnight-lagoon',
    title: 'Midnight Lagoon',
    artist: 'Velour Tides',
    album: 'Deep Cocoa',
    art: 'linear-gradient(135deg,#f59e0b 0%,#fb7185 50%,#7c3aed 100%)',
    cover: '/covers/midnight-lagoon.jpg',
    duration: 156,
    bpm: 64,
    root: 53, // F3
    chords: [
      [0, 4, 7, 14],
      [-5, 0, 5, 9],
      [-3, 2, 9, 12],
      [0, 5, 9, 16],
    ],
    mood: 'warm',
  },
  {
    id: 'neon-comet',
    title: 'Neon Comet',
    artist: 'After Atlas',
    album: 'Cyber Bloom',
    art: 'linear-gradient(135deg,#22d3ee 0%,#e879f9 55%,#818cf8 100%)',
    cover: '/covers/neon-comet.jpg',
    duration: 170,
    bpm: 96,
    root: 50, // D3
    chords: [
      [0, 3, 7, 10],
      [3, 7, 10, 15],
      [-2, 3, 8, 12],
      [-4, 1, 8, 12],
    ],
    mood: 'nocturnal',
  },
];

interface EngineState {
  playingId: string | null;
  onEnded: (() => void) | null;
}

const st: EngineState = { playingId: null, onEnded: null };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let delay: DelayNode | null = null;
let delayGain: GainNode | null = null;
let schedTimer: ReturnType<typeof setInterval> | null = null;
let startCtxTime = 0;
let startOffset = 0;
let nextBeat = 0;
let beatIdx = 0;
let vol = 0.6;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = vol * 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;

    delay = ctx.createDelay(1);
    delay.delayTime.value = 0.42;
    delayGain = ctx.createGain();
    delayGain.gain.value = 0.32;
    const dlyFilt = ctx.createBiquadFilter();
    dlyFilt.type = 'lowpass';
    dlyFilt.frequency.value = 2200;

    delay.connect(dlyFilt).connect(delayGain).connect(master);
    master.connect(comp).connect(analyser);
    analyser.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function pad(c: AudioContext, freq: number, t: number, dur: number, peak: number) {
  const g = c.createGain();
  const flt = c.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.setValueAtTime(900, t);
  flt.frequency.linearRampToValueAtTime(400, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + dur * 0.35);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  for (const det of [-6, 0, 7]) {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = det;
    o.connect(flt);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  flt.connect(g);
  g.connect(master!);
  g.connect(delay!);
}

function pluck(c: AudioContext, freq: number, t: number, peak = 0.09) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  o.connect(g).connect(master!);
  g.connect(delay!);
  o.start(t);
  o.stop(t + 1);
}

function bass(c: AudioContext, freq: number, t: number, dur: number) {
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o2.type = 'triangle';
  o.frequency.value = freq;
  o2.frequency.value = freq * 2;
  const g2 = c.createGain();
  g2.gain.value = 0.25;
  o2.connect(g2).connect(g);
  o.connect(g);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.06);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  g.connect(master!);
  o.start(t);
  o2.start(t);
  o.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
}

function hat(c: AudioContext, t: number, peak = 0.035) {
  const len = Math.floor(c.sampleRate * 0.06);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7000;
  const g = c.createGain();
  g.gain.value = peak;
  src.connect(f).connect(g).connect(master!);
  src.start(t);
}

function scheduleBeat(track: Track, beat: number, t: number) {
  const spb = 60 / track.bpm; // seconds per beat
  const bar = Math.floor(beat / 4) % track.chords.length;
  const chord = track.chords[bar];
  const inBar = beat % 4;

  if (inBar === 0) {
    // pad chord (2 beats long)
    for (const semi of chord) {
      pad(ctx!, midi(track.root + 12 + semi), t, spb * 4.4, 0.05);
    }
    bass(ctx!, midi(track.root - 12 + chord[0]), t, spb * 3.6);
  }
  // sparse arp on beats 1&3 (ethereal feel)
  if (inBar === 1 || inBar === 3) {
    const note = chord[(beat * 3) % chord.length];
    pluck(ctx!, midi(track.root + 24 + note), t, track.mood === 'nocturnal' ? 0.07 : 0.05);
  }
  if (inBar === 2 && track.mood !== 'ethereal') {
    const note = chord[1];
    pluck(ctx!, midi(track.root + 24 + note), t, 0.045);
  }
  // soft hats on offbeats for rhythmic tracks
  if (track.mood === 'nocturnal' && inBar % 2 === 1) hat(ctx!, t, 0.028);
  if (track.mood === 'warm' && inBar === 3) hat(ctx!, t, 0.02);
}

function startScheduler(track: Track, fromOffset: number) {
  stopScheduler();
  const c = ctx;
  if (!c) return;
  const spb = 60 / track.bpm;
  startCtxTime = c.currentTime + 0.08;
  startOffset = fromOffset;
  const startBeat = Math.floor(fromOffset / spb);
  beatIdx = startBeat;
  nextBeat = startCtxTime;

  schedTimer = setInterval(() => {
    if (!ctx) return;
    const now = ctx.currentTime;
    while (nextBeat < now + 0.25) {
      if (nextBeat >= now - 0.05) scheduleBeat(track, beatIdx, Math.max(nextBeat, now + 0.01));
      beatIdx++;
      nextBeat += spb;
    }
    if (getPosition() >= track.duration - 0.15) {
      const cb = st.onEnded;
      stopInternal();
      st.playingId = null;
      cb?.();
    }
  }, 90);
}

function stopScheduler() {
  if (schedTimer) {
    clearInterval(schedTimer);
    schedTimer = null;
  }
}

function stopInternal() {
  stopScheduler();
  if (ctx && master) {
    // quick fade to avoid clicks, then rebuild graph on next play
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
  }
}

export function getPosition(): number {
  if (!ctx || !st.playingId) return startOffset;
  return startOffset + Math.max(0, ctx.currentTime - startCtxTime);
}

export const musicEngine = {
  setEndedCallback(cb: (() => void) | null) {
    st.onEnded = cb;
  },

  play(track: Track, fromOffset = 0) {
    const c = ensureCtx();
    if (!c || !master) return;
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setTargetAtTime(vol * 0.5, c.currentTime, 0.1);
    st.playingId = track.id;
    startScheduler(track, Math.max(0, Math.min(fromOffset, track.duration - 1)));
  },

  pause() {
    if (!ctx) return;
    startOffset = getPosition();
    st.playingId = null;
    stopScheduler();
    if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  },

  resume(track: Track) {
    this.play(track, startOffset);
  },

  stop() {
    stopInternal();
    st.playingId = null;
    startOffset = 0;
  },

  seek(track: Track, seconds: number) {
    const target = Math.max(0, Math.min(seconds, track.duration - 1));
    if (st.playingId === track.id) {
      this.play(track, target);
    } else {
      startOffset = target;
    }
  },

  setVolume(v: number) {
    vol = v;
    if (ctx && master && st.playingId) master.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.05);
  },

  isPlaying(): boolean {
    return st.playingId !== null;
  },

  currentId(): string | null {
    return st.playingId;
  },

  /** Real waveform data from the analyser for visualizers. */
  waveform(): number[] | null {
    if (!analyser) return null;
    const arr = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(arr);
    return Array.from(arr.slice(0, 48));
  },
};
