'use client';
import type { WinState } from '@/lib/glassos/types';
export function MusicApp({ win }: { win: WinState }) {
  return <div className="p-6 g-text-2 text-sm">Music loading… ({win.id})</div>;
}
