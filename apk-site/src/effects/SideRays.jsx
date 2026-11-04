'use client';

import { useEffect, useRef, useState } from 'react';
import { ORIGINS, createRaysScene } from './side-rays-scene';
import { clamp, parseColor } from './side-rays-utils';
import './SideRays.css';

const SideRays = ({
  rayColor1 = '#FFC46B',
  rayColor2 = '#96c8ff',
  blend = 0.6,
  origin = 'top-right',
  speed = 2.5,
  intensity = 2,
  spread = 2,
  density = 5,
  sharpness = 0.5,
  tilt = 0,
  falloff = 1.6,
  glow = 1,
  saturation = 1,
  dust = 0,
  followMouse = true,
  mouseInfluence = 0.5,
  intro = true,
  lightMode = false,
  opacity = 1,
  maxDevicePixelRatio = 2,
  className = '',
  style
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [generation, setGeneration] = useState(0);

  const settings = {
    colorA: parseColor(rayColor1),
    colorB: parseColor(rayColor2),
    blend: clamp(blend, 0, 1),
    frame: ORIGINS[origin] ?? ORIGINS['top-right'],
    speed: Math.max(0, speed) * 0.4,
    intensity: Math.max(0, intensity) * 0.75,
    spread: clamp(spread, 0.1, 8) * 0.225,
    density: clamp(density, 1, 40),
    sharpness: clamp(sharpness, 0, 1),
    tilt: (clamp(tilt, -180, 180) * Math.PI) / 180,
    falloff: clamp(falloff, 0.2, 6),
    glow: Math.max(0, glow) * 1.2,
    saturation: Math.max(0, saturation),
    dust: clamp(dust, 0, 1),
    followMouse,
    mouseInfluence: clamp(mouseInfluence, 0, 1),
    intro,
    light: lightMode,
    opacity: clamp(opacity, 0, 1),
    maxRatio: clamp(maxDevicePixelRatio, 0.5, 3)
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    sceneRef.current?.wake();
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;
    const scene = createRaysScene(canvas, container, settingsRef, {
      allowIntro: generation === 0,
      onRestore: () => setGeneration(value => value + 1)
    });
    sceneRef.current = scene;
    return () => {
      sceneRef.current = null;
      scene?.dispose();
    };
  }, [generation]);

  return (
    <div ref={containerRef} className={`side-rays${className ? ` ${className}` : ''}`} style={style}>
      <canvas ref={canvasRef} className="side-rays__canvas" aria-hidden="true" />
    </div>
  );
};

export default SideRays;
