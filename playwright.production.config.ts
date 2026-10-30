import { defineConfig } from '@playwright/test';

// Production checks must remain read-only. No local server or simulated providers.
export default defineConfig({
  testDir: './e2e-production',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  outputDir: 'test-results/production',
  reporter: [['list'], ['json', { outputFile: 'test-results/production-results.json' }]],
  use: {
    baseURL: 'https://materosquinieleros.netlify.app',
    browserName: 'chromium',
    // Authenticated tests must never record cookies or private API payloads.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    reducedMotion: 'reduce',
  },
});
