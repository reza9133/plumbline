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

/** False on Save-Data or 2G connections: the 3D files are ~1 MB and would only compete with the page itself. */
export function canAffordHeavyAssets(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (!c) return true;
  if (c.saveData) return false;
  return !/2g/.test(c.effectiveType ?? '');
}

/** Runs `cb` once the page has finished loading and the browser is idle (or after a short delay), returns a cancel function. */
function afterPageIdle(cb: () => void): () => void {
  let cancelled = false;
  let timer: number | undefined;
  const w = window as Window & {
    requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const go = () => {
    if (cancelled) return;
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => !cancelled && cb(), { timeout: 3000 });
      cancel = () => w.cancelIdleCallback?.(id);
    } else {
      timer = window.setTimeout(() => !cancelled && cb(), 800);
    }
  };
  let cancel = () => {};
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', go);
    if (timer !== undefined) window.clearTimeout(timer);
    cancel();
  };
}

/**
 * Shows `fallback` when WebGL is missing, the connection is poor, or the scene throws, so the page never breaks
 * because of 3D. The 3D code is only requested after the page itself has loaded.
 */
export function SceneGuard({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!canRunWebGL() || !canAffordHeavyAssets()) {
      setOk(false);
      return;
    }
    return afterPageIdle(() => setOk(true));
  }, []);
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
