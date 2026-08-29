/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built game works from any sub-path (e.g. /games/breakpoint/ on Vercel).
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200, // three.js alone is ~700 kB minified; a warning here is noise.
  },
  server: {
    host: true, // expose on LAN so a phone on the same Wi-Fi can load it
    port: 5174,
  },
  test: {
    // The physics core is deliberately DOM-free pure logic, so the fast node
    // environment is enough — no jsdom dependency required.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
