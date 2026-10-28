'use client';
import type { WinState } from '@/lib/glassos/types';
export function SettingsApp({ win }: { win: WinState }) {
  return <div className="p-6 g-text-2 text-sm">Settings loading… ({win.id})</div>;
}
