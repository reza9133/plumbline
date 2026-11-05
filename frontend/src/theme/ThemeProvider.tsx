import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dim';
interface ThemeApi {
  theme: Theme;
  setTheme(t: Theme): void;
  toggle(): void;
}
const ThemeContext = createContext<ThemeApi | null>(null);

const current = (): Theme =>
  document.documentElement.getAttribute('data-theme') === 'dim' ? 'dim' : 'light';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, set] = useState<Theme>(current);

  const apply = useCallback((t: Theme) => {
    document.documentElement.setAttribute('data-theme', t);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', t === 'dim' ? '#1b2138' : '#f5f1e8');
    try {
      window.localStorage.setItem('plumbline.theme', t);
    } catch {
      /* private mode: the choice lasts for this visit */
    }
    set(t);
  }, []);

  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dim' ? '#1b2138' : '#f5f1e8');
  }, [theme]);

  const api = useMemo<ThemeApi>(
    () => ({ theme, setTheme: apply, toggle: () => apply(theme === 'light' ? 'dim' : 'light') }),
    [theme, apply],
  );
  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
