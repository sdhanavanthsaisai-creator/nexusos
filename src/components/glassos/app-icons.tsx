'use client';

/* App icon tiles — shared by dock, launchpad, spotlight, window titlebars. */

import { FolderOpen, Globe, NotebookPen, Music2, Settings2 } from 'lucide-react';
import type { AppId } from '@/lib/glassos/types';

export const APP_ICONS: Record<AppId, { Icon: typeof FolderOpen; grad: string; shadow: string }> = {
  finder: { Icon: FolderOpen, grad: 'linear-gradient(140deg,#5eead4 0%,#0ea5e9 100%)', shadow: 'rgba(14,165,233,.45)' },
  browser: { Icon: Globe, grad: 'linear-gradient(140deg,#818cf8 0%,#e879f9 100%)', shadow: 'rgba(232,121,249,.4)' },
  notes: { Icon: NotebookPen, grad: 'linear-gradient(140deg,#fbbf24 0%,#fb7185 100%)', shadow: 'rgba(251,113,133,.4)' },
  music: { Icon: Music2, grad: 'linear-gradient(140deg,#f472b6 0%,#a855f7 100%)', shadow: 'rgba(168,85,247,.45)' },
  settings: { Icon: Settings2, grad: 'linear-gradient(140deg,#94a3b8 0%,#475569 100%)', shadow: 'rgba(100,116,139,.45)' },
};

export function AppIconTile({ appId, size = 44, radius = 12 }: { appId: AppId; size?: number; radius?: number }) {
  const { Icon, grad, shadow } = APP_ICONS[appId];
  return (
    <div
      className="flex items-center justify-center text-white"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: grad,
        boxShadow: `0 6px 18px -4px ${shadow}, inset 0 1px 0 rgba(255,255,255,.35)`,
      }}
    >
      <Icon size={size * 0.5} strokeWidth={1.8} />
    </div>
  );
}
