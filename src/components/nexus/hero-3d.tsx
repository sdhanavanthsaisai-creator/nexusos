'use client';

/**
 * Hero3D — interactive React Three Fiber scene for the dashboard hero card.
 * Particle fibonacci-sphere + floating wireframe icosahedrons + pointer parallax.
 * Defensively wrapped: any WebGL/render failure degrades to a static gradient.
 */

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useNexus } from '@/lib/nexus/store';

const NODE_PALETTE = ['#ffffff', '#c9c9c9', '#f1f1f1', '#c9c9c9', '#ffffff'] as const;
const WHITE = new THREE.Color('#ffffff');
const SILVER = new THREE.Color('#c9c9c9');

// ─── Particle field: ~700 points on a fibonacci sphere with jitter ───────────
function ParticleField() {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const COUNT = 700;
    const RADIUS = 5.5;
    const JITTER = 0.22;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2; // -1..1
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      pos[i * 3] = Math.cos(theta) * r * RADIUS + (Math.random() - 0.5) * JITTER;
      pos[i * 3 + 1] = y * RADIUS + (Math.random() - 0.5) * JITTER;
      pos[i * 3 + 2] = Math.sin(theta) * r * RADIUS + (Math.random() - 0.5) * JITTER;
      const c = Math.random() < 0.5 ? WHITE : SILVER;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Floating wireframe icosahedron node ──────────────────────────────────────
function IcoNode({
  position, radius, color, speed,
}: {
  position: [number, number, number];
  radius: number;
  color: string;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    m.rotation.x += delta * 0.12 * speed;
    m.rotation.y += delta * 0.18 * speed;
  });
  return (
    <Float speed={2} rotationIntensity={1.2} floatIntensity={1.6}>
      <mesh ref={ref} position={position}>
        <icosahedronGeometry args={[radius, 0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.72} />
      </mesh>
    </Float>
  );
}

const ICO_NODES: { position: [number, number, number]; radius: number; color: string; speed: number }[] = [
  { position: [-3.4, 1.5, 0.4], radius: 0.85, color: NODE_PALETTE[0], speed: 1.0 },
  { position: [3.6, 0.9, -0.6], radius: 0.65, color: NODE_PALETTE[1], speed: 1.3 },
  { position: [-2.2, -1.7, 1.2], radius: 0.5, color: NODE_PALETTE[2], speed: 1.6 },
  { position: [2.4, 2.1, 0.8], radius: 0.45, color: NODE_PALETTE[3], speed: 1.2 },
  { position: [0.9, -2.2, 1.6], radius: 0.6, color: NODE_PALETTE[4], speed: 0.9 },
  { position: [-0.7, 2.4, -1.0], radius: 0.75, color: NODE_PALETTE[0], speed: 1.45 },
];

// ─── Pointer-parallax rig for the whole group ─────────────────────────────────
function ParallaxRig({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g || !enabled) return;
    g.rotation.y += (state.pointer.x * 0.25 - g.rotation.y) * 0.05;
    g.rotation.x += (-state.pointer.y * 0.18 - g.rotation.x) * 0.05;
  });
  return <group ref={ref}>{children}</group>;
}

/** Fires a single frame when the scene runs in `demand` mode (reduce3d). */
function OneShotFrame() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate]);
  return null;
}

// ─── Error boundary: degrade to a static gradient if WebGL/scene fails ────────
class Hero3DBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // Swallow — the dashboard must never crash because of the 3D layer.
  }
  render() {
    if (this.state.failed) {
      return (
        <div
          className="grid-bg absolute inset-0 bg-gradient-to-br from-foreground/[0.07] via-transparent to-foreground/[0.05]"
          aria-hidden="true"
        />
      );
    }
    return this.props.children;
  }
}

// ─── Public component ─────────────────────────────────────────────────────────
export default function Hero3D() {
  const reduce3d = useNexus((s) => s.settings.reduce3d);
  const [hidden, setHidden] = useState(false);

  // Auto-pause rendering when the tab is hidden.
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const frameloop: 'always' | 'demand' | 'never' = reduce3d ? 'demand' : hidden ? 'never' : 'always';

  return (
    <Hero3DBoundary>
      <div className="absolute inset-0" aria-hidden="true">
        {/* static base gradient shows through the alpha canvas (and in reduce3d mode) */}
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.07] via-transparent to-foreground/[0.05]" />
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0, 9], fov: 55 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          frameloop={frameloop}
          style={{ position: 'absolute', inset: 0 }}
          resize={{ scroll: false }}
        >
          <ambientLight intensity={0.6} />
          <pointLight position={[4, 3, 6]} intensity={30} distance={20} color="#ffffff" />
          <pointLight position={[-5, -2, 4]} intensity={30} distance={20} color="#c9c9c9" />
          <ParallaxRig enabled={!reduce3d && !hidden}>
            <ParticleField />
            {ICO_NODES.map((n) => (
              <IcoNode key={`${n.position.join('-')}`} position={n.position} radius={n.radius} color={n.color} speed={n.speed} />
            ))}
          </ParallaxRig>
          {frameloop === 'demand' && <OneShotFrame />}
        </Canvas>
      </div>
    </Hero3DBoundary>
  );
}
