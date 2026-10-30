import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Served from https://<user>.github.io/gantt-chart/ — base must match the repository name.
export default defineConfig({
  base: '/gantt-chart/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
