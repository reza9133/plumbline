/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Static hosts without rewrite rules (GitHub Pages) need a 404.html that is a copy of index.html.
const spaFallback = () => ({
  name: 'plumbline-spa-fallback',
  apply: 'build' as const,
  closeBundle() {
    const out = resolve(__dirname, 'dist');
    try {
      copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'));
      writeFileSync(resolve(out, '_redirects'), '/* /index.html 200\n');
    } catch {
      /* the build itself already failed or was empty */
    }
  },
});

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), spaFallback()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    // No manualChunks on purpose. Forcing three / r3f / genlayer-js into named chunks made Rollup park Vite's
    // preload helper and the CommonJS helpers inside them, so the entry file statically imported ~1.7 MB of 3D
    // and chain code and the app could not start until all of it had arrived (blank page when any request failed).
    // Left alone, those libraries stay behind the dynamic imports that actually need them.
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
