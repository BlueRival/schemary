import os from 'os';
import { defineConfig, configDefaults } from 'vitest/config';

// Define test patterns
const patterns: Record<string, string[]> = {
  unit: ['src/**/*.spec.ts'],
  build: ['test/**/*.spec.ts'],
};

// Get pattern from environment or default to all
const targetTests = process.env.TARGET_TESTS || 'all';

if (!(targetTests in patterns)) {
  throw new Error(`Invalid target tests: ${targetTests}`);
}

const include: string[] = patterns[targetTests];

// Coverage exclude patterns
const coverageExclude = [
  ...(configDefaults.coverage.exclude ?? []),
  'test/**',
  'rollup/**',
  'scripts/**',
  'src/mapping/parser/ast/types.ts',
];

export default defineConfig({
  test: {
    minWorkers: 1,
    maxWorkers: Math.min(os.cpus().length, 20),
    include,
    exclude: [...configDefaults.exclude, 'dist', 'node_modules'],
    environment: 'node',
    globals: true,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      exclude: [...coverageExclude],
    },
  },
});
