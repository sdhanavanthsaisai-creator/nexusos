'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

function Splash() {
  return (
    <div className="grid-bg flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="animate-pulse-glow text-gradient text-3xl font-black tracking-tight">NEXUS OS</div>
      <div className="flex items-center gap-1.5" aria-label="Loading NexusOS">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 140}ms` }} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Initializing local workspace…</p>
    </div>
  );
}

const NexusApp = dynamic(() => import('@/components/nexus/nexus-app'), {
  ssr: false,
  loading: () => <Splash />,
});

const AuthGate = dynamic(() => import('@/components/nexus/auth-gate'), {
  ssr: false,
  loading: () => <Splash />,
});

export default function Page() {
  return (
    <Suspense fallback={<Splash />}>
      <AuthGate>
        <NexusApp />
      </AuthGate>
    </Suspense>
  );
}
