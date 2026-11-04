'use client';

import { useEffect, useRef } from 'react';
import { createRippleScene } from './ripple-scene';
import './RippleDistortion.css';

const RippleDistortion = ({
  src = 'https://images.unsplash.com/photo-1782977389500-dd7adad33ebe?q=80&w=3416&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  brushSize = 150,
  strength = 0.2,
  swirl = 1,
  rings = 4,
  spread = 5,
  fade = 3,
  spacing = 15,
  dispersion = 0,
  glint = 0,
  tint = '#a855f7',
  tintAmount = 0.1,
  grayscale = true,
  highlightColor = '#ffffff',
  trigger = 'hover',
  clickStrength = 2,
  quality = 'low',
  enabled = true,
  className = '',
  style
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const configRef = useRef({});

  configRef.current = {
    src,
    brushSize,
    spread,
    fade,
    spacing,
    clickStrength,
    trigger,
    enabled,
    quality,
    rings,
    strength,
    swirl,
    dispersion,
    glint,
    tintAmount,
    grayscale,
    highlightColor,
    tint
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const scene = createRippleScene(mount, configRef);
    sceneRef.current = scene;
    return () => {
      sceneRef.current = null;
      scene.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, quality]);

  useEffect(() => {
    sceneRef.current?.update({
      rings,
      strength,
      swirl,
      dispersion,
      glint,
      tintAmount,
      grayscale,
      highlightColor,
      tint
    });
  }, [rings, strength, swirl, dispersion, glint, tintAmount, grayscale, highlightColor, tint]);

  return <div ref={mountRef} className={`ripple-distortion ${className}`.trim()} style={style} />;
};

export default RippleDistortion;
