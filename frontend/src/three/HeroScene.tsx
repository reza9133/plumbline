import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { PlumbBob } from './PlumbBob';
import { useOnScreen } from './webgl';

function Slabs({ pointer, dim }: { pointer: { x: number; y: number }; dim: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const count = 11;
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const x = (i - (count - 1) / 2) * 0.82;
      const near = Math.max(0, 1 - Math.abs(x - pointer.x * 5) / 2.2);
      m.rotation.z = THREE.MathUtils.lerp(
        m.rotation.z,
        Math.sin(t * 0.6 + i * 0.9) * 0.025 + near * pointer.x * 0.12,
        0.08,
      );
      m.position.y = Math.sin(t * 0.5 + i) * 0.05 - 0.6;
    });
  });
  return (
    <group position={[0, 0, -2.2]}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[(i - (count - 1) / 2) * 0.82, -0.6, 0]}>
          <boxGeometry args={[0.5, 3.2 + (i % 3) * 0.5, 0.1]} />
          <meshPhysicalMaterial
            color={dim ? '#3a4676' : '#e7e0cf'}
            roughness={0.35}
            metalness={0.1}
            transparent
            opacity={dim ? 0.55 : 0.75}
            clearcoat={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

function Rings({ dim }: { dim: boolean }) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const c = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (a.current) a.current.rotation.set(1.2, t * 0.5, 0);
    if (b.current) b.current.rotation.set(0.4, -t * 0.4, t * 0.2);
    if (c.current) c.current.rotation.set(t * 0.3, 0.8, 1.1);
  });
  const emissive = (hex: string) => ({
    color: hex,
    emissive: hex,
    emissiveIntensity: dim ? 1.4 : 0.7,
    roughness: 0.3,
    metalness: 0.5,
  });
  return (
    <group position={[0, -1.6, 0]}>
      <mesh ref={a}>
        <torusGeometry args={[1.35, 0.03, 12, 96]} />
        <meshStandardMaterial {...emissive(dim ? '#2ce0d0' : '#0aa89e')} />
      </mesh>
      <mesh ref={b}>
        <torusGeometry args={[1.75, 0.025, 12, 96]} />
        <meshStandardMaterial {...emissive(dim ? '#cc6af4' : '#a43bd1')} />
      </mesh>
      <mesh ref={c}>
        <torusGeometry args={[2.15, 0.02, 12, 96]} />
        <meshStandardMaterial {...emissive('#e0a62e')} />
      </mesh>
    </group>
  );
}

function Floor({ dim }: { dim: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const k = (s.clock.elapsedTime % 3) / 3;
    if (ring.current) {
      ring.current.scale.setScalar(0.4 + k * 2.6);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.55;
    }
  });
  return (
    <group position={[0, -3.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ring}>
        <ringGeometry args={[0.95, 1, 64]} />
        <meshBasicMaterial
          color={dim ? '#2ce0d0' : '#0a9a90'}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[0.07, 24]} />
        <meshBasicMaterial color={dim ? '#f6c054' : '#b9791c'} />
      </mesh>
    </group>
  );
}

function Rig({ pointer }: { pointer: { x: number; y: number } }) {
  useFrame((s) => {
    s.camera.position.x = THREE.MathUtils.lerp(s.camera.position.x, pointer.x * 0.7, 0.04);
    s.camera.position.y = THREE.MathUtils.lerp(s.camera.position.y, 0.2 + pointer.y * 0.35, 0.04);
    s.camera.lookAt(0, -0.4, 0);
  });
  return null;
}

/** The home page's stage: a plumb bob that follows the pointer, bond rings, and a wall of tenet slabs. */
export default function HeroScene({ dim, animate = true }: { dim: boolean; animate?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useOnScreen(wrap);
  const pointer = useRef({ x: 0, y: 0 });
  const [pluck, setPluck] = useState(0);

  return (
    <div
      ref={wrap}
      className="absolute inset-0"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        pointer.current.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerDown={() => setPluck((p) => p + 1)}
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.2, 9], fov: 40 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        frameloop={animate && visible ? 'always' : 'demand'}
        aria-label="A brass plumb bob swinging in front of a wall of tenets"
      >
        <ambientLight intensity={dim ? 0.55 : 0.8} />
        <directionalLight position={[4, 6, 5]} intensity={dim ? 1.6 : 1.9} />
        <pointLight position={[-5, 1, 3]} intensity={dim ? 25 : 12} color={dim ? '#7f6bff' : '#ffd9a0'} />
        <Environment resolution={256}>
          <color attach="background" args={[dim ? '#56618f' : '#d8cfb8']} />
          <Lightformer form="rect" intensity={4} position={[0, 5, 2]} scale={[10, 2, 1]} />
          <Lightformer
            form="rect"
            intensity={3}
            position={[-5, 0, 3]}
            scale={[2, 6, 1]}
            color={dim ? '#8aa0ff' : '#fff2d8'}
          />
          <Lightformer form="ring" intensity={2.5} position={[5, 1, -3]} scale={4} color="#2ce0d0" />
        </Environment>
        <Rig pointer={pointer.current} />
        <Slabs pointer={pointer.current} dim={dim} />
        <Rings dim={dim} />
        <Floor dim={dim} />
        <PlumbBob
          pointer={pointer.current}
          animate={animate}
          pluck={pluck}
          scale={1.25}
          color={dim ? '#f0bb55' : '#e0a93c'}
        />
        <Sparkles
          count={48}
          scale={[11, 7, 4]}
          size={2.4}
          speed={0.25}
          color={dim ? '#bcd3ff' : '#a47a2a'}
          opacity={0.7}
        />
      </Canvas>
    </div>
  );
}
