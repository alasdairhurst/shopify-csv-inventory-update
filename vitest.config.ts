import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    environment: 'jsdom',
    testTimeout: 90000,
		setupFiles: ['test/setup.ts']
  }
});
