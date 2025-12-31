import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/api/**/*.test.ts', 'tests/unit/**/*.test.ts'], // Phase 3: Include unit tests
    globalSetup: './tests/setup/globalSetup.ts',
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});

