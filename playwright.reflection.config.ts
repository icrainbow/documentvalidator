import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Playwright Configuration for Flow2 Reflection Tests
 * 
 * Extends base config with REFLECTION_TEST_MODE=rerun environment variable
 * to test rerun routing behavior.
 */
export default defineConfig({
  ...baseConfig,
  testDir: './tests/e2e',
  testMatch: '**/flow2-reflection.spec.ts',
  
  // Override use to set baseURL (inherited from base will be overridden)
  use: {
    ...baseConfig.use,
    baseURL: 'http://localhost:3000',
  },
  
  // Override webServer to inject REFLECTION_TEST_MODE and force fresh server
  webServer: {
    // Use dev server for faster startup (no build needed)
    command: 'REFLECTION_PROVIDER=mock REFLECTION_TEST_MODE=rerun npx next dev -p 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: false, // Always start fresh server with env vars
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});


