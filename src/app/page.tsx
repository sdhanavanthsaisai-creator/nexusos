'use client';

import dynamic from 'next/dynamic';

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020208]">
      <div
        className="h-16 w-16 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg,#a78bfa,#22d3ee,#34d399,#f472b6,#a78bfa)',
          filter: 'blur(10px)',
          animation: 'g-spin 2s linear infinite',
        }}
        aria-label="Loading GlassOS"
      />
    </div>
  );
}

const GlassOSApp = dynamic(() => import('@/components/glassos/glass-os'), {
  ssr: false,
  loading: () => <Splash />,
});

export default function Page() {
  return <GlassOSApp />;
}
