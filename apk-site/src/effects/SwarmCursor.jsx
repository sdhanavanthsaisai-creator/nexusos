'use client';

import { useEffect, useRef } from 'react';
import { createSwarmScene } from './swarm-scene';
import { SHAPES } from './swarm-glsl';
import { MAX_PARTICLES } from './swarm-grid';
import './SwarmCursor.css';

const HIDDEN = 'swarm-cursor-hidden';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const SwarmCursor = ({
  count = 800,
  size = 2.6,
  shape = 'dot',
  color,
  accentColor,
  spread = 90,
  speed = 1,
  swirl = 0.6,
  tail = 0.5,
  trail = 0.6,
  wander = 0.5,
  depth = 0.7,
  targets = 'a, button, [data-swarm-target]',
  idle = 'roam',
  clickEffect = 'burst',
  hideCursor = false,
  intro = true,
  enabled = true,
  lightMode = false,
  dpr,
  children,
  className = '',
  style,
  ...rest
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const ink = lightMode ? '#18181b' : '#ffffff';
  const settings = {
    count: Math.round(clamp(count, 1, MAX_PARTICLES)),
    size: clamp(size, 0.5, 16),
    shape: SHAPES[shape] ?? 0,
    color: color || ink,
    accentColor: accentColor || color || ink,
    spread: clamp(spread, 20, 400),
    speed: clamp(speed, 0, 4),
    swirl: clamp(swirl, 0, 1),
    tail: clamp(tail, 0, 1),
    trail: clamp(trail, 0, 3),
    wander: clamp(wander, 0, 2),
    depth: clamp(depth, 0, 1),
    targets,
    idle,
    clickEffect,
    hideCursor,
    intro,
    enabled,
    lightMode,
    dpr
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;
    const scene = createSwarmScene(canvas, container, settingsRef);
    sceneRef.current = scene;
    return () => {
      sceneRef.current = null;
      scene?.dispose();
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.wake();
  });

  return (
    <div ref={containerRef} className={`swarm-cursor${className ? ` ${className}` : ''}`} style={style} {...rest}>
      <style>{`.${HIDDEN}, .${HIDDEN} * { cursor: none !important; }`}</style>
      <canvas ref={canvasRef} className="swarm-cursor-canvas" aria-hidden="true" />
      {children ? <div className="swarm-cursor-content">{children}</div> : null}
    </div>
  );
};

export default SwarmCursor;
