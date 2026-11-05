import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface BobProps {
  /** where the string is fixed */
  pivot?: [number, number, number];
  length?: number;
  /** -1 .. 1 pointer position, pulls the bob gently toward it */
  pointer?: { x: number; y: number };
  color?: string;
  animate?: boolean;
  scale?: number;
  /** extra impulse counter: increasing it plucks the bob */
  pluck?: number;
}

/** A faceted brass plumb bob on a string. The pendulum is a damped spring that the pointer can disturb. */
export function PlumbBob({
  pivot = [0, 3.6, 0],
  length = 4,
  pointer,
  color = '#d9a032',
  animate = true,
  scale = 1,
  pluck = 0,
}: BobProps) {
  const group = useRef<THREE.Group>(null);
  const state = useRef({ ax: 0, vx: 0, az: 0, vz: 0, lastPluck: pluck });

  const geometry = useMemo(() => {
    const pts = [
      [0.0, 0.62],
      [0.1, 0.62],
      [0.13, 0.52],
      [0.1, 0.45],
      [0.29, 0.37],
      [0.35, 0.2],
      [0.35, 0.0],
      [0.3, -0.2],
      [0.16, -0.55],
      [0.0, -0.8],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 8);
  }, []);

  useFrame((s, dt) => {
    const g = group.current;
    if (!g) return;
    const st = state.current;
    const step = Math.min(dt, 0.05);
    if (pluck !== st.lastPluck) {
      st.lastPluck = pluck;
      st.vz += 1.4;
      st.vx += 0.6;
    }
    if (animate) {
      const t = s.clock.elapsedTime;
      const tz = (pointer ? -pointer.x * 0.32 : 0) + Math.sin(t * 0.7) * 0.07;
      const tx = (pointer ? pointer.y * 0.18 : 0) + Math.cos(t * 0.55) * 0.04;
      const w2 = 5.2;
      const c = 0.9;
      st.vz += (-w2 * (st.az - tz) - c * st.vz) * step;
      st.az += st.vz * step;
      st.vx += (-w2 * (st.ax - tx) - c * st.vx) * step;
      st.ax += st.vx * step;
    }
    g.rotation.z = st.az;
    g.rotation.x = st.ax;
  });

  return (
    <group position={pivot} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#e9ecf8" metalness={0.8} roughness={0.25} />
      </mesh>
      <group ref={group}>
        <mesh position={[0, -length / 2, 0]}>
          <cylinderGeometry args={[0.012, 0.012, length, 6]} />
          <meshStandardMaterial color="#e9ecf8" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh geometry={geometry} position={[0, -length - 0.62, 0]} castShadow>
          <meshStandardMaterial
            color={color}
            metalness={1}
            roughness={0.22}
            flatShading
            envMapIntensity={1.4}
          />
        </mesh>
      </group>
    </group>
  );
}
