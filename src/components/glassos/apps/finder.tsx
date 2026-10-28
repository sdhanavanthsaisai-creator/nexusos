'use client';
import type { WinState } from '@/lib/glassos/types';
export function FinderApp({ win }: { win: WinState }) {
  return <div className="p-6 g-text-2 text-sm">Finder loading… ({win.id})</div>;
}
