import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'plumbline.chunk-reload';
const RELOAD_WINDOW_MS = 15_000;

/** True for the errors browsers throw when a code-split file cannot be fetched or is not JavaScript. */
export function isChunkError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading chunk .* failed|MIME type/i.test(
    text,
  );
}

/**
 * Reloads the page once so it picks up the newest index.html (and so the newest file names) after a deploy.
 * Returns false when it already did that a moment ago, so a file that is really gone cannot cause a reload loop.
 */
export function reloadOnce(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * `lazy()` that survives a flaky network: it retries the import, and when the file is truly gone (the site was
 * redeployed while this tab was open) it reloads once instead of leaving a blank page.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyRetry<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await load();
      } catch (e) {
        lastError = e;
        if (!isChunkError(e)) throw e;
        await wait(400 * (attempt + 1));
      }
    }
    if (reloadOnce()) return new Promise<never>(() => {}); // the page is reloading; keep the loader up
    throw lastError;
  });
}
