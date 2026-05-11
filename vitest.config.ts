import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Vitest runs both unit specs (pure logic) and integration specs (component
// renders via @testing-library/react). Playwright handles browser E2E
// separately — see playwright.config.ts.
//
// Naming convention:
//   *.test.ts(x)  → pure unit (no DOM, no React render)
//   *.spec.ts(x)  → integration (renders a component, asserts output)
//
// Both run under one vitest invocation; the runner uses jsdom for the
// integration specs and a node environment for unit specs.

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['{src,tests}/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/**/*.e2e.{ts,tsx}', 'tests/smoke.spec.ts', 'node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.{test,spec}.{ts,tsx}'],
      // Coverage is a ratchet — bump these as the suite grows.
      thresholds: {
        autoUpdate: true,
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
