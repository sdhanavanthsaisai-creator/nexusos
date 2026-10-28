'use client';
import type { WinState } from '@/lib/glassos/types';
export function BrowserApp({ win }: { win: WinState }) {
  return <div className="p-6 g-text-2 text-sm">Prism loading… ({win.id})</div>;
}
