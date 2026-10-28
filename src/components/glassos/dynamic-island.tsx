'use client';

/* ══════════════════════════════════════════════════════════════════════════
   GlassOS — Dynamic Island
   Idle orb · Now Playing · Timer · System Alerts · AI Quick Prompt.
   Spring-physics expansion, live waveform, inline mini-chat.
   ══════════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles, Timer as TimerIcon, Play, Pause, RotateCcw, SkipBack, SkipForward,
  Heart, Volume2, Sun, BatteryCharging, Download, Info, CheckCircle2, ArrowUp,
  Music2, ChevronUp, X,
} from 'lucide-react';
import { useIsland, useMusicStore } from '@/lib/glassos/store';
import { useMusicControls } from '@/lib/glassos/music-hooks';
import { musicEngine } from '@/lib/glassos/music';
import { sfx } from '@/lib/glassos/sound';
import { LiveWaveform } from './waveform';
import type { IslandAlert } from '@/lib/glassos/types';

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 28 };
const EXPANDED_W = 392;

const ALERT_ICONS = {
  volume: Volume2, brightness: Sun, battery: BatteryCharging,
  download: Download, info: Info, check: CheckCircle2,
} as const;

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/* ── Progress slider (used by music) ─────────────────────────────────────── */

function SeekBar({ duration, onSeek }: { duration: number; onSeek: (seconds: number) => void }) {
  const [pos, setPos] = useState(0);
  const dragging = useRef(false);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (!dragging.current) setPos(musicEngine.isPlaying() ? musicEngine.getPosition() : 0);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const seekTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(p * duration);
    setPos(p * duration);
  };

  return (
    <div
      className="group relative h-[5px] w-full cursor-pointer rounded-full bg-white/15"
      onPointerDown={(e) => {
        dragging.current = true;
        seekTo(e);
        const move = (ev: PointerEvent) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const p = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
          setPos(p * duration);
        };
        const up = () => {
          dragging.current = false;
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      }}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={Math.round(pos)}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${(pos / duration) * 100}%`, background: 'linear-gradient(90deg,var(--g-accent),var(--g-accent-2))' }}
      />
      <div
        className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition group-hover:opacity-100"
        style={{ left: `calc(${(pos / duration) * 100}% - 6px)` }}
      />
    </div>
  );
}

/* ── Timer module ────────────────────────────────────────────────────────── */

function TimerModule() {
  const { timer, startTimer, pauseTimer, resumeTimer, resetTimer } = useIsland();
  const pct = timer.total > 0 ? 1 - timer.remaining / timer.total : 0;
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="relative h-[84px] w-[84px] shrink-0">
        <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
          <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
          <circle
            cx="42" cy="42" r={R} fill="none" stroke="var(--g-accent)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.4s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[17px] font-semibold tabular-nums">
          {fmt(timer.remaining)}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold g-text-1">{timer.label || 'Timer'}</div>
        <div className="text-[11px] g-text-3">{timer.running ? 'Running' : timer.remaining > 0 ? 'Paused' : 'Pick a duration'}</div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {[1, 5, 10, 25].map((m) => (
            <button
              key={m}
              onClick={() => { sfx.click(); startTimer(m * 60, `${m} min`); }}
              className="glass-chip glass-hover rounded-full px-2.5 py-1 text-[11px] font-medium g-text-2"
            >
              {m}m
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {timer.running ? (
            <button aria-label="Pause timer" onClick={() => pauseTimer()} className="glass-chip glass-hover rounded-full p-1.5"><Pause size={13} /></button>
          ) : (
            <button aria-label="Resume timer" onClick={() => resumeTimer()} className="glass-chip glass-hover rounded-full p-1.5"><Play size={13} /></button>
          )}
          <button aria-label="Reset timer" onClick={() => resetTimer()} className="glass-chip glass-hover rounded-full p-1.5"><RotateCcw size={13} /></button>
        </div>
      </div>
    </div>
  );
}

/* ── Now Playing module ──────────────────────────────────────────────────── */

function NowPlayingModule() {
  const { track, playing, toggle, next, prev } = useMusicControls();
  const liked = useMusicStore((s) => s.liked);
  const toggleLike = useMusicStore((s) => s.toggleLike);
  const isLiked = liked.includes(track.id);

  return (
    <div className="p-4">
      <div className="flex items-center gap-3">
        <div
          className="relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-xl shadow-lg"
          style={{ background: track.art }}
        >
          {track.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.cover} alt="" className={`h-full w-full object-cover transition-transform duration-500 ${playing ? 'scale-100' : 'scale-90 opacity-70'}`} />
          )}
          <motion.div
            className="absolute inset-0 rounded-xl"
            animate={playing ? { boxShadow: ['0 0 0 0 rgba(255,255,255,0.0)', '0 0 18px 2px rgba(255,255,255,0.18)', '0 0 0 0 rgba(255,255,255,0.0)'] } : {}}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold g-text-1">{track.title}</div>
          <div className="truncate text-[12px] g-text-2">{track.artist} · {track.album}</div>
          <div className="mt-1.5"><LiveWaveform active={playing} bars={26} className="h-[18px] w-full text-white/80" /></div>
        </div>
      </div>
      <div className="mt-3"><SeekBar duration={track.duration} onSeek={seek} /></div>
      <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums g-text-3">
        <span>{fmt(musicEngine.isPlaying() ? musicEngine.getPosition() : 0)}</span>
        <span>{fmt(track.duration)}</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-3">
        <button aria-label="Previous track" onClick={prev} className="glass-chip glass-hover rounded-full p-2"><SkipBack size={15} /></button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={toggle}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg"
          style={{ background: 'linear-gradient(135deg,var(--g-accent),var(--g-accent-2))' }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </motion.button>
        <button aria-label="Next track" onClick={next} className="glass-chip glass-hover rounded-full p-2"><SkipForward size={15} /></button>
        <button aria-label="Like track" onClick={() => toggleLike(track.id)} className={`glass-chip glass-hover rounded-full p-2 ${isLiked ? 'text-rose-400' : ''}`}>
          <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
}

/* ── AI module ───────────────────────────────────────────────────────────── */

interface AiExchange { q: string; a: string }

function AiModule() {
  const [q, setQ] = useState('');
  const [ex, setEx] = useState<AiExchange | null>(null);
  const [shown, setShown] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ex) return;
    let i = 0;
    setShown('');
    const iv = setInterval(() => {
      i += 2;
      setShown(ex.a.slice(0, i));
      if (i >= ex.a.length) clearInterval(iv);
    }, 14);
    return () => clearInterval(iv);
  }, [ex]);

  const ask = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setBusy(true);
    setErr(false);
    setQ('');
    try {
      const res = await fetch('/api/glass-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: question }] }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      setEx({ q: question, a: data.text ?? data.error ?? 'No response.' });
      sfx.notify();
    } catch {
      setErr(true);
      setEx({ q: question, a: 'Could not reach the AI core. Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 text-[12px] font-semibold g-text-2">
        <Sparkles size={13} className="g-accent" /> Ask GlassOS
      </div>
      <form
        className="glass-chip mt-2 flex items-center gap-2 rounded-xl px-3 py-2"
        onSubmit={(e) => { e.preventDefault(); void ask(q); }}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask anything, or try “open music”…"
          className="g-input min-w-0 flex-1 text-[13px]"
          aria-label="Ask the AI assistant"
        />
        <button type="submit" aria-label="Send" disabled={busy || !q.trim()}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,var(--g-accent),var(--g-accent-2))' }}
        >
          {busy ? <span className="g-spin inline-block h-3 w-3 rounded-full border-[1.5px] border-white/30 border-t-white" /> : <ArrowUp size={13} />}
        </button>
      </form>

      {ex ? (
        <div className="g-scroll mt-2 max-h-[110px] overflow-y-auto text-[12.5px] leading-relaxed">
          <span className="g-text-3">“{ex.q}”</span>
          <p className={`mt-1 whitespace-pre-wrap ${err ? 'text-rose-300' : 'g-text-1'}`}>{shown}</p>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['Open music', 'Start a 5 min timer', 'What can GlassOS do?'].map((s) => (
            <button key={s} onClick={() => void ask(s)} className="glass-chip glass-hover rounded-full px-2.5 py-1 text-[11px] g-text-2">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Alert module ────────────────────────────────────────────────────────── */

function AlertModule({ alert, queue }: { alert: IslandAlert; queue: number }) {
  const Icon = ALERT_ICONS[alert.icon];
  const dismiss = useIsland((s) => s.dismissAlert);
  return (
    <div className="flex items-center gap-3 p-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
        <Icon size={16} className="g-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold g-text-1">{alert.title}</div>
        {alert.detail && <div className="truncate text-[11px] g-text-3">{alert.detail}</div>}
      </div>
      {queue > 1 && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] g-text-3">+{queue - 1}</span>}
      <button aria-label="Dismiss" onClick={dismiss} className="rounded-full p-1 g-text-3 hover:text-white"><X size={13} /></button>
    </div>
  );
}

/* ── The Island ──────────────────────────────────────────────────────────── */

export function DynamicIsland() {
  const { expanded, module, alerts, timer, setExpanded, setModule } = useIsland();
  const playing = useMusicStore((s) => s.playing);
  const currentTrack = useMusicStore((s) => s.tracks.find((t) => t.id === s.currentId));
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // tick the timer
  useEffect(() => {
    const iv = setInterval(() => useIsland.getState().tickTimer(), 500);
    return () => clearInterval(iv);
  }, []);

  // Command routing for AI quick actions
  useEffect(() => {
    const handler = (e: Event) => {
      const cmd = (e as CustomEvent<string>).detail?.toLowerCase() ?? '';
      if (cmd.includes('music')) window.dispatchEvent(new CustomEvent('glassos:open', { detail: 'music' }));
      if (cmd.includes('timer')) {
        const m = cmd.match(/(\d+)\s*(min|minute)/);
        const mins = m ? parseInt(m[1], 10) : 5;
        useIsland.getState().startTimer(mins * 60, `${mins} min`);
      }
      if (cmd.includes('dark') || cmd.includes('theme')) window.dispatchEvent(new CustomEvent('glassos:cycle-theme'));
    };
    window.addEventListener('glassos:command', handler);
    return () => window.removeEventListener('glassos:command', handler);
  }, []);

  const compactContent = () => {
    if (module === 'alert' && alerts[0]) {
      const Icon = ALERT_ICONS[alerts[0].icon];
      return (
        <div className="flex items-center gap-1.5">
          <Icon size={12} className="g-accent" />
          <span className="max-w-[150px] truncate text-[11px] font-medium text-white/90">{alerts[0].title}</span>
        </div>
      );
    }
    if (playing && currentTrack) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px]" style={{ background: currentTrack.art }}>
            <Music2 size={8} className="text-white" />
          </div>
          <div className="flex h-3 items-end gap-[2px]">
            {[0, 1, 2].map((i) => (
              <span key={i} className="g-wavebar w-[2.5px] rounded-full bg-white/90" style={{ height: '100%', animationDelay: `${i * 0.18}s` }} />
            ))}
          </div>
          <span className="max-w-[110px] truncate text-[11px] text-white/80">{currentTrack.title}</span>
        </div>
      );
    }
    if (timer.running || timer.remaining > 0) {
      return (
        <div className="flex items-center gap-1.5">
          <TimerIcon size={12} className="g-accent" />
          <span className="text-[11px] font-semibold tabular-nums text-white/90">{fmt(timer.remaining)}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-1">
        <span className="g-orb-pulse block h-[9px] w-[9px] rounded-full" style={{ background: 'conic-gradient(from 0deg, var(--g-accent), var(--g-accent-2), var(--g-accent-3), var(--g-accent))', boxShadow: '0 0 10px var(--g-accent)' }} />
      </div>
    );
  };

  const expandWith = (m: typeof module) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setModule(m === 'idle' ? (playing ? 'music' : timer.running ? 'timer' : 'ai') : m);
    setExpanded(true);
  };

  return (
    <motion.div
      layout
      className="g-island relative z-[95] overflow-hidden"
      style={{ borderRadius: expanded ? 22 : 999 }}
      animate={{
        width: expanded ? EXPANDED_W : 'auto',
        height: expanded ? 'auto' : 30,
      }}
      transition={SPRING}
      onHoverStart={() => {
        hoverTimer.current = setTimeout(() => expandWith('idle'), 160);
      }}
      onHoverEnd={() => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setExpanded(false), 420);
      }}
      onClick={() => !expanded && expandWith('idle')}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {!expanded ? (
          <motion.div
            key="compact"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.16 }}
            className="flex h-[30px] items-center justify-center px-3.5"
          >
            {compactContent()}
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{ width: EXPANDED_W }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={module + (alerts[0]?.id ?? '')}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {module === 'alert' && alerts[0] ? (
                  <AlertModule alert={alerts[0]} queue={alerts.length} />
                ) : module === 'music' ? (
                  <NowPlayingModule />
                ) : module === 'timer' ? (
                  <TimerModule />
                ) : (
                  <AiModule />
                )}
              </motion.div>
            </AnimatePresence>

            {/* module switcher */}
            <div className="flex items-center justify-center gap-1 border-t border-white/[0.06] px-3 py-1.5">
              {([
                ['music', Music2, 'Music'],
                ['timer', TimerIcon, 'Timer'],
                ['ai', Sparkles, 'AI'],
              ] as const).map(([m, Icon, label]) => (
                <button
                  key={m}
                  aria-label={`${label} module`}
                  onClick={(e) => { e.stopPropagation(); sfx.click(); setModule(m); }}
                  className={`rounded-full p-1.5 transition ${module === m ? 'bg-white/15 text-white' : 'g-text-3 hover:text-white'}`}
                >
                  <Icon size={13} />
                </button>
              ))}
              <ChevronUp size={12} className="ml-1 g-text-3" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
