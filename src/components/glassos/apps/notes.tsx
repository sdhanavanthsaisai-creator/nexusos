'use client';
import type { WinState } from '@/lib/glassos/types';
export function NotesApp({ win }: { win: WinState }) {
  return <div className="p-6 g-text-2 text-sm">Notes loading… ({win.id})</div>;
}
