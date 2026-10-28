// ─── Procedural ambient lo-fi engine (Web Audio API, zero assets) ─────────────
// Singleton `lofiEngine`. Master chain: session bus → master gain → analyser →
// destination. A 200 ms lookahead scheduler lays down one chord per bar (slow-
// attack detuned pads), a soft sub-bass note, sparse noise hats and a gentle
// vinyl-crackle bed. Fully SSR-safe (guarded `typeof window`).

import { clamp } from './utils';

export interface LofiTrackMeta {
  name: string;
  artist: string;
  bpm: number;
  key: string;
}

type Chord = number[]; // midi notes

interface TrackDef extends LofiTrackMeta {
  progression: Chord[];
  cutoff: number;      // pad lowpass (Hz)
  padWave: OscillatorType;
  hatDensity: number;  // probability per 8th note
  crackle: number;     // crackle gain multiplier
}

const TRACK_DEFS: TrackDef[] = [
  {
    name: 'Aurora Drift', artist: 'Nexus Ambient', bpm: 66, key: 'A minor',
    progression: [
      [57, 60, 64, 67], // Am7
      [53, 57, 60, 64], // Fmaj7
      [55, 59, 60, 64], // Cmaj7 (2nd inv)
      [55, 59, 62, 64], // G6
    ],
    cutoff: 950, padWave: 'triangle', hatDensity: 0.3, crackle: 1,
  },
  {
    name: 'Glass Ribbons', artist: 'Nexus Ambient', bpm: 72, key: 'D minor',
    progression: [
      [50, 53, 57, 60], // Dm7
      [53, 58, 62, 65], // Bbmaj7
      [53, 57, 60, 64], // Fmaj7
      [48, 55, 59, 62], // Cmaj9
    ],
    cutoff: 820, padWave: 'sine', hatDensity: 0.22, crackle: 0.8,
  },
  {
    name: 'Midnight Lagoon', artist: 'Nexus Ambient', bpm: 62, key: 'C major',
    progression: [
      [55, 60, 64, 71], // Cmaj7
      [57, 60, 64, 67], // Am7
      [53, 57, 60, 64], // Fmaj7
      [55, 59, 62, 64], // G6
    ],
    cutoff: 1100, padWave: 'triangle', hatDensity: 0.16, crackle: 1.1,
  },
  {
    name: 'Neon Rain', artist: 'Nexus Ambient', bpm: 70, key: 'E minor',
    progression: [
      [52, 55, 59, 62], // Em7
      [48, 52, 55, 59], // Cmaj7
      [55, 59, 62, 64], // G6
      [50, 54, 57, 59], // D6
    ],
    cutoff: 780, padWave: 'sine', hatDensity: 0.42, crackle: 1.25,
  },
];

/** Public track metadata (stable order — used by the island UI). */
export const TRACKS: LofiTrackMeta[] = TRACK_DEFS.map((t) => ({
  name: t.name, artist: t.artist, bpm: t.bpm, key: t.key,
}));

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const barSeconds = (bpm: number) => (60 / bpm) * 4;

function makeEngine() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let analyser: AnalyserNode | null = null;
  let session: GainNode | null = null;      // per-play bus (pads + bass + hats)
  let padFilter: BiquadFilterNode | null = null;
  let noiseBuf: AudioBuffer | null = null;
  let timer: number | null = null;
  let trackIdx = 0;
  let chordIdx = 0;
  let nextBarTime = 0;
  let volume = 0.5;
  let playing = false;
  const activeSources = new Set<AudioScheduledSourceNode>();

  const ensureCtx = (): boolean => {
    if (typeof window === 'undefined') return false;
    if (!ctx) {
      type ACtor = typeof AudioContext;
      const AC: ACtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.6;
      master.connect(analyser);
      analyser.connect(ctx.destination);
    }
    return true;
  };

  const getNoise = (): AudioBuffer | null => {
    if (!ctx) return null;
    if (!noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 1.5);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  };

  /** One bar = one chord: pad voices, sub bass, sparse hats. */
  const scheduleBar = (barTime: number) => {
    if (!ctx || !session || !padFilter) return;
    const c = ctx;
    const bus = session;
    const filter = padFilter;
    const def = TRACK_DEFS[trackIdx];
    const barLen = barSeconds(def.bpm);
    const chord = def.progression[chordIdx] ?? def.progression[0];

    // Pad — 2 detuned oscillators per chord tone, slow attack/release.
    chord.forEach((midi) => {
      const freq = midiToFreq(midi);
      for (let d = -1; d <= 1; d += 2) {
        const osc = c.createOscillator();
        osc.type = def.padWave;
        osc.frequency.value = freq;
        osc.detune.value = d * 7;
        const g = c.createGain();
        const peak = 0.05;
        const attack = Math.min(1.6, barLen * 0.45);
        g.gain.setValueAtTime(0.0001, barTime);
        g.gain.exponentialRampToValueAtTime(peak, barTime + attack);
        g.gain.setValueAtTime(peak, barTime + barLen * 0.72);
        g.gain.exponentialRampToValueAtTime(0.0001, barTime + barLen + 0.9);
        osc.connect(g);
        g.connect(filter);
        osc.start(barTime);
        osc.stop(barTime + barLen + 1);
        activeSources.add(osc);
        osc.onended = () => activeSources.delete(osc);
      }
    });

    // Sub bass — one soft sine note per chord (root, one octave down).
    const bass = c.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = midiToFreq(chord[0] - 12);
    const bg = c.createGain();
    bg.gain.setValueAtTime(0.0001, barTime);
    bg.gain.exponentialRampToValueAtTime(0.14, barTime + 0.5);
    bg.gain.setValueAtTime(0.14, barTime + barLen - 0.4);
    bg.gain.exponentialRampToValueAtTime(0.0001, barTime + barLen + 0.4);
    bass.connect(bg);
    bg.connect(bus);
    bass.start(barTime);
    bass.stop(barTime + barLen + 0.5);
    activeSources.add(bass);
    bass.onended = () => activeSources.delete(bass);

    // Sparse hats — filtered noise ticks on 8th notes.
    if (def.hatDensity > 0) {
      const noise = getNoise();
      const beat = 60 / def.bpm;
      for (let i = 0; i < 8; i++) {
        if (Math.random() > def.hatDensity || !noise) continue;
        const t = barTime + i * beat * 0.5;
        const src = c.createBufferSource();
        src.buffer = noise;
        const hp = c.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6500;
        const hg = c.createGain();
        hg.gain.setValueAtTime(0.03, t);
        hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        src.connect(hp);
        hp.connect(hg);
        hg.connect(bus);
        src.start(t, Math.random(), 0.12);
        activeSources.add(src);
        src.onended = () => activeSources.delete(src);
      }
    }
  };

  /** Vinyl crackle bed — looped noise through a low-gain bandpass. */
  const startCrackle = (def: TrackDef) => {
    if (!ctx || !session) return;
    const noise = getNoise();
    if (!noise) return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 4200;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.012 * def.crackle;
    src.connect(bp);
    bp.connect(g);
    g.connect(session);
    src.start();
    activeSources.add(src);
    src.onended = () => activeSources.delete(src);
  };

  const advanceBars = (untilTime: number, lookahead: number) => {
    if (!ctx) return;
    const def = TRACK_DEFS[trackIdx];
    while (nextBarTime < untilTime + lookahead) {
      scheduleBar(nextBarTime);
      chordIdx = (chordIdx + 1) % def.progression.length;
      nextBarTime += barSeconds(def.bpm);
    }
  };

  const tick = () => {
    if (!ctx || !playing) return;
    advanceBars(ctx.currentTime, 0.7);
  };

  const startSession = () => {
    if (!ctx || !master || playing) return;
    const c = ctx;
    session = c.createGain();
    session.gain.setValueAtTime(0.0001, c.currentTime);
    session.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.4); // gentle fade-in
    padFilter = c.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = TRACK_DEFS[trackIdx].cutoff;
    padFilter.Q.value = 0.4;
    padFilter.connect(session);
    session.connect(master);

    chordIdx = 0;
    nextBarTime = c.currentTime + 0.15;
    startCrackle(TRACK_DEFS[trackIdx]);
    advanceBars(c.currentTime, 0.8);
    timer = window.setInterval(tick, 200);
    playing = true;
  };

  const stopSession = () => {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    playing = false;
    if (!ctx || !session) return;
    const t = ctx.currentTime;
    session.gain.cancelScheduledValues(t);
    session.gain.setValueAtTime(Math.max(0.0001, session.gain.value), t);
    session.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    const sources = Array.from(activeSources);
    activeSources.clear();
    window.setTimeout(() => {
      for (const s of sources) {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      }
      try {
        session?.disconnect();
      } catch {
        /* already disconnected */
      }
      session = null;
      padFilter = null;
    }, 260);
  };

  return {
    /** Create/resume the AudioContext — call on first user gesture. */
    unlock(): void {
      if (!ensureCtx() || !ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
    },
    play(trackIndex?: number): void {
      if (!ensureCtx() || !ctx) return;
      let switchTrack = false;
      if (typeof trackIndex === 'number' && Number.isFinite(trackIndex)) {
        const next = ((Math.round(trackIndex) % TRACK_DEFS.length) + TRACK_DEFS.length) % TRACK_DEFS.length;
        if (next !== trackIdx) {
          trackIdx = next;
          switchTrack = true;
        }
      }
      if (ctx.state === 'suspended') void ctx.resume();
      if (playing) {
        if (switchTrack) {
          stopSession();
          startSession();
        }
        return;
      }
      startSession();
    },
    pause(): void {
      if (playing) stopSession();
    },
    toggle(): void {
      if (playing) stopSession();
      else this.play();
    },
    next(): void {
      trackIdx = (trackIdx + 1) % TRACK_DEFS.length;
      if (playing) {
        stopSession();
        startSession();
      }
    },
    prev(): void {
      trackIdx = (trackIdx - 1 + TRACK_DEFS.length) % TRACK_DEFS.length;
      if (playing) {
        stopSession();
        startSession();
      }
    },
    setVolume(v: number): void {
      volume = clamp(Number.isFinite(v) ? v : volume, 0, 1);
      if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
    },
    getVolume(): number {
      return volume;
    },
    isPlaying(): boolean {
      return playing;
    },
    getTrackIndex(): number {
      return trackIdx;
    },
    getTrack(): LofiTrackMeta {
      return TRACKS[trackIdx];
    },
    /** Fill `out` from the master AnalyserNode (time-domain, 128 = silence). */
    waveform(out: Uint8Array): void {
      if (!analyser || !ctx) {
        out.fill(128);
        return;
      }
      analyser.getByteTimeDomainData(out as unknown as Parameters<AnalyserNode['getByteTimeDomainData']>[0]);
    },
  };
}

export const lofiEngine = makeEngine();
