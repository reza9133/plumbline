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
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('@react-three')) return 'r3f';
          if (
            id.includes('node_modules/genlayer-js') ||
            id.includes('node_modules/viem') ||
            id.includes('node_modules/@noble') ||
            id.includes('node_modules/@scure') ||
            id.includes('node_modules/abitype')
          )
            return 'chain';
          if (id.includes('node_modules/framer-motion')) return 'motion';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
