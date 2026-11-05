import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Html, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { PlumbBob } from './PlumbBob';
import { useOnScreen } from './webgl';
import type { TenetTone, Tone } from '../lib/tones';

const COLORS: Record<Tone, { dim: string; light: string }> = {
  idle: { dim: '#59658f', light: '#b9b3a2' },
  held: { dim: '#2fd0a8', light: '#13966f' },
  weak: { dim: '#f6c054', light: '#c98a12' },
  missing: { dim: '#a8b0cf', light: '#8e8a7c' },
  bad: { dim: '#ff6870', light: '#d02c3a' },
};

function Slab({
  i,
  count,
  tone,
  dim,
  wallHard,
  matured,
}: {
  i: number;
  count: number;
  tone: TenetTone;
  dim: boolean;
  wallHard: boolean;
  matured: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const x = (i - (count - 1) / 2) * 1.05;
  useFrame((s) => {
    const m = ref.current;
    if (!m) return;
    const target =
      THREE.MathUtils.degToRad(tone.tilt) * (i % 2 ? -1 : 1) +
      (wallHard ? Math.sin(s.clock.elapsedTime * 3 + i) * 0.03 : 0);
    m.rotation.z = THREE.MathUtils.lerp(m.rotation.z, target, 0.06);
  });
  const col = (matured ? { dim: '#f6c054', light: '#c98a12' } : COLORS[tone.tone])[dim ? 'dim' : 'light'];
  return (
    <mesh ref={ref} position={[x, -0.2, 0]}>
      <boxGeometry args={[0.8, 2.6, 0.14]} />
      <meshPhysicalMaterial
        color={col}
        emissive={col}
        emissiveIntensity={tone.tone === 'idle' ? 0.02 : dim ? 0.35 : 0.12}
        roughness={0.35}
        metalness={0.2}
        clearcoat={0.7}
      />
      <Html
        position={[0, 0, 0.1]}
        center
        distanceFactor={9}
        zIndexRange={[5, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <span className="font-display text-2xl font-semibold text-white drop-shadow">{tone.n}</span>
      </Html>
    </mesh>
  );
}

/** One slab per tenet. A slab leans when the latest reading found its tenet softened, missing or contradicted. */
export default function PlumbWall({
  tones,
  dim,
  wallHard = false,
  matured = false,
  broken = false,
}: {
  tones: TenetTone[];
  dim: boolean;
  wallHard?: boolean;
  matured?: boolean;
  broken?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(wrap);
  const count = Math.max(1, tones.length);
  const list = tones.length ? tones : [{ n: 1, tone: 'idle' as Tone, tilt: 0 }];
  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 0.4, 8.5], fov: 38 }}
        gl={{ alpha: true, antialias: true }}
        frameloop={visible ? 'always' : 'demand'}
        aria-label="A wall with one slab per tenet; leaning slabs show tenets the page no longer keeps"
      >
        <ambientLight intensity={dim ? 0.6 : 0.85} />
        <directionalLight position={[3, 5, 5]} intensity={1.6} />
        <Environment resolution={128}>
          <color attach="background" args={[dim ? '#56618f' : '#d8cfb8']} />
          <Lightformer form="rect" intensity={3.5} position={[0, 5, 3]} scale={[10, 2, 1]} />
          <Lightformer form="rect" intensity={2} position={[-5, 0, 3]} scale={[2, 6, 1]} />
        </Environment>
        <group position={[0, -0.9, -0.6]}>
          {list.map((t, i) => (
            <Slab key={t.n} i={i} count={count} tone={t} dim={dim} wallHard={wallHard} matured={matured} />
          ))}
        </group>
        <PlumbBob
          pivot={[0, 3.3, 0.6]}
          length={3.1}
          color={broken ? '#b4443c' : '#d9a032'}
          scale={0.85}
          animate
        />
      </Canvas>
    </div>
  );
}
