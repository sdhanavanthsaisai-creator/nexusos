'use client';

/**
 * GlassOS living backdrop — cosmic mesh + aurora borealis.
 * Pure CSS animation (GPU-friendly), theme-reactive via --aur-* tokens.
 */
export default function AuroraBackground() {
  return (
    <div className="aurora-stage" aria-hidden="true">
      <div className="aurora-stars" />
      <div className="aurora-stars aurora-stars-2" />
      <div className="aurora-blob aurora-blob-a" />
      <div className="aurora-blob aurora-blob-b" />
      <div className="aurora-blob aurora-blob-c" />
      <div className="aurora-blob aurora-blob-d" />
      <div className="aurora-vignette" />
      <div className="aurora-grain" />
    </div>
  );
}
