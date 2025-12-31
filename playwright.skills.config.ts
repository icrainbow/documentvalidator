import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Playwright Configuration for Skills Tests (Dev Mode)
 * 
 * Uses dev server instead of production build to avoid Suspense boundary issues.
 */
export default defineConfig({
  ...baseConfig,
  testDir: './tests/e2e',
  testMatch: '**/flow2-skills.spec.ts',
  
  // Override use to set baseURL
  use: {
    ...baseConfig.use,
    baseURL: 'http://localhost:3000',
  },
  
  // Use dev server (faster, no Suspense boundary issues)
  webServer: {
    command: 'npx next dev -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

