import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const isCI = !!process.env.CI;
const baseURL =
  process.env.BASE_URL ?? 'https://apply.mykaleidoscope.com/program/sdet-test-scholarship';

export default defineConfig({
  testDir: './tests',
  outputDir: './reports/artifacts',

  // The application flow is a single stateful journey, so tests are not parallelised
  // inside a file. Independent files can still run on separate workers.
  fullyParallel: false,
  workers: isCI ? 1 : undefined,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,

  timeout: 180_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
  ],

  use: {
    baseURL,
    headless: process.env.HEADLESS !== 'false',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 0) },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
