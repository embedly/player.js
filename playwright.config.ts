import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 15_000,

  use: {
    baseURL: 'http://localhost:8004',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      // Real Chrome rather than Playwright's Chromium build: the HTML5 fixture
      // plays an H.264 mp4, which open-source Chromium cannot decode.
      name: 'chrome',
      use: {
        channel: 'chrome',
        launchOptions: {
          // Adapters call video.play() from a postMessage, not a user gesture.
          args: ['--autoplay-policy=no-user-gesture-required'],
        },
      },
    },
  ],

  webServer: {
    command: 'node e2e/server.mjs',
    url: 'http://localhost:8004/e2e/fixtures/parent.html',
    reuseExistingServer: !process.env.CI,
  },
});
