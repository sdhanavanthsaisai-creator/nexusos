'use client';

/* Shared music playback controls for Island + Music app. */

import { useCallback, useMemo } from 'react';
import { musicEngine } from './music';
import { useMusicStore } from './store';

export function useMusicControls() {
  const tracks = useMusicStore((s) => s.tracks);
  const currentId = useMusicStore((s) => s.currentId);
  const playing = useMusicStore((s) => s.playing);
  const shuffle = useMusicStore((s) => s.shuffle);
  const setCurrent = useMusicStore((s) => s.setCurrent);
  const setPlaying = useMusicStore((s) => s.setPlaying);
  const setShuffle = useMusicStore((s) => s.setShuffle);

  const track = useMemo(() => tracks.find((t) => t.id === currentId) ?? tracks[0], [tracks, currentId]);

  const playTrack = useCallback(
    (t: typeof track, offset = 0) => {
      musicEngine.play(t, offset);
      setCurrent(t.id);
      setPlaying(true);
    },
    [setCurrent, setPlaying],
  );

  const next = useCallback(() => {
    const idx = tracks.findIndex((t) => t.id === track.id);
    const nxt = shuffle ? tracks[Math.floor(Math.random() * tracks.length)] : tracks[(idx + 1) % tracks.length];
    playTrack(nxt, 0);
  }, [tracks, track, shuffle, playTrack]);

  const prev = useCallback(() => {
    const idx = tracks.findIndex((t) => t.id === track.id);
    const prv = tracks[(idx - 1 + tracks.length) % tracks.length];
    playTrack(prv, 0);
  }, [tracks, track, playTrack]);

  const toggle = useCallback(() => {
    if (musicEngine.isPlaying()) {
      musicEngine.pause();
      setPlaying(false);
    } else {
      musicEngine.resume(track);
      setPlaying(true);
    }
  }, [track, setPlaying]);

  const seek = useCallback(
    (seconds: number) => {
      musicEngine.seek(track, seconds);
      if (!musicEngine.isPlaying()) useMusicStore.getState().setPosSnapshot(seconds);
    },
    [track],
  );

  return { tracks, track, playing, shuffle, setShuffle, playTrack, next, prev, toggle, seek };
}
