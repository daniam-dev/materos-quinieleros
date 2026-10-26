import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4200',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'desktop', testMatch: 'app.spec.ts', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', testMatch: 'app.spec.ts', use: { viewport: { width: 768, height: 1024 } } },
    {
      name: 'mobile',
      testMatch: 'app.spec.ts',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'admin',
      testMatch: 'admin.spec.ts',
      dependencies: ['desktop', 'tablet', 'mobile'],
      use: { viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
