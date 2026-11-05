import { Component, useEffect, useState, type ReactNode } from 'react';

let cached: boolean | null = null;
export function canRunWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    cached = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    cached = false;
  }
  return cached;
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('3D scene disabled:', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Shows `fallback` when WebGL is missing or the scene throws, so the page never breaks because of 3D. */
export function SceneGuard({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(canRunWebGL()), []);
  if (ok === null) return <>{fallback}</>;
  if (!ok) return <>{fallback}</>;
  return <Boundary fallback={fallback}>{children}</Boundary>;
}

/** True while the element is on screen; scenes stop rendering when it is not. */
export function useOnScreen(ref: React.RefObject<Element>): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}
