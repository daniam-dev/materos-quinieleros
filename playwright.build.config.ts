import { defineConfig } from '@playwright/test';

// Exercise the optimized artifact, including CommonJS lazy-import interop.
export default defineConfig({
  testDir: './e2e',
  testMatch: ['photo-build.spec.ts', 'photo-save.spec.ts'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120000,
  reporter: 'list',
  outputDir: 'test-results/build',
  use: {
    baseURL: 'http://127.0.0.1:4200',
    browserName: 'chromium',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'node scripts/local-test-admin.mjs --production-preview',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
